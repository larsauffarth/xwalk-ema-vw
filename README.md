# VW Germany — AEM Edge Delivery Services Migration

Migration of [volkswagen.de/de](https://www.volkswagen.de/de.html) to Adobe Edge Delivery Services (EDS) with Universal Editor (xwalk) authoring support.

## Project Goal

Migrate the German Volkswagen consumer website from its current React SPA (powered by AEM SPA Editor) to AEM Edge Delivery Services. The migration covers 24 live pages across 7 templates, preserving the VW brand design system, navigation structure, and content fidelity.

### Environments

| Environment | URL |
|---|---|
| **Live preview** | https://main--xwalk-ema-vw--larsauffarth.aem.live/de |
| **AEM Author** | author-p171102-e1844649.adobeaemcloud.com |
| **Local dev** | http://localhost:3000 via `aem up --html-folder content` |

### Scope

| Template | Pages | Example URL |
|---|---|---|
| Homepage | 1 | `/de.html` |
| Emobility Hub | 9 | `/de/elektromobilitaet.html` |
| Emobility Detail | 7 | `/de/elektromobilitaet/laden/laden-unterwegs.html` |
| Emobility Tool | 4 | `/de/elektromobilitaet/e-tools-fuer-elektroautos/reichweitensimulator.html` |
| Model Overview | 1 | `/de/modelle.html` |
| Model Detail | 1 | `/de/modelle/id-7-gtx.html` |
| Dealer | 1 | `/de/haendler-werkstatt/volkswagen-automobile-hamburg-fruchtallee.html` |
| **Total** | **24** | |

---

## What Has Been Done

### Content Import Pipeline

A JSON-based content import pipeline extracts content from the AEM SPA Editor's `.model.json` API (not DOM scraping) and produces EDS-compatible `.plain.html` files.

**Key modules** (in `tools/importer/`):

| Module | Purpose |
|---|---|
| `json-importer.js` | Core engine: fetches `.model.json`, walks the component tree, produces HTML |
| `component-mappers.js` | Maps 16+ AEM component types to EDS block HTML with xwalk field hints |
| `richtext-converter.js` | Converts VW richtext arrays to HTML with xwalk-aware bold handling |
| `visibility-filter.js` | Filters empty/structural/invisible components (9 rules) |
| `scene7-resolver.js` | Resolves Scene7 image references to CDN URLs |
| `download-images.js` | Downloads Scene7 images locally with CDN auth bypass |
| `dealer-fetcher.js` | Fetches dealer data from 3 VW BFF APIs (import-time only) |
| `run-json-import.js` | CLI runner for batch import |

Additionally, 7 template-specific **Playwright-based import scripts** exist as a secondary import path (one per template, using parsers and transformers).

**Result:** 46 pages imported, 375+ media files downloaded to DAM.

### Block Library (15 blocks)

| Block | Type | Used On | Description |
|---|---|---|---|
| `hero-stage` | Custom | 34 pages | Full-width hero image + navy text bar with heading and CTAs |
| `carousel-featured` | Custom | 8 pages | Grid on desktop, horizontal scroll carousel on mobile |
| `columns-teaser` | Custom | 17 pages | Image+text side-by-side (focus teaser) or multi-column text cards |
| `embed-search` | Custom | 3 pages | Iframe embed for VW React tools; falls back to inline search form via fragment |
| `cards-model` | Custom | 0 pages | Model recommendation cards (available for authoring, not yet used in content) |
| `accordion` | Custom | — | Native `<details>`/`<summary>` with VW styling |
| `search-form` | Custom | — | Static visual recreation of VW quick search (non-functional) |
| `dealer-hours` | Custom | 1 page | Responsive opening hours table |
| `hero-dealer` | Custom | 1 page | Dealer hero with stage image + contact info panel |
| `header` | Auto-block | All pages | VW mega-menu with full-screen drawer flyout, 188+ nav links |
| `footer` | Auto-block | All pages | 3-column nav + legal links, loaded from fragment |
| `fragment` | Utility | Various | Loads and decorates content fragments inline |
| `cards` | Boilerplate | — | Generic card grid (kept for reference) |
| `columns` | Boilerplate | — | Generic multi-column layout (kept for reference) |
| `hero` | Boilerplate | — | Generic hero (kept for reference; VW uses hero-stage) |

### Design System

- **VW brand fonts:** `vw-head` (weights 200/400/700) and `vw-text` (weights 400/700)
- **CSS custom properties:** VW navy (`#001e50`), accent blue (`#0040c5`), 3-tier responsive spacing system
- **Fluid typography:** `clamp()` headings matching the original VW design
- **Section variants:** Light/grey/dark backgrounds with appropriate text color inversions

### Fragment Architecture

| Fragment | Path | Loaded By | Purpose |
|---|---|---|---|
| Navigation | `/content/nav/index.html` | `header.js` | Brand, menu groups, utility links |
| Footer | `/content/footer/index.html` | `footer.js` | Nav columns, legal links, copyright |
| Search | `/content/de/fragments/search` | `embed-search.js`, `search-form.js` | Shared search form UI |

### Universal Editor (xwalk) Support

- Component models defined in `component-models.json` (18 models)
- Component definitions in `component-definition.json` (3 groups, 17 block components)
- Content filter rules in `component-filters.json`
- xwalk field hints (`<!-- field:image -->`, `<!-- field:text -->`, etc.) embedded in imported content for inline editing

### Code Documentation

All **61 files** (43 JS + 18 CSS) have been annotated with:

- **File-level JSDoc blocks** explaining purpose, architecture, and design decisions
- **Inline comments** on all non-obvious logic
- **34 `OUT OF SCOPE` flags** across 16 files marking hardcoded values and migration shortcuts
- **5 `FRAGMENT PATTERN` annotations** documenting content fragment inclusion architecture
- **Section comments** in CSS files explaining layout strategy and responsive behavior

---

## Known Limitations & OUT OF SCOPE Items

The codebase contains 34 flagged items grouped into 8 categories. These are documented inline with `// OUT OF SCOPE:` comments and represent migration shortcuts that would need to be addressed for production:

| Category | Files Affected | Summary |
|---|---|---|
| **Hardcoded German strings** | 9 flags across 6 files | UI labels, aria text, skip links — need i18n via `placeholders.json` |
| **Hardcoded navigation data** | 5 flags in `header.js` | ~400 lines of nav hierarchy, promo cards, legal links — should be author-managed |
| **Hardcoded legal disclaimers** | 2 flags in `carousel-featured.js` | VW disclaimers matched by heading text — should be authored content |
| **Hardcoded static model data** | 2 flags in `cards-model.js` | Model names/prices as fallback — should come from API or CMS |
| **Hardcoded fragment paths** | 3 flags across 3 files | `/content/de/fragments/search` — should be configurable |
| **Hardcoded API credentials** | 4 flags in `dealer-fetcher.js` | BFF endpoint signature — import-time only, needs env vars |
| **Hardcoded CDN config** | 3 flags across 2 files | Scene7 URLs and auth params — import-time only |
| **Duplicated boilerplate** | 1 flag in import scripts | Shared functions duplicated across 7 scripts |

Additionally, `scripts.js` sets `lang="en"` instead of `lang="de"` (flagged as OUT OF SCOPE).

---

## Future Outlook

If this migration continues to production, the following work streams are identified (see `block-review-decisions.md` for detailed estimates and per-block breakdowns):

### New Blocks Required

15 additional blocks are needed for full coverage of all 24 pages:

| Block | Type | Purpose |
|---|---|---|
| `text-cards` | BLOCK | 3-column bordered text-only cards |
| `usp` | BLOCK | Asymmetric 1+2 grid layout for USP sections |
| `highlight-feature` | BLOCK | Product highlight with expandable features list |
| `gallery` | BLOCK | Masonry image grid with tab filtering and lightbox |
| `copy-media` | BLOCK | Text with inline media inset |
| `specs-bar` | BLOCK | Price + technical spec cards |
| `disclaimer` | BLOCK | Content-driven legal footnotes (replaces hardcoded disclaimers) |
| `sticky-cta-bar` | BLOCK | Persistent call-to-action bar |
| `secondary-nav` | AUTO-BLOCK | In-page section navigation |
| `announcement-banner` | BLOCK | Root-level announcement banner |
| `model-grid` | BYOM | JSON API-driven model card grid via App Builder |
| `dealer-info` | BYOM | Dealer header with map/contact from API |
| `dealer-staff` | BYOM | Staff contact cards from API |
| `dealer-page-assembly` | BYOM | API-driven dealer page builder |
| `marketing-code` | REACT-EMBED | Marketing code resolver app |

### Infrastructure Work

- **i18n:** Implement `placeholders.json` pattern for all hardcoded German strings
- **Navigation:** Externalize ~400 lines of hardcoded nav data to author-managed content
- **REACT-EMBED infrastructure:** postMessage API, dynamic iframe sizing, URL sync, loading states, error handling for ~10 VW React app targets
- **Existing block refinement:** Pixel-perfect polish for hero-stage, columns-teaser, carousel-featured, accordion, and cards-model

### Key Architectural Decisions Pending

1. **Search block:** Should `embed-search` become a true REACT-EMBED (iframe of VW React app) or a functional EDS block with API integration?
2. **Dealer pages:** BYOM blocks fetching from VW BFF APIs via App Builder actions, or a different approach?
3. **Disclaimers:** Content-authored per slide, shared disclaimer fragment, or dedicated disclaimer block?

---

## Development

### Prerequisites

- Node.js 18.3.x or newer
- AEM Cloud Service release 2024.8 or newer (>= `17465`)

### Installation

```sh
npm i
```

### Local Development

```sh
aem up --html-folder content
```

Opens the local preview at http://localhost:3000.

### Content Import

```sh
# Import all pages from a URL list
node tools/importer/run-json-import.js --urls tools/importer/urls-all.txt

# Download and localize images
node tools/importer/download-images.js
```

### Linting

```sh
npm run lint
```

---

## Repository Structure

```
/workspace
├── blocks/                  # 15 EDS blocks (JS + CSS + component model JSON)
│   ├── header/              # VW mega-menu with drawer navigation
│   ├── footer/              # 3-column footer loaded from fragment
│   ├── hero-stage/          # Full-width hero banner (used on 34 pages)
│   ├── carousel-featured/   # Grid/carousel hybrid
│   ├── columns-teaser/      # Focus teaser and text-only teaser variants
│   ├── embed-search/        # Iframe embed with fragment fallback
│   ├── cards-model/         # Model recommendation cards
│   ├── accordion/           # Native details/summary
│   ├── search-form/         # Static search UI (non-functional)
│   ├── dealer-hours/        # Opening hours table
│   ├── hero-dealer/         # Dealer page hero
│   ├── fragment/            # Standard fragment loader
│   ├── cards/               # Boilerplate (reference)
│   ├── columns/             # Boilerplate (reference)
│   └── hero/                # Boilerplate (reference)
├── content/                 # Imported HTML content + media files
│   ├── de/                  # German language content tree
│   ├── nav/                 # Navigation fragment
│   └── footer/              # Footer fragment
├── scripts/
│   ├── scripts.js           # Page lifecycle (eager/lazy/delayed phases)
│   ├── aem.js               # EDS core utilities (sections, blocks, RUM)
│   ├── editor-support.js    # Universal Editor live update handling
│   └── editor-support-rte.js # Rich text editor instrumentation
├── styles/
│   ├── styles.css           # VW design tokens + global styles
│   ├── fonts.css            # VW brand font-face declarations
│   └── lazy-styles.css      # Post-LCP styles (currently empty)
├── tools/importer/
│   ├── json-importer.js     # Core JSON-based import engine
│   ├── component-mappers.js # AEM component → EDS block mapping (16+ types)
│   ├── richtext-converter.js # VW richtext array → HTML converter
│   ├── visibility-filter.js # Component visibility rules (9 rules)
│   ├── scene7-resolver.js   # Scene7 CDN URL resolver
│   ├── download-images.js   # Image downloader + HTML rewriter
│   ├── dealer-fetcher.js    # VW dealer BFF API client
│   ├── run-json-import.js   # CLI runner
│   ├── parsers/             # Block-specific DOM parsers (5 parsers)
│   ├── transformers/        # Page transformers (cleanup, sections)
│   └── import-*.js          # 7 template-specific import scripts
├── component-models.json    # Universal Editor component models (18)
├── component-definition.json # Component definitions (17 blocks)
├── component-filters.json   # Containment rules
└── fonts/                   # VW brand font files (woff2)
```
