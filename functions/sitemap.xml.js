/* GET /sitemap.xml — selalu terbaru: halaman statis + semua artikel & panduan berstatus terbit. */
import { SITE, STATIC_PAGES, postUrl, cleanPath, esc } from './_lib/seo.js';

export function buildSitemap(rows) {
  const urls = STATIC_PAGES.map((p) => '  <url><loc>' + esc(SITE + '/' + p) + '</loc></url>');
  rows.forEach((r) => {
    const loc = r.nohtml && r.legacy_url ? SITE + '/' + cleanPath(r.legacy_url) : postUrl(r.type, r.slug);
    const d = String(r.updated_at || r.created_at || '').slice(0, 10);
    urls.push('  <url><loc>' + esc(loc) + '</loc>' + (/^\d{4}-\d{2}-\d{2}$/.test(d) ? '<lastmod>' + d + '</lastmod>' : '') + '</url>');
  });
  return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls.join('\n') + '\n</urlset>\n';
}

export const onRequestGet = async ({ env }) => {
  let rows;
  try {
    rows = (await env.DB.prepare("SELECT type, slug, legacy_url, (html = '') AS nohtml, created_at, updated_at FROM content WHERE status = 'published' ORDER BY created_at DESC LIMIT 5000").all()).results;
  } catch (e) {
    console.error('sitemap:', e && e.stack ? e.stack : e);
    return new Response('Sitemap sementara tidak tersedia.', { status: 503, headers: { 'Retry-After': '300' } });
  }
  return new Response(buildSitemap(rows), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
};
