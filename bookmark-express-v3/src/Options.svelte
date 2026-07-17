<script lang="ts">
    import { onMount } from 'svelte'
    import { loadSettings, saveSettings, DEFAULT_SETTINGS, type Settings } from './lib/settings'

    let ready = $state(false)
    let settings = $state<Settings>(DEFAULT_SETTINGS)

    onMount(async () => {
        settings = await loadSettings()
        ready = true
    })

    async function onToggle(event: Event) {
        settings.invertTabBehavior = (event.target as HTMLInputElement).checked
        await saveSettings(settings)
    }
</script>

<div class="page">
    <header class="wordmark">Bookmark Express</header>

    <main class="card">
        <h1 class="heading">Settings</h1>

        {#if ready}
            <div class="row">
                <div class="label">Tab behavior</div>
                <div class="control">
                    <label class="check">
                        <input
                            type="checkbox"
                            checked={settings.invertTabBehavior}
                            onchange={onToggle}
                        />
                        <span class="check-label">Invert tab behavior</span>
                    </label>
                    <p class="desc">
                        {#if settings.invertTabBehavior}
                            Enter opens in the same tab; Shift+Enter opens in a new tab.
                        {:else}
                            Enter opens in a new tab; Shift+Enter opens in the same tab.
                        {/if}
                    </p>
                </div>
            </div>
        {/if}
    </main>

    <footer class="footer">Instant search for your Chrome bookmarks.</footer>
</div>

<style>
    /* Mirrors the Instapaper options menu (serif wordmark over a centered card
       with a left-aligned header, bold row labels, and controls on the right),
       rendered in dark mode with the brand palette sampled in
       scripts/gen-store-assets.mjs (#101624 navy, #f2efe6 cream, #96a0b3 muted).
       The wordmark stays serif like Instapaper's; the header and options are
       sans-serif. */
    :global(html),
    :global(body) {
        margin: 0;
        padding: 0;
    }

    :global(body) {
        min-height: 100vh;
        background: #101624;
        color: #f2efe6;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }

    .page {
        min-height: 100vh;
        box-sizing: border-box;
        padding: 48px 20px 40px;
        display: flex;
        flex-direction: column;
        align-items: center;
    }

    .wordmark {
        margin-bottom: 28px;
        text-align: center;
        font-family: Georgia, 'Times New Roman', serif;
        font-size: 40px;
        font-weight: 700;
        color: #f2efe6;
    }

    .card {
        width: 100%;
        max-width: 640px;
        box-sizing: border-box;
        padding: 32px 40px 40px;
        background: #182339;
        border: 1px solid #2a3550;
        border-radius: 6px;
        box-shadow: 0 18px 50px rgba(0, 0, 0, 0.4);
    }

    .heading {
        margin: 0;
        padding-bottom: 20px;
        border-bottom: 1px solid #33405c;
        font-size: 28px;
        font-weight: 400;
        color: #f2efe6;
    }

    .row {
        display: flex;
        gap: 24px;
        padding-top: 28px;
    }

    .label {
        flex: 0 0 180px;
        font-size: 17px;
        font-weight: 700;
        color: #f2efe6;
    }

    .control {
        flex: 1;
    }

    .check {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
    }

    .check input {
        flex: none;
        width: 18px;
        height: 18px;
        accent-color: #6b8fd6;
        cursor: pointer;
    }

    .check-label {
        font-size: 17px;
        color: #c7cede;
    }

    .desc {
        margin: 10px 0 0 28px;
        font-size: 14px;
        line-height: 1.45;
        color: #8b95a8;
    }

    .footer {
        margin-top: 26px;
        text-align: center;
        font-size: 13px;
        color: #8b95a8;
    }
</style>
