import { moveInstrumentation } from '../../scripts/scripts.js';

function createNavButton(direction) {
  const btn = document.createElement('button');
  btn.className = `carousel-featured-nav carousel-featured-nav-${direction}`;
  btn.setAttribute('aria-label', direction === 'prev' ? 'Previous slide' : 'Next slide');
  btn.innerHTML = direction === 'prev' ? '&#8249;' : '&#8250;';
  return btn;
}

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
}
