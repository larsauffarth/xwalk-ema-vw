# Elektromobilitaet Page Visual Alignment Review

## Summary

Comparison of the migrated page (`/de/elektromobilitaet`) against the original (`volkswagen.de/de/elektromobilitaet.html`) on desktop viewport. Current estimated alignment: **~65%**. Target: **98%**.

---

## Original Page Structure (10 sections)

| # | Original Component | Type | EDS Block | Status |
|---|---|---|---|---|
| 1 | Hero "Willkommen in der Welt..." | `basicStageSection` | `hero-stage` | ✅ Renders correctly |
| 2 | Intro paragraph "Mit einem ID. von Volkswagen..." | Default content | — | ❌ **Missing** |
| 3 | "Unsere ID. Modelle" + 13-car model slider | `headingSection` + `contentSliderSection` | — | ❌ **Missing** (only heading) |
| 4 | "Elektrofahrzeugkonzepte" focus teaser | `focusTeaserSection` (img LEFT) | `columns-teaser` | ⚠️ **Wrong block loading** |
| 5 | "Mehr zu Reichweite und Laden" + 3 USP cards | `headingSection` + `uspSection` | `carousel-featured` | ✅ Content matches |
| 6 | "Ladelösungen" + 3 items | `headingSection` + `expandCollapseSection` | `carousel-featured` | ✅ Acceptable mapping |
| 7 | "Alles rund um die Batterie" focus teaser | `focusTeaserSection` (img LEFT) | `columns-teaser` | ⚠️ **Wrong block loading** |
| 8 | "Kosten und Kauf" focus teaser | `focusTeaserSection` (img **RIGHT**) | `columns-teaser` | ⚠️ **Wrong block** + **missing image-right** |
| 9 | "Software und Konnektivität" focus teaser | `focusTeaserSection` (img LEFT) | `columns-teaser` | ⚠️ **Wrong block loading** |
| 10 | "ID. erleben" + 3 sub-teasers (ID Experience, Drivers Club, Gläserne Manufaktur) | `sectionGroup` + teasers | — | ❌ **Missing** (only heading) |

---

## Block-by-Block Analysis

### Block 1: Hero Stage ✅ (~95% aligned)
- **Rendering:** Correct — full-width image + text bar below with heading
- **Minor issues:**
  - Verify heading font-weight (should be 200 with `<b>` bold parts at 700)
  - Confirm CTA buttons are absent (original hero for this page has no CTAs, just heading)
- **Action needed:** Minor CSS verification only

### Block 2: columns-teaser → columns 🔴 (CRITICAL — ~40% aligned)
- **Root cause:** `columns-teaser` class in `.plain.html` is being resolved as the generic `columns` boilerplate block instead of the custom `columns-teaser` block
- **Evidence:** `data-block-name="columns"` in rendered DOM; wrapper class is `columns-wrapper` not `columns-teaser-wrapper`
- **Affects:** 4 sections (Elektrofahrzeugkonzepte, Batterie, Kosten und Kauf, Software)
- **Visual impact:** Generic columns renders as simple stacked layout (flex-direction: column) instead of the 58/42 image-text split with proper typography
- **Action needed:**
  - [ ] Investigate why EDS resolves `columns-teaser` to `columns` (possible block-name prefix matching)
  - [ ] Fix block resolution — may need to rename block or adjust content class
  - [ ] Verify `columns-teaser.css` renders correctly once loaded

### Block 3: columns-teaser image-right variant 🔴 (MISSING)
- **Original:** "Kosten und Kauf" section has `flex-direction: row-reverse` (image on RIGHT side)
- **Local:** Even if columns-teaser loaded correctly, there is no image-right variant support
- **Action needed:**
  - [ ] Add image-right variant to `columns-teaser` (e.g., section metadata `style: image-right` or class-based toggle)
  - [ ] Update content HTML for "Kosten und Kauf" to use the variant

### Block 4: carousel-featured ✅ (~85% aligned)
- **"Mehr zu Reichweite und Laden"** — 3 cards with image + text overlay on gradient background
- **"Ladelösungen"** — 3 cards with image + heading + CTA link
- **Visual differences to verify:**
  - [ ] Card image height and aspect ratio matches original USP cards
  - [ ] Gradient overlay color and opacity matches (navy gradient `rgb(0 30 80 / 80%)`)
  - [ ] Desktop layout: 3-column grid (not bento) — verify this is the default
  - [ ] CTA button styling within cards (pill buttons vs text links)
  - [ ] Original "Ladelösungen" is expandCollapse, mapped to carousel — acceptable but visually different

### Block 5: Section headings (default content) ⚠️ (~80% aligned)
- **Original:** Section headings ("Mehr zu Reichweite und Laden", etc.) are centered, `vw-head` font, light weight (200)
- **Local:** Rendered as default content `<h2>` — need to verify:
  - [ ] Font family: `vw-head` ✓ (set in styles.css)
  - [ ] Font weight: 200 ✓ (set in styles.css)
  - [ ] Text alignment: centered ✓ (`.default-content-wrapper` has `text-align: center`)
  - [ ] Font size: fluid clamp matches original
  - [ ] Spacing below heading before block

---

## Content Gaps (Missing Sections)

### Gap 1: Intro paragraph below hero ⚠️
- **Original:** "Mit einem ID. von Volkswagen beginnt mehr als nur die nächste Fahrt: Es entsteht ein neues Gefühl von Mobilität..." — centered paragraph below the hero
- **Local:** Not present in `.plain.html`
- **Action needed:**
  - [ ] Add intro paragraph as default content between hero and "Unsere ID. Modelle" heading
  - [ ] Verify it renders as centered body text

### Gap 2: "Unsere ID. Modelle" content slider 🟡
- **Original:** Interactive horizontal carousel with 13 car model cards (ID.3, ID.3 GTX, ID.4, etc.) — each card has: car image, model name, energy stats, price, CTA buttons
- **Local:** Only the heading exists
- **Complexity:** HIGH — this is a complex interactive component (`contentSliderSection`) with model-specific data
- **Action needed:**
  - [ ] **Decision required:** Is this in scope? Options:
    - (a) Create a new `content-slider` / `model-carousel` block → HIGH effort
    - (b) Use `carousel-featured` with model card data → MEDIUM effort, approximate match
    - (c) Mark as out-of-scope (runtime dynamic content from VW model database) → LOW effort
  - [ ] If in scope: generate content + create/adapt block

### Gap 3: "ID. erleben" sub-teasers 🟡
- **Original:** 3 focus teasers below the heading:
  - "ID. Experience 2025: Mit dem ID. auf Entdeckungsreise durch Skandinavien" (image + text + link)
  - "Der ID. Drivers Club: Gemeinsam elektrisch unterwegs." (image + text + link)
  - "Ein Besuch bei der ID. Familie: die Gläserne Manufaktur in Dresden." (image + text + link)
- **Local:** Only the heading "ID. erleben" exists
- **Action needed:**
  - [ ] Add 3 `columns-teaser` blocks (once columns-teaser loading is fixed)
  - [ ] Import images for these sections
  - [ ] Update content HTML with proper block structure

---

## Checklist

### P0 — Critical (blocks broken)
- [ ] **Fix `columns-teaser` block resolution** — investigate why `columns-teaser` resolves to generic `columns` block; fix block loading so all 4 focus teasers render correctly
- [ ] **Add image-right variant to `columns-teaser`** — "Kosten und Kauf" needs image on right side (`flex-direction: row-reverse`)
- [ ] **Verify `columns-teaser` visual fidelity** once loaded — 58/42 image-text split, typography, link styling

### P1 — Content gaps
- [ ] **Add intro paragraph** below hero — "Mit einem ID. von Volkswagen beginnt mehr als nur die nächste Fahrt..."
- [ ] **Decision: "Unsere ID. Modelle" content slider** — scope in or out? (13 car model cards)
- [ ] **Add "ID. erleben" sub-teasers** — 3 focus teasers with images, text, and links
- [ ] **Import missing images** for ID. erleben teasers

### P2 — Visual refinements
- [ ] **carousel-featured card styling** — verify gradient overlay, card height, CTA styling matches original
- [ ] **Section spacing** — verify `--spacing-section` (100px on desktop) matches original spacing between sections
- [ ] **Heading typography** — verify section headings match original (size, weight, spacing)
- [ ] **"Ladelösungen" section** — original uses expand/collapse, local uses carousel-featured — verify visual acceptability

### P3 — Nice-to-have
- [ ] Side-by-side screenshot comparison after all fixes
- [ ] Mobile viewport review (separate effort)

---

## Estimated Impact

| Fix | Alignment Gain |
|-----|---------------|
| Fix columns-teaser block loading | +15% (4 sections fixed) |
| Add image-right variant | +3% |
| Add intro paragraph | +2% |
| Add ID. erleben teasers | +5% |
| Unsere ID. Modelle slider | +5-8% |
| Visual refinements | +3-5% |
| **Total projected** | **~93-98%** |

---

## Execution Notes

- To reach 98%, the columns-teaser fix is the highest-priority item (affects 4 of 10 sections)
- The "Unsere ID. Modelle" slider decision is the biggest scope question — without it, max alignment is ~93%
- All content changes require re-import via the JSON importer pipeline (no direct HTML editing)
- Implementation requires exiting plan mode
