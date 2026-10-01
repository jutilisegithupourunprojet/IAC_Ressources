#!/usr/bin/env node
/*
 * Regénère content/blog/index.json et content/formations/index.json à
 * partir des fichiers Markdown de ces deux dossiers (chacun écrit par
 * Sveltia CMS avec un en-tête simple "clé: valeur" entre deux lignes
 * "---"). Lancé automatiquement au déploiement (voir "build" dans
 * package.json) et peut aussi être lancé à la main avec
 * `node scripts/build-content-index.js`.
 */
const fs = require('fs');
const path = require('path');

function parseFrontmatter(raw) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: raw.trim() };

  const data = {};
  match[1].split(/\r?\n/).forEach((line) => {
    const m = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!m) return;
    let value = m[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    data[m[1]] = value;
  });

  return { data, body: match[2].trim() };
}

function excerptFrom(body, max = 200) {
  const plain = body
    .replace(/^#+\s*/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_`]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > max ? `${plain.slice(0, max).trim()}…` : plain;
}

function buildIndex(dir, mapEntry) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
  const entries = files.map((file) => {
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(dir, file), 'utf8');
    const { data, body } = parseFrontmatter(raw);
    return mapEntry(slug, data, body);
  });

  entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  const outFile = path.join(dir, 'index.json');
  fs.writeFileSync(outFile, JSON.stringify(entries, null, 2) + '\n', 'utf8');
  console.log(`${path.relative(process.cwd(), outFile)} généré (${entries.length} élément${entries.length > 1 ? 's' : ''}).`);
}

const root = path.join(__dirname, '..');

buildIndex(path.join(root, 'content', 'blog'), (slug, data, body) => ({
  slug,
  title: data.title || slug,
  date: data.date || '',
  image: data.image || '',
  excerpt: data.excerpt && data.excerpt.trim() ? data.excerpt.trim() : excerptFrom(body),
}));

buildIndex(path.join(root, 'content', 'formations'), (slug, data) => ({
  slug,
  titre: data.titre || slug,
  sous_titre: data.sous_titre || '',
  badge: data.badge || '',
  image: data.image || '',
  date: data.date || '',
}));

buildIndex(path.join(root, 'content', 'podcasts-audio'), (slug, data) => ({
  slug,
  title: data.title || slug,
  description: data.description || '',
  image: data.image || '',
  audio: data.audio || '',
  // Pas de champ date visible dans /admin : le slug est préfixé par la date
  // de création (voir le "slug" dans admin/config.yml), ce qui suffit à trier.
  date: slug,
}));
