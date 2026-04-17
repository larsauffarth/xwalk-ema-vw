const SEARCH_FRAGMENT = '/content/de/fragments/search';

async function renderSearchForm(block) {
  const resp = await fetch(`${SEARCH_FRAGMENT}.plain.html`);
  if (!resp.ok) return false;
  const html = await resp.text();
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  const sfBlock = tmp.querySelector('.search-form');
  if (!sfBlock) return false;

  // Load search-form CSS
  const cssHref = `${window.hlx.codeBasePath}/blocks/search-form/search-form.css`;
  if (!document.querySelector(`link[href="${cssHref}"]`)) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssHref;
    document.head.append(link);
  }

  // Swap block identity and run search-form decorator
  block.className = block.className.replace('embed-search', 'search-form');
  block.dataset.blockName = 'search-form';
  block.innerHTML = sfBlock.innerHTML;
  const { default: decorateSearchForm } = await import('../search-form/search-form.js');
  await decorateSearchForm(block);
  return true;
}

export default async function decorate(block) {
  const link = block.querySelector('a');
  if (!link) return;

  const url = link.href;

  // Guard against invalid URLs or same-origin URLs (EDS pages shouldn't iframe each other)
  const linkUrl = new URL(url, window.location.origin);
  const isInvalid = !url
    || url === '#'
    || url.endsWith('#')
    || linkUrl.origin === window.location.origin
    || url === window.location.href
    || url === `${window.location.href}#`;

  if (isInvalid) {
    // Same-origin link in a dark section → render as search form
    const section = block.closest('.section');
    if (section?.classList.contains('dark')) {
      const loaded = await renderSearchForm(block);
      if (loaded) return;
    }
    // Otherwise keep block content as-is
    return;
  }

  const placeholder = block.querySelector('picture') || block.querySelector('img');

  block.innerHTML = '';

  const wrapper = document.createElement('div');
  wrapper.className = 'embed-search-placeholder';

  if (placeholder) {
    wrapper.append(placeholder);
  }

  block.append(wrapper);

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.setAttribute('loading', 'lazy');
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('frameborder', '0');
        iframe.title = 'Embedded content';
        wrapper.replaceWith(iframe);
        observer.disconnect();
      }
    });
  }, { threshold: 0.1 });

  observer.observe(wrapper);
}
