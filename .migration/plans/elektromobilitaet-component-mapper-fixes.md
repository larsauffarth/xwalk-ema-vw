# Fix Elektromobilität Content Import — Component Mapper Gaps

## Problem Summary

**25 of 41 elektromobilität pages (61%) are skeleton-only** — they contain hero headings and section headings but are missing all body text, images, bullet lists, and editorial teasers. The root causes are bugs and gaps in `tools/importer/component-mappers.js` and `tools/importer/visibility-filter.js`.

## Root Cause Analysis

### Bug 1: `mediaSingleItem` silently dropped (images lost)
- **Location:** `mapDefaultContent()` line 451
- **Cause:** Check is `type.includes('mediaElement') || type.includes('imageElement')` but `mediaSingleItem` has shortType `editorial/items/mediaSingleItem` — doesn't match either pattern
- **Impact:** All inline images inside `singleColumnSection` and `twoColumnsSection` are silently dropped
- **Affected pages:** 5+ confirmed (rekuperation, reichweite-im-winter, reichweite-der-id-modelle, ladestation-finden, garantie-lebensdauer, nachhaltigkeit, laden-zuhause)

### Bug 2: `statementItem` has no handler (quotes lost)
- **Location:** `mapDefaultContent()` — no case for `statementItem`
- **Cause:** Missing handler for `editorial/items/statementItem`, which contains a `richtextSimpleElement` child
- **Impact:** Statement/callout text dropped
- **Affected pages:** reichweite-der-id-modelle (confirmed)

### Gap 3: `simpleStageSection` not mapped (text-only hero lost)
- **Location:** `SECTION_MAPPERS` line 495 — no entry
- **Cause:** `simpleStageSection` is a text-only stage variant (heading + copy, no image/buttons) — different from `basicStageSection`
- **Impact:** Entire hero stage dropped on pages using this variant
- **Affected pages:** reichweite-der-id-modelle, ladestation-finden (confirmed)

### Gap 4: `editorialTeaserSection` not mapped (teaser cards lost)
- **Location:** `SECTION_MAPPERS` — no entry
- **Cause:** No mapper for the 3-card editorial teaser pattern. Each item has heading, image, link, category
- **Impact:** "Das könnte Sie auch interessieren" teaser cards dropped on all detail pages
- **Affected pages:** 18 pages have the heading; all are missing the actual teaser card content

### Gap 5: `accordionSection` not mapped (FAQ/accordion content lost)
- **Location:** `SECTION_MAPPERS` — no entry
- **Cause:** Different from `expandCollapseSection` (already mapped). Contains `accordionItem` children with `richtextFullElement`
- **Impact:** All accordion/FAQ content dropped
- **Affected pages:** garantie-lebensdauer, nachhaltigkeit, laden-unterwegs, laden-zuhause (confirmed)

### Gap 6: `firstLevelTeaserSection` not mapped
- **Location:** `SECTION_MAPPERS` — no entry
- **Affected pages:** ladestation-finden

### Gap 7: `highlightFeatureSection` not mapped
- **Location:** `SECTION_MAPPERS` — no entry
- **Affected pages:** laden-zuhause

### Gap 8: `featureAppSection` — Range Simulator variant unhandled
- **Location:** `mapFeatureApp()` — handles MOFA and schnellsuche, but Range Simulator falls through to generic handling
- **Affected pages:** reichweite-der-id-modelle

## Fix Plan

### Phase 1: Fix existing mappers (Bugs 1-2)
- [ ] **1.1** Add `mediaSingleItem` handler in `mapDefaultContent()` — extract nested `media` > `mediaElement` > `imageElement` and optional `caption`
- [ ] **1.2** Add `statementItem` handler in `mapDefaultContent()` — extract nested `statement` > `richtextSimpleElement` and render as styled paragraph or blockquote

### Phase 2: Add missing section mappers (Gaps 3-7)
- [ ] **2.1** Add `simpleStageSection` mapper → `hero-stage` block (heading + copy text, no image)
- [ ] **2.2** Add `editorialTeaserSection` mapper → `columns-teaser` block (3 cards with image + heading + link)
- [ ] **2.3** Add `accordionSection` mapper → default content (heading + expandable richtext items) or a new accordion block
- [ ] **2.4** Add `firstLevelTeaserSection` mapper → `columns-teaser` block (teaser with image + text + link)
- [ ] **2.5** Add `highlightFeatureSection` mapper → appropriate block or default content
- [ ] **2.6** Handle Range Simulator `featureAppSection` variant (embed or skip with comment)

### Phase 3: Re-import affected pages
- [ ] **3.1** Re-import the 4 reichweite pages (hub + 3 detail pages)
- [ ] **3.2** Re-import remaining affected elektromobilität detail pages (batterie/*, laden/*, software-und-konnektivitaet/*)
- [ ] **3.3** Verify re-imported pages have body text, images, editorial teasers via preview

### Phase 4: Verify in preview
- [ ] **4.1** Check each re-imported page renders correctly in local preview
- [ ] **4.2** Verify images load (Scene7 resolution + DAM paths)
- [ ] **4.3** Compare content completeness against original volkswagen.de pages

## Checklist

- [ ] 1.1 Fix `mediaSingleItem` handler in `mapDefaultContent()`
- [ ] 1.2 Fix `statementItem` handler in `mapDefaultContent()`
- [ ] 2.1 Add `simpleStageSection` mapper
- [ ] 2.2 Add `editorialTeaserSection` mapper
- [ ] 2.3 Add `accordionSection` mapper
- [ ] 2.4 Add `firstLevelTeaserSection` mapper
- [ ] 2.5 Add `highlightFeatureSection` mapper
- [ ] 2.6 Handle Range Simulator featureAppSection
- [ ] 3.1 Re-import reichweite pages (4 pages)
- [ ] 3.2 Re-import remaining affected pages
- [ ] 3.3 Verify content completeness
- [ ] 4.1 Preview verification
- [ ] 4.2 Image verification
- [ ] 4.3 Comparison against original site

## Scope & Decisions Needed

Before implementation, we need to decide on a few things:
- **editorialTeaserSection**: Map to `columns-teaser` (3-column with images)? Or create a new `editorial-teaser` block?
- **accordionSection**: Map to default content (heading + paragraphs)? Or create an accordion block?
- **Range Simulator featureApp**: Embed as iframe? Or skip with a placeholder heading + link?
- **firstLevelTeaserSection / highlightFeatureSection**: Need to inspect model.json structures before deciding the right mapping

## Files to Modify

| File | Changes |
|---|---|
| `tools/importer/component-mappers.js` | Add handlers for mediaSingleItem, statementItem; add mappers for simpleStageSection, editorialTeaserSection, accordionSection, firstLevelTeaserSection, highlightFeatureSection |
| `tools/importer/visibility-filter.js` | Possibly add `mediaSingleItem` to recurse list (or handle it directly in mapper) |
| `content/de/elektromobilitaet/**/*.plain.html` | Re-generated by re-running import |
