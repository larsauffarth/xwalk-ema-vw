/* eslint-disable */
/* global WebImporter */

/**
 * Import Script: VW Homepage (import-homepage.js)
 *
 * Playwright-based import configuration for https://www.volkswagen.de/de.html
 * This is one of 7 template-specific import scripts, each bundled separately
 * for use with the AEM Import Tool (helix-importer-ui).
 *
 * Architecture:
 * - PAGE_TEMPLATE: Defines which blocks appear on this template and their DOM selectors
 * - Parsers: Block-specific DOM extractors (hero-stage, carousel-featured, etc.)
 * - Transformers: Pre/post-processing (cleanup, section breaks)
 *
 * Import Pipeline:
 * 1. beforeTransform: Strip non-content elements (cookies, nav, etc.)
 * 2. Find blocks on page using template selectors
 * 3. Parse each block (extract content, create WebImporter block tables)
 * 4. afterTransform: Add section breaks and section metadata
 * 5. Apply WebImporter built-in rules (metadata, images, paths)
 *
 * Note: This script handles the DOM-scraping import path. The primary import
 * path uses json-importer.js (JSON API) which doesn't use these scripts.
 * These scripts are kept as a secondary/fallback import method.
 *
 * OUT OF SCOPE: The executeTransformers() and findBlocksOnPage() functions are
 * duplicated across all 7 import scripts. In production, these should be
 * extracted into a shared utility module.
 */

// PARSER IMPORTS
import heroStageParser from './parsers/hero-stage.js';
import carouselFeaturedParser from './parsers/carousel-featured.js';
import columnsTeaserParser from './parsers/columns-teaser.js';
import cardsModelParser from './parsers/cards-model.js';
import embedSearchParser from './parsers/embed-search.js';

// TRANSFORMER IMPORTS
import vwCleanupTransformer from './transformers/vw-cleanup.js';
import vwSectionsTransformer from './transformers/vw-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'homepage',
  description: 'VW Germany homepage with hero banner, featured carousel, teaser cards, and accordion sections',
  urls: [
    'https://www.volkswagen.de/de.html',
  ],
  blocks: [
    {
      name: 'hero-stage',
      instances: ['.basicStageSection'],
    },
    {
      name: 'carousel-featured',
      instances: ['.uspSection', '#aktuelle-Modell-Highlights .expandCollapseSection'],
    },
    {
      name: 'columns-teaser',
      instances: ['.textOnlyTeaserSection'],
    },
    {
      name: 'cards-model',
      instances: ['#MOFA .featureAppSection', '#finden-sie .expandCollapseSection'],
    },
    {
      name: 'embed-search',
      instances: ['#schnellsuche .featureAppSection'],
    },
  ],
  sections: [
    {
      id: 'section-1',
      name: 'Hero',
      selector: '.basicStageSection',
      style: null,
      blocks: ['hero-stage'],
      defaultContent: [],
    },
    {
      id: 'section-2',
      name: 'Volkswagen erleben',
      selector: '#volkswagen-erleben',
      style: null,
      blocks: ['carousel-featured'],
      defaultContent: ['#volkswagen-erleben h2'],
    },
    {
      id: 'section-3',
      name: 'Angebote und Aktionen',
      selector: "[id*='sectiongroup']:not([id*='copy']):not([id*='6432806']):not([id*='1305091'])",
      style: null,
      blocks: ['columns-teaser'],
      defaultContent: ["[id*='sectiongroup'] > section h2"],
    },
    {
      id: 'section-4',
      name: 'Modell-Highlights',
      selector: '#aktuelle-Modell-Highlights',
      style: null,
      blocks: ['carousel-featured'],
      defaultContent: ['#aktuelle-Modell-Highlights h2'],
    },
    {
      id: 'section-5',
      name: 'Beliebte Modelle',
      selector: '#MOFA',
      style: null,
      blocks: ['cards-model'],
      defaultContent: ['#MOFA h2', '#MOFA h2 + a'],
    },
    {
      id: 'section-6',
      name: 'Finden Sie Ihren Volkswagen',
      selector: '#finden-sie',
      style: null,
      blocks: ['cards-model'],
      defaultContent: ['#finden-sie h2'],
    },
    {
      id: 'section-7',
      name: 'Fahrzeugsuche',
      selector: '#schnellsuche',
      style: 'grey',
      blocks: ['embed-search'],
      defaultContent: [],
    },
  ],
};

// PARSER REGISTRY
const parsers = {
  'hero-stage': heroStageParser,
  'carousel-featured': carouselFeaturedParser,
  'columns-teaser': columnsTeaserParser,
  'cards-model': cardsModelParser,
  'embed-search': embedSearchParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  vwCleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [vwSectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };

  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];

  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null,
          });
        });
      } catch (e) {
        console.warn(`Invalid selector for block "${blockDef.name}": ${selector}`);
      }
    });
  });

  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

// EXPORT DEFAULT CONFIGURATION
export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;

    const main = document.body;

    // 1. Execute beforeTransform transformers (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page using embedded template
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block using registered parsers
    pageBlocks.forEach((block) => {
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    // 4. Execute afterTransform transformers (final cleanup + section breaks)
    executeTransformers('afterTransform', main, payload);

    // 5. Apply WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Generate sanitized path
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''),
    );

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};
