/* eslint-disable */
/* global WebImporter */

/**
 * Parser for carousel-featured. Base: carousel.
 * Source: https://www.volkswagen.de/de.html
 * Selectors: .uspSection, .expandCollapseSection
 * Model fields (per slide): media_image (reference), media_imageAlt (collapsed), content_text (richtext)
 * Block library: 2 columns per row. Col1 = image, Col2 = text (heading + description + CTA)
 * Container block: each child item = one row
 *
 * VW DOM patterns handled:
 * - uspSection: items are siblings within a flex container, each has image + heading + copy + link
 * - expandCollapseSection: items are li elements inside expandCollapseSectionParsys > ul
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
