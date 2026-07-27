<script lang="ts">
    import { highlight } from '../lib/highlight'

    let { text, query }: { text: string; query: string } = $props()
</script>

<!-- prettier-ignore -->
{#each highlight(text, query) as segment}{#if segment.hit}<span class="search-hit">{segment.text}</span>{:else}{segment.text}{/if}{/each}

<style>
    .search-hit {
        background-color: var(--search-hit-bg);
    }
</style>
