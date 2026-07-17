<script lang="ts">
    import { faviconUrl, faviconInitial } from '../lib/favicon'

    let { url, title }: { url: string; title: string } = $props()

    // Start by trying the real favicon (via the extension's _favicon endpoint).
    // If it fails to load, fall back to the domain's initial letter.
    let failed = $state(false)
</script>

<div class="favicon">
    {#if failed}
        <span class="initial">{faviconInitial(title, url)}</span>
    {:else}
        <img src={faviconUrl(url, 32)} alt="" onerror={() => (failed = true)} />
    {/if}
</div>

<style>
    .favicon {
        width: 22px;
        height: 22px;
        border-radius: 6px;
        flex-shrink: 0;
        margin-top: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        background: var(--favicon-bg);
        color: var(--favicon-fg);
        font-size: 11px;
        font-weight: 700;
    }

    img {
        width: 22px;
        height: 22px;
        display: block;
    }

    .initial {
        line-height: 1;
    }
</style>
