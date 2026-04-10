/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroStageParser from './parsers/hero-stage.js';
import embedSearchParser from './parsers/embed-search.js';
import columnsTeaserParser from './parsers/columns-teaser.js';

// TRANSFORMER IMPORTS
import vwCleanupTransformer from './transformers/vw-cleanup.js';
import vwSectionsTransformer from './transformers/vw-sections.js';

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  "name": "emobility-tool",
  "urls": [
    "https://www.volkswagen.de/de/elektromobilitaet/laden/ladezeitensimulator.html",
    "https://www.volkswagen.de/de/elektromobilitaet/e-tools-fuer-elektroautos/kostensimulator.html",
    "https://www.volkswagen.de/de/elektromobilitaet/e-tools-fuer-elektroautos/ladezeitsimulator.html",
    "https://www.volkswagen.de/de/elektromobilitaet/e-tools-fuer-elektroautos/reichweitensimulator.html"
  ],
  "description": "Interactive e-tools pages with embedded simulators and calculators for cost, charging time, and range",
  "blocks": [
    {
      "name": "hero-stage",
      "instances": [
        ".basicStageSection"
      ]
    },
    {
      "name": "embed-search",
      "instances": [
        ".featureAppSection"
      ]
    },
    {
      "name": "columns-teaser",
      "instances": [
        ".focusTeaserSection",
        ".textOnlyTeaserSection"
      ]
    }
  ]
};

// PARSER REGISTRY
const parsers = {
  'hero-stage': heroStageParser,
  'embed-search': embedSearchParser,
  'columns-teaser': columnsTeaserParser,
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
