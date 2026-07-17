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

## Develop

```bash
npm install
npm run dev      # Vite dev server (UI only; chrome.* APIs need the real extension)
npm run build    # type-check + production build into dist/
npm run zip      # build and package dist/ into bookmark-express-v3.zip for the store
```

## Load it in Chrome

1. `npm run build`
2. Visit `chrome://extensions`, enable **Developer mode**.
3. **Load unpacked** and select the `dist/` folder.
4. Click the toolbar icon (or press `Ctrl+Shift+L`) and start typing.

## Verify the ported logic

`verify.mjs` loads the built popup in Chromium with a mocked `chrome.*` API and
drives the search/highlight/keyboard flow end-to-end:

```bash
npm install --no-save playwright
node verify.mjs
```
