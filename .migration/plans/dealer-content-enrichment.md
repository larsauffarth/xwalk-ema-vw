Let me first understand what other dealer page content sections from the original page still need to be addressed.Now let me review the original page screenshot to understand what's still missing, and check what BFF data we already have that could fill the gaps.# Dealer Page Content Enrichment Plan

## Overview

Enrich the existing dealer page (`/de/haendler-werkstatt/volkswagen-automobile-hamburg-fruchtallee`) by fetching additional content from VW teaser BFF endpoints and the Dealer Search BFF. The page already has hero, CTAs, welcome text, hours, and ratings. This plan fills the remaining empty section headings with real content.

## Current State vs. Target

| Section | Current State | Target State | Data Source |
|---------|--------------|--------------|-------------|
| Hero dealer | ✅ Complete | ✅ No changes | — |
| Next Steps CTAs | ✅ Complete | ✅ No changes | — |
| Welcome text | ✅ Complete | ✅ No changes | — |
| Opening hours | ✅ Complete | ✅ No changes | — |
| Ratings & Reviews | ✅ Complete | ✅ No changes | — |
| **Services list** | ❌ Missing | Dealer capabilities badges | Dealer Search BFF `services[]` |
| **Unsere aktuellen Angebote** | ⚠️ Heading only | Heading + "Service & Zubehör" focus teaser | MyDealer BFF `/bff/teaser/live?slot=dcc-ws` (via bulk) |
| **Neu- & Gebrauchtwagen** | ⚠️ Heading + embed | Add vehicle count + dealer search link | Already available (embed-search) |
| **Service, Teile & Zubehör** | ⚠️ Heading only | 5 service cards with images + CTAs | MyDealer BFF `/bff/teaser/live?slot=service-highlights` |
| **Ansprechpartner** | ❌ Missing | Contact persons with name, role, phone, email | Dealer Search BFF `departmentContacts[]` |
| **Modell-Highlights** | ⚠️ Heading only | 5 model cards with images + CTAs | MyDealer BFF `/bff/teaser/live?slot=vw-modelle` |
| **Map / Directions** | ❌ Missing | Static map link using GPS coordinates | Dealer Search BFF `coordinates` |

## Data Sources to Add

### 1. MyDealer Teaser BFF (new endpoint)
**URL pattern:** `${baseUrl}/bff/teaser/live?dealerId=${id}&dealerPath=${id}&slot=${slotName}&endpoint=${encodedEndpoint}&env=prod&language=de&oneapiKey=${apiKey}`

| Slot | Returns | Use For |
|------|---------|---------|
| `service-highlights` | 5 cards: headline, body, image (Scene7), CTA link | "Service, Teile & Zubehör" section |
| `vw-modelle` | 5 cards: headline, image (1920x1080), CTA link | "Modell-Highlights" section |

### 2. Dealer Search BFF (already fetched, extract more data)

| Field | Returns | Use For |
|-------|---------|---------|
| `departments[].departmentContacts[]` | 23 contact persons with firstname, lastname, position, email, phone | "Ansprechpartner" section |
| `services[]` | 11 services with key, icon, translatedService | Services badges/list |
| `coordinates` | `[53.569332, 9.959192]` | Google Maps link |

## Implementation Details

### A. Update `dealer-fetcher.js`

1. **Add teaser BFF fetcher** — new function `fetchDealerTeasers(dealerId, config, slots)` that fetches multiple teaser slots in parallel
2. **Extract department contacts** — already in Dealer Search BFF response but not mapped; add to `buildDealerResult()`
3. **Return new fields:**
   - `teasers.serviceHighlights[]` — cards from `service-highlights` slot
   - `teasers.modelHighlights[]` — cards from `vw-modelle` slot
   - `departmentContacts[]` — named contact persons per department
   - `servicesLabels[]` — translated service names for badges

### B. Update `buildDealerPage()` in `json-importer.js`

Insert new content sections in page order:

1. After ratings section, add **Services badges** — inline list of dealer capabilities
2. Replace empty **"Unsere aktuellen Angebote"** heading with heading + descriptive text
3. Keep **"Neu- & Gebrauchtwagen"** as-is (heading + embed-search is correct)
4. Replace empty **"Service, Teile & Zubehör"** heading with `carousel-featured` block containing 5 service highlight cards (image + heading + body + CTA)
5. Add **"Ihre qualifizierten Ansprechpartner"** section with contact persons in a `cards` block (name, role, phone, email per card)
6. Replace empty **"Modell-Highlights"** heading with `carousel-featured` block containing 5 model cards (image + heading + CTA)
7. Add **Directions/Map** link using Google Maps URL from GPS coordinates

### C. New block needed: None

All new sections use existing blocks:
- **Service highlights** → `carousel-featured` (image cards with overlay text)
- **Model highlights** → `carousel-featured` (image cards with overlay text)
- **Ansprechpartner** → `cards` (text-only cards with name/role/contact)
- **Services list** → default content (inline badges or list)
- **Map** → default content (link to Google Maps)

## Teaser Card HTML Structure

The teaser BFF returns cards with this structure (per card):
```json
{
  "headline": "Economy Service Rabattaktion",
  "copy": "Bis zu 30% Rabatt auf Ihren nächsten Werkstattbesuch...",
  "image": { "src": "https://assets.volkswagen.com/is/image/...", "alt": "..." },
  "cta": { "label": "Mehr erfahren", "url": "/de/..." }
}
```

Map to `carousel-featured` rows:
```html
<div class="carousel-featured">
  <div>
    <div><!-- field:media_image --><picture><img src="..." alt="..."></picture></div>
    <div><!-- field:content_text --><h2>Economy Service Rabattaktion</h2><p>Bis zu 30% Rabatt...</p><p><a href="/de/...">Mehr erfahren</a></p></div>
  </div>
  ...
</div>
```

## Checklist

### Data Fetching
- [ ] Add `fetchDealerTeasers()` to `dealer-fetcher.js` — fetch `service-highlights` and `vw-modelle` slots in parallel
- [ ] Extract `departmentContacts[]` from Dealer Search BFF response in `buildDealerResult()`
- [ ] Extract `services[]` labels from Dealer Search BFF response in `buildDealerResult()`
- [ ] Add `coordinates` to structured result for map link generation

### Content Generation (json-importer.js)
- [ ] Add services badges/list section after ratings
- [ ] Fill "Service, Teile & Zubehör" with `carousel-featured` from `service-highlights` teaser cards
- [ ] Fill "Modell-Highlights" with `carousel-featured` from `vw-modelle` teaser cards
- [ ] Add "Ihre qualifizierten Ansprechpartner" section with `cards` block from `departmentContacts`
- [ ] Add Google Maps directions link using `coordinates`
- [ ] Add descriptive text under "Unsere aktuellen Angebote" heading

### Import & Verify
- [ ] Re-import dealer page with enriched content
- [ ] Download new images (service + model teaser images)
- [ ] Preview and verify all new sections render correctly
- [ ] Compare side-by-side with original page screenshot

## Execution

This plan requires **Execute mode** to implement. Estimated: ~8 implementation steps, reusing existing blocks and BFF infrastructure.
