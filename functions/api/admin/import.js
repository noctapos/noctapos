/* POST /api/admin/import   body: array konten (format dari tombol "Ekspor JSON")
   Menimpa konten SEJENIS yang ada di server: kalau cadangan hanya berisi artikel, panduan tidak disentuh (dan sebaliknya).
   Semua langkah berjalan dalam satu batch (atomik): gagal di tengah = tidak ada yang berubah. */
import { HttpError, handle, json, kind, readJson, buildRecord, ensureCatStmt, minutesOf, newId } from '../../_lib/shared.js';

const INSERT = 'INSERT INTO content (id,type,slug,title,category,tags,excerpt,cover,cover_alt,cover_pos,grad,html,minutes,popular,status,legacy_url,meta_title,meta_desc,created_at,updated_at) ' +
  'VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20)';

export const onRequestPost = ({ request, env }) => handle(async () => {
  const arr = await readJson(request, 4_000_000);
  if (!Array.isArray(arr) || !arr.length || arr.length > 300) throw new HttpError(400, 'Format salah, kosong, atau lebih dari 300 entri.');

  const types = new Set(), usedSlugs = new Set(), usedIds = new Set(), stmts = [], cats = [];
  const rows = [];
  for (let i = 0; i < arr.length; i++) {
    const x = arr[i];
    const type = kind(x && x.type);
    let rec;
    try { rec = await buildRecord(x, type); }
    catch (e) { throw new HttpError(400, 'Entri ke-' + (i + 1) + ': ' + (e.message || 'tidak valid')); }

    let slug = rec.slug, n = 2;
    while (usedSlugs.has(type + '|' + slug)) slug = rec.slug.slice(0, 90) + '-' + n++;
    usedSlugs.add(type + '|' + slug);

    let id = /^[a-z][a-z0-9]{0,40}$/i.test(String(x.id || '')) ? String(x.id) : newId(type);
    while (usedIds.has(id)) id = newId(type);
    usedIds.add(id);

    const created = Date.parse(x.createdAt) ? new Date(x.createdAt).toISOString() : new Date().toISOString();
    const updated = Date.parse(x.updatedAt) ? new Date(x.updatedAt).toISOString() : '';
    const minutes = rec.html ? minutesOf(rec.html) : (Number(x.minutes) > 0 ? Number(x.minutes) | 0 : 3);
    types.add(type);
    rows.push([id, type, slug, rec.title, rec.category, JSON.stringify(rec.tags), rec.excerpt, rec.cover, rec.cover_alt, rec.cover_pos, rec.grad,
      rec.html, minutes, rec.popular, rec.status, rec.html ? '' : rec.legacy_url, rec.meta_title, rec.meta_desc, created, updated]);
    cats.push([type, rec.category]);
  }

  types.forEach((t) => stmts.push(env.DB.prepare('DELETE FROM content WHERE type = ?1').bind(t)));
  rows.forEach((r) => stmts.push(env.DB.prepare(INSERT).bind(...r)));
  cats.forEach(([t, c]) => stmts.push(ensureCatStmt(env.DB, t, c)));
  await env.DB.batch(stmts);
  return json({ count: rows.length });
});
