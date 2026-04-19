/**
 * Hero Dealer Block (hero-dealer)
 *
 * Dealer page hero with a stage image and a contact information panel overlay.
 * Used on dealer template pages (e.g., /de/haendler-werkstatt/<dealer-name>.html).
 *
 * Content model (authored in Universal Editor):
 *   Row 1: Stage image — a <picture> element for the dealer/location hero image.
 *   Row 2: Dealer info — contains dealer name (h1), address lines, phone, and email.
 *
 * Decoration flow:
 *   1. Extracts the image from Row 1 into a .hero-dealer-image container
 *   2. Builds an info panel (.hero-dealer-info) from Row 2 content
 *   3. Prepends a hardcoded German overline "Verkauf und Service" if not already present
 */
export default function decorate(block) {
  const rows = [...block.children];
  if (rows.length < 2) return;

  // Row 1: stage image
  const imageRow = rows[0];
  const picture = imageRow.querySelector('picture');

  // Row 2: dealer info (overline, h1, address lines, phone, email)
  const infoRow = rows[1];
  const infoContent = infoRow.querySelector('div');

  // Clear block and rebuild
  block.textContent = '';

  // Image container
  const imageContainer = document.createElement('div');
  imageContainer.className = 'hero-dealer-image';
  if (picture) {
    imageContainer.append(picture);
  }
  block.append(imageContainer);

  // Info panel
  const infoBar = document.createElement('div');
  infoBar.className = 'hero-dealer-info';

  const infoInner = document.createElement('div');
  infoInner.className = 'hero-dealer-info-inner';

  if (infoContent) {
    // OUT OF SCOPE: Hardcoded German overline text 'Verkauf und Service'. Should be
    // configurable via block properties or i18n.
    // Add overline if not already present in the authored content
    const firstChild = infoContent.firstElementChild;
    const hasOverline = firstChild?.classList?.contains('hero-dealer-overline');
    if (!hasOverline) {
      const overline = document.createElement('p');
      overline.className = 'hero-dealer-overline';
      overline.textContent = 'Verkauf und Service';
      infoInner.append(overline);
    }

    // Move all children from the original info div
    while (infoContent.firstChild) {
      infoInner.append(infoContent.firstChild);
    }
  }

  infoBar.append(infoInner);
  block.append(infoBar);
}
