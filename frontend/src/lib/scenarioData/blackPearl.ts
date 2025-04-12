// frontend/src/lib/scenarioData/blackPearl.ts
// Version: Complete for 10 Levels

// Interface defining the structure of the expected query result for validation
export interface QueryResult {
    columns: string[];
    // Using 'any' for flexibility, but specific types could be used
    // if validation logic handles type checking strictly.
    values: any[][];
}

// Interface defining the structure of a game level
export interface Level {
    levelId: string;
    title: string;
    storyText: string;
    task: string;
    hint: string;
    correctQuery: string;
    expectedResult: QueryResult;
    successMessage: string;
}

// --- Database Schema Description (for display in UI) ---
export const dbSchemaDescription = `
-- Pirates holding grudges and allegiances
CREATE TABLE pirates (
    id INTEGER PRIMARY KEY, -- Unique identifier for each pirate
    name TEXT UNIQUE NOT NULL, -- Pirate's known name or alias
    title TEXT, -- e.g., 'Captain', 'Quartermaster'
    status TEXT, -- 'active', 'cursed', 'marooned', 'pardoned', 'deceased', 'undead'
    known_affiliation TEXT -- e.g., 'Black Pearl Crew', 'Royal Navy'
);

-- Ships sailing the seas, some faster or more cursed than others
CREATE TABLE ships (
    id INTEGER PRIMARY KEY, -- Unique identifier for each ship
    ship_name TEXT UNIQUE NOT NULL, -- Name of the vessel
    ship_class TEXT, -- e.g., 'Galleon', 'Sloop', 'Brig'
    captain_id INTEGER, -- FOREIGN KEY references pirates(id)
    status TEXT -- 'at sea', 'in port', 'undead crew', 'sunk', 'captured'
);

-- Ports of call, from bustling towns to hidden coves
CREATE TABLE ports (
    id INTEGER PRIMARY KEY, -- Unique identifier for each port
    port_name TEXT UNIQUE NOT NULL, -- Name of the port
    region TEXT, -- e.g., 'Caribbean', 'Unknown'
    governance TEXT -- e.g., 'Pirate Lord', 'British Crown', 'None'
);

-- Ledger tracking goods, treasures, and cursed artifacts
CREATE TABLE ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_timestamp DATETIME, -- When the entry was recorded
    ship_id INTEGER, -- FOREIGN KEY references ships(id)
    port_id INTEGER, -- Port where transaction occurred (if any)
    item_description TEXT NOT NULL, -- What was acquired/lost
    item_category TEXT, -- 'Treasure', 'Supplies', 'Weaponry', 'Artifact', 'Information'
    value_doubloons INTEGER, -- Estimated value
    status TEXT, -- 'acquired', 'lost', 'cursed', 'spent', 'rumored', 'hidden'
    notes TEXT -- Additional details about the entry
);

-- Ship logs recording sightings, events, and vital clues
CREATE TABLE ship_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ship_id INTEGER NOT NULL, -- FOREIGN KEY references ships(id)
    log_timestamp DATETIME, -- Time of the logged event
    event_type TEXT NOT NULL, -- 'Sighting', 'Departure', 'Arrival', 'Combat', 'Discovery', 'Mutiny'
    location_description TEXT, -- Location if not a specific port
    port_id INTEGER, -- Port related to event (if any)
    details TEXT -- Narrative details, observations, potential clues
);

-- Crew lists - who serves under which captain?
CREATE TABLE crew_manifests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pirate_id INTEGER NOT NULL, -- FOREIGN KEY references pirates(id)
    ship_id INTEGER NOT NULL, -- FOREIGN KEY references ships(id)
    role TEXT NOT NULL, -- 'Captain', 'First Mate', 'Gunner', etc.
    date_joined DATE,
    share_percentage REAL -- Share of loot
);

-- Legends and Curses whispered across the waves
CREATE TABLE curses_legends (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL, -- Name of the curse or legend
    related_item TEXT, -- Item associated (e.g., 'Aztec Medallion')
    description TEXT,
    known_effects TEXT
);
`;


// --- Level Definitions (10 Levels) ---
// IMPORTANT: expectedResult MUST exactly match the output of correctQuery on the sample data
export const levels: Level[] = [
    {
        levelId: 'bp-1',
        title: 'Whispers in Tortuga',
        storyText: "Right then, newbie. Master Gibbs here. The rum's buzzing with tales of Captain Jax and some cursed Aztec Gold. Folks say he was just in Tortuga, acting stranger than usual. Let's start simple: we need proof he was actually here recently.",
        task: "Find the most recent log entry recorded *in Tortuga* where the details mention 'Captain Jax'. Select only the `log_timestamp` and `details`.",
        hint: "You'll need the `ship_logs` table for general sightings, or maybe just look for logs associated with the port Tortuga (ID: 201). Use `LIKE` to search the `details`. Remember `ORDER BY` and `LIMIT`.",
        correctQuery: `
SELECT log_timestamp, details
FROM ship_logs
WHERE port_id = 201 -- Tortuga's ID
  AND details LIKE '%Captain Jax%'
ORDER BY log_timestamp DESC
LIMIT 1;`.trim(),
        expectedResult: {
            columns: ['log_timestamp', 'details'],
            values: [
                // This entry is NOT tied to a ship_id in the sample data, representing a general sighting log.
                ['1720-06-10 15:30:00', 'Saw Captain Jax near the Faithful Bride tavern, muttering about medallions. Looks like he made it back!']
            ]
        },
        successMessage: "Aye, that's the one! See? He *was* here. Now, what ship does that scallywag command these days? The log mentioned the 'Black Pearl'... let's confirm."
    },
    {
        levelId: 'bp-2',
        title: "Jax's Ride",
        storyText: "Gibbs again. Knowing Jax was here is one thing, knowing his ship is another. If we're tracking him, we need to know what sails to look for.",
        task: "Identify the `ship_name` and `ship_class` currently listed as being captained by the pirate named 'Captain Jax'.",
        hint: "You'll need information from both the `pirates` and `ships` tables. Use a `JOIN` clause to link them based on the captain's ID.",
        correctQuery: `
SELECT s.ship_name, s.ship_class
FROM ships s
JOIN pirates p ON s.captain_id = p.id
WHERE p.name = 'Captain Jax';`.trim(),
        expectedResult: {
            columns: ['ship_name', 'ship_class'],
            values: [
                ['The Black Pearl', 'Galleon']
            ]
        },
        successMessage: "The Black Pearl... figures. Fastest ship in the Caribbean, they say. Though I hear strange things about her crew and cargo. Let's check the official ledger for anything unusual associated with her."
    },
    {
        levelId: 'bp-3',
        title: 'Questionable Cargo',
        storyText: "Right, so the Pearl's confirmed under Jax's command again. Word is, some of its loot is... unnatural. Check the official `ledger_entries`.",
        task: "List the `item_description` and `entry_timestamp` for all items associated with the ship named 'The Black Pearl' (ship_id 101) that are marked with the status 'cursed'. Order by timestamp.",
        hint: "Focus on the `ledger_entries` table. Filter by `ship_id` and the `status` column. Remember `ORDER BY`.",
        correctQuery: `
SELECT item_description, entry_timestamp
FROM ledger_entries
WHERE ship_id = 101 -- The Black Pearl's ID
  AND status = 'cursed'
ORDER BY entry_timestamp;`.trim(),
        expectedResult: {
            columns: ['item_description', 'entry_timestamp'],
            values: [
                ['Aztec Medallion', '1720-05-20 11:30:00'],
                ['Aztec Medallion', '1720-05-20 11:31:00'],
                ['Aztec Medallion', '1720-05-20 11:32:00'],
                ['Aztec Medallion', '1720-05-20 11:33:00'],
                ['Aztec Medallion', '1720-05-20 11:34:00'],
                ['Aztec Medallion', '1720-05-20 11:40:00']
            ]
        },
        successMessage: "Cursed items... Just as I thought. Aztec Medallions! That explains the rumors about the crew. Now, the legend mentions an island... Isla de Muerta. Has the Pearl ever been logged near a place matching that description, or made any strange 'Discoveries'?"
    },
    {
        levelId: 'bp-4',
        title: 'The Phantom Isle',
        storyText: "Isla de Muerta... an island that supposedly cannot be found, except by those who already know where it is. Let's scan the logs for any mention of it, or any unusual 'discoveries' made by the Pearl (ship_id 101).",
        task: "Find any `ship_log` entries for ship_id 101 where the `details` mention 'Isla de Muerta' OR the `event_type` is 'Discovery'. Select the `log_timestamp`, `event_type`, and `details`.",
        hint: "Filter `ship_logs` by `ship_id = 101`. Use a `WHERE` clause with parentheses `()` and an `OR` condition to check `details LIKE '%Isla de Muerta%'` or `event_type = 'Discovery'`.",
        correctQuery: `
SELECT log_timestamp, event_type, details
FROM ship_logs
WHERE ship_id = 101
  AND (details LIKE '%Isla de Muerta%' OR event_type = 'Discovery');`.trim(),
        expectedResult: {
            columns: ['log_timestamp', 'event_type', 'details'],
            values: [
                ['1720-05-15 23:00:00', 'Discovery', 'First Mate Barbarossa guided us to a strange island, not on charts. Mist hides it well. He calls it Isla de Muerta.'],
                ['1720-05-20 09:00:00', 'Arrival', 'Anchored at Isla de Muerta. Barbarossa led shore party. Found stone chest filled with gold medallions.'],
                ['1720-05-20 12:00:00', 'Departure', 'The Black Pearl departed Isla de Muerta under Captain Barbarossa.']
            ]
        },
        successMessage: "There! A discovery, matching the description. That must be it. Now, who else might be interested in this treasure? Barbarossa's name came up in that log... What's his current status according to our records?"
    },
    {
        levelId: 'bp-5',
        title: "Barbarossa's State",
        storyText: "Barbarossa... He led the mutiny, took the gold first. If he's still around, he'll be after the Pearl and the means to lift the curse. Check his status in the `pirates` table.",
        task: "Find the current `status` and `known_affiliation` for the pirate named 'Barbarossa'.",
        hint: "A simple `SELECT` from the `pirates` table, filtered by `name`.",
        correctQuery: `
SELECT status, known_affiliation
FROM pirates
WHERE name = 'Barbarossa';`.trim(),
        expectedResult: {
            columns: ['status', 'known_affiliation'],
            values: [
                ['undead', 'Queen Anne Crew'] // He's undead and now affiliated with Queen Anne's Revenge
            ]
        },
        successMessage: "Undead and commanding the 'Queen Anne Crew'? He must have found another ship! Curses... we need to know which ship that is."
    },
    {
        levelId: 'bp-6',
        title: "Barbarossa's New Ride",
        storyText: "So, Barbarossa's undead and leading the 'Queen Anne Crew'. Which ship bears that cursed name? We need to identify his current vessel.",
        task: "Find the `ship_name` and `ship_class` of the ship currently captained by the pirate named 'Barbarossa' (pirate_id 2).",
        hint: "Similar to Level 2, `JOIN` the `ships` and `pirates` tables, but filter for Barbarossa's name or ID.",
        correctQuery: `
SELECT s.ship_name, s.ship_class
FROM ships s
JOIN pirates p ON s.captain_id = p.id
WHERE p.name = 'Barbarossa';`.trim(),
        expectedResult: {
            columns: ['ship_name', 'ship_class'],
            values: [
                ["Queen Anne's Revenge", 'Galleon']
            ]
        },
        successMessage: "Queen Anne's Revenge... A fearsome name. He's likely gathering crew. Did any of the original Pearl crew join him? Particularly those two fools, Pintel and Ragetti?"
    },
    {
        levelId: 'bp-7',
        title: 'Fickle Loyalties',
        storyText: "Some pirates follow gold, others follow fear. Let's see who might be playing both sides or switched allegiance. We need to identify pirates who have served on *both* The Black Pearl (ship_id 101) *and* Queen Anne's Revenge (ship_id 104).",
        task: "List the `name` of pirates who have entries in the `crew_manifests` table for BOTH ship_id 101 AND ship_id 104.",
        hint: "This requires identifying pirates present in manifests for both ships. One way is to `JOIN` `pirates` with `crew_manifests`, `GROUP BY` pirate name/id, and use `HAVING COUNT(DISTINCT ship_id) = 2` after filtering `WHERE ship_id IN (101, 104)`.",
        correctQuery: `
SELECT p.name
FROM pirates p
JOIN crew_manifests cm ON p.id = cm.pirate_id
WHERE cm.ship_id IN (101, 104) -- Filter manifests for only these two ships
GROUP BY p.id, p.name -- Group by pirate
HAVING COUNT(DISTINCT cm.ship_id) = 2; -- Ensure they were on BOTH distinct ships`.trim(),
        expectedResult: {
            columns: ['name'],
            values: [
                // Based on sample data, Pintel & Ragetti were added to QAR manifest after being on Pearl
                 ['Pintel'],
                 ['Ragetti']
            ]
        },
        successMessage: "Pintel and Ragetti! Those turncoats. Figures they'd follow Barbarossa. This means Barbarossa has cursed crew too. While they squabble, the Navy might be closing in. Where are Norrington's ships?"
    },
     {
        levelId: 'bp-8',
        title: 'Navy Patrols',
        storyText: "Commodore Norrington isn't one to sit idle while pirates roam freely. He commands the HMS Dauntless and HMS Interceptor. Check the logs for their recent activity.",
        task: "Find the `ship_name` and the `details` of the latest log entry for any ship whose name starts with 'HMS'.",
        hint: "You'll need to `JOIN` `ships` and `ship_logs`. Filter ships using `ship_name LIKE 'HMS%'`. Find the latest entry overall using `ORDER BY log_timestamp DESC` and `LIMIT 1`.",
        correctQuery: `
SELECT s.ship_name, sl.details
FROM ship_logs sl
JOIN ships s ON sl.ship_id = s.id
WHERE s.ship_name LIKE 'HMS%'
ORDER BY sl.log_timestamp DESC
LIMIT 1;`.trim(),
        expectedResult: {
            columns: ['ship_name', 'details'],
            values: [
                ['HMS Interceptor', 'Commodore Norrington orders HMS Interceptor prepared for immediate pursuit of any pirate vessel, especially The Black Pearl.']
            ]
        },
        successMessage: "The Interceptor is ready for pursuit! Norrington is actively hunting the Pearl. Speed might be crucial. Speaking of value, just how much is that cursed treasure worth?"
    },
    {
        levelId: 'bp-9',
        title: 'Value of the Damned',
        storyText: "All this trouble for gold... cursed gold at that. Let's get an estimate of the total value recorded for the cursed items aboard the Pearl.",
        task: "Calculate the total `value_doubloons` for all ledger entries associated with The Black Pearl (ship_id 101) that have the status 'cursed'.",
        hint: "Use the `SUM()` aggregate function on the `value_doubloons` column. Filter the `ledger_entries` table by `ship_id` and `status`.",
        correctQuery: `
SELECT SUM(value_doubloons) AS total_cursed_value
FROM ledger_entries
WHERE ship_id = 101
  AND status = 'cursed';`.trim(),
        expectedResult: {
            columns: ['total_cursed_value'],
            values: [
                // 1000 * 6 medallions = 6000
                [6000]
            ]
        },
        successMessage: "Thousands of doubloons... a king's ransom, yet worthless to the cursed. Only returning it all, with a blood sacrifice, can lift it. The final piece requires blood... where did we see mention of that?"
    },
    {
        levelId: 'bp-10',
        title: 'Blood Price',
        storyText: "The curse requires blood payment. Someone mentioned a specific 'Blood Medallion'. Check the ledgers again for any hidden or special artifacts related to the curse, perhaps linked to Will Turner's father.",
        task: "Find the `item_description` and `notes` from `ledger_entries` for any item with 'Medallion' in its description and 'hidden' or 'cursed' status, particularly any notes mentioning 'Will Turner' or 'blood'.",
        hint: "Search `ledger_entries` using `item_description LIKE '%Medallion%'` and `status IN ('hidden', 'cursed')`. Also check the `notes` column using `LIKE '%Will Turner%'` OR `LIKE '%blood%'`.",
        correctQuery: `
SELECT item_description, notes
FROM ledger_entries
WHERE item_description LIKE '%Medallion%'
  AND status IN ('hidden', 'cursed')
  AND (notes LIKE '%Will Turner%' OR notes LIKE '%blood%');`.trim(),
        expectedResult: {
            columns: ['item_description', 'notes'],
            values: [
                ["Blood Medallion", "The final piece. Requires blood payment. Hidden by Will Turner's father long ago."]
            ]
        },
        successMessage: "That's it! The Blood Medallion, hidden by Bootstrap Bill, requiring blood payment... likely from his child, Will Turner! We know where to find the treasure (Isla de Muerta) and what's needed to break the curse. Our quest for the ledger is complete... for now."
    }
];