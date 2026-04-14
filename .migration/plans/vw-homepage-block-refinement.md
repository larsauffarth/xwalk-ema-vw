# VW Homepage — Content & Block Refinement Plan

## Current State Summary

The homepage (`/de`) has been imported via JSON API from `de.model.json`, with 95 images uploaded to AEM DAM at `/content/dam/xwalk-ema-vw/`. The content has been uploaded to AEM and is live at `https://main--xwalk-ema-vw--larsauffarth.aem.live/de`. Block code (JS/CSS/JSON) has been refined with updated styles matching the original VW site.

### What's Working
- **hero-stage** block renders correctly with image, heading (bold/regular mixed), and CTA
- **carousel-featured** block renders slides with images, headings, text, and CTAs
- **columns-teaser** block renders two-column text teasers
- All 95 images in AEM DAM with correct `/content/dam/xwalk-ema-vw/media_*.png` paths
- VW brand fonts (`vw-head`, `vw-text`) installed and rendering
- Header and footer implemented with VW design

### Issues Found on Live Page

#### Issue 1: Section headings render `<strong>` as escaped text
**Affected:** All default-content section headings outside blocks
**Symptom:** Headings like "Volkswagen erleben", "Angebote und Aktionen" show literal `<strong>` text instead of bold.
**Root cause:** `<h2><b>Volkswagen erleben</b></h2>` → EDS converts `<b>` to `<strong>` → xwalk escapes `<strong>` in default content headings.
**Fix:** Strip `<b>` tags from default content headings. CSS handles bold via `font-weight: 700`.

#### Issue 2: embed-search iframes the current page into itself
**Affected:** Homepage — two `embed-search` blocks (MOFA and Quick Search)
**Symptom:** The `embed-search` blocks create iframes that load the current page (`href="#"` resolves to self-URL), causing the page to embed itself.
**Root cause:** Two problems:
  1. **Content issue:** The JSON importer outputs `<a href="#">Feature App</a>` for `featureAppSection` components because it has no meaningful URL to use. The `#` href resolves to the current page URL.
  2. **JS issue:** `embed-search.js` blindly creates an iframe from any `<a>` href without checking if it's `#`, empty, or a self-reference.
**Fix (JS):** Guard against invalid URLs in `embed-search.js` — skip iframe creation if href is `#`, empty, or same-origin self-reference. Show a static placeholder instead.
**Fix (Content):** For MOFA feature app, output a `cards-model` block with static model data OR a meaningful link to `/de/modelle.html` instead of `embed-search` with `href="#"`. For Quick Search, link to `/de/modelle/verfuegbare-fahrzeuge.html` (the car search page).

#### Issue 3: Missing "Beliebte Modelle" section
**Affected:** Homepage — missing section between "Modell-Highlights" and "Finden Sie Ihren Volkswagen"
**Symptom:** Original VW site has a "Beliebte Modelle" carousel with model cards (Tiguan, Golf, ID.3) showing prices and configure buttons.
**Root cause:** Powered by MOFA feature app (external JS, runtime-loaded). `model.json` has only a `featureAppSection` config — no model data. Our importer mapped it to `embed-search` with `href="#"` which causes the self-iframe issue above.
**Fix:** Replace the MOFA `embed-search` with a `cards-model` block containing static model data, OR remove the embed-search and add a meaningful default content section with heading + link to models page.

#### Issue 4: Missing secondary CTA in hero
**Affected:** Homepage hero-stage block
**Symptom:** Original has "Mehr zum Tiguan Angebot" + "Jetzt Probefahrt anfragen". We only have the first.
**Fix:** Update JSON importer to extract `secondaryButton`.

#### Issue 5: Missing metadata block
**Affected:** All pages
**Symptom:** No page title, description, OG tags.
**Fix:** Update metadata extraction path to `data[':items'].root.headerDataModel`.

#### Issue 6: Nested `<p>` tags in body text
**Affected:** All pages with richtext content
**Symptom:** `<p><p>text</p></p>` double-wrapping.
**Fix:** Don't add `<p>` wrapper when richtext already contains block-level elements.

#### Issue 7: `cards-model` block unused (0 pages)
**Affected:** Block inventory
**Fix:** Use for "Beliebte Modelle" static recreation, or remove.

## Checklist

### Phase 1: Fix embed-search Self-Iframe (Critical)
- [ ] Fix `embed-search.js` — add guard: skip iframe creation if href is `#`, empty, or resolves to same page. Show a static fallback instead (e.g., keep the placeholder div with a "View content" link).
- [ ] Fix JSON importer `mapFeatureApp` — for MOFA (anchor `MOFA`), output a meaningful section: heading "Beliebte Modelle" + link "Alle Modelle anzeigen" → `/de/modelle.html`. Don't output `embed-search` for MOFA.
- [ ] Fix JSON importer `mapFeatureApp` — for Quick Search (anchor `schnellsuche`), output embed-search with href `/de/modelle/verfuegbare-fahrzeuge.html` instead of `#`.
- [ ] Push JS fix and verify on live page — no more self-iframe

### Phase 2: Fix Other JSON Importer Issues
- [ ] Fix section headings — strip `<b>` tags from default content headings
- [ ] Fix nested `<p>` tags — don't double-wrap block-level content
- [ ] Fix metadata extraction — read from `data[':items'].root.headerDataModel`
- [ ] Fix secondary button — extract `secondaryButton` in `mapHeroStage`
- [ ] Re-import homepage and verify all fixes

### Phase 3: Re-import All 46 Pages
- [ ] Re-run JSON import for all pages with fixed importer
- [ ] Re-run image download (catch any new images)
- [ ] Re-run DAM path rewrite on all content files
- [ ] Verify metadata block present on all pages
- [ ] Verify no escaped `<strong>` in section headings
- [ ] Verify no nested `<p>` tags
- [ ] Verify no `href="#"` in any embed-search blocks

### Phase 4: Upload Fixed Content to AEM
- [ ] Upload any new images to AEM DAM
- [ ] Re-upload all 46 pages via the agent UI
- [ ] Verify homepage renders correctly on live EDS URL
- [ ] Verify no self-iframe on any page
- [ ] Verify section headings display as bold text (not escaped tags)
- [ ] Verify metadata (page title, description) is set correctly

### Phase 5: Visual Comparison per Block
- [ ] **hero-stage**: Compare at 1440px, 768px, 375px — both CTAs, heading font-weight 200/700
- [ ] **carousel-featured**: Slide layout, image overlay gradient, text positioning, nav dots
- [ ] **columns-teaser**: Focus teaser (58/42 split) and text-only teaser (equal columns)
- [ ] **"Beliebte Modelle" section**: Verify heading + models link renders meaningfully
- [ ] **Default content**: Section headings, body text, links with VW typography

### Phase 6: Block Inventory Cleanup
- [ ] Decide: use `cards-model` for static "Beliebte Modelle" OR keep heading+link approach
- [ ] Verify all block xwalk JSON models registered in `component-definition.json`
- [ ] Ensure `component-models.json` and `component-filters.json` are up to date

## Technical Details

### embed-search JS Fix
```javascript
// In embed-search.js: guard against invalid URLs
const url = link.href;
const isInvalid = !url || url === '#' || url.endsWith('#')
  || url === window.location.href
  || url === window.location.href + '#';

if (isInvalid) {
  // Don't create iframe — keep placeholder with link text
  return;
}
```

### MOFA Feature App → Static Content
Instead of `embed-search` with `href="#"`, the JSON importer should output for MOFA:
```html
<h2>Beliebte Modelle</h2>
<p><a href="/de/modelle.html">Alle Modelle anzeigen</a></p>
```
This gives a meaningful section that links to the models page without the iframe issue.

### Quick Search Feature App → Meaningful Link
Instead of `embed-search` with `href="#"`, output:
```html
<div class="embed-search">
  <div><div><!-- field:embed_placeholder --><!-- field:embed_uri -->
    <p><a href="/de/modelle/verfuegbare-fahrzeuge.html">Fahrzeugsuche</a></p>
  </div></div>
</div>
```

### Section Heading Fix
```javascript
// Strip <b>/<strong> from default content headings
// Before: <h2><b>Volkswagen erleben</b></h2>
// After:  <h2>Volkswagen erleben</h2>
```

### Nested `<p>` Fix
```javascript
const content = richtextToHtml(rt.richtext);
if (content.trim().startsWith('<p>') || content.trim().startsWith('<ul>')) {
  return content; // already block-level
}
return `<p>${content}</p>`;
```

### Metadata Path Fix
```javascript
// data[':items']?.root?.headerDataModel
// Contains: pageTitle, description, ogTitle, ogDescription, ogImage, canonicalUrl, language
```
