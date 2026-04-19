/**
 * Scene7 Image URL Resolver
 *
 * Resolves VW AEM image references to production CDN URLs.
 * VW uses Adobe Scene7 (Dynamic Media) for image delivery.
 *
 * Image sources in .model.json:
 * - scene7File: "volkswagenag/vw-image-name" → https://assets.volkswagen.com/is/image/volkswagenag/vw-image-name
 * - damSrc: "/content/dam/..." → https://www.volkswagen.de/content/dam/...
 *
 * OUT OF SCOPE: The SCENE7_BASE URL is hardcoded to VW's CDN. In a multi-tenant
 * setup, this should be configurable per site.
 */

// VW's Scene7 Dynamic Media CDN base URL
const SCENE7_BASE = 'https://assets.volkswagen.com/is/image/';

/**
 * Resolves an image node from .model.json to a CDN URL.
 * Tries scene7File first (preferred, goes to assets.volkswagen.com CDN),
 * then falls back to damSrc (direct AEM DAM path on volkswagen.de).
 * Image nodes may have the fields at the top level or nested under .image.
 */
export function resolveImage(imageNode) {
  if (!imageNode) return null;

  // Try both top-level and nested .image paths (VW components vary in structure)
  const scene7File = imageNode.scene7File || imageNode.image?.scene7File;
  const damSrc = imageNode.damSrc || imageNode.image?.damSrc;
  const altText = imageNode.altText || imageNode.image?.altText || '';

  let src = '';
  if (scene7File) {
    // Scene7 Dynamic Media: "volkswagenag/image-name" → full CDN URL
    src = `${SCENE7_BASE}${scene7File}`;
  } else if (damSrc) {
    // DAM fallback: absolute AEM path → prepend volkswagen.de origin
    src = `https://www.volkswagen.de${damSrc}`;
  }

  if (!src) return null;

  return { src, alt: altText };
}

/**
 * Builds a bare <img> tag string from a Scene7 image node.
 * Used for contexts where a <picture> wrapper is not needed.
 */
export function imageTag(imageNode) {
  const resolved = resolveImage(imageNode);
  if (!resolved) return '';
  const alt = resolved.alt.replace(/"/g, '&quot;');
  return `<img src="${resolved.src}" alt="${alt}">`;
}

/**
 * Builds a <picture><img></picture> tag string.
 * EDS expects images wrapped in <picture> tags for proper responsive image handling.
 * The <picture> wrapper is required for EDS block content — bare <img> tags may not
 * be processed correctly by the EDS image optimization pipeline.
 */
export function pictureTag(imageNode) {
  const resolved = resolveImage(imageNode);
  if (!resolved) return '';
  const alt = resolved.alt.replace(/"/g, '&quot;');
  return `<picture><img src="${resolved.src}" alt="${alt}"></picture>`;
}
