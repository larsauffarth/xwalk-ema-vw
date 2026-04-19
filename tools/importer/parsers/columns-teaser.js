/* eslint-disable */
/* global WebImporter */

/**
 * Import Parser: columns-teaser
 *
 * Extracts teaser content into a columns layout from VW SPA DOM during
 * Playwright-based import. Note: This parser is used by the DOM-scraping
 * import path, NOT by the JSON-based importer (component-mappers.js).
 *
 * Uses 3 patterns to extract content, tried in order:
 * 1. textOnlyTeaserSection: Multiple .xfTextOnlyTeaser items side by side,
 *    each with heading + richtext + link. Creates one column per teaser.
 * 2. focusTeaserSection: Image on one side (.StyledMediaElementWrapper) +
 *    text on other side (.StyledTeaserTextWrapper). Creates 2-column layout.
 * 3. Broad fallback: Groups content by heading elements found in the container.
 *
 * Output: WebImporter block with name='columns-teaser', 1 row with N columns.
 * Note: Columns blocks do NOT use field hints (xwalk Rule 4 exception).
 *
 * Source selectors: .textOnlyTeaserSection, .focusTeaserSection
 */
export default function parse(element, { document }) {
  const columnCells = [];

  // Pattern 1: textOnlyTeaserSection — multiple .xfTextOnlyTeaser items side by side
  const textTeasers = element.querySelectorAll('[class*="xfTextOnlyTeaser"]');

  // Pattern 2: focusTeaserSection — single image+text split layout
  const isFocusTeaser = element.classList.contains('focusTeaserSection')
    || element.querySelector('[class*="focusTeaserSection"]')
    || element.querySelector('[class*="focus-teaser__"]');

  if (textTeasers.length > 0) {
    // Handle text-only teasers (homepage "Angebote und Aktionen")
    textTeasers.forEach((teaser) => {
      columnCells.push(extractTextContent(teaser, document));
    });
  } else if (isFocusTeaser) {
    // Handle focus teaser (image + text side by side)
    const mediaWrapper = element.querySelector('[class*="StyledMediaElementWrapper"], [class*="StyledFocusTeaserWrapper"] > div:first-child');
    const textWrapper = element.querySelector('[class*="StyledTeaserTextWrapper"], [class*="StyledFocusTeaserWrapper"] > div:last-child');

    // Image column
    const imgCell = document.createDocumentFragment();
    if (mediaWrapper) {
      const img = mediaWrapper.querySelector('img[src^="http"], img[alt]');
      if (img) {
        const picture = document.createElement('picture');
        const imgEl = document.createElement('img');
        imgEl.src = img.src || '';
        imgEl.alt = img.alt || '';
        picture.appendChild(imgEl);
        imgCell.appendChild(picture);
      }
      // Also grab the link wrapping the image
      const imageLink = mediaWrapper.querySelector('a[href]');
      if (imageLink && !img) {
        const p = document.createElement('p');
        const a = document.createElement('a');
        a.href = imageLink.href;
        a.textContent = imageLink.textContent.trim() || 'Link';
        p.appendChild(a);
        imgCell.appendChild(p);
      }
    }
    columnCells.push(imgCell);

    // Text column
    if (textWrapper) {
      columnCells.push(extractTextContent(textWrapper, document));
    } else {
      // Fallback: extract text from the element itself (minus the media)
      columnCells.push(extractTextContent(element, document));
    }
  } else {
    // Broad fallback: try to find any heading+text groupings
    const headings = element.querySelectorAll('h2, h3');
    if (headings.length >= 2) {
      // Multiple headings suggest multiple columns
      headings.forEach((h) => {
        const parent = h.closest('[class*="EditableComponent"]') || h.parentElement;
        columnCells.push(extractTextContent(parent, document));
      });
    } else {
      // Single content — put in one column
      columnCells.push(extractTextContent(element, document));
      columnCells.push(document.createDocumentFragment()); // empty second column
    }
  }

  const cells = columnCells.length > 0 ? [columnCells] : [['', '']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-teaser', cells });
  element.replaceWith(block);
}

function extractTextContent(container, document) {
  const cell = document.createDocumentFragment();

  // Heading
  const heading = container.querySelector('[class*="headingElement"] h2, [class*="headingElement"] h3, h2, h3');
  if (heading) {
    const h = document.createElement('h3');
    h.textContent = heading.textContent.trim();
    cell.appendChild(h);
  }

  // Body text
  const paragraphs = container.querySelectorAll(
    '[class*="richtextFullElement"] p, [class*="richtextSimpleElement"] p, [class*="copyItem"] p'
  );
  paragraphs.forEach((p) => {
    const newP = document.createElement('p');
    newP.textContent = p.textContent.trim();
    if (newP.textContent) cell.appendChild(newP);
  });

  // Link
  const link = container.querySelector(
    '[class*="linkElement"] a, a[class*="StyledLink"]:not([class*="image-link"])'
  );
  if (link) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.textContent.trim();
    p.appendChild(a);
    cell.appendChild(p);
  }

  return cell;
}
