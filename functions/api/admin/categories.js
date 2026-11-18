/* Dijaga _middleware.js.
   GET    /api/admin/categories?type=artikel|panduan            -> daftar kategori (termasuk yang dipakai draft)
   POST   /api/admin/categories        {type, name}             -> tambah (kalau sudah ada, dikembalikan nama yang ada)
   PUT    /api/admin/categories        {type, from, to}         -> ubah nama (digabung kalau nama baru sudah ada)
   DELETE /api/admin/categories?type=..&name=..                 -> hapus (ditolak kalau masih dipakai konten) */
import { HttpError, handle, json, kind, readJson, listCats, ensureCatStmt, cleanCat } from '../../_lib/shared.js';

export const onRequestGet = ({ request, env }) => handle(async () => {
  const type = kind(new URL(request.url).searchParams.get('type'));
  return json(await listCats(env.DB, type, false));
});

export const onRequestPost = ({ request, env }) => handle(async () => {
  const b = await readJson(request, 10_000);
  const type = kind(b.type), name = cleanCat(b.name);
  if (!name) throw new HttpError(400, 'Nama kategori kosong.');
  const existing = (await listCats(env.DB, type, false)).find((x) => x.toLowerCase() === name.toLowerCase());
  if (existing) return json({ name: existing });
  await ensureCatStmt(env.DB, type, name).run();
  return json({ name }, 201);
});

export const onRequestPut = ({ request, env }) => handle(async () => {
  const b = await readJson(request, 10_000);
  const type = kind(b.type), from = cleanCat(b.from), to = cleanCat(b.to);
  if (!from || !to) throw new HttpError(400, 'Nama kategori kosong.');
  await env.DB.batch([
    env.DB.prepare('UPDATE content SET category = ?3, updated_at = ?4 WHERE type = ?1 AND category = ?2').bind(type, from, to, new Date().toISOString()),
    env.DB.prepare('DELETE FROM categories WHERE type = ?1 AND name = ?2').bind(type, from),
    ensureCatStmt(env.DB, type, to)
  ]);
  return json({ name: to });
});

export const onRequestDelete = ({ request, env }) => handle(async () => {
  const u = new URL(request.url);
  const type = kind(u.searchParams.get('type')), name = cleanCat(u.searchParams.get('name'));
  if (!name) throw new HttpError(400, 'Nama kategori kosong.');
  const used = (await env.DB.prepare('SELECT COUNT(*) AS n FROM content WHERE type = ?1 AND category = ?2').bind(type, name).first()).n;
  if (used) throw new HttpError(409, 'Kategori masih dipakai ' + used + ' konten. Pindahkan atau ubah namanya dulu.');
  await env.DB.prepare('DELETE FROM categories WHERE type = ?1 AND name = ?2').bind(type, name).run();
  return json({ ok: true });
});
