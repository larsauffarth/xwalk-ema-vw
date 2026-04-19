/* eslint-disable */
/* global WebImporter */

/**
 * Import Parser: carousel-featured
 *
 * Extracts carousel/grid items from VW SPA DOM during Playwright-based import.
 * Note: This parser is used by the DOM-scraping import path (import-*.js bundle files),
 * NOT by the JSON-based importer (json-importer.js which uses component-mappers.js).
 *
 * Uses 3 strategies to find items, tried in order:
 * 1. expandCollapseSection: Items are self-contained <li> elements inside
 *    expandCollapseSectionParsys, each with image + heading + copy + link.
 * 2. uspSection: Items are sibling groups within a flex container. Images and
 *    headings are matched by index position (first image with first heading, etc.).
 * 3. Broad fallback: Finds any image+heading groupings in the element.
 *
 * Output: WebImporter block with name='carousel-featured', N rows (one per item).
 *   Each row: Col1 = <!-- field:media_image --> + image, Col2 = <!-- field:content_text --> + text
 *
 * Source selectors: .uspSection, .expandCollapseSection
 */
export default function parse(element, { document }) {
  const cells = [];

  // Strategy 1: USP section — items are repeated blocks within the section
  // Each "item" is a sibling group: image block + text block within the flex layout
  // The USP section contains multiple image+text pairs in alternating containers
  const uspImages = element.querySelectorAll('[class*="imageElement"] img[src^="http"]');
  const uspHeadings = element.querySelectorAll('[class*="headingElement"] h2, [class*="headingElement"] h3');
  const uspCopy = element.querySelectorAll('[class*="copyItem"]');
  const uspLinks = element.querySelectorAll('[class*="linkElement"] a, a[class*="StyledLink"]');

  // Strategy 2: expandCollapse items — each li is a self-contained item
  const expandItems = element.querySelectorAll('[class*="expandCollapseItem"]');

  if (expandItems.length > 0) {
    // Process expand/collapse items
    expandItems.forEach((item) => {
      const img = item.querySelector('img[src^="http"], img[class*="Image-sc"]');
      const heading = item.querySelector('[class*="headingElement"] h2, [class*="headingElement"] h3, h2, h3');
      const body = item.querySelector('[class*="copyItem"] p, [class*="richtextFullElement"] p, [class*="richtextSimpleElement"] p');
      const link = item.querySelector('[class*="linkElement"] a, a[class*="StyledLink"]');

      cells.push(buildSlideRow(document, img, heading, body, link));
    });
  } else if (uspImages.length > 0) {
    // Process USP section — match images to headings by index
    const count = Math.max(uspImages.length, uspHeadings.length);
    for (let i = 0; i < count; i++) {
      const img = uspImages[i] || null;
      const heading = uspHeadings[i] || null;
      const body = uspCopy[i] || null;
      const link = uspLinks[i] || null;

      cells.push(buildSlideRow(document, img, heading, body, link));
    }
  } else {
    // Strategy 3: Broad fallback — find any image+text groupings
    const allImages = element.querySelectorAll('img[src^="http"], img[alt]:not([src^="data:image/svg+xml;base64"])');
    const allHeadings = element.querySelectorAll('h2, h3');

    if (allImages.length > 0 || allHeadings.length > 0) {
      const count = Math.max(allImages.length, allHeadings.length, 1);
      for (let i = 0; i < count; i++) {
        cells.push(buildSlideRow(document, allImages[i] || null, allHeadings[i] || null, null, null));
      }
    }
  }

  // Ensure at least one empty row
  if (cells.length === 0) {
    cells.push(buildSlideRow(document, null, null, null, null));
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-featured', cells });
  element.replaceWith(block);
}

function buildSlideRow(document, img, heading, body, link) {
  // Col 1: image
  const imageCell = document.createDocumentFragment();
  imageCell.appendChild(document.createComment(' field:media_image '));
  if (img) {
    const picture = document.createElement('picture');
    const imgEl = document.createElement('img');
    imgEl.src = img.src || '';
    imgEl.alt = img.alt || '';
    picture.appendChild(imgEl);
    imageCell.appendChild(picture);
  }

  // Col 2: text
  const textCell = document.createDocumentFragment();
  textCell.appendChild(document.createComment(' field:content_text '));
  if (heading) {
    const h = document.createElement('h3');
    h.textContent = heading.textContent.trim();
    textCell.appendChild(h);
  }
  if (body) {
    const p = document.createElement('p');
    p.textContent = body.textContent.trim();
    if (p.textContent) textCell.appendChild(p);
  }
  if (link) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = link.href;
    a.textContent = link.textContent.trim();
    p.appendChild(a);
    textCell.appendChild(p);
  }

  return [imageCell, textCell];
}
