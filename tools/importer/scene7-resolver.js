/**
 * Resolves Scene7 file references to production CDN image URLs.
 */
const SCENE7_BASE = 'https://assets.volkswagen.com/is/image/';

export function resolveImage(imageNode) {
  if (!imageNode) return null;

  const scene7File = imageNode.scene7File || imageNode.image?.scene7File;
  const damSrc = imageNode.damSrc || imageNode.image?.damSrc;
  const altText = imageNode.altText || imageNode.image?.altText || '';

  let src = '';
  if (scene7File) {
    src = `${SCENE7_BASE}${scene7File}`;
  } else if (damSrc) {
    src = `https://www.volkswagen.de${damSrc}`;
  }

  if (!src) return null;

  return { src, alt: altText };
}

/**
 * Builds an <img> tag string from a Scene7 image node.
 */
export function imageTag(imageNode) {
  const resolved = resolveImage(imageNode);
  if (!resolved) return '';
  const alt = resolved.alt.replace(/"/g, '&quot;');
  return `<img src="${resolved.src}" alt="${alt}">`;
}

/**
 * Builds a <picture><img></picture> tag string.
 */
export function pictureTag(imageNode) {
  const resolved = resolveImage(imageNode);
  if (!resolved) return '';
  const alt = resolved.alt.replace(/"/g, '&quot;');
  return `<picture><img src="${resolved.src}" alt="${alt}"></picture>`;
}
