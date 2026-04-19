/* eslint-disable */
/* global WebImporter */

/**
 * Import Parser: cards-model
 *
 * Extracts model/product card items from VW SPA DOM during Playwright-based import.
 * Note: This parser is used by the DOM-scraping import path, NOT by the JSON-based
 * importer (component-mappers.js).
 *
 * Uses 4 strategies to find card items, tried in order:
 * 1. model-slide items: Carousel slides from the "Beliebte Modelle" feature app,
 *    identified by [class*="model-slide"] or li[class*="Slide"] selectors.
 * 2. expandCollapseItem items: Icon teasers like "Finden Sie Ihren VW",
 *    identified by [class*="expandCollapseItem"] selector.
 * 3. Generic list items: Any <li> elements inside feature app containers,
 *    used for model overview grids.
 * 4. Broad fallback: Groups images with their closest container elements,
 *    looking for card-like structures with headings and CTAs.
 *
 * Output: WebImporter block with name='cards-model', N rows (one per card).
 *   Each row: Col1 = <!-- field:image --> + image, Col2 = <!-- field:text --> + heading + desc + CTA
 *
 * Source selectors: .featureAppSection, .expandCollapseSection (various contexts)
 */
export default function parse(element, { document }) {
  const cells = [];

  // Strategy 1: model-slide items (Beliebte Modelle carousel)
  let items = element.querySelectorAll('[class*="model-slide"], li[class*="Slide"]');

  // Strategy 2: expandCollapse items (icon teasers)
  if (items.length === 0) {
    items = element.querySelectorAll('[class*="expandCollapseItem"]');
  }

  // Strategy 3: generic list items inside feature apps
  if (items.length === 0) {
    items = element.querySelectorAll('[class*="FeatureApp"] li, [class*="featureApp"] li');
  }

  // Strategy 4: any repeated card-like structures with images
  if (items.length === 0) {
    const images = element.querySelectorAll('img[src^="http"]');
    if (images.length > 1) {
      // Group by finding closest common parent for each image
      images.forEach((img) => {
        const card = img.closest('li') || img.closest('[class*="Card"]') || img.closest('div > div');
        if (card && !card.dataset.processed) {
          card.dataset.processed = 'true';
          const heading = card.querySelector('h2, h3');
          const desc = card.querySelector('p, [class*="price"], [class*="Price"]');
          const cta = card.querySelector('a[class*="StyledButton"], a[href*="konfigurator"]');
          cells.push(buildCardRow(document, img, heading, desc, cta));
        }
      });
    }
  }

  // Process items from strategies 1-3
  if (cells.length === 0 && items.length > 0) {
    Array.from(items).forEach((item) => {
      const img = item.querySelector('img[src^="http"], img[class*="Image-sc"]');
      const heading = item.querySelector('h2, h3, [class*="headingElement"] h2, [class*="headingElement"] h3');
      const desc = item.querySelector(
        'p, [class*="copyItem"], [class*="price"], [class*="jolvuK"], [class*="kUIcLI"]'
      );
      const cta = item.querySelector(
        'a[class*="StyledButton"], a[href*="konfigurator"], [class*="linkElement"] a'
      );
      cells.push(buildCardRow(document, img, heading, desc, cta));
    });
  }

  // Ensure at least one empty row
  if (cells.length === 0) {
    cells.push(buildCardRow(document, null, null, null, null));
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-model', cells });
  element.replaceWith(block);
}

function buildCardRow(document, img, heading, desc, cta) {
  // Col 1: image
  const imageCell = document.createDocumentFragment();
  imageCell.appendChild(document.createComment(' field:image '));
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
  textCell.appendChild(document.createComment(' field:text '));
  if (heading) {
    const h = document.createElement('h3');
    h.textContent = heading.textContent.trim();
    textCell.appendChild(h);
  }
  if (desc) {
    const text = desc.textContent.trim();
    if (text) {
      const p = document.createElement('p');
      p.textContent = text;
      textCell.appendChild(p);
    }
  }
  if (cta) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = cta.href;
    a.textContent = cta.textContent.trim();
    p.appendChild(a);
    textCell.appendChild(p);
  }

  return [imageCell, textCell];
}
