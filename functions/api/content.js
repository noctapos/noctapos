/* Semua rute di sini dijaga _middleware.js (JWT Access).
   GET    /api/admin/content?type=all|artikel|panduan   -> semua konten (termasuk draft + html)
   GET    /api/admin/content?id=xxx                     -> satu konten (atau null)
   POST   /api/admin/content            body: objek konten tanpa id -> buat baru
   PUT    /api/admin/content?id=xxx     body: objek konten          -> ubah
   DELETE /api/admin/content?id=xxx                                 -> hapus */
import { HttpError, handle, json, kind, readJson, buildRecord, rowToItem, uniqueSlug, ensureCatStmt, minutesOf, newId } from '../../_lib/shared.js';

const INSERT = 'INSERT INTO content (id,type,slug,title,category,tags,excerpt,cover,cover_alt,cover_pos,grad,html,minutes,popular,status,legacy_url,meta_title,meta_desc,created_at,updated_at) ' +
  'VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15,?16,?17,?18,?19,?20)';

const UPDATE = 'UPDATE content SET slug=?2,title=?3,category=?4,tags=?5,excerpt=?6,cover=?7,cover_alt=?8,cover_pos=?9,grad=?10,html=?11,minutes=?12,popular=?13,status=?14,legacy_url=?15,meta_title=?16,meta_desc=?17,updated_at=?18 WHERE id=?1';

export const onRequestGet = ({ request, env }) => handle(async () => {
  const u = new URL(request.url);
  const id = u.searchParams.get('id');
  if (id) {
    const row = await env.DB.prepare('SELECT * FROM content WHERE id = ?1').bind(id).first();
    return json(row ? rowToItem(row, true) : null);
  }
  const t = u.searchParams.get('type');
  const sql = 'SELECT * FROM content' + (t === 'artikel' || t === 'panduan' ? ' WHERE type = ?1' : '') + ' ORDER BY created_at DESC LIMIT 2000';
  const stmt = t === 'artikel' || t === 'panduan' ? env.DB.prepare(sql).bind(t) : env.DB.prepare(sql);
  return json((await stmt.all()).results.map((r) => rowToItem(r, true)));
});

export const onRequestPost = ({ request, env }) => handle(async () => {
  const body = await readJson(request);
  const type = kind(body && body.type);
  const rec = await buildRecord(body, type);
  if (rec.status === 'published' && !rec.html) throw new HttpError(400, 'Isi konten masih kosong.');
  rec.slug = await uniqueSlug(env.DB, type, rec.slug, '');
  const now = new Date().toISOString();
  const id = newId(type);
  const minutes = rec.html ? minutesOf(rec.html) : (Number(body.minutes) > 0 ? Number(body.minutes) | 0 : 3);

  await env.DB.batch([
    env.DB.prepare(INSERT).bind(id, type, rec.slug, rec.title, rec.category, JSON.stringify(rec.tags), rec.excerpt, rec.cover, rec.cover_alt, rec.cover_pos,
      rec.grad, rec.html, minutes, rec.popular, rec.status, '', rec.meta_title, rec.meta_desc, now, now),
    ensureCatStmt(env.DB, type, rec.category)
  ]);
  const row = await env.DB.prepare('SELECT * FROM content WHERE id = ?1').bind(id).first();
  return json(rowToItem(row, true), 201);
});

export const onRequestPut = ({ request, env }) => handle(async () => {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) throw new HttpError(400, 'id wajib diisi.');
  const old = await env.DB.prepare('SELECT * FROM content WHERE id = ?1').bind(id).first();
  if (!old) throw new HttpError(404, 'Konten tidak ditemukan.');

  const body = await readJson(request);
  const rec = await buildRecord(body, old.type); /* tipe tidak bisa diubah setelah dibuat */
  /* isi baru -> halaman dinamis; isi kosong -> tetap pakai halaman statis lama (kalau ada) */
  const legacy = rec.html ? '' : old.legacy_url;
  if (rec.status === 'published' && !rec.html && !legacy) throw new HttpError(400, 'Isi konten masih kosong.');
  rec.slug = await uniqueSlug(env.DB, old.type, rec.slug, id);
  const minutes = rec.html ? minutesOf(rec.html) : (old.minutes || 3);

  await env.DB.batch([
    env.DB.prepare(UPDATE).bind(id, rec.slug, rec.title, rec.category, JSON.stringify(rec.tags), rec.excerpt, rec.cover, rec.cover_alt, rec.cover_pos,
      rec.grad, rec.html, minutes, rec.popular, rec.status, legacy, rec.meta_title, rec.meta_desc, new Date().toISOString()),
    ensureCatStmt(env.DB, old.type, rec.category)
  ]);
  const row = await env.DB.prepare('SELECT * FROM content WHERE id = ?1').bind(id).first();
  return json(rowToItem(row, true));
});

export const onRequestDelete = ({ request, env }) => handle(async () => {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) throw new HttpError(400, 'id wajib diisi.');
  await env.DB.prepare('DELETE FROM content WHERE id = ?1').bind(id).run();
  return json({ ok: true });
});
