/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroStageParser from './parsers/hero-stage.js';
import carouselFeaturedParser from './parsers/carousel-featured.js';
import columnsTeaserParser from './parsers/columns-teaser.js';
import cardsModelParser from './parsers/cards-model.js';

// TRANSFORMER IMPORTS
import vwCleanupTransformer from './transformers/vw-cleanup.js';
import vwSectionsTransformer from './transformers/vw-sections.js';

// PAGE TEMPLATE CONFIGURATION
const PAGE_TEMPLATE = {
  "name": "emobility-hub",
  "urls": [
    "https://www.volkswagen.de/de/elektromobilitaet.html",
    "https://www.volkswagen.de/de/elektromobilitaet/elektroautos.html",
    "https://www.volkswagen.de/de/elektromobilitaet/elektrofahrzeugkonzepte.html",
    "https://www.volkswagen.de/de/elektromobilitaet/reichweite.html",
    "https://www.volkswagen.de/de/elektromobilitaet/laden.html",
    "https://www.volkswagen.de/de/elektromobilitaet/batterie.html",
    "https://www.volkswagen.de/de/elektromobilitaet/kosten-und-kauf.html",
    "https://www.volkswagen.de/de/elektromobilitaet/software-und-konnektivitaet.html",
    "https://www.volkswagen.de/de/elektromobilitaet/e-tools-fuer-elektroautos.html"
  ],
  "description": "Elektromobilitaet hub and category landing pages with hero, card grids linking to child pages, and teaser sections",
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
        ".expandCollapseSection",
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
