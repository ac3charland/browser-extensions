<script lang="ts">
    import { onMount } from 'svelte'
    import { BookmarkStore } from './lib/bookmarks'
    import type { SearchResult } from './lib/types'
    import {
        loadSettings,
        saveSettings,
        shouldOpenInNewTab,
        shiftEnterHint,
        DEFAULT_SETTINGS,
        type Settings,
        type Theme,
    } from './lib/settings'
    import ClassicView from './components/ClassicView.svelte'
    import ModernView from './components/ModernView.svelte'

    // App.svelte is the shared controller for both looks: it owns bookmark
    // search, keyboard navigation, selection, and tab-opening, then renders one
    // of two presentation views (classic or modern) based on the user's setting.
    // The two views are pure presentation over this single source of behavior.
    const store = new BookmarkStore()

    let ready = $state(false)
    let query = $state('')
    let results = $state<SearchResult[]>([])
    let selectedIndex = $state(0)
    let settings = $state<Settings>(DEFAULT_SETTINGS)

    // The Shift+Enter hint shown in the classic search bar, kept in sync with the setting.
    let hint = $derived(shiftEnterHint(settings.invertTabBehavior))

    // Guards against out-of-order async search responses clobbering newer results.
    let searchSeq = 0

    onMount(async () => {
        // Load the cache and the user's settings together to keep startup snappy.
        const [, loaded] = await Promise.all([store.init(), loadSettings()])
        settings = loaded
        ready = true
        // Reflect changes made on the options page without needing to reopen the
        // popup (look, theme, tab behavior). chrome.storage.onChanged is
        // unavailable in some test harnesses, so guard the subscription.
        chrome.storage?.onChanged?.addListener((changes, area) => {
            if (area === 'local' && changes.settings) {
                settings = { ...settings, ...changes.settings.newValue }
            }
        })
    })

    function handleInput(value: string) {
        query = value
        runSearch()
    }

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

    // Hover-to-select (used by the modern view; classic selects via keyboard only).
    function handleHover(index: number) {
        selectedIndex = index
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

    // Persist a theme change from the modern popup's quick toggle. Saving a plain
    // spread (not the $state proxy) keeps chrome.storage's structured clone happy.
    async function setTheme(theme: Theme) {
        const next = { ...settings, theme }
        settings = next
        await saveSettings(next)
    }
</script>

{#if ready}
    {#if settings.useClassic}
        <ClassicView
            {query}
            {results}
            {selectedIndex}
            {hint}
            invert={settings.invertTabBehavior}
            oninput={handleInput}
            onkeydown={handleKeydown}
            onopen={open}
        />
    {:else}
        <ModernView
            {query}
            {results}
            {selectedIndex}
            invert={settings.invertTabBehavior}
            theme={settings.theme}
            oninput={handleInput}
            onkeydown={handleKeydown}
            onhover={handleHover}
            onopen={open}
            onsettheme={setTheme}
        />
    {/if}
{:else}
    <span class="loading">Loading...</span>
{/if}

<style>
    .loading {
        display: inline-block;
        box-sizing: border-box;
        width: 780px;
        height: 50px;
        padding: 10px;
        font-family: sans-serif;
        font-size: 18px;
        line-height: 30px;
    }
</style>
