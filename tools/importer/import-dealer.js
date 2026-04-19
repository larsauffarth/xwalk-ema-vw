/* eslint-disable */
/* global WebImporter */

/**
 * Import Script: Dealer (import-dealer.js)
 *
 * Playwright-based import for dealer pages:
 *   /de/haendler-werkstatt/<dealer-name>.html
 *
 * Parsers: hero-stage, carousel-featured, columns-teaser, cards-model, embed-search
 * Boilerplate (executeTransformers, findBlocksOnPage) duplicated from import-homepage.js.
 *
 * Note: Dealer pages also use dealer-fetcher.js (via the JSON import path) to
 * fetch BFF data that is not available in the DOM or model.json.
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

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  "name": "dealer",
  "urls": [
    "https://www.volkswagen.de/de/haendler-werkstatt/volkswagen-automobile-hamburg-fruchtallee.html"
  ],
  "description": "Dealer page with structured contact info, opening hours, department selector, tabs, and embedded map",
  "blocks": [
    {
      "name": "hero-stage",
      "instances": [
        ".basicStageSection"
      ]
    },
    {
      "name": "carousel-featured",
      "instances": [
        ".uspSection",
        ".expandCollapseSection"
      ]
    },
    {
      "name": "columns-teaser",
      "instances": [
        ".focusTeaserSection",
        ".textOnlyTeaserSection"
      ]
    },
    {
      "name": "cards-model",
      "instances": [
        ".featureAppSection"
      ]
    },
    {
      "name": "embed-search",
      "instances": [
        ".featureAppSection"
      ]
    }
  ]
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
  vwSectionsTransformer,
];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      try {
        const elements = document.querySelectorAll(selector);
        elements.forEach((element) => {
          pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
        });
      } catch (e) {
        console.warn(`Invalid selector for block "${blockDef.name}": ${selector}`);
      }
    });
  });
  return pageBlocks;
}

export default {
  transform: (payload) => {
    const { document, url, html, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      const parser = parsers[block.name];
      if (parser) {
        try { parser(block.element, { document, url, params }); }
        catch (e) { console.error(`Failed to parse ${block.name}:`, e); }
      }
    });

    executeTransformers('afterTransform', main, payload);

    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, '')
    );

    return [{ element: main, path, report: { title: document.title, template: PAGE_TEMPLATE.name, blocks: pageBlocks.map(b => b.name) } }];
  },
};
