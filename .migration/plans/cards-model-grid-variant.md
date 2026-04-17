# Model Grid Block Variant — Promo Tile Addition

## Status: Grid Variant Complete, Promo Tile Pending

Grid variant with 23 model cards, badge colors, and responsive layout is done. The user wants to add a promotional tile (ID. Polo) that spans 2 rows in the grid, matching the original.

## Promo Tile Analysis

### How the Original Works
- The promo tile is the **3rd child** in the grid (index 2)
- It uses **`grid-row: 1 / span 2`** (spans 2 rows) and **`grid-column: 3`** (last column on desktop)
- Dimensions: same width as regular cards (429px), but 2.25x taller (~580px = 2 rows + gap)
- Dark navy background (`#001e50`) with car image as CSS `background-image`
- Contains: "Bald erhältlich" badge, heading, body text, and CTA link
- Responsive column placement: col 3 at ≥1280px, col 2 at ≥768px, col 1 at mobile

### Achievability Assessment: **HIGH CONFIDENCE (90%)**

**Why it's achievable:**
1. CSS Grid `grid-row: span 2` is standard and well-supported
2. The promo tile can be a special card variant detected by the JS (e.g., a card with a specific class or content pattern like "Bald erhältlich" badge text)
3. The dark background + background-image can be done with inline styles or a CSS class
4. Column placement at specific positions is straightforward with `grid-column: N`

**The 10% risk:**
- EDS block structure puts all cards in `<li>` elements with the same image+text pattern. Making ONE card look completely different (dark bg, background image instead of `<img>`, spanning 2 rows) requires either:
  - A special CSS class on that `<li>` (needs JS detection)
  - A separate block/element outside the `<ul>` (breaks the item model)
- The AEM CLI round-trip might strip custom classes from authored content

**Recommended Approach:**
1. Add a special `<li>` for the promo card with class `cards-model-promo` (set by JS based on badge text "Bald erhältlich")
2. CSS: `.cards-model-promo { grid-row: span 2; grid-column: 3; background: #001e50; }` with responsive column overrides
3. JS: detect the promo card, move the image to CSS background, restyle the text to white
4. Content: the promo card is authored like a regular card but with "Bald erhältlich" as badge text — the JS transforms it

## Checklist

- [x] Grid variant CSS (responsive columns, hover effects)
- [x] Grid variant JS (skip navigation, badge detection)
- [x] 23 model cards with images uploaded to DAM
- [x] Badge colors (cyan Neu, gold Kaufprämie, grey Lagerfahrzeuge)
- [x] Badge positioning (absolute, above card)
- [ ] Add promo tile (ID. Polo) to content as a special card
- [ ] JS: detect promo card by "Bald erhältlich" badge, add `.cards-model-promo` class
- [ ] CSS: promo card spans 2 rows, dark navy bg, background-image, white text, responsive column placement
- [ ] Verify promo tile renders at correct grid position across breakpoints
- [ ] Push code to git
