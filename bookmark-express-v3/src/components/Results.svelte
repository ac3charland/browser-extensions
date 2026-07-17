<script lang="ts">
    import type { SearchResult } from '../lib/types'
    import { faviconUrl } from '../lib/favicon'
    import { openMode, type OpenMode } from '../lib/settings'
    import Highlighted from './Highlighted.svelte'

    interface Props {
        results: SearchResult[]
        query: string
        selectedIndex: number
        invert: boolean
        onopen: (result: SearchResult, mode: OpenMode) => void
    }

    let { results, query, selectedIndex, invert, onopen }: Props = $props()

    // Element refs so we can keep the keyboard-selected row in view.
    let items = $state<HTMLLIElement[]>([])

    $effect(() => {
        items[selectedIndex]?.scrollIntoView({ block: 'nearest' })
    })

    function handleClick(event: MouseEvent, result: SearchResult) {
        event.preventDefault()
        // Mirror the keyboard: Shift inverts new-tab/same-tab, Cmd/Ctrl+Shift opens incognito.
        onopen(result, openMode(event, invert))
    }
</script>

{#if results.length > 0}
    <ul>
        {#each results as result, i (result.id)}
            <li bind:this={items[i]} class:selected={i === selectedIndex}>
                <div
                    class="favicon"
                    style="background-image: url({faviconUrl(result.url)})"
                ></div>
                <div class="detail">
                    <a
                        class="bookmark-link"
                        href={result.url}
                        target="_blank"
                        onclick={(event) => handleClick(event, result)}
                    >
                        <Highlighted text={result.title} {query} />
                    </a>
                    <span class="folder-path">{result.path}</span>
                    <span class="url" title={result.url}>
                        <Highlighted text={result.url} {query} />
                    </span>
                </div>
            </li>
        {/each}
    </ul>
{/if}

<style>
    ul {
        width: 780px;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    li {
        margin: 0;
        padding: 10px;
        overflow-wrap: break-word;
    }

    li.selected {
        background-color: var(--selected-bg);
    }

    .favicon {
        margin-top: 3px;
        margin-right: 10px;
        width: 16px;
        height: 16px;
        display: inline-block;
        vertical-align: top;
        background-size: 16px 16px;
        background-repeat: no-repeat;
    }

    .detail {
        display: inline-block;
        width: 725px;
    }

    .bookmark-link {
        text-decoration: none;
    }

    .folder-path {
        display: block;
        font-size: 14px;
    }

    .url {
        display: inline-block;
        width: 100%;
        font-size: 12px;
        color: gray;
        white-space: nowrap;
        text-overflow: ellipsis;
        overflow: hidden;
    }
</style>
