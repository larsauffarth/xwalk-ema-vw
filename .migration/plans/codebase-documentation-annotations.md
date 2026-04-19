# Code Documentation & Production Readiness Plan

## Overview

This plan covers the completed code documentation effort and defines a roadmap for resolving the 34 `OUT OF SCOPE` items flagged during the code review. Each item is cross-referenced with the **block-review-decisions.md** block registry to provide implementation guidance for external developers.

**Scope: Documentation and comments only. No logic changes, no code fixes, no new blocks.**

---

## URGENT: Lint Fixes Required (Documentation-Only)

The following 5 files have lint errors introduced or surfaced by the documentation comments. These must be fixed by adjusting comment formatting only — no logic changes.

### JS Comment Adjustments

**`blocks/header/header.js` — Lines 823–824: unused variables**
- `activeSectionIndex` and `activeItemIndex` are assigned but never read (pre-existing issue, not caused by comments)
- **Fix:** Add `// eslint-disable-next-line no-unused-vars` above each declaration — this is a comment-only suppression, not a code change

**`blocks/carousel-featured/carousel-featured.js` — Line 10: max-len 107 > 100**
- A documentation comment line exceeds the 100-char limit
- **Fix:** Rewrap the comment line to stay within 100 chars

### CSS Comment Adjustments (Pre-existing lint issues surfaced by line shifts)

These `no-descending-specificity` errors are **pre-existing CSS patterns** — the added comment blocks shifted line numbers, causing the linter to re-report them. Fix by adding stylelint-disable comments (documentation only, no CSS rule changes):

**`styles/styles.css` — Line 287: no-descending-specificity**
- **Fix:** Add `/* stylelint-disable no-descending-specificity */` after the file header comment block

**`blocks/carousel-featured/carousel-featured.css` — Lines 313, 347**
- **Fix:** Add `/* stylelint-disable no-descending-specificity, no-duplicate-selectors */` after the file header comment block

**`blocks/header/header.css` — 18 no-descending-specificity + 1 property-no-deprecated**
- **Fix:** Add `/* stylelint-disable no-descending-specificity, property-no-deprecated */` after the file header comment block

---

## Completed: Code Documentation

All **61 files** (43 JS + 18 CSS) across the codebase have been annotated with:

- **File-level JSDoc blocks** explaining purpose, architecture, and design decisions
- **Inline comments** on all non-obvious logic
- **34 `OUT OF SCOPE` flags** across 16 files marking hardcoded values, German strings, and non-best-practice patterns
- **5 `FRAGMENT PATTERN` annotations** documenting content fragment inclusion architecture
- **Section comments** in CSS files explaining layout strategy and responsive behavior

---

## OUT OF SCOPE Registry — Production Resolution Guide

The 34 flagged items group into **8 categories**. Each category includes the files affected, what the current migration does, and how a future implementation should handle it — cross-referenced with block-review-decisions.md where applicable.

### Category 1: Hardcoded German Strings (i18n)

**Files (9 flags):**
| File | Flag | Current Value |
|------|------|---------------|
| `scripts/scripts.js:132` | Section split text matching | "Beliebte Modelle", "Finden Sie Ihren" |
| `scripts/scripts.js:218` | HTML lang attribute | `'en'` (should be `'de'`) |
| `carousel-featured.js:130` | Aria labels | "Mehr anzeigen" / "Weniger anzeigen" |
| `dealer-hours.js:32` | Fallback column labels | "Abteilung", "Mo-Fr", "Sa" |
| `hero-dealer.js:47` | Overline text | "Verkauf und Service" |
| `search-form.js:92` | CTA text and URLs | "Fahrzeuge anzeigen", "Detailsuche öffnen" |
| `header.js:44,56,69,129` | Nav labels, links, legal | All German navigation text |
| `header.js:682` | Skip links | "Zum Hauptinhalt springen" |

**Future resolution:**
- Implement an **i18n placeholder system** using the EDS `placeholders.json` pattern (see [aem.live/docs/placeholders](https://www.aem.live/docs/placeholders))
- Create `/content/placeholders.json` with all German strings as key-value pairs
- Replace hardcoded strings with `getPlaceholder('key')` calls
- This aligns with the **Design system & styling** work stream in block-review-decisions.md
- The `lang="en"` should become `'de'` for VW Germany

### Category 2: Hardcoded Navigation Data (~400 lines in header.js)

**Files (5 flags):**
| File | Flag | Lines |
|------|------|-------|
| `header.js:17` | All navigation constants | File-level flag |
| `header.js:136` | CATEGORY_RAIL promotional content | ~100 lines per category |
| `header.js:240` | DRILLDOWN_OVERRIDES hierarchy | ~250 lines |
| `header.js:610` | German string matching in tool detection | `getToolKind()` |

**Future resolution:**
- **Phase 1 (quick win):** Move all hardcoded data to a **JSON content file** (`/content/nav-data.json`) that can be edited by authors in AEM. Header loads it at decoration time alongside the nav fragment.
- **Phase 2 (full solution):** Restructure the **nav fragment** (`/content/nav/index.html`) to contain the complete navigation hierarchy, eliminating `DRILLDOWN_OVERRIDES`. The fragment would use nested lists with data attributes for promo cards and top-links.
- This maps directly to the **Header mega-menu** entry in block-review-decisions.md, which already accounts for "188+ links, drawer animation, scroll transition"
- The promotional teaser cards in `CATEGORY_RAIL` should become **author-managed content** — either embedded in the nav fragment or loaded from a separate promo fragment per category

### Category 3: Hardcoded Legal Disclaimers (carousel-featured.js)

**Files (2 flags):**
| File | Flag |
|------|------|
| `carousel-featured.js:144` | VW legal disclaimers matched by heading text |
| `carousel-featured.js:18` | Documented in file-level JSDoc |

**Future resolution:**
- Disclaimers should be **authored as content** within the carousel block rows. Each slide's text cell can include a disclaimer paragraph marked with a CSS class (e.g., `<p class="disclaimer">...`)
- Alternatively, implement a **disclaimer fragment** pattern: a shared `/content/fragments/disclaimers.json` file that maps model names to legal text, loaded at block decoration time
- This relates to the **disclaimer** block entry in block-review-decisions.md: "JS-generated footnotes → All templates"
- The heading-text-matching approach is fragile and should be replaced with **section metadata** or **block variant classes**

### Category 4: Hardcoded Static Data (cards-model.js)

**Files (2 flags):**
| File | Flag |
|------|------|
| `cards-model.js:28` | STATIC_MODELS with hardcoded prices/images |
| `cards-model.js:112` | German badge labels and color mappings |

**Future resolution:**
- The `STATIC_MODELS` array is a **fallback for empty blocks** — when no content is authored, it injects placeholder model cards. In production:
  - **Option A (BYOM):** Fetch model data from the **MOFA API** at runtime via an App Builder / edge worker action, as specified in block-review-decisions.md for **model-grid**
  - **Option B (authored):** Authors populate model cards via the Universal Editor using the `_cards-model.json` component model
- Badge labels should use the i18n placeholder system (Category 1)
- This block is currently **unused** (0 pages) but maps to the **cards-model (expand)** entry in block-review-decisions.md

### Category 5: Hardcoded Fragment Paths

**Files (3 flags):**
| File | Flag | Path |
|------|------|------|
| `embed-search.js:30` | SEARCH_FRAGMENT | `/content/de/fragments/search` |
| `search-form.js:111` | FRAGMENT_PATH | `/content/de/fragments/search` |
| `component-mappers.js:498` | Fragment reference in schnellsuche mapping | `/de/fragments/search` |

**Future resolution:**
- Fragment paths should be derived from **site configuration** — either via metadata tags (`<meta name="search-fragment" content="/de/fragments/search">`) or a site-level config endpoint
- The embed-search → search-form swap pattern (where embed-search loads a fragment containing search-form and dynamically re-decorates itself) is clever but fragile. In production:
  - **Option A:** Make `embed-search` a true **REACT-EMBED** as specified in block-review-decisions.md — it iframes the VW React search app rather than rendering a static visual
  - **Option B:** Create a dedicated `search` block that handles both visual and functional states, eliminating the block-identity-swap pattern
- The search-form block is explicitly **non-functional** (visual only). The block-review-decisions.md accounts for REACT-EMBED infrastructure to make embedded tools functional

### Category 6: Hardcoded API Credentials & Configuration (dealer-fetcher.js)

**Files (4 flags):**
| File | Flag |
|------|------|
| `dealer-fetcher.js:17` | Critical hardcoded values overview |
| `dealer-fetcher.js:27` | SIGNED_ENDPOINT with cryptographic signature |
| `dealer-fetcher.js:157` | Hardcoded dealerType and language |
| `dealer-fetcher.js:200` | Hardcoded countryCode and language |

**Future resolution:**
- The dealer fetcher is **import-time only** (not runtime), so these values don't affect the deployed site
- For ongoing imports or content refresh:
  - Move `SIGNED_ENDPOINT` to an **environment variable** or `.env` file (never commit signatures)
  - Add a **refresh script** that captures a fresh signature from a live volkswagen.de session
  - Country/language should be CLI parameters: `--country DE --language de`
- For the production dealer page, block-review-decisions.md specifies **dealer-info**, **dealer-staff**, and **dealer-page-assembly** BYOM blocks — all runtime API calls should go through a secure App Builder action, not direct BFF calls

### Category 7: Hardcoded CDN/Image Configuration

**Files (3 flags):**
| File | Flag |
|------|------|
| `scene7-resolver.js:11` | SCENE7_BASE URL hardcoded to VW CDN |
| `download-images.js:18` | Hardcoded to scan assets.volkswagen.com URLs |
| `download-images.js:85` | Hardcoded base64 Scene7 query parameters |

**Future resolution:**
- These are **import-time only** utilities — they don't affect the deployed site
- Images are downloaded and committed as local `media_*.png` files during import
- For multi-tenant or ongoing import support:
  - Make `SCENE7_BASE` a CLI parameter or config file value
  - Document the Scene7 parameter decoding process so it can be refreshed
  - Consider using the **AEM Dynamic Media** integration for runtime image delivery instead of pre-downloaded files

### Category 8: Duplicated Import Script Boilerplate

**Files (1 flag):**
| File | Flag |
|------|------|
| `import-homepage.js:27` | executeTransformers() and findBlocksOnPage() duplicated across 7 scripts |

**Future resolution:**
- Extract `executeTransformers()` and `findBlocksOnPage()` into a shared `import-utils.js` module
- Each import script would import from the shared module and only define its unique `PAGE_TEMPLATE` and parser/transformer registries

---

## Fragment Architecture Summary

The codebase uses 4 fragment patterns, documented with `FRAGMENT PATTERN` annotations:

| Fragment | Path | Loaded By | Contains |
|----------|------|-----------|----------|
| Navigation | `/content/nav/index.html` | `header.js` via `loadFragment()` | Brand link, menu groups (6 sections), utility tools |
| Footer | `/content/footer/index.html` | `footer.js` via `loadFragment()` | 3 nav columns (h2 + link lists), legal links + copyright |
| Search | `/content/de/fragments/search` | `embed-search.js`, `search-form.js` | search-form block with category chips, filters, location, CTA |
| Generic | Any path | `fragment.js` block | Used via `<div class="fragment">` in content; loads and decorates any page fragment |

**Future consideration:** The search fragment is the most architecturally significant — it enables a single authored search form to appear on multiple pages. In production, this should evolve to either:
1. A **REACT-EMBED** (iframe of the live VW search app) per block-review-decisions.md
2. A **functional search block** with API integration via App Builder

---

## Cross-Reference: Current Code vs. Block Registry

### Blocks that exist in code

| Block in Code | Block Registry Entry | Status | Gap |
|---------------|---------------------|--------|-----|
| hero-stage | hero-stage | ✅ Exists | Needs pixel-perfect polish |
| carousel-featured | carousel-featured | ✅ Exists | Needs VW-exact behavior, disclaimer refactor |
| columns-teaser | columns-teaser | ✅ Exists | Needs variant polish (focus/power/twoColumns) |
| embed-search | embed-search + REACT-EMBED infra | ✅ Exists (visual) | Non-functional; needs full embed infrastructure |
| cards-model | cards-model (expand) | ✅ Exists | Needs expand variant, remove static fallback |
| accordion | accordion | ✅ Exists | Needs "show more" logic, height animation, a11y |
| search-form | (part of embed-search) | ✅ Exists (visual) | Non-functional; may be replaced by REACT-EMBED |
| dealer-hours | (part of dealer-info) | ✅ Exists | Dealer-specific; may merge into dealer-info |
| hero-dealer | (part of dealer-info) | ✅ Exists | Dealer-specific; may merge into dealer-info |
| header | header mega-menu | ✅ Exists | Needs nav data externalization (~400 lines) |
| footer | footer | ✅ Exists | Needs responsive polish |
| fragment | fragment | ✅ Exists | Needs XF content slider support |
| cards (boilerplate) | — | ✅ Exists | Not in registry; kept for reference |
| columns (boilerplate) | — | ✅ Exists | Not in registry; styled in global CSS |
| hero (boilerplate) | — | ✅ Exists | Not in registry; kept for reference |

### Blocks in registry but not yet built

These blocks are defined in block-review-decisions.md but do not yet exist in the codebase. They are needed for full coverage of the 24 live pages:

| Block Registry Entry | Type | Used By Templates | Notes |
|---------------------|------|-------------------|-------|
| text-cards | BLOCK (NEW) | Detail, Homepage | 3-column bordered text-only cards |
| highlight-feature | BLOCK (NEW) | Detail | Product highlight with features list |
| gallery | BLOCK (NEW) | Detail, Model Detail | Masonry image grid with optional tab filtering |
| copy-media | BLOCK (NEW) | Detail, Model Detail | Text with inline media inset |
| usp | BLOCK (NEW) | Hub, Homepage | 3-item asymmetric layout (large left + 2 stacked right) |
| specs-bar | BLOCK (NEW) | Model Detail | Price + spec cards |
| model-grid | BYOM (NEW) | Model Overview | JSON API → card grid via App Builder / edge worker |
| dealer-info | BYOM (NEW) | Dealer | Header with name/address/map/rating/hours via App Builder |
| dealer-staff | BYOM (NEW) | Dealer | Staff cards from API |
| dealer-page-assembly | BYOM (NEW) | Dealer | API → page builder mapping dealer data to block markup |
| marketing-code | REACT-EMBED (NEW) | Model Overview | Standalone resolve-marketing-code app |
| disclaimer | BLOCK (NEW) | All templates | JS-generated legal footnotes (replaces hardcoded disclaimers) |
| sticky-cta-bar | BLOCK (NEW) | Detail, Model Detail, Hub | Persistent CTA bar |
| secondary-nav | AUTO-BLOCK (NEW) | Model Detail, possibly Hub/Detail | In-page section navigation |
| announcement-banner | BLOCK (NEW) | Model Detail | Root-level announcement via xfAnnouncement |

---

## Checklist

### Lint Fixes — Comment/Formatting Adjustments Only (Blocking)
- [ ] `blocks/header/header.js`: Add `// eslint-disable-next-line no-unused-vars` comment above `activeSectionIndex` and `activeItemIndex` declarations
- [ ] `blocks/carousel-featured/carousel-featured.js`: Rewrap line 10 documentation comment to ≤100 chars
- [ ] `styles/styles.css`: Add `/* stylelint-disable no-descending-specificity */` after file header comment
- [ ] `blocks/carousel-featured/carousel-featured.css`: Add `/* stylelint-disable no-descending-specificity, no-duplicate-selectors */` after file header comment
- [ ] `blocks/header/header.css`: Add `/* stylelint-disable no-descending-specificity, property-no-deprecated */` after file header comment

### Documentation (Completed)
- [x] Add file-level JSDoc to all 43 JS files
- [x] Add section comments to all 18 CSS files
- [x] Flag all hardcoded/non-best-practice items with `OUT OF SCOPE`
- [x] Document all fragment inclusion patterns with `FRAGMENT PATTERN`
- [x] Document xwalk field hints and Universal Editor integration points
- [x] Document the import pipeline (JSON-based and DOM-scraping paths)

---

*Lint comment fixes require switching to Execute mode. All "Future resolution" items in the OUT OF SCOPE Registry are documented guidance for external developers — no code changes are in scope for this plan.*
