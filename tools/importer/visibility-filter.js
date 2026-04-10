/**
 * Visibility filter for AEM .model.json components.
 * Returns: true (visible), false (skip), or 'recurse' (structural wrapper, process children only).
 */
export function isVisible(component) {
  if (!component || typeof component !== 'object') return false;

  // Rule 1: Explicit empty flag
  if (component.empty === true) return false;

  // Rule 2: No children in a container
  const items = component[':items'];
  const order = component[':itemsOrder'];
  if (items && typeof items === 'object' && Object.keys(items).length === 0) return false;
  if (Array.isArray(order) && order.length === 0 && items) return false;

  // Rule 3: Section with no valid elements
  if (typeof component.numberOfValidElements === 'number' && component.numberOfValidElements === 0) return false;

  // Rule 4: Structural-only types — recurse into children
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

  // Rule 5: Empty richtext
  if (Array.isArray(component.richtext) && component.richtext.length === 0) return false;

  // Rule 6: Empty media
  if (component.emptyMedia === true) return false;
  if (shortType === 'editorial/elements/imageElement') {
    const img = component.image || component;
    if (!img.scene7File && !img.damSrc) return false;
  }

  // Rule 7: Empty link
  if (shortType === 'editorial/elements/linkElement' && !component.linkUrl) return false;

  // Rule 8: Skip non-content structural types
  if (shortType === 'structure/pageMetaDataModel'
    || shortType === 'structure/languageSwitcher') return false;

  // Rule 9: Skip interactive-only elements (no static content)
  if (shortType === 'editorial/elements/mediaInteractionElement') return false;

  return true;
}

/** Returns the short type name (without the vwa-ngw18/components/ prefix). */
export function shortType(component) {
  return (component?.[':type'] || '').replace('vwa-ngw18/components/', '');
}
