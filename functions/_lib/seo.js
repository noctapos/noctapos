/* NoctaPOS — SEO di sisi server (dipakai detail.js, panduan-detail.js, sitemap.xml.js).
   Cloudflare Pages otomatis menyajikan "detail.html" sebagai "/detail" (dan mengalihkan versi .html),
   jadi semua URL kanonik di sini memakai bentuk TANPA .html. */

export const SITE = 'https://noctapos.id';

/* Halaman statis yang masuk sitemap (tanpa .html). Tambah/hapus sesuai kebutuhan. */
export const STATIC_PAGES = ['', 'fitur', 'bandingkan', 'perbandingan-fitur', 'faq', 'contact', 'artikel', 'panduan-pengguna'];

const isImg = (u) => /^(https?:\/\/|assets\/|\/media\/)/i.test(u || '');
export const absUrl = (u) => (/^https?:/i.test(u) ? u : SITE + '/' + String(u).replace(/^\//, ''));
export const cleanPath = (p) => String(p || '').replace(/^\//, '').replace(/\.html$/i, '');
export const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
export const postUrl = (type, slug) => SITE + '/' + (type === 'panduan' ? 'panduan-detail' : 'detail') + '?slug=' + encodeURIComponent(slug);

/* Tag <head> untuk satu konten. Rumusnya SAMA dengan seo() di articles-ui.js. */
export function postTags(a, type) {
  const brand = type === 'panduan' ? 'Panduan NoctaPOS' : 'NoctaPOS';
  let t = a.meta_title || a.title; if (!/noctapos/i.test(t)) t += ' | ' + brand;
  const d = (a.meta_desc || a.excerpt || '').slice(0, 300);
  const url = postUrl(type, a.slug);
  const img = isImg(a.cover) ? absUrl(a.cover) : '';
  const ogT = a.meta_title || a.title;
  const crumbs = type === 'panduan'
    ? [['Beranda', '/'], ['Pusat Panduan', 'panduan-pengguna'], [a.category, 'panduan-pengguna?cat=' + encodeURIComponent(a.category)]]
    : [['Beranda', '/'], ['Artikel', 'artikel']];
  const pub = { '@type': 'Organization', name: 'NoctaPOS', url: SITE + '/' };
  const ld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Article', headline: ogT.slice(0, 110), description: d, inLanguage: 'id-ID', datePublished: a.created_at, dateModified: a.updated_at || a.created_at,
      author: pub, publisher: pub, mainEntityOfPage: url, image: img || undefined, articleSection: a.category },
    { '@type': 'BreadcrumbList', itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c[0], item: absUrl(c[1]) }))
        .concat([{ '@type': 'ListItem', position: crumbs.length + 1, name: a.title }]) }
  ] };
  const m = (k, v, prop) => '<meta ' + (prop ? 'property' : 'name') + '="' + k + '" content="' + esc(v) + '">';
  return [
    '<title>' + esc(t) + '</title>',
    m('description', d),
    m('robots', 'index,follow,max-image-preview:large'),
    '<link rel="canonical" href="' + esc(url) + '">',
    m('og:type', 'article', 1), m('og:title', ogT, 1), m('og:description', d, 1), m('og:url', url, 1), m('og:site_name', 'NoctaPOS', 1), m('og:locale', 'id_ID', 1),
    img ? m('og:image', img, 1) : '',
    m('twitter:card', img ? 'summary_large_image' : 'summary'), m('twitter:title', ogT), m('twitter:description', d),
    img ? m('twitter:image', img) : '',
    '<script type="application/ld+json" id="ld-json">' + JSON.stringify(ld).replace(/</g, '\\u003c') + '</script>'
  ].filter(Boolean).join('\n');
}

const STRIP_ALL = ['head title', 'head meta[name="description"]', 'head meta[name="robots"]', 'head link[rel="canonical"]',
  'head meta[property^="og:"]', 'head meta[name^="twitter:"]', 'head script[type="application/ld+json"]'];

function rewrite(res, strip, tags, status) {
  let rw = new HTMLRewriter();
  strip.forEach((sel) => { rw = rw.on(sel, { element(e) { e.remove(); } }); });
  rw = rw.on('head', { element(e) { e.append('\n' + tags + '\n', { html: true }); } });
  const out = rw.transform(res);
  const h = new Headers(res.headers); h.delete('content-length'); h.delete('etag');
  return new Response(out.body, { status: status || res.status, headers: h });
}

/* Dipakai oleh functions/detail.js dan functions/panduan-detail.js */
export async function servePost({ request, env, next }, type) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return next();
  const url = new URL(request.url);
  const slug = (url.searchParams.get('slug') || '').slice(0, 200);

  let row = null;
  if (slug && env.DB) {
    try {
      row = await env.DB.prepare("SELECT slug,title,category,excerpt,cover,legacy_url,meta_title,meta_desc,created_at,updated_at,(html = '') AS nohtml FROM content WHERE type = ?1 AND slug = ?2 AND status = 'published'")
        .bind(type, slug).first();
    } catch (e) { console.error('seo lookup:', e && e.stack ? e.stack : e); return next(); }   /* gagal baca DB: sajikan halaman apa adanya */
  }

  /* artikel lama yang masih berupa halaman statis -> alihkan permanen ke halaman aslinya (hindari duplikat) */
  if (row && row.nohtml && row.legacy_url) return Response.redirect(url.origin + '/' + cleanPath(row.legacy_url), 301);

  const res = await next();
  if (!res.ok || !/text\/html/i.test(res.headers.get('content-type') || '')) return res;

  if (!row) return rewrite(res, ['head meta[name="robots"]'], '<meta name="robots" content="noindex">', 404);   /* 404 sungguhan, bukan "soft 404" */
  return rewrite(res, STRIP_ALL, postTags(row, type));
}
