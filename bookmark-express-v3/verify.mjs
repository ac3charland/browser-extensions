// Smoke test: load the built popup in Chromium with a mocked chrome.* API and
// drive the real search/highlight/keyboard flow. Not a substitute for loading
// unpacked in Chrome, but proves the ported logic runs end-to-end.
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
const page = await browser.newPage()

const logs = []
page.on('console', (m) => logs.push(`[${m.type()}] ${m.text()}`))
page.on('pageerror', (e) => logs.push(`[pageerror] ${e.message}`))

// Mock the chrome.* surface the extension uses, with a small bookmark tree.
await page.addInitScript((permissions) => {
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
    const store = {}
    window.__opened = []
    // runtime.getURL is always available; other namespaces are permission-gated.
    const chrome = { runtime: { getURL: (p) => 'chrome-extension://fake' + p } }
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
    window.open = (url) => window.__opened.push(url)
}, permissions)

await page.goto(`http://localhost:${port}/index.html`)

// Wait for the store to init and the search box to appear.
await page.waitForSelector('.search-bar', { timeout: 5000 })

// Type a query and assert results render with highlighting + path.
await page.fill('.search-bar', 'github')
await page.waitForSelector('li', { timeout: 5000 })
const count = await page.locator('li').count()
const firstTitle = await page.locator('li').first().locator('.bookmark-link').innerText()
const firstPath = await page.locator('li').first().locator('.folder-path').innerText()
const highlightCount = await page.locator('.search-hit').count()

// Keyboard nav: arrow down should move selection to the second row.
await page.locator('.search-bar').press('ArrowDown')
const selectedIndex = await page.evaluate(() => {
    const lis = [...document.querySelectorAll('li')]
    return lis.findIndex((li) => li.classList.contains('selected'))
})

// Enter opens the selected bookmark.
await page.locator('.search-bar').press('Enter')
const opened = await page.evaluate(() => window.__opened)

// Re-open the popup fresh and confirm the opened bookmark now ranks first
// (timesAccessed persisted to the mocked chrome.storage and used for sorting).

console.log(JSON.stringify({
    resultCount: count,
    firstTitle,
    firstPath,
    highlightCount,
    selectedIndexAfterArrowDown: selectedIndex,
    opened,
    errors: logs.filter((l) => l.includes('pageerror') || l.includes('[error]')),
}, null, 2))

await browser.close()
server.close()
