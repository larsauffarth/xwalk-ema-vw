/**
 * Carousel Featured Block (carousel-featured)
 *
 * Displays a set of content slides as a grid on desktop (>=960px) and a
 * horizontally-scrollable carousel on mobile. Used on 8 pages — primarily for
 * USP sections (uspSection) and expand/collapse sections (expandCollapseSection).
 *
 * Content model (authored in Universal Editor):
 *   Each child div of the block is one slide. Each slide contains:
 *     - An image column (detected by presence of <picture>/<img>) — becomes .carousel-featured-slide-image
 *     - A text column (all other content) — becomes .carousel-featured-slide-text
 *   Optional <p>/<small> siblings to the picture are extracted as disclaimer overlays.
 *
 * Decoration flow:
 *   1. Wrap authored rows into a scrollable track (.carousel-featured-track)
 *   2. Build prev/next navigation buttons and dot indicators
 *   3. Add expand/collapse toggles for slides with overflowing text
 *   4. Inject hardcoded legal disclaimers (matched by section heading — see OUT OF SCOPE note)
 *
 * @see carousel-featured.css for grid/carousel layout and responsive breakpoints
 * @see _carousel-featured.json for the Universal Editor component model definition
 */
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Creates a navigation button (prev or next) for the carousel.
 * @param {'prev'|'next'} direction - Which direction the button navigates
 * @returns {HTMLButtonElement} The styled navigation button
 */
function createNavButton(direction) {
  const btn = document.createElement('button');
  btn.className = `carousel-featured-nav carousel-featured-nav-${direction}`;
  btn.setAttribute('aria-label', direction === 'prev' ? 'Previous slide' : 'Next slide');
  btn.innerHTML = direction === 'prev' ? '&#8249;' : '&#8250;';
  return btn;
}

/**
 * Updates dot indicator active states to reflect the currently visible slide.
 * @param {HTMLElement[]} dots - Array of dot button elements
 * @param {number} activeIndex - Index of the currently active slide
 */
function updateDots(dots, activeIndex) {
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === activeIndex);
  });
}

export default function decorate(block) {
  const slides = [...block.children];
  if (!slides.length) return;

  const track = document.createElement('div');
  track.className = 'carousel-featured-track';

  slides.forEach((slide) => {
    const item = document.createElement('div');
    item.className = 'carousel-featured-slide';
    moveInstrumentation(slide, item);

    while (slide.firstElementChild) {
      const child = slide.firstElementChild;
      if (child.querySelector('picture') || child.querySelector('img')) {
        child.className = 'carousel-featured-slide-image';
        // Extract disclaimer text (any <p> siblings to the picture)
        const disclaimer = child.querySelector('p, small');
        if (disclaimer) {
          const overlay = document.createElement('div');
          overlay.className = 'carousel-featured-disclaimer';
          overlay.textContent = disclaimer.textContent;
          disclaimer.remove();
          child.append(overlay);
        }
      } else {
        child.className = 'carousel-featured-slide-text';
      }
      item.append(child);
    }
    track.append(item);
  });

  // Navigation
  const nav = document.createElement('div');
  nav.className = 'carousel-featured-navigation';

  const prevBtn = createNavButton('prev');
  const nextBtn = createNavButton('next');

  // Dots
  const dotsContainer = document.createElement('div');
  dotsContainer.className = 'carousel-featured-dots';
  const dots = slides.map((_, i) => {
    const dot = document.createElement('button');
    dot.className = `carousel-featured-dot${i === 0 ? ' active' : ''}`;
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    dot.addEventListener('click', () => {
      track.children[i].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    });
    dotsContainer.append(dot);
    return dot;
  });

  nav.append(prevBtn, dotsContainer, nextBtn);

  prevBtn.addEventListener('click', () => {
    track.scrollBy({ left: -track.offsetWidth, behavior: 'smooth' });
  });
  nextBtn.addEventListener('click', () => {
    track.scrollBy({ left: track.offsetWidth, behavior: 'smooth' });
  });

  // Update dots on scroll
  track.addEventListener('scroll', () => {
    const index = Math.round(track.scrollLeft / track.offsetWidth);
    updateDots(dots, index);
  });

  block.replaceChildren(track, nav);

  // Add text expand/collapse toggles for slides where text content exceeds
  // the CSS max-height. This gives users a way to reveal truncated content.
  const addExpandCollapse = () => {
    track.querySelectorAll('.carousel-featured-slide').forEach((slide) => {
      const textEl = slide.querySelector('.carousel-featured-slide-text');
      if (!textEl) return;
      // Check if text content overflows the max-height
      if (textEl.scrollHeight > textEl.clientHeight + 1) {
        const btn = document.createElement('button');
        btn.className = 'carousel-featured-expand';
        // OUT OF SCOPE: German aria-labels should be externalized for i18n.
        btn.setAttribute('aria-label', 'Mehr anzeigen');
        btn.innerHTML = '&#8250;'; // chevron
        btn.addEventListener('click', () => {
          const expanded = slide.classList.toggle('expanded');
          btn.setAttribute('aria-label', expanded ? 'Weniger anzeigen' : 'Mehr anzeigen');
        });
        slide.append(btn);
      }
    });
  };
  // Run after layout settles
  requestAnimationFrame(() => requestAnimationFrame(addExpandCollapse));

  // OUT OF SCOPE: Hardcoded VW legal disclaimers. In production, these should be authored
  // as content in the CMS or fetched from a legal/compliance API. Currently matched by
  // German heading text which is fragile and non-localizable.
  //
  // The disclaimers are matched to specific sections by looking at the nearest <h2> text
  // in the section's default content. Each disclaimer is overlaid on the corresponding
  // slide's image area with a close button.
  const sectionHeading = block.closest('.section')?.querySelector('.default-content-wrapper h2');
  const headingText = sectionHeading?.textContent || '';

  let disclaimers = [];
  if (headingText.includes('Volkswagen erleben')) {
    disclaimers = [
      'Seriennahe Studie. Fahrzeug wird noch nicht zum Verkauf angeboten.',
      'Der ID.3 kann nicht mehr mit einer individuellen Ausstattung bestellt werden. Sprechen Sie Ihren Volkswagen Partner an oder finden Sie verfügbare Fahrzeuge online in der Autosuche.',
      'T\u2011Roc R\u2011Line eTSI: Energieverbrauch kombiniert: 6,0\u20115,6\u00a0l/100km; CO\u2082\u2011Emission kombiniert: 136\u2011128\u00a0g/km; CO\u2082\u2011Klasse(n): E\u2011D.',
    ];
  } else if (headingText.includes('Modell-Highlights')) {
    disclaimers = [
      'T\u2011Roc R\u2011Line eTSI: Energieverbrauch kombiniert: 6,0\u20115,6\u00a0l/100km; CO\u2082\u2011Emission kombiniert: 136\u2011128\u00a0g/km; CO\u2082\u2011Klasse(n): E\u2011D.\nT\u2011Roc Style: Energieverbrauch kombiniert: 6,0\u20115,6\u00a0l/100\u00a0km; CO\u2082\u2011Emissionen kombiniert: 137\u2011128\u00a0g/km; CO\u2082\u2011Klasse: E\u2011D.',
      'Seriennahe Studie. Fahrzeug wird noch nicht zum Verkauf angeboten. Die Camouflage\u2011Folierung des ID.\u00a0Cross wird weder als Serien\u2011 noch Sonderausstattung zum Verkauf angeboten werden.',
      'Seriennahe Studie. Fahrzeug wird noch nicht zum Verkauf angeboten.',
    ];
  }

  if (disclaimers.length) {
    track.querySelectorAll('.carousel-featured-slide').forEach((slide, i) => {
      if (disclaimers[i]) {
        const imgDiv = slide.querySelector('.carousel-featured-slide-image');
        if (imgDiv && !imgDiv.querySelector('.carousel-featured-disclaimer')) {
          const overlay = document.createElement('div');
          overlay.className = 'carousel-featured-disclaimer';
          const text = document.createElement('span');
          text.textContent = disclaimers[i];
          const closeBtn = document.createElement('button');
          closeBtn.className = 'carousel-featured-disclaimer-close';
          closeBtn.setAttribute('aria-label', 'Hinweis schließen');
          closeBtn.textContent = '×';
          closeBtn.addEventListener('click', () => overlay.remove());
          overlay.append(text, closeBtn);
          imgDiv.append(overlay);
        }
      }
    });
  }
}
