/**
 * Search Form Block
 * Static visual recreation of the VW Schnellsuche (quick search) filter bar.
 * Renders category chips, filter dropdowns, location input, and a CTA button.
 * Non-functional — purely visual for migration purposes.
 *
 * Content structure (single row, 4 columns matching model fields):
 *   Col 1: categories — comma-separated chip labels
 *   Col 2: filters — comma-separated dropdown labels
 *   Col 3: location — placeholder text
 *   Col 4: cta — link element
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

export default function decorate(block) {
  // Read columns from single row: categories | filters | location | cta
  const row = block.querySelector(':scope > div');
  if (!row) return;

  const cells = [...row.children];
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
