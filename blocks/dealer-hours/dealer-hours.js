export default function decorate(block) {
  const rows = [...block.children];
  const labels = [];

  rows.forEach((row, index) => {
    if (index === 0) {
      row.classList.add('dealer-hours-header');
      [...row.children].forEach((cell) => {
        cell.classList.add('dealer-hours-cell');
        labels.push(cell.textContent.trim());
      });
    } else {
      row.classList.add('dealer-hours-row');
      [...row.children].forEach((cell, cellIndex) => {
        cell.classList.add('dealer-hours-cell');
        if (cellIndex === 0) {
          cell.dataset.label = labels[0] || 'Abteilung';
        } else if (cellIndex === 1) {
          cell.dataset.label = labels[1] || 'Mo-Fr';
        } else if (cellIndex === 2) {
          cell.dataset.label = labels[2] || 'Sa';
        }
      });
    }
  });
}
