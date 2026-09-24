/*
 * Remplace le texte codé en dur par le contenu édité via /admin (Sveltia CMS),
 * quand il existe. Un élément portant `data-cms-file="content/xxx.json"`
 * (souvent le `<body>`, mais n'importe quel élément convient) donne le
 * fichier à charger pour lui-même et tous ses descendants ; un descendant
 * peut porter son propre `data-cms-file` pour piocher dans un autre fichier
 * (ex. une vignette qui affiche le contenu d'une fiche formation).
 *
 * - data-cms="cle"       : remplace le texte de l'élément
 * - data-cms-md="cle"    : convertit un texte Markdown simple (gras, italique, liens,
 *   listes à puces, paragraphes) en HTML et remplace le contenu de l'élément
 * - data-cms-attr="attribut:cle;attribut2:cle2" : pose un ou plusieurs attributs
 * - data-cms-attr="attribut:un texte fixe {cle}" : construit la valeur à partir d'un
 *   modèle (utile pour reconstituer une URL à partir d'un simple identifiant, ex.
 *   data-embed-src:https://www.youtube.com/embed/{video_id}). Les valeurs insérées
 *   dans un modèle sont échappées pour rester correctes dans une URL.
 *
 * Un champ vide, absent, ou un fichier introuvable ne change rien : le texte
 * écrit dans la page reste affiché.
 */
window.iacMarkdownLite = function markdownLite(src) {
  const escapeHtml = (s) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const inline = (s) =>
    escapeHtml(s)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2" class="underline hover:text-terracotta-dark transition-colors">$1</a>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      .replace(/\n/g, '<br />');

  const blocks = String(src || '')
    .replace(/\r\n/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block.split('\n').map((l) => l.trim());
      if (lines.every((l) => /^[-*]\s+/.test(l))) {
        const items = lines.map((l) => `<li>${inline(l.replace(/^[-*]\s+/, ''))}</li>`).join('');
        return `<ul class="list-disc pl-5 space-y-1">${items}</ul>`;
      }
      const heading = block.match(/^#{1,3}\s+(.*)$/);
      if (heading) return `<p class="font-semibold">${inline(heading[1])}</p>`;
      return `<p>${inline(block)}</p>`;
    })
    .join('');
};

(() => {
  const fileCache = new Map();
  const loadFile = (file) => {
    if (!fileCache.has(file)) {
      fileCache.set(
        file,
        fetch(file, { cache: 'no-store' })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null)
      );
    }
    return fileCache.get(file);
  };

  const fileFor = (el) => {
    const holder = el.closest('[data-cms-file]');
    return holder ? holder.getAttribute('data-cms-file') : null;
  };

  const run = async (el, apply) => {
    const file = fileFor(el);
    if (!file) return;
    const data = await loadFile(file);
    if (!data) return;
    apply(data);
  };

  document.querySelectorAll('[data-cms]').forEach((el) => {
    const key = el.getAttribute('data-cms');
    run(el, (data) => {
      const value = data[key];
      if (value != null && value !== '') el.textContent = value;
    });
  });

  document.querySelectorAll('[data-cms-md]').forEach((el) => {
    const key = el.getAttribute('data-cms-md');
    run(el, (data) => {
      const value = data[key];
      if (value != null && value !== '') el.innerHTML = window.iacMarkdownLite(value);
    });
  });

  document.querySelectorAll('[data-cms-attr]').forEach((el) => {
    const pairs = el
      .getAttribute('data-cms-attr')
      .split(';')
      .map((pair) => pair.trim())
      .filter(Boolean);

    run(el, (data) => {
      pairs.forEach((pair) => {
        const sep = pair.indexOf(':');
        if (sep === -1) return;
        const attr = pair.slice(0, sep).trim();
        const template = pair.slice(sep + 1).trim();
        if (!attr || !template) return;

        if (!template.includes('{')) {
          const value = data[template];
          if (value != null && value !== '') el.setAttribute(attr, value);
          return;
        }

        let hasValue = false;
        const value = template.replace(/\{(\w+)\}/g, (_, key) => {
          const v = data[key];
          if (v != null && v !== '') {
            hasValue = true;
            return encodeURIComponent(v);
          }
          return '';
        });
        if (hasValue) el.setAttribute(attr, value);
      });
    });
  });
})();
