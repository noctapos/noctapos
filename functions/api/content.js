/* PUBLIK, hanya baca, hanya konten berstatus 'published'.
   GET /api/content?type=artikel|panduan|all        -> daftar (tanpa html)
   GET /api/content?type=artikel|panduan&slug=xxx   -> satu konten lengkap (atau null)
   Tidak ada POST/PUT/DELETE di sini. Semua perubahan lewat /api/admin/* (dijaga middleware). */
import { handle, json, kind, rowToItem, LIST_COLS } from '../_lib/shared.js';

const CACHE = { 'Cache-Control': 'public, max-age=60' };

export const onRequestGet = ({ request, env }) => handle(async () => {
  const u = new URL(request.url);
  const t = u.searchParams.get('type');
  const slug = u.searchParams.get('slug');

  if (slug) {
    const type = kind(t);
    const row = await env.DB.prepare("SELECT * FROM content WHERE type = ?1 AND slug = ?2 AND status = 'published'").bind(type, slug).first();
    return json(row ? rowToItem(row, true) : null, 200, CACHE);
  }
  const all = t === 'all';
  const sql = 'SELECT ' + LIST_COLS + " FROM content WHERE status = 'published'" + (all ? '' : ' AND type = ?1') + ' ORDER BY created_at DESC LIMIT 1000';
  const stmt = all ? env.DB.prepare(sql) : env.DB.prepare(sql).bind(kind(t));
  return json((await stmt.all()).results.map((r) => rowToItem(r, false)), 200, CACHE);
});
