# Fix Search Form md2jcr Errors

## Problem Analysis

Three md2jcr errors to fix:

### Error 1: `de` — Search Form content doesn't map to model
**Root cause:** The `search-form` block on `de.plain.html` line 6 is missing `<!-- field:* -->` hints. The model has 4 fields (`categories`, `filters`, `location`, `cta`) and md2jcr needs field hints to map columns to fields.

**Current (broken):**
```html
<div class="search-form"><div>
  <div>Neuwagen, ...</div>
  <div>Modelle, ...</div>
  <div>Postleitzahl, Ort</div>
  <div><a href="...">Fahrzeuge anzeigen</a></div>
</div></div>
```

**Needed:**
```html
<div class="search-form"><div>
  <div><!-- field:categories -->Neuwagen, ...</div>
  <div><!-- field:filters -->Modelle, ...</div>
  <div><!-- field:location -->Postleitzahl, Ort</div>
  <div><!-- field:cta --><a href="...">Fahrzeuge anzeigen</a></div>
</div></div>
```

### Error 2: `de/fragments/search/index` — File not found
**Root cause:** md2jcr looks for `content/de/fragments/search/index.plain.html` but only `index.html` exists. The `.plain.html` is needed for JCR conversion.

### Error 3: `fragments/search/index` — File not found  
**Root cause:** There's a duplicate fragment at `content/fragments/search/index.html` (root level, created during debugging). md2jcr tries this path too but there's no `.plain.html`.

## Fix Plan

### 1. Add field hints to `de.plain.html` search-form block
- Add `<!-- field:categories -->`, `<!-- field:filters -->`, `<!-- field:location -->`, `<!-- field:cta -->` hints to the 4 columns
- This fixes the md2jcr model mapping error

### 2. Create `content/de/fragments/search/index.plain.html`
- Create `.plain.html` with field-hinted content matching the search-form model
- Same content as the existing `search.plain.html` (which already has field hints)

### 3. Clean up duplicate fragment at `content/fragments/`
- Remove `content/fragments/search/index.html` (root-level duplicate created during debugging)
- Only keep `content/de/fragments/search/` (correct location)

### 4. Update fragment `index.html` to include field hints
- Add `<!-- field:* -->` comments to `content/de/fragments/search/index.html` so the AEM CLI generates correct `.plain.html`

### 5. Verify search-form JS still works with field hints
- The `search-form.js` reads content via `cells[n].textContent.trim()` — field hint comments are not text nodes, so they won't affect parsing
- The `embed-search` → `search-form` runtime swap loads from `.plain.html` which already has hints

## Impact on Fragment Loading

None — the `embed-search` block loads from `/content/de/fragments/search.plain.html` which is the **static** `.plain.html` file (served directly by AEM CLI from the `content/` mount). The `index.html` and `index.plain.html` are used by md2jcr for JCR conversion. Both paths coexist without conflict.

## Checklist

- [ ] Add `<!-- field:* -->` hints to search-form block in `content/de.plain.html` line 6
- [ ] Add `<!-- field:* -->` hints to `content/de/fragments/search/index.html`
- [ ] Create `content/de/fragments/search/index.plain.html` with field-hinted content
- [ ] Remove duplicate `content/fragments/search/index.html`
- [ ] Verify local preview still renders the search form correctly
