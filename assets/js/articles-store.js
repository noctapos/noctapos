/* NoctaPOS — penyimpanan artikel + panduan pengguna (field `type`: 'artikel' | 'panduan').
   MODE LIVE: data disimpan di Cloudflare D1 lewat /api/*. Nama fungsi dan bentuk data sama dengan versi localStorage,
   jadi admin.js dan articles-ui.js tidak perlu diubah.
   - Halaman publik membaca /api/content dan /api/categories (hanya konten terbit).
   - Halaman admin memakai /api/admin/* (dijaga Cloudflare Access + verifikasi JWT di server). */
(function (w) {
  'use strict';
  var ADMIN = /\/admin(\.html)?\/?$/i.test(location.pathname);
  var snapshot = []; /* salinan seluruh konten, hanya di admin, supaya exportJson() tetap sinkron */

  function api(path, opt) {
    opt = opt || {};
    var init = { method: opt.method || 'GET', credentials: 'same-origin', headers: {} };
    if (path.indexOf('/api/admin/') === 0) init.cache = 'no-store';
    if (opt.body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opt.body); }
    return fetch(path, init).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
        if (!r.ok) throw new Error((j && j.error) || (r.status === 401 || r.status === 403 ? 'Sesi login habis atau tidak punya akses. Muat ulang halaman.' : 'Gagal (' + r.status + ').'));
        return j;
      });
    }, function () { throw new Error('Tidak bisa terhubung ke server. Jika sesi login habis, muat ulang halaman.'); });
  }
  function q(o) { return Object.keys(o).map(function (k) { return k + '=' + encodeURIComponent(o[k]); }).join('&'); }
  function kind(t) { return t === 'panduan' ? 'panduan' : 'artikel'; }
  function keep(item) {
    var i = -1; snapshot.forEach(function (x, n) { if (x.id === item.id) i = n; });
    if (i < 0) snapshot.unshift(item); else snapshot[i] = item;
  }

  var S = {
    /* list({published, type}) — type: 'artikel' (default) | 'panduan' | 'all'. Tanpa published = semua termasuk draft (admin). */
    list: function (o) {
      var t = (o && o.type) || 'artikel';
      if (o && o.published) return api('/api/content?' + q({ type: t }));
      return api('/api/admin/content?' + q({ type: t })).then(function (items) {
        if (t === 'all') snapshot = items.slice();
        return items;
      });
    },
    getBySlug: function (slug, type) { return api('/api/content?' + q({ type: kind(type), slug: slug })); },
    getById: function (id) { return api('/api/admin/content?' + q({ id: id })); },
    save: function (art) {
      art.type = kind(art.type);
      var req = art.id
        ? api('/api/admin/content?' + q({ id: art.id }), { method: 'PUT', body: art })
        : api('/api/admin/content', { method: 'POST', body: art });
      return req.then(function (item) { keep(item); return item; });
    },
    remove: function (id) {
      return api('/api/admin/content?' + q({ id: id }), { method: 'DELETE' }).then(function () {
        snapshot = snapshot.filter(function (x) { return x.id !== id; });
      });
    },
    /* ===== Kategori. type: 'artikel' | 'panduan' ===== */
    cats: function (type) { return api((ADMIN ? '/api/admin/categories?' : '/api/categories?') + q({ type: kind(type) })); },
    addCat: function (type, name) {
      return api('/api/admin/categories', { method: 'POST', body: { type: kind(type), name: name } }).then(function (r) { return r.name; });
    },
    removeCat: function (type, name) {
      return api('/api/admin/categories?' + q({ type: kind(type), name: name }), { method: 'DELETE' }).then(function () {});
    },
    renameCat: function (type, from, to) {
      return api('/api/admin/categories', { method: 'PUT', body: { type: kind(type), from: from, to: to } }).then(function (r) { return r.name; });
    },
    /* Ekspor: memakai salinan dari daftar admin terakhir (admin selalu memuat daftar saat dibuka dan setiap selesai simpan/hapus) */
    exportJson: function () { return JSON.stringify(snapshot, null, 2); },
    importJson: function (txt) {
      var a = JSON.parse(txt);
      if (!Array.isArray(a)) throw new Error('Format salah.');
      return api('/api/admin/import', { method: 'POST', body: a }).then(function (r) { return r.count; });
    }
  };
  w.ArticleStore = S;
})(window);
