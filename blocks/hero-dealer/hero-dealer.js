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
    // Add overline "Verkauf und Service" if not already present
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
