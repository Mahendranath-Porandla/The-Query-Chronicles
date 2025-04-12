// frontend/src/lib/stores/authStore.ts
import { writable } from 'svelte/store';
import type { User } from '$lib/api'; // Import the User interface
import { checkStatus } from '$lib/api';
// Import progress functions
import { initializeProgress, clearProgress } from '$lib/stores/progressStore';


export interface AuthState {
    isLoggedIn: boolean;
    user: User | null;
    isLoading: boolean; // Track initial status check
}

// Create the writable store with an initial state
const initialAuthState: AuthState = {
    isLoggedIn: false,
    user: null,
    isLoading: true, // Start in loading state
};


// --- Actions ---
export const authStore = writable<AuthState>(initialAuthState);

// Modify initializeAuth to also initialize progress on success
export async function initializeAuth(): Promise<void> {
     console.log("Initializing auth store...");
     authStore.update(state => ({ ...state, isLoading: true })); // Ensure loading is true
    try {
        const status = await checkStatus();
         console.log("Auth status received:", status);
        authStore.update(state => ({
            ...state,
            isLoggedIn: status.is_logged_in,
            user: status.user,
            isLoading: false,
        }));

        // <<< If logged in, initialize progress >>>
        if (status.is_logged_in) {
            await initializeProgress();
        } else {
            clearProgress(); // Ensure progress is clear if not logged in
        }
        // <<< End progress initialization >>>

    } catch (error) {
        console.error('Failed to initialize auth status:', error);
        authStore.update(state => ({
            ...state,
            isLoggedIn: false,
            user: null,
            isLoading: false,
        }));
        clearProgress(); // Clear progress on auth error too
    }
}

// Modify setUserLoggedIn to initialize progress
 export function setUserLoggedIn(user: User): void {
    authStore.update(state => ({
        ...state,
        isLoggedIn: true,
        user: user,
        isLoading: false,
    }));
    // <<< Initialize progress after successful login >>>
    initializeProgress();
}

// Modify setUserLoggedOut to clear progress
export function setUserLoggedOut(): void {
    authStore.update(state => ({
        ...state,
        isLoggedIn: false,
        user: null,
        isLoading: false,
    }));
    // <<< Clear progress on logout >>>
    clearProgress();
}