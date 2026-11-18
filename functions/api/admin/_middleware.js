/* Gerbang untuk SEMUA /api/admin/*.
   Variabel (Pages > Settings > Variables and Secrets, Production DAN Preview):
     ADMIN_EMAILS   = email1@x.com,email2@x.com
     ADMIN_SECRET   = password login (Secret)
     SESSION_SECRET = kunci tanda tangan sesi, >= 32 karakter, BEDA dari password (Secret)
   Binding D1: DB (tabel login_attempts dipakai untuk pembatas percobaan login). */
import { json } from '../../_lib/shared.js';

const NOSTORE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
const SESSION_TTL = 8 * 3600;
const MAX_FAILS = 5, WINDOW = 15 * 60;
const enc = new TextEncoder();

const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function hmac(text, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}
function safeEq(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}
/* hash dulu supaya panjang sama, lalu bandingkan constant-time */
async function sameText(a, b) {
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  return safeEq(hex(x), hex(y));
}

async function handleLogin(request, env, url) {
  if (request.method === 'DELETE') {
    const out = json({ ok: true }, 200, NOSTORE);
    out.headers.append('Set-Cookie', 'nocta_sess=; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=0');
    return out;
  }
  if (request.method !== 'POST') return json({ error: 'Metode tidak diizinkan.' }, 405, NOSTORE);
  if (request.headers.get('Origin') !== url.origin) return json({ error: 'Origin tidak valid.' }, 403, NOSTORE);

  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const now = Math.floor(Date.now() / 1000);
  await env.DB.prepare('DELETE FROM login_attempts WHERE at < ?1').bind(now - WINDOW).run();
  const fails = (await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE ip = ?1').bind(ip).first()).n;
  if (fails >= MAX_FAILS) return json({ error: 'Terlalu banyak percobaan gagal. Coba lagi 15 menit lagi.' }, 429, NOSTORE);

  let body;
  try { body = await request.json(); } catch (e) { return json({ error: 'Format salah.' }, 400, NOSTORE); }
  const email = String(body && body.email || '').trim().toLowerCase();
  const password = String(body && body.password || '');
  const allowed = (env.ADMIN_EMAILS || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

  const okEmail = allowed.includes(email);
  const okPass = await sameText(password, env.ADMIN_SECRET);   /* selalu dihitung, apa pun hasil email */
  if (!okEmail || !okPass) {
    await env.DB.prepare('INSERT INTO login_attempts (ip, at) VALUES (?1, ?2)').bind(ip, now).run();
    await sleep(700);
    return json({ error: 'Email atau password salah.' }, 401, NOSTORE);
  }

  await env.DB.prepare('DELETE FROM login_attempts WHERE ip = ?1').bind(ip).run();
  const data = 'admin.' + (now + SESSION_TTL);
  const out = json({ ok: true }, 200, NOSTORE);
  out.headers.append('Set-Cookie',
    'nocta_sess=' + data + '.' + (await hmac(data, env.SESSION_SECRET)) +
    '; HttpOnly; Secure; SameSite=Strict; Path=/api/admin; Max-Age=' + SESSION_TTL);
  return out;
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);

  if (!env.ADMIN_SECRET || !env.SESSION_SECRET || env.SESSION_SECRET.length < 32 || !env.DB) {
    return json({ error: 'Server belum dikonfigurasi.' }, 500, NOSTORE);
  }

  if (url.pathname.replace(/\/+$/, '') === '/api/admin/login') return handleLogin(request, env, url);

  /* verifikasi cookie sesi */
  const m = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)nocta_sess=([^;]+)/);
  let ok = false;
  if (m) {
    const p = m[1].split('.');
    if (p.length === 3 && p[0] === 'admin') {
      const exp = parseInt(p[1], 10);
      if (exp > Date.now() / 1000 && safeEq(p[2], await hmac(p[0] + '.' + p[1], env.SESSION_SECRET))) ok = true;
    }
  }
  if (!ok) return json({ error: 'Akses ditolak.' }, 401, NOSTORE);

  /* proteksi CSRF untuk semua yang mengubah data */
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
