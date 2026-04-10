/**
 * Maps AEM component types from .model.json to EDS block HTML.
 * Each mapper returns an HTML string (block table or default content).
 */
import { richtextToHtml, headingHtml } from './richtext-converter.js';
import { pictureTag, resolveImage } from './scene7-resolver.js';
import { isVisible, shortType } from './visibility-filter.js';

/* ============================================================
 * Block table helper — creates EDS block table HTML
 * ============================================================ */
function blockTable(name, rows) {
  let html = `<div class="${name}">`;
  for (const row of rows) {
    html += '<div>';
    if (Array.isArray(row)) {
      for (const cell of row) {
        html += `<div>${cell}</div>`;
      }
    } else {
      html += `<div>${row}</div>`;
    }
    html += '</div>';
  }
  html += '</div>';
  return html;
}

/* ============================================================
 * Element extractors — pull content from child components
 * ============================================================ */
function extractHeading(items) {
  const h = items?.heading;
  if (!h || h.empty === true) return '';
  return headingHtml(h.style || h.order || 'h2', h.richtext);
}

function extractRichtext(items, key = 'copy') {
  const rt = items?.[key];
  if (!rt || rt.empty === true) return '';
  const content = richtextToHtml(rt.richtext);
  if (!content.trim()) return '';
  return `<p>${content}</p>`;
}

function extractImage(items, key = 'media') {
  const media = items?.[key];
  if (!media || media.emptyMedia === true || media.empty === true) return '';
  // Image may be nested: media > :items > image, or media > image, or media itself
  const imgNode = media[':items']?.image || media.image || media;
  return pictureTag(imgNode);
}

function extractLink(items, key = 'link') {
  const link = items?.[key];
  if (!link || !link.linkUrl) return '';
  const label = link.linkLabel || link.linkUrl;
  const target = link.linkTarget === '_blank' ? ' target="_blank"' : '';
  return `<p><a href="${link.linkUrl}"${target}>${label}</a></p>`;
}

function extractButton(items, key = 'primaryButton') {
  const btn = items?.[key];
  if (!btn || !btn.buttonUrl) return '';
  const label = btn.buttonLabel || 'Link';
  const target = btn.buttonTarget === '_blank' ? ' target="_blank"' : '';
  return `<p><a href="${btn.buttonUrl}"${target}>${label}</a></p>`;
}

/* ============================================================
 * Section-level mappers
 * ============================================================ */

/** basicStageSection → hero-stage block */
export function mapHeroStage(component) {
  const items = component[':items'] || {};
  const image = extractImage(items);
  const heading = extractHeading(items);
  const button = extractButton(items) || extractButton(items, 'secondaryButton');

  const imageRow = `<!-- field:image -->${image}`;
  const textRow = `<!-- field:text -->${heading}${button}`;

  return blockTable('hero-stage', [[imageRow], [textRow]]);
}

/** focusTeaserSection → columns-teaser block */
export function mapFocusTeaser(component) {
  const items = component[':items'] || {};
  // Focus teaser may have items (item_0, etc.) or direct content
  const order = component[':itemsOrder'] || Object.keys(items);

  // Extract from the teaser item
  const teaserItem = items[order[0]] || items.item_0;
  const teaserItems = teaserItem?.[':items'] || teaserItem || {};

  const image = extractImage(teaserItems);
  const heading = extractHeading(teaserItems);
  const body = extractRichtext(teaserItems, 'abstract') || extractRichtext(teaserItems);

  // Section-level link
  const sectionLink = component.sectionLinkHref
    ? `<p><a href="${component.sectionLinkHref}">${component.sectionLinkText || 'Mehr erfahren'}</a></p>`
    : '';

  const imageCol = image || '';
  const textCol = `${heading}${body}${sectionLink}`;

  return blockTable('columns-teaser', [[imageCol, textCol]]);
}

/** uspSection → carousel-featured block
 * USP sections use a flat naming convention: super*, left*, right* for 3 items.
 * Each item has: {prefix}Media, {prefix}Heading, {prefix}Copy, {prefix}Link
 */
export function mapUspSection(component) {
  const items = component[':items'] || {};
  const rows = [];

  const prefixes = ['super', 'left', 'right'];
  for (const prefix of prefixes) {
    const heading = items[`${prefix}Heading`];
    const copy = items[`${prefix}Copy`];
    const link = items[`${prefix}Link`];
    const media = items[`${prefix}Media`];

    const headingHtml = heading && heading.empty !== true ? extractHeading({ heading }) : '';
    const bodyHtml = copy && copy.empty !== true ? extractRichtext({ copy }) : '';
    const linkHtml = link && link.linkUrl ? `<p><a href="${link.linkUrl}">${link.linkLabel || link.linkUrl}</a></p>` : '';
    const imageHtml = media && media.emptyMedia !== true ? extractImage({ media }) : '';

    if (!headingHtml && !bodyHtml && !linkHtml) continue;

    const imageCell = `<!-- field:media_image -->${imageHtml}`;
    const textCell = `<!-- field:content_text -->${headingHtml}${bodyHtml}${linkHtml}`;
    rows.push([imageCell, textCell]);
  }

  // Fallback: try standard :items walk if flat naming didn't find anything
  if (rows.length === 0) {
    const order = component[':itemsOrder'] || Object.keys(items);
    for (const key of order) {
      const child = items[key];
      if (!child) continue;
      const vis = isVisible(child);
      if (vis === false) continue;
      if (vis === 'recurse') {
        const innerItems = child[':items'] || {};
        for (const ik of Object.keys(innerItems)) {
          const row = extractSlideRow(innerItems[ik]);
          if (row) rows.push(row);
        }
        continue;
      }
      const row = extractSlideRow(child);
      if (row) rows.push(row);
    }
  }

  if (rows.length === 0) return '';
  return blockTable('carousel-featured', rows);
}

/** expandCollapseSection → carousel-featured block */
export function mapExpandCollapse(component) {
  const items = component[':items'] || {};
  const order = component[':itemsOrder'] || Object.keys(items);
  const rows = [];

  for (const key of order) {
    const child = items[key];
    if (!child) continue;
    const vis = isVisible(child);
    if (vis === false) continue;

    // Recurse into parsys wrappers
    if (vis === 'recurse') {
      const innerItems = child[':items'] || {};
      const innerOrder = child[':itemsOrder'] || Object.keys(innerItems);
      for (const innerKey of innerOrder) {
        const item = innerItems[innerKey];
        if (!item || isVisible(item) === false) continue;
        const row = extractSlideRow(item);
        if (row) rows.push(row);
      }
      continue;
    }

    const row = extractSlideRow(child);
    if (row) rows.push(row);
  }

  if (rows.length === 0) return '';
  return blockTable('carousel-featured', rows);
}

/** textOnlyTeaserSection → columns-teaser block
 * Items use 'headline' (not 'heading') and links are nested in links > linkListParsys > linkelement
 */
export function mapTextOnlyTeaser(component) {
  const items = component[':items'] || {};
  const order = component[':itemsOrder'] || Object.keys(items);
  const cols = [];

  for (const key of order) {
    const child = items[key];
    if (!child || isVisible(child) === false) continue;

    const childItems = child[':items'] || {};

    // Headline uses 'headline' field (not 'heading')
    const headline = childItems.headline || childItems.heading;
    const headingStr = headline && headline.empty !== true
      ? headingHtml(headline.style || headline.order || 'h3', headline.richtext)
      : '';

    // Body text
    const body = extractRichtext(childItems) || extractRichtext(childItems, 'abstract');

    // Links are deeply nested: links > :items > linkListParsys > :items > linkelement
    let links = '';
    const linksNode = childItems.links;
    if (linksNode) {
      const linksParsys = linksNode[':items']?.linkListParsys || linksNode[':items'];
      if (linksParsys) {
        const linkItems = linksParsys[':items'] || {};
        for (const lk of Object.keys(linkItems)) {
          const le = linkItems[lk];
          if (le?.linkUrl) {
            links += `<p><a href="${le.linkUrl}">${le.linkLabel || le.linkUrl}</a></p>`;
          }
        }
      }
    }

    const cellContent = `${headingStr}${body}${links}`.trim();
    if (cellContent) cols.push(cellContent);
  }

  if (cols.length === 0) return '';
  return blockTable('columns-teaser', [cols]);
}

/** contentSliderSection → carousel-featured block */
export function mapContentSlider(component) {
  // Similar to expandCollapse but items are slider items
  return mapExpandCollapse(component);
}

/** featureAppSection → embed-search block */
export function mapFeatureApp(component) {
  // Feature apps are client-rendered; extract any available URL
  const config = component.featureAppConfig || {};
  const url = config.featureAppUrl || config.url || '#';
  return blockTable('embed-search', [[`<!-- field:embed_placeholder --><!-- field:embed_uri --><p><a href="${url}">Feature App</a></p>`]]);
}

/** singleColumnSection / headingSection → default content */
export function mapDefaultContent(component) {
  const items = component[':items'] || {};
  const order = component[':itemsOrder'] || Object.keys(items);
  let html = '';

  for (const key of order) {
    const child = items[key];
    if (!child) continue;
    const vis = isVisible(child);
    if (vis === false) continue;

    const type = shortType(child);

    if (vis === 'recurse') {
      html += mapDefaultContent(child);
      continue;
    }

    if (type.includes('headingElement')) {
      html += headingHtml(child.style || child.order || 'h2', child.richtext);
    } else if (type.includes('richtextFull') || type.includes('richtextSimple')) {
      const content = richtextToHtml(child.richtext);
      if (content.trim()) html += `<p>${content}</p>`;
    } else if (type.includes('linkElement') && child.linkUrl) {
      html += `<p><a href="${child.linkUrl}">${child.linkLabel || child.linkUrl}</a></p>`;
    } else if (type.includes('buttonElement') && child.buttonUrl) {
      html += `<p><a href="${child.buttonUrl}">${child.buttonLabel || 'Link'}</a></p>`;
    } else if (type.includes('mediaElement') || type.includes('imageElement')) {
      const pic = extractImage({ media: child }, 'media');
      if (pic) html += `<p>${pic}</p>`;
    } else if (type.includes('copyItem')) {
      html += mapDefaultContent(child);
    }
  }

  return html;
}

/* ============================================================
 * Helper: extract a single slide/card row from a component
 * ============================================================ */
function extractSlideRow(component) {
  const items = component[':items'] || component;
  const image = extractImage(items);
  const heading = extractHeading(items);
  const body = extractRichtext(items) || extractRichtext(items, 'abstract');
  const link = extractLink(items);

  const imageCell = `<!-- field:media_image -->${image}`;
  const textCell = `<!-- field:content_text -->${heading}${body}${link}`;

  if (!image && !heading && !body && !link) return null;
  return [imageCell, textCell];
}

/* ============================================================
 * Main mapper dispatch
 * ============================================================ */
const SECTION_MAPPERS = {
  'editorial/sections/basicStageSection': mapHeroStage,
  'editorial/sections/focusTeaserSection': mapFocusTeaser,
  'editorial/sections/uspSection': mapUspSection,
  'editorial/sections/expandCollapseSection': mapExpandCollapse,
  'editorial/sections/textOnlyTeaserSection': mapTextOnlyTeaser,
  'editorial/sections/contentSliderSection': mapContentSlider,
  'editorial/sections/featureAppSection': mapFeatureApp,
  'editorial/sections/singleColumnSection': mapDefaultContent,
  'editorial/sections/headingSection': mapDefaultContent,
  'editorial/sections/twoColumnsSection': mapDefaultContent,
};

/**
 * Maps a component to HTML. Returns empty string if not mappable.
 */
export function mapComponent(component) {
  const type = shortType(component);
  const mapper = SECTION_MAPPERS[type];
  if (mapper) return mapper(component);

  // Element-level components (heading, richtext, link, button, media)
  if (type.includes('headingElement')) {
    return headingHtml(component.style || component.order || 'h2', component.richtext);
  }
  if (type.includes('richtextFull') || type.includes('richtextSimple')) {
    const content = richtextToHtml(component.richtext);
    return content.trim() ? `<p>${content}</p>` : '';
  }
  if (type.includes('linkElement') && component.linkUrl) {
    return `<p><a href="${component.linkUrl}">${component.linkLabel || component.linkUrl}</a></p>`;
  }
  if (type.includes('buttonElement') && component.buttonUrl) {
    return `<p><a href="${component.buttonUrl}">${component.buttonLabel || 'Link'}</a></p>`;
  }
  if (type.includes('mediaElement') || type.includes('imageElement')) {
    const pic = pictureTag(component[':items']?.image || component.image || component);
    return pic ? `<p>${pic}</p>` : '';
  }

  return '';
}
