/* eslint-disable */
/* global WebImporter */

/**
 * Import Transformer: VW Section Breaks
 *
 * Runs during Playwright-based import (afterTransform only) to insert
 * EDS section breaks (<hr>) and section metadata blocks based on the
 * page template's section definitions.
 *
 * Uses payload.template.sections to find section elements by CSS selector,
 * then inserts:
 * - <hr> before each section (except the first) to create EDS section boundaries
 * - Section Metadata block after sections that have a 'style' property (e.g., 'grey', 'dark')
 *
 * Processes sections in reverse DOM order to preserve element positions
 * during insertion.
 */
const H = { before: 'beforeTransform', after: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === H.after) {
    const { template } = payload;
    if (!template || !template.sections || template.sections.length < 2) return;

    const document = element.ownerDocument;
    const sections = template.sections;

    // Process sections in reverse order to preserve DOM positions
    for (let i = sections.length - 1; i >= 0; i--) {
      const section = sections[i];
      const selectors = Array.isArray(section.selector) ? section.selector : [section.selector];

      let sectionEl = null;
      for (const sel of selectors) {
        try {
          sectionEl = element.querySelector(sel);
          if (sectionEl) break;
        } catch (e) {
          // Invalid selector, try next
        }
      }

      if (!sectionEl) continue;

      // Add section-metadata block if section has a style
      if (section.style) {
        const sectionMetadataBlock = WebImporter.Blocks.createBlock(document, {
          name: 'Section Metadata',
          cells: { style: section.style },
        });
        sectionEl.after(sectionMetadataBlock);
      }

      // Add section break (hr) before section if not the first section
      if (i > 0) {
        const hr = document.createElement('hr');
        sectionEl.before(hr);
      }
    }
  }
}
