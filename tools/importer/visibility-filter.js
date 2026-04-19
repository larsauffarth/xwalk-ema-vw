/**
 * Visibility filter for AEM .model.json components.
 * Returns: true (visible), false (skip), or 'recurse' (structural wrapper, process children only).
 */
export function isVisible(component) {
  if (!component || typeof component !== 'object') return false;

  // Rule 1: Explicit empty flag — AEM marks components with empty=true when
  // they have no authored content. Common on placeholder components.
  if (component.empty === true) return false;

  // Rule 2: Empty container — has an :items object but it contains no children.
  // Catches parsys containers that were never populated with content.
  const items = component[':items'];
  const order = component[':itemsOrder'];
  if (items && typeof items === 'object' && Object.keys(items).length === 0) return false;
  if (Array.isArray(order) && order.length === 0 && items) return false;

  // Rule 3: Section with no valid elements — AEM tracks this count for sections
  // that contain only empty/invalid children. Avoids rendering empty section wrappers.
  if (typeof component.numberOfValidElements === 'number' && component.numberOfValidElements === 0) return false;

  // Rule 4: Structural-only types — these are transparent wrappers (parsys, pagemain, etc.)
  // that don't render content themselves. Return 'recurse' to process their children.
  // Includes VW-specific structural types like expandCollapseSectionParsys and xfTextOnlyTeaser.
  const type = component[':type'] || '';
  const shortType = type.replace('vwa-ngw18/components/', '');
  if (shortType.startsWith('structure/parsys')
    || shortType === 'structure/pagemain'
    || shortType === 'structure/pageroot'
    || shortType.startsWith('structure/pages/')
    || shortType === 'structure/sectionGroup'
    || shortType === 'structure/expandCollapseSectionParsys'
    || shortType === 'structure/singleColumnSectionParsys'
    || shortType === 'structure/xfTextOnlyTeaser'
    || shortType === 'structure/xfContentSlider') {
    return 'recurse';
  }

  // Rule 5: Empty richtext — component has a richtext array but it's empty (no text nodes).
  // Prevents rendering empty paragraphs or headings.
  if (Array.isArray(component.richtext) && component.richtext.length === 0) return false;

  // Rule 6: Empty media — image components without an actual image reference.
  // Checks both the emptyMedia flag and the absence of Scene7/DAM source URLs.
  if (component.emptyMedia === true) return false;
  if (shortType === 'editorial/elements/imageElement') {
    const img = component.image || component;
    if (!img.scene7File && !img.damSrc) return false;
  }

  // Rule 7: Empty link — link elements without a URL are not renderable.
  if (shortType === 'editorial/elements/linkElement' && !component.linkUrl) return false;

  // Rule 8: Non-content structural types — metadata models and language switchers
  // are page-level infrastructure, not visible content.
  if (shortType === 'structure/pageMetaDataModel'
    || shortType === 'structure/languageSwitcher') return false;

  // Rule 9: Interactive-only elements — mediaInteractionElement provides JS-driven
  // image interactions (zoom, 360-view) with no static content to import.
  if (shortType === 'editorial/elements/mediaInteractionElement') return false;

  return true;
}

/**
 * Returns the short type name (without the vwa-ngw18/components/ prefix).
 * VW AEM components use fully qualified type paths like
 * 'vwa-ngw18/components/editorial/sections/basicStageSection'.
 * This strips the VW-specific prefix to yield 'editorial/sections/basicStageSection'.
 */
export function shortType(component) {
  return (component?.[':type'] || '').replace('vwa-ngw18/components/', '');
}
