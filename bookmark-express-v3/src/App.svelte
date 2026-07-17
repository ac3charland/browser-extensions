<script lang="ts">
    import { onMount } from 'svelte'
    import { BookmarkStore } from './lib/bookmarks'
    import type { SearchResult } from './lib/types'
    import {
        loadSettings,
        shouldOpenInNewTab,
        shiftEnterHint,
        DEFAULT_SETTINGS,
        type Settings,
    } from './lib/settings'
    import Results from './components/Results.svelte'

    const store = new BookmarkStore()

    let ready = $state(false)
    let query = $state('')
    let results = $state<SearchResult[]>([])
    let selectedIndex = $state(0)
    let searchInput = $state<HTMLInputElement>()
    let settings = $state<Settings>(DEFAULT_SETTINGS)

    // The Shift+Enter hint shown in the search bar, kept in sync with the setting.
    let hint = $derived(shiftEnterHint(settings.invertTabBehavior))

    // Guards against out-of-order async search responses clobbering newer results.
    let searchSeq = 0

    onMount(async () => {
        // Load the cache and the user's settings together to keep startup snappy.
        const [, loaded] = await Promise.all([store.init(), loadSettings()])
        settings = loaded
        ready = true
        // Reflect changes made on the options page without needing to reopen the
        // popup. chrome.storage.onChanged is unavailable in some test harnesses,
        // so guard the subscription.
        chrome.storage?.onChanged?.addListener((changes, area) => {
            if (area === 'local' && changes.settings) {
                settings = { ...settings, ...changes.settings.newValue }
            }
        })
        // Focus once the input is in the DOM. The old extension used a background
        // page to pre-warm the popup; MV3 service workers are ephemeral, so we
        // instead just keep the popup lean enough that startup stays snappy.
        queueMicrotask(() => searchInput?.focus())
    })

    async function runSearch() {
        // Skip searching on a single character (matches the old behavior).
        if (query.length < 2) {
            results = []
            selectedIndex = 0
            return
        }

        const seq = ++searchSeq
        const found = await store.search(query)
        if (seq !== searchSeq) return // a newer keystroke already superseded this
        results = found
        selectedIndex = 0
    }

    function handleKeydown(event: KeyboardEvent) {
        switch (event.key) {
            case 'ArrowUp':
                event.preventDefault()
                if (selectedIndex > 0) selectedIndex--
                break
            case 'ArrowDown':
                event.preventDefault()
                if (selectedIndex < results.length - 1) selectedIndex++
                break
            case 'Enter':
                if (query.length > 1 && results[selectedIndex]) {
                    event.preventDefault()
                    open(results[selectedIndex], shouldOpenInNewTab(event.shiftKey, settings.invertTabBehavior))
                }
                break
        }
    }

    async function open(result: SearchResult, newTab: boolean) {
        await store.recordAccess(result.id)
        // chrome.tabs.create/update work without the "tabs" permission (that
        // permission only gates reading sensitive tab fields). A new tab is a
        // fresh create; the same tab navigates the window's active tab.
        if (newTab) {
            chrome.tabs.create({ url: result.url })
        } else {
            chrome.tabs.update({ url: result.url })
        }
    }
</script>

<div class="topbar">
    {#if ready}
        <div class="search-row">
            <input
                bind:this={searchInput}
                bind:value={query}
                oninput={runSearch}
                onkeydown={handleKeydown}
                class="search-bar"
                class:with-hint={results.length > 0}
                type="text"
                placeholder="Start typing..."
            />
            {#if results.length > 0}
                <span class="hint">{hint}</span>
            {/if}
        </div>
    {:else}
        <span class="loading">Loading...</span>
    {/if}
</div>

{#if ready}
    <Results {results} {query} {selectedIndex} invert={settings.invertTabBehavior} onopen={open} />
{/if}

<style>
    .topbar {
        position: sticky;
        top: 0;
        z-index: 1;
        background: Canvas;
    }

    .search-bar,
    .loading {
        box-sizing: border-box;
        width: 780px;
        height: 50px;
        padding: 10px;
        font-family: sans-serif;
        font-size: 18px;
        border: none;
        outline: none;
    }

    .search-bar {
        display: block;
    }

    /* Reserve room on the right so a long query doesn't slide under the hint. */
    .search-bar.with-hint {
        padding-right: 210px;
    }

    .search-row {
        position: relative;
    }

    /* Right-aligned, low-contrast helper text overlaid inside the search bar.
       GrayText is a system color, so it stays low-contrast in light and dark. */
    .hint {
        position: absolute;
        top: 50%;
        right: 12px;
        transform: translateY(-50%);
        font-family: sans-serif;
        font-size: 13px;
        color: GrayText;
        pointer-events: none;
        user-select: none;
        white-space: nowrap;
    }

    .loading {
        display: inline-block;
        line-height: 30px;
    }
</style>
