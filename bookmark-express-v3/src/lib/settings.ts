// User-adjustable preferences, persisted in chrome.storage.local alongside the
// bookmark cache (see storage.ts). Kept separate from the cache so the two can
// evolve independently.

// The modern popup's colour scheme. 'system' follows the OS via
// prefers-color-scheme; 'light'/'dark' pin it. Ignored by the classic look.
export type Theme = 'system' | 'light' | 'dark'

// Identifiers for the keyboard hints in the modern popup's footer. Each one can
// be shown or hidden independently from the options page.
export type HintId = 'navigate' | 'enter' | 'shiftEnter' | 'incognito' | 'copyUrl' | 'close'

// Which footer hints are shown. Every hint has an entry, so callers can index
// this without a fallback (loadSettings fills in any key a stored object lacks).
export type FooterHints = Record<HintId, boolean>

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
    // Per-hint visibility for the modern popup's keyboard footer. All on by
    // default; turning every one off hides the footer entirely.
    footerHints: FooterHints
}

const SETTINGS_KEY = 'settings'

export const DEFAULT_FOOTER_HINTS: FooterHints = {
    navigate: true,
    enter: true,
    shiftEnter: true,
    incognito: true,
    copyUrl: true,
    close: true,
}

export const DEFAULT_SETTINGS: Settings = {
    invertTabBehavior: false,
    useClassic: false,
    theme: 'system',
    footerHints: DEFAULT_FOOTER_HINTS,
}

export async function loadSettings(): Promise<Settings> {
    const stored = await chrome.storage.local.get(SETTINGS_KEY)
    return mergeSettings(stored[SETTINGS_KEY] as Partial<Settings> | undefined)
}

/**
 * Fill a (possibly partial, possibly absent) stored object out to a complete
 * Settings. footerHints is merged key-by-key rather than replaced wholesale, so
 * a value saved before a hint existed still yields an entry for every HintId.
 */
export function mergeSettings(stored: Partial<Settings> | undefined): Settings {
    return {
        ...DEFAULT_SETTINGS,
        ...stored,
        footerHints: { ...DEFAULT_FOOTER_HINTS, ...stored?.footerHints },
    }
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

// How a bookmark should be opened: in a new tab, the current tab, or a fresh
// incognito window. The tab modes honour the invert setting; incognito is a
// fixed shortcut with no toggle.
export type OpenMode = 'new-tab' | 'same-tab' | 'incognito'

// The subset of a keyboard/mouse event the open decision depends on. Both
// KeyboardEvent and MouseEvent expose these, so one helper covers Enter and
// clicks alike.
export interface OpenModifiers {
    shiftKey: boolean
    metaKey: boolean
    ctrlKey: boolean
}

/**
 * Resolve which OpenMode an Enter press (or click) should trigger, given the
 * held modifiers and the invert setting. Cmd/Ctrl + Shift always means
 * incognito (there is deliberately no setting to change it); otherwise Shift
 * chooses between new and same tab per shouldOpenInNewTab.
 */
export function openMode(mods: OpenModifiers, invertTabBehavior: boolean): OpenMode {
    if ((mods.metaKey || mods.ctrlKey) && mods.shiftKey) return 'incognito'
    return shouldOpenInNewTab(mods.shiftKey, invertTabBehavior) ? 'new-tab' : 'same-tab'
}

/**
 * The right-aligned hint shown in the classic search bar. Describes what
 * Shift+Enter does under the current setting (default: opens in the same tab),
 * the fixed Cmd+Shift+Enter incognito shortcut, and Cmd+C to copy the URL.
 */
export function shiftEnterHint(invertTabBehavior: boolean): string {
    return `shift + enter to open in ${invertTabBehavior ? 'new' : 'same'} tab · cmd + shift + enter for incognito · cmd + c to copy url`
}

export interface FooterHint {
    id: HintId
    // The glyph shown in the footer's key chip.
    key: string
    // Static label. The two tab-opening hints override it per the invert setting
    // (see hintLabel), since which tab they target isn't fixed.
    label: string
}

// The footer's hints, in display order. Shared by the popup (which renders the
// enabled ones) and the options page (which lists all six as checkboxes), so the
// two can't drift.
export const FOOTER_HINTS: FooterHint[] = [
    { id: 'navigate', key: '↑↓', label: 'Navigate' },
    { id: 'enter', key: '↵', label: 'New tab' },
    { id: 'shiftEnter', key: '⇧↵', label: 'Same tab' },
    { id: 'incognito', key: '⌘⇧↵', label: 'Incognito' },
    { id: 'copyUrl', key: '⌘C', label: 'Copy URL' },
    { id: 'close', key: 'Esc', label: 'Close' },
]

/**
 * The label a hint shows under the current tab-behavior setting. Enter and
 * Shift+Enter name whichever tab they open; the rest are fixed keystrokes.
 */
export function hintLabel(hint: FooterHint, invertTabBehavior: boolean): string {
    if (hint.id === 'enter') return shouldOpenInNewTab(false, invertTabBehavior) ? 'New tab' : 'Same tab'
    if (hint.id === 'shiftEnter') return shouldOpenInNewTab(true, invertTabBehavior) ? 'New tab' : 'Same tab'
    return hint.label
}

/** The hints to render, in footer order — i.e. those the user left enabled. */
export function visibleHints(hints: FooterHints): FooterHint[] {
    return FOOTER_HINTS.filter((hint) => hints[hint.id])
}

/** Every hint enabled — drives the checked state of the check-all box. */
export function allHintsEnabled(hints: FooterHints): boolean {
    return FOOTER_HINTS.every((hint) => hints[hint.id])
}

/** At least one hint enabled — a false value is what hides the footer. */
export function anyHintsEnabled(hints: FooterHints): boolean {
    return FOOTER_HINTS.some((hint) => hints[hint.id])
}

/** All hints set to `enabled` — what the check/uncheck-all box writes. */
export function setAllHints(enabled: boolean): FooterHints {
    return Object.fromEntries(FOOTER_HINTS.map((hint) => [hint.id, enabled])) as FooterHints
}
