// Shared logic for the "dev" build variant, so a developer can run the dev
// build side-by-side with the Chrome Web Store ("prod") build without the two
// colliding. A dev build differs from prod in three visible ways:
//
//   1. name    — "Bookmark Express" -> "Bookmark Express Dev"
//   2. icon    — the navy toolbar icon is recolored amber (see dev-icons/)
//   3. shortcut — the popup hotkey moves off prod's Ctrl+Shift+K so Chrome can
//                 assign both extensions a working shortcut at the same time
//
// This module is the single source of truth for those differences. It is
// imported by vite.config.ts (which applies it during a dev build) and by
// verify-dev-build.mjs (which tests it), so the transform stays pure and
// independently testable.

// Suffix appended to the extension name for dev builds.
export const DEV_NAME_SUFFIX = ' Dev'

// The prod popup shortcut is Ctrl+Shift+K. Dev moves to a different final key so
// the two extensions don't fight over the same suggested shortcut in Chrome.
export const DEV_SHORTCUT_KEY = 'U'

// Icon sizes that get swapped for their amber dev variants (dev-icons/iconNN.png).
export const DEV_ICON_SIZES = [16, 48, 128]

// Swap only the final key of a suggested_key value ("Ctrl+Shift+K" ->
// "Ctrl+Shift+U", "MacCtrl+Shift+K" -> "MacCtrl+Shift+U"), preserving whatever
// modifier prefix each platform uses.
/**
 * @param {string} suggestedKey
 * @returns {string}
 */
function withDevShortcut(suggestedKey) {
    return suggestedKey.replace(/\+[^+]+$/, `+${DEV_SHORTCUT_KEY}`)
}

// Pure transform: given the parsed prod manifest object, return the dev variant.
// The input is not mutated. Icon paths are intentionally left unchanged — the
// dev build overwrites the icon *files* in dist/ with the amber variants, so the
// manifest keeps pointing at images/iconNN.png.
/**
 * @param {Record<string, any>} manifest - the parsed prod manifest
 * @returns {Record<string, any>} the dev variant (input is not mutated)
 */
export function deriveDevManifest(manifest) {
    const dev = structuredClone(manifest)
    dev.name = `${manifest.name}${DEV_NAME_SUFFIX}`

    const suggested = dev.commands?._execute_action?.suggested_key
    if (suggested) {
        for (const platform of Object.keys(suggested)) {
            suggested[platform] = withDevShortcut(suggested[platform])
        }
    }
    return dev
}
