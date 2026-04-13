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

function convertNode(node) {
  if (!node || typeof node !== 'object') return '';

  switch (node.kind) {
    case 'textNode':
      return escapeHtml(node.value || node.copy || '');

    case 'textItem':
      return escapeHtml(node.copy || node.value || '');

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

    case 'disclaimer':
      // Skip disclaimers — legal footnotes not needed in migrated content
      return '';

    case 'lineBreak':
      return '<br>';

    case 'nonBreakingSafeWord':
      // These wrap words that shouldn't break — just output the content
      return Array.isArray(node.children)
        ? node.children.map(convertNode).join('')
        : (node.value || node.copy || '');

    default:
      // Unknown kind — try to extract text
      if (node.value) return escapeHtml(node.value);
      if (node.copy) return escapeHtml(node.copy);
      if (node.children) return node.children.map(convertNode).join('');
      return '';
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

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

  // Strip outer <b>/<strong> wrapper for default content headings
  // xwalk escapes inline HTML in default content, so bold must come from CSS
  if (options.stripBold) {
    content = content
      .replace(/^<b>(.*)<\/b>$/s, '$1')
      .replace(/^<strong>(.*)<\/strong>$/s, '$1');
  }

  return `<${tag}>${content}</${tag}>`;
}
