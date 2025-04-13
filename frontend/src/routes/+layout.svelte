<script lang="ts">
	// REMOVE: import { Router, Route } from "svelte-routing";
	import { onMount } from 'svelte';
  
	import AuthStatus from '$lib/components/AuthStatus.svelte'; // Keep this
	// REMOVE: Import HomePage, LoginPage, RegisterPage here
  
	import { initializeAuth, authStore } from '$lib/stores/authStore';
	import '../app.css';
  
	// Import navigate function from SvelteKit for programmatic navigation
	import { goto } from '$app/navigation'; // <<< Use SvelteKit's goto
  
	// Reactive statement to get store value
	$: auth = $authStore;
  
	// Initialize authentication status when the layout mounts
	onMount(() => {
	  initializeAuth();
	});
  
  </script>
  
  <!-- NO Router component needed here -->
  <div class="min-h-screen flex flex-col bg-gray-900 text-gray-100">
	<header class="bg-gray-800 shadow-md p-4 sticky top-0 z-10">
	  <div class="container mx-auto flex justify-between items-center">
		<!-- Use a standard anchor tag for the home link if preferred,
			 or keep using programmatic navigation if needed -->
		<a href="/" class="text-2xl font-bold text-teal-400 hover:text-teal-300 transition">
			The Query Chronicles
		</a>
		{#if !auth.isLoading}
		   <AuthStatus />
		{/if}
	  </div>
	</header>
  
	<main class="flex-grow container mx-auto p-4 md:p-8">
	  {#if auth.isLoading}
		<p class="text-center text-lg text-gray-400">Loading application...</p>
	  {:else}
		<!-- SvelteKit automatically renders the correct page component here -->
		<slot />
	  {/if}
	</main>
  
	<footer class="bg-gray-800 text-center p-4 text-sm text-gray-400 mt-auto">
	  © {new Date().getFullYear()} The Query Chronicles. Learn SQL the fun way.
	</footer>
  </div>
  
  <!-- NO Router closing tag -->
  
  <style>
	/* Minimal styles */
  </style>