/* eslint-disable */
/* global WebImporter */

/**
 * Import Transformer: VW DOM Cleanup
 *
 * Runs during Playwright-based import (not JSON import) to strip non-content
 * elements from the captured VW SPA DOM:
 *
 * beforeTransform phase:
 * - Cookie consent dialogs (#cookiemgmt, #ensWrapper, OneTrust)
 * - Skip navigation links
 * - Empty layer wrappers (SPA overlay containers)
 *
 * afterTransform phase:
 * - Header/navigation (captured but not needed — EDS has its own header)
 * - Footer (same reason)
 * - Disclaimer badges and legal overlays
 * - Iframes, noscript, link elements
 * - Tracking attributes (data-track, data-testid, onclick)
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
