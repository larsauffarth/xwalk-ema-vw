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
          // Check if this section needs a style (e.g., dark background for schnellsuche)
          const sectionStyle = detectSectionStyle(child);
          const styleMeta = sectionStyle
            ? `<div class="section-metadata"><div><div>style</div><div>${sectionStyle}</div></div></div>`
            : '';
          sections.push(`<div>${groupHtml}${styleMeta}</div>`);
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
 * Detect if a section group needs a background style.
 * Returns style name ('dark', 'grey') or null.
 */
function detectSectionStyle(group) {
  // Check for known dark-background feature apps
  const anchorId = group.anchorId || '';

  // Walk children to find feature app sections with known styles
  function findFeatureApps(node) {
    if (!node || typeof node !== 'object') return [];
    const results = [];
    const type = (node[':type'] || '').replace('vwa-ngw18/components/', '');
    if (type === 'editorial/sections/featureAppSection') {
      results.push(node.anchorId || '');
    }
    const items = node[':items'] || {};
    for (const key of Object.keys(items)) {
      results.push(...findFeatureApps(items[key]));
    }
    return results;
  }

  const featureApps = findFeatureApps(group);

  // Quick Search (schnellsuche) renders with dark navy background
  if (featureApps.includes('schnellsuche') || anchorId === 'schnellsuche') {
    return 'dark';
  }

  return null;
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
  // headerDataModel is at data[':items'].root level, not top level
  const header = data[':items']?.root?.headerDataModel || data.headerDataModel || {};
  const meta = {};

  if (header.pageTitle) meta.Title = header.pageTitle;
  if (header.description) meta.Description = header.description;
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
