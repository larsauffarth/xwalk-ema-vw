Let me first examine the dealer API to understand what data we can fetch server-side, and check the original page more carefully.Now let me check the original page screenshot more carefully and understand the visual layout.

Now I have a complete picture. Let me also check what blocks we already have that could be reused.# Dealer Page Static Rebuild Plan

## Overview

Rebuild the VW dealer page (`/de/haendler-werkstatt/volkswagen-automobile-hamburg-fruchtallee`) by fetching data from the VW dealer BFF APIs at import time and rendering it as static EDS content. The original page is 99% runtime feature apps; we'll convert the key sections into static HTML using existing blocks + 2-3 new blocks.

## Data Sources

| Source | URL | Data Provided |
|--------|-----|---------------|
| **model.json** | `volkswagen.de/de/haendler-werkstatt/volkswagen-automobile-hamburg-fruchtallee.model.json` | Dealer ID (44989), display name, legal name, signed `serviceConfigEndpoint` |
| **Dealer Search BFF** | `v3-71-0.ds.dcc.feature-app.io/bff-detail/dealer` | Address, phone, fax, email, GPS, departments, opening hours, ratings, reviews, services |
| **MyDealer BFF** | `v1-359-2.mydealer.feature-app.io/bff/shared/live` | Stage image, logo, intro headline + copy, CTA cards (Probefahrt, Angebot, Service) |

**Auth note:** Both BFFs require a `serviceConfigEndpoint` with a signature from the model.json. The import script will first fetch model.json to get the current signature, then call the BFFs.

## Target Page Structure (Mapped to EDS Blocks)

Sections map to what the original page shows (from screenshot analysis):

| # | Section | Original Content | EDS Block | Data Source |
|---|---------|-----------------|-----------|-------------|
| 1 | **Hero stage** | Navy background, dealer name, address, phone, opening hours, map thumbnail | `hero-dealer` (new) | Dealer Search BFF + MyDealer BFF |
| 2 | **"Wie können wir Ihnen weiterhelfen?"** | 4 CTA tiles (Probefahrt, Fahrzeugangebot, Servicetermin, Serviceanfrage) | `cards` (existing) | MyDealer BFF `nextStepsModule` |
| 3 | **Welcome text** | "Willkommen bei VW Automobile Hamburg" + intro paragraph | Default content | MyDealer BFF `stageSection` |
| 4 | **"Unsere aktuellen Angebote"** | Service & accessory offers heading + description | Default content | Heading from model.json, static intro text |
| 5 | **"Neu- & Gebrauchtwagen"** | Heading + link to vehicle search | Default content + `embed-search` | Heading + search link |
| 6 | **"Service, Teile & Zubehör"** | Service teasers (Economy Service, Auftragserweit., Fleet) | `carousel-featured` (existing) | Static content from known service offerings |
| 7 | **"Ihre qualifizierten Ansprechpartner"** | Contact persons heading | Default content | model.json headline |
| 8 | **Opening Hours detail** | Per-department hours table | `dealer-hours` (new) | Dealer Search BFF departments |
| 9 | **Ratings & Reviews** | Star rating + review excerpts | Default content | Dealer Search BFF ratings |
| 10 | **"Modell-Highlights"** | Model teaser cards | `carousel-featured` (existing) | Reuse from homepage content |
| 11 | **Metadata** | Title, description, canonical | Metadata block | model.json + BFF |

## New Blocks Needed

### 1. `hero-dealer` block
- **Layout:** Full-width navy background (like original stage area)
- **Content:** Dealer name (h1), address, phone, email, opening hours summary, map image/link
- **Fields:** name, address, phone, email, hours summary, map link
- **Desktop:** Two columns — left: dealer info + hours, right: map thumbnail
- **Mobile:** Stacked — info on top, map below

### 2. `dealer-hours` block
- **Layout:** Table showing per-department opening hours
- **Content:** Department name, Mon-Fri hours, Saturday hours, Sunday hours
- **Desktop:** Full table with all departments
- **Mobile:** Collapsed/accordion per department

## New Importer Module Needed

### `dealer-fetcher.js` (new file in `tools/importer/`)
- Fetches model.json to get dealer ID + signed serviceConfigEndpoint
- Calls Dealer Search BFF → extracts address, phone, email, hours, ratings, reviews, services
- Calls MyDealer BFF → extracts stage image, intro text, CTA actions
- Returns structured dealer data object

### Changes to `component-mappers.js`
- Add `mapDealerStage()` — generates `hero-dealer` block from BFF data
- Add `mapDealerHours()` — generates `dealer-hours` block from department data
- Add mapper for `featureAppSection` with `mydealer_*` anchor IDs
- Modify `mapFeatureApp()` to handle `mydealer_stage`, `mydealer_next_steps`, etc.

### Changes to `json-importer.js`
- Detect dealer pages (check for `mydealerPageOwner` in model.json)
- Pre-fetch dealer BFF data before walking the component tree
- Pass dealer data context to component mappers

## Checklist

### Infrastructure
- [ ] Create `tools/importer/dealer-fetcher.js` — fetch model.json → extract signed endpoint → call Dealer Search BFF + MyDealer BFF → return structured data
- [ ] Update `tools/importer/json-importer.js` — detect dealer pages, pre-fetch BFF data, pass as context to mappers

### New Blocks
- [ ] Create `blocks/hero-dealer/hero-dealer.js` — decoration for dealer hero (address, phone, hours)
- [ ] Create `blocks/hero-dealer/hero-dealer.css` — navy background, two-column layout, VW styling
- [ ] Create `blocks/hero-dealer/_hero-dealer.json` — xwalk component model
- [ ] Create `blocks/dealer-hours/dealer-hours.js` — per-department opening hours table
- [ ] Create `blocks/dealer-hours/dealer-hours.css` — responsive table/accordion styling
- [ ] Create `blocks/dealer-hours/_dealer-hours.json` — xwalk component model

### Mapper Updates
- [ ] Add `mapDealerStage()` to `component-mappers.js` — hero-dealer block from BFF stage data
- [ ] Add `mapDealerNextSteps()` to `component-mappers.js` — cards block from nextStepsModule CTAs
- [ ] Add `mapDealerHours()` to `component-mappers.js` — dealer-hours block from departments
- [ ] Add `mapDealerWelcome()` to `component-mappers.js` — default content from stageSection intro
- [ ] Add `mapDealerRatings()` to `component-mappers.js` — default content from ratings/reviews
- [ ] Update `mapFeatureApp()` dispatch for `mydealer_*` anchor IDs
- [ ] Register new mappers in `SECTION_MAPPERS`

### Content Generation
- [ ] Re-import dealer page with new mappers: `node tools/importer/run-json-import.js --urls <dealer-url>`
- [ ] Download dealer images (stage image, map thumbnail, icons)
- [ ] Verify generated `.plain.html` structure

### Styling & Preview
- [ ] Verify hero-dealer block renders on local preview
- [ ] Verify dealer-hours table renders correctly
- [ ] Verify cards block for CTA tiles
- [ ] Compare side-by-side with original page
- [ ] Fix any styling issues

### Metadata
- [ ] Ensure page title uses dealer display name
- [ ] Add description meta from dealer intro text
- [ ] Set canonical URL

## Risk & Limitations

- **API signatures may rotate** — the `serviceConfigEndpoint` signature is generated server-side. If it expires, the import will need to re-fetch model.json first. Current signature works at import time.
- **Dynamic content frozen at import** — ratings, reviews, vehicle inventory counts will be snapshot-in-time. This is acceptable for the static EDS approach.
- **Some sections remain headings-only** — "Unsere aktuellen Angebote" teaser cards are dealer-specific promotions from a CMS we don't have access to. These will show as section headings with generic placeholder text.
- **Map integration** — the original uses an interactive map. We'll use a static map image/link to Google Maps using the GPS coordinates (53.569332, 9.959192).

## Execution

This plan requires **Execute mode** to implement. Expected effort: ~15 steps across infrastructure, blocks, mappers, and verification.
