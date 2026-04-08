# Volkswagen.de Migration Plan — AEM Edge Delivery Services (xwalk)

## Overview

Migrate selected pages from **volkswagen.de** to the existing AEM EDS xwalk project (`larsauffarth/xwalk-ema-vw`). The project currently has the standard boilerplate blocks (hero, cards, columns, header, footer, fragment) with Roboto typography and default styling.

## Source URLs & Scope

| # | URL | Type | Notes |
|---|-----|------|-------|
| 1 | `volkswagen.de/de.html` | Single page | Homepage — hero, carousel, cards, accordion |
| 2 | `volkswagen.de/de/elektromobilitaet.html` + all subpages | Section (42 pages) | Hub + 41 child pages across 8 subsections, up to 3 levels deep |
| 3 | `volkswagen.de/de/modelle.html` | Single page | Models overview — data-driven card grid with filters |
| 4 | `volkswagen.de/de/modelle/id-7-gtx.html` | Single page | Model detail — hero, carousel, gallery, specs, lightbox |
| 5 | `volkswagen.de/de/haendler-werkstatt/volkswagen-automobile-hamburg-fruchtallee.html` | Single page | Dealer page — structured contact data, tabs, map, opening hours |

**Total estimated pages: ~46**

## Page Template Classification (Preliminary)

Based on URL patterns and content analysis, the pages fall into approximately **5 templates**:

| Template | Description | Example URLs | Est. Count |
|----------|-------------|-------------|------------|
| **Homepage** | Hero + carousel + cards + accordion | `/de.html` | 1 |
| **Hub/Landing** | Hero + card grid linking to children + teasers | `/de/elektromobilitaet.html`, `/de/elektromobilitaet/laden.html` | ~10 |
| **Detail/Article** | Hero + editorial + teasers + accordion | `/de/elektromobilitaet/batterie/sicherheit.html` | ~28 |
| **Model Overview/Detail** | Hero + data-driven cards/specs + carousel + gallery | `/de/modelle.html`, `/de/modelle/id-7-gtx.html` | 2 |
| **Dealer** | Structured contact info + tabs + map + opening hours | `/de/haendler-werkstatt/...` | 1 |

> Templates will be refined during site analysis (Step 1).

## Block Inventory Needed

### Existing Blocks (in project)
- `hero` — needs VW styling variant
- `cards` — needs VW product card variant
- `columns` — needs VW teaser variant
- `header` / `footer` / `fragment` — standard

### New Blocks Required
| Block | Priority | Used On | Complexity |
|-------|----------|---------|------------|
| **Carousel/Slider** | High | Homepage, model detail, dealer | High (drag, snap-scroll, pagination) |
| **Accordion** | High | Homepage, detail pages | Medium |
| **Gallery** | Medium | Model detail | Medium-High (lightbox) |
| **Tabs** | Medium | Dealer page | Medium |
| **Table / Specs** | Medium | Model detail, comparison pages | Low-Medium |
| **CTA Bar** | Low | Model pages | Low |
| **Notification Banner** | Low | Model detail | Low |
| **Dealer Info** | Low | Dealer page only | Medium |
| **Embed (Map)** | Low | Dealer page | Low (iframe) |
| **Simulator/Calculator** | Low | E-tools pages (3) | High (custom interactive) |

## Design System Extraction

The VW site uses a distinct brand design system that needs to be mapped to EDS CSS custom properties:

| Token | VW Value | Current Project |
|-------|----------|-----------------|
| Primary color | `#001e50` (dark navy) | Generic boilerplate |
| Accent | `#0040c5` / `#00b0f0` | — |
| Heading font | `vw-head` (200, 400, 700) | Roboto |
| Body font | `vw-text` (400, 700) | Roboto |
| Grid | 24-column, max 2560px | Simple sections |
| Breakpoints | 560, 960, 1280, 1600, 1920, 2560px | 900px single breakpoint |

## Key Migration Risks & Considerations

1. **React SPA rendering** — The VW site is client-side rendered. Content import requires headless browser (Playwright) to capture the fully rendered DOM.
2. **Data-driven pages** — Models overview and dealer pages are API-fed. EDS migration requires either authored content or spreadsheet-based data sources.
3. **Interactive simulators** — 3 e-tools pages (cost, charging time, range simulators) require custom JS block development or iframe embedding.
4. **Complex grid system** — VW's 24-column grid must be simplified to EDS's section-based layout model.
5. **42 elektromobilitaet pages** — Large section requiring consistent template application and batch processing.
6. **xwalk authoring** — All blocks need proper `component-definition.json`, `component-models.json`, and `component-filters.json` entries for Universal Editor authoring.
7. **Font licensing** — VW brand fonts (`vw-head`, `vw-text`) may require license verification for use in the EDS project.

## Migration Approach

The migration will use the `excat-site-migration` skill which orchestrates:
1. **Site analysis** — Classify URLs into page templates
2. **Page analysis** — Analyze individual pages for block mapping
3. **Block variant management** — Track and reuse block variants with similarity matching
4. **Import infrastructure** — Generate parsers and transformers
5. **Content import** — Execute import and generate HTML content files
6. **Design system** — Extract and apply VW design tokens
7. **Block development** — Implement new blocks with xwalk models

## Checklist

### Phase 1: Analysis & Setup
- [ ] Run site analysis to classify all 46 URLs into page templates
- [ ] Analyze representative page from each template for block mapping
- [ ] Inventory all unique block types across all pages
- [ ] Identify blocks that can reuse existing project blocks vs. new development

### Phase 2: Design System
- [ ] Extract VW design tokens (colors, typography, spacing, breakpoints)
- [ ] Map VW fonts (`vw-head`, `vw-text`) — verify licensing or select fallbacks
- [ ] Update `styles/styles.css` with VW custom properties
- [ ] Create `styles/fonts.css` with VW font-face declarations

### Phase 3: Block Development (xwalk)
- [ ] Create VW variants for existing blocks (hero, cards, columns)
- [ ] Develop new `carousel` block with xwalk model
- [ ] Develop new `accordion` block with xwalk model
- [ ] Develop new `gallery` block with xwalk model (if needed)
- [ ] Develop new `tabs` block with xwalk model (if needed)
- [ ] Develop new `table/specs` block with xwalk model (if needed)
- [ ] Develop `dealer-info` block with xwalk model (if needed)
- [ ] Register all blocks in `component-definition.json`, `component-models.json`, `component-filters.json`

### Phase 4: Import Infrastructure
- [ ] Generate page transformers for each template
- [ ] Generate block parsers for all identified block types
- [ ] Create import scripts combining templates + parsers

### Phase 5: Content Migration
- [ ] Import homepage (`/de.html`)
- [ ] Import elektromobilitaet section (42 pages) — batch by template
- [ ] Import models pages (`/de/modelle.html`, `/de/modelle/id-7-gtx.html`)
- [ ] Import dealer page
- [ ] Verify all imported content renders correctly in local preview

### Phase 6: Navigation & Global Elements
- [ ] Migrate VW navigation structure to `nav.html`
- [ ] Migrate footer structure to `footer.html`
- [ ] Implement header block with VW mega-menu behavior

### Phase 7: QA & Refinement
- [ ] Visual comparison of each template against original pages
- [ ] Fix CSS/styling discrepancies
- [ ] Test responsive behavior at all breakpoints
- [ ] Validate xwalk authoring in Universal Editor

---

> **Note:** Execution requires exiting Plan mode. The migration will be orchestrated via the `excat:excat-site-migration` skill.
