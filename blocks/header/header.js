import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

const isDesktop = window.matchMedia('(min-width: 900px)');

const SECTION_ROOTS = {
  'Modelle und Konfigurator': '/de/modelle',
  'Angebote und Produkte': '/de/angebote-und-produkte',
  Elektromobilitaet: '/de/elektromobilitaet',
  Elektromobilität: '/de/elektromobilitaet',
  'Konnektivität und Mobilitätsdienste': '/de/konnektivitaet-und-mobilitaetsdienste',
  'Marke und Erlebnis': '/de/marke-und-erlebnis',
  'Besitzer und Service': '/de/besitzer-und-service',
};

const TOP_LINKS = [
  { label: 'Händlersuche', href: '/de/haendler-werkstatt' },
  { label: 'Probefahrt', href: '/de/formulare/probefahrtanfrage' },
  {
    label: 'Schnell verfügbare Neu- und Gebrauchtwagen',
    href: '/de/modelle/verfuegbare-fahrzeuge',
  },
  { label: 'Leasing', href: '/de/angebote-und-produkte/leasing' },
  { label: 'Aktuelle Angebote', href: '/de/angebote-und-produkte/aktuelle-angebote' },
];

const LEGAL_LINKS = [
  { label: 'Impressum', href: '/de/mehr/impressum' },
  { label: 'Nutzungsbedingungen', href: '/de/mehr/rechtliches/nutzungsbedingungen' },
  { label: 'Datenschutzerklärungen', href: '/de/mehr/rechtliches/datenschutzerklaerungen' },
  { label: 'Cookie-Richtlinie', href: '/de/mehr/rechtliches/cookie-richtlinie' },
  { label: 'Lizenzhinweise Dritter', href: '/de/mehr/rechtliches/lizenzhinweise-dritter' },
  { label: 'Angaben zum Digital Services Act (DSA)', href: '/de/mehr/rechtliches/digital-service-act' },
  { label: 'EU Data Act', href: '/de/mehr/rechtliches/eu-data-act' },
  { label: 'Produktsicherheitsinformationen', href: '/de/mehr/rechtliches/produktsicherheitsinformationen' },
];

const ICONS = {
  logo: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="10.15" fill="none" stroke="currentColor" stroke-width="1.7"/>
      <path d="M7.1 6.35 9.72 14.6 12 9.9l2.28 4.7 2.62-8.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/>
      <path d="M7.45 16.15 10.18 12.9H13.82l2.73 3.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6"/>
    </svg>
  `,
  menu: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M4 7.25h16M4 12h16M4 16.75h16" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>
    </svg>
  `,
  close: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M5.5 5.5 18.5 18.5M18.5 5.5 5.5 18.5" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.8"/>
    </svg>
  `,
  dealer: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M12 20.25c-3.95-4.92-5.92-8.12-5.92-10.68a5.92 5.92 0 1 1 11.84 0c0 2.56-1.97 5.76-5.92 10.68Z" fill="none" stroke="currentColor" stroke-linejoin="round" stroke-width="1.7"/>
      <circle cx="12" cy="9.6" r="2.3" fill="none" stroke="currentColor" stroke-width="1.7"/>
    </svg>
  `,
  search: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="10.5" cy="10.5" r="5.75" fill="none" stroke="currentColor" stroke-width="1.7"/>
      <path d="M14.85 14.85 19.25 19.25" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7"/>
    </svg>
  `,
  account: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8.1" r="3.55" fill="none" stroke="currentColor" stroke-width="1.7"/>
      <path d="M5.4 19.25a6.7 6.7 0 0 1 13.2 0" fill="none" stroke="currentColor" stroke-linecap="round" stroke-width="1.7"/>
    </svg>
  `,
  chevron: `
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="m9 6 6 6-6 6" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8"/>
    </svg>
  `,
};

function ensureLandmarks() {
  const main = document.querySelector('main');
  const footer = document.querySelector('footer');

  if (main && !main.id) main.id = 'main';
  if (footer && !footer.id) footer.id = 'footer';
}

function normalizeHref(href) {
  if (!href) return '#';
  return href.endsWith('.html') ? href.replace(/\.html$/, '') : href;
}

function getTextContent(el) {
  return el?.textContent?.replace(/\s+/g, ' ').trim() || '';
}

function getSectionHref(title, firstHref) {
  return normalizeHref(SECTION_ROOTS[title] || firstHref || '#');
}

function getToolKind(label) {
  const normalized = label.toLowerCase();
  if (normalized.includes('händler')) return 'dealer';
  if (normalized.includes('suche')) return 'search';
  if (normalized.includes('konto') || normalized.includes('anmelden')) return 'account';
  return 'link';
}

function extractNavData(fragment) {
  const brandSection = fragment.querySelector(':scope > div:nth-child(1)');
  const sectionSection = fragment.querySelector(':scope > div:nth-child(2)');
  const toolsSection = fragment.querySelector(':scope > div:nth-child(3)');

  const brandLink = brandSection?.querySelector('a');
  const quickLinks = [...(brandSection?.querySelectorAll('ul a') || [])].map((link) => ({
    label: getTextContent(link),
    href: normalizeHref(link.getAttribute('href')),
  }));

  const sections = [...(sectionSection?.querySelectorAll('.default-content-wrapper > ul > li') || [])].map((item, index) => {
    const title = getTextContent(item.querySelector(':scope > p, :scope > strong, :scope > a'));
    const links = [...item.querySelectorAll(':scope > ul > li > a')].map((link) => ({
      label: getTextContent(link),
      href: normalizeHref(link.getAttribute('href')),
    }));

    return {
      id: `nav-section-${index}`,
      title,
      href: getSectionHref(title, links[0]?.href),
      links,
    };
  });

  const tools = [...(toolsSection?.querySelectorAll('a') || [])].map((link) => {
    const label = getTextContent(link);
    return {
      label,
      href: normalizeHref(link.getAttribute('href')),
      kind: getToolKind(label),
    };
  });

  return {
    brand: {
      label: brandLink?.getAttribute('title') || getTextContent(brandLink) || 'Volkswagen',
      href: normalizeHref(brandLink?.getAttribute('href') || '/de'),
    },
    quickLinks,
    sections,
    tools,
  };
}

function createSkipLinks() {
  const wrapper = document.createElement('div');
  wrapper.className = 'nav-skip-links';
  wrapper.innerHTML = `
    <a class="nav-skip-link" href="#main">Zum Hauptinhalt springen</a>
    <a class="nav-skip-link" href="#footer">Zum Footer springen</a>
  `;
  return wrapper;
}

function createToolLink(tool) {
  const item = document.createElement('li');
  item.className = `nav-tool nav-tool-${tool.kind}`;

  const link = document.createElement('a');
  link.href = tool.href;
  link.className = 'nav-tool-link';
  const labelText = tool.kind === 'account' ? 'Anmelden' : tool.label;
  link.setAttribute('aria-label', labelText);

  const icon = document.createElement('span');
  icon.className = `nav-tool-icon nav-tool-icon-${tool.kind}`;
  icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = ICONS[tool.kind] || '';
  link.append(icon);

  if (tool.kind === 'dealer') {
    const label = document.createElement('span');
    label.className = 'nav-tool-text';
    label.textContent = labelText;
    link.append(label);
  } else {
    const label = document.createElement('span');
    label.className = 'nav-visually-hidden';
    label.textContent = labelText;
    link.append(label);
  }

  item.append(link);
  return item;
}

function renderSectionPanel(panel, section) {
  panel.replaceChildren();
  if (!section) return;

  const eyebrow = document.createElement('p');
  eyebrow.className = 'nav-panel-eyebrow';
  eyebrow.textContent = 'Menü';

  const heading = document.createElement('a');
  heading.className = 'nav-panel-title';
  heading.href = section.href;
  heading.textContent = section.title;

  const list = document.createElement('ul');
  list.className = 'nav-panel-links';
  section.links.forEach((link) => {
    const item = document.createElement('li');
    const anchor = document.createElement('a');
    anchor.href = link.href;
    anchor.textContent = link.label;
    item.append(anchor);
    list.append(item);
  });

  panel.append(eyebrow, heading, list);
}

function createFlyout(data, nav) {
  const flyout = document.createElement('div');
  flyout.id = 'nav-flyout';
  flyout.className = 'nav-flyout';
  flyout.hidden = true;

  const backdrop = document.createElement('button');
  backdrop.type = 'button';
  backdrop.className = 'nav-flyout-backdrop';
  backdrop.setAttribute('aria-label', 'Menü schließen');

  const dialog = document.createElement('div');
  dialog.className = 'nav-flyout-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-label', 'Menü');

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'nav-flyout-close';
  close.setAttribute('aria-label', 'Menü schließen');
  close.innerHTML = `<span class="nav-close-icon" aria-hidden="true">${ICONS.close}</span><span>Menü schließen</span>`;

  const layout = document.createElement('div');
  layout.className = 'nav-flyout-layout';

  const categories = document.createElement('div');
  categories.className = 'nav-flyout-categories';

  const panel = document.createElement('div');
  panel.className = 'nav-flyout-panel';

  const aside = document.createElement('aside');
  aside.className = 'nav-flyout-aside';
  aside.innerHTML = `
    <div class="nav-top-links">
      <p class="nav-top-links-title">Top-Links</p>
      <ul>
        ${TOP_LINKS.map((link) => `<li><a href="${link.href}">${link.label}</a></li>`).join('')}
      </ul>
    </div>
    <a class="nav-promo-card" href="/de/angebote-und-produkte/volkswagen-marktplatz">
      <span class="nav-promo-media" aria-hidden="true"></span>
      <span class="nav-promo-kicker">Angebote und Produkte</span>
      <strong>Volkswagen Marktplatz</strong>
    </a>
  `;

  const footer = document.createElement('div');
  footer.className = 'nav-flyout-footer';
  footer.innerHTML = `
    <ul class="nav-legal-links">
      ${LEGAL_LINKS.map((link) => `<li><a href="${link.href}">${link.label}</a></li>`).join('')}
    </ul>
    <div class="nav-language-switcher" aria-label="Sprachauswahl">
      <button type="button" class="nav-language-button" aria-current="true">DE</button>
    </div>
  `;

  let activeIndex = 0;

  const setActiveSection = (index) => {
    activeIndex = index;
    categories.querySelectorAll('.nav-category-button').forEach((button, buttonIndex) => {
      button.setAttribute('aria-current', buttonIndex === index ? 'true' : 'false');
    });
    renderSectionPanel(panel, data.sections[index]);
  };

  const categoryList = document.createElement('ul');
  categoryList.className = 'nav-category-list';
  data.sections.forEach((section, index) => {
    const item = document.createElement('li');
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-category-button';
    button.dataset.index = index;
    button.innerHTML = `<span>${section.title}</span><span class="nav-category-chevron" aria-hidden="true"></span>`;
    button.addEventListener('click', () => setActiveSection(index));
    item.append(button);
    categoryList.append(item);
  });

  categories.append(categoryList);
  layout.append(categories, panel, aside);
  dialog.append(close, layout, footer);
  flyout.append(backdrop, dialog);

  const closeMenu = () => {
    nav.setAttribute('aria-expanded', 'false');
    flyout.hidden = true;
    document.body.classList.remove('nav-open');
    document.body.style.overflow = '';
    nav.querySelector('.nav-menu-button')?.setAttribute('aria-expanded', 'false');
  };

  const openMenu = () => {
    nav.setAttribute('aria-expanded', 'true');
    flyout.hidden = false;
    document.body.classList.add('nav-open');
    document.body.style.overflow = 'hidden';
    nav.querySelector('.nav-menu-button')?.setAttribute('aria-expanded', 'true');
    if (data.sections.length) setActiveSection(activeIndex);
  };

  nav.openMenu = openMenu;
  nav.closeMenu = closeMenu;

  backdrop.addEventListener('click', closeMenu);
  close.addEventListener('click', closeMenu);

  if (data.sections.length) {
    setActiveSection(0);
  }

  return flyout;
}

function buildHeaderDom(data) {
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.className = 'nav';
  nav.setAttribute('aria-expanded', 'false');

  const shell = document.createElement('div');
  shell.className = 'nav-shell';

  const brand = document.createElement('a');
  brand.className = 'nav-logo';
  brand.href = data.brand.href;
  brand.setAttribute('aria-label', 'Zur Volkswagen Startseite');
  brand.innerHTML = `
    <span class="nav-logo-mark" aria-hidden="true">${ICONS.logo}</span>
    <span class="nav-visually-hidden">${data.brand.label}</span>
  `;

  const primary = document.createElement('div');
  primary.className = 'nav-primary';

  const menuButton = document.createElement('button');
  menuButton.type = 'button';
  menuButton.className = 'nav-menu-button';
  menuButton.setAttribute('aria-controls', 'nav-flyout');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.innerHTML = `
    <span class="nav-menu-icon" aria-hidden="true">${ICONS.menu}</span>
    <span class="nav-menu-label">Menü</span>
  `;

  const quickList = document.createElement('ul');
  quickList.className = 'nav-quick-links';
  data.quickLinks.forEach((link) => {
    const item = document.createElement('li');
    item.innerHTML = `<a href="${link.href}">${link.label}</a>`;
    quickList.append(item);
  });
  primary.append(menuButton, quickList);

  const tools = document.createElement('ul');
  tools.className = 'nav-tools';
  data.tools.forEach((tool) => tools.append(createToolLink(tool)));

  shell.append(brand, primary, tools);

  const flyout = createFlyout(data, nav);

  menuButton.addEventListener('click', () => {
    if (nav.getAttribute('aria-expanded') === 'true') {
      nav.closeMenu();
    } else {
      nav.openMenu();
    }
  });

  nav.append(shell, flyout);
  return nav;
}

function bindGlobalEvents(nav) {
  const onKeydown = (event) => {
    if (event.key === 'Escape' && nav.getAttribute('aria-expanded') === 'true') {
      nav.closeMenu();
      nav.querySelector('.nav-menu-button')?.focus();
    }
  };

  const onMediaChange = () => {
    if (nav.getAttribute('aria-expanded') === 'true') {
      nav.closeMenu();
    }
  };

  window.addEventListener('keydown', onKeydown);
  isDesktop.addEventListener('change', onMediaChange);
}

export default async function decorate(block) {
  ensureLandmarks();
  document.querySelector('header')?.classList.add('header-overlay');

  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);
  const data = extractNavData(fragment);

  block.textContent = '';
  block.append(createSkipLinks());

  const wrapper = document.createElement('div');
  wrapper.className = 'nav-wrapper';
  const nav = buildHeaderDom(data);
  wrapper.append(nav);
  block.append(wrapper);

  bindGlobalEvents(nav);
}
