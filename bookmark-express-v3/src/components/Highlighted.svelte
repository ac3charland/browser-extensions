<script lang="ts">
    import { highlight } from '../lib/highlight'

    let { text, query, kind = 'title' }: { text: string; query: string; kind?: 'title' | 'url' } =
        $props()
</script>

<!-- prettier-ignore -->
{#each highlight(text, query) as segment}{#if segment.hit}<span class="search-hit" class:url={kind === 'url'}>{segment.text}</span>{:else}{segment.text}{/if}{/each}

<style>
    .search-hit {
        background-color: var(--search-hit-bg);
        color: var(--search-hit-fg, inherit);
    }
    .search-hit.url {
        background-color: var(--search-hit-url-bg, var(--search-hit-bg));
        color: var(--search-hit-url-fg, var(--search-hit-fg, inherit));
    }
</style>
