/* PUBLIK, hanya baca, hanya konten berstatus 'published'.
   GET /api/content?type=artikel|panduan            -> daftar (tanpa html)
   GET /api/content?type=artikel|panduan&slug=xxx   -> satu konten lengkap (atau null)
   Tidak ada POST/PUT/DELETE di sini. Semua perubahan lewat /api/admin/* (dijaga middleware). */
import { handle, json, kind, rowToItem, LIST_COLS } from '../_lib/shared.js';

const CACHE = { 'Cache-Control': 'public, max-age=60' };

export const onRequestGet = ({ request, env }) => handle(async () => {
  const u = new URL(request.url);
  const type = kind(u.searchParams.get('type'));
  const slug = u.searchParams.get('slug');

  if (slug) {
    const row = await env.DB.prepare("SELECT * FROM content WHERE type = ?1 AND slug = ?2 AND status = 'published'")
      .bind(type, slug).first();
    return json(row ? rowToItem(row, true) : null, 200, CACHE);
  }
  const { results } = await env.DB.prepare(
    'SELECT ' + LIST_COLS + " FROM content WHERE type = ?1 AND status = 'published' ORDER BY created_at DESC LIMIT 500"
  ).bind(type).all();
  return json(results.map((r) => rowToItem(r, false)), 200, CACHE);
});
