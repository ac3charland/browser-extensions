// Test the "dev build" variant (BMX-11): a developer must be able to run the
// prod (Web Store) build and a dev build of Bookmark Express side by side
// without them colliding. This pins the three ways a dev build differs from
// prod — name, popup shortcut, and icon — against the real prod manifest and
// the committed dev icons. Pure Node, no build or browser needed. Exits
// non-zero if any assertion fails.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
    deriveDevManifest,
    DEV_NAME_SUFFIX,
    DEV_SHORTCUT_KEY,
    DEV_ICON_SIZES,
    DEV_OUT_DIR,
} from './scripts/dev-build.mjs'

const ROOT = fileURLToPath(new URL('.', import.meta.url))
const prod = JSON.parse(readFileSync(join(ROOT, 'public', 'manifest.json'), 'utf8'))
const dev = deriveDevManifest(prod)

const failures = []
function check(cond, msg) {
    if (!cond) failures.push(msg)
}

// --- Name: dev is clearly labeled and distinct from prod ----------------------
check(dev.name === `${prod.name}${DEV_NAME_SUFFIX}`, `dev name should be "${prod.name}${DEV_NAME_SUFFIX}", got "${dev.name}"`)
check(dev.name !== prod.name, 'dev and prod must have different names so both are identifiable in Chrome')

// --- Shortcut: dev moves off the prod hotkey so both can bind at once ---------
const prodKeys = prod.commands._execute_action.suggested_key
const devKeys = dev.commands._execute_action.suggested_key
for (const platform of Object.keys(prodKeys)) {
    const prodKey = prodKeys[platform]
    const devKey = devKeys[platform]
    check(devKey !== prodKey, `dev shortcut (${platform}) must differ from prod's "${prodKey}"`)
    // Only the final key changes; the platform's modifier prefix is preserved.
    check(
        devKey === prodKey.replace(/\+[^+]+$/, `+${DEV_SHORTCUT_KEY}`),
        `dev shortcut (${platform}) should be "${prodKey.replace(/\+[^+]+$/, `+${DEV_SHORTCUT_KEY}`)}", got "${devKey}"`,
    )
    check(
        devKey.slice(0, devKey.lastIndexOf('+')) === prodKey.slice(0, prodKey.lastIndexOf('+')),
        `dev shortcut (${platform}) should keep prod's modifier prefix, got "${devKey}"`,
    )
}
// Concretely: prod's K becomes L on every platform (Command/Ctrl/MacCtrl kept).
check(DEV_SHORTCUT_KEY === 'L', `dev shortcut key should be "L", got "${DEV_SHORTCUT_KEY}"`)
check(devKeys.windows === 'Ctrl+Shift+L', `dev windows shortcut should be "Ctrl+Shift+L", got "${devKeys.windows}"`)
check(devKeys.mac === 'MacCtrl+Shift+L', `dev mac shortcut should be "MacCtrl+Shift+L", got "${devKeys.mac}"`)

// --- Output dir: dev builds land somewhere other than the prod dist/ ----------
check(DEV_OUT_DIR && DEV_OUT_DIR !== 'dist', `dev build must use its own output dir, got "${DEV_OUT_DIR}"`)

// --- Purity: the transform must not mutate the prod manifest ------------------
check(prod.name === 'Bookmark Express', `deriveDevManifest mutated the prod name, now "${prod.name}"`)
check(prodKeys.windows === 'Ctrl+Shift+K', `deriveDevManifest mutated the prod shortcut, now "${prodKeys.windows}"`)

// --- Icons: manifest paths are unchanged (the files are swapped, not the paths) ---
check(
    JSON.stringify(dev.icons) === JSON.stringify(prod.icons),
    'dev manifest icon paths should match prod (dev build swaps the image files, not the paths)',
)

// --- Icons: an amber dev icon exists for every size and differs from prod -----
for (const size of DEV_ICON_SIZES) {
    let devPng, prodPng
    try {
        devPng = readFileSync(join(ROOT, 'dev-icons', `icon${size}.png`))
    } catch {
        check(false, `missing dev icon dev-icons/icon${size}.png`)
        continue
    }
    prodPng = readFileSync(join(ROOT, 'public', 'images', `icon${size}.png`))
    check(devPng.length > 0, `dev icon icon${size}.png is empty`)
    check(!devPng.equals(prodPng), `dev icon${size}.png should be recolored, but it is byte-identical to prod`)
}

// Every manifest icon size must have a matching committed dev icon.
for (const size of Object.keys(prod.icons)) {
    check(DEV_ICON_SIZES.includes(Number(size)), `manifest declares icon size ${size} with no dev variant in DEV_ICON_SIZES`)
}

if (failures.length > 0) {
    console.error('FAIL:\n' + failures.map((f) => '  - ' + f).join('\n'))
    process.exit(1)
}
console.log('PASS: all verify-dev-build.mjs checks passed')
