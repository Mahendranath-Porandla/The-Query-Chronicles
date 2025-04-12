<script lang="ts">
    import { onMount } from 'svelte';
    import GameCard from '$lib/components/GameCard.svelte';
    import type { Game } from '$lib/components/GameCard.svelte';
    import { authStore } from '$lib/stores/authStore'; // Import auth store
    import { getProgress } from '$lib/api'; // Import getProgress
  
    // Subscribe to auth state
    $: auth = $authStore;
  
    // State to hold completed levels (e.g., ["black-pearl/bp-1", "black-pearl/bp-2"])
    let completedLevels: Set<string> = new Set(); // Use a Set for efficient lookup
  
    // Game data (ensure 'id' matches scenario_id used in progress)
    const games: Game[] = [
      {
        id: 'jungle-ledger', // This is the scenario_id
        title: 'Jungle Ledger: Secrets of the Seeonee',
        logline: 'Use the ancient Jungle Ledger database to maintain order, track resources, and investigate mysteries in the wolf pack.',
        imageUrl: '/static/images/jungle_ledger.png',
        path: '/game/jungle-ledger'
      },
      {
        id: 'imf-db', // scenario_id
        title: 'IMF//DB: Disavowed Data',
        logline: 'As a disavowed analyst, use fragmented data dumps and SQL to expose a mole and guide field agents remotely.',
        imageUrl: '/static/images/imf_db.png',
        path: '/game/imf-db'
      },
      {
        id: 'black-pearl', // scenario_id
        title: "The Black Pearl's Ledger: Querying the Curse",
        logline: 'Maintain chaotic pirate ledgers. Track cursed treasures, locate ships, and settle crew disputes using SQL.',
        imageUrl: '/static/images/black_pearl.png',
        path: '/game/black-pearl'
      }
    ];
  
    // Fetch progress when component mounts AND user is logged in
    onMount(async () => {
      // This check ensures we only fetch AFTER the initial auth check is done
      if (auth.isLoggedIn) {
        console.log("Homepage onMount: User logged in, fetching progress...");
        try {
          const progressData = await getProgress();
          completedLevels = new Set(progressData.completed_levels);
          console.log("Fetched completed levels:", completedLevels);
        } catch (error) {
          console.error("Failed to fetch user progress:", error);
          // Handle error - maybe show a message?
        }
      } else {
          console.log("Homepage onMount: User not logged in, skipping progress fetch.");
      }
    });
  
    // Watch for changes in login state AFTER mount to fetch progress if user logs in
    // $: is used for reactivity AFTER the initial script run/onMount
    $: if (auth.isLoggedIn && typeof window !== 'undefined') { // Check typeof window to avoid running on server if SSR were enabled
        console.log("Auth state changed to logged in, fetching progress...");
        getProgress().then(progressData => {
            completedLevels = new Set(progressData.completed_levels);
             console.log("Fetched completed levels after login:", completedLevels);
        }).catch(error => {
             console.error("Failed to fetch user progress after login:", error);
        });
    } else if (!auth.isLoggedIn && typeof window !== 'undefined') {
         // Clear progress if user logs out
         if (completedLevels.size > 0) { // Only clear if needed
              console.log("Auth state changed to logged out, clearing progress.");
              completedLevels = new Set();
         }
    }
  
    // --- Helper function to check if a scenario is considered 'started' or 'completed' ---
    // (This is a simple example, you might want more complex logic)
    function getScenarioStatus(scenarioId: string): 'new' | 'started' | 'completed' {
        // Check if *any* level for this scenario is completed
        const started = [...completedLevels].some(level => level.startsWith(scenarioId + '/'));
        // TODO: Define what "completed" means - e.g., completing the last level?
        // For now, just differentiate between new and started
        return started ? 'started' : 'new';
    }
  
  </script>
  
  <div class="text-center mb-12">
    <h2 class="text-4xl font-bold mb-4 text-teal-300">Welcome to SQL Stories</h2>
    <p class="text-lg text-gray-300 max-w-2xl mx-auto">
      Sharpen your SQL skills by diving into interactive narrative adventures. Choose a story below and query your way through mysteries, challenges, and thrilling plots!
    </p>
  </div>
  
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
    {#each games as game (game.id)}
      <!-- Pass completion status down to the card -->
      <GameCard {game} status={getScenarioStatus(game.id)} />
    {/each}
  </div>