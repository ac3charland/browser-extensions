// User-adjustable preferences, persisted in chrome.storage.local alongside the
// bookmark cache (see storage.ts). Kept separate from the cache so the two can
// evolve independently.

// The modern popup's colour scheme. 'system' follows the OS via
// prefers-color-scheme; 'light'/'dark' pin it. Ignored by the classic look.
export type Theme = 'system' | 'light' | 'dark'

export interface Settings {
    // When false (default): Enter opens a bookmark in a new tab, Shift+Enter in
    // the same tab. When true, the two are inverted.
    invertTabBehavior: boolean
    // When true, render the original ("classic") popup instead of the modern
    // command-palette redesign. Default false → the modern look ships as default.
    useClassic: boolean
    // Colour scheme for the modern popup (see Theme). Set from the options page
    // (System/Light/Dark) or the popup's own quick toggle.
    theme: Theme
}

const SETTINGS_KEY = 'settings'

export const DEFAULT_SETTINGS: Settings = {
    invertTabBehavior: false,
    useClassic: false,
    theme: 'system',
}

export async function loadSettings(): Promise<Settings> {
    const stored = await chrome.storage.local.get(SETTINGS_KEY)
    // Spread over the defaults so a stored object missing newer keys still yields
    // a complete Settings.
    return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] as Partial<Settings> | undefined) }
}

export async function saveSettings(settings: Settings): Promise<void> {
    await chrome.storage.local.set({ [SETTINGS_KEY]: settings })
}

/**
 * Given whether Shift was held and the invert setting, decide if the bookmark
 * should open in a new tab. Default (not inverted): plain Enter/click → new tab,
 * Shift held → same tab. Inverting flips both.
 */
export function shouldOpenInNewTab(shiftKey: boolean, invertTabBehavior: boolean): boolean {
    return shiftKey ? invertTabBehavior : !invertTabBehavior
}

/**
 * The right-aligned hint shown in the search bar, describing what Shift+Enter
 * does under the current setting. Default: Shift+Enter opens in the same tab.
 */
export function shiftEnterHint(invertTabBehavior: boolean): string {
    return `shift + enter to open in ${invertTabBehavior ? 'new' : 'same'} tab`
}
