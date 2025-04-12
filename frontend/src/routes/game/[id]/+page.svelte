<script lang="ts">
    // Core Svelte/SvelteKit imports
    import { page } from '$app/stores'; // Access route parameters and other page data
    import { onMount, onDestroy } from 'svelte';
    import { get } from 'svelte/store'; // To read store value inside non-reactive code
  
    // Stores
    import { authStore } from '$lib/stores/authStore'; // Auth state
    import { progressStore, isLoadingProgress, addCompletedLevel } from '$lib/stores/progressStore'; // Progress state
  
    // API functions
    import { saveProgress, getProgress } from '$lib/api'; // Assumes getProgress exists, though not strictly needed here if layout handles init
  
    // Scenario Data (Import dynamically or add more imports later)
    import { levels as blackPearlLevels, dbSchemaDescription, type Level, type QueryResult } from '$lib/scenarioData/blackPearl';
  
    // --- Reactive State Subscriptions ---
    $: auth = $authStore; // Subscribe to auth state
    $: completedLevels = $progressStore; // Subscribe to progress store Set<string>
    $: loadingProgress = $isLoadingProgress; // Subscribe to progress loading state
    $: gameId = $page.params.id; // Reactive to URL parameter changes
  
    // --- Component State Variables ---
    let gameTitle = "Loading Game...";
    let sqlInput = '';
    let queryResult: any = null; // Holds result data {columns, values} or {error} or {message}
    let isLoadingDb = true; // Start in loading state for DB
    let dbLoadError: string | null = null;
    let showSchema = false; // Toggle for schema display
  
    // Level-related state
    let allLevels: Level[] | null = null; // Holds the level definitions for the current scenario
    let currentLevelIndex: number = -1; // Index of the currently displayed level
    let currentLevelData: Level | null = null; // Data object for the current level
    let highestReachedLevelIndex = -1; // Index of the highest level the user *can* access (0-based)
    let isCorrect: boolean = false; // Is the current query result correct for the level?
    let showHint: boolean = false;
    let showAnswer: boolean = false;
    let gameComplete: boolean = false; // Has the user completed the last level?
  
    // sql.js related variables
    let SQL: any = null; // Will hold the loaded sql.js library object
    let db: any = null; // Will hold the loaded database instance
  
  
    // --- Calculate Highest Reachable Level Reactively ---
    $: {
        // This block runs whenever its dependencies (allLevels, loadingProgress, completedLevels) change
        if (allLevels && !loadingProgress) { // Ensure levels are loaded and progress isn't loading
            const userCompletedLevels = completedLevels; // Get current value from reactive variable
            let highestCompleted = -1;
            for (let i = 0; i < allLevels.length; i++) {
                const levelString = `${gameId}/${allLevels[i].levelId}`;
                if (userCompletedLevels.has(levelString)) {
                    highestCompleted = i;
                }
            }
            // Highest *reachable* is the one after the highest *completed*, or 0 if none completed
            // Bounded by the actual number of levels
            let reachableIndex = (highestCompleted === -1) ? 0 : Math.min(highestCompleted + 1, allLevels.length - 1);
  
            // If the game is already marked as complete, allow access to all levels
            if (gameComplete) {
                reachableIndex = allLevels.length - 1;
            }
  
            // Only update if it changed to avoid potential infinite loops if logic is complex
            if (reachableIndex !== highestReachedLevelIndex) {
                 highestReachedLevelIndex = reachableIndex;
                 console.log(`Reactive update: Highest Reached Level Index set to: ${highestReachedLevelIndex}`);
            }
        } else if (!allLevels) {
              // If levels aren't loaded yet, default to -1 (or 0 if preferred)
              highestReachedLevelIndex = -1;
        }
    }
  
    // --- Core Functions ---
  
    // Function to load sql.js library
    async function loadSqlJs() {
      try {
          console.log("Attempting to load sql.js/dist/sql-wasm.js...");
          const initSqlJs = (await import('sql.js/dist/sql-wasm.js')).default;
          console.log("initSqlJs function loaded:", typeof initSqlJs);
          SQL = await initSqlJs({ locateFile: file => `/${file}` }); // Assumes wasm served at root
          if (!SQL || typeof SQL.Database !== 'function') {
               throw new Error("SQL object initialization failed.");
          }
          console.log("sql.js engine initialized successfully via sql-wasm.js.");
      } catch (e) {
          console.error("Failed to load or initialize sql.js:", e);
          dbLoadError = "Failed to load the SQL engine. Please try refreshing.";
          isLoadingDb = false;
          throw e;
      }
    }
  
    // Function to fetch and load the scenario database
    async function loadScenarioDatabase() {
      if (!SQL) { /* ... handle error ... */ return; }
      isLoadingDb = true;
      dbLoadError = null;
      if (db) { try { db.close(); } catch (e) {} db = null; } // Clear previous
      let initialBufferForComparison: ArrayBuffer | null = null;
      console.log(`Fetching database for game: ${gameId}`);
      try {
          const response = await fetch(`/api/cases/${gameId}/db`);
          if (!response.ok) { throw new Error(`Fetch failed: ${response.statusText}`); }
          const dbFileArrayBuffer = await response.arrayBuffer();
          initialBufferForComparison = dbFileArrayBuffer.slice(0);
          console.log(`Received ArrayBuffer: size=${dbFileArrayBuffer.byteLength} bytes.`);
          if (dbFileArrayBuffer.byteLength === 0) { throw new Error("Received empty DB file."); }
          const initialBytes = new Uint8Array(dbFileArrayBuffer.slice(0, 16));
          const initialString = new TextDecoder().decode(initialBytes);
          console.log(`Initial bytes decoded: "${initialString}"`);
          if (!initialString.startsWith("SQLite format 3")) { console.warn("Warning: Data might not be SQLite3 file!"); }
  
          const uInt8Array = new Uint8Array(dbFileArrayBuffer);
          console.log(`Uint8Array length: ${uInt8Array.length}. Creating DB instance...`);
          db = new SQL.Database(uInt8Array);
          console.log("SQL.Database instance created.");
  
          // Export/Compare Check
          let exportedBuffer = db.export();
          console.log(`Exported buffer size: ${exportedBuffer?.length} bytes.`);
          if (!exportedBuffer || !initialBufferForComparison || exportedBuffer.length !== initialBufferForComparison.byteLength) {
               console.error(`FAILURE: Buffer size mismatch! Initial: ${initialBufferForComparison?.byteLength}, Exported: ${exportedBuffer?.length}`);
               // Optionally set dbLoadError here if mismatch is critical
          } else {
               console.log("SUCCESS: Exported buffer size matches initial buffer size.");
          }
  
          // Immediate check after creation
          const postCheckCount = db.exec("SELECT COUNT(*) FROM pirates;");
          console.log("Pirate count IMMEDIATELY after DB creation:", postCheckCount[0]?.values);
          if (postCheckCount[0]?.values[0][0] === 0) {
               console.error("DATABASE IS EMPTY AFTER LOADING!");
               // Set error state decisively here
               dbLoadError = "Database loaded but appears empty. Check DB file or loading process.";
               db = null; // Mark DB as unusable
          } else {
               console.log(`Database for ${gameId} loaded and seems valid.`);
          }
      } catch (error: any) {
          console.error(`Error loading database for ${gameId}:`, error);
          dbLoadError = `Failed to load scenario data: ${error.message}.`;
          db = null;
      } finally {
          isLoadingDb = false; // Ensure loading stops
          console.log("loadScenarioDatabase finished.");
      }
    }
  
    // Function to set the current level's data in component state
    function setCurrentLevelData() {
      // Reset state variables related to the specific level attempt
      isCorrect = false;
      showHint = false;
      showAnswer = false;
      sqlInput = ''; // Clear SQL input
      queryResult = null; // Clear results
  
      // Set the current level data based on the index
      if (allLevels && currentLevelIndex >= 0 && currentLevelIndex < allLevels.length) {
          currentLevelData = allLevels[currentLevelIndex];
          console.log(`setCurrentLevelData: Set to Level ${currentLevelIndex + 1}`, currentLevelData);
      } else if (gameComplete) {
           currentLevelData = null; // No current level if game is done
           console.log("setCurrentLevelData: Game is complete.");
      } else {
          // Handle invalid index or levels not loaded
          currentLevelData = null;
          console.warn(`setCurrentLevelData: Could not set level data for index ${currentLevelIndex}.`);
          // Optionally set an error state here if needed
      }
    }
  
    // Function to compare user query result with expected result
    function compareResults(userResult: any, expectedResult: QueryResult): boolean {
      // ... (Implement robust comparison logic - basic version below) ...
      if (!userResult || !expectedResult || userResult.error) return false;
      if (!userResult.columns || !userResult.values) return false; // Needs columns/values
  
      // Basic check (order-sensitive, string comparison)
      if (userResult.columns.length !== expectedResult.columns.length) return false;
      if (userResult.values.length !== expectedResult.values.length) return false;
      for (let i = 0; i < expectedResult.columns.length; i++) {
          if (userResult.columns[i] !== expectedResult.columns[i]) return false;
      }
      for (let i = 0; i < expectedResult.values.length; i++) {
          if (userResult.values[i].length !== expectedResult.values[i].length) return false;
          for (let j = 0; j < expectedResult.values[i].length; j++) {
              const expected = expectedResult.values[i][j] === null ? "NULL" : String(expectedResult.values[i][j]);
              const actual = userResult.values[i][j] === null ? "NULL" : String(userResult.values[i][j]);
              if (expected !== actual) return false;
          }
      }
      return true; // Passed all checks
    }
  
    // Function to execute user's SQL query
    function runQuery() {
       if (!db) { /* ... handle error ... */ return; }
       if (!sqlInput.trim()) { /* ... handle error ... */ return; }
       queryResult = null; isCorrect = false;
       console.log(`Executing query for Level ${currentLevelIndex + 1}: ${sqlInput}`);
       try {
          const results = db.exec(sqlInput);
          console.log("Raw query results:", results);
          if (results.length > 0) {
               const firstResult = { columns: results[0].columns, values: results[0].values };
               queryResult = firstResult;
               if (currentLevelData) { isCorrect = compareResults(firstResult, currentLevelData.expectedResult); }
          } else {
               queryResult = { message: "Query executed, but returned no data." };
               if (currentLevelData && currentLevelData.expectedResult.columns.length === 0 && currentLevelData.expectedResult.values.length === 0) { isCorrect = true; }
          }
       } catch (error: any) {
          console.error("SQL Error:", error);
          queryResult = { error: `SQL Error: ${error.message}` };
          isCorrect = false;
       }
    }
  
    // Function to navigate to a specific level index (if allowed)
    function goToLevel(index: number) {
          // Check bounds and if level is reachable
          if (index >= 0 && allLevels && index < allLevels.length && index <= highestReachedLevelIndex) {
              console.log(`Navigating from level index ${currentLevelIndex} to ${index}`);
              currentLevelIndex = index;
              setCurrentLevelData(); // Update UI and reset states for the new level
          } else {
              console.warn(`Cannot navigate to level index: ${index}. Out of bounds (0-${allLevels ? allLevels.length-1 : '?'}) or not reached (max reachable: ${highestReachedLevelIndex}).`);
          }
      }
  
    // Function called when user clicks "Next Level" after success
    // async function nextLevel() {
    //     let levelToSave = currentLevelData?.levelId;
    //     let currentIndexBeforeSave = currentLevelIndex;
  
    //     // Save progress for the level they just completed
    //     if (auth.isLoggedIn && levelToSave) {
    //         console.log(`Attempting to save progress for level: ${gameId}/${levelToSave}`);
    //         try {
    //             await saveProgress(gameId, levelToSave);
    //             addCompletedLevel(gameId, levelToSave); // Update local store immediately
    //             console.log(`Progress save API call succeeded for ${levelToSave}`);
    //             // highestReachedLevelIndex should update reactively due to store change
    //         } catch (error) {
    //             console.error(`Failed to save progress via API for level ${levelToSave}:`, error);
    //         }
    //     } else {
    //         console.log("User not logged in or no level data, skipping progress save.");
    //     }
  
    //     // Navigate to the actual next level index
    //     if (allLevels && currentIndexBeforeSave < allLevels.length - 1) {
    //         goToLevel(currentIndexBeforeSave + 1); // Go to next level index
    //     } else if (allLevels && currentIndexBeforeSave >= allLevels.length - 1) {
    //         // Handle game completion (already on the last level)
    //          gameComplete = true; // Mark game as complete
    //          setCurrentLevelData(); // Update UI (will show completion message)
    //          console.log("Game Scenario Completed!");
    //     }
    // }
      // Function called when user clicks "Next Level" after success
  async function nextLevel() {
      let levelToSave = currentLevelData?.levelId;
      let currentIndexBeforeSave = currentLevelIndex; // Capture current index

      // Save progress for the level they just completed
      if (auth.isLoggedIn && levelToSave) {
          console.log(`Attempting to save progress for level: ${gameId}/${levelToSave}`);
          try {
              await saveProgress(gameId, levelToSave);
              addCompletedLevel(gameId, levelToSave); // Update local store immediately
              console.log(`Progress save API call succeeded for ${levelToSave}`);

              // --- Manually update highestReachedLevelIndex ---
              // If the level just completed WAS the highest reachable, the *next* one is now reachable
              // (Only do this if we aren't already at the last level)
              if (currentIndexBeforeSave === highestReachedLevelIndex && currentIndexBeforeSave <(allLevels ? allLevels.length - 1: 0)) {
                  highestReachedLevelIndex = currentIndexBeforeSave + 1; // Manually update the state variable
                  console.log(`Manually updated highestReachedLevelIndex to: ${highestReachedLevelIndex} within nextLevel`);
              }
              // --- End Manual Update ---

          } catch (error) {
              console.error(`Failed to save progress via API for level ${levelToSave}:`, error);
          }
      } else {
          console.log("User not logged in or no level data, skipping progress save.");
      }

      // Navigate to the actual next level index
      const nextIndex = currentIndexBeforeSave + 1;
      if (allLevels && nextIndex < allLevels.length) {
           // Now call goToLevel - the highestReachedLevelIndex should allow this index now
          goToLevel(nextIndex);
      } else if (allLevels && nextIndex >= allLevels.length) {
          // Handle game completion (moving past the last level)
           gameComplete = true;
           setCurrentLevelData(); // Update UI to show completion message
           console.log("Game Scenario Completed!");
      }
  }
  

    // ... inside <script lang="ts"> ...

  // Function to reset the state and start from level 1
  function restartGame() {
    console.log("Restarting scenario...");
    gameComplete = false;       // Allow game UI to show again
    isCorrect = false;          // Reset correctness state
    queryResult = null;         // Clear previous results
    sqlInput = '';              // Clear SQL input
    showHint = false;           // Reset help displays
    showAnswer = false;
    currentLevelIndex = 0;      // Set index to the first level
    // Recalculate highest reachable based on potentially *existing* progress,
    // but allow starting at 0 regardless. If we want a true reset feel where
    // progress doesn't affect navigation during replay, reset highestReached too.
    // Let's reset highestReached for a clean replay navigation experience:
    highestReachedLevelIndex = 0;

    setCurrentLevelData();      // Load data for level 0
  }

  // ... rest of the script functions (onMount, onDestroy, nextLevel, etc.) ...
  
    // --- Component Lifecycle Hooks ---
  
    onMount(async () => {
       console.log(`onMount: Game page for ID: ${gameId}`);
       // Reset states on mount/remount
       isLoadingDb = true;
       dbLoadError = null; queryResult = null; isCorrect = false; showHint = false;
       showAnswer = false; gameComplete = false; currentLevelIndex = -1;
       currentLevelData = null; allLevels = null; db = null;
  
       gameTitle = gameId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  
       try {
          await loadSqlJs();
          await loadScenarioDatabase();
  
          // --- Determine Starting Level ---
          console.log("Determining starting level...");
          let startLevelIndex = 0;
  
          // Load level definitions based on gameId
          if (gameId === 'black-pearl') { allLevels = blackPearlLevels; }
          // else if (gameId === 'jungle-ledger') { allLevels = jungleLedgerLevels; }
          // else if (gameId === 'imf-db') { allLevels = imfDbLevels; }
          else { throw new Error(`Scenario definitions for '${gameId}' not found.`); }
  
          const progressIsLoading = get(isLoadingProgress);
          const userCompletedLevels = get(progressStore);
  
          if (allLevels && allLevels.length > 0 && !progressIsLoading) {
              console.log("Checking previously completed levels:", userCompletedLevels);
              let highestCompleted = -1;
              for (let i = 0; i < allLevels.length; i++) {
                  if (userCompletedLevels.has(`${gameId}/${allLevels[i].levelId}`)) {
                      highestCompleted = i;
                  }
              }
              console.log(`Highest completed index for ${gameId}: ${highestCompleted}`);
              if (highestCompleted >= 0 && highestCompleted < allLevels.length - 1) {
                  startLevelIndex = highestCompleted + 1;
              } else if (highestCompleted >= allLevels.length - 1) {
                   startLevelIndex = allLevels.length; // Will trigger gameComplete state
                   gameComplete = true;
                   console.log("All levels for this scenario already completed.");
              } else {
                   startLevelIndex = 0; // No progress found
              }
              console.log(`Setting startLevelIndex to: ${startLevelIndex}`);
          } else if (progressIsLoading) {
              console.warn("Progress store loading, defaulting start level to 0.");
              startLevelIndex = 0;
          } else {
              console.log("No levels defined or progress not ready, starting at index 0.");
              startLevelIndex = 0;
          }
  
          // Set initial level if game isn't already complete
          if (!gameComplete) {
              // Check if calculated startLevelIndex is valid before setting
              if (startLevelIndex >= 0 && allLevels && startLevelIndex < allLevels.length){
                   currentLevelIndex = startLevelIndex;
                   setCurrentLevelData();
              } else if (startLevelIndex >= (allLevels ? allLevels.length : 0)){
                   // This case might happen if highestCompleted was the last index
                   console.log("Calculated start index is beyond last level, marking complete.");
                   gameComplete = true;
                   currentLevelIndex = allLevels.length -1; // Set index to last level for context? Or -1?
                   setCurrentLevelData(); // Update UI to show completion message or last level
              } else {
                   console.error(`Invalid startLevelIndex calculated: ${startLevelIndex}`);
                   // Handle error - maybe default to 0 or show error message
                   currentLevelIndex = 0;
                   if(allLevels && allLevels.length > 0) setCurrentLevelData(); else currentLevelData = null;
              }
          } else {
               // Game was already complete based on progress check
                currentLevelIndex = allLevels ? allLevels.length - 1 : -1; // Show last level context?
                setCurrentLevelData(); // Update UI
          }
          // --- End Determining Starting Level ---
  
       } catch (e: any) {
           console.error("Error during component mount setup:", e);
           if (!dbLoadError) { dbLoadError = `Setup error: ${e.message}`; }
       } finally {
          if (isLoadingDb) { isLoadingDb = false; }
          console.log("onMount finished.");
       }
    });
  
    onDestroy(() => {
       if (db) {
          console.log("Closing database on component destroy.");
          try { db.close(); db = null; } catch (e) { console.error("Error closing DB:", e); }
       }
    });
  
  </script>
  
  <!-- ======================= TEMPLATE ======================= -->
  
  <svelte:head>
    <title>{currentLevelData?.title ?? gameTitle} - SQL Stories</title>
  </svelte:head>
  
  <div class="game-container mx-auto p-4 md:p-6 lg:p-8 max-w-6xl">
  
    <!-- Header with Level Info & Navigation -->
    <div class="mb-6 border-b border-gray-700 pb-3 flex justify-between items-center flex-wrap gap-y-2">
      <div>
        <h2 class="text-3xl font-bold text-teal-400 inline">{gameTitle}</h2>
        {#if currentLevelData && !gameComplete}
            <span class="ml-2 sm:ml-4 text-lg sm:text-xl text-gray-400 font-medium">(Level {currentLevelIndex + 1}/{allLevels?.length ?? '?'}: {currentLevelData.title})</span>
        {:else if gameComplete && allLevels}
             <span class="ml-2 sm:ml-4 text-lg sm:text-xl text-green-400 font-medium">(Scenario Complete!)</span>
        {:else if !currentLevelData && !isLoadingDb && !dbLoadError && !gameComplete}
             <span class="ml-2 sm:ml-4 text-lg sm:text-xl text-orange-400 font-medium">(Level Loading...)</span>
        {/if}
      </div>
      <!-- Level Navigation Buttons -->
      {#if allLevels && allLevels.length > 0 && !gameComplete}
      <div class="level-nav flex space-x-2 sm:space-x-3">
          <button
              title="Previous Level"
              on:click={() => goToLevel(currentLevelIndex - 1)}
              disabled={currentLevelIndex <= 0}
              class="px-2 sm:px-3 py-1 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
              ← Prev
          </button>
          <span class="text-gray-400 self-center text-sm sm:text-base">Level {currentLevelIndex + 1} of {allLevels.length}</span>
           <button
              title="Next Level (if accessible)"
              on:click={() => goToLevel(currentLevelIndex + 1)}
              disabled={currentLevelIndex >= highestReachedLevelIndex || currentLevelIndex >= allLevels.length - 1}
              class="px-2 sm:px-3 py-1 bg-gray-600 hover:bg-gray-500 text-gray-200 rounded text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
               Next →
           </button>
      </div>
      {/if}
    </div>
  
    <!-- Main Content Area -->
    {#if isLoadingDb}
      <p class="text-center text-yellow-300 text-lg p-6"><span class="animate-spin inline-block w-5 h-5 border-2 border-t-transparent border-yellow-300 rounded-full mr-2 align-middle"></span> Loading scenario data...</p>
    {:else if dbLoadError}
      <p class="text-red-400 bg-red-900 bg-opacity-50 p-4 rounded border border-red-700">Error: {dbLoadError}</p>
      {:else if gameComplete}
      <!-- Game Completion Message -->
      <div class="text-center p-6 bg-gray-800 rounded shadow">
          <h3 class="text-2xl font-bold text-green-400 mb-4">Scenario Complete!</h3>
          <p class="text-gray-300 mb-6">Well done, pirate! You've pieced together the clues and completed the {gameTitle} scenario.</p>
          <div class="flex justify-center space-x-4">
               <!-- Add Restart Button Here -->
              <button
                  on:click={restartGame}
                  class="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition duration-200"
              >
                  Restart Scenario
              </button>
              <a href="/" class="inline-block bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded transition duration-200 no-underline">
                  Return to Stories
              </a>
          </div>
      </div>
    {:else if !currentLevelData}
       <p class="text-center text-orange-400 p-6">Could not load the current level data. Please check the console or try refreshing.</p>
    {:else if !db}
       <p class="text-center text-red-500 p-6">Database is not available for querying. Check load errors.</p>
    {:else}
      <!-- Main Game UI: Only shown if DB and Level Data are ready -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
  
          <!-- Left Column: Story, Task, Help, Input, Results -->
          <div class="lg:col-span-2 space-y-6">
              <!-- Scenario Briefing / Story Text -->
              <div class="scenario-description bg-gray-800 p-4 rounded shadow">
                <h3 class="text-xl font-semibold text-teal-500 mb-2">Current Objective</h3>
                <p class="text-gray-300 whitespace-pre-line">{currentLevelData.storyText}</p>
                <p class="text-teal-300 font-semibold mt-3">Your Task:</p>
                <p class="text-gray-200 italic">{currentLevelData.task}</p>
              </div>
  
               <!-- Help Section -->
              <div class="help-section bg-gray-800 p-4 rounded shadow">
                  <div class="flex justify-start space-x-4 mb-3">
                       <button on:click={() => showHint = !showHint} class="text-sm text-yellow-400 hover:text-yellow-300 transition">
                           {showHint ? 'Hide' : 'Show'} Hint
                       </button>
                       <button on:click={() => showAnswer = !showAnswer} class="text-sm text-orange-400 hover:text-orange-300 transition">
                           {showAnswer ? 'Hide' : 'Show'} Correct Query
                       </button>
                  </div>
                  {#if showHint}
                      <div class="hint bg-gray-700 p-3 rounded border border-gray-600 mb-2">
                          <p class="text-sm text-yellow-200"><strong class="font-semibold">Hint:</strong> {currentLevelData.hint}</p>
                      </div>
                  {/if}
                  {#if showAnswer}
                       <div class="answer bg-gray-700 p-3 rounded border border-gray-600">
                          <p class="text-sm text-orange-200 font-semibold mb-1">Correct Query:</p>
                          <pre class="text-sm text-orange-100 bg-gray-900 p-2 rounded overflow-x-auto"><code>{currentLevelData.correctQuery}</code></pre>
                      </div>
                  {/if}
              </div>
  
              <!-- SQL Query Input -->
              <div class="query-section">
                <label for="sqlInput" class="block text-lg font-semibold text-gray-200 mb-2">SQL Query Input</label>
                <textarea
                  id="sqlInput"
                  bind:value={sqlInput}
                  rows="8"
                  placeholder="Enter your SQL query here based on the task..."
                  class="w-full p-2 bg-gray-700 text-gray-100 border border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-teal-500 font-mono text-sm"
                  disabled={!db}
                ></textarea>
                <button
                  on:click={runQuery}
                  disabled={!db || !sqlInput.trim()}
                  class="mt-3 bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Run Query
                </button>
              </div>
  
              <!-- Query Results and Validation Feedback -->
               <div class="results-section mt-4 space-y-4">
                  <h3 class="text-xl font-semibold text-gray-200 mb-2">Query Results</h3>
                  {#if queryResult}
                      <!-- 1. Display SQL Error FIRST if it exists -->
                      {#if queryResult.error}
                         <pre class="bg-red-900 bg-opacity-50 text-red-200 p-3 rounded border border-red-700 text-sm whitespace-pre-wrap">Error: {queryResult.error}</pre>
                      {/if}
                      <!-- 2. Display the Results Table (if no error and results exist) -->
                      {#if !queryResult.error && queryResult.columns && queryResult.values}
                          {#if queryResult.values.length > 0}
                              <div class="overflow-x-auto bg-gray-800 rounded shadow border border-gray-600">
                                  <table class="min-w-full text-sm text-left text-gray-300">
                                      <thead class="text-xs text-gray-200 uppercase bg-gray-700">
                                          <tr> {#each queryResult.columns as col} <th scope="col" class="px-4 py-2 border border-gray-600">{col}</th> {/each} </tr>
                                      </thead>
                                      <tbody>
                                          {#each queryResult.values as row}
                                          <tr class="bg-gray-800 border-b border-gray-700 hover:bg-gray-700">
                                              {#each row as cell} <td class="px-4 py-2 border border-gray-600 whitespace-nowrap">{cell === null ? 'NULL' : cell}</td> {/each}
                                          </tr>
                                          {/each}
                                      </tbody>
                                  </table>
                              </div>
                          {:else}
                               <p class="text-gray-400 italic border border-gray-600 p-3 rounded">Query returned no rows.</p>
                          {/if}
                      {/if}
                       <!-- 3. Display Status/Validation Message (if no error) -->
                       {#if !queryResult.error}
                           {#if isCorrect}
                               <div class="bg-green-900 bg-opacity-50 text-green-200 p-4 rounded border border-green-700">
                                   <p class="font-semibold mb-2">Correct!</p>
                                   <p class="mb-3">{currentLevelData.successMessage}</p>
                                   <!-- Use standard Next button or specific button -->
                                   <button on:click={nextLevel} class="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm transition duration-200">
                                       Next Level →
                                   </button>
                               </div>
                           {:else if queryResult.message}
                               <p class="text-blue-300 bg-blue-900 bg-opacity-50 p-3 rounded border border-blue-700">{queryResult.message}</p>
                           {:else if queryResult.columns}
                               <!-- Incorrect Result Message (shown only if query ran and wasn't correct) -->
                               <div class="border border-red-700 p-3 rounded">
                                   <p class="text-sm text-red-300">This query ran, but the result doesn't match the expected answer for this level. Check the task, your query logic, or use the hint!</p>
                               </div>
                           {/if}
                      {/if}
                  {:else}
                      <p class="text-gray-400 italic">Run a query to see results here.</p>
                  {/if}
              </div> <!-- End Results Section -->
  
          </div> <!-- End Left Column -->
  
          <!-- Right Column: Schema -->
          <div class="lg:col-span-1">
              <div class="sticky top-24"> <!-- Make schema sticky on larger screens -->
                  <button
                      on:click={() => showSchema = !showSchema}
                      class="w-full text-left mb-2 text-lg font-semibold text-gray-300 hover:text-teal-400 transition"
                  >
                     Database Schema {showSchema ? '▼' : '▶'}
                  </button>
                  {#if showSchema}
                  <div class="schema-display bg-gray-800 p-3 rounded shadow border border-gray-600 max-h-96 overflow-y-auto">
                      <pre class="text-xs text-gray-300 font-mono whitespace-pre-wrap"><code>{dbSchemaDescription}</code></pre>
                  </div>
                  {/if}
              </div>
          </div> <!-- End Right Column -->
  
      </div> <!-- End Grid -->
    {/if} <!-- End Main Game UI Block -->
  </div> <!-- End Game Container -->
  
  <style>
    /* Add any component-specific styles if needed */
    @media (min-width: 1024px) { /* lg breakpoint */
        .sticky { position: sticky; }
        .top-24 { top: 6rem; } /* Adjust based on header height + margin */
        .max-h-96 { max-height: 24rem; } /* Limit schema height */
    }
     a.no-underline { text-decoration: none; }
  </style>