/**
 * VW Germany Footer Block
 *
 * Loads footer content from a fragment (/footer by default, configurable via 'footer' metadata).
 *
 * FRAGMENT PATTERN: The footer loads its content from /content/footer/index.html via
 * the fragment loader. The fragment is expected to have 2 sections:
 * - Section 1: Navigation columns (h2 headings followed by link lists)
 * - Section 2: Legal links paragraph + copyright paragraph
 *
 * The decorator restructures the flat fragment content into:
 * - .footer-nav: 3-column layout with grouped h2+ul pairs
 * - .footer-legal: Legal links + copyright line
 */

import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';

  // Extract the 3 nav columns and legal section from the decorated fragment.
  // The fragment loader wraps content in .section > .default-content-wrapper,
  // so we need to pull out the actual elements and restructure them.
  const sections = fragment.querySelectorAll('.section');

  // Nav columns: the first section contains 3 groups (h2 + ul each)
  const nav = document.createElement('div');
  nav.className = 'footer-nav';
  const firstWrapper = sections[0]?.querySelector('.default-content-wrapper');
  if (firstWrapper) {
    // Column grouping logic: iterate through flat children and start a new column
    // each time an <h2> is encountered. All subsequent elements (typically <ul> link lists)
    // are appended to that column until the next <h2>.
    let col = null;
    [...firstWrapper.children].forEach((el) => {
      if (el.tagName === 'H2') {
        col = document.createElement('div');
        col.className = 'footer-col';
        col.append(el);
        nav.append(col);
      } else if (col) {
        col.append(el);
      }
    });
  }

  // Legal section: second section has legal links paragraph + copyright paragraph
  const legal = document.createElement('div');
  legal.className = 'footer-legal';
  const secondWrapper = sections[1]?.querySelector('.default-content-wrapper');
  if (secondWrapper) {
    [...secondWrapper.children].forEach((el) => legal.append(el));
  }

  // Copyright detection: the last <p> in the legal section is assumed to be the
  // copyright line (e.g., "© Volkswagen AG"). It gets a special class for styling.
  const lastP = legal.querySelector('p:last-child');
  if (lastP) lastP.className = 'footer-copyright';

  block.append(nav, legal);
}
