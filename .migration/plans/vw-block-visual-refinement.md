# VW Migration — Block Inventory Audit & Visual Refinement Plan

## Status: Where We Stand

### What Has Been Achieved

1. **Content extraction via JSON API** — All 46 pages re-imported using `.model.json` endpoints instead of DOM scraping. This gives us structured, typed content with real Scene7 image URLs, preserved bold/regular text formatting, and complete carousel/teaser content.

2. **Image pipeline** — 95 images downloaded from Scene7 CDN, uploaded to AEM DAM at `/content/dam/xwalk-ema-vw/`, and referenced in content HTML via DAM paths.

3. **5 block variants created** — hero-stage, carousel-featured, columns-teaser, cards-model, embed-search — each with JS, CSS, and xwalk JSON model.

4. **VW design system** — Brand fonts (vw-head, vw-text) downloaded and installed. CSS custom properties for VW colors, spacing, typography applied to `styles/styles.css`.

5. **Header rewritten** — Custom VW header with logo, quick links, 6-group navigation drawer, utility icons (Händler, Search, Account), transparent/solid scroll states.

6. **Footer created** — 3-column link structure (Über VW, Konzern, Social Media) + legal links + copyright.

7. **Pages uploaded to AEM** — Content pushed to AEM author instance via agent UI.

8. **Merge conflicts resolved** — Branch `aem-20260410-1450` merged with main, pushed to GitHub.

### How the JSON API Shift Changed Things

The original plan used **DOM-based Playwright scraping** with CSS selector parsers. This was replaced by a **JSON API pipeline** that:

- Fetches `.model.json` per page (HTTP, <1 second vs 10-30s per page with Playwright)
- Maps AEM component `:type` values directly to EDS block names
- Extracts real Scene7 image URLs (no base64 placeholders)
- Preserves richtext formatting (bold/regular mixed text in headings)
- Applies visibility filtering (skips empty, structural, and personalization-only components)

The JSON importer (`tools/importer/json-importer.js`) replaced all DOM-based parsers. The old parsers still exist in `tools/importer/parsers/` but are no longer used.

### What Still Needs Work

The content structure is solid but the **visual presentation needs refinement** per block. The blocks have basic VW-branded CSS but haven't been compared pixel-by-pixel against the original site across breakpoints.

---

## Block Inventory Audit

### Blocks Actually Used in Content (from JSON import)

| Block | Pages Using | Description | Status |
|-------|------------|-------------|--------|
| **hero-stage** | 34 | Full-width image + heading + CTA text bar below | JS: no-op, CSS: two-row layout |
| **carousel-featured** | 8 | Horizontal slide carousel with image bg + text overlay | JS: scroll snap + nav dots, CSS: gradient overlay |
| **columns-teaser** | 17 | Side-by-side content columns (text or image+text) | JS: adds col count class, CSS: flex row ≥960px |
| **embed-search** | 15 | Embedded feature app (iframe on intersection) | JS: lazy iframe, CSS: 16:9 placeholder |
| **cards-model** | **0** | Product model cards grid | **NOT USED — JSON importer never maps to this block** |

### Blocks in Project But Not Used by Migrated Content

| Block | Origin | Action Needed |
|-------|--------|---------------|
| `cards-model` | Created during DOM-based import phase | **Review: either map a JSON component type to it, or remove** |
| `cards` (boilerplate) | Original AEM boilerplate | Keep for future use |
| `columns` (boilerplate) | Original AEM boilerplate | Keep for future use |
| `hero` (boilerplate) | Original AEM boilerplate | Keep for future use |
| `fragment` | Boilerplate fragment loader | Keep |

### AEM Component Types → Block Mapping (JSON Importer)

| AEM `:type` | Maps To | Content Quality |
|-------------|---------|-----------------|
| `basicStageSection` | `hero-stage` | Good — image + heading + CTA |
| `focusTeaserSection` | `columns-teaser` | Good — image side + text side |
| `uspSection` | `carousel-featured` | Good — 3 items (super/left/right) |
| `expandCollapseSection` | `carousel-featured` | Good — N items with image + text |
| `textOnlyTeaserSection` | `columns-teaser` | Partial — headings missing in some cases |
| `contentSliderSection` | `carousel-featured` | Good — N slider items |
| `featureAppSection` | `embed-search` | Placeholder only (client-rendered apps) |
| `singleColumnSection` | default content | Good — heading + richtext + links |
| `headingSection` | default content | Good |
| All element types | default content | Good — headings, richtext, links, buttons, images |

### Missing Mappings (components in JSON but not mapped to blocks)

| AEM `:type` | Frequency | Should Map To | Notes |
|-------------|-----------|---------------|-------|
| `twoColumnsSection` | Rare | `columns-teaser` | Two-column layout, could reuse columns-teaser |
| `editorialTeaserElement` | In focusTeaser children | Already handled via parent | No separate mapping needed |
| `mediaSingleItem` | Rare | default content (image) | Single image display |

---

## Visual Refinement Plan — Per Block

### Priority Order (by page coverage)

1. **hero-stage** (34 pages) — Highest impact
2. **columns-teaser** (17 pages) — Second most used
3. **embed-search** (15 pages) — Mostly placeholder, low visual priority
4. **carousel-featured** (8 pages) — Complex visual component
5. **Default content** (all pages) — Headings, paragraphs, links, images outside blocks

### Per-Block Refinement Tasks

#### 1. hero-stage (34 pages)

**Current state:** Two-row layout — full-width 16:9 image on top, navy text bar below with heading (font-weight 200 + bold for `<b>`) left and CTA button right.

**What to verify against original:**
- [ ] Image aspect ratio matches (16:9 vs 3:2 on different page types)
- [ ] Heading font-weight: original uses 200 (light) with `<b>` for bold portions
- [ ] CTA button: navy bg, white text, border-radius 100px, padding 0 32px, height 48px
- [ ] Text bar padding at each breakpoint (16px 24px mobile, 16px 120px desktop)
- [ ] No background overlay on image (original has image above, text below — not overlay)
- [ ] Spacing between image and text bar

#### 2. columns-teaser (17 pages)

**Current state:** Flex column on mobile, flex row ≥960px. Items have 1px border, 24px padding.

**What to verify against original:**
- [ ] focusTeaserSection layout: image on one side (~58%), text on other (~42%)
- [ ] `hasImageRight` flag support (image left vs right)
- [ ] textOnlyTeaserSection: text-only items with heading + body + link
- [ ] Heading style: `vw-head` bold, navy color
- [ ] Body text: `vw-text` regular, secondary color
- [ ] Link style: navy, bold, no underline (underline on hover)
- [ ] Section-level link ("Mehr erfahren" at bottom)

#### 3. embed-search (15 pages)

**Current state:** Lazy iframe on intersection with 16:9 placeholder.

**What to verify:**
- [ ] Most embed-search instances are feature apps (car finder, configurator) — these are client-rendered and won't display meaningful content in EDS
- [ ] Consider replacing with a styled placeholder or "Visit volkswagen.de" link
- [ ] Grey background section styling for search sections

#### 4. carousel-featured (8 pages)

**Current state:** Horizontal scroll snap with slide image (absolute positioned) + text overlay with dark gradient. Prev/next buttons + dot navigation.

**What to verify against original:**
- [ ] Slide min-height (400px mobile, 500px desktop)
- [ ] Gradient overlay direction and opacity (linear-gradient to top, 80% navy)
- [ ] Text positioning within slide (bottom-left, max-width ~50% on desktop)
- [ ] Button style within slides (accent-primary bg, white text)
- [ ] Navigation dots: active = accent-primary, inactive = border-color
- [ ] Prev/next button style: circular, border, 40px
- [ ] Number of visible slides (1 at a time, full-width)

#### 5. Default content styling

**What to verify:**
- [ ] Heading hierarchy: h1 xxl, h2 xl, h3 l — all `vw-head` bold, navy
- [ ] Body text: `vw-text` regular, 18px, #000e26, line-height 1.6
- [ ] Links: navy, no underline, underline on hover
- [ ] Buttons: navy bg, white text, 24px border-radius, 700 weight
- [ ] Images: max-width 100%, auto height
- [ ] Section spacing: 40px margin between sections
- [ ] Max content width: 1200px centered

---

## Checklist

### Phase 1: Block Inventory Verification
- [ ] Confirm cards-model block is unused — decide to keep for future or remove
- [ ] Verify all 46 pages render correctly in local preview
- [ ] Spot-check 5 representative pages (homepage, emobility hub, detail, model, dealer) for content completeness

### Phase 2: Visual Refinement — hero-stage
- [ ] Open original VW homepage + migrated homepage side by side using Playwright
- [ ] Extract exact hero CSS from original (font sizes, weights, colors, padding, button style)
- [ ] Update hero-stage.css to match
- [ ] Verify at 375px, 768px, 960px, 1440px
- [ ] Test on an emobility detail page (different hero content)

### Phase 3: Visual Refinement — columns-teaser
- [ ] Compare original focusTeaserSection vs migrated columns-teaser
- [ ] Compare original textOnlyTeaserSection vs migrated columns-teaser
- [ ] Extract exact CSS (image/text split ratio, spacing, typography)
- [ ] Update columns-teaser.css
- [ ] Verify responsive behavior

### Phase 4: Visual Refinement — carousel-featured
- [ ] Compare original uspSection carousel vs migrated
- [ ] Compare original expandCollapseSection vs migrated
- [ ] Extract exact slide dimensions, gradient, text positioning
- [ ] Update carousel-featured.css and carousel-featured.js if needed
- [ ] Verify slide navigation works correctly

### Phase 5: Visual Refinement — embed-search & default content
- [ ] Decide on embed-search visual treatment (placeholder vs iframe)
- [ ] Verify default content typography matches VW design
- [ ] Check button styles in content vs VW original
- [ ] Check image rendering in default content sections

### Phase 6: Cross-Page QA
- [ ] Preview all 46 pages at desktop (1440px)
- [ ] Spot-check 10 pages at mobile (375px)
- [ ] Verify header renders correctly on all pages
- [ ] Verify footer renders correctly on all pages
- [ ] Check for any empty/broken blocks across pages
- [ ] Final visual comparison against original site

---

## Files Reference

### Content
- `content/de.plain.html` — Homepage (JSON-imported)
- `content/de/elektromobilitaet/**/*.plain.html` — 42 emobility pages
- `content/de/modelle/*.plain.html` — 2 model pages
- `content/de/haendler-werkstatt/*.plain.html` — 1 dealer page
- `content/nav.plain.html` + `content/nav/index.html` — Navigation
- `content/footer.plain.html` + `content/footer/index.html` — Footer

### Block Code
- `blocks/hero-stage/` — JS (no-op), CSS, xwalk JSON
- `blocks/carousel-featured/` — JS (scroll snap + nav), CSS, xwalk JSON
- `blocks/columns-teaser/` — JS (col count), CSS, xwalk JSON
- `blocks/cards-model/` — JS (ul/li grid), CSS, xwalk JSON **(unused)**
- `blocks/embed-search/` — JS (lazy iframe), CSS, xwalk JSON
- `blocks/header/` — Custom VW header with drawer nav
- `blocks/footer/` — Standard EDS footer

### Import Infrastructure
- `tools/importer/json-importer.js` — JSON API content extractor
- `tools/importer/component-mappers.js` — AEM type → EDS block mappers
- `tools/importer/richtext-converter.js` — VW richtext → HTML
- `tools/importer/scene7-resolver.js` — Scene7 → image URL
- `tools/importer/visibility-filter.js` — Skip empty/structural components
- `tools/importer/download-images.js` — Scene7 image downloader
- `tools/importer/run-json-import.js` — CLI batch runner

### Styles
- `styles/styles.css` — VW design tokens + base styles
- `styles/fonts.css` — VW brand font-face declarations
- `fonts/vw*.woff2` — 5 VW brand font files
