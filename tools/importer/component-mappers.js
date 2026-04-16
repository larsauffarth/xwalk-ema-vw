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
function extractHeading(items, options = {}) {
  const h = items?.heading;
  if (!h || h.empty === true) return '';
  return headingHtml(h.style || h.order || 'h2', h.richtext, options);
}

function extractRichtext(items, key = 'copy') {
  const rt = items?.[key];
  if (!rt || rt.empty === true) return '';
  const content = richtextToHtml(rt.richtext);
  if (!content.trim()) return '';
  // Don't double-wrap if content already starts with a block-level element
  const trimmed = content.trim();
  if (trimmed.startsWith('<p>') || trimmed.startsWith('<ul>') || trimmed.startsWith('<ol>') || trimmed.startsWith('<div>') || trimmed.startsWith('<h')) {
    return content;
  }
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
  const primaryBtn = extractButton(items);
  const secondaryBtn = extractButton(items, 'secondaryButton');
  const buttons = `${primaryBtn}${secondaryBtn}`;

  const imageRow = `<!-- field:image -->${image}`;
  const textRow = `<!-- field:text -->${heading}${buttons}`;

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
  const heading = extractHeading(teaserItems, { stripBold: true });
  const body = extractRichtext(teaserItems, 'abstract') || extractRichtext(teaserItems);

  // Section-level link
  const sectionLink = component.sectionLinkHref
    ? `<p><a href="${component.sectionLinkHref}">${component.sectionLinkText || 'Mehr erfahren'}</a></p>`
    : '';

  const imageCol = image || '';
  const textCol = `${heading}${body}${sectionLink}`;

  const blockName = component.hasImageRight ? 'columns-teaser image-right' : 'columns-teaser';
  return blockTable(blockName, [[imageCol, textCol]]);
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
      ? headingHtml(headline.style || headline.order || 'h3', headline.richtext, { stripBold: true })
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

/** contentSliderSection → carousel-featured block
 * Handles two patterns:
 * 1. xfContentSlider items with linkName/linkUrl at item level + inner heading/media
 * 2. Standard expandCollapse-style items with heading/copy/link/media in :items
 */
export function mapContentSlider(component) {
  const items = component[':items'] || {};
  const order = component[':itemsOrder'] || Object.keys(items);
  const rows = [];

  for (const key of order) {
    const child = items[key];
    if (!child) continue;
    const vis = isVisible(child);
    if (vis === false) continue;

    const type = shortType(child);

    // xfContentSlider items: use linkName/linkUrl from item level + inner heading/media
    if (type === 'structure/xfContentSlider') {
      const innerItems = child[':items'] || {};
      const image = extractImage(innerItems);
      const heading = extractHeading(innerItems);
      const linkUrl = child.linkUrl;
      const linkName = child.linkName;
      const link = linkUrl && linkName ? `<p><a href="${linkUrl}">${linkName}</a></p>` : '';

      const imageCell = `<!-- field:media_image -->${image}`;
      const textCell = `<!-- field:content_text -->${heading}${link}`;

      if (image || heading || link) {
        rows.push([imageCell, textCell]);
      }
      continue;
    }

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

/** carTechnicalDataSection → default content with key specs */
export function mapCarTechnicalData(component) {
  const highlighted = component.highlightedTechnicalData || [];
  const techData = component.technicalData || [];
  let html = '';

  // Highlighted data first (price, bonus)
  for (const entry of highlighted) {
    if (!entry.label || !entry.value) continue;
    const unit = entry.unit || '';
    const suffix = entry.unitSuffix || '';
    const valueStr = entry.unitBeforeValue ? `${unit} ${entry.value}${suffix}` : `${entry.value} ${unit}${suffix}`;
    html += `<p><strong>${entry.label}</strong> ${valueStr.trim()}</p>`;
  }

  // Regular technical data (fuel type, range, etc.)
  for (const entry of techData) {
    if (!entry.label) continue;
    let valueStr = '';
    if (entry.minValue && entry.maxValue && entry.minValue !== entry.maxValue) {
      valueStr = `${entry.minValue}–${entry.maxValue}`;
    } else {
      valueStr = entry.value || entry.maxValue || entry.minValue || '';
    }
    const unit = entry.unit || '';
    const suffix = entry.unitSuffix || '';
    if (entry.unitBeforeValue) {
      valueStr = `${unit} ${valueStr}${suffix}`;
    } else {
      valueStr = `${valueStr} ${unit}${suffix}`;
    }
    html += `<p><strong>${entry.label}</strong> ${valueStr.trim()}</p>`;
  }

  // "Alle technischen Daten" link
  const items = component[':items'] || {};
  const link = items.link;
  if (link?.linkUrl && !link.linkUrl.startsWith('action:')) {
    html += `<p><a href="${link.linkUrl}">${link.linkLabel || link.linkUrl}</a></p>`;
  }

  return html;
}

/** powerTeaserSection → columns-teaser block with promo content */
export function mapPowerTeaser(component) {
  const items = component[':items'] || {};
  const order = component[':itemsOrder'] || Object.keys(items);

  // Find the powerTeaserPromoElement child
  let promoItems = null;
  for (const key of order) {
    const child = items[key];
    if (!child) continue;
    if (shortType(child).includes('powerTeaserPromo') || child[':items']) {
      promoItems = child[':items'] || {};
      break;
    }
  }
  if (!promoItems) return '';

  const image = extractImage(promoItems);
  const heading = extractHeading(promoItems);
  const body = extractRichtext(promoItems);

  // Buttons are in buttonsParsys
  let buttons = '';
  const btnParsys = promoItems.buttonsParsys;
  if (btnParsys) {
    const btnItems = btnParsys[':items'] || {};
    for (const bk of Object.keys(btnItems)) {
      const btn = btnItems[bk];
      if (btn?.buttonUrl) {
        const target = btn.buttonTarget === '_blank' ? ' target="_blank"' : '';
        buttons += `<p><a href="${btn.buttonUrl}"${target}>${btn.buttonLabel || 'Link'}</a></p>`;
      }
    }
  }

  const imageCol = image || '';
  const textCol = `${heading}${body}${buttons}`;

  if (!imageCol && !textCol.trim()) return '';
  return blockTable('columns-teaser', [[imageCol, textCol]]);
}

/** featureAppSection → context-aware handling based on anchor ID */
export function mapFeatureApp(component) {
  const anchorId = component.anchorId || '';

  // MOFA (Model Recommendations) → static heading + link to models page
  if (anchorId === 'MOFA' || anchorId.toLowerCase().includes('mofa')) {
    return '<h2>Beliebte Modelle</h2><p><a href="/de/modelle.html">Alle Modelle anzeigen</a></p>';
  }

  // Quick Search → fragment referencing shared search-form
  if (anchorId === 'schnellsuche' || anchorId.toLowerCase().includes('search') || anchorId.toLowerCase().includes('suche')) {
    return blockTable('fragment', [[`<a href="/de/fragments/search">Fahrzeugsuche</a>`]]);
  }

  // Other feature apps → try to extract a meaningful URL or baseUrl for embed
  const items = component[':items'] || {};
  const order = component[':itemsOrder'] || Object.keys(items);
  for (const key of order) {
    const child = items[key];
    const config = child?.featureAppConfig;
    if (config) {
      const embedUrl = config.featureAppUrl || config.baseUrl;
      if (embedUrl) {
        const label = config.name || 'Feature App';
        return blockTable('embed-search', [[`<!-- field:embed_placeholder --><!-- field:embed_uri --><p><a href="${embedUrl}">${label}</a></p>`]]);
      }
    }
  }

  // No meaningful URL found — output nothing rather than a broken embed
  return '';
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
      html += headingHtml(child.style || child.order || 'h2', child.richtext, { stripBold: true });
    } else if (type.includes('richtextFull') || type.includes('richtextSimple')) {
      const content = richtextToHtml(child.richtext);
      if (content.trim()) html += `<p>${content}</p>`;
    } else if (type.includes('linkElement') && child.linkUrl) {
      html += `<p><a href="${child.linkUrl}">${child.linkLabel || child.linkUrl}</a></p>`;
    } else if (type.includes('buttonElement') && child.buttonUrl) {
      html += `<p><a href="${child.buttonUrl}">${child.buttonLabel || 'Link'}</a></p>`;
    } else if (type.includes('mediaSingleItem')) {
      // mediaSingleItem wraps a mediaElement + optional caption
      const mediaItems = child[':items'] || {};
      const mediaNode = mediaItems.media || mediaItems.image;
      if (mediaNode) {
        const pic = pictureTag(mediaNode[':items']?.image || mediaNode.image || mediaNode);
        if (pic) html += `<p>${pic}</p>`;
      }
      const caption = mediaItems.caption;
      if (caption && Array.isArray(caption.richtext) && caption.richtext.length > 0) {
        const capText = richtextToHtml(caption.richtext);
        if (capText.trim()) html += `<p><em>${capText}</em></p>`;
      }
    } else if (type.includes('statementItem')) {
      // statementItem wraps a richtextSimpleElement as a quote/callout
      const stmtItems = child[':items'] || {};
      const statement = stmtItems.statement;
      if (statement && Array.isArray(statement.richtext) && statement.richtext.length > 0) {
        const stmtText = richtextToHtml(statement.richtext);
        if (stmtText.trim()) {
          const trimmed = stmtText.trim();
          if (trimmed.startsWith('<p>') || trimmed.startsWith('<ul>')) {
            html += stmtText;
          } else {
            html += `<p><strong>${stmtText}</strong></p>`;
          }
        }
      }
    } else if (type.includes('mediaElement') || type.includes('imageElement')) {
      const pic = extractImage({ media: child }, 'media');
      if (pic) html += `<p>${pic}</p>`;
    } else if (type.includes('copyItem')) {
      // copyItem may have richtext directly on itself or nested :items
      if (Array.isArray(child.richtext) && child.richtext.length > 0) {
        const content = richtextToHtml(child.richtext);
        if (content.trim()) {
          const trimmed = content.trim();
          if (trimmed.startsWith('<p>') || trimmed.startsWith('<ul>') || trimmed.startsWith('<ol>') || trimmed.startsWith('<h')) {
            html += content;
          } else {
            html += `<p>${content}</p>`;
          }
        }
      } else {
        html += mapDefaultContent(child);
      }
    }
  }

  return html;
}

/** simpleStageSection → hero-stage block (text-only, no image) */
export function mapSimpleStage(component) {
  const items = component[':items'] || {};
  const heading = extractHeading(items);
  const body = extractRichtext(items);

  const imageRow = '<!-- field:image -->';
  const textRow = `<!-- field:text -->${heading}${body}`;

  return blockTable('hero-stage', [[imageRow], [textRow]]);
}

/** editorialTeaserSection → columns-teaser block (3 cards with image + heading + link) */
export function mapEditorialTeaser(component) {
  const items = component[':items'] || {};
  const order = component[':itemsOrder'] || Object.keys(items);
  const cols = [];

  // Section heading (usually "Das könnte Sie auch interessieren:")
  const headingItem = items.heading;
  let sectionHeading = '';
  if (headingItem && headingItem.empty !== true && Array.isArray(headingItem.richtext)) {
    sectionHeading = headingHtml(headingItem.style || 'h2', headingItem.richtext, { stripBold: true });
  }

  for (const key of order) {
    if (key === 'heading') continue;
    const child = items[key];
    if (!child) continue;

    const type = shortType(child);
    if (!type.includes('editorialTeaserElement')) continue;

    // editorialTeaserElement has heading (string), scene7File, altText, teaserElementLinkHref/Text
    // Also may have nested :items with heading/media/abstract elements
    const childItems = child[':items'] || {};

    // Image — from scene7File or nested media
    let image = '';
    if (child.scene7File) {
      image = pictureTag({ scene7File: child.scene7File, altText: child.altText || '' });
    } else {
      image = extractImage(childItems);
    }

    // Heading — from nested heading element or direct heading string
    let headingStr = '';
    if (childItems.heading && childItems.heading.empty !== true) {
      headingStr = extractHeading(childItems);
    } else if (child.heading) {
      headingStr = `<h3>${child.heading}</h3>`;
    }

    // Link
    let link = '';
    if (child.teaserElementLinkHref) {
      link = `<p><a href="${child.teaserElementLinkHref}">${child.teaserElementLinkText || 'Mehr erfahren'}</a></p>`;
    }

    const colContent = `${image}${headingStr}${link}`;
    if (colContent.trim()) cols.push(colContent);
  }

  if (cols.length === 0) return sectionHeading;
  return `${sectionHeading}${blockTable('columns-teaser', [cols])}`;
}

/** accordionSection → accordion block (expandable items with heading + richtext) */
export function mapAccordion(component) {
  const items = component[':items'] || {};

  // Section heading
  const headingItem = items.heading;
  let sectionHeading = '';
  if (headingItem && headingItem.empty !== true && Array.isArray(headingItem.richtext) && headingItem.richtext.length > 0) {
    sectionHeading = headingHtml(headingItem.style || 'h2', headingItem.richtext, { stripBold: true });
  }

  // Find the parsys containing accordion items
  const parsys = items.accordionSectionParsys;
  if (!parsys) return sectionHeading;

  const parsysItems = parsys[':items'] || {};
  const parsysOrder = parsys[':itemsOrder'] || Object.keys(parsysItems);
  const rows = [];

  for (const key of parsysOrder) {
    const item = parsysItems[key];
    if (!item) continue;
    const type = shortType(item);
    if (!type.includes('accordionItem')) continue;

    // label is the accordion trigger text
    const label = item.label || '';
    const childItems = item[':items'] || {};

    // Extract body from copy (richtextFullElement)
    let body = '';
    const copy = childItems.copy;
    if (copy && Array.isArray(copy.richtext) && copy.richtext.length > 0) {
      body = richtextToHtml(copy.richtext);
    }

    if (label || body) {
      rows.push([label, body]);
    }
  }

  if (rows.length === 0) return sectionHeading;

  // Section-level link/button
  let sectionLink = '';
  if (items.link?.linkUrl) {
    sectionLink = `<p><a href="${items.link.linkUrl}">${items.link.linkLabel || items.link.linkUrl}</a></p>`;
  }
  if (items.button?.buttonUrl) {
    sectionLink += `<p><a href="${items.button.buttonUrl}">${items.button.buttonLabel || 'Link'}</a></p>`;
  }

  return `${sectionHeading}${blockTable('accordion', rows)}${sectionLink}`;
}

/** firstLevelTeaserSection → columns-teaser block (teaser cards with image + text + link) */
export function mapFirstLevelTeaser(component) {
  const items = component[':items'] || {};
  const order = component[':itemsOrder'] || Object.keys(items);

  // Section heading
  const headingItem = items.heading;
  let sectionHeading = '';
  if (headingItem && headingItem.empty !== true && Array.isArray(headingItem.richtext) && headingItem.richtext.length > 0) {
    sectionHeading = headingHtml(headingItem.style || 'h2', headingItem.richtext, { stripBold: true });
  }

  const rows = [];
  for (const key of order) {
    if (key === 'heading') continue;
    const child = items[key];
    if (!child) continue;

    // editorialTeaserElement with direct fields: heading (string), abstract (string), scene7File, altText, link fields
    let image = '';
    if (child.scene7File) {
      image = pictureTag({ scene7File: child.scene7File, altText: child.altText || '' });
    }

    const heading = child.heading ? `<h3>${child.heading}</h3>` : '';
    const abstract = child.abstract ? `<p>${child.abstract}</p>` : '';
    let link = '';
    if (child.teaserElementLinkHref) {
      link = `<p><a href="${child.teaserElementLinkHref}">${child.teaserElementLinkText || 'Mehr erfahren'}</a></p>`;
    }

    const imageCol = image;
    const textCol = `${heading}${abstract}${link}`;
    if (imageCol || textCol.trim()) {
      rows.push([imageCol, textCol]);
    }
  }

  if (rows.length === 0) return sectionHeading;
  return `${sectionHeading}${blockTable('columns-teaser', rows)}`;
}

/** highlightFeatureSection → columns-teaser block (product features with image + specs) */
export function mapHighlightFeature(component) {
  const items = component[':items'] || {};
  const order = component[':itemsOrder'] || Object.keys(items);
  const rows = [];

  for (const key of order) {
    const child = items[key];
    if (!child) continue;

    // xfCarFeature items have nested content
    const childItems = child[':items'] || {};

    // Image from mediaParsys
    let image = '';
    const mediaParsys = childItems.mediaParsys || childItems.media;
    if (mediaParsys) {
      const mediaItems = mediaParsys[':items'] || {};
      for (const mk of Object.keys(mediaItems)) {
        const mediaNode = mediaItems[mk];
        if (mediaNode) {
          const pic = pictureTag(mediaNode[':items']?.image || mediaNode.image || mediaNode);
          if (pic) { image = pic; break; }
        }
      }
    }

    // Heading from contentName or nested heading
    const heading = child.contentName ? `<h3>${child.contentName}</h3>` : '';

    // Title/tagline
    let title = '';
    if (childItems.title && Array.isArray(childItems.title.richtext)) {
      title = `<p>${richtextToHtml(childItems.title.richtext)}</p>`;
    }

    // Copy/specs from copyParsys
    let body = '';
    const copyParsys = childItems.copyParsys;
    if (copyParsys) {
      const copyItems = copyParsys[':items'] || {};
      for (const ck of Object.keys(copyItems)) {
        const copyNode = copyItems[ck];
        if (copyNode && Array.isArray(copyNode.richtext) && copyNode.richtext.length > 0) {
          body += richtextToHtml(copyNode.richtext);
        }
      }
    }

    const imageCol = image;
    const textCol = `${heading}${title}${body}`;
    if (imageCol || textCol.trim()) {
      rows.push([imageCol, textCol]);
    }
  }

  if (rows.length === 0) return '';
  return blockTable('columns-teaser', rows);
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
  'editorial/sections/carTechnicalDataSection': mapCarTechnicalData,
  'editorial/sections/powerTeaserSection': mapPowerTeaser,
  'editorial/sections/simpleStageSection': mapSimpleStage,
  'editorial/sections/editorialTeaserSection': mapEditorialTeaser,
  'editorial/sections/accordionSection': mapAccordion,
  'editorial/sections/firstLevelTeaserSection': mapFirstLevelTeaser,
  'editorial/sections/highlightFeatureSection': mapHighlightFeature,
};

/**
 * Maps a component to HTML. Returns empty string if not mappable.
 */
export function mapComponent(component) {
  const type = shortType(component);
  const mapper = SECTION_MAPPERS[type];
  if (mapper) return mapper(component);

  // Element-level components (heading, richtext, link, button, media)
  // Default content headings: strip bold (xwalk escapes inline HTML in default content)
  if (type.includes('headingElement')) {
    return headingHtml(component.style || component.order || 'h2', component.richtext, { stripBold: true });
  }
  if (type.includes('richtextFull') || type.includes('richtextSimple')) {
    const content = richtextToHtml(component.richtext);
    if (!content.trim()) return '';
    const trimmed = content.trim();
    if (trimmed.startsWith('<p>') || trimmed.startsWith('<ul>') || trimmed.startsWith('<ol>')) return content;
    return `<p>${content}</p>`;
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
  if (type.includes('copyItem') && Array.isArray(component.richtext) && component.richtext.length > 0) {
    const content = richtextToHtml(component.richtext);
    if (content.trim()) {
      const trimmed = content.trim();
      if (trimmed.startsWith('<p>') || trimmed.startsWith('<ul>') || trimmed.startsWith('<ol>') || trimmed.startsWith('<h')) return content;
      return `<p>${content}</p>`;
    }
  }

  return '';
}
