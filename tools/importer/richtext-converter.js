/**
 * Converts VW AEM richtext arrays to HTML strings.
 *
 * Richtext format: array of objects with 'kind' property:
 *   - textNode: { kind: 'textNode', value: 'Hello' }
 *   - htmlElement: { kind: 'htmlElement', tagName: 'b', children: [...] }
 *   - disclaimer: { kind: 'disclaimer', disclaimers: [{ text, id }] }
 */
export function richtextToHtml(richtext) {
  if (!Array.isArray(richtext) || richtext.length === 0) return '';
  return richtext.map(convertNode).join('');
}

/**
 * Converts a single richtext node to an HTML string.
 * Dispatches based on the node's 'kind' property — the VW richtext format
 * uses kind to distinguish text nodes, HTML elements, disclaimers, etc.
 */
function convertNode(node) {
  if (!node || typeof node !== 'object') return '';

  switch (node.kind) {
    // Plain text content — the most common node type. Escaped for safe HTML output.
    case 'textNode':
      return escapeHtml(node.value || node.copy || '');

    // Alternate text node format (some VW components use 'textItem' instead of 'textNode')
    case 'textItem':
      return escapeHtml(node.copy || node.value || '');

    // HTML element with tag name, attributes, and children — renders as the actual HTML tag.
    // Handles links (a), bold (b/strong), italic (em), lists (ul/ol/li), paragraphs (p), etc.
    case 'htmlElement': {
      const tag = node.tagName || 'span';
      const children = Array.isArray(node.children)
        ? node.children.map(convertNode).join('')
        : '';

      // Build attributes
      let attrs = '';
      if (node.href) attrs += ` href="${escapeAttr(node.href)}"`;
      if (node.target) attrs += ` target="${escapeAttr(node.target)}"`;
      if (node.title) attrs += ` title="${escapeAttr(node.title)}"`;

      // Self-closing tags
      if (tag === 'br' || tag === 'hr') return `<${tag}>`;

      return `<${tag}${attrs}>${children}</${tag}>`;
    }

    // Legal disclaimer footnote references (e.g., fuel consumption, emissions).
    // Skipped because migrated EDS content does not reproduce VW's footnote system.
    case 'disclaimer':
      return '';

    // Explicit line break — maps directly to <br>
    case 'lineBreak':
      return '<br>';

    // Non-breaking word wrapper — VW uses this to prevent line breaks within
    // specific words (e.g., brand names). We just output the content without the wrapper.
    case 'nonBreakingSafeWord':
      return Array.isArray(node.children)
        ? node.children.map(convertNode).join('')
        : (node.value || node.copy || '');

    default:
      // Unknown/future node kinds — gracefully degrade by extracting any text content
      if (node.value) return escapeHtml(node.value);
      if (node.copy) return escapeHtml(node.copy);
      if (node.children) return node.children.map(convertNode).join('');
      return '';
  }
}

/** Escape HTML special characters in text content to prevent XSS in generated HTML. */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/** Escape HTML attribute values (adds quote escaping on top of standard HTML escaping). */
function escapeAttr(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Wraps richtext output in a heading tag based on the style field.
 * @param {string} style - 'H1', 'H2', 'H3', etc.
 * @param {Array} richtext - richtext array
 * @param {Object} [options] - { stripBold: true } to remove <b>/<strong> wrappers (for default content headings in xwalk)
 */
export function headingHtml(style, richtext, options = {}) {
  const tag = (style || 'h2').toLowerCase();
  let content = richtextToHtml(richtext);
  if (!content.trim()) return '';

  // xwalk escapes <b>/<strong> tags in default content headings, rendering them
  // as literal text. stripBold removes these tags so headings display correctly.
  // Block richtext fields (inside <!-- field:* --> hints) CAN use <b> tags safely.
  // Handles both full wrappers (<b>entire text</b>) and partial bold (<b>part</b> rest)
  if (options.stripBold) {
    content = content
      .replace(/<\/?b>/g, '')
      .replace(/<\/?strong>/g, '');
  }

  return `<${tag}>${content}</${tag}>`;
}
