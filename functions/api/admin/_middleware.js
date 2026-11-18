/* Gerbang untuk SEMUA /api/admin/*.
   Tidak percaya begitu saja pada header: JWT dari Cloudflare Access diverifikasi (tanda tangan RS256, issuer, audience, kedaluwarsa).
   Variabel yang dibutuhkan (Pages > Settings > Variables):
     TEAM_DOMAIN  = namatim.cloudflareaccess.com
     POLICY_AUD   = "Application Audience (AUD) Tag" dari aplikasi Access
     ADMIN_EMAILS = (opsional) daftar email dipisah koma, lapisan tambahan di atas policy Access
   Khusus pengembangan lokal: DEV_BYPASS_AUTH=1 di .dev.vars (hanya berlaku di localhost). */
import { json } from '../../_lib/shared.js';

const NOSTORE = { 'Cache-Control': 'no-store', 'X-Robots-Tag': 'noindex' };
let JWKS = { at: 0, keys: [] };

function b64u(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}
const dec = (s) => JSON.parse(new TextDecoder().decode(b64u(s)));

async function getKeys(team, force) {
  if (!force && JWKS.keys.length && Date.now() - JWKS.at < 3600_000) return JWKS.keys;
  const r = await fetch('https://' + team + '/cdn-cgi/access/certs');
  if (!r.ok) throw new Error('jwks ' + r.status);
  JWKS = { at: Date.now(), keys: (await r.json()).keys || [] };
  return JWKS.keys;
}

async function verifyJwt(token, env) {
  const p = token.split('.');
  if (p.length !== 3) throw new Error('format');
  const header = dec(p[0]), payload = dec(p[1]);
  if (header.alg !== 'RS256') throw new Error('alg');
  let jwk = (await getKeys(env.TEAM_DOMAIN)).find((k) => k.kid === header.kid);
  if (!jwk) jwk = (await getKeys(env.TEAM_DOMAIN, true)).find((k) => k.kid === header.kid);
  if (!jwk) throw new Error('kid');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64u(p[2]), new TextEncoder().encode(p[0] + '.' + p[1]));
  if (!ok) throw new Error('signature');
  const now = Date.now() / 1000;
  if (typeof payload.exp !== 'number' || payload.exp < now) throw new Error('expired');
  if (payload.nbf && payload.nbf > now + 60) throw new Error('nbf');
  if (payload.iss !== 'https://' + env.TEAM_DOMAIN) throw new Error('iss');
  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(env.POLICY_AUD)) throw new Error('aud');
  return payload;
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const local = /^(localhost|127\.0\.0\.1)$/.test(url.hostname) && env.DEV_BYPASS_AUTH === '1';

  if (!local) {
    if (!env.TEAM_DOMAIN || !env.POLICY_AUD) return json({ error: 'Server belum dikonfigurasi (TEAM_DOMAIN / POLICY_AUD).' }, 500, NOSTORE);
    const token = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!token) return json({ error: 'Belum login.' }, 401, NOSTORE);
    let payload;
    try { payload = await verifyJwt(token, env); }
    catch (e) { return json({ error: 'Akses ditolak.' }, 403, NOSTORE); }
    if (env.ADMIN_EMAILS) {
      const allow = env.ADMIN_EMAILS.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
      if (allow.length && !allow.includes(String(payload.email || '').toLowerCase())) return json({ error: 'Akses ditolak.' }, 403, NOSTORE);
    }
  }

  /* Perlindungan CSRF untuk operasi tulis: harus same-origin dan berbentuk JSON. */
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
