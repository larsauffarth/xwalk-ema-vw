# VW Content Migration — JSON API Import Restructure

## Discovery Summary

Every page on volkswagen.de exposes a `.model.json` endpoint (the standard AEM SPA Editor content API). These return fully structured, typed JSON with:

- **Component hierarchy** — every AEM component has a `:type` property (e.g., `basicStageSection`, `focusTeaserSection`, `expandCollapseItem`)
- **Real image references** — Scene7 file identifiers and DAM paths (no base64 placeholders, no lazy-load issues)
- **Structured text** — richtext arrays with proper HTML elements, headings with style/order, links with labels and URLs
- **Typed relationships** — sections contain items, items contain media + heading + copy + link in predictable structures

### Endpoints Confirmed

| Page | Endpoint | Size |
|------|----------|------|
| Homepage | `/de.model.json` | 72 KB |
| Emobility Hub | `/de/elektromobilitaet.model.json` | 16 KB |
| Emobility Detail | `/de/elektromobilitaet/laden.model.json` | 8 KB |
| Model Detail | `/de/modelle/id-7-gtx.model.json` | 154 KB |
| Dealer | `/de/haendler-werkstatt/....model.json` | 91 KB |
| E-Tools | `/de/.../kostensimulator.model.json` | 35 KB |

### Why This Changes Everything

The current import pipeline scrapes the **rendered DOM** via Playwright, which suffers from:
- React SPA lazy-loading (empty carousel cells, missing hero images)
- Base64 SVG placeholders instead of real image URLs
- Inconsistent DOM structure across pages (React re-renders differently)
- Slow execution (browser launch + page load + scroll for each of 46 pages)

The JSON API gives us:
- **100% content fidelity** — every field, every image, every link, structured and typed
- **Real image URLs** — Scene7 references that resolve to production CDN URLs
- **Fast extraction** — HTTP fetch (~100ms) vs Playwright (~10-30s per page)
- **Deterministic mapping** — AEM component `:type` → EDS block name, no CSS selector guessing

## Visibility Filtering Strategy

### Problem
The `.model.json` contains **everything** in the AEM content tree — including empty components, structural wrappers with no content, personalization containers, and feature app configs. We need to ensure only **actually visible editorial content** makes it into the imported blocks.

### Signals Available in the JSON

| Signal | Type | Meaning |
|--------|------|---------|
| `"empty": true` | Boolean on components | Component exists in tree but has no authored content — **skip** |
| `"empty": false` | Boolean on components | Component has authored content — **include** |
| `"emptyMedia": true` | Boolean on media elements | No image/video assigned — **skip image cell** |
| `"numberOfValidElements": 0` | Integer on sections | Section has no populated child items — **skip entire section** |
| `":items": {}` | Empty object | No child components — **skip** |
| `":itemsOrder": []` | Empty array | No children in order — **skip** |
| `"personalizable": true` | Boolean on sections | Adobe Target can modify at runtime — content in JSON is the **default** (safe to use) |
| `"richtext": []` | Empty array | No text content authored — **skip** |
| `"scene7File": ""` or missing | String on images | No image assigned — **skip image** |

### Filtering Rules (applied during tree walk)

```
Rule 1: Skip empty components
  IF component.empty === true → skip entirely

Rule 2: Skip empty containers  
  IF component.:items is {} or .:itemsOrder is [] → skip

Rule 3: Skip components with no valid children
  IF component.numberOfValidElements === 0 → skip

Rule 4: Use default content for personalizable sections
  IF component.personalizable === true → proceed normally
  (JSON always contains default content; Target overlays are runtime-only)

Rule 5: Skip structural-only types
  IF :type matches structure/* (parsys, sectionGroup wrapper) → recurse into children, don't emit HTML for the wrapper itself

Rule 6: Validate content before emitting
  For headings: skip if richtext array is empty or contains only whitespace
  For images: skip if scene7File is empty/missing AND damSrc is empty
  For links: skip if linkUrl is empty AND linkLabel is empty
  For richtext: skip if all items resolve to empty strings

Rule 7: Feature app sections
  IF :type is featureAppSection → emit as embed-search block (the content is rendered client-side, not in JSON)
  Exception: if featureAppSection has NO editorial content (dealer pages) → emit minimal placeholder
```

### Personalization: Safe to Import Default Content

The JSON contains **only default content** — not A/B test variants. Personalization works via:
1. Each section has an `mboxId` (Adobe Target container identifier)
2. Target's JavaScript SDK swaps content **at delivery time** in the browser
3. The `.model.json` always returns the default experience

This means: **all content in the JSON is the "published default" and is safe to import as-is.** No risk of importing unpublished variants or draft content.

### Component Types to Skip Entirely

| Component `:type` suffix | Reason |
|--------------------------|--------|
| `structure/parsys` | Structural container only — recurse into children |
| `structure/sectionGroup` | Section wrapper — recurse, emit `<hr>` between groups |
| `structure/pageMetaDataModel` | Page-level config, not visible content |
| `structure/languageSwitcher` | Global UI element, not page content |
| `editorial/elements/mediaInteractionElement` | Interactive overlay, not static content |
| `editorial/items/copyItem` with `empty: true` | Empty authored slot |

## Architecture: JSON-Based Import Pipeline

### Current Pipeline (DOM-based)
```
URL → Playwright → Rendered DOM → CSS selector parsers → .plain.html
                                   ↑ fragile, slow, lossy
```

### New Pipeline (JSON-based)
```
URL → HTTP fetch .model.json → Component tree walker → Visibility filter → Block mappers → .plain.html
                                                        ↑ skip empty/structural
```

### Component Type → EDS Block Mapping

| AEM Component `:type` | EDS Block | Visibility check |
|------------------------|-----------|------------------|
| `basicStageSection` | `hero-stage` | `empty !== true` AND has heading or image |
| `focusTeaserSection` | `columns-teaser` | `numberOfValidElements > 0` |
| `uspSection` | `carousel-featured` | Has items with `empty !== true` |
| `expandCollapseSection` | `carousel-featured` or `cards-model` | Has items in `:itemsOrder` |
| `textOnlyTeaserSection` | `columns-teaser` | `numberOfValidElements > 0` |
| `featureAppSection` | `embed-search` | Always emit (content is client-rendered) |
| `contentSliderSection` | `carousel-featured` | Has items in `:itemsOrder` |
| `singleColumnSection` | default content | Has non-empty children |
| `headingSection` | default content | `empty !== true` AND richtext non-empty |
| `headingElement` | default content (h1-h6) | richtext array is non-empty |
| `richtextFullElement` | default content (p) | richtext array is non-empty |
| `linkElement` | default content (a) | `linkUrl` is non-empty |
| `buttonElement` | default content (a.button) | Has href and label |
| `mediaElement` / `imageElement` | default content (picture) | `emptyMedia !== true` AND `scene7File` exists |

### Image URL Resolution

Scene7 references in the JSON resolve to production URLs:
```
scene7File: "volkswagenag/IC0594_ID7_parking_at_the_charging_station"
→ https://assets.volkswagen.com/is/image/volkswagenag/IC0594_ID7_parking_at_the_charging_station
```

With optional format/size parameters:
```
?fmt=png&wid=800&align=0.00,0.00&bfc=off
```

## Implementation Plan

### New Files to Create

| File | Purpose |
|------|---------|
| `tools/importer/json-importer.js` | Core: fetches `.model.json`, walks component tree with visibility filtering, produces `.plain.html` |
| `tools/importer/component-mappers.js` | Maps each AEM `:type` to EDS block HTML using `WebImporter.Blocks.createBlock()` |
| `tools/importer/richtext-converter.js` | Converts VW richtext arrays to HTML (handles `htmlElement`, `disclaimer`, `nonBreakingSafeWord` kinds) |
| `tools/importer/scene7-resolver.js` | Converts Scene7 file references to production image URLs |
| `tools/importer/visibility-filter.js` | Implements the 7 filtering rules to skip empty/structural/non-visible components |
| `tools/importer/run-json-import.js` | CLI runner: takes URL list, fetches JSON, runs mapper, writes content files |

### Files to Keep (unchanged)

| File | Reason |
|------|--------|
| `blocks/*/` | All 5 block variants + header/footer — block code is independent of import method |
| `styles/` | Design system CSS — unaffected |
| `tools/importer/page-templates.json` | Template definitions still useful for URL classification |
| `tools/importer/transformers/` | May still be useful for post-processing cleanup |

### Files That Become Obsolete

| File | Reason |
|------|--------|
| `tools/importer/parsers/*.js` | DOM-based parsers replaced by JSON component mappers |
| `tools/importer/import-*.js` | Playwright-based import scripts replaced by JSON importer |
| `tools/importer/import-*.bundle.js` | Bundled versions of above |

## Checklist

### Phase 1: JSON API Exploration & Mapper Design
- [ ] Fetch and save `/de.model.json` locally for development reference
- [ ] Fetch and save `/de/elektromobilitaet.model.json` for a second template reference
- [ ] Document the complete component tree traversal algorithm (`:items` → `:itemsOrder` pattern)
- [ ] Catalog all `empty`, `emptyMedia`, `numberOfValidElements` patterns for visibility filtering
- [ ] Map all unique AEM `:type` values across all 7 templates to EDS blocks
- [ ] Design the richtext array → HTML converter (handle `htmlElement`, `textItem`, `disclaimer`, `nonBreakingSafeWord`, `lineBreak` kinds)
- [ ] Design the Scene7 → image URL resolver with format/size parameters

### Phase 2: Core JSON Importer
- [ ] Create `tools/importer/visibility-filter.js` — implements 7 filtering rules (empty, emptyMedia, numberOfValidElements, structural types, empty richtext, missing images, empty links)
- [ ] Create `tools/importer/scene7-resolver.js` — converts Scene7 refs to CDN URLs
- [ ] Create `tools/importer/richtext-converter.js` — converts VW richtext arrays to semantic HTML
- [ ] Create `tools/importer/component-mappers.js` — maps each AEM `:type` to EDS block HTML with xwalk field hints; calls visibility filter before emitting
- [ ] Create `tools/importer/json-importer.js` — fetches `.model.json`, walks tree, calls mappers, assembles `.plain.html`
- [ ] Add metadata extraction from `headerDataModel` (title, description, og:image, canonical)
- [ ] Add section break logic based on `sectionGroup` boundaries
- [ ] Unit test visibility filter against known empty components from homepage JSON

### Phase 3: CLI Runner & Batch Import
- [ ] Create `tools/importer/run-json-import.js` — CLI that takes URL list file, runs JSON importer for each
- [ ] Add error handling and retry logic for failed fetches
- [ ] Add progress reporting (X/Y pages, success/fail counts)
- [ ] Add Excel report generation (matching current report format)

### Phase 4: Import All 46 Pages
- [ ] Run JSON import for homepage template (1 page) — verify output
- [ ] Compare JSON-imported homepage against current DOM-imported version
- [ ] Run JSON import for emobility-hub (9 pages)
- [ ] Run JSON import for emobility-detail (29 pages)
- [ ] Run JSON import for emobility-tool (4 pages)
- [ ] Run JSON import for model-overview (1 page)
- [ ] Run JSON import for model-detail (1 page)
- [ ] Run JSON import for dealer (1 page)
- [ ] Verify total: 46 pages imported with 0 failures

### Phase 5: Quality Validation
- [ ] Preview homepage at localhost:3000 — verify all blocks render with real images
- [ ] Preview emobility hub — verify carousel content is complete (not empty cells)
- [ ] Preview model detail — verify specs and gallery content extracted
- [ ] Verify NO empty blocks appear (visibility filter working correctly)
- [ ] Verify NO structural wrappers leak into content (parsys, sectionGroup nodes filtered)
- [ ] Compare hero-stage block: JSON import should have real Scene7 image URL vs DOM import's placeholder
- [ ] Compare carousel-featured: JSON import should have all slides with images + text vs DOM import's empty cells
- [ ] Compare columns-teaser (focusTeaser): JSON import should have image + heading + body + link vs DOM import's partial extraction
- [ ] Verify xwalk field hints present in all block tables

### Phase 6: Cleanup
- [ ] Archive old DOM-based parsers to `tools/importer/legacy/`
- [ ] Archive old import scripts to `tools/importer/legacy/`
- [ ] Update migration plan document with JSON API approach
- [ ] Document the AEM component type → EDS block mapping for future reference
- [ ] Document the visibility filtering rules for maintainability

## Key Design Decisions

### Visibility Filter (Central Design Decision)

The visibility filter is a **pre-check** applied to every component node before the mapper runs. It answers one question: **"Would this component produce visible content on the page?"**

```javascript
function isVisible(component) {
  // Rule 1: Explicit empty flag
  if (component.empty === true) return false;
  
  // Rule 2: No children
  const items = component[':items'];
  const order = component[':itemsOrder'];
  if (items && Object.keys(items).length === 0) return false;
  if (order && order.length === 0) return false;
  
  // Rule 3: Section with no valid elements
  if (component.numberOfValidElements === 0) return false;
  
  // Rule 4: Structural-only types — not "visible" themselves, but recurse
  const type = component[':type'] || '';
  if (type.includes('structure/parsys') || type.includes('structure/sectionGroup')) {
    return 'recurse'; // Not visible itself, but children may be
  }
  
  // Rule 5: Empty richtext
  if (component.richtext && Array.isArray(component.richtext) && component.richtext.length === 0) {
    return false;
  }
  
  // Rule 6: Empty image
  if (component.emptyMedia === true) return false;
  if (type.includes('imageElement') && !component.image?.scene7File && !component.image?.damSrc) {
    return false;
  }
  
  // Rule 7: Empty link
  if (type.includes('linkElement') && !component.linkUrl) return false;
  
  return true;
}
```

The tree walker calls `isVisible()` at each node:
- `false` → skip node and all children
- `true` → pass to component mapper
- `'recurse'` → skip this node's own output but process children

### Richtext Conversion
VW's richtext format is an array of objects:
```json
[
  { "kind": "htmlElement", "tagName": "b", "children": [
    { "kind": "textItem", "copy": "Ein richtig guter Fang." }
  ]},
  { "kind": "textItem", "copy": " Den " },
  { "kind": "htmlElement", "tagName": "span", "children": [...] }
]
```
The converter must recursively walk this tree and produce semantic HTML: `<b>Ein richtig guter Fang.</b> Den <span>...</span>`

### Section Boundaries
The JSON tree has `sectionGroup` nodes that map to EDS sections. Each sectionGroup contains a `groupParsys` with the actual content components. Section breaks (`<hr>`) should be inserted between sectionGroups.

### Feature App Sections
`featureAppSection` components reference external React apps (car finder, configurator, model recommendations). These should be mapped to `embed-search` blocks with the app URL, since the actual content is rendered client-side and not available in the JSON.

### Dealer Pages
The dealer page is almost entirely `featureAppSection` + `featureAppContentItem` (91 KB of feature app config). There's minimal editorial content to extract — the JSON importer should handle this gracefully by creating embed blocks or placeholder content.

## Expected Improvements

| Metric | DOM-based (current) | JSON-based (new) |
|--------|---------------------|-------------------|
| Hero images | Base64 placeholders, often empty | Real Scene7 URLs, always present |
| Carousel content | Empty cells on many pages | Complete: image + heading + body + link for every slide |
| Focus teasers | Partial extraction (missing images) | Complete: image side + text side with all fields |
| Empty/invisible blocks | Sometimes rendered (no filter) | Filtered out by visibility rules |
| Import speed per page | 10-30 seconds (Playwright) | <1 second (HTTP fetch) |
| Total import time (46 pages) | ~15-20 minutes | ~30 seconds |
| Content fidelity | ~60-70% (DOM scraping losses) | ~95%+ (structured data) |
| Reliability | Flaky (React rendering, lazy load) | Deterministic (JSON is static) |
