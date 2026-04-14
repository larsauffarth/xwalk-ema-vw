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
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
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
 * load fonts.css and set a session storage flag
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
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Fix section splits that the content structure gets wrong.
 * Runs after decorateSections so .default-content-wrapper exists.
 */
function fixSectionSplits(main) {
  // 1. "Beliebte Modelle" shares section with Modell-Highlights — split out
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

  // 2. "Finden Sie Ihren Volkswagen" — split carousel-featured (light)
  //    from embed-search (dark)
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
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  // hopefully forward compatible button decoration
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
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
