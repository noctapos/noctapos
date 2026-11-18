/* NoctaPOS — helper bersama untuk semua Pages Functions (artikel + panduan). */

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export const kind = (t) => (t === 'panduan' ? 'panduan' : 'artikel');

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'X-Content-Type-Options': 'nosniff', ...headers }
  });
}

/* Bungkus handler: HttpError -> pesan jelas, error lain -> 500 generik (detail hanya di log). */
export async function handle(fn) {
  try { return await fn(); }
  catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status, { 'Cache-Control': 'no-store' });
    console.error('API error:', e && e.stack ? e.stack : e);
    return json({ error: 'Terjadi kesalahan di server.' }, 500, { 'Cache-Control': 'no-store' });
  }
}

export async function readJson(request, maxBytes = 3_000_000) {
  const txt = await request.text();
  if (txt.length > maxBytes) throw new HttpError(413, 'Data terlalu besar.');
  try { return JSON.parse(txt); } catch (e) { throw new HttpError(400, 'Format data salah.'); }
}

/* ---------- sanitasi ---------- */
const str = (v, max) => String(v == null ? '' : v).trim().slice(0, max);

export function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 100);
}

const OK_TAGS = new Set(['p', 'br', 'h2', 'h3', 'h4', 'strong', 'b', 'em', 'i', 'u', 's', 'ul', 'ol', 'li', 'blockquote', 'a', 'pre', 'code', 'img']);
const DROP_TAGS = new Set(['script', 'style', 'iframe', 'object', 'embed', 'noscript', 'template', 'svg', 'math', 'form', 'textarea', 'select', 'title', 'head', 'link', 'meta', 'base']);

/* Whitelist tag + atribut. Aturannya sama dengan clean() di articles-ui.js, tapi dijalankan di server. */
export async function sanitizeHtml(html) {
  const rw = new HTMLRewriter()
    .onDocument({ comments(c) { c.remove(); } })
    .on('*', {
      element(el) {
        const t = el.tagName.toLowerCase();
        if (DROP_TAGS.has(t)) { el.remove(); return; }
        if (!OK_TAGS.has(t)) { el.removeAndKeepContent(); return; }
        for (const [name] of [...el.attributes]) {
          const n = name.toLowerCase();
          if (!((t === 'a' && n === 'href') || (t === 'img' && (n === 'src' || n === 'alt')))) el.removeAttribute(name);
        }
        if (t === 'a') {
          const h = (el.getAttribute('href') || '').trim();
          if (!/^(https?:|mailto:|\/|#)/i.test(h)) el.removeAttribute('href');
          else el.setAttribute('href', h);
        }
        if (t === 'img') {
          const s = (el.getAttribute('src') || '').trim();
          if (!/^(https?:\/\/|assets\/)/i.test(s)) { el.remove(); return; }
          el.setAttribute('src', s);
        }
      }
    });
  return (await rw.transform(new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })).text()).trim();
}

export function minutesOf(html) {
  const words = String(html || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/* Validasi + bersihkan satu entri konten dari klien. */
export async function buildRecord(b, type) {
  if (!b || typeof b !== 'object') throw new HttpError(400, 'Data kosong.');
  const title = str(b.title, 200);
  const category = str(b.category, 40).replace(/\s+/g, ' ');
  const excerpt = str(b.excerpt, 400);
  if (!title || !category || !excerpt) throw new HttpError(400, 'Judul, kategori, dan ringkasan wajib diisi.');

  const cover = str(b.cover, 500);
  if (cover && !/^(https:\/\/|assets\/)/i.test(cover)) throw new HttpError(400, 'Link gambar sampul harus diawali https:// atau assets/');

  let html = String(b.html == null ? '' : b.html);
  if (html.length > 300_000) throw new HttpError(413, 'Isi konten terlalu panjang.');
  if (/src\s*=\s*["']?\s*data:/i.test(html)) throw new HttpError(400, 'Gambar langsung (data:) tidak diizinkan. Pakai link https:// atau assets/.');
  html = html ? await sanitizeHtml(html) : '';

  const legacy = str(b.legacyUrl, 200);
  return {
    type,
    slug: slugify(b.slug) || slugify(title) || type,
    title, category, excerpt, cover,
    cover_alt: str(b.coverAlt, 200),
    cover_pos: /^(top|bottom)$/.test(b.coverPos) ? b.coverPos : 'center',
    grad: Math.abs(Number(b.grad) | 0) % 6,
    tags: type === 'panduan' ? [] : (Array.isArray(b.tags) ? b.tags.map((t) => str(t, 40)).filter(Boolean).slice(0, 2) : []),
    html,
    popular: type === 'panduan' && !!b.popular ? 1 : 0,
    status: b.status === 'published' ? 'published' : 'draft',
    legacy_url: /^artikel\/[a-z0-9-]+\.html$/i.test(legacy) ? legacy : '',
    meta_title: str(b.metaTitle, 120),
    meta_desc: str(b.metaDesc, 400)
  };
}

/* ---------- baris DB <-> objek yang dipakai UI ---------- */
export const LIST_COLS = 'id,type,slug,title,category,tags,excerpt,cover,cover_alt,cover_pos,grad,minutes,popular,status,legacy_url,meta_title,meta_desc,created_at,updated_at';

export function rowToItem(r, withHtml) {
  let tags = [];
  try { tags = JSON.parse(r.tags || '[]'); } catch (e) {}
  const o = {
    id: r.id, type: r.type, slug: r.slug, title: r.title, category: r.category,
    tags: Array.isArray(tags) ? tags : [], excerpt: r.excerpt, cover: r.cover,
    coverAlt: r.cover_alt, coverPos: r.cover_pos, grad: r.grad, minutes: r.minutes,
    popular: !!r.popular, status: r.status, legacyUrl: r.legacy_url,
    metaTitle: r.meta_title, metaDesc: r.meta_desc, createdAt: r.created_at, updatedAt: r.updated_at
  };
  if (withHtml) o.html = r.html;
  return o;
}

export async function uniqueSlug(db, type, slug, selfId) {
  let s = slug, n = 2;
  for (;;) {
    const hit = await db.prepare('SELECT 1 AS x FROM content WHERE type = ?1 AND slug = ?2 AND id <> ?3').bind(type, s, selfId || '').first();
    if (!hit) return s;
    s = slug.slice(0, 90) + '-' + n++;
    if (n > 500) throw new HttpError(409, 'Slug bentrok, ganti slug-nya.');
  }
}

/* ---------- kategori ---------- */
export function ensureCatStmt(db, type, name) {
  return db.prepare(
    'INSERT INTO categories (type, name, pos) SELECT ?1, ?2, (SELECT COALESCE(MAX(pos), 0) + 1 FROM categories WHERE type = ?1) ' +
    'WHERE NOT EXISTS (SELECT 1 FROM categories WHERE type = ?1 AND lower(name) = lower(?2))'
  ).bind(type, name);
}

export async function listCats(db, type, onlyPublished) {
  const base = (await db.prepare('SELECT name FROM categories WHERE type = ?1 ORDER BY pos, name').bind(type).all()).results.map((r) => r.name);
  const q = 'SELECT DISTINCT category AS name FROM content WHERE type = ?1' + (onlyPublished ? " AND status = 'published'" : '') + ' ORDER BY category';
  const used = (await db.prepare(q).bind(type).all()).results.map((r) => r.name);
  const out = base.slice();
  used.forEach((n) => { if (!out.some((x) => x.toLowerCase() === n.toLowerCase())) out.push(n); });
  return out;
}

export function cleanCat(n) { return String(n == null ? '' : n).replace(/\s+/g, ' ').trim().slice(0, 40); }

export function newId(type) { return (type === 'panduan' ? 'g' : 'a') + Date.now() + Math.floor(Math.random() * 90 + 10); }
