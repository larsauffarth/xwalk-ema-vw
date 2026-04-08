/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: volkswagen.de cleanup.
 * Selectors from captured DOM of https://www.volkswagen.de/de.html
 */
const H = { before: 'beforeTransform', after: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === H.before) {
    // Remove cookie consent dialogs and overlays (captured: #cookiemgmt, #ensWrapper)
    WebImporter.DOMUtils.remove(element, [
      '#cookiemgmt',
      '#ensWrapper',
      '[id*="onetrust"]',
      '[class*="cookie"]',
    ]);

    // Remove skip navigation links (captured: .StyledSkipWrapper-sc-118cjlx)
    WebImporter.DOMUtils.remove(element, [
      '[class*="StyledSkipWrapper"]',
    ]);

    // Remove empty layer wrappers (captured: .StyledLayerWrapper-sc-1bl8kxv)
    WebImporter.DOMUtils.remove(element, [
      '[class*="StyledLayerWrapper"]',
    ]);
  }

  if (hookName === H.after) {
    // Remove header/nav (captured: header.sc-djTQaJ, nav.SSRNavigation__StyledNav)
    WebImporter.DOMUtils.remove(element, [
      'header',
      'nav[class*="SSRNavigation"]',
      '[class*="TopBar__"]',
    ]);

    // Remove footer (captured: footer.footer__StyledFooter)
    WebImporter.DOMUtils.remove(element, [
      'footer',
    ]);

    // Remove disclaimer/reference badges and overlays
    WebImporter.DOMUtils.remove(element, [
      '[class*="StyledReferenceBadge"]',
      '[class*="ImageDisclaimerReferences"]',
      '[class*="OverlayDisclaimerContainers__StyledOverlay"]',
      '[class*="StyledSup"]',
      'sup',
    ]);

    // Remove iframes, noscript, link elements
    WebImporter.DOMUtils.remove(element, [
      'iframe',
      'noscript',
      'link',
    ]);

    // Clean tracking attributes
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('data-track');
      el.removeAttribute('data-testid');
      el.removeAttribute('onclick');
    });
  }
}
