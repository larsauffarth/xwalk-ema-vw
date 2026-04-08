/* eslint-disable */
/* global WebImporter */

/**
 * Parser for embed-search. Base: embed.
 * Source: https://www.volkswagen.de/de.html
 * Selector: #schnellsuche .featureAppSection
 * Model fields: embed_placeholder (reference), embed_placeholderAlt (collapsed), embed_uri (text)
 * Block library: 1 column, 1 row = placeholder image + URI link
 * Note: embed_placeholder and embed_placeholderAlt are grouped (same prefix),
 *       and embed_uri is separate. But both share prefix 'embed_' so they go in one cell.
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
