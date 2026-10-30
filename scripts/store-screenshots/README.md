# Store screenshot generator

Builds localized App Store screenshots from the English originals in
`store/apple/screenshot/en-US/`. It keeps every original pixel and only replaces
the text: it detects each English text block, paints over it, and re-sets the
translated copy in Work Sans at the same size, position, colour and hard shadow.
Output goes to `store/apple/screenshot/<locale>/<device>/NN-name.png` (opaque RGB PNG).

## Usage

```bash
cd scripts/store-screenshots
npm install                       # playwright-core, @fontsource/work-sans, pngjs
npx playwright-core install chromium   # skip if a browser is already installed
node render.js                    # all locales
node render.js --locale=pl        # one locale
node render.js --validate         # re-render en-US into a temp dir to compare with the originals
node render.js --debug            # outline detected text boxes in red
```

Set `CHROMIUM_PATH` to use a specific Chromium binary instead of Playwright's.
From the repo root: `npm run store:screenshots`.

## Changing copy or locales

- **Copy**: edit `COPY` in `spec.js`. Each locale has six entries (one per screenshot):
  `t` headline lines, `s` subtitle, `e` in-card labels. The number of headline lines
  must match the English layout (3/3/2/2/3/3 on iPhone, 2/3/2/2/3/3 on iPad) because
  the header band height is baked into the original image. The script throws on a mismatch.
- **Fit**: text that is too wide is shrunk to fit; the run log shows `(x0.94)` where that happened.
  Prefer shorter copy over heavy shrinking.
- **New locale**: add it to `COPY`, run the script, then add the paths to that locale's
  `screenshots` block in `store.config.json`.
- **New or replaced originals**: update `FILES` and the detection rects in `LAYOUT`
  (`spec.js`). Rects only tell the detector where to look; exact boxes are measured from the image.
- Fonts: `fonts.css` loads latin + latin-ext, which covers de, pl, fr, es and tr.

## New-quiz screenshots (`new-quizzes.js`)

Screens 07-09 (plural endings, verb prepositions, Präteritum) have no English original to
re-letter, so `new-quizzes.js` lays them out in HTML (same neo-brutalist style, Work Sans) and
renders every locale at both device sizes (iPhone 1242x2688, iPad 2064x2752) with Playwright.

```bash
node new-quizzes.js                 # all locales (en-US, de-DE, pl, fr-FR, es-ES, tr)
node new-quizzes.js --locale=pl     # one locale
```

Edit `COPY` at the top of the script for headlines, subtitles and the in-mock UI strings (they
mirror `locales/*.json`; de/es have no app locale so they are written there). Headlines that are
too wide shrink automatically. Add a new locale to `COPY`, run it, then add the paths to
`store.config.json`. Use `CHROMIUM_PATH` if Playwright's own browser is not installed.
