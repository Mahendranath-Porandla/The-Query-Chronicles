<script lang="ts">
  import { goto } from '$app/navigation'; // Use SvelteKit's goto
  import { login } from '$lib/api';
  import { setUserLoggedIn } from '$lib/stores/authStore';

  let username = '';
  let password = '';
  let isLoading = false;
  let errorMessage: string | null = null;

  async function handleLogin() {
    isLoading = true;
    errorMessage = null;
    try {
      const response = await login(username, password);
      setUserLoggedIn(response.user); // Update global store
      goto('/', { replace: true }); // Redirect to homepage after successful login
    } catch (error: any) {
      console.error("Login failed:", error);
      errorMessage = error.message || 'An unknown error occurred during login.';
    } finally {
      isLoading = false;
    }
  }
</script>

<svelte:head>
  <title>Login - SQL Stories</title>
</svelte:head>

<div class="max-w-md mx-auto mt-10 p-8 bg-gray-800 rounded-lg shadow-xl">
  <h2 class="text-2xl font-bold text-center text-teal-400 mb-6">Login</h2>
  <form on:submit|preventDefault={handleLogin}>
    {#if errorMessage}
      <div class="bg-red-500 border border-red-700 text-red-100 px-4 py-3 rounded relative mb-4" role="alert">
        <strong class="font-bold">Error:</strong>
        <span class="block sm:inline"> {errorMessage}</span>
      </div>
    {/if}

    <div class="mb-4">
      <label for="username" class="block text-gray-300 text-sm font-bold mb-2">Username</label>
      <input
        type="text"
        id="username"
        bind:value={username}
        required
        disabled={isLoading}
        class="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-gray-100 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
      />
    </div>
    <div class="mb-6">
      <label for="password" class="block text-gray-300 text-sm font-bold mb-2">Password</label>
      <input
        type="password"
        id="password"
        bind:value={password}
        required
        disabled={isLoading}
        class="shadow appearance-none border rounded w-full py-2 px-3 bg-gray-700 text-gray-100 mb-3 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
      />
    </div>
    <div class="flex items-center justify-between">
      <button
        type="submit"
        disabled={isLoading}
        class="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {#if isLoading}
          <span class="animate-spin inline-block w-4 h-4 border-2 border-t-transparent border-white rounded-full mr-2 align-middle"></span>
          Logging in...
        {:else}
          Login
        {/if}
      </button>
    </div>
     <p class="text-center text-gray-400 text-sm mt-6">
        Don't have an account? <a href="/register" class="text-teal-400 hover:text-teal-300">Register here</a>
     </p>
  </form>
</div>