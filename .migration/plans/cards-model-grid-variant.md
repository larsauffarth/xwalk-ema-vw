Let me research the original page's model grid to understand the layout and data structure.Now let me check the current block code and content more carefully:Now let me check how the section-metadata variant pattern works with existing blocks:Now let me check the existing block variant pattern and the `_cards-model.json` model:# Model Grid Block Variant for Modelle Page

## Overview

The `/de/modelle` page needs a grid variant of the `cards-model` block that matches the original VW model overview grid. The current `cards-model` block is a horizontal scroll carousel (used on the homepage `/de`) and must remain unchanged there.

## Current State

### Existing `cards-model` block (carousel)
- **Used on:** `/de` homepage ("Beliebte Modelle" section, 5 cards)
- **Layout:** Horizontal scroll carousel with snap on mobile, 25%-width cards on desktop
- **Features:** Prev/next navigation arrows, hover-reveal CTA button, bicolor gradient image background
- **Content:** 5 hardcoded static models (fallback) + authored content from `.plain.html`

### Modelle page content
- **Currently has:** 10 models in `cards-model` block (Polo, Taigo, T-Cross, Golf, T-Roc, ID.3, ID.3 Neo, Tiguan, ID.4, Caddy)
- **Origin has:** 23 models + 1 promo (ID. Polo) in a responsive CSS grid

## What the Original Shows

### Grid Layout
- **Mobile:** 1 column
- **Tablet (768px):** 2 columns
- **Desktop (1280px):** 3 columns
- **Large (1920px):** 4 columns
- Cards have 12px border-radius, 1px border, hover scale on image

### Missing Models (13 not yet imported)
| Model | Price | Badge |
|-------|-------|-------|
| Das T-Roc Cabriolet | Ab 37.560,00 € | — |
| Der ID.5 | Ab 43.360,00 € | Abzgl. ID. Kaufprämie |
| Der Tayron | Ab 46.925,00 € | — |
| Der Touareg | Ab 75.025,00 € | Lagerfahrzeuge |
| Der Golf Variant | Ab 30.495,00 € | — |
| Der Passat | Ab 42.540,00 € | — |
| Der ID.7 | Ab 54.505,00 € | Abzgl. ID. Kaufprämie |
| Der ID.7 Tourer | Ab 55.305,00 € | Abzgl. ID. Kaufprämie |
| Der Touran | Ab 41.995,00 € | Lagerfahrzeuge |
| Der Caddy California | Ab 37.723,00 € | — |
| Der ID. Buzz | Ab 61.076,75 € | — |
| Der Multivan | Ab 56.108,50 € | — |
| Der California | Ab 80.735,55 € | — |
| Der neue Grand California | Ab 83.109,60 € | — |

## Approach: Block Variant via CSS Class

Use the EDS block variant pattern: `cards-model (grid)` in the content → renders as `cards-model grid` CSS class. The JS and CSS handle both variants in the same block files.

### Variant differences
| Aspect | Default (carousel) | Grid variant |
|--------|--------------------|--------------|
| Layout | Horizontal scroll | CSS grid (responsive columns) |
| Navigation | Prev/next arrows | None (all visible) |
| Card sizing | Fixed flex-basis | Auto-fill grid cells |
| Hover effect | Reveal CTA button | Scale image + shadow |
| Used on | Homepage `/de` | Modelle `/de/modelle` |

## Files to Modify

| File | Changes |
|------|---------|
| `blocks/cards-model/cards-model.css` | Add `.cards-model.grid` variant styles (CSS grid, responsive columns, hover scale) |
| `blocks/cards-model/cards-model.js` | Skip carousel navigation when `grid` class present |
| `content/de/modelle.plain.html` | Change `cards-model` → `cards-model (grid)`, add 13 missing models + 1 promo |
| `content/dam/xwalk-ema-vw/` | Download 14 new model images from VW media service |

## Checklist

- [ ] Add `.cards-model.grid` CSS variant (responsive grid layout, no scroll, hover effects)
- [ ] Update `cards-model.js` to skip navigation arrows when grid variant is active
- [ ] Download 14 missing model images to DAM
- [ ] Add 13 missing models + ID. Polo promo to `content/de/modelle.plain.html`
- [ ] Change block class to `cards-model (grid)` in content
- [ ] Verify grid renders correctly at all breakpoints (mobile 1-col, tablet 2-col, desktop 3-col, large 4-col)
- [ ] Verify homepage `/de` carousel is unaffected
