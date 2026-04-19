/**
 * Hero Stage Block (hero-stage)
 *
 * Renders a full-width hero banner with a stage image and a text bar containing
 * a heading and call-to-action buttons. Used on 34 pages across the VW.de site
 * (homepage, emobility hub/detail pages, model pages, etc.).
 *
 * This is a CSS-only block — all visual decoration is handled in hero-stage.css.
 * The JavaScript decorator is a no-op; no DOM manipulation is needed because the
 * authored content structure maps directly to the required markup.
 *
 * Content model (authored in Universal Editor):
 *   Row 1: Image — a <picture> element wrapped with a <!-- field:image --> xwalk hint.
 *   Row 2: Text  — heading (h1/h2, font-weight 200, <b> for bold parts) + primary/secondary
 *          CTA links, wrapped with a <!-- field:text --> xwalk hint.
 *
 * The xwalk field hints (<!-- field:image -->, <!-- field:text -->) enable inline editing
 * in the AEM Universal Editor. They are preserved as HTML comments in the authored content
 * and do not affect front-end rendering.
 *
 * @see hero-stage.css for all layout and styling rules
 * @see _hero-stage.json for the Universal Editor component model definition
 */
export default function decorate() {
  // no-op — decoration handled entirely by CSS
}
