#!/usr/bin/env node
/*
 * Regénère content/blog/index.json à partir des fichiers Markdown de
 * content/blog/*.md (chacun écrit par Sveltia CMS avec un en-tête simple
 * "clé: valeur" entre deux lignes "---"). Lancé automatiquement au
 * déploiement (voir "build" dans package.json) et peut aussi être lancé à
 * la main avec `node scripts/build-blog-index.js`.
 */
const fs = require('fs');
const path = require('path');

const blogDir = path.join(__dirname, '..', 'content', 'blog');
const outFile = path.join(blogDir, 'index.json');

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

function build() {
  if (!fs.existsSync(blogDir)) {
    fs.mkdirSync(blogDir, { recursive: true });
  }

  const files = fs.readdirSync(blogDir).filter((f) => f.endsWith('.md'));

  const posts = files.map((file) => {
    const slug = file.replace(/\.md$/, '');
    const raw = fs.readFileSync(path.join(blogDir, file), 'utf8');
    const { data, body } = parseFrontmatter(raw);

    return {
      slug,
      title: data.title || slug,
      date: data.date || '',
      image: data.image || '',
      excerpt: data.excerpt && data.excerpt.trim() ? data.excerpt.trim() : excerptFrom(body),
    };
  });

  posts.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));

  fs.writeFileSync(outFile, JSON.stringify(posts, null, 2) + '\n', 'utf8');
  console.log(`content/blog/index.json généré (${posts.length} article${posts.length > 1 ? 's' : ''}).`);
}

build();
