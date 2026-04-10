# Volkswagen.de Migration — Status Review & Next Steps

## What Has Been Achieved

### Content Import: COMPLETE (46/46 pages, 0 failures)

| Template | Pages | Status | Content Quality |
|----------|-------|--------|-----------------|
| homepage | 1 | Imported | Good — hero, columns-teaser, cards, section metadata all present |
| emobility-hub | 9 | Imported | Partial — some carousel/columns-teaser blocks have empty cells (parsers didn't extract all content from React-rendered DOM) |
| emobility-detail | 29 | Imported | Partial — same parser extraction gaps |
| emobility-tool | 4 | Imported | Partial — simulator embeds need refinement |
| model-overview | 1 | Imported | Partial — cards-model block has empty cells (API-rendered content) |
| model-detail | 1 | Imported | Partial — React SPA content extraction limitations |
| dealer | 1 | Imported | Partial — structured dealer data not fully captured |

### Infrastructure: COMPLETE

| Artifact | Count | Status |
|----------|-------|--------|
| Block variants (JS/CSS/JSON/metadata) | 5 | Complete — hero-stage, carousel-featured, columns-teaser, cards-model, embed-search |
| Block parsers (with xwalk field hints) | 5 | Complete but need refinement (see content quality issues) |
| Transformers | 2 | Complete — vw-cleanup.js, vw-sections.js |
| Import scripts + bundles | 7 + 7 | Complete — one per template |
| Page templates | 7 | Complete with block mappings |
| Import reports (Excel) | 7 | Complete |

### Project Configuration

| Item | Status |
|------|--------|
| Project type detection (xwalk) | Done |
| `.migration/project.json` | Created |
| `page-templates.json` | Created with all 7 templates |
| Homepage section mappings (7 sections) | Fully defined with selectors, styles, default content |
| Other template section mappings | Not defined (blocks only, no sections array) |

---

## What Still Needs To Be Done

### Critical Issues (Content Quality)

1. **Empty carousel-featured blocks** — The carousel parser failed to extract content from React-rendered USP sections on many pages. The `carousel-featured` blocks appear with empty `<!-- field:media_image -->` and `<!-- field:content_text -->` cells. Root cause: the VW SPA renders content asynchronously; the scraper captured some but not all lazy-loaded carousel content.

2. **Empty columns-teaser blocks** — The `focusTeaserSection` selector was added for non-homepage templates, but the parser was built for `.textOnlyTeaserSection` DOM structure. The `focusTeaserSection` has a different internal structure (image + text side-by-side) that the parser doesn't handle.

3. **Empty cards-model blocks on model-overview** — The models grid is entirely API-rendered; the cards-model parser found no `model-slide` elements since the featureApp section rendered differently on this page.

4. **Hero images missing** — The hero-stage parser creates `<!-- field:image -->` hint but the image cell is empty on most pages because the hero background images are delivered as base64 SVG placeholders (lazy-load not triggered during import).

### Design System (Not Started)

5. **VW design tokens not applied** — `styles/styles.css` still uses default boilerplate values (Roboto fonts, generic blue links). VW brand colors (#001e50, #0040c5, #00b0f0), fonts (vw-head, vw-text), and spacing have not been extracted or applied.

### xwalk Component Registration (Not Started)

6. **New block variants not registered** — The 5 new variants (hero-stage, carousel-featured, columns-teaser, cards-model, embed-search) have `_*.json` model files in their block directories but these have NOT been merged into the root `component-definition.json`, `component-models.json`, and `component-filters.json`. The `npm run build:json` script merges `models/_*.json` files but the new block JSON files sit in `blocks/*/` not `models/`.

### Navigation & Footer (Not Started)

7. **No nav.html or footer.html** — VW navigation structure and footer have not been migrated. The header and footer blocks load these as fragments.

### Template Section Definitions (Incomplete)

8. **Only homepage has sections defined** — The other 6 templates in `page-templates.json` have `blocks[]` but no `sections[]` array. This means the section transformer (`vw-sections.js`) has no section data to work with for non-homepage templates, so no section breaks or section-metadata blocks are generated for those pages.

---

## Checklist

### Phase 1: Fix Content Quality (Parser Refinement)
- [ ] Fix hero-stage parser — handle base64 SVG placeholders and lazy-loaded background images
- [ ] Fix carousel-featured parser — handle both `.uspSection` and `.expandCollapseItem` DOM structures with fallbacks for React-rendered content
- [ ] Fix columns-teaser parser — add support for `.focusTeaserSection` DOM structure (image + text layout)
- [ ] Fix cards-model parser — add fallbacks for API-rendered model grids and featureApp sections
- [ ] Fix embed-search parser — improve URL extraction from feature app sections
- [ ] Re-run imports for all 7 templates after parser fixes
- [ ] Verify content quality across sample pages from each template

### Phase 2: Template Section Definitions
- [ ] Analyze representative pages from emobility-hub, emobility-detail, emobility-tool templates to identify section boundaries
- [ ] Add `sections[]` arrays to all 6 non-homepage templates in `page-templates.json`
- [ ] Re-import to get proper section breaks and section-metadata blocks

### Phase 3: xwalk Component Registration
- [ ] Merge `blocks/hero-stage/_hero-stage.json` into root component files (or move to `models/`)
- [ ] Merge `blocks/carousel-featured/_carousel-featured.json` into root component files
- [ ] Merge `blocks/columns-teaser/_columns-teaser.json` into root component files
- [ ] Merge `blocks/cards-model/_cards-model.json` into root component files
- [ ] Merge `blocks/embed-search/_embed-search.json` into root component files
- [ ] Run `npm run build:json` to regenerate merged component-definition.json, component-models.json, component-filters.json
- [ ] Verify Universal Editor can discover all new block types

### Phase 4: VW Design System
- [ ] Extract VW design tokens (colors, typography, spacing, breakpoints) from original site
- [ ] Source or substitute VW brand fonts (vw-head, vw-text) — check licensing
- [ ] Update `styles/styles.css` with VW CSS custom properties
- [ ] Update `styles/fonts.css` with VW font-face declarations
- [ ] Style each block variant CSS to match VW visual design
- [ ] Verify design across breakpoints (560, 960, 1280, 1600px)

### Phase 5: Navigation & Global Elements
- [ ] Migrate VW navigation structure to `content/nav.plain.html`
- [ ] Migrate VW footer structure to `content/footer.plain.html`
- [ ] Verify header block renders navigation correctly
- [ ] Verify footer block renders footer correctly

### Phase 6: QA & Refinement
- [ ] Preview all 46 pages in local dev server
- [ ] Visual comparison of homepage against original
- [ ] Visual comparison of representative emobility page against original
- [ ] Visual comparison of model detail page against original
- [ ] Fix CSS/styling discrepancies identified during comparison
- [ ] Test responsive behavior at all breakpoints
- [ ] Validate xwalk authoring works in Universal Editor

---

## Summary

The **bulk import infrastructure is fully operational** — all 46 pages were successfully imported with 0 failures. However, the **content quality needs significant refinement** because the VW site is a React SPA where much content is rendered client-side. The parsers extracted what they could from the DOM snapshot, but several block types (carousel, cards, hero images) have empty or incomplete content. The next priority is fixing the 5 parsers to better handle the VW SPA DOM patterns, then re-importing all pages. After that, the design system, xwalk registration, and navigation need to be built out.
