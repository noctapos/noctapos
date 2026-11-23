/* Galeri gambar. Gambar disimpan di D1 (base64) dan disajikan lewat /media/<id>.<ext>. Dijaga _middleware.js.
   GET    /api/admin/media                                   -> daftar gambar (tanpa data)
   POST   /api/admin/media  {name, w, h, data(base64)}       -> unggah (browser sudah mengecilkan + mengompres gambarnya)
   DELETE /api/admin/media?id=xxx                            -> hapus (ditolak kalau masih dipakai konten) */
import { HttpError, handle, json, readJson, slugify } from '../../_lib/shared.js';

const EXT = { 'image/webp': 'webp', 'image/jpeg': 'jpg', 'image/png': 'png' };
const MAX_BYTES = 500_000, MAX_ITEMS = 1000, MAX_TOTAL = 250_000_000;   /* total gambar (sebelum base64) dibatasi supaya database gratis (500 MB) tidak penuh */
const urlOf = (id, mime) => '/media/' + id + '.' + EXT[mime];

/* Jenis file ditentukan dari isinya (magic bytes), bukan dari "mime" kiriman klien. SVG/HTML otomatis ditolak. */
function sniff(b64) {
  const h = atob(b64.slice(0, 24)), c = (i) => h.charCodeAt(i);
  if (c(0) === 0xFF && c(1) === 0xD8 && c(2) === 0xFF) return 'image/jpeg';
  if (c(0) === 0x89 && h.slice(1, 4) === 'PNG') return 'image/png';
  if (h.slice(0, 4) === 'RIFF' && h.slice(8, 12) === 'WEBP') return 'image/webp';
  return '';
}

export const onRequestGet = ({ env }) => handle(async () => {
  const { results } = await env.DB.prepare('SELECT id, mime, bytes, w, h, name, created_at FROM media ORDER BY created_at DESC LIMIT 300').all();
  return json(results.map((r) => ({ id: r.id, url: urlOf(r.id, r.mime), bytes: r.bytes, w: r.w, h: r.h, name: r.name, createdAt: r.created_at })));
});

export const onRequestPost = ({ request, env }) => handle(async () => {
  const b = await readJson(request, 1_000_000);
  const data = String(b && b.data || '').replace(/\s+/g, '');
  if (data.length < 32 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new HttpError(400, 'Data gambar tidak valid.');
  const bytes = Math.floor(data.length * 3 / 4) - (data.endsWith('==') ? 2 : data.endsWith('=') ? 1 : 0);
  if (bytes > MAX_BYTES) throw new HttpError(413, 'Gambar masih terlalu besar setelah dikompres (maks. 500 KB). Coba gambar yang lebih kecil.');
  const mime = sniff(data);
  if (!mime) throw new HttpError(400, 'Format harus WebP, JPEG, atau PNG.');
  const tot = await env.DB.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(bytes), 0) AS s FROM media').first();
  if (tot.n >= MAX_ITEMS) throw new HttpError(409, 'Galeri penuh (maks. ' + MAX_ITEMS + ' gambar). Hapus yang tidak terpakai dulu.');
  if (tot.s + bytes > MAX_TOTAL) throw new HttpError(409, 'Penyimpanan galeri penuh (maks. 250 MB). Hapus gambar yang tidak terpakai dulu.');

  const dim = (v) => Math.min(8000, Math.max(1, Number(v) | 0));
  const base = slugify(String(b.name || '').replace(/\.[a-z0-9]{2,5}$/i, '')).slice(0, 40) || 'gambar';
  const now = new Date().toISOString();
  let id = '', tries = 0;
  for (;;) {
    id = base + '-' + Array.from(crypto.getRandomValues(new Uint8Array(3)), (x) => x.toString(16).padStart(2, '0')).join('');
    try {
      await env.DB.prepare('INSERT INTO media (id,mime,bytes,w,h,name,data,created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)')
        .bind(id, mime, bytes, dim(b.w), dim(b.h), String(b.name || '').slice(0, 100), data, now).run();
      break;
    } catch (e) { if (++tries > 3) throw e; }
  }
  return json({ id, url: urlOf(id, mime), bytes, w: dim(b.w), h: dim(b.h) }, 201);
});

export const onRequestDelete = ({ request, env }) => handle(async () => {
  const id = String(new URL(request.url).searchParams.get('id') || '');
  if (!/^[a-z0-9][a-z0-9-]{0,60}$/.test(id)) throw new HttpError(400, 'id tidak valid.');
  /* instr(), bukan LIKE: D1 membatasi pola LIKE maksimal 50 byte, sedangkan id gambar bisa lebih panjang */
  const needle = '/media/' + id + '.';
  const used = (await env.DB.prepare('SELECT COUNT(*) AS n FROM content WHERE instr(cover, ?1) > 0 OR instr(html, ?1) > 0').bind(needle).first()).n;
  if (used) throw new HttpError(409, 'Gambar masih dipakai ' + used + ' konten. Ganti gambarnya di konten itu dulu.');
  await env.DB.prepare('DELETE FROM media WHERE id = ?1').bind(id).run();
  return json({ ok: true });
});
