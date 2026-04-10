export default function decorate(block) {
  const link = block.querySelector('a');
  if (!link) return;

  const url = link.href;
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
