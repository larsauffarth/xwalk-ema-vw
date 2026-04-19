/**
 * VW Germany — Page Lifecycle & Decoration (scripts.js)
 *
 * Main entry point for the EDS page lifecycle. Orchestrates:
 * 1. loadEager: Template/theme decoration, section decoration, first section render (LCP)
 * 2. loadLazy: Header/footer loading, remaining sections, fonts
 * 3. loadDelayed: Analytics and non-critical features (3s delay)
 *
 * Custom VW additions beyond standard EDS boilerplate:
 * - moveAttributes / moveInstrumentation: xwalk Universal Editor attribute transfer
 * - fixSectionSplits: Runtime DOM restructuring for sections that the content
 *   pipeline cannot split correctly (see detailed comments below)
 */

import {
  loadHeader,
  loadFooter,
  decorateButtons,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * Moves all the attributes from a given element to another given element.
 *
 * xwalk helper: When block decoration restructures the DOM (e.g., unwrapping
 * a <div> into a different parent), attributes on the original element must be
 * transferred to the new element. This is critical for `data-aue-*` and
 * `data-richtext-*` attributes used by the Universal Editor — without the
 * transfer, the editor loses its mapping between content properties and DOM nodes.
 *
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 * @param {string[]} [attributes] optional list of attribute names to move; defaults to all
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 *
 * Convenience wrapper around moveAttributes that filters for xwalk instrumentation
 * attributes only: `data-aue-*` (AEM Universal Editor) and `data-richtext-*`
 * (richtext field identification). Called during block decoration when the DOM
 * structure changes but the content mapping must be preserved.
 *
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * Load fonts.css and set a session storage flag.
 *
 * Fonts are loaded conditionally in loadEager: desktop (>=900px) loads immediately
 * (assumed fast connection), while mobile defers font loading until the loadLazy
 * phase to avoid blocking LCP. Once loaded, a sessionStorage flag prevents
 * re-evaluation on subsequent navigations.
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 *
 * Auto-blocks are blocks injected programmatically based on page content
 * (e.g., automatically wrapping YouTube links in an embed block). Currently
 * a no-op placeholder — no auto-block rules have been needed for the VW migration.
 *
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed (e.g., embed blocks for external URLs)
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Fix section splits that the content pipeline produces incorrectly.
 *
 * The JSON importer produces flat HTML where some logically separate sections
 * end up merged into one <div>. This function runs after decorateSections()
 * to split them into proper EDS sections at runtime.
 *
 * Why this exists:
 * The AEM .model.json structure nests components in ways that don't always
 * map 1:1 to EDS section boundaries. Rather than making the importer more
 * complex, we fix the DOM here after standard decoration.
 *
 * Split 1: "Beliebte Modelle" — The MOFA feature app heading shares a section
 * with Modell-Highlights content. We split it into its own section and inject
 * an empty cards-model block placeholder for the Universal Editor.
 *
 * Split 2: "Finden Sie Ihren Volkswagen" — The carousel-featured (light bg)
 * and embed-search (dark bg) are in one section but need different backgrounds.
 * We split the carousel into a new light section.
 *
 * OUT OF SCOPE: Both splits use hardcoded German heading text matching
 * ("Beliebte Modelle", "Finden Sie Ihren") which is fragile and not localizable.
 * In production, section boundaries should be defined in the content structure
 * (e.g., via section metadata or content modeling) rather than runtime text matching.
 */
function fixSectionSplits(main) {
  // Split 1: "Beliebte Modelle" shares section with Modell-Highlights — split out
  main.querySelectorAll('.default-content-wrapper').forEach((wrapper) => {
    const h2 = wrapper.querySelector('h2');
    if (!h2 || !h2.textContent.trim().includes('Beliebte Modelle')) return;
    const section = wrapper.closest('.section');
    if (!section) return;

    const newSection = document.createElement('div');
    newSection.className = 'section cards-model-container';
    newSection.append(wrapper);

    const blockWrapper = document.createElement('div');
    blockWrapper.className = 'cards-model-wrapper';
    const block = document.createElement('div');
    block.className = 'cards-model block';
    block.dataset.blockName = 'cards-model';
    blockWrapper.append(block);
    newSection.append(blockWrapper);

    section.after(newSection);
  });

  // Split 2: "Finden Sie Ihren Volkswagen" — split carousel-featured (light bg)
  //           from embed-search (dark bg) so they can have different section styles
  main.querySelectorAll('.default-content-wrapper').forEach((wrapper) => {
    const h2 = wrapper.querySelector('h2');
    if (!h2 || !h2.textContent.trim().includes('Finden Sie Ihren')) return;
    const section = wrapper.closest('.section');
    if (!section) return;
    // Before decorateBlocks: block divs aren't wrapped yet, find the raw div
    const carouselDiv = section.querySelector('div.carousel-featured')
      || section.querySelector('.carousel-featured-wrapper');
    if (!carouselDiv) return;
    // The carousel div may or may not have a wrapper parent
    const carouselWrapper = carouselDiv.closest('.carousel-featured-wrapper') || carouselDiv.parentElement;

    const lightSection = document.createElement('div');
    lightSection.className = 'section carousel-featured-container';
    section.parentNode.insertBefore(lightSection, section);
    lightSection.append(wrapper);
    // Move the carousel block (and its wrapper if it exists) into the light section
    if (carouselWrapper !== section) {
      lightSection.append(carouselWrapper);
    } else {
      lightSection.append(carouselDiv);
    }
    section.classList.remove('carousel-featured-container');
  });
}

/**
 * Decorates the main element.
 *
 * Decoration pipeline order matters:
 * 1. decorateButtons — Wraps standalone links in .button classes (must run before blocks)
 * 2. decorateIcons — Loads SVG icon sprites referenced via :icon-name: syntax
 * 3. buildAutoBlocks — Inject synthetic blocks (currently a no-op)
 * 4. decorateSections — Wraps content between --- markers into .section divs
 * 5. fixSectionSplits — VW-specific: re-split merged sections (must run after decorateSections
 *    because it relies on .default-content-wrapper elements, and before decorateBlocks
 *    because blocks need to be in the correct section for loading)
 * 6. decorateBlocks — Identifies block tables and sets up lazy loading
 *
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateButtons(main);
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  fixSectionSplits(main);
  decorateBlocks(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  // OUT OF SCOPE: Language hardcoded to 'en' — should be 'de' for VW Germany.
  // This was inherited from the EDS boilerplate. Correct value: 'de'.
  // Affects HTML lang attribute for accessibility and SEO.
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 *
 * Phase 2 of the EDS lifecycle — runs after LCP is painted. Loads:
 * - Header and footer fragments (navigation, legal links)
 * - Remaining page sections (below-the-fold blocks)
 * - Lazy stylesheet and fonts (ensures fonts are loaded even if deferred in loadEager)
 * - Handles deep-link scrolling for hash URLs
 *
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later, without impacting the user experience.
 *
 * Phase 3 of the EDS lifecycle — fires 3 seconds after page load. Used for
 * analytics, A/B testing, and other non-critical third-party scripts.
 * The 3s delay ensures these scripts never compete with content rendering.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
