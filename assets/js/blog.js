/*
 * Liste et affiche les articles écrits depuis /admin (Sveltia CMS), stockés
 * en Markdown dans content/blog/*.md. La liste vient de
 * content/blog/index.json (régénéré à chaque déploiement, voir
 * scripts/build-blog-index.js) ; chaque article est ensuite chargé et
 * converti à la volée quand on ouvre sa page.
 */
(() => {
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function formatDate(iso) {
    if (!iso) return '';
    const d = new Date(iso.length <= 10 ? `${iso}T00:00:00` : iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function parseFrontmatter(raw) {
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) return { data: {}, body: raw.trim() };
    const data = {};
    match[1].split(/\r?\n/).forEach((line) => {
      const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
      if (!m) return;
      let value = m[2].trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      data[m[1]] = value;
    });
    return { data, body: match[2].trim() };
  }

  // ---- Page liste (blog.html) ----
  const grid = document.getElementById('blog-grid');
  const empty = document.getElementById('blog-empty');
  if (grid) {
    fetch('content/blog/index.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((posts) => {
        if (!Array.isArray(posts) || posts.length === 0) return;

        if (empty) empty.hidden = true;
        grid.hidden = false;
        grid.innerHTML = posts
          .map((post) => {
            const img = post.image
              ? `<img src="${escapeHtml(post.image)}" alt="" class="absolute inset-0 w-full h-full object-cover" loading="lazy" />`
              : '';
            return `
              <li>
                <a href="blog-article.html?article=${encodeURIComponent(post.slug)}" class="group flex h-full flex-col overflow-hidden clay-soft border border-sable bg-white/80 shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-terracotta">
                  <div class="relative h-44 bg-olive/20 overflow-hidden">${img}</div>
                  <div class="flex flex-1 flex-col p-6">
                    <p class="text-xs uppercase tracking-widest text-terracotta-dark/70">${escapeHtml(formatDate(post.date))}</p>
                    <h2 class="mt-2 font-script text-2xl text-olive-dark leading-tight">${escapeHtml(post.title)}</h2>
                    <p class="mt-2 text-sm text-black/80 flex-1">${escapeHtml(post.excerpt || '')}</p>
                    <p class="mt-4 text-sm font-medium text-terracotta-dark group-hover:translate-x-1 transition-transform duration-300">Lire l'article <span aria-hidden="true">→</span></p>
                  </div>
                </a>
              </li>
            `;
          })
          .join('');
      })
      .catch(() => {
        /* Pas d'articles pour l'instant : l'état vide déjà présent dans la page reste affiché. */
      });
  }

  // ---- Page article (blog-article.html) ----
  const articleRoot = document.getElementById('blog-article');
  if (articleRoot) {
    const slug = new URLSearchParams(window.location.search).get('article');
    const notFound = document.getElementById('blog-article-not-found');

    if (!slug) {
      articleRoot.hidden = true;
      if (notFound) notFound.hidden = false;
    } else {
      fetch(`content/blog/${encodeURIComponent(slug)}.md`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error('not found'))))
        .then((raw) => {
          const { data, body } = parseFrontmatter(raw);
          document.title = `${data.title || slug} — Blog. I.A.C Ressources`;

          const titleEl = document.getElementById('blog-article-title');
          const dateEl = document.getElementById('blog-article-date');
          const imgEl = document.getElementById('blog-article-image');
          const bodyEl = document.getElementById('blog-article-body');

          if (titleEl) titleEl.textContent = data.title || slug;
          if (dateEl) dateEl.textContent = formatDate(data.date);
          if (imgEl) {
            if (data.image) {
              imgEl.src = data.image;
              imgEl.hidden = false;
            } else {
              imgEl.hidden = true;
            }
          }
          if (bodyEl) bodyEl.innerHTML = window.iacMarkdownLite(body);

          articleRoot.hidden = false;
        })
        .catch(() => {
          articleRoot.hidden = true;
          if (notFound) notFound.hidden = false;
        });
    }
  }
})();
