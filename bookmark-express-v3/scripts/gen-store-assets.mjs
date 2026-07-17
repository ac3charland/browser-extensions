// Regenerate the Chrome Web Store assets (store icon, promo tile, screenshots)
// from the brand art in store/src/ and the built extension in dist/.
//
// Prerequisites (dev-only, not part of the extension's deps):
//   npm run build
//   npm install --no-save sharp playwright
//   node scripts/gen-store-assets.mjs
//
// The headline is rendered in Gelasio (an open, metric-compatible twin of the
// brand's Georgia) so the output is identical on every platform. Install it
// first, e.g. drop Gelasio*.ttf into ~/.fonts and run `fc-cache`; without it the
// headline falls back to a generic serif. Get it from Google Fonts / the
// google/fonts repo (ofl/gelasio).
//
// Outputs into store/.
import { chromium } from 'playwright'
import sharp from 'sharp'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIST = join(ROOT, 'dist')
const STORE = join(ROOT, 'store')
const WORDMARK = join(STORE, 'src', 'wordmark.png')
const ICON = join(ROOT, 'public', 'images', 'icon128.png')

const NAVY = { r: 16, g: 22, b: 36 } // #101624, sampled from the brand art
const navyHex = '#101624'
const CREAM = '#f2efe6'
const MUTED = '#96a0b3'
// Brand serif for the big headline (matches the Bookmark Express wordmark). We
// pin Gelasio — a metric- and shape-compatible open twin of Georgia — rather
// than Georgia itself so the render is identical on every platform (Georgia
// isn't installed on Linux CI and isn't freely redistributable). The trailing
// serif is only a safety net if Gelasio somehow isn't installed.
const HEADER_FONT = "'Gelasio', 'Times New Roman', serif"
const BODY_FONT = "'DejaVu Sans', Arial, sans-serif"

// --- render the popup UI with a mock bookmark set -----------------------------
async function renderPopups() {
    const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' }
    const server = createServer(async (req, res) => {
        try {
            const p = req.url === '/' ? '/index.html' : req.url.split('?')[0]
            const body = await readFile(join(DIST, p))
            res.setHeader('content-type', MIME[extname(p)] ?? 'application/octet-stream')
            res.end(body)
        } catch { res.statusCode = 404; res.end('nf') }
    })
    await new Promise((r) => server.listen(0, r))
    const port = server.address().port

    const tree = [{ id: '0', title: '', children: [{ id: '1', title: 'Bookmarks Bar', children: [
        { id: 'dev', title: 'Dev', children: [
            { id: 'b1', title: 'GitHub', url: 'https://github.com' },
            { id: 'b2', title: 'GitHub · Pull Requests', url: 'https://github.com/pulls' },
            { id: 'b3', title: 'GitLab — Dashboard', url: 'https://gitlab.com/dashboard' },
        ]},
        { id: 'ref', title: 'Reference', children: [
            { id: 'b4', title: 'Git Documentation', url: 'https://git-scm.com/doc' },
        ]},
    ]}]}]
    const counts = { b1: 42, b2: 7, b3: 3, b4: 12 }
    const favColors = { 'github.com': '#1f2328', 'gitlab.com': '#e24329', 'git-scm.com': '#f05133' }
    const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return '' } }
    const faviconPng = (color) => sharp(Buffer.from(`<svg width="32" height="32"><rect width="32" height="32" rx="7" fill="${color}"/></svg>`)).png().toBuffer()

    const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' })

    // Render the modern popup in a given theme with an optional query, returning a
    // tight PNG of just the popup. The results shot uses the light scheme (crisp on
    // the navy backdrop); the launch shot uses dark, so the pair also shows off the
    // new light/dark theming.
    async function shot({ theme, query }) {
        const page = await browser.newPage({ viewport: { width: 820, height: 700 }, deviceScaleFactor: 2 })
        await page.route('**/_favicon/**', async (route) => {
            const pageUrl = new URL(route.request().url()).searchParams.get('pageUrl') || ''
            await route.fulfill({ contentType: 'image/png', body: await faviconPng(favColors[domainOf(pageUrl)] || '#8a93a3') })
        })
        await page.addInitScript(({ tree, counts, theme }) => {
            const store = { bookmarkData: null, hash: null, settings: { theme } }
            window.chrome = {
                runtime: { getURL: (p) => location.origin + p },
                storage: { local: {
                    get: async (k) => { const o = {}; for (const key of [].concat(k)) if (store[key] != null) o[key] = store[key]; return o },
                    set: async (o) => Object.assign(store, o),
                }, onChanged: { addListener() {} } },
                tabs: { create() {}, update() {} },
                bookmarks: {
                    getTree: async () => tree,
                    search: async (q) => { const flat = []; const walk = (n) => { if (n.url) flat.push(n); (n.children || []).forEach(walk) }; tree.forEach(walk); return flat.filter((b) => (b.title + ' ' + b.url).toLowerCase().includes(q.toLowerCase())) },
                },
            }
            window.__counts = counts
            window.open = () => {}
        }, { tree, counts, theme })

        await page.goto(`http://localhost:${port}/index.html`)
        await page.waitForSelector('.search-bar')
        await page.evaluate(async () => {
            const cur = await chrome.storage.local.get('bookmarkData')
            const data = cur.bookmarkData || {}
            for (const [id, n] of Object.entries(window.__counts)) if (data[id]) data[id].timesAccessed = n
            await chrome.storage.local.set({ bookmarkData: data })
        })

        await page.fill('.search-bar', query)
        if (query) await page.waitForSelector('.row')
        await page.waitForTimeout(200)
        const box = await page.evaluate(() => ({ width: Math.ceil(document.body.getBoundingClientRect().width), height: Math.ceil(document.body.scrollHeight) }))
        const buf = await page.screenshot({ clip: { x: 0, y: 0, width: box.width, height: box.height } })
        await page.close()
        return buf
    }

    const results = await shot({ theme: 'light', query: 'git' })
    const empty = await shot({ theme: 'dark', query: '' })

    await browser.close()
    server.close()
    return { results, empty }
}

// --- compositing helpers ------------------------------------------------------
async function roundedCard(src, targetW, radius) {
    const card = await sharp(src).resize({ width: targetW }).toBuffer()
    const { height } = await sharp(card).metadata()
    const mask = Buffer.from(`<svg width="${targetW}" height="${height}"><rect width="${targetW}" height="${height}" rx="${radius}" ry="${radius}" fill="#fff"/></svg>`)
    return { buf: await sharp(card).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer(), w: targetW, h: height }
}
const softShadow = (w, h, radius, pad, alpha) =>
    sharp(Buffer.from(`<svg width="${w + pad * 2}" height="${h + pad * 2}"><rect x="${pad}" y="${pad}" width="${w}" height="${h}" rx="${radius}" fill="rgba(0,0,0,${alpha})"/></svg>`)).blur(22).png().toBuffer()
const baseCanvas = (w, h) => sharp(Buffer.from(`<svg width="${w}" height="${h}"><defs><radialGradient id="g" cx="50%" cy="30%" r="70%"><stop offset="0%" stop-color="#1c2740"/><stop offset="100%" stop-color="${navyHex}"/></radialGradient></defs><rect width="${w}" height="${h}" fill="url(#g)"/></svg>`)).png()

async function storeIcon() {
    const art = await sharp(ICON).resize(96, 96).toBuffer()
    await sharp({ create: { width: 128, height: 128, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
        .composite([{ input: art, left: 16, top: 16 }]).png().toFile(join(STORE, 'store-icon-128.png'))
}

async function promoTile() {
    const { data, info } = await sharp(WORDMARK).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const { width, height, channels } = info
    let minX = width, minY = height, maxX = -1, maxY = -1
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const i = (y * width + x) * channels
        if (data[i] > 200 && data[i + 1] > 200 && data[i + 2] > 190) { if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y }
    }
    const mw = maxX - minX + 1, mh = maxY - minY + 1
    const rgba = Buffer.alloc(mw * mh * 4)
    for (let y = 0; y < mh; y++) for (let x = 0; x < mw; x++) {
        const si = ((minY + y) * width + (minX + x)) * channels
        const lum = 0.2126 * data[si] + 0.7152 * data[si + 1] + 0.0722 * data[si + 2]
        let a = (lum - 70) * 2.2; a = a < 0 ? 0 : a > 255 ? 255 : a
        const di = (y * mw + x) * 4
        rgba[di] = 242; rgba[di + 1] = 239; rgba[di + 2] = 230; rgba[di + 3] = Math.round(a)
    }
    const mark = await sharp(rgba, { raw: { width: mw, height: mh, channels: 4 } }).png().toBuffer()
    const W = 440, H = 280
    const scaled = await sharp(mark).resize(Math.round(W * 0.62), Math.round(H * 0.62), { fit: 'inside' }).toBuffer()
    const sm = await sharp(scaled).metadata()
    await baseCanvas(W, H).composite([{ input: scaled, left: Math.round((W - sm.width) / 2), top: Math.round((H - sm.height) / 2) }]).png().toFile(join(STORE, 'promo-tile-440x280.png'))
}

// Fit the popup card into the vertical band below the header text, scaling it
// down (never up) if the modern popup is taller than the band, then centering it.
async function fitCard(src, maxW, radius, bandTop, bandBottom) {
    let card = await roundedCard(src, maxW, radius)
    const maxH = bandBottom - bandTop
    if (card.h > maxH) card = await roundedCard(src, Math.round(maxW * (maxH / card.h)), radius)
    const cardY = Math.round(bandTop + (maxH - card.h) / 2)
    return { ...card, cardY }
}

async function screenshotResults(results) {
    const W = 1280, H = 800
    const card = await fitCard(results, 1000, 22, 250, 760)
    const cardX = Math.round((W - card.w) / 2), cardY = card.cardY
    const shadow = await softShadow(card.w, card.h, 26, 44, 0.5)
    const text = Buffer.from(`<svg width="${W}" height="${H}"><text x="${W / 2}" y="150" text-anchor="middle" font-family="${HEADER_FONT}" font-weight="bold" font-size="52" fill="${CREAM}">Find any bookmark in a keystroke</text><text x="${W / 2}" y="205" text-anchor="middle" font-family="${BODY_FONT}" font-size="26" fill="${MUTED}">Open the popup and just start typing — results filter instantly.</text></svg>`)
    await baseCanvas(W, H).composite([
        { input: shadow, left: cardX - 44, top: cardY - 44 + 14 },
        { input: card.buf, left: cardX, top: cardY },
        { input: text, left: 0, top: 0 },
    ]).png().toFile(join(STORE, 'screenshot-1-results.png'))
}

async function screenshotLaunch(empty) {
    const W = 1280, H = 800
    const card = await roundedCard(empty, 1000, 18)
    const cardX = Math.round((W - card.w) / 2), cardY = 300
    const shadow = await softShadow(card.w, card.h, 20, 44, 0.5)
    const caps = ['Ctrl', 'Shift', 'K']
    const capW = 150, capH = 96, gap = 70
    const totalW = caps.length * capW + (caps.length - 1) * gap
    let cx = Math.round((W - totalW) / 2)
    // Sit the keyboard caps a comfortable gap below the (short) popup card.
    const capY = cardY + card.h + 60
    let capsSvg = ''
    caps.forEach((label, i) => {
        capsSvg += `<rect x="${cx}" y="${capY}" width="${capW}" height="${capH}" rx="16" fill="#1b2740" stroke="#33405c" stroke-width="2"/><text x="${cx + capW / 2}" y="${capY + capH / 2 + 12}" text-anchor="middle" font-family="'DejaVu Sans', Arial, sans-serif" font-weight="bold" font-size="34" fill="${CREAM}">${label}</text>`
        if (i < caps.length - 1) capsSvg += `<text x="${cx + capW + gap / 2}" y="${capY + capH / 2 + 14}" text-anchor="middle" font-family="'DejaVu Sans', Arial, sans-serif" font-size="40" fill="${MUTED}">+</text>`
        cx += capW + gap
    })
    const text = Buffer.from(`<svg width="${W}" height="${H}"><text x="${W / 2}" y="150" text-anchor="middle" font-family="${HEADER_FONT}" font-weight="bold" font-size="52" fill="${CREAM}">Launch from anywhere</text><text x="${W / 2}" y="205" text-anchor="middle" font-family="${BODY_FONT}" font-size="26" fill="${MUTED}">Press the shortcut, then type. No mouse required.</text>${capsSvg}</svg>`)
    await baseCanvas(W, H).composite([
        { input: shadow, left: cardX - 44, top: cardY - 44 + 14 },
        { input: card.buf, left: cardX, top: cardY },
        { input: text, left: 0, top: 0 },
    ]).png().toFile(join(STORE, 'screenshot-2-launch.png'))
}

const { results, empty } = await renderPopups()
await storeIcon()
await promoTile()
await screenshotResults(results)
await screenshotLaunch(empty)
console.log('Store assets written to store/')
