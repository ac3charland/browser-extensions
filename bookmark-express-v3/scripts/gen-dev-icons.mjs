// Regenerate the amber "dev" toolbar icons in dev-icons/ from the prod icons in
// public/images/. Run this only if the prod icon art changes.
//
// Prerequisites (dev-only, not part of the extension's deps — same as
// gen-store-assets.mjs):
//   npm install --no-save sharp
//   node scripts/gen-dev-icons.mjs
//
// The prod icon is a navy (#101624) rounded square with a cream (#e9edf2)
// wordmark. We recolor per pixel by luminance: dark navy pixels map to the dev
// amber, light wordmark pixels stay cream, and anti-aliased edges interpolate
// between the two so the recolor is smooth. Alpha (the rounded corners) is
// preserved untouched.
import sharp from 'sharp'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SRC = join(ROOT, 'public', 'images')
const OUT = join(ROOT, 'dev-icons')

const DEV = [176, 84, 20] // amber — distinct from the prod navy at a glance
const LETTER = [233, 237, 242] // cream wordmark, sampled from the prod icon
const SIZES = [16, 48, 128]

for (const size of SIZES) {
    const src = join(SRC, `icon${size}.png`)
    const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
    const out = Buffer.alloc(data.length)
    for (let i = 0; i < data.length; i += 4) {
        const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
        const t = Math.min(1, Math.max(0, (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255))
        out[i] = Math.round(DEV[0] * (1 - t) + LETTER[0] * t)
        out[i + 1] = Math.round(DEV[1] * (1 - t) + LETTER[1] * t)
        out[i + 2] = Math.round(DEV[2] * (1 - t) + LETTER[2] * t)
        out[i + 3] = a
    }
    const dst = join(OUT, `icon${size}.png`)
    await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toFile(dst)
    console.log(`wrote ${dst}`)
}
