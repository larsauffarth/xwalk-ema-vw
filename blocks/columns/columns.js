export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  // Detect teaser pattern: single row with an image-only column and a text column
  const rows = [...block.children];
  const isSingleRow = rows.length === 1;

  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const hasOnlyPicture = col.childElementCount === 1
        && (col.querySelector('picture') || col.querySelector('img'));

      if (hasOnlyPicture) {
        col.classList.add('columns-img-col');

        // Removed column-order detection (pipeline reorders columns)
      }
    });
  });

  // Mark as teaser when it's a single-row image+text layout
  if (isSingleRow && block.querySelector('.columns-img-col')) {
    block.classList.add('teaser');
  }

  // Check for config rows (key-value pairs like "layout | image-right")
  [...block.children].forEach((row) => {
    const cells = [...row.children];
    if (cells.length === 2) {
      const key = cells[0].textContent?.trim().toLowerCase();
      const value = cells[1].textContent?.trim().toLowerCase();
      if (key === 'layout' && value === 'image-right') {
        block.classList.add('image-right');
        row.remove();
      }
    }
  });
}
