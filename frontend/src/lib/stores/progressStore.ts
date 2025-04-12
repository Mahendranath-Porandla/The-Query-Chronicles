// frontend/src/lib/stores/progressStore.ts
import { writable } from 'svelte/store';
import { getProgress } from '$lib/api';

// The store will hold a Set of completed level strings like "scenario_id/level_id"
export const progressStore = writable<Set<string>>(new Set());
export const isLoadingProgress = writable<boolean>(true); // Track loading state

// Function to fetch and initialize progress (call this after login/auth check)
export async function initializeProgress(): Promise<void> {
    console.log("Initializing progress store...");
    isLoadingProgress.set(true);
    try {
        // Assumes user is already authenticated when this is called
        const progressData = await getProgress();
        const completedSet = new Set(progressData.completed_levels);
        progressStore.set(completedSet);
        console.log("Progress store initialized:", completedSet);
    } catch (error) {
        // Handle errors (e.g., user not logged in, API error)
        console.error('Failed to initialize progress status:', error);
        progressStore.set(new Set()); // Reset to empty on error
    } finally {
         isLoadingProgress.set(false);
    }
}

// Function to add a newly completed level (called by the game page)
// This updates the store instantly without needing another fetch
export function addCompletedLevel(scenarioId: string, levelId: string): void {
     const levelString = `${scenarioId}/${levelId}`;
     progressStore.update(currentSet => {
        if (!currentSet.has(levelString)) {
             console.log(`Adding ${levelString} to progress store.`);
             // Create a new Set to trigger Svelte reactivity
             return new Set(currentSet).add(levelString);
        }
        return currentSet; // Return original set if already present
     });
}

// Function to clear progress (call on logout)
export function clearProgress(): void {
    console.log("Clearing progress store.");
    progressStore.set(new Set());
    isLoadingProgress.set(true); // Reset loading state for next login
}