// Import adapter-static instead of adapter-auto
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
    preprocess: vitePreprocess(),

    kit: {
        // Replace adapter-auto with adapter-static configuration
        adapter: adapter({
            // Default output directory is 'build'
            pages: 'build',
            assets: 'build',
            // fallback: 'index.html' // or '200.html' or '404.html' - index.html is good for SPAs
                                      // This is crucial for client-side routing with Flask's fallback route
            fallback: 'index.html',
            precompress: false,
            strict: true
        }),

        // Ensure paths are suitable if needed, but defaults are usually okay here
        // paths: {
        //     base: '',
        //     assets: ''
        // }
    }
};

export default config;