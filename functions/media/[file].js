/* GET /media/<id>.webp|jpg|png — menyajikan gambar dari D1.
   Nama file unik dan tidak pernah berubah, jadi di-cache 1 tahun (browser + cache Cloudflare). */
export async function onRequest({ request, env, params, waitUntil }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Metode tidak diizinkan.', { status: 405, headers: { Allow: 'GET, HEAD' } });
  const m = /^([a-z0-9][a-z0-9-]{0,60})\.(webp|jpe?g|png)$/i.exec(String(params.file || ''));
  if (!m) return new Response('Tidak ditemukan.', { status: 404 });
  const id = m[1].toLowerCase();

  const cache = caches.default, key = new Request(new URL(request.url).origin + '/media/' + id + '.' + m[2].toLowerCase());
  const hit = await cache.match(key);
  if (hit) return hit;

  let row;
  try { row = await env.DB.prepare('SELECT mime, data FROM media WHERE id = ?1').bind(id).first(); }
  catch (e) { console.error('media:', e && e.stack ? e.stack : e); return new Response('Sementara tidak tersedia.', { status: 503, headers: { 'Retry-After': '60' } }); }
  if (!row) return new Response('Tidak ditemukan.', { status: 404, headers: { 'Cache-Control': 'public, max-age=60' } });

  const bin = atob(row.data), u = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const res = new Response(u, { headers: {
    'Content-Type': row.mime, 'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'", 'Cross-Origin-Resource-Policy': 'cross-origin'
  } });
  waitUntil(cache.put(key, res.clone()));
  return res;
}
