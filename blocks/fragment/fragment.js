/**
 * Fragment Block
 *
 * Include content on a page as a fragment — the standard EDS pattern for
 * reusable content (navigation, footers, shared sections).
 * https://www.aem.live/developer/block-collection/fragment
 *
 * The `loadFragment` function is exported and used by:
 * - header/header.js (loads /nav fragment)
 * - footer/footer.js (loads /footer fragment)
 * - embed-search/embed-search.js (loads search fragment)
 *
 * Note: There is a circular import between this file and scripts.js
 * (fragment imports decorateMain, scripts imports loadFragment via block loading).
 * The eslint-disable below acknowledges this intentional circular dependency.
 */

// eslint-disable-next-line import/no-cycle
import {
  decorateMain,
} from '../../scripts/scripts.js';

import {
  loadSections,
} from '../../scripts/aem.js';

/**
 * Loads a fragment from the given path, decorates it, and returns the root element.
 * @param {string} path The path to the fragment (e.g., '/nav', '/footer')
 * @returns {HTMLElement|null} The decorated <main> element, or null on failure
 */
export async function loadFragment(path) {
  if (path && path.startsWith('/')) {
    // eslint-disable-next-line no-param-reassign
    path = path.replace(/(\.plain)?\.html/, '');
    const resp = await fetch(`${path}.plain.html`);
    if (resp.ok) {
      const main = document.createElement('main');
      main.innerHTML = await resp.text();

      // Media path rebasing: relative media paths (./media_*) in the fragment HTML
      // are resolved against the fragment's own base path, not the current page URL.
      // Without this, an image at /nav/media_abc.png would incorrectly resolve to
      // /de/media_abc.png when loaded on the /de page. This rewrites src/srcset
      // attributes to absolute URLs based on the fragment's path.
      const resetAttributeBase = (tag, attr) => {
        main.querySelectorAll(`${tag}[${attr}^="./media_"]`).forEach((elem) => {
          elem[attr] = new URL(elem.getAttribute(attr), new URL(path, window.location)).href;
        });
      };
      resetAttributeBase('img', 'src');
      resetAttributeBase('source', 'srcset');

      decorateMain(main);
      await loadSections(main);
      return main;
    }
  }
  return null;
}

/**
 * Block decorator: extracts the first .section from the loaded fragment and merges
 * its classes into the block element. This allows fragment sections to carry styling
 * classes (e.g., 'dark') that propagate to the embedding page.
 */
export default async function decorate(block) {
  const link = block.querySelector('a');
  const path = link ? link.getAttribute('href') : block.textContent.trim();
  const fragment = await loadFragment(path);
  if (fragment) {
    const fragmentSection = fragment.querySelector(':scope .section');
    if (fragmentSection) {
      block.classList.add(...fragmentSection.classList);
      block.classList.remove('section');
      block.replaceChildren(...fragmentSection.childNodes);
    }
  }
}
