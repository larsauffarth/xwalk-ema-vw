/**
 * Search Form Block (search-form)
 *
 * Static visual recreation of the VW Schnellsuche (quick search) filter bar.
 * Renders category chips, filter dropdowns, location input, and a CTA button.
 * **Non-functional** — purely visual for migration fidelity. The actual search
 * functionality would need to be implemented as a separate feature.
 *
 * FRAGMENT PATTERN:
 *   FRAGMENT_PATH ('/content/de/fragments/search') is a shared content fragment
 *   that contains the search-form block markup. If this block is empty (no authored
 *   content), it self-loads its content from the fragment — similar to how the
 *   header block loads its navigation from /content/nav. This allows the search form
 *   to be authored once and reused across multiple pages.
 *
 *   The embed-search block also references this same fragment when it needs to
 *   render an inline search form instead of an iframe (see embed-search.js).
 *
 * Content model (authored in Universal Editor, single row with 4 columns):
 *   Col 1: categories — comma-separated chip labels (e.g., "Elektro, Hybrid, Benzin")
 *   Col 2: filters — comma-separated dropdown labels (e.g., "Fahrzeugtyp, Marke")
 *   Col 3: location — placeholder text for location input
 *   Col 4: cta — link element for the search button
 *
 * UI components built by helper functions:
 *   - buildChips(): category filter chips (toggle buttons)
 *   - buildDropdown(): filter dropdown selectors with chevron arrow
 *   - buildLocation(): location input with crosshair icon
 *   - buildCta(): primary search button + detail search link
 */

/**
 * Builds a row of category chip buttons from comma-separated text.
 * @param {string} text - Comma-separated category labels
 * @returns {HTMLElement} Container with chip buttons
 */
function buildChips(text) {
  const container = document.createElement('div');
  container.className = 'search-form-chips';
  text.split(',').map((t) => t.trim()).filter(Boolean).forEach((label) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'search-form-chip';
    chip.textContent = label;
    container.append(chip);
  });
  return container;
}

/**
 * Builds a single dropdown selector with label and chevron arrow.
 * @param {string} label - Display text for the dropdown
 * @returns {HTMLElement} Dropdown wrapper element
 */
function buildDropdown(label) {
  const wrapper = document.createElement('div');
  wrapper.className = 'search-form-dropdown';
  const span = document.createElement('span');
  span.className = 'search-form-dropdown-label';
  span.textContent = label;
  const arrow = document.createElement('span');
  arrow.className = 'search-form-dropdown-arrow';
  arrow.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  wrapper.append(span, arrow);
  return wrapper;
}

/**
 * Builds a location input display with crosshair icon.
 * @param {string} placeholder - Placeholder text for the location field
 * @returns {HTMLElement} Location input wrapper element
 */
function buildLocation(placeholder) {
  const wrapper = document.createElement('div');
  wrapper.className = 'search-form-location';
  const icon = document.createElement('span');
  icon.className = 'search-form-location-icon';
  icon.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2"/><path d="M12 2v3m0 14v3m10-10h-3M5 12H2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const input = document.createElement('span');
  input.className = 'search-form-location-text';
  input.textContent = placeholder;
  wrapper.append(icon, input);
  return wrapper;
}

/**
 * Builds the CTA section with a primary search button and a detail search link.
 * @param {string} text - Button label text
 * @param {string} href - URL for the search results page
 * @returns {HTMLElement} CTA wrapper element
 */
// OUT OF SCOPE: Hardcoded German CTA text and URLs.
// Fallback text 'Fahrzeuge anzeigen' and 'Detailsuche öffnen', and the fallback URL
// '/de/modelle/verfuegbare-fahrzeuge.html' are hardcoded. These should be externalized
// for i18n and configured via site metadata.
function buildCta(text, href) {
  const wrapper = document.createElement('div');
  wrapper.className = 'search-form-cta';
  const btn = document.createElement('a');
  btn.href = href || '/de/modelle/verfuegbare-fahrzeuge.html';
  btn.className = 'search-form-button';
  btn.textContent = text || 'Fahrzeuge anzeigen';
  const detail = document.createElement('a');
  detail.href = href || '/de/modelle/verfuegbare-fahrzeuge.html';
  detail.className = 'search-form-detail-link';
  detail.textContent = 'Detailsuche öffnen';
  wrapper.append(btn, detail);
  return wrapper;
}

// OUT OF SCOPE: Hardcoded fragment path. In production, the fragment path should
// be derived from site configuration. This block is non-functional (visual only) —
// the actual search functionality would need to be implemented as a separate feature.
const FRAGMENT_PATH = '/content/de/fragments/search';

/**
 * Extracts content cells from the block's row/column structure.
 * Each row is a direct child div containing one column div.
 * @param {HTMLElement} block - The block element
 * @returns {HTMLElement[]} Array of innermost column divs (one per row)
 */
function extractRows(block) {
  // Each row is a direct child div, each row has one column div
  const rows = [...block.querySelectorAll(':scope > div')];
  return rows.map((row) => row.querySelector(':scope > div') || row);
}

/**
 * Loads content cells from the block or, if empty, from the shared search fragment.
 * This self-loading pattern is similar to how the header block loads nav content:
 * if the block has no authored content, it fetches the fragment's .plain.html and
 * extracts the search-form block markup from it.
 *
 * @param {HTMLElement} block - The block element
 * @returns {HTMLElement[]|null} Array of content cells, or null if loading failed
 */
async function loadContent(block) {
  const cells = extractRows(block);
  const hasContent = cells.length >= 3 && cells[0]?.textContent?.trim();

  if (hasContent) return cells;

  // Self-load from fragment (like header loads nav)
  const resp = await fetch(`${FRAGMENT_PATH}.plain.html`);
  if (!resp.ok) return null;
  const html = await resp.text();
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const sfBlock = tmp.querySelector('.search-form');
  if (!sfBlock) return null;
  const sfRows = [...sfBlock.querySelectorAll(':scope > div')];
  return sfRows.map((row) => row.querySelector(':scope > div') || row);
}

export default async function decorate(block) {
  const cells = await loadContent(block);
  if (!cells || cells.length < 3) return;

  const categoriesText = cells[0]?.textContent?.trim() || '';
  const filtersText = cells[1]?.textContent?.trim() || '';
  const locationText = cells[2]?.textContent?.trim() || '';
  const ctaLink = cells[3]?.querySelector('a');
  const ctaText = ctaLink?.textContent?.trim() || 'Fahrzeuge anzeigen';
  const ctaHref = ctaLink?.getAttribute('href') || '/de/modelle/verfuegbare-fahrzeuge.html';

  block.innerHTML = '';

  // Category chips
  if (categoriesText) {
    block.append(buildChips(categoriesText));
  }

  // Filter dropdowns row
  if (filtersText) {
    const filtersRow = document.createElement('div');
    filtersRow.className = 'search-form-filters';
    filtersText.split(',').map((f) => f.trim()).filter(Boolean)
      .forEach((label) => filtersRow.append(buildDropdown(label)));
    block.append(filtersRow);
  }

  // Location row
  if (locationText) {
    const bottomRow = document.createElement('div');
    bottomRow.className = 'search-form-bottom';
    bottomRow.append(buildLocation(locationText));
    block.append(bottomRow);
  }

  // CTA
  block.append(buildCta(ctaText, ctaHref));
}
