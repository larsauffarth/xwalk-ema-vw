# VW Header Implementation Plan

## Current State

The project uses the **standard AEM boilerplate header block** with its 3-section nav pattern (brand / sections / tools). The current `nav.plain.html` has 4 dropdown groups and a "Händler suchen" tools link. This differs significantly from the original VW header, which has a unique layout: logo + "Menü" trigger + quick links + utility icons, with a full-screen drawer menu containing 6 groups.

## Gap Analysis: Original vs Current

### Layout Differences

| Aspect | Original VW | Current EDS |
|--------|-------------|-------------|
| **Desktop layout** | Logo left, "Menü" button, 3 quick links (Modelle, Konfigurieren, Direkt verfügbare Fahrzeuge) center, 4 utility icons right (Händler, Search, Account, Hamburger) | Logo left, 4 dropdown sections inline, "Händler suchen" right |
| **Mobile layout** | Logo center, utility icons right, hamburger menu | Hamburger left, brand center, tools right |
| **Menu behavior** | "Menü" click opens full-screen drawer overlay with 6 groups | Inline dropdowns on desktop, mobile drawer on <900px |
| **Quick links** | 3 separate visible links always shown on desktop | Not present — menu items serve as primary nav |
| **Utility icons** | Händler wählen (pin icon), Search (magnifier), Account (person), Hamburger (menu lines) | Only "Händler suchen" text link |
| **Header position** | Fixed, transparent over hero → solid on scroll | Fixed on mobile, relative on desktop |

### Content Differences

| Aspect | Original VW | Current EDS |
|--------|-------------|-------------|
| **Menu groups** | 6 groups: Modelle und Konfigurator, Angebote und Produkte, Elektromobilität, Konnektivität, Marke und Erlebnis, Besitzer und Service | 4 groups (missing Konnektivität and Marke und Erlebnis) |
| **Quick links** | Modelle → `/de/modelle.html`, Konfigurieren → `/de/konfigurator.html`, Direkt verfügbare Fahrzeuge → `/de/modelle/verfuegbare-fahrzeuge.html` | Not present as separate elements |
| **Brand link** | VW logo SVG → `/de.html` | "Volkswagen" text → `/de` |

### Styling Differences

| Aspect | Original VW | Current EDS |
|--------|-------------|-------------|
| **Font** | `vw-head` for nav labels (bold 700), `vw-text` for body (regular 400) | Inherits `--body-font-family` (Helvetica Neue fallback) |
| **Text color** | White on transparent, `#000e26` on solid | Always `currentcolor` (dark) |
| **Background** | Transparent → solid white with backdrop-filter | Solid white always |
| **Logo** | VW roundel SVG (~24px) | Text "Volkswagen" |
| **Height** | ~64px desktop, ~56px mobile | `--nav-height: 64px` |

## Implementation Strategy

The original VW header does not follow the boilerplate 3-section pattern. The boilerplate assumes inline dropdowns on desktop, but VW uses a distinct pattern: a **"Menü" trigger button** that opens a **full-screen drawer overlay**. To faithfully represent the original, we need to:

1. **Download VW brand fonts** from volkswagen.de and install in `/workspace/fonts/`
2. **Extract VW logo SVG** and save to `icons/vw-logo.svg`
3. **Rewrite `nav.plain.html`** to represent the actual VW header content faithfully — the nav content should reflect what exists on the original site, not be forced into boilerplate assumptions
4. **Rewrite `header.js`** — replace the boilerplate header decoration logic with a VW-specific implementation that creates the correct layout: top bar (logo + "Menü" + quick links + utilities) and a drawer overlay menu
5. **Rewrite `header.css`** — replace boilerplate styles entirely with VW header styling (transparent/solid states, drawer overlay, responsive layout)

This means the header block becomes **VW-specific** rather than generic boilerplate. The block still loads its content from `/nav.plain.html`, but the JS decoration and CSS are tailored to the VW header pattern.

## Checklist

### Phase 0: Font & Logo Assets
- [ ] Navigate to volkswagen.de via Playwright, inspect CSS `@font-face` rules, and download all `vw-head` and `vw-text` `.woff2` files to `/workspace/fonts/`
- [ ] Update `styles/fonts.css` with real `@font-face` declarations for `vw-head` (weights 200, 400, 700) and `vw-text` (weights 400, 700)
- [ ] Update `styles/styles.css` — set `--body-font-family: 'vw-text', helvetica, arial, sans-serif` and `--heading-font-family: 'vw-head', helvetica, arial, sans-serif`
- [ ] Extract VW roundel logo SVG from the base64 data URI captured in the original site's header and save to `icons/vw-logo.svg`
- [ ] Verify fonts and logo render correctly in local preview

### Phase 1: Navigation Content — Faithful Representation
- [ ] Rewrite `content/nav.plain.html` to faithfully represent the original VW header content:
  - **Section 1 (top bar content)**: VW logo icon link + quick links (Modelle, Konfigurieren, Direkt verfügbare Fahrzeuge)
  - **Section 2 (menu drawer content)**: Full 6-group navigation hierarchy from the original site (Modelle und Konfigurator, Angebote und Produkte, Elektromobilität, Konnektivität und Mobilitätsdienste, Marke und Erlebnis, Besitzer und Service) with all subgroups and leaf links from the research JSON
  - **Section 3 (utility actions)**: Händler wählen, Search, Account (all three required)
- [ ] Create `content/nav/index.html` with the same content for AEM dev server path resolution
- [ ] Populate all `href` values using confirmed URLs from the research (fall back to `#` for unspecified URLs)
- [ ] Verify nav content loads in local preview

### Phase 2: Header JS — VW-Specific Decoration
- [ ] Rewrite `blocks/header/header.js` to create VW header layout from nav fragment:
  - Parse the 3 sections from nav content
  - Build **top bar**: logo (from section 1) + "Menü" trigger button + quick links (from section 1) + utility icons (from section 3)
  - Build **drawer overlay**: full-screen panel with close button + 6-group navigation (from section 2) as accordion panels
- [ ] Implement menu open/close: "Menü" button toggles drawer, Escape closes, backdrop click closes
- [ ] Implement focus trap inside drawer when open (modal behavior)
- [ ] Return focus to trigger on close
- [ ] Add IntersectionObserver on `.hero-stage-container` to toggle `data-mode="transparent"` / `"solid"` on the header wrapper
- [ ] Add scroll lock (`overflow: hidden` on `<html>`) when drawer is open
- [ ] Handle resize: close drawer when crossing desktop breakpoint
- [ ] Support `prefers-reduced-motion`

### Phase 3: Header CSS — VW Visual Design
- [ ] Replace `blocks/header/header.css` with VW-specific styles:
  - **Top bar**: fixed position, full width, `z-index: 10`, height 64px desktop / 56px mobile
  - **Transparent state** (`[data-mode="transparent"]`): `background: transparent`, `color: white`
  - **Solid state** (`[data-mode="solid"]`): `background: rgba(255,255,255,0.92)`, `backdrop-filter: blur(10px)`, `color: #001e50`, `box-shadow: 0 2px 16px rgba(0,0,0,0.08)`
  - **Transition**: `transition: background-color 200ms ease, color 200ms ease, box-shadow 200ms ease`
- [ ] Style top bar layout: logo left, "Menü" label + quick links center, utility icons right
- [ ] Style "Menü" trigger: text label with hamburger icon, `vw-head` font, 700 weight
- [ ] Style quick links: `vw-text` font, 400 weight, horizontal list with gap
- [ ] Style utility icons (all 3 required): Händler wählen (pin icon), Search (magnifier), Account (person) — icon-only buttons with `aria-label`, 24px touch targets
- [ ] Style pill CTA for "Händler wählen": navy bg, white text, `border-radius: 100px`, `padding: 0 32px`, `height: 48px`
- [ ] Style drawer overlay: full-screen, white bg, `z-index: 20`, slide-in from left or top
- [ ] Style drawer header: "Menü" title + close button
- [ ] Style drawer nav groups: accordion pattern with heading + nested link lists, `vw-head` bold for group labels, `vw-text` regular for links, 14px font size, `#001e50` link color
- [ ] Respect `@media (prefers-reduced-motion: reduce)` — disable slide/fade animations

### Phase 4: Responsive Behavior
- [ ] Desktop (≥960px): Full top bar visible — Logo + "Menü" + quick links (Modelle, Konfigurieren, Direkt verfügbare Fahrzeuge) + 3 utility icons (Händler, Search, Account); "Menü" opens overlay
- [ ] Tablet (560–959px): Logo left + 3 utility icons right + hamburger; quick links hidden; hamburger opens full drawer
- [ ] Mobile (<560px): Logo center + hamburger left + 3 utility icons right; full-height drawer
- [ ] Verify at VW breakpoints: 375px, 560px, 768px, 960px, 1280px, 1440px

### Phase 5: Validation
- [ ] Compare header against original VW site at desktop 1440px using Playwright screenshot
- [ ] Compare header at tablet 768px
- [ ] Compare header at mobile 375px
- [ ] Verify keyboard navigation: Tab through top bar items, Escape closes drawer, Enter activates
- [ ] Verify transparent→solid scroll transition on homepage with hero
- [ ] Verify drawer opens/closes smoothly with focus management
- [ ] Test on pages without hero (e.g., elektromobilitaet detail pages) — header should default to solid mode

## Key Technical Details

### VW Font Discovery
Navigate to volkswagen.de via Playwright and run:
```js
const fonts = Array.from(document.styleSheets)
  .flatMap(s => { try { return Array.from(s.cssRules) } catch { return [] } })
  .filter(r => r instanceof CSSFontFaceRule)
  .map(r => ({ family: r.style.fontFamily, src: r.style.src, weight: r.style.fontWeight }));
```
Download each `.woff2` URL found to `/workspace/fonts/`.

### VW Logo SVG
The captured HTML contains the VW roundel as a base64-encoded SVG in the header's `<img src="data:image/svg+xml;base64,...">`. Decode and save to `icons/vw-logo.svg`.

### Nav Content Structure (3 sections in the HTML, VW-specific semantics)
```
Section 1: Top bar content
  - VW logo (icon link)
  - Quick links: Modelle, Konfigurieren, Direkt verfügbare Fahrzeuge

Section 2: Drawer menu content (6 groups)
  - Modelle und Konfigurator → Konfigurator, Modelle vergleichen, Konfiguration laden, Autosuche
  - Angebote und Produkte → Aktuelle Angebote, E-Auto-Förderung, Leasing (6 sub), Finanzierung (2 sub), ...
  - Elektromobilität → Elektroautos (12 models), Reichweite (3 sub), Laden (4 sub), Batterie (4 sub), ...
  - Konnektivität und Mobilitätsdienste → VW Connect, Upgrades, Car-Net, App-Connect, ...
  - Marke und Erlebnis → Volkswagen R, Driving Experience, Lifestyle Shop, ...
  - Besitzer und Service → myVolkswagen, Software Updates, Service (7 sub), Zubehör (6 sub), ...

Section 3: Utility actions (all 3 required)
  - Händler wählen (location pin icon)
  - Search (magnifier icon)
  - Account (person icon) → /de/besitzer-und-service/my-volkswagen-overview.html
```

### Header JS Architecture
```
decorate(block):
  1. Load nav fragment
  2. Parse 3 sections → topBarContent, menuContent, utilityContent
  3. Build DOM:
     - nav-wrapper (fixed, z-index 10)
       - top-bar (flex row)
         - logo (from section 1)
         - menu-trigger button ("Menü")
         - quick-links (from section 1, desktop only)
         - utilities (from section 3: Händler, Search, Account)
       - drawer-overlay (hidden by default, z-index 20)
         - drawer-header ("Menü" + close button)
         - drawer-nav (6 accordion groups from section 2)
         - drawer-backdrop
  4. Bind events: open/close/escape/backdrop/resize
  5. Init IntersectionObserver for hero → transparent/solid toggle
```

### CSS States
```css
/* Fixed header, transitions between transparent and solid */
header .nav-wrapper {
  position: fixed;
  top: 0;
  width: 100%;
  z-index: 10;
  transition: background-color 200ms ease, color 200ms ease, box-shadow 200ms ease;
}

header .nav-wrapper[data-mode="transparent"] {
  background-color: transparent;
  color: white;
}

header .nav-wrapper[data-mode="solid"] {
  background-color: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(10px);
  color: #001e50;
  box-shadow: 0 2px 16px rgba(0, 0, 0, 0.08);
}
```

## Constraints
- **VW fonts licensed** — download directly from volkswagen.de and use `vw-head` / `vw-text`
- **No boilerplate compatibility requirement** — header block is rewritten for VW; nav content structure still uses 3 HTML sections but with VW-specific semantics interpreted by custom `header.js`
- **Mega menu depth**: The full 6-group hierarchy with multi-level nesting is implemented as accordion panels inside a drawer overlay, not as inline dropdowns
- **Utility icons**: All 3 required — Händler wählen (pin icon), Search (magnifier), Account (person icon linking to myVolkswagen)
