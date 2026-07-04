// Per-bookmark data we cache alongside Chrome's own bookmark records.
// Keyed by Chrome's bookmark id.
export interface BookmarkMeta {
    // Full folder path to the bookmark, e.g. "Bookmarks Bar / Work / Docs".
    path: string
    // How many times the user has opened this bookmark from the extension.
    // Used to rank frequently-used bookmarks to the top.
    timesAccessed: number
}

export type BookmarkData = Record<string, BookmarkMeta>

// A search result ready to render: Chrome's node fields plus our cached meta.
export interface SearchResult {
    id: string
    title: string
    url: string
    path: string
    timesAccessed: number
}
