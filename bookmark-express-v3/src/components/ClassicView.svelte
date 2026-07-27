<script lang="ts">
    import { onMount } from 'svelte'
    import type { SearchResult } from '../lib/types'
    import type { OpenMode } from '../lib/settings'
    import Results from './Results.svelte'

    interface Props {
        query: string
        results: SearchResult[]
        selectedIndex: number
        hint: string
        copiedIndex: number
        copiedSeq: number
        invert: boolean
        oninput: (value: string) => void
        onkeydown: (event: KeyboardEvent) => void
        onopen: (result: SearchResult, mode: OpenMode) => void
    }

    let {
        query,
        results,
        selectedIndex,
        hint,
        copiedIndex,
        copiedSeq,
        invert,
        oninput,
        onkeydown,
        onopen,
    }: Props = $props()

    let searchInput = $state<HTMLInputElement>()

    // Focus the input as soon as the popup opens (the controller no longer owns
    // the input, so each view focuses its own).
    onMount(() => searchInput?.focus())
</script>

<div class="topbar">
    <div class="search-row">
        <input
            bind:this={searchInput}
            value={query}
            oninput={(event) => oninput(event.currentTarget.value)}
            {onkeydown}
            class="search-bar"
            class:with-hint={results.length > 0}
            type="text"
            placeholder="Start typing..."
        />
        {#if results.length > 0}
            <span class="hint">{hint}</span>
        {/if}
    </div>
</div>

<Results {results} {query} {selectedIndex} {copiedIndex} {copiedSeq} {invert} {onopen} />

<style>
    .topbar {
        position: sticky;
        top: 0;
        z-index: 1;
        background: Canvas;
    }

    .search-bar {
        box-sizing: border-box;
        width: 780px;
        height: 50px;
        padding: 10px;
        font-family: sans-serif;
        font-size: 18px;
        border: none;
        outline: none;
        display: block;
    }

    /* Reserve room on the right so a long query doesn't slide under the hint. */
    .search-bar.with-hint {
        padding-right: 580px;
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
</style>
