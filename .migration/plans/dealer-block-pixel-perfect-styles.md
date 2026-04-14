# Dealer Page Desktop Pixel-Perfect Plan

## Original VW Page — Extracted Design Specs (at 1280px)

### Global Typography
| Element | Original VW | Current EDS |
|---------|-------------|-------------|
| **Section h2** | `46.3px`, weight `200`, `vw-head`, `text-align: center` | `clamp(1.75rem, 0.44vw + 1.59rem, 2rem)` ≈ `32px`, weight `200`, `vw-head`, `text-align: left` |
| **h1 (dealer name)** | `33.3px`, weight `200`, `vw-head`, white, `max-width: 907px` | `clamp(2.5rem, 0.88vw + 2.19rem, 3.25rem)` ≈ `42px`, weight `700` |
| **Body text** | `16px`, weight `400`, `vw-text`, `line-height: 1.15` | `16px`, weight `400`, `vw-text`, `line-height: 1.5` |
| **Overline (above h1)** | `14px`, weight `400`, `vw-text`, white, `margin-bottom: 4px` | Missing |

### Section-by-Section Deltas

---

### 1. Hero Dealer

**Original layout:** CSS Grid `746px | 53px gap | 374px | 107px`. Full-width navy, height ~560px. Image fills left column. Info panel in 3rd column, vertically centered.

| Property | Original | Current EDS | Fix |
|----------|----------|-------------|-----|
| Container layout | `display: grid; grid-template-columns: 746px 53px 374px 107px` | `flex; 50%/50%` | Switch to grid with ~58% image / gap / ~29% text / margin |
| Container height | `560px` | `min-height: 480px` | Set `min-height: 560px` |
| h1 font-size | `33.3px` (weight 200) | `clamp(1.75rem…2.5rem)` (weight 700) | Override to `~2.08rem`, weight `200` |
| h1 max-width | `907px` | none | Add `max-width: 907px` |
| Overline "Verkauf und Service" | `14px`, white, above h1 | Missing entirely | Add overline text to importer output |
| Info text color | `rgb(255,255,255)` | `rgb(255 255 255 / 85%)` | Change to full white |
| Info panel vertical position | Centered in grid row | `align-items: flex-start` | Change to `center` or match vertical centering |

---

### 2. Cards ("Wie können wir Ihnen weiterhelfen?")

**Original layout:** 4 icon tiles in a row, centered below a centered h2. Each tile has an icon + heading + description.

| Property | Original | Current EDS | Fix |
|----------|----------|-------------|-----|
| Section h2 | `46.3px`, weight `200`, centered | `~32px`, weight `200`, left-aligned | Increase font-size, add `text-align: center` |
| Card layout | Icon tiles with borders, 4-col grid | `cards` block (list items) | Cards block already renders 4-col grid — OK |
| Card border | `1px solid #dfe4e8`, `border-radius: 8px` | Depends on cards block CSS | Verify cards have border + radius |
| Section padding | Generous vertical spacing | Standard section margin | May need `padding: 80px 0` |

---

### 3. Welcome Text

| Property | Original | Current EDS | Fix |
|----------|----------|-------------|-----|
| h2 | `46.3px`, weight `200`, centered | `~32px`, weight `200`, left | Increase size, center |
| Paragraph | `16px`, `vw-text`, centered, `max-width: ~854px`, `margin: 0 auto` | Left-aligned, full width | Center text, constrain width |

---

### 4. Dealer Hours

| Property | Original | Current EDS | Fix |
|----------|----------|-------------|-----|
| Table layout | Feature app with collapsible departments | 3-col grid table | Already good — grid layout matches |
| Max width | ~854px centered | `800px` centered | Close match — OK |
| Header | Bold labels | Bold uppercase labels | Already correct |

---

### 5. Unsere Leistungen / Bewertungen / Angebote (default content sections)

| Property | Original | Current EDS | Fix |
|----------|----------|-------------|-----|
| h2 | `46.3px`, weight `200`, centered | `~32px`, left | Match size + center |
| Section spacing | Large vertical gaps between sections | `margin: 40px 16px` | Need more vertical spacing between sections |

---

### 6. Service Teile & Zubehör (carousel-featured)

| Property | Original | Current EDS | Fix |
|----------|----------|-------------|-----|
| Section h2 | `46.3px`, weight `200`, centered | Matches (already in carousel-featured CSS) | Verify center alignment |
| Card grid | 3-col grid with image cards | 3-col grid | Already matches |
| Card height | ~380px | `min-height: 380px` | Already matches |

---

### 7. Ansprechpartner (cards)

| Property | Original | Current EDS | Fix |
|----------|----------|-------------|-----|
| h2 | `46.3px`, weight `200`, centered | `~32px`, left | Match size + center |
| Card layout | 2-col grid with photo + info | 4-col text cards | Different structure but acceptable |
| Card content | Photo, name, role, phone | Name, role, dept, phone, email | OK — more info is fine |

---

### 8. Modell-Highlights (carousel-featured)

| Property | Original | Current EDS | Fix |
|----------|----------|-------------|-----|
| Section h2 | `46.3px`, weight `200`, centered | Matches | Already correct |
| Card grid | 3-col image cards | 3-col image cards | Already matches |

---

### 9. Anfahrt

| Property | Original | Current EDS | Fix |
|----------|----------|-------------|-----|
| h2 | Centered | Left-aligned | Center |
| Link style | VW CTA link | Default link | Style as CTA |

---

## Key Findings — Three Major Differences

1. **Section h2 headings are too small and left-aligned.** Original: `46.3px`, weight `200`, `text-align: center`. Our global `h2` is `clamp(1.75rem…2rem)` ≈ `32px`, left-aligned. This is the **single biggest visual difference** across the entire page.

2. **Hero h1 is too large and too bold.** Original: `33.3px`, weight `200`. Ours: `~42px`, weight `700`. The original dealer name heading is actually *smaller* than section h2s and uses light weight.

3. **Default content sections lack centering.** Original VW page centers all section headings and body text. Our EDS default content is left-aligned.

## Checklist

### Global Fixes (styles.css or dealer-page scoping)
- [ ] Add a `.dealer-page` body class or section-level scoping for dealer-specific overrides
- [ ] Override h2 on dealer pages: `font-size: clamp(2.5rem, 1vw + 2rem, 2.9rem)` (~46px at 1280), `text-align: center`
- [ ] Override default content `p` centering: `text-align: center`, `max-width: 854px`, `margin: 0 auto`
- [ ] Increase section vertical spacing on dealer pages: `margin: 80px auto` instead of `40px 16px`

### hero-dealer Block
- [ ] Change h1 to `font-size: ~2.08rem` (33.3px), `font-weight: 200`
- [ ] Add overline "Verkauf und Service" above the h1 (update importer)
- [ ] Switch desktop layout from `flex 50/50` to grid `~58% image / 4% gap / 29% text / 8% margin`
- [ ] Increase container `min-height` to `560px`
- [ ] Change info text `p` color from `85% opacity` to full `#fff`
- [ ] Vertically center info panel in grid

### dealer-hours Block
- [ ] No changes needed — layout already matches

### carousel-featured (Service + Modelle sections)
- [ ] Verify h2 above block is centered — may need `.carousel-featured-container h2 { text-align: center }`

### cards Block (CTAs + Ansprechpartner)
- [ ] Verify cards have `border: 1px solid var(--border-color)` and `border-radius: 8px`
- [ ] Verify h2 above cards is centered

### embed-search Block
- [ ] No changes needed — fallback CTA is acceptable

## Execution

This plan requires **Execute mode** to implement. The highest-impact fix is the **section h2 sizing + centering** — this single change will dramatically improve visual fidelity across all 12 sections.
