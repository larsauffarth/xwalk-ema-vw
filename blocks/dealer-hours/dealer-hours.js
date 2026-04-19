/**
 * Dealer Hours Block (dealer-hours)
 *
 * Renders dealer opening hours as a responsive table with department name,
 * weekday hours, and Saturday hours. Used on dealer template pages.
 *
 * Content model (authored in Universal Editor):
 *   Row 0 (header): Column labels (e.g., "Abteilung", "Mo-Fr", "Sa")
 *   Row 1..N (data): Department name, weekday hours, Saturday hours
 *
 * Decoration:
 *   - The first row is tagged as the header row (.dealer-hours-header)
 *   - Subsequent rows get data-label attributes on each cell, matching the
 *     corresponding header label. This enables responsive CSS to show labels
 *     inline on mobile (via CSS `content: attr(data-label)` patterns).
 */
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
        // OUT OF SCOPE: Hardcoded German fallback labels ('Abteilung', 'Mo-Fr', 'Sa').
        // Should use i18n placeholders.
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
