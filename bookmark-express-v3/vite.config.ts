import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs'
import { join } from 'node:path'
import { deriveDevManifest, DEV_ICON_SIZES, DEV_OUT_DIR } from './scripts/dev-build.mjs'

// Set by `npm run build:dev`. Produces a "Bookmark Express Dev" build that can
// be loaded unpacked alongside the prod (Web Store) build without colliding:
// distinct name, amber icons, a different popup shortcut, and its own output
// directory (dist-dev/) so the two builds never overwrite each other.
// See scripts/dev-build.mjs.
const isDevBuild = process.env.BMX_DEV === '1'
const outDir = isDevBuild ? DEV_OUT_DIR : 'dist'

// After Vite copies public/ into the output dir, rewrite the prod manifest into
// its dev variant and swap the navy icons for the amber dev icons (dev-icons/).
// Prod builds are untouched.
function devBuildPlugin() {
    return {
        name: 'bmx-dev-build',
        apply: 'build' as const,
        closeBundle() {
            if (!isDevBuild) return
            const manifestPath = join(outDir, 'manifest.json')
            const prod = JSON.parse(readFileSync(manifestPath, 'utf8'))
            writeFileSync(manifestPath, JSON.stringify(deriveDevManifest(prod), null, 4) + '\n')
            for (const size of DEV_ICON_SIZES) {
                copyFileSync(join('dev-icons', `icon${size}.png`), join(outDir, 'images', `icon${size}.png`))
            }
        },
    }
}

// base: './' makes asset URLs relative, which is required inside an extension
// (absolute /assets/... paths resolve against the extension root and break the popup).
export default defineConfig({
    plugins: [svelte(), devBuildPlugin()],
    base: './',
    build: {
        // Dev builds land in dist-dev/ so they never clobber the prod dist/.
        outDir,
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
