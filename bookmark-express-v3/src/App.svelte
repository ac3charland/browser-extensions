<script lang="ts">
    import { onMount } from 'svelte'
    import { BookmarkStore } from './lib/bookmarks'
    import type { SearchResult } from './lib/types'
    import Results from './components/Results.svelte'

    const store = new BookmarkStore()

    let ready = $state(false)
    let query = $state('')
    let results = $state<SearchResult[]>([])
    let selectedIndex = $state(0)
    let searchInput = $state<HTMLInputElement>()

    // Guards against out-of-order async search responses clobbering newer results.
    let searchSeq = 0

    onMount(async () => {
        await store.init()
        ready = true
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
                    open(results[selectedIndex])
                }
                break
        }
    }

    async function open(result: SearchResult) {
        await store.recordAccess(result.id)
        // Chrome won't let a popup navigate its own window without the "tabs"
        // permission, so open the bookmark in a new tab.
        window.open(result.url, '_blank')
    }
</script>

<div class="topbar">
    {#if ready}
        <input
            bind:this={searchInput}
            bind:value={query}
            oninput={runSearch}
            onkeydown={handleKeydown}
            class="search-bar"
            type="text"
            placeholder="Start typing..."
        />
    {:else}
        <span class="loading">Loading...</span>
    {/if}
</div>

{#if ready}
    <Results {results} {query} {selectedIndex} onopen={open} />
{/if}

<style>
    .topbar {
        position: sticky;
        top: 0;
        z-index: 1;
        box-sizing: border-box;
        width: 780px;
        padding: 8px 10px;
        background: #fff;
    }

    .search-bar,
    .loading {
        box-sizing: border-box;
        width: 100%;
        font-family: sans-serif;
        font-size: 18px;
        color: #101626;
    }

    .search-bar {
        display: block;
        height: 46px;
        padding: 8px 12px;
        border: 2px solid #1b2540;
        border-radius: 12px;
        outline: none;
        background: #fff;
    }

    .search-bar::placeholder {
        color: #8a93a3;
    }

    .search-bar:focus {
        border-color: #101626;
    }

    .loading {
        display: block;
        padding: 8px 12px;
    }
</style>
