// MV3 removed `chrome://favicon/`. Its replacement is the extension-scoped
// `_favicon/` endpoint, unlocked by the "favicon" permission in the manifest.
// See https://developer.chrome.com/docs/extensions/how-to/ui/favicons
export function faviconUrl(pageUrl: string, size = 32): string {
    const url = new URL(chrome.runtime.getURL('/_favicon/'))
    url.searchParams.set('pageUrl', pageUrl)
    url.searchParams.set('size', String(size))
    return url.toString()
}

// Fixed hue palette for the generated favicon fallback (from the design handoff).
const FALLBACK_HUES = [250, 20, 145, 300, 80, 190]

// A stable per-URL background colour for the modern popup's favicon fallback,
// used when a real favicon isn't available. Sums the URL's char codes and maps
// them into FALLBACK_HUES, so each domain gets a distinct but stable colour.
export function faviconColor(pageUrl: string): string {
    let sum = 0
    for (let i = 0; i < pageUrl.length; i++) sum += pageUrl.charCodeAt(i)
    return `oklch(0.55 0.14 ${FALLBACK_HUES[sum % FALLBACK_HUES.length]})`
}

// The single uppercase letter shown on the generated favicon fallback.
export function faviconInitial(title: string, url: string): string {
    const source = title.trim() || url.replace(/^https?:\/\//, '')
    return (source[0] ?? '?').toUpperCase()
}
