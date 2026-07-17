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
    <main class="panel">
        <h1>Bookmark Express</h1>
        <p class="tagline">Settings</p>

        {#if ready}
            <div class="setting">
                <label class="row">
                    <span class="text">
                        <span class="name">Invert tab behavior</span>
                        <span class="desc">
                            {#if settings.invertTabBehavior}
                                Enter opens in the same tab; Shift+Enter opens in a new tab.
                            {:else}
                                Enter opens in a new tab; Shift+Enter opens in the same tab.
                            {/if}
                        </span>
                    </span>
                    <input
                        type="checkbox"
                        checked={settings.invertTabBehavior}
                        onchange={onToggle}
                    />
                </label>
            </div>
        {/if}
    </main>
</div>

<style>
    /* Primarily-dark options page: navy brand background, cream serif text,
       centered panel (Instapaper-style). Colors are the brand palette sampled in
       scripts/gen-store-assets.mjs (#101624 navy, #f2efe6 cream, #96a0b3 muted). */
    :global(html),
    :global(body) {
        margin: 0;
        padding: 0;
    }

    :global(body) {
        min-height: 100vh;
        background: radial-gradient(70% 60% at 50% 0%, #1c2740 0%, #101624 70%);
        background-color: #101624;
        color: #f2efe6;
        font-family: Georgia, 'Times New Roman', serif;
    }

    .page {
        min-height: 100vh;
        box-sizing: border-box;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 72px 20px;
    }

    .panel {
        width: 100%;
        max-width: 560px;
        box-sizing: border-box;
        padding: 44px;
        background: #1b2740;
        border: 1px solid #33405c;
        border-radius: 16px;
        box-shadow: 0 20px 55px rgba(0, 0, 0, 0.45);
    }

    h1 {
        margin: 0;
        text-align: center;
        font-size: 30px;
        font-weight: 700;
    }

    .tagline {
        margin: 8px 0 32px;
        text-align: center;
        color: #96a0b3;
        font-size: 13px;
        letter-spacing: 0.22em;
        text-transform: uppercase;
    }

    .setting {
        padding-top: 26px;
        border-top: 1px solid #33405c;
    }

    .row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 22px;
        cursor: pointer;
    }

    .text {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .name {
        font-size: 19px;
    }

    .desc {
        color: #96a0b3;
        font-size: 15px;
        line-height: 1.45;
    }

    input[type='checkbox'] {
        flex: none;
        margin-top: 4px;
        width: 20px;
        height: 20px;
        accent-color: #f2efe6;
        cursor: pointer;
    }
</style>
