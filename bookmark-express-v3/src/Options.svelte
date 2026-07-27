<script lang="ts">
    import { onMount } from 'svelte'
    import {
        loadSettings,
        saveSettings,
        allHintsEnabled,
        anyHintsEnabled,
        hintLabel,
        setAllHints,
        DEFAULT_SETTINGS,
        FOOTER_HINTS,
        type HintId,
        type Settings,
        type Theme,
    } from './lib/settings'

    let ready = $state(false)
    let settings = $state<Settings>(DEFAULT_SETTINGS)

    const THEMES: { value: Theme; label: string }[] = [
        { value: 'system', label: 'System' },
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
    ]

    onMount(async () => {
        settings = await loadSettings()
        ready = true
    })

    async function onToggle(event: Event) {
        settings.invertTabBehavior = (event.target as HTMLInputElement).checked
        await saveSettings(settings)
    }

    async function onTheme(theme: Theme) {
        settings.theme = theme
        await saveSettings(settings)
    }

    async function onToggleClassic(event: Event) {
        settings.useClassic = (event.target as HTMLInputElement).checked
        await saveSettings(settings)
    }

    // The check-all box reflects the individual ones: checked only when every
    // hint is on, indeterminate while some are.
    let allHints = $derived(allHintsEnabled(settings.footerHints))
    let someHints = $derived(anyHintsEnabled(settings.footerHints))

    async function onToggleAllHints(event: Event) {
        settings.footerHints = setAllHints((event.target as HTMLInputElement).checked)
        await saveSettings(settings)
    }

    async function onToggleHint(id: HintId, event: Event) {
        settings.footerHints = {
            ...settings.footerHints,
            [id]: (event.target as HTMLInputElement).checked,
        }
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

            <div class="row">
                <div class="label">Theme</div>
                <div class="control">
                    <div
                        class="segmented"
                        class:disabled={settings.useClassic}
                        role="radiogroup"
                        aria-label="Theme"
                        aria-disabled={settings.useClassic}
                    >
                        {#each THEMES as option}
                            <button
                                type="button"
                                class="seg"
                                class:active={settings.theme === option.value}
                                role="radio"
                                aria-checked={settings.theme === option.value}
                                disabled={settings.useClassic}
                                onclick={() => onTheme(option.value)}
                            >
                                {option.label}
                            </button>
                        {/each}
                    </div>
                    <p class="desc">
                        {#if settings.useClassic}
                            The theme only applies to the modern look. Turn off the classic look to
                            change it.
                        {:else}
                            Color scheme for the modern popup. System follows your operating system.
                        {/if}
                    </p>
                </div>
            </div>

            <div class="row">
                <div class="label">Classic look</div>
                <div class="control">
                    <label class="check">
                        <input
                            type="checkbox"
                            checked={settings.useClassic}
                            onchange={onToggleClassic}
                        />
                        <span class="check-label">Use classic Bookmark Express</span>
                    </label>
                    <p class="desc">
                        Show the original popup design instead of the modern one.
                    </p>
                </div>
            </div>

            <div class="row">
                <div class="label">Footer hints</div>
                <div class="control">
                    <div class="hints" class:disabled={settings.useClassic}>
                        <label class="check">
                            <input
                                type="checkbox"
                                checked={allHints}
                                indeterminate={someHints && !allHints}
                                disabled={settings.useClassic}
                                onchange={onToggleAllHints}
                            />
                            <span class="check-label">All hints</span>
                        </label>
                        <div class="hint-list">
                            {#each FOOTER_HINTS as hint (hint.id)}
                                <label class="check">
                                    <input
                                        type="checkbox"
                                        checked={settings.footerHints[hint.id]}
                                        disabled={settings.useClassic}
                                        onchange={(event) => onToggleHint(hint.id, event)}
                                    />
                                    <span class="check-label">
                                        <span class="kbd">{hint.key}</span>
                                        {hintLabel(hint, settings.invertTabBehavior)}
                                    </span>
                                </label>
                            {/each}
                        </div>
                    </div>
                    <p class="desc">
                        {#if settings.useClassic}
                            The hint footer only applies to the modern look. Turn off the classic
                            look to change it.
                        {:else if !someHints}
                            No hints are enabled, so the popup hides its footer entirely.
                        {:else}
                            Keyboard shortcuts listed along the bottom of the modern popup.
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

    /* The check-all box sits above its group, with the individual hints indented
       under it (aligned with the .desc text below). */
    .hints {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }

    .hint-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-left: 28px;
    }

    .hints.disabled {
        opacity: 0.4;
    }

    .hints.disabled .check,
    .hints.disabled .check input {
        cursor: not-allowed;
    }

    /* Key chip echoing the popup footer's, so a row reads as the hint it toggles. */
    .kbd {
        display: inline-block;
        min-width: 12px;
        margin-right: 4px;
        padding: 1px 6px;
        background: #101624;
        border: 1px solid #2a3550;
        border-radius: 5px;
        font-size: 12px;
        font-weight: 600;
        text-align: center;
        color: #f2efe6;
    }

    .segmented {
        display: inline-flex;
        padding: 3px;
        gap: 3px;
        background: #101624;
        border: 1px solid #2a3550;
        border-radius: 8px;
    }

    .seg {
        border: none;
        background: transparent;
        color: #c7cede;
        font: inherit;
        font-size: 15px;
        padding: 6px 16px;
        border-radius: 6px;
        cursor: pointer;
    }

    .seg:hover {
        color: #f2efe6;
    }

    .seg.active {
        background: #6b8fd6;
        color: #101624;
        font-weight: 600;
    }

    .segmented.disabled {
        opacity: 0.4;
    }

    .segmented.disabled .seg {
        cursor: not-allowed;
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
