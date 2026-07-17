# Bookmark Express (v3)

Instant search for your Chrome bookmarks. A **Manifest V3** rewrite of the
original `bookmark-express`, ported from Backbone/jQuery/RequireJS to
**Svelte + TypeScript on Vite**.

## Why this rewrite exists

The original extension is Manifest V2, which Chrome no longer accepts for new
Web Store submissions and has been disabling. It also relied on
`chrome://favicon/`, which was removed in MV3. This version fixes both while
keeping the popup as fast as the original (a compile-to-vanilla Svelte build
ships almost no framework runtime — the whole popup is ~16 KB gzipped).

## What changed from the original

| Concern | Old (`bookmark-express`) | This version |
| --- | --- | --- |
| Manifest | V2 | **V3** |
| Popup entry | `browser_action` | `action` |
| Favicons | `chrome://favicon/` | `favicon` permission + `_favicon/` endpoint |
| Cache store | `localStorage` | `chrome.storage.local` |
| Background page | `bg.html` warm-up hack | removed (MV3 workers are ephemeral) |
| UI | Backbone + jQuery + Mustache | Svelte + TypeScript |
| Build | RequireJS/almond + bash | Vite |

Behavior is otherwise a faithful port: instant filter as you type (min 2
chars), most-used bookmarks ranked first, folder path shown per result,
search-term highlighting, and arrow-key / Enter navigation.

## Opening bookmarks

By default, **Enter** opens the selected bookmark in a **new tab** and
**Shift+Enter** opens it in the **same tab** (clicking a result follows the same
rule, with Shift inverting it). Once results appear, the search bar shows a
right-aligned hint reminding you what Shift+Enter does.

The extension's options page (right-click the toolbar icon → **Options**) has an
**Invert tab behavior** toggle that swaps the two, so Enter reuses the current
tab and Shift+Enter opens a new one. The hint text updates to match.

**Cmd+Shift+Enter** (Ctrl+Shift+Enter on Windows/Linux, or Cmd/Ctrl+Shift+click)
opens the selected bookmark in a fresh **incognito window**. Unlike the tab
behavior above, this shortcut has no toggle — it's a fixed keystroke, shown in
the modern popup's keyboard-hint footer. It relies on `chrome.windows.create`,
so the extension must be granted **Allow in incognito** on `chrome://extensions`
for the window to appear.

## Appearance

The popup ships with a modern, command-palette-style look (rounded container,
pill search bar, folder breadcrumbs, full URLs, match highlighting on both title
and URL, and a keyboard-hint footer). The options page controls two appearance
settings:

- **Theme** — **System** (follows your OS via `prefers-color-scheme`, the
  default), **Light**, or **Dark**. Applies to the modern look only, so it's
  disabled while the classic look is on.
- **Use classic Bookmark Express** — opt back into the original plain-list look.

Both looks are driven by the same search/keyboard/tab-opening controller
(`App.svelte`); only the presentation layer differs (`components/ModernView.svelte`
vs. `components/ClassicView.svelte`), so behavior stays identical between them.

## Develop

```bash
npm install
npm run dev       # Vite dev server (UI only; chrome.* APIs need the real extension)
npm run build     # type-check + production build into dist/
npm run build:dev # same, but a distinct "dev" build into dist-dev/ (see below)
npm run zip       # build and package dist/ into bookmark-express-v3.zip for the store
```

### Running a dev build alongside prod

`npm run build:dev` produces a build you can load unpacked at the same time as
the Web Store ("prod") build without the two colliding:

- **Output** — dev builds land in **`dist-dev/`** (prod keeps `dist/`), so the
  two never overwrite each other and you can keep both loaded.
- **Name** — "Bookmark Express **Dev**", so the two are distinct in
  `chrome://extensions` and the toolbar tooltip.
- **Icon** — the navy icon is recolored **amber** so you can tell the dev popup
  from prod at a glance.
- **Shortcut** — the popup hotkey moves to **Ctrl+Shift+L** (`Cmd+Shift+L` on
  macOS) — prod stays Ctrl+Shift+K — so Chrome assigns both a working shortcut.

Load `dist-dev/` as a second unpacked extension alongside prod's `dist/`.
Everything else is identical to the prod build. The differences live in one
place — `scripts/dev-build.mjs` — applied at build time by the `bmx-dev-build`
Vite plugin. The amber icons in `dev-icons/` are recolored from the prod icons
by `scripts/gen-dev-icons.mjs` (re-run it only if the prod art changes).

```bash
node verify-dev-build.mjs   # pins the dev-build differences (no build/browser needed)
```

## Load it in Chrome

1. `npm run build`
2. Visit `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** and select the `dist/` folder.
4. Click the toolbar icon (or press `Ctrl+Shift+K`) and start typing.

## Verify the ported logic

`verify.mjs` loads the built popup in Chromium with a mocked `chrome.*` API and
drives the search/highlight/keyboard flow end-to-end:

```bash
npm install --no-save playwright
node verify.mjs
```
