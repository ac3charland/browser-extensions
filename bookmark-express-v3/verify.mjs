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
            // chrome.tabs.create/update need no permission, so mock them always.
            // Record each call so tests can assert new-tab vs same-tab behavior.
            window.__tabActions = []
            const chrome = {
                runtime: { getURL: (p) => 'chrome-extension://fake' + p },
                tabs: {
                    create: (opts) => window.__tabActions.push({ action: 'create', url: opts.url }),
                    update: (opts) => window.__tabActions.push({ action: 'update', url: opts.url }),
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

// --- Scenario: default settings (invertTabBehavior not set) -------------------
const def = await openPopup()
await def.page.fill('.search-bar', 'github')
await def.page.waitForSelector('li', { timeout: 5000 })

const resultCount = await def.page.locator('li').count()
const firstTitle = await def.page.locator('li').first().locator('.bookmark-link').innerText()
const firstPath = await def.page.locator('li').first().locator('.folder-path').innerText()
const highlightCount = await def.page.locator('.search-hit').count()

check(resultCount === 2, `expected 2 github results, got ${resultCount}`)
check(highlightCount > 0, 'expected search-hit highlighting')
check(firstTitle.length > 0 && firstPath.length >= 0, 'expected a titled first result with a path')

// Helper text present, right-aligned copy reflects the default setting.
const defHint = await def.page.locator('.hint').innerText()
check(defHint === 'shift + enter to open in same tab', `default hint was "${defHint}"`)

// Arrow nav still moves the selection.
await def.page.locator('.search-bar').press('ArrowDown')
const selectedIndex = await def.page.evaluate(() =>
    [...document.querySelectorAll('li')].findIndex((li) => li.classList.contains('selected')),
)
check(selectedIndex === 1, `arrow-down should select index 1, got ${selectedIndex}`)
await def.page.locator('.search-bar').press('ArrowUp')

// Default: plain Enter opens a NEW tab (chrome.tabs.create).
await def.page.locator('.search-bar').press('Enter')
let actions = await def.page.evaluate(() => window.__tabActions)
check(
    actions.length === 1 && actions[0].action === 'create',
    `default Enter should create a new tab, got ${JSON.stringify(actions)}`,
)

// Default: Shift+Enter opens in the SAME tab (chrome.tabs.update).
await def.page.evaluate(() => (window.__tabActions.length = 0))
await def.page.locator('.search-bar').press('Shift+Enter')
actions = await def.page.evaluate(() => window.__tabActions)
check(
    actions.length === 1 && actions[0].action === 'update',
    `default Shift+Enter should reuse the tab, got ${JSON.stringify(actions)}`,
)

// --- Scenario: inverted settings ---------------------------------------------
const inv = await openPopup({ settings: { invertTabBehavior: true } })
await inv.page.fill('.search-bar', 'github')
await inv.page.waitForSelector('li', { timeout: 5000 })

// Hint copy flips with the setting.
const invHint = await inv.page.locator('.hint').innerText()
check(invHint === 'shift + enter to open in new tab', `inverted hint was "${invHint}"`)

// Inverted: plain Enter opens in the SAME tab.
await inv.page.locator('.search-bar').press('Enter')
actions = await inv.page.evaluate(() => window.__tabActions)
check(
    actions.length === 1 && actions[0].action === 'update',
    `inverted Enter should reuse the tab, got ${JSON.stringify(actions)}`,
)

// Inverted: Shift+Enter opens a NEW tab.
await inv.page.evaluate(() => (window.__tabActions.length = 0))
await inv.page.locator('.search-bar').press('Shift+Enter')
actions = await inv.page.evaluate(() => window.__tabActions)
check(
    actions.length === 1 && actions[0].action === 'create',
    `inverted Shift+Enter should open a new tab, got ${JSON.stringify(actions)}`,
)

// --- Scenario: options page toggles and persists the setting -----------------
const opt = await openPopup({}, 'options.html', '.panel')

// Starts unchecked with the default (not-inverted) description.
const optChecked = await opt.page.locator('input[type=checkbox]').isChecked()
check(optChecked === false, 'options checkbox should start unchecked by default')
const descBefore = (await opt.page.locator('.desc').innerText()).trim()
check(
    descBefore === 'Enter opens in a new tab; Shift+Enter opens in the same tab.',
    `default options description was "${descBefore}"`,
)

// Toggling it persists to chrome.storage.local and updates the description copy.
await opt.page.locator('input[type=checkbox]').check()
const stored = await opt.page.evaluate(async () => (await chrome.storage.local.get('settings')).settings)
check(stored?.invertTabBehavior === true, `toggle should persist invertTabBehavior, got ${JSON.stringify(stored)}`)
const descAfter = (await opt.page.locator('.desc').innerText()).trim()
check(
    descAfter === 'Enter opens in the same tab; Shift+Enter opens in a new tab.',
    `inverted options description was "${descAfter}"`,
)

// Only fail on real JS exceptions (pageerror). Resource 404s such as the mock's
// favicon endpoint are expected noise in this harness, not logic errors.
const errors = [...def.logs, ...inv.logs, ...opt.logs].filter((l) => l.includes('pageerror'))
check(errors.length === 0, `page errors: ${errors.join(' | ')}`)

await browser.close()
server.close()

if (failures.length > 0) {
    console.error('FAIL:\n' + failures.map((f) => '  - ' + f).join('\n'))
    process.exit(1)
}
console.log('PASS: all verify.mjs checks passed')
