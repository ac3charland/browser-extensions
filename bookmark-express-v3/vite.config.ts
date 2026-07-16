import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// base: './' makes asset URLs relative, which is required inside an extension
// (absolute /assets/... paths resolve against the extension root and break the popup).
export default defineConfig({
    plugins: [svelte()],
    base: './',
    build: {
        // The popup is small; skip the module-preload polyfill and keep output lean.
        modulePreload: false,
        target: 'esnext',
        rollupOptions: {
            input: {
                popup: 'index.html',
                options: 'options.html',
            },
        },
    },
})
