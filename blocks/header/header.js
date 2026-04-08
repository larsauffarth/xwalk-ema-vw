import { getMetadata, decorateIcons } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';

/* ---------- helpers ---------- */

function createEl(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'className') el.className = v;
    else el.setAttribute(k, v);
  });
  children.forEach((c) => {
    if (typeof c === 'string') el.append(document.createTextNode(c));
    else if (c) el.append(c);
  });
  return el;
}

/* ---------- focus trap ---------- */

let trapHandler = null;

function enableFocusTrap(container) {
  trapHandler = (e) => {
    if (e.key !== 'Tab') return;
    const focusables = [...container.querySelectorAll(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    )].filter((el) => el.offsetParent !== null);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };
  document.addEventListener('keydown', trapHandler);
}

function disableFocusTrap() {
  if (trapHandler) {
    document.removeEventListener('keydown', trapHandler);
    trapHandler = null;
  }
}

/* ---------- drawer state ---------- */

let lastFocused = null;

function openDrawer(drawer, trigger) {
  lastFocused = document.activeElement;
  drawer.hidden = false;
  trigger.setAttribute('aria-expanded', 'true');
  document.documentElement.classList.add('vw-overlay-open');
  const firstFocusable = drawer.querySelector('button, a[href]');
  if (firstFocusable) firstFocusable.focus();
  enableFocusTrap(drawer);
}

function closeDrawer(drawer, trigger) {
  disableFocusTrap();
  drawer.hidden = true;
  trigger.setAttribute('aria-expanded', 'false');
  document.documentElement.classList.remove('vw-overlay-open');
  if (lastFocused) lastFocused.focus();
  lastFocused = null;
}

/* ---------- accordion ---------- */

function toggleAccordion(heading) {
  const expanded = heading.getAttribute('aria-expanded') === 'true';
  heading.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  const panel = heading.nextElementSibling;
  if (panel) panel.hidden = expanded;
}

/* ---------- main decorate ---------- */

export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  let navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  // Use content/nav for local dev when path starts with /content/
  if (window.location.pathname.startsWith('/content/') && navPath === '/nav') {
    navPath = '/content/nav';
  }
  const fragment = await loadFragment(navPath);

  block.textContent = '';

  /* Parse 3 sections from nav fragment */
  const sections = [...fragment.children];
  const topBarSection = sections[0]; // brand + quick links
  const menuSection = sections[1]; // 6 nav groups
  const utilitySection = sections[2]; // Händler, Search, Account

  /* ---- Build nav wrapper ---- */
  const navWrapper = createEl('div', { className: 'nav-wrapper', 'data-mode': 'solid' });

  /* ---- Top bar ---- */
  const topBar = createEl('div', { className: 'vw-topbar' });

  /* Logo */
  const brandLink = topBarSection?.querySelector('a');
  const logo = createEl('a', {
    className: 'vw-brand',
    href: brandLink?.href || '/de',
    'aria-label': 'Zur Volkswagen Startseite',
  });
  const logoIcon = topBarSection?.querySelector('.icon');
  if (logoIcon) {
    logo.append(logoIcon.cloneNode(true));
  } else {
    logo.innerHTML = '<span class="icon icon-vw-logo"></span>';
  }
  topBar.append(logo);

  /* Menu trigger */
  const menuTrigger = createEl('button', {
    className: 'vw-menu-trigger',
    type: 'button',
    'aria-expanded': 'false',
    'aria-controls': 'vw-drawer',
    'aria-label': 'Menü öffnen',
  });
  menuTrigger.innerHTML = '<span class="vw-menu-trigger-label">Menü</span>';
  topBar.append(menuTrigger);

  /* Quick links (desktop only) */
  const quickLinksUl = topBarSection?.querySelector('ul');
  if (quickLinksUl) {
    const quickLinks = createEl('div', { className: 'vw-quick-links' });
    quickLinksUl.querySelectorAll('a').forEach((a) => {
      const link = createEl('a', { href: a.href, className: 'vw-quick-link' }, a.textContent);
      quickLinks.append(link);
    });
    topBar.append(quickLinks);
  }

  /* Utilities (Händler, Search, Account) */
  const utilLinks = utilitySection?.querySelectorAll('a');
  if (utilLinks?.length) {
    const utilities = createEl('div', { className: 'vw-utilities' });
    const iconNames = ['dealer', 'search', 'account'];
    utilLinks.forEach((a, i) => {
      const btn = createEl('a', {
        href: a.href,
        className: `vw-util-btn vw-util-${iconNames[i] || 'unknown'}`,
        'aria-label': a.textContent.trim(),
      });
      btn.innerHTML = `<span class="vw-util-icon vw-icon-${iconNames[i] || 'unknown'}"></span>`;
      // Show text label for dealer on desktop
      if (i === 0) {
        btn.innerHTML += `<span class="vw-util-label">${a.textContent.trim()}</span>`;
      }
      utilities.append(btn);
    });
    topBar.append(utilities);
  }

  navWrapper.append(topBar);

  /* ---- Drawer overlay ---- */
  const drawer = createEl('div', {
    id: 'vw-drawer',
    className: 'vw-drawer',
    role: 'dialog',
    'aria-modal': 'true',
    'aria-label': 'Menü',
  });
  drawer.hidden = true;

  /* Drawer backdrop */
  const backdrop = createEl('div', { className: 'vw-drawer-backdrop' });
  drawer.append(backdrop);

  /* Drawer panel */
  const panel = createEl('div', { className: 'vw-drawer-panel' });

  /* Drawer header */
  const drawerHeader = createEl('div', { className: 'vw-drawer-header' });
  drawerHeader.innerHTML = '<span class="vw-drawer-title">Menü</span>';
  const closeBtn = createEl('button', {
    type: 'button',
    className: 'vw-drawer-close',
    'aria-label': 'Menü schließen',
  });
  closeBtn.innerHTML = '<span class="vw-close-icon"></span>';
  drawerHeader.append(closeBtn);
  panel.append(drawerHeader);

  /* Drawer nav groups (accordion) */
  const menuNav = createEl('nav', { className: 'vw-drawer-nav', 'aria-label': 'Hauptnavigation' });
  const menuGroups = menuSection?.querySelectorAll(':scope > ul > li');
  menuGroups?.forEach((group) => {
    const groupEl = createEl('div', { className: 'vw-nav-group' });

    const headingText = group.querySelector('strong')?.textContent || group.querySelector('p')?.textContent || '';
    const headingBtn = createEl('button', {
      className: 'vw-nav-group-heading',
      type: 'button',
      'aria-expanded': 'false',
    }, headingText);
    headingBtn.addEventListener('click', () => toggleAccordion(headingBtn));
    groupEl.append(headingBtn);

    const subList = group.querySelector('ul');
    if (subList) {
      const panelDiv = createEl('div', { className: 'vw-nav-group-panel' });
      panelDiv.hidden = true;
      const ul = createEl('ul', { className: 'vw-nav-group-links' });
      subList.querySelectorAll(':scope > li').forEach((li) => {
        const a = li.querySelector('a');
        if (a) {
          const item = createEl('li');
          item.append(createEl('a', { href: a.href }, a.textContent));
          ul.append(item);
        }
      });
      panelDiv.append(ul);
      groupEl.append(panelDiv);
    }

    menuNav.append(groupEl);
  });
  panel.append(menuNav);
  drawer.append(panel);
  navWrapper.append(drawer);

  /* ---- Events ---- */
  menuTrigger.addEventListener('click', () => {
    if (drawer.hidden) openDrawer(drawer, menuTrigger);
    else closeDrawer(drawer, menuTrigger);
  });

  closeBtn.addEventListener('click', () => closeDrawer(drawer, menuTrigger));
  backdrop.addEventListener('click', () => closeDrawer(drawer, menuTrigger));

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !drawer.hidden) {
      e.preventDefault();
      closeDrawer(drawer, menuTrigger);
    }
  });

  /* Close drawer on resize to desktop */
  const desktopMQ = window.matchMedia('(min-width: 960px)');
  desktopMQ.addEventListener('change', () => {
    if (!drawer.hidden) closeDrawer(drawer, menuTrigger);
  });

  /* ---- IntersectionObserver for transparent/solid ---- */
  const heroSection = document.querySelector('.hero-stage-container');
  if (heroSection) {
    navWrapper.dataset.mode = 'transparent';
    const observer = new IntersectionObserver(([entry]) => {
      if (drawer.hidden) {
        navWrapper.dataset.mode = entry.isIntersecting ? 'transparent' : 'solid';
      }
    }, { threshold: 0.01 });
    observer.observe(heroSection);
  }

  block.append(navWrapper);

  /* Decorate icons (loads SVG into icon spans) */
  decorateIcons(navWrapper);
}
