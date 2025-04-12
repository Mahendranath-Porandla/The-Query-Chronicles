// frontend/src/lib/api.ts

// Define expected user structure based on API responses
export interface User {
    id: number;
    username: string;
    // Add email or other fields if your API returns them and you need them frontend-side
}

// Define structure for status response
export interface AuthStatusResponse {
    is_logged_in: boolean;
    user: User | null;
}

// Define structure for login/register success response
export interface AuthSuccessResponse {
    message: string;
    user: User;
}

// Define structure for error responses
export interface AuthErrorResponse {
    error: string;
}

/**
 * Helper function for making API requests
 * Handles setting Content-Type and parsing JSON responses/errors
 */
async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
    const defaultHeaders: HeadersInit = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    };

    options.headers = { ...defaultHeaders, ...options.headers };
    // Ensure credentials (like session cookies) are sent with requests
    options.credentials = 'include';

    try {
        const response = await fetch(url, options);

        // Attempt to parse JSON regardless of status code first
        let responseData: any;
        try {
             responseData = await response.json();
        } catch (e) {
             // If parsing fails (e.g., empty response), create a generic error
             if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
             }
             // If response was OK but no JSON, maybe return null or handle as needed
             return null as T; // Adjust if empty success response is possible
        }


        if (!response.ok) {
            // If API returned an error JSON { "error": "..." }
            if (responseData && responseData.error) {
                throw new Error(responseData.error);
            }
            // Otherwise, throw a generic HTTP error
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return responseData as T;

    } catch (error) {
        console.error(`API request failed: ${options.method || 'GET'} ${url}`, error);
         // Re-throw the error so the calling component can handle it
         // The error message should ideally be the one from responseData.error if available
        throw error;
    }
}

// --- Specific API Functions ---

export function checkStatus(): Promise<AuthStatusResponse> {
    return apiRequest<AuthStatusResponse>('/api/status', { method: 'GET' });
}

export function login(username: string, password: string): Promise<AuthSuccessResponse> {
    return apiRequest<AuthSuccessResponse>('/api/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
    });
}

export function register(username: string, email: string, password: string): Promise<AuthSuccessResponse> {
    return apiRequest<AuthSuccessResponse>('/api/register', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
    });
}

export function logout(): Promise<{ message: string }> {
    // Logout doesn't typically return user data, just a success message
    return apiRequest<{ message: string }>('/api/logout', { method: 'POST' });
}



// --- Progress API Functions ---

/**
 * Saves completed level progress for the logged-in user.
 * @param scenarioId e.g., 'black-pearl'
 * @param levelId e.g., 'bp-1'
 * @returns Promise resolving to a success message object or throwing an error.
 */
export function saveProgress(scenarioId: string, levelId: string): Promise<{ message: string }> {
    console.log(`API: Calling saveProgress for ${scenarioId}/${levelId}`);
    return apiRequest<{ message: string }>('/api/progress', {
        method: 'POST',
        body: JSON.stringify({ scenario_id: scenarioId, level_id: levelId }),
    });
}

/**
 * Gets the list of completed levels for the logged-in user.
 * @returns Promise resolving to an object like { completed_levels: ["scenario/level", ...] }
 */
export function getProgress(): Promise<{ completed_levels: string[] }> {
    console.log("API: Calling getProgress");
    return apiRequest<{ completed_levels: string[] }>('/api/progress', {
        method: 'GET',
    });
}