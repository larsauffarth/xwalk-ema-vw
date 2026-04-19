/* eslint-disable */
/* global WebImporter */

/**
 * Import Parser: embed-search
 *
 * Extracts car search embed content from VW SPA DOM during Playwright-based import.
 * Note: This parser is used by the DOM-scraping import path, NOT by the JSON-based
 * importer (component-mappers.js).
 *
 * The VW car search ("Schnellsuche") is a client-side feature app — the actual search
 * form is rendered by JavaScript at runtime. This parser extracts a meaningful link
 * to represent the embed, trying various link selectors (modelle, autosuche, etc.).
 *
 * Output: WebImporter block with name='embed-search', 1 row, 1 cell containing:
 *   <!-- field:embed_placeholder --> (optional placeholder image)
 *   <!-- field:embed_uri --> + link to search destination
 *
 * OUT OF SCOPE: Hardcoded fallback URL (volkswagen.de/de/modelle/verfuegbare-fahrzeuge.html).
 * If the DOM contains no matching links, a static fallback URL is used.
 *
 * Source selector: #schnellsuche .featureAppSection
 * Model fields: embed_placeholder (reference), embed_placeholderAlt (collapsed), embed_uri (text)
 */
export default function parse(element, { document }) {
  // This is a feature app (car search tool). Extract a meaningful link for the embed.
  // The actual search form is rendered client-side, so we create an embed pointing to
  // the car search functionality.

  // Try to find any meaningful link inside the feature app section
  const searchLink = element.querySelector(
    'a[href*="modelle"], a[href*="autosuche"], a[href*="konfigurator"], '
    + 'a[href*="verfuegbare-fahrzeuge"], a[href*="simulator"], a[href*="rechner"], '
    + 'a[class*="StyledButton"], a[class*="StyledLink"]'
  );

  // Build cell: placeholder image + URI (grouped in one cell per field prefix 'embed_')
  const contentCell = document.createDocumentFragment();

  // Field: embed_placeholder (reference - optional placeholder image)
  contentCell.appendChild(document.createComment(' field:embed_placeholder '));

  // Field: embed_uri
  contentCell.appendChild(document.createComment(' field:embed_uri '));
  if (searchLink) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = searchLink.href;
    a.textContent = searchLink.textContent.trim() || searchLink.href;
    p.appendChild(a);
    contentCell.appendChild(p);
  } else {
    // Fallback: use the schnellsuche section URL
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = 'https://www.volkswagen.de/de/modelle/verfuegbare-fahrzeuge.html';
    a.textContent = 'Fahrzeugsuche';
    p.appendChild(a);
    contentCell.appendChild(p);
  }

  const cells = [[contentCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'embed-search', cells });
  element.replaceWith(block);
}
