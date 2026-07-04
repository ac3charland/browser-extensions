import type { BookmarkData, SearchResult } from './types'
import { loadConfig, saveConfig, type CachedConfig } from './storage'

type Node = chrome.bookmarks.BookmarkTreeNode

// Fast, non-cryptographic string hash (FNV-1a, 32-bit). The old ConfigModel used
// spark-md5, but we only need change detection, not collision resistance, so we
// avoid the dependency. Returned as hex.
function hashString(input: string): string {
    let hash = 0x811c9dc5
    for (let i = 0; i < input.length; i++) {
        hash ^= input.charCodeAt(i)
        // hash *= 16777619, kept in 32-bit range
        hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0
    }
    return hash.toString(16)
}

// Chrome gives the tree root a fresh dateAdded each launch, so we hash only its
// children — matching the old ConfigModel.checkUpdate reasoning.
function hashTree(tree: Node[]): string {
    let json = ''
    for (const node of tree[0].children ?? []) {
        json += JSON.stringify(node)
    }
    return hashString(json)
}

// Depth-first walk building a map of bookmark id -> folder path, preserving any
// existing timesAccessed. Ported from ConfigModel.buildPath/generatePaths.
function buildPaths(root: Node, previous: BookmarkData): BookmarkData {
    const result: BookmarkData = {}

    function walk(node: Node, stack: string[]): void {
        // Everything has a title except the root node; we don't want that on the stack.
        if (node.title) stack.push(node.title)

        if (node.url === undefined) {
            // Folder: descend.
            for (const child of node.children ?? []) {
                walk(child, stack)
            }
        } else {
            // Leaf bookmark: record its path (excluding its own title) and carry
            // over any previously accumulated access count.
            result[node.id] = {
                path: stack.slice(0, -1).join(' / '),
                timesAccessed: previous[node.id]?.timesAccessed ?? 0,
            }
        }

        stack.pop()
    }

    walk(root, [])
    return result
}

/**
 * The bookmark cache: loads persisted data, rebuilds folder paths when Chrome's
 * bookmark tree has changed, and serves searches. Replaces the Backbone
 * ConfigModel + the chrome.bookmarks glue that lived in ResultsView.
 */
export class BookmarkStore {
    private bookmarkData: BookmarkData = {}

    /** Load cache and refresh it against Chrome's current bookmark tree. */
    async init(): Promise<void> {
        const config = await loadConfig()
        this.bookmarkData = config.bookmarkData ?? {}

        const tree = await chrome.bookmarks.getTree()
        const currentHash = hashTree(tree)

        const needsUpdate = !config.bookmarkData || config.hash !== currentHash
        if (needsUpdate) {
            this.bookmarkData = buildPaths(tree[0], this.bookmarkData)
            await this.persist(currentHash)
        }
    }

    private async persist(hash: string): Promise<void> {
        const config: CachedConfig = { hash, bookmarkData: this.bookmarkData }
        await saveConfig(config)
    }

    /**
     * Search Chrome's bookmarks, drop folders, attach cached path/usage data,
     * and sort most-used first. Ported from ResultsView.performSearch.
     */
    async search(query: string): Promise<SearchResult[]> {
        const nodes = await chrome.bookmarks.search(query)
        return nodes
            .filter((node): node is Node & { url: string } => Boolean(node.url))
            .map((node) => {
                const meta = this.bookmarkData[node.id]
                return {
                    id: node.id,
                    title: node.title,
                    url: node.url,
                    path: meta?.path ?? '',
                    timesAccessed: meta?.timesAccessed ?? 0,
                }
            })
            .sort((a, b) => b.timesAccessed - a.timesAccessed)
    }

    /** Record that a bookmark was opened, bumping its ranking for next time. */
    async recordAccess(bookmarkId: string): Promise<void> {
        const meta = this.bookmarkData[bookmarkId]
        if (!meta) return
        meta.timesAccessed += 1
        await chrome.storage.local.set({ bookmarkData: this.bookmarkData })
    }
}
