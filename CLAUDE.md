# CLAUDE.md

## Agent Policy

All tasks that can be delegated to subagents (implementation, research, code exploration, testing, review, etc.) MUST be executed by a subagent using the `sonnet` model. Always set `model: "sonnet"` when spawning agents via the Agent tool.

## Project Overview

This is an AEM Edge Delivery Services (xwalk) project migrating **volkswagen.de/de** to EDS. The source site is a React SPA powered by AEM; content is extracted via the `.model.json` API (not DOM scraping).

- **Repo:** `larsauffarth/xwalk-ema-vw`
- **Live preview:** `https://main--xwalk-ema-vw--larsauffarth.aem.live/de`
- **AEM author:** `author-p171102-e1844649.adobeaemcloud.com`
- **AEM site path:** `/content/xwalk-ema-vw`
- **DAM path:** `/content/dam/xwalk-ema-vw`
- **Local dev:** `http://localhost:3000` via `aem up --html-folder content`

## Content Import Pipeline (JSON-based)

Content is imported from `https://www.volkswagen.de/<path>.model.json` — the AEM SPA Editor content API. This replaces the earlier DOM-scraping approach via Playwright.

### Key importer modules (`tools/importer/`)
- `json-importer.js` — Core: fetches `.model.json`, walks component tree, produces `.plain.html`
- `component-mappers.js` — Maps AEM `:type` to EDS block HTML with xwalk field hints
- `richtext-converter.js` — Converts VW richtext arrays to HTML. Has `stripBold` option for default content headings (xwalk escapes `<strong>` in default content)
- `visibility-filter.js` — Filters empty/structural/invisible components (checks `empty`, `emptyMedia`, `numberOfValidElements`)
- `scene7-resolver.js` — Resolves Scene7 file refs to `assets.volkswagen.com` CDN URLs
- `download-images.js` — Downloads Scene7 images (requires base64 param suffix `Zml0PWNyb3AsMSZmbXQ9cG5nJndpZD04MDAmYWxpZ249MC4wMCwwLjAwJmJmYz1vZmYmYzRiMA==` to avoid 403)
- `run-json-import.js` — CLI runner: `node tools/importer/run-json-import.js --urls <file>`

### AEM Component → EDS Block Mapping
| AEM Component `:type` | EDS Block | Notes |
|---|---|---|
| `basicStageSection` | `hero-stage` | Image + heading (font-weight 200, `<b>` for bold parts) + primary/secondary CTA |
| `uspSection` | `carousel-featured` | 3 items via flat naming: super*/left*/right* |
| `expandCollapseSection` | `carousel-featured` | N items as expandCollapseItem children |
| `focusTeaserSection` | `columns-teaser` | Image side + text side, `hasImageRight` flag |
| `textOnlyTeaserSection` | `columns-teaser` | Text-only items via xfTextOnlyTeaser children |
| `featureAppSection` (MOFA) | Default content | "Beliebte Modelle" heading + link (MOFA is runtime JS, no editorial content) |
| `featureAppSection` (schnellsuche) | `embed-search` | Car finder with `/de/modelle/verfuegbare-fahrzeuge.html` link |
| `singleColumnSection` / `headingSection` | Default content | Heading + richtext + links |

### Important xwalk Behaviors
- **Default content headings must NOT contain `<b>`/`<strong>` tags** — xwalk escapes inline HTML in default content. Bold styling comes from CSS `font-weight: 700` on headings.
- **Block richtext fields CAN contain `<b>` tags** — these are inside `<!-- field:text -->` hints and render correctly.
- **Images reference AEM DAM paths:** `src="/content/dam/xwalk-ema-vw/media_<hash>.png"`
- **Section metadata** for dark sections: `<div class="section-metadata"><div><div>style</div><div>dark</div></div></div>`

## Scope: 46 Pages Across 7 Templates

| Template | Pages | URL Pattern |
|---|---|---|
| homepage | 1 | `/de.html` |
| emobility-hub | 9 | `/de/elektromobilitaet.html`, `/de/elektromobilitaet/<topic>.html` |
| emobility-detail | 29 | `/de/elektromobilitaet/<topic>/<subtopic>.html` |
| emobility-tool | 4 | `/de/elektromobilitaet/e-tools-fuer-elektroautos/<tool>.html` |
| model-overview | 1 | `/de/modelle.html` |
| model-detail | 1 | `/de/modelle/id-7-gtx.html` |
| dealer | 1 | `/de/haendler-werkstatt/volkswagen-automobile-hamburg-fruchtallee.html` |

All 46 pages are imported with 97 images in DAM.

## Block Inventory

### Custom VW Blocks (in `blocks/`)
| Block | Files | Used On | Desktop Layout |
|---|---|---|---|
| `hero-stage` | JS, CSS, `_hero-stage.json` | 34 pages | Full-width image + text bar below (heading left, CTAs right) |
| `carousel-featured` | JS, CSS, `_carousel-featured.json` | 8 pages | **Grid on desktop (≥960px)**, carousel on mobile |
| `columns-teaser` | JS, CSS, `_columns-teaser.json` | 17 pages | Image/text 58/42 split (focus teaser) or equal columns (text-only) |
| `cards-model` | JS, CSS, `_cards-model.json` | 0 pages | Grid of cards (available for authoring, not used in import) |
| `embed-search` | JS, CSS, `_embed-search.json` | 3 pages | Iframe embed with self-iframe guard (`href="#"` is blocked) |

### Boilerplate Blocks (kept from original)
- `hero`, `cards`, `columns` — Original boilerplate, kept for reference
- `header` — Custom VW header with drawer nav, utility icons, transparent/solid states
- `footer` — VW footer with 3-column links + legal links
- `fragment` — Standard fragment loader

## Design System

### VW Brand Fonts (licensed, in `fonts/`)
- `vw-head` — weights 200 (light), 400 (regular), 700 (bold)
- `vw-text` — weights 400 (regular), 700 (bold)
- Downloaded from `volkswagen.de/etc.clientlibs/.../fonts/vw*.woff2`

### CSS Custom Properties (in `styles/styles.css`)
- `--dark-color: #001e50` (VW navy)
- `--accent-primary: #0040c5`
- `--accent-secondary: #00b0f0`
- `--text-color: #000e26`
- `--text-secondary: #6a767d`
- `--border-color: #dfe4e8`
- `--body-font-family: vw-text, helvetica, arial, sans-serif`
- `--heading-font-family: vw-head, helvetica, arial, sans-serif`

### VW Logo
- SVG roundel at `icons/vw-logo.svg` (24x24, `fill="currentColor"`)

## Header Architecture

Custom VW header (`blocks/header/`) with:
- Skip links ("Zum Hauptinhalt springen", "Zum Footer springen")
- VW logo + "Menü" trigger + quick links (Modelle, Konfigurieren, Direkt verfügbare Fahrzeuge)
- 3 utility icons: Händler wählen, Search, Account
- Full-screen drawer menu with 6 nav groups (accordion)
- Transparent → solid scroll transition via IntersectionObserver on hero
- Nav content at `content/nav/index.html` (3 sections: brand+quicklinks, menu groups, utilities)

## Known Issues & Decisions

- **`cards-model` is unused** (0 pages) — kept for future Universal Editor authoring
- **MOFA "Beliebte Modelle"** — rendered as static heading + link (dynamic feature app content not available in JSON)
- **Scene7 image download** requires specific base64 query param to bypass CDM 403
- **Quick Search section** has `style: dark` section metadata for navy background
- **Content upload** to AEM is done via the agent UI (not automated from this workspace)

## Git Authentication

Push to GitHub requires a fresh PAT with Contents: Read and write permission:
```bash
export HOME=/home/node
git remote set-url origin https://x-access-token:<PAT>@github.com/larsauffarth/xwalk-ema-vw.git
git push origin main
git remote set-url origin https://github.com/larsauffarth/xwalk-ema-vw.git
```
