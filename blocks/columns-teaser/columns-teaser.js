/**
 * Columns Teaser Block (columns-teaser)
 *
 * VW focus teaser and text-only teaser block. Renders content as side-by-side columns
 * with support for both image+text layouts (focusTeaserSection) and multi-column
 * text card layouts (textOnlyTeaserSection). Used on 17 pages across the site.
 *
 * Layout variants:
 *   - Focus teaser: image column (58%) + text column (42%), with optional `hasImageRight` flag
 *   - Text-only teaser: equal-width columns of text cards (via xfTextOnlyTeaser children)
 *
 * Content model (authored in Universal Editor):
 *   Each row contains N columns. Columns that contain only a <picture>/<img> are tagged
 *   as image columns (.columns-teaser-img-col) for CSS targeting (e.g., object-fit, padding).
 *
 * @see columns-teaser.css for column widths, responsive breakpoints, and image styling
 * @see _columns-teaser.json for the Universal Editor component model definition
 */
export default function decorate(block) {
  // Detect column count from the first row and add a CSS class (e.g., columns-teaser-2-cols).
  // This allows CSS to apply different layouts based on the number of columns.
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-teaser-${cols.length}-cols`);

  // Iterate all rows and mark columns that contain only an image (no text siblings).
  // These get the .columns-teaser-img-col class so CSS can apply image-specific styling
  // (object-fit: cover, aspect ratio, etc.) without affecting text columns.
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const hasOnlyPicture = col.childElementCount === 1
        && (col.querySelector('picture') || col.querySelector('img'));
      if (hasOnlyPicture) {
        col.classList.add('columns-teaser-img-col');
      }
    });
  });
}
