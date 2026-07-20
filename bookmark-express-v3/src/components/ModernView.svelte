<script lang="ts">
    import { onMount } from 'svelte'
    import type { SearchResult } from '../lib/types'
    import { shouldOpenInNewTab, openMode, type Theme, type OpenMode } from '../lib/settings'
    import { highlight } from '../lib/highlight'
    import Favicon from './Favicon.svelte'

    interface Props {
        query: string
        results: SearchResult[]
        selectedIndex: number
        copiedIndex: number
        copiedSeq: number
        invert: boolean
        theme: Theme
        oninput: (value: string) => void
        onkeydown: (event: KeyboardEvent) => void
        onhover: (index: number) => void
        onopen: (result: SearchResult, mode: OpenMode) => void
    }

    let {
        query,
        results,
        selectedIndex,
        copiedIndex,
        copiedSeq,
        invert,
        theme,
        oninput,
        onkeydown,
        onhover,
        onopen,
    }: Props = $props()

    let searchInput = $state<HTMLInputElement>()
    let rows = $state<HTMLAnchorElement[]>([])

    // Whether the OS currently prefers dark, tracked live so 'system' follows it.
    let systemDark = $state(false)

    onMount(() => {
        searchInput?.focus()
        const mq = window.matchMedia('(prefers-color-scheme: dark)')
        systemDark = mq.matches
        const onChange = (event: MediaQueryListEvent) => (systemDark = event.matches)
        mq.addEventListener('change', onChange)
        return () => mq.removeEventListener('change', onChange)
    })

    // Resolve the effective scheme: 'system' defers to the OS, otherwise pinned.
    let resolved = $derived<'light' | 'dark'>(
        theme === 'system' ? (systemDark ? 'dark' : 'light') : theme,
    )

    // Drive the palette (defined in :global blocks below) off a document attribute.
    $effect(() => {
        document.documentElement.dataset.theme = resolved
    })

    // Keep the keyboard-selected row scrolled into view.
    $effect(() => {
        rows[selectedIndex]?.scrollIntoView({ block: 'nearest' })
    })

    // Footer hints reflect the current tab-behavior setting: one label for plain
    // Enter, one for Shift+Enter, each showing which tab it targets.
    let enterLabel = $derived(shouldOpenInNewTab(false, invert) ? 'New tab' : 'Same tab')
    let shiftEnterLabel = $derived(shouldOpenInNewTab(true, invert) ? 'New tab' : 'Same tab')

    // Folder path rendered as a breadcrumb ("Bookmarks Bar › Dev"). The stored
    // path joins segments with " / " (see bookmarks.ts buildPaths).
    function breadcrumb(path: string): string {
        return path
            .split(' / ')
            .filter(Boolean)
            .join(' › ')
    }

    function handleClick(event: MouseEvent, result: SearchResult) {
        event.preventDefault()
        onopen(result, openMode(event, invert))
    }
</script>

<!-- prettier-ignore -->
{#snippet highlighted(text: string)}{#each highlight(text, query) as seg}{#if seg.hit}<span class="search-hit">{seg.text}</span>{:else}{seg.text}{/if}{/each}{/snippet}

<div class="popup">
    <div class="search-wrap">
        <!-- Lucide "search" icon, inlined to avoid a dependency for a single glyph. -->
        <svg
            class="search-icon"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
        >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
        </svg>
        <input
            bind:this={searchInput}
            value={query}
            oninput={(event) => oninput(event.currentTarget.value)}
            {onkeydown}
            class="search-bar"
            type="text"
            placeholder="Start typing..."
        />
    </div>

    {#if results.length > 0}
        <div class="list">
            {#each results as result, i (result.id)}
                <a
                    bind:this={rows[i]}
                    class="row"
                    class:selected={i === selectedIndex}
                    href={result.url}
                    onmouseenter={() => onhover(i)}
                    onclick={(event) => handleClick(event, result)}
                >
                    <Favicon url={result.url} title={result.title} />
                    <div class="content">
                        {#if result.path}
                            <div class="crumb">{breadcrumb(result.path)}</div>
                        {/if}
                        <div class="title">{@render highlighted(result.title)}</div>
                        <div class="url">{@render highlighted(result.url)}</div>
                    </div>
                    {#if copiedIndex === i}
                        {#key copiedSeq}
                            <span class="copied-flash">URL copied</span>
                        {/key}
                    {/if}
                </a>
            {/each}
        </div>
    {/if}

    <div class="footer">
        <span class="hint"><span class="kbd">↑↓</span> Navigate</span>
        <span class="hint"><span class="kbd">↵</span> {enterLabel}</span>
        <span class="hint"><span class="kbd">⇧↵</span> {shiftEnterLabel}</span>
        <span class="hint"><span class="kbd">⌘⇧↵</span> Incognito</span>
        <span class="hint"><span class="kbd">⌘C</span> Copy URL</span>
        <span class="hint"><span class="kbd">Esc</span> Close</span>
    </div>
</div>

<style>
    /* Palette tokens from the design handoff, keyed off the resolved scheme set
       on <html data-theme>. Custom properties inherit, so the scoped rules below
       (and the themed body background) pick them up. */
    :global(html[data-theme='dark']) {
        --bg: oklch(0.22 0.012 250);
        --input-bg: oklch(0.28 0.014 250);
        --text: oklch(0.95 0.005 250);
        --sub: oklch(0.66 0.012 250);
        --border: oklch(0.34 0.012 250);
        --hover: oklch(0.3 0.014 250);
        --selected: oklch(0.36 0.05 145);
        --highlight: oklch(0.76 0.17 95);
        /* Favicon tile: a light-gray backing in dark mode keeps dark favicons
           legible; the fallback initial sits on it in a dark ink. */
        --favicon-bg: oklch(0.9 0.005 250);
        --favicon-fg: oklch(0.3 0 0);
    }

    :global(html[data-theme='light']) {
        --bg: oklch(1 0 0);
        --input-bg: oklch(0.97 0.003 90);
        --text: oklch(0.22 0.01 90);
        --sub: oklch(0.52 0.01 90);
        --border: oklch(0.9 0.005 90);
        --hover: oklch(0.965 0.004 90);
        --selected: oklch(0.92 0.05 145);
        --highlight: oklch(0.86 0.14 95);
        /* No tile in light mode (per design feedback); the fallback initial sits
           directly on the popup in a muted ink. */
        --favicon-bg: transparent;
        --favicon-fg: oklch(0.45 0 0);
    }

    :global(body) {
        margin: 0;
        background: var(--bg);
    }

    /* Outer container. The handoff's 812px assumes surrounding page padding; a
       real Chrome popup caps near 800px, so we trim the outer width (not the
       internal spacing) to 780px per the handoff note. */
    .popup {
        box-sizing: border-box;
        width: 780px;
        padding: 14px;
        background: var(--bg);
        color: var(--text);
        border-radius: 20px;
        box-shadow:
            0 1px 3px rgba(0, 0, 0, 0.2),
            0 20px 48px rgba(0, 0, 0, 0.28);
        overflow: hidden;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    }

    .search-wrap {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 16px;
        margin-bottom: 10px;
        border-radius: 12px;
        background: var(--input-bg);
    }

    .search-icon {
        flex-shrink: 0;
        width: 16px;
        height: 16px;
        color: var(--sub);
    }

    .search-bar {
        flex: 1;
        min-width: 0;
        box-sizing: border-box;
        border: none;
        outline: none;
        background: transparent;
        color: var(--text);
        font-family: inherit;
        font-size: 16px;
    }

    .list {
        max-height: 420px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 2px;
    }

    .row {
        position: relative;
        display: flex;
        gap: 12px;
        align-items: flex-start;
        padding: 11px 14px;
        border-radius: 10px;
        text-decoration: none;
        color: inherit;
        cursor: default;
    }

    .row.selected {
        background: var(--selected);
    }

    /* "URL copied" badge that flashes over the row when Cmd/Ctrl+C copies its URL,
       then fades out on its own. Re-keyed on each copy (see copiedSeq) so the
       animation replays even when the same row is copied twice. */
    .copied-flash {
        position: absolute;
        top: 50%;
        right: 14px;
        transform: translateY(-50%);
        padding: 3px 9px;
        border-radius: 6px;
        background: var(--highlight);
        color: oklch(0.15 0 0);
        font-size: 11px;
        font-weight: 600;
        pointer-events: none;
        animation: copied-fade 1.2s ease-out forwards;
    }

    @keyframes copied-fade {
        0% {
            opacity: 0;
            transform: translateY(-50%) scale(0.9);
        }
        12% {
            opacity: 1;
            transform: translateY(-50%) scale(1);
        }
        60% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    .content {
        flex: 1;
        min-width: 0;
    }

    .crumb {
        margin-bottom: 4px;
        font-size: 11px;
        font-weight: 500;
        color: var(--sub);
    }

    .title {
        font-size: 15px;
        font-weight: 600;
        color: var(--text);
    }

    .url {
        margin-top: 3px;
        font-family: ui-monospace, monospace;
        font-size: 12px;
        line-height: 1.3;
        color: var(--sub);
        overflow-wrap: break-word;
    }

    /* Flush highlight (no horizontal padding); clones the rounded background
       across line breaks so multi-line matches render as separate rects. */
    .search-hit {
        background: var(--highlight);
        border-radius: 2px;
        -webkit-box-decoration-break: clone;
        box-decoration-break: clone;
        color: oklch(0.15 0 0);
    }

    .footer {
        display: flex;
        gap: 14px;
        margin-top: 8px;
        padding: 10px 6px 2px;
        border-top: 1px solid var(--border);
    }

    .hint {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 11px;
        color: var(--sub);
    }

    .kbd {
        background: var(--hover);
        border: 1px solid var(--border);
        border-radius: 5px;
        padding: 1px 6px;
        font-size: 10px;
        font-weight: 600;
        color: var(--text);
    }
</style>
