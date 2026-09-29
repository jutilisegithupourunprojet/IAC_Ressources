/*
 * Liste et affiche les ateliers/formations écrits depuis /admin (Sveltia
 * CMS), stockés en Markdown dans content/formations/*.md. La liste vient
 * de content/formations/index.json (régénéré à chaque déploiement, voir
 * scripts/build-content-index.js) ; chaque fiche est ensuite chargée et
 * convertie à la volée quand on l'ouvre.
 */
(() => {
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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

  // ---- Page catalogue (ateliers-formations.html) ----
  const grid = document.getElementById('formations-grid');
  const empty = document.getElementById('formations-empty');
  if (grid) {
    fetch('content/formations/index.json', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : []))
      .then((items) => {
        if (!Array.isArray(items) || items.length === 0) return;

        if (empty) empty.hidden = true;
        grid.hidden = false;
        grid.innerHTML = items
          .map((item, i) => {
            const img = item.image
              ? `<img src="${escapeHtml(item.image)}" alt="" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" ${i === 0 ? '' : 'loading="lazy"'} />`
              : '';
            const tint = i % 2 === 0 ? 'from-olive-dark/90 via-olive-dark/35' : 'from-terracotta-dark/90 via-terracotta-dark/35';
            return `
              <li>
                <a href="formation.html?formation=${encodeURIComponent(item.slug)}" class="group relative flex h-full min-h-[24rem] overflow-hidden clay-soft shadow-lg focus-visible:outline focus-visible:outline-4 focus-visible:outline-terracotta">
                  ${img}
                  <div class="absolute inset-0 bg-gradient-to-t ${tint} to-transparent" aria-hidden="true"></div>
                  <div class="relative mt-auto p-6 text-creme">
                    ${item.badge ? `<p class="inline-block clay-btn bg-corail-dark px-3 py-1 text-xs font-medium uppercase tracking-widest">${escapeHtml(item.badge)}</p>` : ''}
                    <h3 class="mt-3 text-2xl sm:text-3xl font-bold leading-tight">${escapeHtml(item.titre)}</h3>
                    <p class="mt-2 text-sm text-creme/90">${escapeHtml(item.sous_titre || '')}</p>
                    <p class="mt-4 text-sm font-medium group-hover:translate-x-1 transition-transform duration-300">Voir le détail <span aria-hidden="true">→</span></p>
                  </div>
                </a>
              </li>
            `;
          })
          .join('');
      })
      .catch(() => {
        /* Pas de fiche pour l'instant : l'état vide déjà présent dans la page reste affiché. */
      });
  }

  // ---- Page détail (formation.html) ----
  const root = document.getElementById('formation-detail');
  if (root) {
    const slug = new URLSearchParams(window.location.search).get('formation');
    const notFound = document.getElementById('formation-not-found');

    if (!slug) {
      root.hidden = true;
      if (notFound) notFound.hidden = false;
    } else {
      fetch(`content/formations/${encodeURIComponent(slug)}.md`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.text() : Promise.reject(new Error('not found'))))
        .then((raw) => {
          const { data, body } = parseFrontmatter(raw);
          document.title = `${data.titre || slug} — Ateliers & Formations. I.A.C Ressources`;

          const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value || '';
          };
          const setInfo = (id, value) => {
            const row = document.getElementById(`${id}-row`);
            const el = document.getElementById(id);
            if (!row || !el) return;
            if (value && value.trim()) {
              el.textContent = value;
              row.hidden = false;
            } else {
              row.hidden = true;
            }
          };

          set('formation-badge', data.badge);
          set('formation-titre', data.titre || slug);
          set('formation-sous-titre', data.sous_titre);

          const img = document.getElementById('formation-image');
          if (img) {
            if (data.image) {
              img.src = data.image;
              img.hidden = false;
            } else {
              img.hidden = true;
            }
          }

          setInfo('formation-dates', data.dates);
          setInfo('formation-lieu', data.lieu);
          setInfo('formation-tarif', data.tarif);
          setInfo('formation-public', data.public_vise);
          setInfo('formation-prerequis', data.prerequis);

          const cta = document.getElementById('formation-cta');
          if (cta) cta.setAttribute('href', `reservation.html?sujet=${encodeURIComponent(data.titre || slug)}`);

          const bodyEl = document.getElementById('formation-body');
          if (bodyEl) bodyEl.innerHTML = window.iacMarkdownLite(body);

          root.hidden = false;
        })
        .catch(() => {
          root.hidden = true;
          if (notFound) notFound.hidden = false;
        });
    }
  }
})();
