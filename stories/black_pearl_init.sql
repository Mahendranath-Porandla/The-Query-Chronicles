-- SQL script to create tables and insert sample data for Black Pearl's Ledger
-- Version: Complete for 10 Levels

PRAGMA foreign_keys = OFF; -- Disable FK constraints temporarily for easier data loading

-- Drop existing tables if they exist (for easy re-creation)
DROP TABLE IF EXISTS pirates;
DROP TABLE IF EXISTS ships;
DROP TABLE IF EXISTS ports;
DROP TABLE IF EXISTS ledger_entries;
DROP TABLE IF EXISTS ship_logs;
DROP TABLE IF EXISTS crew_manifests;
DROP TABLE IF EXISTS curses_legends;

PRAGMA foreign_keys = ON; -- Re-enable FK constraints

-- =============================================================================
-- Create Tables (Schema Definition)
-- =============================================================================

CREATE TABLE pirates (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    title TEXT, -- e.g., 'Captain', 'Quartermaster', 'First Mate'
    status TEXT DEFAULT 'active', -- 'active', 'cursed', 'marooned', 'pardoned', 'deceased', 'undead'
    known_affiliation TEXT -- e.g., 'Black Pearl Crew', 'Flying Dutchman Crew', 'Royal Navy', 'Independent', 'Associated'
);

CREATE TABLE ships (
    id INTEGER PRIMARY KEY,
    ship_name TEXT UNIQUE NOT NULL,
    ship_class TEXT, -- e.g., 'Galleon', 'Sloop', 'Man O' War', 'Brig'
    captain_id INTEGER,
    status TEXT DEFAULT 'at sea', -- 'at sea', 'in port', 'undead crew', 'sunk', 'captured'
    FOREIGN KEY (captain_id) REFERENCES pirates(id) ON DELETE SET NULL
);

CREATE TABLE ports (
    id INTEGER PRIMARY KEY,
    port_name TEXT UNIQUE NOT NULL,
    region TEXT DEFAULT 'Caribbean', -- 'Caribbean', 'Unknown', 'Atlantic'
    governance TEXT -- e.g., 'Pirate Lord', 'British Crown', 'Spanish Crown', 'None'
);

CREATE TABLE ledger_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT, -- Use AUTOINCREMENT for safety
    entry_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ship_id INTEGER,
    port_id INTEGER, -- Port where the transaction occurred (can be null if at sea)
    item_description TEXT NOT NULL,
    item_category TEXT, -- 'Treasure', 'Supplies', 'Weaponry', 'Artifact', 'Personnel', 'Information'
    value_doubloons INTEGER DEFAULT 0,
    status TEXT, -- 'acquired', 'lost', 'stolen', 'cursed', 'spent', 'rumored', 'delivered', 'hidden'
    notes TEXT,
    FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE,
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE SET NULL
);

CREATE TABLE ship_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ship_id INTEGER NOT NULL,
    log_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    event_type TEXT NOT NULL, -- 'Sighting', 'Departure', 'Arrival', 'Combat', 'Discovery', 'Weather', 'Repair', 'Mutiny', 'Order'
    location_description TEXT, -- e.g., 'Open Sea, NE of Tortuga', 'Near reef'
    port_id INTEGER, -- Port related to event, if any (e.g., Arrival/Departure port)
    details TEXT, -- Narrative details, observations, clues
    FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE,
    FOREIGN KEY (port_id) REFERENCES ports(id) ON DELETE SET NULL
);

CREATE TABLE crew_manifests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    pirate_id INTEGER NOT NULL,
    ship_id INTEGER NOT NULL,
    role TEXT NOT NULL, -- 'Captain', 'First Mate', 'Cabin Boy', 'Gunner', 'Cook', 'Navigator', 'Prisoner'
    date_joined DATE,
    share_percentage REAL DEFAULT 1.0, -- Share of loot
    FOREIGN KEY (pirate_id) REFERENCES pirates(id) ON DELETE CASCADE,
    FOREIGN KEY (ship_id) REFERENCES ships(id) ON DELETE CASCADE,
    UNIQUE(pirate_id, ship_id, role) -- A pirate can have one role per ship
);

CREATE TABLE curses_legends (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    related_item TEXT, -- Item associated with the curse/legend
    description TEXT,
    known_effects TEXT
);


-- =============================================================================
-- Insert Sample Data (Chronologically & Logically Ordered)
-- =============================================================================

BEGIN TRANSACTION;

-- Pirates (Initial State)
INSERT INTO pirates (id, name, title, status, known_affiliation) VALUES
(1, 'Captain Jax', 'Captain', 'active', 'Black Pearl Crew'),
(2, 'Barbarossa', 'First Mate', 'active', 'Black Pearl Crew'), -- Starts as First Mate
(3, 'Master Gibbs', 'Quartermaster', 'active', 'Black Pearl Crew'),
(4, 'Will Turner', 'Blacksmith', 'active', 'Independent'),
(5, 'Eliza Swann', 'Governor''s Daughter', 'active', 'Associated'),
(6, 'Commodore Norrington', 'Commodore', 'active', 'Royal Navy'),
(7, 'Bootstrap Bill Turner', 'Seaman', 'deceased', 'Flying Dutchman Crew'), -- Status reflects curse later
(8, 'Pintel', 'Gunner', 'active', 'Black Pearl Crew'),
(9, 'Ragetti', 'Gunner', 'active', 'Black Pearl Crew'),
(11, 'Cotton', 'Mute Seaman', 'active', 'Black Pearl Crew'),
(12, 'Marty', 'Dwarf Pirate', 'active', 'Black Pearl Crew');


-- Ships (Initial State)
INSERT INTO ships (id, ship_name, ship_class, captain_id, status) VALUES
(101, 'The Black Pearl', 'Galleon', 1, 'at sea'), -- Jax captains initially
(102, 'HMS Dauntless', 'Man O'' War', 6, 'in port'),
(103, 'HMS Interceptor', 'Brig', 6, 'in port'), -- Norrington commands both initially
(104, 'Queen Anne''s Revenge', 'Galleon', NULL, 'rumored'); -- Barbarossa might get this later


-- Ports
INSERT INTO ports (id, port_name, region, governance) VALUES
(201, 'Tortuga', 'Caribbean', 'Pirate Lord'),
(202, 'Port Royal', 'Caribbean', 'British Crown'),
(203, 'Shipwreck Cove', 'Caribbean', 'Pirate Lord'),
(204, 'Isla de Muerta', 'Unknown', 'None');


-- Curses & Legends
INSERT INTO curses_legends (id, name, related_item, description, known_effects) VALUES
(301, 'Aztec Gold Curse', 'Aztec Medallion', 'Gold cursed by pagan gods; payment for Cortés'' slaughter.', 'Crew who spend it become undead skeletons in moonlight, cannot feel pleasure, cannot die.');


-- Early Events & Logs (Leading to Mutiny & Curse)
INSERT INTO crew_manifests (pirate_id, ship_id, role, date_joined, share_percentage) VALUES
(1, 101, 'Captain', '1718-01-01', 5.0),
(2, 101, 'First Mate', '1718-01-01', 3.0),
(3, 101, 'Quartermaster', '1718-01-15', 2.0),
(8, 101, 'Gunner', '1718-02-10', 1.0),
(9, 101, 'Gunner', '1718-02-10', 1.0),
(11, 101, 'Mute Seaman', '1718-02-15', 1.0),
(12, 101, 'Dwarf Pirate', '1718-03-01', 1.0),
(6, 102, 'Captain', '1719-05-01', 0.0),
(6, 103, 'Captain', '1719-05-01', 0.0); -- Norrington commands Interceptor too

INSERT INTO ship_logs (ship_id, log_timestamp, event_type, location_description, port_id, details) VALUES
(101, '1720-05-15 23:00:00', 'Discovery', 'Thick Fog Bank', NULL, 'First Mate Barbarossa guided us to a strange island, not on charts. Mist hides it well. He calls it Isla de Muerta.'),
(101, '1720-05-20 09:00:00', 'Arrival', NULL, 204, 'Anchored at Isla de Muerta. Barbarossa led shore party. Found stone chest filled with gold medallions.'),
(101, '1720-05-20 10:00:00', 'Ledger Update', 'Isla de Muerta', NULL, 'Barbarossa''s party brought back the chest.'),
(101, '1720-05-20 11:00:00', 'Mutiny', 'Isla de Muerta', 204, 'Barbarossa and his loyalists mutinied against Captain Jax! They claim Jax withheld the location. They marooned Jax on a deserted isle with naught but a pistol with one shot.'),
(101, '1720-05-20 12:00:00', 'Departure', NULL, 204, 'The Black Pearl departed Isla de Muerta under Captain Barbarossa.');

-- Update state after mutiny
UPDATE pirates SET title='Captain', known_affiliation='Black Pearl Crew (Mutineers)' WHERE id = 2; -- Barbarossa is Captain
UPDATE pirates SET status='marooned' WHERE id = 1; -- Jax is marooned
UPDATE ships SET captain_id = 2 WHERE id = 101; -- Barbarossa commands Pearl
DELETE FROM crew_manifests WHERE pirate_id = 1 AND ship_id = 101; -- Remove Jax from manifest
UPDATE crew_manifests SET role='Captain' WHERE pirate_id = 2 AND ship_id = 101; -- Update Barbarossa's role


-- Curse takes effect, crew spends gold
INSERT INTO ledger_entries (ship_id, port_id, item_description, item_category, value_doubloons, status, notes, entry_timestamp) VALUES
(101, NULL, 'Aztec Medallion', 'Artifact', 1000, 'cursed', 'Piece #1 of 882. Taken by Barbarossa.', '1720-05-20 11:30:00'),
(101, NULL, 'Aztec Medallion', 'Artifact', 1000, 'cursed', 'Piece #2 of 882. Taken by Pintel.', '1720-05-20 11:31:00'),
(101, NULL, 'Aztec Medallion', 'Artifact', 1000, 'cursed', 'Piece #3 of 882. Taken by Ragetti.', '1720-05-20 11:32:00'),
(101, NULL, 'Aztec Medallion', 'Artifact', 1000, 'cursed', 'Piece #4 of 882. Taken by Cotton.', '1720-05-20 11:33:00'),
(101, NULL, 'Aztec Medallion', 'Artifact', 1000, 'cursed', 'Piece #5 of 882. Taken by Marty.', '1720-05-20 11:34:00'),
-- Add more cursed medallions distributed among the crew...
(101, NULL, 'Aztec Medallion', 'Artifact', 1000, 'cursed', 'Piece #10 of 882.', '1720-05-20 11:40:00'),
(101, 201, 'Rum (Lots)', 'Supplies', 200, 'spent', 'Crew spent cursed gold freely in Tortuga. Realized curse later.', '1720-05-25 18:00:00');

-- Crew status reflects the curse
UPDATE pirates SET status='undead' WHERE id IN (SELECT pirate_id FROM crew_manifests WHERE ship_id = 101); -- Whole crew is cursed/undead
UPDATE ships SET status='undead crew' WHERE id=101;

-- Logs reflecting cursed crew actions and Jax's return
INSERT INTO ship_logs (ship_id, log_timestamp, event_type, location_description, port_id, details) VALUES
(101, '1720-05-26 01:00:00', 'Weather', 'Open Sea', NULL, 'Full moon reveals the crew''s skeletal forms. The curse is real! Despair sets in.'),
(101, '1720-06-05 12:00:00', 'Sighting', 'Near Rumrunner''s Isle', NULL, 'Spotted Captain Jax sailing a makeshift raft pulled by sea turtles! How did he escape?'),
(101, '1720-06-08 10:00:00', 'Sighting', 'Off the coast of Port Royal', NULL, 'Spotted HMS Dauntless. Changed course quickly. Need to avoid the Navy while we gather the medallions.'),
(101, '1720-06-10 15:00:00', 'Arrival', NULL, 201, 'Docked in Tortuga for supplies. Crew must remain hidden during moonlight.'),
-- This is the log entry referenced in Level 1 - Jax is seen AFTER Barbarossa arrives in Tortuga with the cursed Pearl
(101, '1720-06-10 15:30:00', 'Sighting', 'Tortuga Docks', 201, 'Saw Captain Jax near the Faithful Bride tavern, muttering about medallions. Looks like he made it back!'), -- Log not associated with a ship
(102, '1720-06-11 08:00:00', 'Departure', NULL, 202, 'HMS Dauntless setting sail from Port Royal. Orders to patrol shipping lanes.'),
(101, '1720-06-12 11:00:00', 'Departure', NULL, 201, 'Left Tortuga under cover of night. Barbarossa seeks the last medallion, said to be held by Bootstrap Bill''s child.'),
(101, '1720-06-18 14:00:00', 'Sighting', 'Open Sea', NULL, 'Crew morale low. Constant search for medallions. Some whispers about returning the treasure.'),
(103, '1720-06-19 09:00:00', 'Order', 'Port Royal Docks', 202, 'Commodore Norrington orders HMS Interceptor prepared for immediate pursuit of any pirate vessel, especially The Black Pearl.');


-- Update state for the *start of the game* (Jax has somehow regained the Pearl, Barbarossa might be hunting him)
-- This reflects the setup where the player meets Gibbs *after* Jax is back in Tortuga.
UPDATE pirates SET status='active', known_affiliation='Black Pearl Crew' WHERE id = 1; -- Jax active again
UPDATE pirates SET status='undead', title='Disgraced Captain', known_affiliation='Mutineer' WHERE id = 2; -- Barbarossa still cursed, lost Pearl
UPDATE ships SET captain_id = 1, status='at sea' WHERE id = 101; -- Jax captains Pearl again
UPDATE crew_manifests SET role='Captain' WHERE pirate_id = 1 AND ship_id = 101; -- Update/Insert Jax
-- Keep Barbarossa's crew cursed, maybe some followed Jax, some didn't? Simplify: Assume core cursed crew stick together.
DELETE FROM crew_manifests WHERE pirate_id = 2 AND ship_id = 101; -- Remove Barbarossa as Captain from manifest
-- Add Pintel/Ragetti back under Jax? Assume they rejoin whoever has the Pearl
UPDATE crew_manifests SET pirate_id=8 WHERE pirate_id=8 AND ship_id=101; -- Update existing Pintel or insert if needed
UPDATE crew_manifests SET pirate_id=9 WHERE pirate_id=9 AND ship_id=101; -- Update existing Ragetti or insert if needed


-- Data for later levels
-- Barbarossa gets another ship (let's say he commandeers Queen Anne's Revenge)
UPDATE ships SET captain_id = 2, status = 'at sea' WHERE id = 104; -- Barbarossa takes Queen Anne's Revenge (ID 104)
UPDATE pirates SET known_affiliation = 'Queen Anne Crew' WHERE id = 2;
-- Assume Pintel and Ragetti join Barbarossa again for Level 7
INSERT INTO crew_manifests (pirate_id, ship_id, role, date_joined, share_percentage) VALUES
(8, 104, 'Gunner', '1720-06-20', 1.5), -- Pintel joins Barbarossa
(9, 104, 'Gunner', '1720-06-20', 1.5); -- Ragetti joins Barbarossa
-- Remove them from Pearl if they fully switched (or keep them if they play both sides?) - Let's remove for clarity.
-- DELETE FROM crew_manifests WHERE pirate_id IN (8, 9) AND ship_id = 101;

-- Final piece of treasure for Level 10
INSERT INTO ledger_entries (ship_id, port_id, item_description, item_category, value_doubloons, status, notes, entry_timestamp) VALUES
(101, 202, 'Blood Medallion', 'Artifact', 0, 'hidden', 'The final piece. Requires blood payment. Hidden by Will Turner''s father long ago.', '1720-06-25 10:00:00');


COMMIT; -- Finalize changes