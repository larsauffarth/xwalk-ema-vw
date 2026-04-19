/**
 * JSON-based AEM Content Importer
 *
 * Core import engine for the VW Germany migration. Fetches content from the
 * AEM SPA Editor's .model.json API (not DOM scraping), walks the component tree,
 * applies visibility filtering, maps components to EDS block HTML, and produces
 * .plain.html content files compatible with AEM Edge Delivery Services.
 *
 * Pipeline: URL → .model.json fetch → component tree walk → visibility filter
 *           → component mapper → section assembly → metadata block → HTML output
 *
 * Key design decisions:
 * - Uses .model.json API instead of Playwright DOM scraping for reliability
 * - Handles dealer pages specially via dealer-fetcher.js (separate BFF APIs)
 * - Section groups create section breaks; structural containers are recursed
 * - Section styles (e.g., 'dark') are auto-detected from component anchor IDs
 *
 * OUT OF SCOPE: The importer is tightly coupled to the VW AEM component structure
 * (vwa-ngw18/components/*). Reuse for other sites would require new component mappers.
 */
import { isVisible, shortType } from './visibility-filter.js';
import { mapComponent, mapDefaultContent } from './component-mappers.js';
import { fetchDealerData } from './dealer-fetcher.js';

/**
 * Imports a single page from its .model.json endpoint.
 *
 * Full import pipeline for one page:
 * 1. Convert page URL to .model.json API URL (strip .html, append .model.json)
 * 2. Fetch the JSON payload from VW's AEM SPA Editor API
 * 3. Check if this is a dealer page (triggers separate BFF API fetches)
 * 4. Extract page metadata (title, description, OG tags) from headerDataModel
 * 5. Walk the component tree, filtering invisible components and mapping to EDS blocks
 * 6. Build the EDS metadata block table and append it to the content HTML
 * 7. Return the assembled HTML with the document path for file creation
 *
 * @param {string} pageUrl - Full page URL (e.g., https://www.volkswagen.de/de.html)
 * @returns {Object} { path, html, metadata, error }
 */
export async function importPage(pageUrl) {
  try {
    // Build .model.json URL by stripping .html extension and appending .model.json
    const url = new URL(pageUrl);
    const jsonPath = url.pathname.replace(/\.html$/, '').replace(/\/$/, '');
    const jsonUrl = `${url.origin}${jsonPath}.model.json`;

    // Fetch JSON from AEM's SPA Editor content API
    const response = await fetch(jsonUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status} for ${jsonUrl}`);
    const data = await response.json();

    // Check if this is a dealer page — dealer pages have separate BFF APIs
    // for opening hours, reviews, contacts, etc. (see dealer-fetcher.js)
    const dealerData = await fetchDealerData(data);

    // Extract page-level metadata from the JSON (title, description, OG image, etc.)
    const metadata = extractMetadata(data, dealerData);

    // Walk the AEM component tree and generate EDS-compatible HTML content
    const contentHtml = walkTree(data, dealerData);

    // Build the EDS metadata block (key-value table appended after content)
    const metadataBlock = buildMetadataBlock(metadata);

    // Assemble full page: content sections + metadata block
    const html = `${contentHtml}\n${metadataBlock}`;

    // Generate document path (used as the file path for content storage)
    const path = jsonPath || '/index';

    return { path, html, metadata, error: null };
  } catch (error) {
    return { path: null, html: null, metadata: null, error: error.message };
  }
}

/**
 * Walk the AEM component tree depth-first, emitting HTML for visible components.
 *
 * VW AEM page structure (top → bottom):
 *   root → main → stageParsys (hero area, processed first)
 *                → mainParsys  (content sections, processed second)
 *
 * The tree walk handles three types of nodes:
 * - Section groups (structure/sectionGroup): create EDS section breaks (<div> wrappers)
 *   with optional section-metadata (e.g., style: dark)
 * - Structural containers (parsys, pagemain, etc.): transparent — recurse into children
 * - Content components (sections/elements): mapped to EDS block HTML via component-mappers.js
 *
 * Each top-level section becomes a <div> in the output, which EDS interprets as a
 * section break. Components within a section are concatenated without breaks.
 */
function walkTree(data, dealerData = null) {
  // Dealer pages bypass normal component tree — they have a custom hardcoded layout
  if (dealerData) {
    return buildDealerPage(data, dealerData);
  }

  // Navigate to the main content container: root → main
  const root = data[':items']?.root;
  if (!root) return '';

  const main = root[':items']?.main;
  if (!main) return '';

  const sections = [];
  let currentSection = '';

  // Process stageParsys first — this contains the hero/stage component at the top of the page.
  // VW pages always render the stage area above the main content area.
  const stageParsys = main[':items']?.stageParsys;
  if (stageParsys) {
    const stageHtml = processContainer(stageParsys);
    if (stageHtml.trim()) {
      sections.push(`<div>${stageHtml}</div>`);
    }
  }

  // Process mainParsys — this contains all content sections below the hero
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
 * Build a dealer-specific page layout from dealer BFF data + remaining mainParsys items.
 *
 * OUT OF SCOPE: Dealer page layout is heavily hardcoded with German section headings
 * ("Wie können wir Ihnen weiterhelfen?", "Unsere Leistungen", "Bewertungen", etc.).
 * In production, these should be author-managed templates with i18n support.
 * The 12-section layout mirrors volkswagen.de's dealer page structure.
 */
function buildDealerPage(data, dealerData) {
  const sections = [];

  // --- Section 1: Hero ---
  const stageImage = dealerData.stageImage
    ? `<picture><img src="${dealerData.stageImage}" alt="${dealerData.displayName || ''}"></picture>`
    : '';
  const addr = dealerData.address || {};
  const contact = dealerData.contact || {};

  let heroText = `<h1>${dealerData.displayName || dealerData.legalName || ''}</h1>`;
  if (addr.street || addr.postalCode || addr.city) {
    heroText += `<p>${addr.street}, ${addr.postalCode} ${addr.city}</p>`;
  }
  if (contact.phone) {
    heroText += `<p>Tel: ${contact.phone.replace(/\s+/g, ' ').trim()}</p>`;
  }
  if (contact.email) {
    heroText += `<p>E-Mail: <a href="mailto:${contact.email}">${contact.email}</a></p>`;
  }

  const heroBlock = `<div class="hero-dealer"><div><div>${stageImage}</div></div><div><div>${heroText}</div></div></div>`;
  sections.push(`<div>${heroBlock}</div>`);

  // --- Section 2: Next Steps CTAs ---
  if (dealerData.nextSteps && dealerData.nextSteps.length > 0) {
    let cardsHtml = '<div class="cards">';
    for (const step of dealerData.nextSteps) {
      const headline = step.headline || '';
      const topline = step.topline || '';
      let cellContent = '';
      if (headline) cellContent += `<h3>${headline}</h3>`;
      if (topline) cellContent += `<p>${topline}</p>`;
      // Two columns: empty image + text (matching cards model: image, text)
      cardsHtml += `<div><div></div><div>${cellContent}</div></div>`;
    }
    cardsHtml += '</div>';
    sections.push(`<div><h2>Wie können wir Ihnen weiterhelfen?</h2>${cardsHtml}</div>`);
  }

  // --- Section 3: Welcome ---
  if (dealerData.introHeadline || dealerData.introCopy) {
    let welcomeHtml = '';
    if (dealerData.introHeadline) welcomeHtml += `<h2>${dealerData.introHeadline}</h2>`;
    if (dealerData.introCopy) welcomeHtml += `<p>${dealerData.introCopy}</p>`;
    sections.push(`<div>${welcomeHtml}</div>`);
  }

  // --- Section 4: Opening Hours ---
  if (dealerData.departments && dealerData.departments.length > 0) {
    let hoursHtml = '<div class="dealer-hours">';
    // Header row
    hoursHtml += '<div><div>Abteilung</div><div>Mo-Fr</div><div>Sa</div></div>';

    for (const dept of dealerData.departments) {
      const deptName = dept.name || dept.key || '';
      let weekdayHours = '-';
      let satHours = '-';

      if (dept.hours && dept.hours.length > 0) {
        // Find a weekday entry (Mon-Fri) and Saturday
        const weekday = dept.hours.find((d) => d.dayOfWeek >= 1 && d.dayOfWeek <= 5);
        const saturday = dept.hours.find((d) => d.dayOfWeek === 6);

        if (weekday && weekday.times && weekday.times.length > 0) {
          weekdayHours = weekday.times.map((t) => `${t.from || ''} - ${t.till || t.until || ''}`).join(', ');
        }
        if (saturday && saturday.times && saturday.times.length > 0) {
          satHours = saturday.times.map((t) => `${t.from || ''} - ${t.till || t.until || ''}`).join(', ');
        }
      }

      hoursHtml += `<div><div>${deptName}</div><div>${weekdayHours}</div><div>${satHours}</div></div>`;
    }
    hoursHtml += '</div>';
    sections.push(`<div>${hoursHtml}</div>`);
  }

  // --- Section 5: Services list ---
  if (dealerData.services && dealerData.services.length > 0) {
    const serviceLabels = dealerData.services
      .filter((s) => s.label && !s.label.startsWith('#'))
      .map((s) => s.label);
    if (serviceLabels.length > 0) {
      sections.push(`<div><h2>Unsere Leistungen</h2><p>${serviceLabels.join(' · ')}</p></div>`);
    }
  }

  // --- Section 6: Ratings & Reviews ---
  if (dealerData.ratings) {
    let ratingsHtml = '<h2>Bewertungen</h2>';
    ratingsHtml += `<p>\u2B50 ${dealerData.ratings.avgRating}/5 (${dealerData.ratings.totalRatings} Bewertungen)</p>`;

    if (dealerData.reviews && dealerData.reviews.length > 0) {
      for (const review of dealerData.reviews) {
        let reviewHtml = '';
        if (review.rating) reviewHtml += `<p><strong>${review.rating}/5</strong>`;
        if (review.date) reviewHtml += ` — ${review.date}`;
        if (review.rating || review.date) reviewHtml += '</p>';
        if (review.text) reviewHtml += `<p>${review.text}</p>`;
        ratingsHtml += reviewHtml;
      }
    }
    sections.push(`<div>${ratingsHtml}</div>`);
  }

  // --- Section 7: Unsere aktuellen Angebote ---
  sections.push(`<div><h2>Unsere aktuellen Angebote</h2><p>Entdecken Sie die aktuellen Angebote von ${dealerData.displayName}.</p></div>`);

  // --- Section 8: Neu- & Gebrauchtwagen + vehicle search ---
  sections.push('<div><h2>Neu- &amp; Gebrauchtwagen</h2>'
    + '<div class="embed-search"><div><div><!-- field:embed_placeholder --><!-- field:embed_uri -->'
    + '<p><a href="/de/modelle/verfuegbare-fahrzeuge.html">Fahrzeugsuche</a></p>'
    + '</div></div></div></div>');

  // --- Section 9: Service, Teile & Zubehör (from teaser BFF) ---
  const serviceCards = dealerData.teasers?.['service-highlights'] || [];
  if (serviceCards.length > 0) {
    let serviceHtml = '<h2>Service, Teile &amp; Zubehör</h2><div class="carousel-featured">';
    for (const card of serviceCards) {
      const img = card.image ? `<picture><img src="${card.image}" alt="${card.imageAlt || ''}"></picture>` : '';
      const heading = card.headline ? `<h2>${card.headline}</h2>` : '';
      const copy = card.copy ? `<p>${card.copy}</p>` : '';
      const cta = card.ctaUrl ? `<p><a href="${card.ctaUrl}">${card.ctaLabel || 'Mehr erfahren'}</a></p>` : '';
      serviceHtml += `<div><div><!-- field:media_image -->${img}</div><div><!-- field:content_text -->${heading}${copy}${cta}</div></div>`;
    }
    serviceHtml += '</div>';
    sections.push(`<div>${serviceHtml}</div>`);
  } else {
    sections.push('<div><h2>Service, Teile &amp; Zubehör</h2></div>');
  }

  // --- Section 10: Ansprechpartner (from department contacts) ---
  if (dealerData.departmentContacts && dealerData.departmentContacts.length > 0) {
    let contactsHtml = '<h2>Ihre qualifizierten Ansprechpartner</h2><div class="cards">';
    // Group by department, show top contacts per department
    const byDept = {};
    for (const c of dealerData.departmentContacts) {
      const dept = c.department || 'Allgemein';
      if (!byDept[dept]) byDept[dept] = [];
      byDept[dept].push(c);
    }
    for (const [dept, contacts] of Object.entries(byDept)) {
      // Show up to 2 contacts per department
      for (const c of contacts.slice(0, 2)) {
        let cardContent = `<h3>${c.name}</h3>`;
        cardContent += `<p><strong>${c.position}</strong></p>`;
        cardContent += `<p>${dept}</p>`;
        if (c.phone) cardContent += `<p>Tel: ${c.phone}</p>`;
        if (c.email) cardContent += `<p><a href="mailto:${c.email}">${c.email}</a></p>`;
        // Two columns: empty image + text (matching cards model: image, text)
        contactsHtml += `<div><div></div><div>${cardContent}</div></div>`;
      }
    }
    contactsHtml += '</div>';
    sections.push(`<div>${contactsHtml}</div>`);
  }

  // --- Section 11: Modell-Highlights (from teaser BFF) ---
  const modelCards = dealerData.teasers?.['vw-modelle'] || [];
  if (modelCards.length > 0) {
    let modelsHtml = '<h2>Modell-Highlights</h2><div class="carousel-featured">';
    for (const card of modelCards) {
      const img = card.image ? `<picture><img src="${card.image}" alt="${card.imageAlt || ''}"></picture>` : '';
      const heading = card.headline ? `<h2>${card.headline}</h2>` : '';
      const cta = card.ctaUrl ? `<p><a href="${card.ctaUrl}">${card.ctaLabel || 'Mehr erfahren'}</a></p>` : '';
      modelsHtml += `<div><div><!-- field:media_image -->${img}</div><div><!-- field:content_text -->${heading}${cta}</div></div>`;
    }
    modelsHtml += '</div>';
    sections.push(`<div>${modelsHtml}</div>`);
  } else {
    sections.push('<div><h2>Modell-Highlights</h2></div>');
  }

  // --- Section 12: Anfahrt / Directions (Google Maps link) ---
  if (dealerData.coordinates) {
    const { lat, lng } = dealerData.coordinates;
    const addr = dealerData.address || {};
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    const addrStr = `${addr.street}, ${addr.postalCode} ${addr.city}`.trim();
    sections.push(`<div><h2>Anfahrt</h2><p>${addrStr}</p><p><a href="${mapsUrl}" target="_blank">Route planen (Google Maps)</a></p></div>`);
  }

  return sections.join('\n');
}

/**
 * Detect if a section group needs a background style.
 * Returns style name ('dark', 'grey') or null.
 *
 * Walks the component subtree looking for featureAppSection nodes whose
 * anchorId matches known dark-background patterns (e.g., 'schnellsuche').
 * This drives the section-metadata 'style: dark' output that triggers
 * the navy background in the EDS frontend CSS.
 */
function detectSectionStyle(group) {
  // Check top-level anchorId first for direct match
  const anchorId = group.anchorId || '';

  // Recursively walk children to find feature app sections with known anchor IDs
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
 *
 * Section groups are AEM's way of grouping related components into a visual
 * section. This function recursively descends into the group's children:
 * - Structural containers (vis === 'recurse') → processContainer() to unwrap
 * - Content components (vis === true) → mapComponent() to generate HTML
 * - Invisible components (vis === false) → skipped entirely
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
 *
 * Structural containers (parsys, pagemain, etc.) are transparent wrappers
 * in the AEM component tree. They produce no HTML themselves — we simply
 * iterate their children using the same recursive descent pattern as
 * processSectionGroup(). This is the core recursion mechanism that lets
 * us flatten arbitrarily nested AEM structures into flat EDS section HTML.
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
 *
 * Metadata comes from the headerDataModel node in the AEM JSON — this is
 * NOT from standard HTML <meta> tags (since we never fetch the HTML page).
 * The headerDataModel contains SEO fields: pageTitle, description, ogImage, etc.
 * For dealer pages, metadata is overridden with dealer-specific values.
 */
function extractMetadata(data, dealerData = null) {
  // headerDataModel lives at root level in the :items tree, not at the JSON top level
  const header = data[':items']?.root?.headerDataModel || data.headerDataModel || {};
  const meta = {};

  if (header.pageTitle) meta.Title = header.pageTitle;
  if (header.description) meta.Description = header.description;
  if (header.ogImage) meta.Image = `<img src="${header.ogImage}" alt="">`;
  if (header.ogDescription) meta['og:description'] = header.ogDescription;
  if (header.canonicalUrl) meta.canonical = header.canonicalUrl;

  // Dealer page overrides
  if (dealerData) {
    meta.Title = `${dealerData.displayName} | Volkswagen Deutschland`;
    if (dealerData.introCopy) {
      meta.Description = dealerData.introCopy.substring(0, 160);
    }
  }

  return meta;
}

/**
 * Build the EDS metadata block table.
 *
 * EDS uses a special "metadata" block at the end of each page to store
 * page-level properties (Title, Description, og:description, canonical, etc.).
 * The format is a div with class="metadata" containing key-value rows:
 *   <div class="metadata">
 *     <div><div>Title</div><div>Page Title Here</div></div>
 *     <div><div>Description</div><div>Page description</div></div>
 *   </div>
 * This is parsed by EDS to set <head> meta tags during page rendering.
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
