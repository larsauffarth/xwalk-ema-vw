export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-teaser-${cols.length}-cols`);

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
