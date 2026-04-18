import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
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

  // Mark the copyright paragraph
  const lastP = legal.querySelector('p:last-child');
  if (lastP) lastP.className = 'footer-copyright';

  block.append(nav, legal);
}
