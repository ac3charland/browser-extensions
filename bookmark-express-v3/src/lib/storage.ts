import type { BookmarkData } from './types'

// MV3 replaces the popup's localStorage-based cache (used by the old Backbone
// ConfigModel) with chrome.storage.local, the idiomatic extension store.
const HASH_KEY = 'hash'
const DATA_KEY = 'bookmarkData'

export interface CachedConfig {
    hash: string | null
    bookmarkData: BookmarkData | null
}

export async function loadConfig(): Promise<CachedConfig> {
    const stored = await chrome.storage.local.get([HASH_KEY, DATA_KEY])
    return {
        hash: (stored[HASH_KEY] as string) ?? null,
        bookmarkData: (stored[DATA_KEY] as BookmarkData) ?? null,
    }
}

export async function saveConfig(config: CachedConfig): Promise<void> {
    await chrome.storage.local.set({
        [HASH_KEY]: config.hash,
        [DATA_KEY]: config.bookmarkData,
    })
}
