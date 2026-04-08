/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroStageParser from './parsers/hero-stage.js';
import cardsModelParser from './parsers/cards-model.js';
import embedSearchParser from './parsers/embed-search.js';

// TRANSFORMER IMPORTS
import vwCleanupTransformer from './transformers/vw-cleanup.js';
import vwSectionsTransformer from './transformers/vw-sections.js';

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  "name": "model-overview",
  "urls": [
    "https://www.volkswagen.de/de/modelle.html"
  ],
  "description": "Models overview page with filterable product card grid showing all VW models with specs and pricing",
  "blocks": [
    {
      "name": "hero-stage",
      "instances": [
        ".basicStageSection"
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
        "#schnellsuche .featureAppSection"
      ]
    }
  ]
};

// PARSER REGISTRY
const parsers = {
  'hero-stage': heroStageParser,
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
