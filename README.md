# zab-cv

Nektarios Zabouris's CV, live at <https://geofeid.github.io/zab-cv/>. One content source (`content.env`) builds the online page, a one-page A4 sheet, and the downloadable PDF.

Forked from [Online_CV](https://github.com/geofeid/Online_CV); the pipeline is the same.

## Build

Needs Node 22 or newer.

```bash
npm ci             # once
npm run build      # dist/index.html + dist/print.html
npm run build:pdf  # same + the PDF (needs Chrome, Chromium or Edge; set CHROME_PATH if it isn't found)
```

The build creates:

- `dist/index.html` from `content.env`: the online CV.
- `dist/print.html` from `content.env` plus `content.print.env` overrides: the one-page A4 sheet, source of the PDF.
- `dist/<CV_FILENAME>` (with `--pdf`): the sheet printed by headless Chrome, so the Download CV link never goes stale.
- `src/html/preview.html` for live-reload preview.

## Content

- `content.env`: a value for every `{{KEY}}` in `src/html/index.html`. A placeholder left unresolved fails the build.
- `content.print.env`: print-only overrides, merged on top of `content.env` for the sheet. If a change shows online but not in the PDF, or the reverse, this file is why.
- `content.limits.env`: character caps, checked against both the online and the print values (visible characters; HTML tags don't count). `DEFAULT_MAX` applies to every key without its own limit. A generic numbered limit covers every number: `EXP_DESC1` applies to `EXP1_DESC1`, `EXP2_DESC1`, and so on; `CERT_` and `PROJ_` keys work the same way (`PROJ_DESC` caps `PROJ3_DESC`). A specific key always wins.

Experience items are generated from `EXP{n}_...` keys, highest number first. Keep older jobs on lower numbers and add a new job as the next number; it renders at the top.

## One A4 page, enforced

The sheet must be exactly one A4 page. `npm run build:pdf` counts the pages of the PDF it just printed and fails with `<CV_FILENAME> has 2 pages; the A4 sheet must be exactly 1` when content outgrows the sheet. The PDF stays in `dist/` so you can see what spilled. The character caps catch most overflow early; the page count is the final word. Trim content (usually in `content.print.env`) rather than shrinking the layout. [Background](https://github.com/geofeid/Online_CV/blob/main/HANDOFF.md#the-printed-cv-holds-exactly-one-a4-page).

## Fonts are self-hosted

Poppins and Font Awesome ship in `src/fonts/` and are copied next to the pages; the build fetches nothing from the network. The headless Chrome that prints the PDF has no network, so a CDN font would fall back to another face locally but load in CI, and a sheet that is one page on your machine would come back as two from the workflow. [Full story](https://github.com/geofeid/Online_CV/blob/main/HANDOFF.md#fonts-are-self-hosted-and-that-is-deliberate).

## Preview while editing

```bash
npm run watch                         # rebuilds on every save
npm run serve                         # http://localhost:5500 (dist/)
node scripts/serve.mjs src/html 5501  # http://localhost:5501/preview.html, reloads itself after each rebuild
```

## Test

```bash
npm test
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`: tests, then build + PDF, then GitHub Pages. `dist/` is never committed; CI builds it. Enable Pages once in the repo settings, with Source set to "GitHub Actions".
