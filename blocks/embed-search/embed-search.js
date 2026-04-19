/**
 * Embed Search Block (embed-search)
 *
 * Dual-purpose block that either embeds external content via an iframe OR renders
 * an inline search form from a content fragment. Used on 3 pages for car finder
 * and simulator tools (e.g., Fahrzeugsuche, Ladekostenrechner).
 *
 * Behavior:
 *   - If the block contains a valid external URL: renders a lazy-loaded iframe
 *     (via IntersectionObserver) with an optional placeholder image.
 *   - If the URL is same-origin, invalid, or "#" AND the section has the 'dark' style:
 *     swaps itself to render the search-form block inline via the search fragment.
 *
 * FRAGMENT PATTERN:
 *   SEARCH_FRAGMENT ('/content/de/fragments/search') references a content fragment that
 *   contains a `search-form` block. When the embed URL is same-origin or invalid AND the
 *   section has `dark` style, this block fetches the fragment's .plain.html, extracts the
 *   search-form markup, swaps its own block identity (className + dataset.blockName), and
 *   dynamically imports and runs the search-form decorator. This effectively transforms
 *   an embed-search block into a search-form block at runtime.
 *
 * Content model (authored in Universal Editor):
 *   Row 1: A link (<a>) to the external URL to embed, optionally with a <picture> placeholder.
 *
 * @see embed-search.css for iframe sizing and placeholder styling
 * @see search-form/search-form.js for the inline search form decorator
 * @see _embed-search.json for the Universal Editor component model definition
 */

// OUT OF SCOPE: Hardcoded fragment path '/content/de/fragments/search'. In production,
// this should be configurable via block properties or metadata. The search fragment contains
// the actual search-form block which gets loaded and decorated inline.
const SEARCH_FRAGMENT = '/content/de/fragments/search';

/**
 * Loads the search fragment HTML, swaps this block's identity from embed-search to
 * search-form, and dynamically imports and runs the search-form decorator.
 * This allows the embed-search block to render inline search UI instead of an iframe.
 *
 * @param {HTMLElement} block - The embed-search block element to transform
 * @returns {boolean} true if the search form was successfully rendered
 */
async function renderSearchForm(block) {
  const resp = await fetch(`${SEARCH_FRAGMENT}.plain.html`);
  if (!resp.ok) return false;
  const html = await resp.text();
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const sfBlock = tmp.querySelector('.search-form');
  if (!sfBlock) return false;

  // Load search-form CSS
  const cssHref = `${window.hlx.codeBasePath}/blocks/search-form/search-form.css`;
  if (!document.querySelector(`link[href="${cssHref}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    document.head.append(link);
  }

  // Swap block identity and run search-form decorator
  block.className = block.className.replace('embed-search', 'search-form');
  block.dataset.blockName = 'search-form';
  block.innerHTML = sfBlock.innerHTML;
  const { default: decorateSearchForm } = await import('../search-form/search-form.js');
  await decorateSearchForm(block);
  return true;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  if (!link) return;

  const url = link.href;

  // Guard against invalid URLs or same-origin URLs (EDS pages shouldn't iframe each other).
  // This prevents the page from iframing itself (which would cause infinite recursion)
  // and catches placeholder links like href="#" from the import pipeline.
  const linkUrl = new URL(url, window.location.origin);
  const isInvalid = !url
    || url === '#'
    || url.endsWith('#')
    || linkUrl.origin === window.location.origin
    || url === window.location.href
    || url === `${window.location.href}#`;

  if (isInvalid) {
    // Same-origin link in a dark section -> render as inline search form.
    // The 'dark' class on the section is used as a signal that this embed-search
    // instance should display the Schnellsuche (quick search) form instead of an iframe.
    const section = block.closest('.section');
    if (section?.classList.contains('dark')) {
      const loaded = await renderSearchForm(block);
      if (loaded) return;
    }
    // Otherwise keep block content as-is
    return;
  }

  const placeholder = block.querySelector('picture') || block.querySelector('img');

  block.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'embed-search-placeholder';

  if (placeholder) {
    wrapper.append(placeholder);
  }

  block.append(wrapper);

  // Lazy-load the iframe only when the placeholder scrolls into view.
  // This avoids loading heavy external content (e.g., car configurators) until needed.
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.setAttribute('loading', 'lazy');
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('frameborder', '0');
        iframe.title = 'Embedded content';
        wrapper.replaceWith(iframe);
        observer.disconnect();
      }
    });
  }, { threshold: 0.1 });

  observer.observe(wrapper);
}
