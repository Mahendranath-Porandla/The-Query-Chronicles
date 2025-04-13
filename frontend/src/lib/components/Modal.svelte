<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    import { fade } from 'svelte/transition';
  
    export let showModal: boolean = false;
    export let title: string = "Information";
  
    const dispatch = createEventDispatcher();
  
    function closeModal() {
      showModal = false;
      dispatch('close');
    }
  
    function handleKeydown(event: KeyboardEvent) { if (event.key === 'Escape') { closeModal(); } }
  </script>
  
  <svelte:window on:keydown={handleKeydown}/>
  
  {#if showModal}
    <!-- Overlay -->
    <div
      transition:fade={{ duration: 150 }}
      class="fixed inset-0 z-40 bg-black bg-opacity-75 flex items-center justify-center p-4"
      on:click|self={closeModal}
      role="dialog" aria-modal="true" aria-labelledby="modal-title" tabindex="-1"
    >
      <!-- Modal Panel -->
      <div class="bg-primary rounded-lg shadow-xl overflow-hidden w-full max-w-3xl max-h-[85vh] flex flex-col border border-border-medium" on:click|stopPropagation>
        <!-- Modal Header -->
        <div class="flex justify-between items-center p-4 border-b border-border-medium bg-secondary">
          <h2 id="modal-title" class="text-xl font-heading text-brand-text">{title}</h2>
          <button on:click={closeModal} class="text-brand-text-muted hover:text-brand-text text-2xl font-bold leading-none" aria-label="Close modal">×</button>
        </div>
        <!-- Modal Body (Scrollable) -->
        <div class="p-5 md:p-6 overflow-y-auto bg-secondary"> 
          <slot /> <!-- Content goes here -->
        </div>
         <!-- Modal Footer -->
        <div class="flex justify-end p-3 border-t border-border-medium bg-secondary">
           <button on:click={closeModal} class="bg-accent hover:bg-accent-hover text-primary font-bold py-2 px-4 rounded-lg transition duration-200 text-sm">Close</button>
         </div>
      </div>
    </div>
  {/if}