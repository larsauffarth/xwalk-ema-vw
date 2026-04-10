/**
 * JSON-based AEM content importer.
 * Fetches .model.json from volkswagen.de, walks the component tree,
 * applies visibility filtering, maps components to EDS blocks,
 * and produces .plain.html content files.
 */
import { isVisible, shortType } from './visibility-filter.js';
import { mapComponent, mapDefaultContent } from './component-mappers.js';

/**
 * Imports a single page from its .model.json endpoint.
 * @param {string} pageUrl - Full page URL (e.g., https://www.volkswagen.de/de.html)
 * @returns {Object} { path, html, metadata, error }
 */
export async function importPage(pageUrl) {
  try {
    // Build .model.json URL
    const url = new URL(pageUrl);
    const jsonPath = url.pathname.replace(/\.html$/, '').replace(/\/$/, '');
    const jsonUrl = `${url.origin}${jsonPath}.model.json`;

    // Fetch JSON
    const response = await fetch(jsonUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${jsonUrl}`);
    const data = await response.json();

    // Extract metadata
    const metadata = extractMetadata(data);

    // Walk component tree and generate HTML
    const contentHtml = walkTree(data);

    // Build metadata block
    const metadataBlock = buildMetadataBlock(metadata);

    // Assemble full page
    const html = `${contentHtml}\n${metadataBlock}`;

    // Generate document path
    const path = jsonPath || '/index';

    return { path, html, metadata, error: null };
  } catch (error) {
    return { path: null, html: null, metadata: null, error: error.message };
  }
}

/**
 * Walk the AEM component tree depth-first, emitting HTML for visible components.
 */
function walkTree(data) {
  const root = data[':items']?.root;
  if (!root) return '';

  const main = root[':items']?.main;
  if (!main) return '';

  const sections = [];
  let currentSection = '';

  // Process stageParsys (hero) first
  const stageParsys = main[':items']?.stageParsys;
  if (stageParsys) {
    const stageHtml = processContainer(stageParsys);
    if (stageHtml.trim()) {
      sections.push(`<div>${stageHtml}</div>`);
    }
  }

  // Process mainParsys (content sections)
  const mainParsys = main[':items']?.mainParsys;
  if (mainParsys) {
    const order = mainParsys[':itemsOrder'] || Object.keys(mainParsys[':items'] || {});
    const items = mainParsys[':items'] || {};

    for (const key of order) {
      const child = items[key];
      if (!child) continue;

      const vis = isVisible(child);
      if (vis === false) continue;

      const type = shortType(child);

      // SectionGroups create section breaks
      if (type === 'structure/sectionGroup') {
        // Flush current section
        if (currentSection.trim()) {
          sections.push(`<div>${currentSection}</div>`);
          currentSection = '';
        }
        // Process the section group's content
        const groupHtml = processSectionGroup(child);
        if (groupHtml.trim()) {
          sections.push(`<div>${groupHtml}</div>`);
        }
        continue;
      }

      // Other components go into current section
      if (vis === 'recurse') {
        currentSection += processContainer(child);
      } else {
        const html = mapComponent(child);
        if (html) currentSection += html;
      }
    }

    // Flush remaining
    if (currentSection.trim()) {
      sections.push(`<div>${currentSection}</div>`);
    }
  }

  return sections.join('\n');
}

/**
 * Process a section group — contains heading + content parsys.
 */
function processSectionGroup(group) {
  const items = group[':items'] || {};
  const order = group[':itemsOrder'] || Object.keys(items);
  let html = '';

  for (const key of order) {
    const child = items[key];
    if (!child) continue;

    const vis = isVisible(child);
    if (vis === false) continue;

    if (vis === 'recurse') {
      html += processContainer(child);
    } else {
      const mapped = mapComponent(child);
      if (mapped) html += mapped;
    }
  }

  return html;
}

/**
 * Process a structural container — recurse into its children.
 */
function processContainer(container) {
  const items = container[':items'] || {};
  const order = container[':itemsOrder'] || Object.keys(items);
  let html = '';

  for (const key of order) {
    const child = items[key];
    if (!child) continue;

    const vis = isVisible(child);
    if (vis === false) continue;

    if (vis === 'recurse') {
      html += processContainer(child);
    } else {
      const mapped = mapComponent(child);
      if (mapped) html += mapped;
    }
  }

  return html;
}

/**
 * Extract page metadata from the JSON.
 */
function extractMetadata(data) {
  const header = data.headerDataModel || {};
  const meta = {};

  if (header.title) meta.Title = header.title;
  if (header.metaDescription) meta.Description = header.metaDescription;
  if (header.ogImage) meta.Image = `<img src="${header.ogImage}" alt="">`;
  if (header.ogDescription) meta['og:description'] = header.ogDescription;
  if (header.canonicalUrl) meta.canonical = header.canonicalUrl;

  return meta;
}

/**
 * Build the EDS metadata block table.
 */
function buildMetadataBlock(metadata) {
  if (!metadata || Object.keys(metadata).length === 0) return '';

  let html = '<div><div class="metadata">';
  for (const [key, value] of Object.entries(metadata)) {
    html += `<div><div>${key}</div><div>${value}</div></div>`;
  }
  html += '</div></div>';
  return html;
}
