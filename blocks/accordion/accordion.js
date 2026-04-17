export default function decorate(block) {
  const rows = [...block.children];
  block.textContent = '';

  rows.forEach((row) => {
    const cells = [...row.children];
    const label = cells[0]?.textContent?.trim() || '';
    const body = cells[1]?.innerHTML || '';

    if (!label && !body) return;

    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.textContent = label;
    details.append(summary);

    const content = document.createElement('div');
    content.className = 'accordion-content';
    content.innerHTML = body;
    details.append(content);

    block.append(details);
  });
}
