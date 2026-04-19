/**
 * VW Germany Header Block
 *
 * Custom header with full-screen drawer navigation, transparent/solid scroll
 * transition, VW brand logo, quick links, and utility icons.
 *
 * Architecture:
 * - Loads navigation content from a fragment (/nav by default, configurable via 'nav' metadata)
 * - The fragment has 3 sections: brand+quicklinks, menu groups, utility tools
 * - Navigation data is extracted from the fragment HTML and rebuilt as a rich flyout menu
 *
 * FRAGMENT PATTERN: The header loads its content from /content/nav/index.html via
 * the fragment loader. The nav fragment contains 3 sections that define the brand,
 * menu structure, and utility links. This allows content authors to manage navigation
 * through the standard EDS authoring flow.
 *
 * OUT OF SCOPE — Hardcoded Navigation Data:
 * The following constants contain hardcoded German navigation content that should
 * be migrated to author-managed content in production:
 * - SECTION_ROOTS: URL mappings for top-level sections
 * - TOP_LINKS: Quick access links shown in the rail
 * - LEGAL_LINKS: Footer legal links in the flyout
 * - ICONS: Inline SVG icons (acceptable for performance)
 * - OVERVIEW_LABELS: German labels for overview links
 * - CATEGORY_RAIL: Promotional content and top-links per category (6 categories)
 * - DRILLDOWN_OVERRIDES: Sub-navigation hierarchy overrides (6 sections with deep nesting)
 *
 * These hardcoded structures (~400 lines of constants) replicate the volkswagen.de
 * mega-menu. In production, this should be driven by:
 * 1. AEM content fragments for nav structure
 * 2. A nav API endpoint for dynamic content
 * 3. I18n service for localized labels
 *
 * The current approach was chosen for migration fidelity — it exactly reproduces the
 * original site's navigation without requiring backend infrastructure.
 */

import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/** Media query breakpoint for desktop layout (900px+) */
const isDesktop = window.matchMedia('(min-width: 900px)');

// OUT OF SCOPE: Hardcoded German display-name-to-URL mappings for top-level VW sections.
// Maps display names (including umlaut variants) to URL path prefixes.
const SECTION_ROOTS = {
  'Modelle und Konfigurator': '/de/modelle',
  'Angebote und Produkte': '/de/angebote-und-produkte',
  Elektromobilitaet: '/de/elektromobilitaet',
  Elektromobilität: '/de/elektromobilitaet',
  'Konnektivität und Mobilitätsdienste': '/de/konnektivitaet-und-mobilitaetsdienste',
  'Marke und Erlebnis': '/de/marke-und-erlebnis',
  'Besitzer und Service': '/de/besitzer-und-service',
};

// OUT OF SCOPE: Hardcoded German quick-access links shown in the navigation rail
// when no category-specific links exist. Should be author-managed content.
const TOP_LINKS = [
  { label: 'Händlersuche', href: '/de/haendler-werkstatt' },
  { label: 'Probefahrt', href: '/de/formulare/probefahrtanfrage' },
  {
    label: 'Schnell verfügbare Neu- und Gebrauchtwagen',
    href: '/de/modelle/verfuegbare-fahrzeuge',
  },
  { label: 'Leasing', href: '/de/angebote-und-produkte/leasing' },
  { label: 'Aktuelle Angebote', href: '/de/angebote-und-produkte/aktuelle-angebote' },
];

// OUT OF SCOPE: Hardcoded German legal/compliance links required in the VW footer area
// of the flyout menu. Should be author-managed content.
const LEGAL_LINKS = [
  { label: 'Impressum', href: '/de/mehr/impressum' },
  { label: 'Nutzungsbedingungen', href: '/de/mehr/rechtliches/nutzungsbedingungen' },
  { label: 'Datenschutzerklärungen', href: '/de/mehr/rechtliches/datenschutzerklaerungen' },
  { label: 'Cookie-Richtlinie', href: '/de/mehr/rechtliches/cookie-richtlinie' },
  { label: 'Lizenzhinweise Dritter', href: '/de/mehr/rechtliches/lizenzhinweise-dritter' },
  { label: 'Angaben zum Digital Services Act (DSA)', href: '/de/mehr/rechtliches/digital-service-act' },
  { label: 'EU Data Act', href: '/de/mehr/rechtliches/eu-data-act' },
  { label: 'Produktsicherheitsinformationen', href: '/de/mehr/rechtliches/produktsicherheitsinformationen' },
];

/**
 * Inline SVG icons for the header UI: logo, menu, close, dealer, search, account, chevron.
 * Inline SVGs are acceptable here for performance (avoids extra network requests for critical
 * UI elements that appear above the fold).
 */
const ICONS = {
  logo: `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <title>Zur Volkswagen Startseite</title>
      <path d="M12 22.586c-5.786 0-10.543-4.8-10.543-10.586 0-1.2.214-2.357.6-3.471l6.172 12c.085.171.171.3.385.3.215 0 .3-.129.386-.3l2.871-6.386q.064-.129.129-.129c.086 0 .086.086.129.129l2.914 6.386c.086.171.171.3.386.3.214 0 .3-.129.385-.3l6.172-12c.385 1.071.6 2.228.6 3.471-.043 5.786-4.8 10.586-10.586 10.586m0-13.329c-.086 0-.086-.086-.129-.128l-3.3-7.115a10.12 10.12 0 0 1 6.858 0l-3.3 7.115c-.043.042-.043.128-.129.128m-3.471 7.714c-.086 0-.086-.085-.129-.128L3 6.47c.943-1.542 2.314-2.828 3.9-3.728l3.814 8.228c.086.172.172.215.3.215h1.972c.128 0 .214-.043.3-.215l3.771-8.228c1.586.9 2.957 2.186 3.9 3.728L15.6 16.843q-.065.128-.129.128c-.085 0-.085-.085-.128-.128L13.286 12.3c-.086-.171-.172-.214-.3-.214h-1.972c-.128 0-.214.043-.3.214l-2.057 4.543c-.043.043-.043.128-.128.128M12 24c6.643 0 12-5.357 12-12S18.643 0 12 0 0 5.357 0 12s5.357 12 12 12"></path>
    </svg>
  `,
  menu: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7.25h16M4 12h16M4 16.75h16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>
    </svg>
  `,
  close: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>
    </svg>
  `,
  dealer: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 20.25c-3.95-4.92-5.92-8.12-5.92-10.68a5.92 5.92 0 1 1 11.84 0c0 2.56-1.97 5.76-5.92 10.68Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.7"/>
      <circle cx="12" cy="9.6" r="2.3" fill="none" stroke="currentColor" stroke-width="1.7"/>
    </svg>
  `,
  search: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="10.5" cy="10.5" r="5.75" fill="none" stroke="currentColor" stroke-width="1.7"/>
      <path d="M14.85 14.85 19.25 19.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7"/>
    </svg>
  `,
  account: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8.1" r="3.55" fill="none" stroke="currentColor" stroke-width="1.7"/>
      <path d="M5.4 19.25a6.7 6.7 0 0 1 13.2 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7"/>
    </svg>
  `,
  chevron: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
    </svg>
  `,
};

// OUT OF SCOPE: Hardcoded German label overrides for the "overview" link per category.
// "Modelle und Konfigurator" uses "Modelle entdecken", all others use "Übersicht".
const OVERVIEW_LABELS = {
  'Modelle und Konfigurator': 'Modelle entdecken',
  default: 'Übersicht',
};

// OUT OF SCOPE: ~100 lines of hardcoded promotional content per navigation category.
// Includes promo card images with hardcoded media paths. In production, this should be
// authored content loaded dynamically.
// Per-category sidebar content: top links + promotional teaser card for each of the
// 6 VW navigation categories.
const CATEGORY_RAIL = {
  'Modelle und Konfigurator': {
    topLinks: [
      { label: 'Schnell verfügbare Neu- und Gebrauchtwagen', href: 'https://www.autosuche.de/?t_manuf=BQ&sort=PRICE_SALE&sortdirection=ASC' },
      { label: 'Händlersuche', href: 'https://www.volkswagen.de/app/haendlersuche/vw-de/de/' },
      { label: 'Probefahrt', href: '/de/formulare/probefahrtanfrage.html' },
      { label: 'Live Beratung', href: '/de/besitzer-und-service/ueber-ihr-auto/hilfe-und-dialogcenter/liveberatung.html' },
      { label: 'Aktuelle Angebote', href: '/de/angebote-und-produkte/aktuelle-angebote.html' },
    ],
    promo: {
      kicker: 'Angebote und Produkte',
      title: 'Volkswagen Marktplatz',
      href: '/de/angebote-und-produkte/volkswagen-marktplatz.html',
      imageSrc: '/media_1c1816fcf08dd25dc8859e6aeb1749b4050a83d9e.png?width=2000&format=webply&optimize=medium',
      imageAlt: 'Modell-Übersicht',
    },
  },
  'Angebote und Produkte': {
    topLinks: [
      { label: 'Schnell verfügbare Neu- und Gebrauchtwagen', href: '/de/modelle/verfuegbare-fahrzeuge' },
      { label: 'Wartung & Inspektion', href: '/de/angebote-und-produkte/wartungsvertraege/wartung-inspektion' },
      { label: 'Modelle & Konfigurator', href: '/de/modelle' },
      { label: 'Hilfe- und Dialogcenter', href: '/de/besitzer-und-service/ueber-ihr-auto/hilfe-und-dialogcenter' },
      { label: 'Online-Fahrzeugbewertung', href: '/de/angebote-und-produkte/online-fahrzeugbewertung' },
    ],
    promo: {
      kicker: 'Angebote und Produkte',
      title: 'Online-Fahrzeugbewertung',
      href: '/de/angebote-und-produkte/online-fahrzeugbewertung.html',
      imageSrc: '/media_1126d0fc16b0363a535e20ade928e65f75f0dfdf7.png?width=2000&format=webply&optimize=medium',
      imageAlt: 'Probefahrt Icon',
    },
  },
  Elektromobilität: {
    topLinks: [
      { label: 'Der neue ID.3 Neo', href: '/de/modelle/der-neue-id3-neo.html' },
      { label: 'Der ID.7 GTX', href: '/de/modelle/der-neue-id-7-gtx.html' },
      { label: 'Der ID.7 GTX Tourer', href: '/de/modelle/der-neue-id-7-gtx-tourer.html' },
      { label: 'Der Tiguan eHybrid', href: '/de/modelle/tiguan.html' },
      { label: 'ID. Software Update', href: '/de/elektromobilitaet/software-und-konnektivitaet/neueste-id-software.html' },
    ],
    promo: {
      kicker: 'Elektromobilität',
      title: 'e-Tools für Elektroautos',
      href: '/de/elektromobilitaet/e-tools-fuer-elektroautos.html',
      imageSrc: '/media_1eb4ee8bc6b3ce9aebd10fea1b87b9518cbec4628.png?width=2000&format=webply&optimize=medium',
      imageAlt: 'Ein VW ID.3, ein VW ID.7 und ein VW ID.4 parken auf dem Parkplatz eines Messegeländes',
    },
  },
  'Konnektivität und Mobilitätsdienste': {
    topLinks: [
      { label: 'Aktivierung von VW Connect / We Connect', href: '/de/konnektivitaet-und-mobilitaetsdienste/konnektivitaet/aktivierung-von-vw-connect-und-we-connect' },
      { label: 'Aktivierung von Car-Net', href: '/de/konnektivitaet-und-mobilitaetsdienste/konnektivitaet/aktivierung-von-car-net' },
      { label: 'Volkswagen Connect Shop', href: '/de/konnektivitaet-und-mobilitaetsdienste/konnektivitaet/volkswagen-connect-shop' },
      { label: 'Aktuelle Konnektivitäts-Angebote', href: '/de/konnektivitaet-und-mobilitaetsdienste/konnektivitaet/aktuelle-konnektivitaets-angebote' },
      { label: 'Hilfe zu Apps und digitalen Diensten', href: '/de/konnektivitaet-und-mobilitaetsdienste/konnektivitaet/hilfe-zu-apps-und-digitalen-diensten' },
    ],
    promo: {
      kicker: 'Konnektivität und Mobilitätsdienste',
      title: 'Upgrades',
      href: '/de/konnektivitaet-und-mobilitaetsdienste/konnektivitaet/upgrades-uebersicht.html',
      imageSrc: '/media_11a30a740aebea99c7ff0a7a0ec481769d3c8dc16.png?width=2000&format=webply&optimize=medium',
      imageAlt: 'Seitliche Frontansicht der Designstudie des VW ID.3 Neo.',
    },
  },
  'Marke und Erlebnis': {
    topLinks: [
      { label: 'ID. Volkswagen', href: '/de/marke-und-erlebnis/id-volkswagen' },
      { label: 'Karriere', href: '/de/marke-und-erlebnis/karriere' },
      { label: 'Volkswagen Apps', href: '/de/konnektivitaet-und-mobilitaetsdienste/volkswagen-apps' },
      { label: 'Modelle & Konfigurator', href: '/de/modelle' },
      { label: 'Hilfe- und Dialogcenter', href: '/de/besitzer-und-service/ueber-ihr-auto/hilfe-und-dialogcenter' },
    ],
    promo: {
      kicker: 'Volkswagen R',
      title: 'R Experience: Events rund um Volkswagen R',
      href: '/de/marke-und-erlebnis/volkswagen-r/r-experience.html',
      imageSrc: '/media_19c9b3e132d0153d2419a2c5980f8ea23b3022af4.png?width=750&format=png&optimize=medium',
      imageAlt: 'Ein dunkelblauer Touareg FINAL EDITION parkt an einem Seitenstreifen vor einem futuristischen Gebäude.',
    },
  },
  'Besitzer und Service': {
    topLinks: [
      { label: 'Pannen- und Unfallhilfe', href: '/de/besitzer-und-service/service-und-ersatzteile/pannen-und-unfallhilfe' },
      { label: 'Händlersuche', href: '/de/haendler-werkstatt' },
      { label: 'Volkswagen Kundenbetreuung', href: '/de/besitzer-und-service/ueber-ihr-auto/hilfe-und-dialogcenter' },
      { label: 'Takata Airbag-Produktsicherheitsrückruf', href: '/de/besitzer-und-service/ueber-ihr-auto/kundeninformationen/takata-airbag-rueckruf' },
      { label: 'Frisch gestärkt in den Frühling', href: '/de/besitzer-und-service/service-und-ersatzteile/economy-service.html' },
    ],
    promo: {
      kicker: 'Besitzer und Service',
      title: 'Frisch gestärkt in den Frühling',
      href: '/de/besitzer-und-service/service-und-ersatzteile/economy-service.html',
      imageSrc: '/media_1126d0fc16b0363a535e20ade928e65f75f0dfdf7.png?width=2000&format=webply&optimize=medium',
      imageAlt: 'Probefahrt Icon',
    },
  },
};

// OUT OF SCOPE: ~250 lines of hardcoded navigation hierarchy overrides.
// These override the navigation structure extracted from the nav fragment with specific
// sub-navigation items. In production, the nav fragment should contain the complete
// hierarchy, eliminating the need for code-level overrides.
// Each key is a top-level category name; values contain orderedItems (reordered top-level)
// and items (child overrides keyed by item label).
const DRILLDOWN_OVERRIDES = {
  'Angebote und Produkte': {
    orderedItems: [
      { label: 'Aktuelle Angebote', href: '/de/angebote-und-produkte/aktuelle-angebote' },
      { label: 'E-Auto-Förderung', href: '/de/angebote-und-produkte/e-auto-foerderung' },
      { label: 'Volkswagen Marktplatz', href: '/de/angebote-und-produkte/volkswagen-marktplatz' },
      { label: 'Die ENERGY Sondermodelle', href: '/de/angebote-und-produkte/energy-sondermodelle' },
      { label: 'Junge Gebrauchtwagen und Gebrauchtwagen', href: '/de/angebote-und-produkte/angebote-fahrzeugkauf' },
      {
        label: 'Zubehör- und Serviceangebote',
        href: '/de/angebote-und-produkte/zubehoer-und-serviceangebote',
        children: [
          { label: 'Saisonangebote', href: '/de/angebote-und-produkte/zubehoer-und-serviceangebote/saisonangebote' },
          { label: 'Reifenpakete', href: '/de/angebote-und-produkte/zubehoer-und-serviceangebote/reifenpakete' },
        ],
      },
      { label: 'Leasing', href: '/de/angebote-und-produkte/leasing' },
      { label: 'Finanzierung', href: '/de/angebote-und-produkte/finanzierung' },
      { label: 'Versicherungen und Garantien', href: '/de/angebote-und-produkte/versicherungen' },
      { label: 'Wartungsverträge', href: '/de/angebote-und-produkte/wartungsvertraege' },
      { label: 'Geschäftskunden', href: '/de/angebote-und-produkte/geschaeftskunden' },
      { label: 'Online-Fahrzeugbewertung', href: '/de/angebote-und-produkte/online-fahrzeugbewertung' },
      { label: 'Anpfiff zum Gewinn', href: '/de/angebote-und-produkte/anpfiff-zum-gewinn' },
    ],
    items: {
      'Junge Gebrauchtwagen und Gebrauchtwagen': {
        children: [
          { label: 'Volkswagen Zertifizierte Gebrauchtwagen', href: '/de/angebote-und-produkte/angebote-fahrzeugkauf/volkswagen-zertifizierte-gebrauchtwagen' },
          { label: 'Elektromobilität bei Gebrauchtwagen', href: '/de/angebote-und-produkte/angebote-fahrzeugkauf/elektromobilitaet-bei-gebrauchtwagen' },
        ],
      },
      Leasing: {
        children: [
          { label: 'Leasing ohne Anzahlung', href: '/de/angebote-und-produkte/leasing/leasing-ohne-anzahlung' },
          { label: 'Kleinwagen-Leasing', href: '/de/angebote-und-produkte/leasing/kleinwagen-leasing' },
          { label: 'Leasing-Angebote', href: '/de/angebote-und-produkte/leasing/leasing-angebote' },
          { label: 'Gebrauchtwagen-Leasing', href: '/de/angebote-und-produkte/leasing/gebrauchtwagen-leasing' },
          { label: 'Junge Gebrauchtwagen-Leasing', href: '/de/angebote-und-produkte/leasing/direktleasing' },
          { label: 'Elektroauto Leasing', href: '/de/angebote-und-produkte/leasing/elektroauto-leasing' },
        ],
      },
      Finanzierung: {
        children: [
          { label: 'Autokredit mit Schlussrate', href: '/de/angebote-und-produkte/finanzierung/autokredit-mit-schlussrate' },
          { label: 'Autofinanzierungs-Rechner', href: '/de/angebote-und-produkte/finanzierung/autofinanzierung-rechner' },
        ],
      },
      'Versicherungen und Garantien': {
        children: [
          { label: 'Kfz-Versicherung', href: '/de/angebote-und-produkte/versicherungen/kfz-versicherung' },
          { label: 'Restschuldversicherungen', href: '/de/angebote-und-produkte/versicherungen/restschuldversicherungen' },
          { label: 'Garantien', href: '/de/angebote-und-produkte/versicherungen/garantien' },
        ],
      },
      Wartungsverträge: {
        children: [
          { label: 'Wartung & Inspektion', href: '/de/angebote-und-produkte/wartungsvertraege/wartung-inspektion' },
        ],
      },
      Geschäftskunden: {
        children: [
          { label: 'Professional Class bei Volkswagen', href: '/de/angebote-und-produkte/geschaeftskunden/professional-class' },
          { label: 'Großkunden', href: '/de/angebote-und-produkte/geschaeftskunden/grosskunden' },
          { label: 'Behörden', href: '/de/angebote-und-produkte/geschaeftskunden/behoerden' },
          { label: 'Direktkunden', href: '/de/angebote-und-produkte/geschaeftskunden/direktkunden' },
          { label: 'Sonderfahrzeuge', href: '/de/angebote-und-produkte/geschaeftskunden/sonderzielgruppen' },
        ],
      },
    },
  },
  Elektromobilität: {
    items: {
      Elektroautos: {
        children: [
          { label: 'ID. Walkaround – Tutorials zur ID. Familie', href: '/de/elektromobilitaet/elektroautos/id-walkaround' },
          { label: 'ID.3', href: '/de/modelle/der-neue-id3' },
          { label: 'Der neue ID.3 GTX', href: '/de/modelle/der-neue-id3-gtx' },
          { label: 'ID.4', href: '/de/modelle-und-konfigurator/id4' },
          { label: 'ID.4 GTX', href: '/de/modelle/id4-gtx' },
          { label: 'ID.5', href: '/de/modelle/id5' },
          { label: 'ID.5 GTX', href: '/de/modelle/id5-gtx' },
          { label: 'ID.7', href: '/de/modelle/id7' },
          { label: 'Der ID.7 GTX', href: '/de/modelle/der-neue-id-7-gtx' },
          { label: 'Der ID.7 Tourer', href: '/de/modelle/der-neue-id-7-tourer' },
          { label: 'Der ID.7 GTX Tourer', href: '/de/modelle/der-neue-id-7-gtx-tourer' },
          { label: 'ID. Buzz', href: 'https://www.volkswagen-nutzfahrzeuge.de/de/modelle/id-buzz.sso.html' },
        ],
      },
      Elektrofahrzeugkonzepte: {
        children: [
          { label: 'ID. Polo', href: '/de/modelle/id-polo' },
          { label: 'ID. Cross', href: '/de/elektromobilitaet/elektrofahrzeugkonzepte/id-cross-concept' },
          { label: 'ID. EVERY1', href: 'https://www.volkswagen-newsroom.com/de/pressemitteilungen/mobilitaet-fuer-alle-volkswagen-gibt-mit-id-every1-ausblick-auf-elektrisches-einstiegsmodell-19039' },
          { label: 'ID.5 GTX „Xcite“', href: '/de/elektromobilitaet/elektrofahrzeugkonzepte/id-5-gtx-xcite' },
          { label: 'ID.4 GTX „XTREME“', href: '/de/elektromobilitaet/elektrofahrzeugkonzepte/id-xtreme' },
          { label: 'ID. 2all und ID. GTI Concept', href: '/de/elektromobilitaet/elektrofahrzeugkonzepte/ID2-for-all' },
          { label: 'ID.X Performance', href: '/de/elektromobilitaet/elektrofahrzeugkonzepte/idx-performance' },
        ],
      },
      Reichweite: {
        children: [
          { label: 'Übersicht', href: '/de/elektromobilitaet/reichweite' },
          { label: 'Reichweite der ID. Modelle', href: '/de/elektromobilitaet/reichweite/reichweite-der-id-modelle' },
          { label: 'Reichweite im Winter', href: '/de/elektromobilitaet/reichweite/reichweite-im-winter' },
          { label: 'Rekuperation', href: '/de/elektromobilitaet/reichweite/rekuperation' },
        ],
      },
      Laden: {
        children: [
          { label: 'Übersicht', href: '/de/elektromobilitaet/laden' },
          { label: 'Laden unterwegs', href: '/de/elektromobilitaet/laden/laden-unterwegs' },
          { label: 'Laden Zuhause', href: '/de/elektromobilitaet/laden/laden-zuhause' },
          { label: 'Ladestationen finden', href: '/de/elektromobilitaet/laden/ladestation-finden' },
          { label: 'Ladezeitensimulator', href: '/de/elektromobilitaet/laden/ladezeitensimulator' },
        ],
      },
      Batterie: {
        children: [
          { label: 'Sicherheit', href: '/de/elektromobilitaet/batterie/sicherheit' },
          { label: 'Garantie und Lebensdauer', href: '/de/elektromobilitaet/batterie/garantie-lebensdauer' },
          { label: 'Nachhaltigkeit', href: '/de/elektromobilitaet/batterie/nachhaltigkeit' },
          { label: 'Technologie', href: '/de/elektromobilitaet/batterie/technologie' },
        ],
      },
      'Kosten und Kauf': {
        children: [
          { label: 'Verbrauchskosten', href: '/de/elektromobilitaet/kosten-und-kauf/verbrauchskosten' },
          { label: 'Kaufoptionen', href: '/de/elektromobilitaet/kosten-und-kauf/kaufoptionen' },
          { label: 'E-Auto-Förderung', href: '/de/angebote-und-produkte/e-auto-foerderung' },
        ],
      },
      'Software und Konnektivität': {
        children: [
          { label: 'Die ID. Software 6', href: '/de/elektromobilitaet/software-und-konnektivitaet/neueste-id-software' },
          { label: 'ID. Software Versionen und Updates', href: '/de/elektromobilitaet/software-und-konnektivitaet/id-software-versionen-und-updates' },
          { label: 'VW Connect und We Connect für Ihren ID.', href: '/de/konnektivitaet-und-mobilitaetsdienste/konnektivitaet/vw-connect-id' },
          { label: 'Schnittstellen zu Ihrem ID.', href: '/de/elektromobilitaet/software-und-konnektivitaet/schnittstellen' },
        ],
      },
      Hybridautos: {
        children: [
          { label: 'Golf eTSI', href: '/de/modelle/golf' },
          { label: 'Golf Variant eTSI', href: '/de/modelle/golf-variant' },
          { label: 'Golf GTE', href: '/de/modelle/golf-gte' },
          { label: 'Passat eHybrid', href: '/de/modelle/der-passat' },
          { label: 'Tiguan eHybrid', href: '/de/modelle/der-neue-tiguan' },
          { label: 'Touareg eHybrid', href: '/de/modelle/touareg-final-edition' },
          { label: 'Touareg R eHybrid', href: '/de/modelle/touareg-r' },
        ],
      },
    },
  },
  'Konnektivität und Mobilitätsdienste': {
    items: {
      Konnektivität: {
        children: [
          { label: 'VW Connect', href: '/de/konnektivitaet-und-mobilitaetsdienste/konnektivitaet/vw-connect' },
          { label: 'VW Connect für Ihren ID.', href: '/de/konnektivitaet-und-mobilitaetsdienste/konnektivitaet/vw-connect-id' },
          { label: 'Upgrades', href: '/de/konnektivitaet-und-mobilitaetsdienste/konnektivitaet/upgrades-uebersicht' },
          { label: 'Car-Net', href: '/de/konnektivitaet-und-mobilitaetsdienste/konnektivitaet/car-net' },
          { label: 'App-Connect', href: '/de/konnektivitaet-und-mobilitaetsdienste/konnektivitaet/app-connect' },
        ],
      },
    },
  },
  'Marke und Erlebnis': {
    orderedItems: [
      { label: 'Volkswagen R', href: '/de/marke-und-erlebnis/volkswagen-r' },
      { label: 'Driving Experience', href: '/de/marke-und-erlebnis/driving-experience' },
      { label: 'Volkswagen entdecken', href: '/de/marke-und-erlebnis/volkswagen-entdecken' },
      { label: 'Lifestyle Shop', href: '/de/marke-und-erlebnis/lifestyle-shop' },
      { label: 'we drive football', href: '/de/marke-und-erlebnis/wedrivefootball' },
      { label: '#wedriveproud', href: '/de/marke-und-erlebnis/wedriveproud' },
    ],
    items: {
      'Volkswagen R': {
        children: [
          { label: 'R-Modelle', href: '/de/marke-und-erlebnis/volkswagen-r/r-modelle' },
          { label: 'Virtual Studio', href: 'https://www.volkswagen.de/app/virtual-studio/vw-r/' },
          { label: 'R Experience', href: '/de/marke-und-erlebnis/volkswagen-r/r-experience' },
        ],
      },
      'Driving Experience': {
        children: [
          { label: 'Skill Experiences', href: '/de/marke-und-erlebnis/driving-experience/skill-experiences' },
          { label: 'Ice Experiences', href: '/de/marke-und-erlebnis/driving-experience/ice-experience' },
          { label: 'Media Welt', href: '/de/marke-und-erlebnis/driving-experience/media-welt' },
        ],
      },
      'Volkswagen entdecken': {
        children: [
          { label: 'Werkbesichtigung', href: '/de/marke-und-erlebnis/volkswagen-entdecken/werkbesichtigung' },
          { label: 'Factory visit', href: '/de/marke-und-erlebnis/volkswagen-entdecken/factory-visit' },
        ],
      },
      'Lifestyle Shop': {
        children: [
          { label: 'T-Roc Kollektion', href: '/de/marke-und-erlebnis/lifestyle-shop/t-roc-kollektion' },
          { label: 'Golf Kollektion', href: '/de/marke-und-erlebnis/lifestyle-shop/golf-kollektion' },
          { label: 'ID. Kollektion', href: '/de/marke-und-erlebnis/lifestyle-shop/id-kollektion' },
          { label: 'Volkswagen Kollektion', href: '/de/marke-und-erlebnis/lifestyle-shop/volkswagen-kollektion' },
          { label: 'GTI Kollektion', href: '/de/marke-und-erlebnis/lifestyle-shop/gti-kollektion' },
          { label: 'R-Kollektion', href: '/de/marke-und-erlebnis/lifestyle-shop/r-kollektion' },
        ],
      },
    },
  },
  'Besitzer und Service': {
    orderedItems: [
      { label: 'myVolkswagen', href: '/de/besitzer-und-service/my-volkswagen-overview' },
      { label: 'Software Updates', href: '/de/besitzer-und-service/ueber-ihr-auto/kundeninformationen/software-updates' },
      { label: 'Service und Ersatzteile', href: '/de/besitzer-und-service/service-und-ersatzteile' },
      { label: 'Zubehör', href: '/de/besitzer-und-service/zubehoer' },
      { label: 'Über Ihr Auto', href: '/de/besitzer-und-service/ueber-ihr-auto' },
      { label: 'Magazin', href: '/de/besitzer-und-service/magazin' },
    ],
    items: {
      'Service und Ersatzteile': {
        children: [
          { label: 'Inspektion und HU/AU', href: '/de/besitzer-und-service/service-und-ersatzteile/inspektion-und-hu-au' },
          { label: 'Reparaturen und Checks', href: '/de/besitzer-und-service/service-und-ersatzteile/reparaturen-und-checks' },
          { label: 'Motorenöl und Flüssigkeiten', href: '/de/besitzer-und-service/service-und-ersatzteile/motorenoel-und-fluessigkeiten' },
          { label: 'Räder und Reifen', href: '/de/besitzer-und-service/service-und-ersatzteile/raeder-und-reifen' },
          { label: 'Pannen- und Unfallhilfe', href: '/de/besitzer-und-service/service-und-ersatzteile/pannen-und-unfallhilfe' },
          { label: 'Economy Service', href: '/de/besitzer-und-service/service-und-ersatzteile/economy-service' },
          { label: 'Volkswagen Teile', href: '/de/besitzer-und-service/service-und-ersatzteile/volkswagen-teile' },
        ],
      },
      Zubehör: {
        children: [
          { label: 'Modellspezifisches Zubehör', href: '/de/besitzer-und-service/zubehoer/modellspezifisches-zubehoer' },
          { label: 'Schutz und Pflege', href: '/de/besitzer-und-service/zubehoer/schutz-und-pflege' },
          { label: 'Transport', href: '/de/besitzer-und-service/zubehoer/transport' },
          { label: 'Entertainment und Elektronik', href: '/de/besitzer-und-service/zubehoer/entertainment-und-elektronik' },
          { label: 'Individualisieren', href: '/de/besitzer-und-service/zubehoer/individualisieren' },
          { label: 'Wallbox und Ladekabel', href: '/de/besitzer-und-service/zubehoer/wallbox-und-ladekabel' },
        ],
      },
      'Über Ihr Auto': {
        children: [
          { label: 'Assistenzsysteme', href: '/de/besitzer-und-service/ueber-ihr-auto/fahrerassistenzsysteme' },
          { label: 'Vorgängermodelle', href: '/de/besitzer-und-service/ueber-ihr-auto/vorgaengermodelle' },
          { label: 'Kundeninformationen', href: '/de/besitzer-und-service/ueber-ihr-auto/kundeninformationen' },
          { label: 'Warn- und Kontrollleuchten', href: '/de/besitzer-und-service/ueber-ihr-auto/warn-und-kontrollleuchten' },
          { label: 'Volkswagen Kundenbetreuung', href: '/de/besitzer-und-service/ueber-ihr-auto/hilfe-und-dialogcenter' },
          { label: 'Live Beratung', href: '/de/besitzer-und-service/ueber-ihr-auto/hilfe-und-dialogcenter/liveberatung' },
          { label: 'Digitale Betriebsanleitung', href: '/de/besitzer-und-service/ueber-ihr-auto/digitale-betriebsanleitung' },
        ],
      },
      Magazin: {
        children: [
          { label: 'Lifestyle', href: '/de/besitzer-und-service/magazin/lifestyle' },
          { label: 'Transport', href: '/de/besitzer-und-service/magazin/transport' },
          { label: 'Familie', href: '/de/besitzer-und-service/magazin/familie' },
          { label: 'Elektromobilität', href: '/de/besitzer-und-service/magazin/elektromobilitaet' },
          { label: 'Volkswagen R', href: '/de/besitzer-und-service/magazin/volkswagen-r' },
        ],
      },
    },
  },
};

/**
 * Adds ARIA landmark IDs to <main> and <footer> for skip-link targets.
 * Called once during header decoration so "Skip to main content" / "Skip to footer"
 * links have valid href targets.
 */
function ensureLandmarks() {
  const main = document.querySelector('main');
  const footer = document.querySelector('footer');

  if (main && !main.id) main.id = 'main';
  if (footer && !footer.id) footer.id = 'footer';
}

/** Strips trailing .html from hrefs for EDS-style extensionless URLs. */
function normalizeHref(href) {
  if (!href) return '#';
  return href.endsWith('.html') ? href.replace(/\.html$/, '') : href;
}

/** Extracts trimmed, whitespace-normalized text from an element. */
function getTextContent(el) {
  return el?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

/** Resolves the URL for a section: prefers SECTION_ROOTS mapping, falls back to first item href. */
function getSectionHref(title, firstHref) {
  return normalizeHref(SECTION_ROOTS[title] || firstHref || '#');
}

/** Returns the localized "overview" link label for a given category. */
function getOverviewLabel(title) {
  return OVERVIEW_LABELS[title] || OVERVIEW_LABELS.default;
}

/**
 * Recursively parses a <ul> from the nav fragment into a flat/nested item structure.
 * Each <li> produces { label, href, children[] } — children come from nested <ul>s.
 */
function parseSectionItems(list) {
  return [...(list?.querySelectorAll(':scope > li') || [])].map((item) => {
    const link = item.querySelector(':scope > a');
    return {
      label: getTextContent(link),
      href: normalizeHref(link?.getAttribute('href')),
      children: parseSectionItems(item.querySelector(':scope > ul')),
    };
  });
}

/**
 * Merges hardcoded DRILLDOWN_OVERRIDES into the fragment-parsed navigation items.
 * If orderedItems exist, they replace the item order entirely; otherwise individual
 * items have their children replaced by override children.
 */
function applyDrilldownOverrides(sectionTitle, items) {
  const override = DRILLDOWN_OVERRIDES[sectionTitle];
  if (!override) return items;

  if (override.orderedItems?.length) {
    return override.orderedItems.map((item) => {
      const overrideItem = override.items?.[item.label];
      return {
        label: item.label,
        href: normalizeHref(item.href),
        children: (item.children || overrideItem?.children || []).map((child) => ({
          ...child,
          href: normalizeHref(child.href),
        })),
      };
    });
  }

  return items.map((item) => {
    const overrideItem = override.items?.[item.label];
    if (!overrideItem) return item;

    return {
      ...item,
      children: overrideItem.children?.map((child) => ({
        ...child,
        href: normalizeHref(child.href),
      })) || item.children,
    };
  });
}

/** Returns the sidebar rail content (top links + promo card) for a given section. */
function getRailContent(section) {
  return CATEGORY_RAIL[section?.title] || {
    topLinks: TOP_LINKS,
    promo: {
      kicker: 'Angebote und Produkte',
      title: 'Volkswagen Marktplatz',
      href: '/de/angebote-und-produkte/volkswagen-marktplatz.html',
      imageSrc: '/media_1c1816fcf08dd25dc8859e6aeb1749b4050a83d9e.png?width=2000&format=webply&optimize=medium',
      imageAlt: 'Volkswagen Marktplatz',
    },
  };
}

/**
 * Determines the utility tool kind from its German label text.
 * OUT OF SCOPE: German string matching — should use data attributes or i18n keys.
 */
function getToolKind(label) {
  const normalized = label.toLowerCase();
  if (normalized.includes('händler')) return 'dealer';
  if (normalized.includes('suche')) return 'search';
  if (normalized.includes('konto') || normalized.includes('anmelden')) return 'account';
  return 'link';
}

/**
 * Parses the nav fragment HTML into a structured data object.
 * The fragment is expected to have 3 child <div> sections:
 *   1. Brand section: logo link + quick links <ul>
 *   2. Menu section: nested <ul> with category > item > child hierarchy
 *   3. Tools section: utility links (dealer, search, account)
 *
 * Returns { brand, quickLinks[], sections[], tools[] } used by buildHeaderDom().
 */
function extractNavData(fragment) {
  const brandSection = fragment.querySelector(':scope > div:nth-child(1)');
  const sectionSection = fragment.querySelector(':scope > div:nth-child(2)');
  const toolsSection = fragment.querySelector(':scope > div:nth-child(3)');

  const brandLink = brandSection?.querySelector('a');
  const quickLinks = [...(brandSection?.querySelectorAll('ul a') || [])].map((link) => ({
    label: getTextContent(link),
    href: normalizeHref(link.getAttribute('href')),
  }));

  const sections = [...(sectionSection?.querySelectorAll('.default-content-wrapper > ul > li') || [])].map((item, index) => {
    const title = getTextContent(item.querySelector(':scope > p, :scope > strong, :scope > a'));
    const items = applyDrilldownOverrides(title, parseSectionItems(item.querySelector(':scope > ul')));

    return {
      id: `nav-section-${index}`,
      title,
      href: getSectionHref(title, items[0]?.href),
      items: [
        {
          label: getOverviewLabel(title),
          href: getSectionHref(title, items[0]?.href),
          children: [],
          overview: true,
        },
        ...items,
      ],
    };
  });

  const tools = [...(toolsSection?.querySelectorAll('a') || [])].map((link) => {
    const label = getTextContent(link);
    return {
      label,
      href: normalizeHref(link.getAttribute('href')),
      kind: getToolKind(label),
    };
  });

  return {
    brand: {
      label: brandLink?.getAttribute('title') || getTextContent(brandLink) || 'Volkswagen',
      href: normalizeHref(brandLink?.getAttribute('href') || '/de'),
    },
    quickLinks,
    sections,
    tools,
  };
}

/**
 * Creates VW-style skip navigation links (in German).
 * OUT OF SCOPE: Hardcoded German strings "Zum Hauptinhalt springen" and "Zum Footer springen".
 */
function createSkipLinks() {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-skip-links';
  wrapper.innerHTML = `
    <a class="nav-skip-link" href="#main">Zum Hauptinhalt springen</a>
    <a class="nav-skip-link" href="#footer">Zum Footer springen</a>
  `;
  return wrapper;
}

/** Creates a single utility tool icon+link (dealer, search, or account). */
function createToolLink(tool) {
  const item = document.createElement('li');
  item.className = `nav-tool nav-tool-${tool.kind}`;

  const link = document.createElement('a');
  link.href = tool.href;
  link.className = 'nav-tool-link';
  const labelText = tool.kind === 'account' ? 'Anmelden' : tool.label;
  link.setAttribute('aria-label', labelText);

  const icon = document.createElement('span');
  icon.className = `nav-tool-icon nav-tool-icon-${tool.kind}`;
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = ICONS[tool.kind] || '';
  link.append(icon);

  if (tool.kind === 'dealer') {
    const label = document.createElement('span');
    label.className = 'nav-tool-text';
    label.textContent = labelText;
    link.append(label);
  } else {
    const label = document.createElement('span');
    label.className = 'nav-visually-hidden';
    label.textContent = labelText;
    link.append(label);
  }

  item.append(link);
  return item;
}

/**
 * Builds the full-screen drawer menu (flyout) with three-level drill-down:
 *   1. Overview panel: list of top-level categories
 *   2. Detail panel: items within a selected category
 *   3. Child panel: sub-items within a selected detail item
 *
 * Also renders the sidebar rail (top links + promo card) and footer (legal links).
 * Manages open/close state and attaches event listeners for navigation.
 *
 * @param {Object} data - Structured nav data from extractNavData()
 * @param {HTMLElement} nav - The <nav> element (used for aria-expanded state)
 * @returns {HTMLElement} The flyout container element
 */
function createFlyout(data, nav) {
  const flyout = document.createElement('div');
  flyout.id = 'nav-flyout';
  flyout.className = 'nav-flyout';
  flyout.hidden = true;

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'nav-flyout-backdrop';
  backdrop.setAttribute('aria-label', 'Menü schließen');

  const dialog = document.createElement('div');
  dialog.className = 'nav-flyout-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Menü');

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'nav-flyout-close';
  close.setAttribute('aria-label', 'Menü schließen');
  close.innerHTML = `<span class="nav-close-icon" aria-hidden="true">${ICONS.close}</span><span>Menü schließen</span>`;

  const layout = document.createElement('div');
  layout.className = 'nav-flyout-layout';

  const overview = document.createElement('div');
  overview.className = 'nav-flyout-overview';

  const panel = document.createElement('div');
  panel.className = 'nav-flyout-panel';

  const backButton = document.createElement('button');
  backButton.type = 'button';
  backButton.className = 'nav-back-button';
  backButton.innerHTML = `<span class="nav-back-icon" aria-hidden="true">${ICONS.chevron}</span><span>Zurück</span>`;

  const detailTitle = document.createElement('h2');
  detailTitle.className = 'nav-detail-title';

  const detailBody = document.createElement('div');
  detailBody.className = 'nav-detail-body';

  const itemList = document.createElement('ul');
  itemList.className = 'nav-detail-list';

  const childPanel = document.createElement('div');
  childPanel.className = 'nav-detail-children';

  const aside = document.createElement('aside');
  aside.className = 'nav-flyout-aside';
  const renderRail = (section = null, activeItem = null) => {
    const rail = getRailContent(section);
    const topLinks = activeItem?.rail?.topLinks || rail.topLinks;
    const promo = activeItem?.rail?.promo || rail.promo;
    aside.innerHTML = `
      <div class="nav-top-links">
        <p class="nav-top-links-title">Top-Links</p>
        <ul>
          ${topLinks.map((link) => `<li><a href="${link.href}">${link.label}</a></li>`).join('')}
        </ul>
      </div>
      <a class="nav-promo-card" href="${promo.href}">
        <span class="nav-promo-media" aria-hidden="true">
          <img src="${promo.imageSrc}" alt="${promo.imageAlt || ''}" loading="lazy">
        </span>
        <span class="nav-promo-kicker">${promo.kicker}</span>
        <strong>${promo.title}</strong>
      </a>
    `;
  };

  const footer = document.createElement('div');
  footer.className = 'nav-flyout-footer';
  footer.innerHTML = `
    <ul class="nav-legal-links">
      ${LEGAL_LINKS.map((link) => `<li><a href="${link.href}">${link.label}</a></li>`).join('')}
    </ul>
    <div class="nav-language-switcher" aria-label="Sprachauswahl">
      <button type="button" class="nav-language-button" aria-current="true">DE</button>
    </div>
  `;

  let activeSectionIndex = null;
  let activeItemIndex = null;

  const renderChildPanel = (item) => {
    childPanel.replaceChildren();
    if (!item?.children?.length) return;

    const list = document.createElement('ul');
    list.className = 'nav-child-links';
    item.children.forEach((child, childIndex) => {
      const li = document.createElement('li');
      const anchor = document.createElement('a');
      anchor.href = child.href;
      anchor.textContent = child.label;
      if (childIndex === 0) anchor.classList.add('is-active');
      li.append(anchor);
      list.append(li);
    });
    childPanel.append(list);
  };

  const setActiveItem = (section, itemIndex = null) => {
    activeItemIndex = itemIndex;
    itemList.querySelectorAll('.nav-detail-item').forEach((entry, index) => {
      entry.classList.toggle('is-active', index === itemIndex);
    });
    renderChildPanel(itemIndex !== null ? section.items[itemIndex] : null);
    renderRail(section, itemIndex !== null ? section.items[itemIndex] : null);
  };

  const setDetailSection = (index) => {
    activeSectionIndex = index;
    activeItemIndex = null;
    const section = data.sections[index];

    flyout.dataset.state = 'detail';
    detailTitle.textContent = section.title;
    itemList.replaceChildren();

    section.items.forEach((item, itemIndex) => {
      const li = document.createElement('li');
      li.className = 'nav-detail-item';

      if (item.children?.length) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'nav-detail-trigger';
        button.innerHTML = `<span>${item.label}</span><span class="nav-detail-chevron" aria-hidden="true">${ICONS.chevron}</span>`;
        button.addEventListener('click', () => setActiveItem(section, itemIndex));
        li.append(button);
      } else {
        const anchor = document.createElement('a');
        anchor.href = item.href;
        anchor.className = 'nav-detail-link';
        anchor.textContent = item.label;
        if (item.overview) {
          anchor.addEventListener('focus', () => setActiveItem(section, null));
          anchor.addEventListener('mouseenter', () => setActiveItem(section, null));
        }
        li.append(anchor);
      }

      itemList.append(li);
    });

    renderRail(section);
    setActiveItem(section, null);
  };

  const showOverview = () => {
    activeSectionIndex = null;
    activeItemIndex = null;
    flyout.dataset.state = 'overview';
    detailTitle.textContent = '';
    itemList.replaceChildren();
    childPanel.replaceChildren();
    renderRail();
  };

  const categoryList = document.createElement('ul');
  categoryList.className = 'nav-category-list';
  data.sections.forEach((section, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-category-button';
    button.dataset.index = index;
    button.innerHTML = `<span>${section.title}</span><span class="nav-category-chevron" aria-hidden="true">${ICONS.chevron}</span>`;
    button.addEventListener('click', () => setDetailSection(index));
    item.append(button);
    categoryList.append(item);
  });

  overview.append(categoryList);
  detailBody.append(itemList, childPanel);
  panel.append(backButton, detailTitle, detailBody);
  layout.append(overview, panel, aside);
  dialog.append(close, layout, footer);
  flyout.append(backdrop, dialog);

  const closeMenu = () => {
    nav.setAttribute('aria-expanded', 'false');
    flyout.hidden = true;
    showOverview();
    document.body.classList.remove('nav-open');
    document.body.style.overflow = '';
    nav.querySelector('.nav-menu-button')?.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    nav.setAttribute('aria-expanded', 'true');
    flyout.hidden = false;
    document.body.classList.add('nav-open');
    document.body.style.overflow = 'hidden';
    nav.querySelector('.nav-menu-button')?.setAttribute('aria-expanded', 'true');
    showOverview();
  };

  nav.openMenu = openMenu;
  nav.closeMenu = closeMenu;

  backdrop.addEventListener('click', closeMenu);
  close.addEventListener('click', closeMenu);
  backButton.addEventListener('click', showOverview);

  showOverview();

  return flyout;
}

/**
 * Assembles the complete header DOM: logo, menu button, quick links, utility tools, and flyout.
 * The header structure is:
 *   nav.nav > .nav-shell (logo + primary + tools) + flyout
 *
 * @param {Object} data - Structured nav data from extractNavData()
 * @returns {HTMLElement} The complete <nav> element
 */
function buildHeaderDom(data) {
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.className = 'nav';
  nav.setAttribute('aria-expanded', 'false');

  const shell = document.createElement('div');
  shell.className = 'nav-shell';

  const brand = document.createElement('a');
  brand.className = 'nav-logo';
  brand.href = data.brand.href;
  brand.setAttribute('aria-label', 'Zur Volkswagen Startseite');
  brand.innerHTML = `
    <span class="nav-logo-mark" aria-hidden="true">${ICONS.logo}</span>
    <span class="nav-visually-hidden">${data.brand.label}</span>
  `;

  const primary = document.createElement('div');
  primary.className = 'nav-primary';

  const menuButton = document.createElement('button');
  menuButton.type = 'button';
  menuButton.className = 'nav-menu-button';
  menuButton.setAttribute('aria-controls', 'nav-flyout');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.innerHTML = `
    <span class="nav-menu-icon" aria-hidden="true">${ICONS.menu}</span>
    <span class="nav-menu-label">Menü</span>
  `;

  const quickList = document.createElement('ul');
  quickList.className = 'nav-quick-links';
  data.quickLinks.forEach((link) => {
    const item = document.createElement('li');
    item.innerHTML = `<a href="${link.href}">${link.label}</a>`;
    quickList.append(item);
  });
  primary.append(menuButton, quickList);

  const tools = document.createElement('ul');
  tools.className = 'nav-tools';
  data.tools.forEach((tool) => tools.append(createToolLink(tool)));

  shell.append(brand, primary, tools);

  const flyout = createFlyout(data, nav);

  menuButton.addEventListener('click', () => {
    if (nav.getAttribute('aria-expanded') === 'true') {
      nav.closeMenu();
    } else {
      nav.openMenu();
    }
  });

  nav.append(shell, flyout);
  return nav;
}

/**
 * Binds global event listeners:
 * - Escape key: closes the flyout menu and returns focus to the menu button
 * - Media query change: closes the flyout when switching between mobile/desktop
 */
function bindGlobalEvents(nav) {
  const onKeydown = (event) => {
    if (event.key === 'Escape' && nav.getAttribute('aria-expanded') === 'true') {
      nav.closeMenu();
      nav.querySelector('.nav-menu-button')?.focus();
    }
  };

  const onMediaChange = () => {
    if (nav.getAttribute('aria-expanded') === 'true') {
      nav.closeMenu();
    }
  };

  window.addEventListener('keydown', onKeydown);
  isDesktop.addEventListener('change', onMediaChange);
}

/**
 * Main entry point: loads nav fragment, extracts data, builds DOM.
 * Also adds 'header-overlay' class to <header> for transparent/solid scroll transition
 * (the transition itself is handled by CSS + an IntersectionObserver in hero-stage).
 */
export default async function decorate(block) {
  ensureLandmarks();
  document.querySelector('header')?.classList.add('header-overlay');

  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);
  const data = extractNavData(fragment);

  block.textContent = '';
  block.append(createSkipLinks());

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  const nav = buildHeaderDom(data);
  wrapper.append(nav);
  block.append(wrapper);

  bindGlobalEvents(nav);
}
