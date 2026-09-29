(() => {
  const article = document.querySelector('article');
  if (!article) return;
  window.DatxyCodeBlocks.enhance(article);
  const headings = [...article.querySelectorAll('h1,h2,h3,h4,h5,h6')];
  const slot = document.querySelector('.toc-slot');
  if (!headings.length) { slot?.remove(); return; }
  const toc = document.createElement('details'); toc.className = 'article-toc';
  const summary = document.createElement('summary'); summary.textContent = '本篇目录';
  const nav = document.createElement('nav'); nav.setAttribute('aria-label', '文章目录');
  const links = [];
  const minLevel = Math.min(...headings.map(h => Number(h.tagName.slice(1))));
  headings.forEach((heading, index) => {
    if (!heading.id) {
      let id = 'article-section-' + (index + 1);
      while (document.getElementById(id)) id += '-';
      heading.id = id;
    }
    const a = document.createElement('a');
    a.href = '#' + encodeURIComponent(heading.id); a.textContent = heading.textContent.trim();
    a.style.paddingLeft = (Number(heading.tagName.slice(1)) - minLevel) * 10 + 12 + 'px';
    a.addEventListener('click', () => { if (matchMedia('(max-width: 1000px)').matches) toc.open = false; });
    nav.append(a); links.push(a);
  });
  toc.append(summary, nav); slot.append(toc);
  const media = matchMedia('(min-width: 1001px)');
  toc.open = media.matches;
  media.addEventListener('change', e => { toc.open = e.matches; });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const current = entries.find(e => e.isIntersecting);
      if (!current) return;
      links.forEach((a,i) => {
        if (i === headings.indexOf(current.target)) a.setAttribute('aria-current','location');
        else a.removeAttribute('aria-current');
      });
    }, {rootMargin:'0px 0px -65% 0px'});
    headings.forEach(h => observer.observe(h));
  }
})();
