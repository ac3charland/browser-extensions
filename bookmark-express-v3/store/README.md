# Store submission assets

Everything needed for the Chrome Web Store listing. The images are generated
from the brand art by `../scripts/gen-store-assets.mjs`; the copy lives in
`listing.md` and the hostable policy in `privacy-policy.md`.

## Asset → dashboard field

| File | Size | Dashboard field | Required |
|---|---|---|---|
| `store-icon-128.png` | 128×128 (96 art + 16 padding) | Store icon | ✅ |
| `screenshot-1-results.png` | 1280×800 | Screenshot | ✅ (≥1) |
| `screenshot-2-launch.png` | 1280×800 | Screenshot | optional |
| `promo-tile-440x280.png` | 440×280 | Small promo tile | ✅ |
| `listing.md` | — | Description, category, permission justifications, single purpose | ✅ |
| `privacy-policy.md` | — | Host it; paste the URL under Privacy | recommended |

> Note: `store-icon-128.png` (with transparent padding) is the **listing** icon.
> The icons **inside** the packaged extension are the full-bleed
> `public/images/icon{16,48,128}.png` — those are separate and already set.

## Submission checklist

1. `npm run zip` in the project root → `bookmark-express-v3.zip`.
2. Dashboard → **Add new item** → upload the zip.
3. **Store listing** tab: paste from `listing.md`, upload the icon, both
   screenshots, and the promo tile.
4. **Privacy** tab: single purpose, the three permission justifications,
   "no remote code", certify no data collection, paste the privacy-policy URL.
5. **Distribution** tab: visibility + regions.
6. **Submit for review.**
