# Quick Search Fragment & search-form Block Plan

## Summary

Replace the current `embed-search` block usage (which either iframes an external URL or shows a fallback CTA button) with a **shared fragment** containing a new `search-form` block. The `search-form` block visually recreates the VW "Schnellsuche" filter bar (dropdowns + search button) as static, non-functional UI that matches the original volkswagen.de design.

## Current State

- **`embed-search` block** exists in 3 pages:
  - `content/de.plain.html` (homepage) — inside a dark section with heading "Finden Sie Ihren Volkswagen"
  - `content/de/modelle/id-7-gtx.plain.html` — inside a dark section, no heading
  - `content/de/haendler-werkstatt/volkswagen-automobile-hamburg-fruchtallee.plain.html` — with heading "Neu- & Gebrauchtwagen"
- Currently renders as a fallback CTA button ("Fahrzeugsuche") because the link `href="/de/modelle/verfuegbare-fahrzeuge.html"` is same-origin (iframe guard blocks it)
- Original VW site shows a filter bar with dropdowns (Modell, Preis, Antrieb, etc.) + "Fahrzeuge anzeigen" button on navy background

## Architecture

```
content/de/fragments/search/index.plain.html   ← fragment file
  └─ contains: <div class="search-form">...</div>  ← new block

blocks/search-form/
  ├─ search-form.js       ← decoration logic (renders filter UI from block content)
  ├─ search-form.css      ← styling to match VW Schnellsuche
  └─ _search-form.json    ← xwalk model definition

Each page that uses the search:
  └─ <div class="fragment"><a href="/de/fragments/search">...</a></div>
     (+ own section heading + own section-metadata style:dark)
```

## Design Approach

The `search-form` block content in the fragment will contain the filter configuration as block rows (label + placeholder pairs). The JS will render these as styled `<select>` dropdowns. The CTA button links to `/de/modelle/verfuegbare-fahrzeuge.html`.

**Visual target:** Match the VW Schnellsuche filter bar — horizontal row of dropdown selectors with labels, plus a primary search button, all on the dark navy background (provided by section `style: dark`).

## Checklist

### Phase 1: Capture original design
- [ ] Screenshot the original VW Schnellsuche UI on `volkswagen.de/de` at desktop width
- [ ] Document the filter labels, placeholder text, and layout dimensions

### Phase 2: Create search-form block
- [ ] Create `blocks/search-form/search-form.js` — reads block rows as filter config, renders `<select>` dropdowns + search button
- [ ] Create `blocks/search-form/search-form.css` — match VW Schnellsuche visual design (horizontal filter row, navy integration, VW typography)
- [ ] Create `blocks/search-form/_search-form.json` — xwalk model with fields for filters and CTA

### Phase 3: Create fragment
- [ ] Create `content/de/fragments/search/` directory
- [ ] Create `content/de/fragments/search/index.plain.html` containing the `search-form` block with filter data (Modell, Preis, Antrieb, etc.)

### Phase 4: Update importer
- [ ] Update `mapFeatureApp()` in `tools/importer/component-mappers.js` to emit a `fragment` block referencing `/de/fragments/search` instead of `embed-search`
- [ ] Keep section heading generation as-is (each page has its own heading from the sectionGroup)

### Phase 5: Update page content
- [ ] Update `content/de.plain.html` — replace `embed-search` block with `fragment` referencing `/de/fragments/search`
- [ ] Update `content/de/modelle/id-7-gtx.plain.html` — same replacement
- [ ] Update `content/de/haendler-werkstatt/volkswagen-automobile-hamburg-fruchtallee.plain.html` — same replacement

### Phase 6: Verify
- [ ] Restart `aem up` and verify the fragment loads on the homepage preview
- [ ] Verify the search-form renders with filter dropdowns and button
- [ ] Verify dark section styling works around the fragment
- [ ] Compare visual output against original VW Schnellsuche screenshot

### Phase 7: Cleanup (optional)
- [ ] Decide whether to keep or remove the `embed-search` block (may be used for other feature apps)

## Key Decisions Made
- **Fragment scope:** Block-only (no heading, no section metadata) — each page keeps its own heading and dark styling
- **UI detail:** Detailed mockup matching original VW Schnellsuche (filter dropdowns + button)
- **Design source:** Match original VW design captured from volkswagen.de
- **Architecture:** New `search-form` block (not default content) for clean separation and reusability
- **The search is non-functional** — static visual recreation only
