<script lang="ts">
    // Using SvelteKit's built-in navigation helper
    import { goto } from '$app/navigation';
    import { authStore, setUserLoggedOut } from '$lib/stores/authStore';
    import { logout } from '$lib/api';
  
    // Subscribe to the store reactively
    $: auth = $authStore;
  
    let isLoggingOut = false;
  
    async function handleLogout() {
      if (isLoggingOut) return;
      isLoggingOut = true;
      try {
        await logout();
        setUserLoggedOut(); // Update store
        // Use goto for navigation
        goto('/', { replace: true }); // Redirect to home after logout
      } catch (error) {
        console.error('Logout failed:', error);
        alert("Logout failed. Please try again."); // Simple feedback
      } finally {
         isLoggingOut = false;
      }
    }
  
  </script>
  
  <div class="flex items-center space-x-4">
    {#if auth.isLoggedIn && auth.user}
      <span class="text-gray-300 hidden sm:inline">Welcome, {auth.user.username}!</span>
      <button
        class="bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded text-sm transition duration-200 disabled:opacity-50"
        on:click={handleLogout}
        disabled={isLoggingOut}
        >
        {#if isLoggingOut}Logging out...{:else}Logout{/if}
        </button
      >
    {:else}
      <!-- Use standard anchor tags for navigation -->
      <a href="/login" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-1 px-3 rounded text-sm transition duration-200 cursor-pointer no-underline">
          Login
      </a>
      <a href="/register" class="bg-green-600 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm transition duration-200 cursor-pointer no-underline">
          Register
      </a>
    {/if}
  </div>
  
  <style>
    /* Ensure anchor tags don't have default underline */
    a.no-underline {
      text-decoration: none;
    }
  </style>