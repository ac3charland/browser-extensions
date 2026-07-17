// MV3 removed `chrome://favicon/`. Its replacement is the extension-scoped
// `_favicon/` endpoint, unlocked by the "favicon" permission in the manifest.
// See https://developer.chrome.com/docs/extensions/how-to/ui/favicons
export function faviconUrl(pageUrl: string, size = 32): string {
    const url = new URL(chrome.runtime.getURL('/_favicon/'))
    url.searchParams.set('pageUrl', pageUrl)
    url.searchParams.set('size', String(size))
    return url.toString()
}

// The single uppercase letter shown on the favicon fallback when a real favicon
// isn't available. The tile's background/foreground come from theme tokens
// (--favicon-bg / --favicon-fg) so the fallback matches the active colour scheme.
export function faviconInitial(title: string, url: string): string {
    const source = title.trim() || url.replace(/^https?:\/\//, '')
    return (source[0] ?? '?').toUpperCase()
}
