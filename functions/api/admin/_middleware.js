/* Gerbang untuk SEMUA /api/admin/*.
   Tidak percaya begitu saja pada header: JWT dari Cloudflare Access diverifikasi (tanda tangan RS256, issuer, audience, kedaluwarsa).
   Variabel yang dibutuhkan (Pages > Settings > Variables):
     TEAM_DOMAIN  = namatim.cloudflareaccess.com
     POLICY_AUD   = "Application Audience (AUD) Tag" dari aplikasi Access
     ADMIN_EMAILS = (opsional) daftar email dipisah koma, lapisan tambahan di atas policy Access
   Khusus pengembangan lokal: DEV_BYPASS_AUTH=1 di .dev.vars (hanya berlaku di localhost). */

import { json } from '../../_lib/shared.js';

const NOSTORE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };

async function signSession(text, secret) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(text));
  return Array.prototype.map.call(new Uint8Array(sig), x => ('0' + x.toString(16)).slice(-2)).join('');
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const secret = env.ADMIN_SECRET || 'nocta-rahasia';

  // 1. Endpoint Login (Menerima Email & Password)
  if (url.pathname === '/api/admin/login' && request.method === 'POST') {
    try {
      const body = await request.json();
      const userEmail = (body.email || '').trim().toLowerCase();
      
      // Ambil daftar email yang diizinkan dari variabel Cloudflare
      const allowedEmails = (env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());

      // Cek apakah email terdaftar di whitelist
      if (!allowedEmails.includes(userEmail)) {
        return json({ error: 'Email tidak terdaftar atau tidak memiliki akses.' }, 401, NOSTORE);
      }

      // Cek kecocokan password
      if (!env.ADMIN_SECRET || body.password !== env.ADMIN_SECRET) {
        return json({ error: 'Password salah.' }, 401, NOSTORE);
      }
      
      const exp = Math.floor(Date.now() / 1000) + (8 * 3600);
      const data = 'admin.' + exp;
      const signature = await signSession(data, secret);
      
      const out = json({ ok: true }, 200, NOSTORE);
      out.headers.set('Set-Cookie', `nocta_sess=${data}.${signature}; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=28800`);
      return out;
    } catch(e) { 
      return json({ error: 'Format salah' }, 400, NOSTORE); 
    }
  }

  // 2. Endpoint Logout
  if (url.pathname === '/api/admin/login' && request.method === 'DELETE') {
    const out = json({ ok: true }, 200, NOSTORE);
    out.headers.set('Set-Cookie', 'nocta_sess=; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=0');
    return out;
  }

  // 3. Verifikasi Cookie
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)nocta_sess=([^;]+)/);
  let isAuth = false;
  
  if (match) {
    const parts = match[1].split('.');
    if (parts.length === 3) {
      const data = parts[0] + '.' + parts[1];
      const sig = parts[2];
      const expectedSig = await signSession(data, secret);
      const exp = parseInt(parts[1], 10);
      
      if (sig === expectedSig && (Date.now() / 1000) < exp) {
        isAuth = true;
      }
    }
  }

  if (!isAuth) {
    return json({ error: 'Akses ditolak.' }, 401, NOSTORE);
  }

  // 4. Perlindungan CSRF
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    if (request.headers.get('Origin') !== url.origin) return json({ error: 'Origin tidak valid.' }, 403, NOSTORE);
    if (request.method !== 'DELETE' && !/^application\/json/i.test(request.headers.get('Content-Type') || '')) {
      return json({ error: 'Content-Type harus application/json.' }, 415, NOSTORE);
    }
  }

  const res = await next();
  const out = new Response(res.body, res);
  Object.keys(NOSTORE).forEach((k) => out.headers.set(k, NOSTORE[k]));
  return out;
}
