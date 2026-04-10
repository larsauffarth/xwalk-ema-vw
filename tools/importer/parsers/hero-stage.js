/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero-stage. Base: hero.
 * Source: https://www.volkswagen.de/de.html
 * Selector: .basicStageSection
 * Model fields: image (reference), imageAlt (collapsed), text (richtext)
 * Block library: 1 column, row 1 = image, row 2 = text (heading + CTA)
 *
 * VW SPA delivers hero images as base64 SVG placeholders with real URLs in
 * <source srcset> or via network-captured image mapping. This parser tries
 * multiple strategies to recover the actual image.
 */
export default function parse(element, { document }) {
  // --- Extract image ---
  // Strategy 1: find an <img> with a real src (not base64/data URI)
  let img = element.querySelector('img[src^="http"]');

  // Strategy 2: look inside <picture> for <source> with srcset
  if (!img) {
    const source = element.querySelector('picture source[srcset]');
    if (source) {
      img = document.createElement('img');
      img.src = source.getAttribute('srcset').split(' ')[0];
      img.alt = (element.querySelector('picture img') || {}).alt || '';
    }
  }

  // Strategy 3: use the placeholder img (has alt text even if src is base64)
  if (!img) {
    const placeholder = element.querySelector('img[class*="Image-sc"]');
    if (placeholder) {
      img = document.createElement('img');
      // Use alt text from placeholder; src stays empty (author fills in AEM)
      img.alt = placeholder.alt || '';
      img.src = '';
    }
  }

  // --- Extract heading ---
  const heading = element.querySelector('h1, h2, [class*="headingElement"] h1, [class*="headingElement"] h2');

  // --- Extract CTA ---
  const ctaLink = element.querySelector('[class*="buttonElement"] a, a[class*="StyledButton"]');

  // Row 1: image
  const imageCell = [];
  const frag1 = document.createDocumentFragment();
  frag1.appendChild(document.createComment(' field:image '));
  if (img) {
    const picture = document.createElement('picture');
    const imgEl = document.createElement('img');
    imgEl.src = img.src || '';
    imgEl.alt = img.alt || '';
    picture.appendChild(imgEl);
    frag1.appendChild(picture);
  }
  imageCell.push(frag1);

  // Row 2: text (heading + CTA)
  const textCell = [];
  const frag2 = document.createDocumentFragment();
  frag2.appendChild(document.createComment(' field:text '));
  if (heading) {
    const h = document.createElement('h1');
    h.textContent = heading.textContent.trim();
    frag2.appendChild(h);
  }
  if (ctaLink) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.href = ctaLink.href;
    a.textContent = ctaLink.textContent.trim();
    p.appendChild(a);
    frag2.appendChild(p);
  }
  textCell.push(frag2);

  const cells = [imageCell, textCell];
  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-stage', cells });
  element.replaceWith(block);
}
