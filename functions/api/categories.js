/* PUBLIK, hanya baca.
   GET /api/categories?type=artikel|panduan -> kategori yang dipakai konten terbit */
import { handle, json, kind, listCats } from '../_lib/shared.js';

export const onRequestGet = ({ request, env }) => handle(async () => {
  const type = kind(new URL(request.url).searchParams.get('type'));
  return json(await listCats(env.DB, type, true), 200, { 'Cache-Control': 'public, max-age=60' });
});
