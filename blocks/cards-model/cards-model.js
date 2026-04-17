import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

const STATIC_MODELS = [
  {
    name: 'Der Tiguan', price: 'Ab 39.175,00 \u20ac inkl. MwSt.', img: '/icons/models/tiguan.webp', link: '/de/modelle/tiguan.html',
  },
  {
    name: 'Der Golf', price: 'Ab 29.395,00 \u20ac inkl. MwSt.', img: '/icons/models/golf.webp', link: '/de/modelle/golf.html',
  },
  {
    name: 'Der ID.3', price: 'Ab 33.330,00 \u20ac inkl. MwSt.', img: '/icons/models/id3.webp', link: '/de/modelle/id3.html', badge: 'Lagerfahrzeuge',
  },
  {
    name: 'Der ID.4', price: 'Ab 40.580,00 \u20ac inkl. MwSt.', img: '/icons/models/id4.webp', link: '/de/modelle/id4.html', badge: 'Abzgl. ID. Kaufpr\u00e4mie',
  },
  {
    name: 'Der neue T\u2011Roc', price: 'Ab 30.845,00 \u20ac inkl. MwSt.', img: '/icons/models/troc.webp', link: '/de/modelle/t-roc.html', badge: 'Neu',
  },
];

function createNavButton(direction) {
  const btn = document.createElement('button');
  btn.className = `cards-model-nav cards-model-nav-${direction}`;
  btn.setAttribute('aria-label', direction === 'prev' ? 'Previous' : 'Next');
  btn.innerHTML = direction === 'prev' ? '&#8249;' : '&#8250;';
  return btn;
}

export default function decorate(block) {
  // If block has no authored rows, inject static model cards
  const hasContent = [...block.children].some((row) => row.querySelector('picture, img, h1, h2, h3'));

  if (!hasContent) {
    block.replaceChildren();
    STATIC_MODELS.forEach((model) => {
      const row = document.createElement('div');
      const imgCol = document.createElement('div');
      imgCol.innerHTML = `<picture><img src="${model.img}" alt="${model.name}" loading="lazy" width="600" height="300"></picture>`;
      const textCol = document.createElement('div');
      let html = `<h3>${model.name}</h3><p>${model.price}</p>`;
      if (model.badge) {
        html += `<div class="cards-model-badge">${model.badge}</div>`;
      }
      html += `<p class="button-container"><a href="${model.link}" title="Konfigurieren" class="button">Konfigurieren</a></p>`;
      textCol.innerHTML = html;
      row.append(imgCol, textCol);
      block.append(row);
    });
  }

  // Standard decoration: wrap rows in ul/li
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && (div.querySelector('picture') || div.querySelector('img'))) {
        div.className = 'cards-model-card-image';
      } else {
        div.className = 'cards-model-card-body';
      }
    });
    ul.append(li);
  });

  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });

  // Grid variant (via section style): no carousel navigation needed
  if (block.closest('.section')?.classList.contains('grid')) {
    // Detect badge text, wrap in styled badge element with color variant
    const badgeColors = {
      Neu: 'badge-neu',
      Lagerfahrzeuge: 'badge-stock',
      'Abzgl. ID. Kaufprämie': 'badge-subsidy',
      'Bald erhältlich': 'badge-coming',
    };
    ul.querySelectorAll('.cards-model-card-body p').forEach((p) => {
      const text = p.textContent.trim();
      if (!p.classList.contains('button-container') && badgeColors[text]) {
        const badge = document.createElement('div');
        badge.className = `cards-model-badge ${badgeColors[text]}`;
        badge.textContent = text;
        p.replaceWith(badge);
      }
    });

    // Promo tile: detect "Bald erhältlich" badge and transform into promo card
    ul.querySelectorAll('li').forEach((li) => {
      const badge = li.querySelector('.badge-coming');
      if (!badge) return;
      li.classList.add('cards-model-promo');

      // Move image to CSS background
      const img = li.querySelector('.cards-model-card-image img');
      if (img) {
        li.style.backgroundImage = `url(${img.src})`;
        li.querySelector('.cards-model-card-image').remove();
      }
    });

    block.replaceChildren(ul);
    return;
  }

  // Navigation (carousel only)
  const nav = document.createElement('div');
  nav.className = 'cards-model-navigation';
  const prevBtn = createNavButton('prev');
  const nextBtn = createNavButton('next');
  nav.append(prevBtn, nextBtn);

  prevBtn.addEventListener('click', () => {
    ul.scrollBy({ left: -ul.offsetWidth * 0.7, behavior: 'smooth' });
  });
  nextBtn.addEventListener('click', () => {
    ul.scrollBy({ left: ul.offsetWidth * 0.7, behavior: 'smooth' });
  });

  block.replaceChildren(ul, nav);
}
