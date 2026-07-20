// End-to-end test: load the built popup in Chromium with a mocked chrome.* API
// and drive the real search / highlight / keyboard / tab-opening flow. Not a
// substitute for loading unpacked in Chrome, but proves the ported logic and the
// tab-behavior setting run end-to-end. Exits non-zero if any assertion fails.
import { chromium } from 'playwright'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join } from 'node:path'

const DIST = new URL('./dist/', import.meta.url).pathname
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }

const server = createServer(async (req, res) => {
    try {
        const path = req.url === '/' ? '/index.html' : req.url.split('?')[0]
        const body = await readFile(join(DIST, path))
        res.setHeader('content-type', MIME[extname(path)] ?? 'application/octet-stream')
        res.end(body)
    } catch {
        res.statusCode = 404
        res.end('not found')
    }
})
await new Promise((r) => server.listen(0, r))
const port = server.address().port

// Read the built manifest so the mock only exposes chrome.* namespaces the
// extension actually declares a permission for — mirroring real Chrome, where
// e.g. chrome.storage is undefined without the "storage" permission.
const manifest = JSON.parse(await readFile(join(DIST, 'manifest.json'), 'utf8'))
const permissions = manifest.permissions ?? []

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })

const failures = []
function check(cond, msg) {
    if (!cond) failures.push(msg)
}

// Open a fresh extension page with a mocked chrome.* surface. `seed` pre-populates
// chrome.storage.local (used to start a scenario with the setting already saved).
// `path`/`waitFor` let the same mock drive either the popup or the options page.
async function openPopup(seed = {}, path = 'index.html', waitFor = '.search-bar') {
    const page = await browser.newPage()
    const logs = []
    page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
    page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

    await page.addInitScript(
        ({ permissions, seed }) => {
            const tree = [
                {
                    id: '0',
                    title: '',
                    children: [
                        {
                            id: '1',
                            title: 'Bookmarks Bar',
                            children: [
                                { id: '10', title: 'Work', children: [
                                    { id: '100', title: 'GitHub Dashboard', url: 'https://github.com/dashboard' },
                                    { id: '101', title: 'Google Docs', url: 'https://docs.google.com' },
                                ]},
                                { id: '11', title: 'GitHub Home', url: 'https://github.com' },
                            ],
                        },
                    ],
                },
            ]
            const store = { ...seed }
            // Record clipboard writes so tests can assert Cmd/Ctrl+C copied the
            // right URL, without depending on a real clipboard being available.
            window.__clipboard = []
            Object.defineProperty(navigator, 'clipboard', {
                configurable: true,
                value: { writeText: async (text) => void window.__clipboard.push(text) },
            })
            // chrome.tabs.create/update and chrome.windows.create need no
            // permission, so mock them always. Record each call so tests can
            // assert new-tab vs same-tab vs incognito behavior.
            window.__tabActions = []
            const chrome = {
                runtime: { getURL: (p) => 'chrome-extension://fake' + p },
                tabs: {
                    create: (opts) => window.__tabActions.push({ action: 'create', url: opts.url }),
                    update: (opts) => window.__tabActions.push({ action: 'update', url: opts.url }),
                },
                windows: {
                    create: (opts) =>
                        window.__tabActions.push({ action: 'window', url: opts.url, incognito: opts.incognito }),
                },
            }
            if (permissions.includes('storage')) {
                chrome.storage = {
                    local: {
                        get: async (keys) => {
                            const out = {}
                            for (const k of [].concat(keys)) if (k in store) out[k] = store[k]
                            return out
                        },
                        set: async (obj) => Object.assign(store, obj),
                    },
                }
            }
            if (permissions.includes('bookmarks')) {
                chrome.bookmarks = {
                    getTree: async () => tree,
                    search: async (q) => {
                        const flat = []
                        const walk = (n) => { if (n.url) flat.push(n); (n.children || []).forEach(walk) }
                        tree.forEach(walk)
                        return flat.filter((b) => (b.title + ' ' + b.url).toLowerCase().includes(q.toLowerCase()))
                    },
                }
            }
            window.chrome = chrome
        },
        { permissions, seed },
    )

    await page.goto(`http://localhost:${port}/${path}`)
    await page.waitForSelector(waitFor, { timeout: 5000 })
    return { page, logs }
}

let actions

// --- Scenario: default look is the MODERN popup ------------------------------
const mod = await openPopup()
await mod.page.fill('.search-bar', 'github')
await mod.page.waitForSelector('.row', { timeout: 5000 })

const rowCount = await mod.page.locator('.row').count()
const firstTitle = await mod.page.locator('.row').first().locator('.title').innerText()
const firstCrumb = await mod.page.locator('.row').first().locator('.crumb').innerText()
const firstUrl = await mod.page.locator('.row').first().locator('.url').innerText()
const modHighlights = await mod.page.locator('.search-hit').count()

check(rowCount === 2, `expected 2 github results, got ${rowCount}`)
check(modHighlights > 0, 'expected search-hit highlighting on title and/or URL')
check(firstTitle.length > 0, 'expected a titled first result')
check(firstCrumb.includes('›'), `expected a "›" breadcrumb, got "${firstCrumb}"`)
check(firstUrl.includes('github'), `expected the full URL shown, got "${firstUrl}"`)

// Modern chrome: a real search icon and a 4-hint keyboard footer, no in-bar
// theme toggle (theme is controlled from the options page only).
check((await mod.page.locator('.search-wrap svg.search-icon').count()) === 1, 'expected an inline search icon')
check((await mod.page.locator('.theme-toggle').count()) === 0, 'in-bar theme toggle should be gone')
check((await mod.page.locator('.footer .kbd').count()) === 6, 'expected 6 footer key hints')
// The footer spells out both Enter and Shift+Enter targets for the default setting,
// the fixed Cmd+Shift+Enter incognito shortcut, and the Cmd+C copy-URL shortcut.
const footerText = await mod.page.locator('.footer').innerText()
check(footerText.includes('New tab') && footerText.includes('Same tab'), `footer should show both tab targets, got "${footerText}"`)
check(footerText.includes('Incognito'), `footer should advertise the incognito shortcut, got "${footerText}"`)
check(footerText.includes('Copy URL'), `footer should advertise the copy-URL shortcut, got "${footerText}"`)
check(
    (await mod.page.locator('.footer .kbd', { hasText: '⌘⇧↵' }).count()) === 1,
    'footer should show the ⌘⇧↵ incognito key hint',
)
check(
    (await mod.page.locator('.footer .kbd', { hasText: '⌘C' }).count()) === 1,
    'footer should show the ⌘C copy-URL key hint',
)
// Theme resolves from the setting: 'system' follows the OS (light in this harness).
check(
    (await mod.page.evaluate(() => document.documentElement.dataset.theme)) === 'light',
    'system theme should resolve to light in the default harness',
)

// Arrow nav moves the selection (rows carry the .selected class).
await mod.page.locator('.search-bar').press('ArrowDown')
const modSelected = await mod.page.evaluate(() =>
    [...document.querySelectorAll('.row')].findIndex((r) => r.classList.contains('selected')),
)
check(modSelected === 1, `arrow-down should select row 1, got ${modSelected}`)
await mod.page.locator('.search-bar').press('ArrowUp')

// Default: plain Enter opens a NEW tab; Shift+Enter reuses the tab.
await mod.page.locator('.search-bar').press('Enter')
actions = await mod.page.evaluate(() => window.__tabActions)
check(
    actions.length === 1 && actions[0].action === 'create',
    `modern Enter should create a new tab, got ${JSON.stringify(actions)}`,
)
await mod.page.evaluate(() => (window.__tabActions.length = 0))
await mod.page.locator('.search-bar').press('Shift+Enter')
actions = await mod.page.evaluate(() => window.__tabActions)
check(
    actions.length === 1 && actions[0].action === 'update',
    `modern Shift+Enter should reuse the tab, got ${JSON.stringify(actions)}`,
)

// Cmd+Shift+Enter opens a fresh incognito window (no toggle gates it). Both the
// Mac (Meta) and Win/Linux (Control) chords resolve to the same incognito open.
await mod.page.evaluate(() => (window.__tabActions.length = 0))
await mod.page.locator('.search-bar').press('Meta+Shift+Enter')
actions = await mod.page.evaluate(() => window.__tabActions)
check(
    actions.length === 1 && actions[0].action === 'window' && actions[0].incognito === true,
    `Cmd+Shift+Enter should open an incognito window, got ${JSON.stringify(actions)}`,
)
await mod.page.evaluate(() => (window.__tabActions.length = 0))
await mod.page.locator('.search-bar').press('Control+Shift+Enter')
actions = await mod.page.evaluate(() => window.__tabActions)
check(
    actions.length === 1 && actions[0].action === 'window' && actions[0].incognito === true,
    `Ctrl+Shift+Enter should open an incognito window, got ${JSON.stringify(actions)}`,
)

// Cmd+C (Ctrl+C on Win/Linux) copies the highlighted row's URL and flashes a
// "URL copied" overlay on that row. Both chords resolve to the same copy.
await mod.page.evaluate(() => (window.__clipboard.length = 0))
const selectedUrl = await mod.page.locator('.row.selected .url').innerText()
await mod.page.locator('.search-bar').press('Meta+c')
let clip = await mod.page.evaluate(() => window.__clipboard)
check(
    clip.length === 1 && clip[0] === selectedUrl,
    `Cmd+C should copy the highlighted URL "${selectedUrl}", got ${JSON.stringify(clip)}`,
)
check(
    (await mod.page.locator('.row.selected .copied-flash').innerText()) === 'URL copied',
    'Cmd+C should flash a "URL copied" overlay on the highlighted row',
)
await mod.page.evaluate(() => (window.__clipboard.length = 0))
await mod.page.locator('.search-bar').press('Control+c')
clip = await mod.page.evaluate(() => window.__clipboard)
check(
    clip.length === 1 && clip[0] === selectedUrl,
    `Ctrl+C should copy the highlighted URL "${selectedUrl}", got ${JSON.stringify(clip)}`,
)

// A pinned theme setting overrides the system scheme.
const dark = await openPopup({ settings: { theme: 'dark' } })
await dark.page.waitForSelector('.search-bar', { timeout: 5000 })
check(
    (await dark.page.evaluate(() => document.documentElement.dataset.theme)) === 'dark',
    'theme:dark setting should force the dark scheme',
)

// --- Scenario: classic look (opt-in via settings) ----------------------------
const cls = await openPopup({ settings: { useClassic: true } })
await cls.page.fill('.search-bar', 'github')
await cls.page.waitForSelector('li', { timeout: 5000 })

check((await cls.page.locator('li').count()) === 2, 'expected 2 results in the classic list')
check((await cls.page.locator('.folder-path').count()) > 0, 'expected classic folder-path rows')
check((await cls.page.locator('.row').count()) === 0, 'classic look should not render modern rows')

const clsHint = await cls.page.locator('.hint').innerText()
check(
    clsHint === 'shift + enter to open in same tab · cmd + shift + enter for incognito · cmd + c to copy url',
    `classic hint was "${clsHint}"`,
)

// Behavior is identical to modern (shared controller).
await cls.page.locator('.search-bar').press('ArrowDown')
const clsSelected = await cls.page.evaluate(() =>
    [...document.querySelectorAll('li')].findIndex((li) => li.classList.contains('selected')),
)
check(clsSelected === 1, `classic arrow-down should select index 1, got ${clsSelected}`)
await cls.page.locator('.search-bar').press('ArrowUp')
await cls.page.locator('.search-bar').press('Enter')
actions = await cls.page.evaluate(() => window.__tabActions)
check(
    actions.length === 1 && actions[0].action === 'create',
    `classic Enter should create a new tab, got ${JSON.stringify(actions)}`,
)
// The incognito chord is shared behavior, so it works under the classic look too.
await cls.page.evaluate(() => (window.__tabActions.length = 0))
await cls.page.locator('.search-bar').press('Meta+Shift+Enter')
actions = await cls.page.evaluate(() => window.__tabActions)
check(
    actions.length === 1 && actions[0].action === 'window' && actions[0].incognito === true,
    `classic Cmd+Shift+Enter should open an incognito window, got ${JSON.stringify(actions)}`,
)
// Copy-to-clipboard is shared behavior too: Cmd+C copies the highlighted URL and
// flashes the overlay under the classic look as well.
await cls.page.evaluate(() => (window.__clipboard.length = 0))
const clsSelectedUrl = await cls.page.locator('li.selected .url').innerText()
await cls.page.locator('.search-bar').press('Meta+c')
const clsClip = await cls.page.evaluate(() => window.__clipboard)
check(
    clsClip.length === 1 && clsClip[0] === clsSelectedUrl,
    `classic Cmd+C should copy the highlighted URL "${clsSelectedUrl}", got ${JSON.stringify(clsClip)}`,
)
check(
    (await cls.page.locator('li.selected .copied-flash').innerText()) === 'URL copied',
    'classic Cmd+C should flash a "URL copied" overlay on the highlighted row',
)

// --- Scenario: inverted tab behavior (checked against the classic hint copy) --
const inv = await openPopup({ settings: { invertTabBehavior: true, useClassic: true } })
await inv.page.fill('.search-bar', 'github')
await inv.page.waitForSelector('li', { timeout: 5000 })

const invHint = await inv.page.locator('.hint').innerText()
check(
    invHint === 'shift + enter to open in new tab · cmd + shift + enter for incognito · cmd + c to copy url',
    `inverted hint was "${invHint}"`,
)

await inv.page.locator('.search-bar').press('Enter')
actions = await inv.page.evaluate(() => window.__tabActions)
check(
    actions.length === 1 && actions[0].action === 'update',
    `inverted Enter should reuse the tab, got ${JSON.stringify(actions)}`,
)
await inv.page.evaluate(() => (window.__tabActions.length = 0))
await inv.page.locator('.search-bar').press('Shift+Enter')
actions = await inv.page.evaluate(() => window.__tabActions)
check(
    actions.length === 1 && actions[0].action === 'create',
    `inverted Shift+Enter should open a new tab, got ${JSON.stringify(actions)}`,
)

// --- Scenario: options page toggles and persists every setting ---------------
const opt = await openPopup({}, 'options.html', '.card')
const invertBox = opt.page.locator('input[type=checkbox]').nth(0)
const classicBox = opt.page.locator('input[type=checkbox]').nth(1)

// Both checkboxes start unchecked; Theme starts on System.
check((await invertBox.isChecked()) === false, 'invert checkbox should start unchecked')
check((await classicBox.isChecked()) === false, 'classic checkbox should start unchecked')
const activeTheme = (await opt.page.locator('.seg.active').innerText()).trim()
check(activeTheme === 'System', `theme should start on System, got "${activeTheme}"`)

// Invert toggle persists and flips the tab-behavior description copy.
const descBefore = (await opt.page.locator('.row').nth(0).locator('.desc').innerText()).trim()
check(
    descBefore === 'Enter opens in a new tab; Shift+Enter opens in the same tab.',
    `default invert description was "${descBefore}"`,
)
await invertBox.check()
const descAfter = (await opt.page.locator('.row').nth(0).locator('.desc').innerText()).trim()
check(
    descAfter === 'Enter opens in the same tab; Shift+Enter opens in a new tab.',
    `inverted invert description was "${descAfter}"`,
)

// Selecting a theme and the classic look persists to chrome.storage.local.
await opt.page.getByRole('radio', { name: 'Dark' }).click()
await classicBox.check()
const stored = await opt.page.evaluate(async () => (await chrome.storage.local.get('settings')).settings)
check(stored?.invertTabBehavior === true, `should persist invertTabBehavior, got ${JSON.stringify(stored)}`)
check(stored?.theme === 'dark', `should persist theme, got ${JSON.stringify(stored)}`)
check(stored?.useClassic === true, `should persist useClassic, got ${JSON.stringify(stored)}`)

// With the classic look on, the theme selector is disabled (it only affects modern).
check(
    (await opt.page.getByRole('radio', { name: 'Dark' }).isDisabled()) === true,
    'theme selector should be disabled while classic look is on',
)

// Only fail on real JS exceptions (pageerror). Resource 404s such as the mock's
// favicon endpoint are expected noise in this harness, not logic errors.
const errors = [...mod.logs, ...dark.logs, ...cls.logs, ...inv.logs, ...opt.logs].filter((l) => l.includes('pageerror'))
check(errors.length === 0, `page errors: ${errors.join(' | ')}`)

await browser.close()
server.close()

if (failures.length > 0) {
    console.error('FAIL:\n' + failures.map((f) => '  - ' + f).join('\n'))
    process.exit(1)
}
console.log('PASS: all verify.mjs checks passed')
