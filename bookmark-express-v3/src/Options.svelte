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

<main>
    <h1>Bookmark Express</h1>
    {#if ready}
        <label class="row">
            <input
                type="checkbox"
                checked={settings.invertTabBehavior}
                onchange={onToggle}
            />
            <span class="label">
                <strong>Invert tab behavior</strong>
                <small>
                    {#if settings.invertTabBehavior}
                        Enter opens in the same tab; Shift+Enter opens in a new tab.
                    {:else}
                        Enter opens in a new tab; Shift+Enter opens in the same tab.
                    {/if}
                </small>
            </span>
        </label>
    {/if}
</main>

<style>
    main {
        padding: 24px;
    }

    h1 {
        margin: 0 0 16px;
        font-size: 22px;
    }

    .row {
        display: flex;
        gap: 10px;
        align-items: flex-start;
        cursor: pointer;
    }

    .row input {
        margin-top: 3px;
    }

    .label {
        display: flex;
        flex-direction: column;
    }

    small {
        color: GrayText;
        font-size: 14px;
    }
</style>
