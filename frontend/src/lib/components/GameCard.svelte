<script lang="ts">
  export interface Game {
    id: string;
    title: string;
    logline: string;
    imageUrl: string;
    path: string;
  }
  export let game: Game;
  // New prop for status
  export let status: 'new' | 'started' | 'completed' = 'new';

</script>

<div class="bg-gray-800 rounded-lg shadow-lg overflow-hidden flex flex-col transform hover:scale-105 transition duration-300 ease-in-out relative">
  <!-- Status Indicator Badge (Example) -->
   {#if status === 'started'}
       <span class="absolute top-2 right-2 bg-yellow-500 text-yellow-900 text-xs font-bold px-2 py-0.5 rounded">In Progress</span>
   {:else if status === 'completed'}
        <span class="absolute top-2 right-2 bg-green-500 text-green-900 text-xs font-bold px-2 py-0.5 rounded">Completed ✔</span>
   {/if}
    <!-- End Status Indicator -->

  <img class="w-full h-48 object-cover" src={game.imageUrl} alt="{game.title} Cover Art" loading="lazy">

  <div class="p-6 flex flex-col flex-grow">
    <h3 class="text-xl font-semibold mb-2 text-teal-400">{game.title}</h3>
    <p class="text-gray-300 text-sm mb-4 flex-grow">{game.logline}</p>
    <a href={game.path}
       class="mt-auto block text-center w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-4 rounded transition duration-200 no-underline"
    >
      {#if status === 'started'}Continue Adventure{:else}Start Adventure{/if}
    </a>
  </div>
</div>

<style>
   a.no-underline { text-decoration: none; }
</style>