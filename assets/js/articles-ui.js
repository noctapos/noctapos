/* NoctaPOS — tampilan artikel: home (3 terbaru), daftar + filter, dan halaman detail. Dimuat SETELAH site.js. */
(function () {
  'use strict';
  var S = window.ArticleStore; if (!S) return;
  var $ = function (s) { return document.querySelector(s); };
  var ICON = ['M4 2h8v12H4zM6 5h4M6 8h4', 'M2 5l6-3 6 3v7l-6 3-6-3zM2 5l6 3 6-3M8 8v7', 'M2 6l1-3h10l1 3v1a2 2 0 01-4 0 2 2 0 01-4 0 2 2 0 01-4 0zM3 9v5h10V9', 'M3 13V7M8 13V3M13 13V9', 'M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v3l2 1', 'M2 8h12M8 2v12'];
  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function tgl(i) { var d = new Date(i); return d.getDate() + ' ' + BLN[d.getMonth()] + ' ' + d.getFullYear(); }
  function menit(a) { return a.minutes || Math.max(1, Math.round((a.html || '').replace(/<[^>]*>/g, ' ').trim().split(/\s+/).length / 200)); }
  function href(a) { return a.legacyUrl || 'detail.html?slug=' + encodeURIComponent(a.slug); }
  function cover(a) {
    if (/^https?:\/\//i.test(a.cover || '')) return '<div class="am-img"><img src="' + esc(a.cover) + '" alt="" loading="lazy" style="width:100%;height:100%;object-fit:cover"></div>';
    var g = (a.grad | 0) % 6;
    return '<div class="am-img g' + g + '"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width=".7" stroke-linecap="round" stroke-linejoin="round"><path d="' + ICON[g] + '"/></svg></div>';
  }
  function card(a, big) {
    var tg = (big ? ['Pilihan Editor'] : a.tags && a.tags.length ? a.tags : [a.category]).slice(0, 2).map(function (t, i) { return '<span class="tg t' + (i + (a.grad | 0)) % 5 + '">' + esc(t) + '</span>'; }).join('');
    return '<a class="am-card' + (big === true ? ' big' : '') + '" href="' + esc(href(a)) + '" data-cat="' + esc(a.category) + '">' + cover(a) + '<div class="am-body"><div class="am-tags">' + tg + '</div><h3>' + esc(a.title) + '</h3><p>' + esc(a.excerpt) + '</p><small>' + tgl(a.createdAt) + ' &middot; ' + menit(a) + ' menit baca</small></div></a>';
  }
  function clean(html) {
    var OK = { P: 1, BR: 1, H2: 1, H3: 1, H4: 1, STRONG: 1, B: 1, EM: 1, I: 1, U: 1, S: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, A: 1, PRE: 1, CODE: 1 };
    var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    (function walk(n) {
      Array.prototype.slice.call(n.children).forEach(function (c) {
        walk(c);
        if (!OK[c.tagName]) { if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED)$/.test(c.tagName)) c.remove(); else c.replaceWith.apply(c, c.childNodes); return; }
        Array.prototype.slice.call(c.attributes).forEach(function (at) { if (!(c.tagName === 'A' && at.name === 'href')) c.removeAttribute(at.name); });
        if (c.tagName === 'A') { var h = c.getAttribute('href') || ''; if (!/^(https?:|mailto:|\/|#)/i.test(h)) c.removeAttribute('href'); c.setAttribute('rel', 'noopener nofollow'); c.setAttribute('target', '_blank'); }
      });
    })(doc.body);
    return doc.body.innerHTML;
  }

  var home = $('#homeArticles');
  if (home) S.list({ published: true }).then(function (l) { if (l.length) home.innerHTML = l.slice(0, 3).map(function (a) { return card(a); }).join(''); });

  var grid = $('#blogGrid');
  if (grid) S.list({ published: true }).then(function (l) {
    var chips = $('#blogChips'), empty = $('#blogEmpty'), feat = $('#blogFeatured');
    var cats = ['Kas & Keuangan', 'Stok & Kulakan', 'Tim & Absensi', 'Fitur & Panduan'];
    l.forEach(function (a) { if (a.category && cats.indexOf(a.category) < 0) cats.push(a.category); });
    function show(c) {
      var f = l.filter(function (a) { return c === 'Semua' || a.category === c; });
      grid.innerHTML = f.map(function (a) { return card(a); }).join('');
      if (feat) feat.innerHTML = l.length && (c === 'Semua' || l[0].category === c) ? card(l[0], true) : '';
      empty.hidden = f.length > 0;
      Array.prototype.forEach.call(chips.children, function (b) { b.classList.toggle('on', b.textContent === c); });
    }
    chips.innerHTML = ['Semua'].concat(cats).map(function (c) { return '<button type="button" class="chip">' + esc(c) + '</button>'; }).join('');
    chips.addEventListener('click', function (e) { if (e.target.classList.contains('chip')) show(e.target.textContent); });
    show('Semua');
  });

  var root = $('#postRoot');
  if (root) {
    var slug = new URLSearchParams(location.search).get('slug') || '';
    S.getBySlug(slug).then(function (a) {
      if (!a) { root.innerHTML = '<div class="post"><p class="crumb"><a href="artikel.html">&lsaquo; Semua artikel</a></p><h1>Artikel tidak ditemukan</h1><p>Artikel yang kamu cari belum ada atau sudah dihapus.</p></div>'; return; }
      document.title = a.title + ' — NoctaPOS';
      var md = document.querySelector('meta[name=description]'); if (md) md.content = a.excerpt;
      var tg = (a.tags || []).map(function (t, i) { return '<span class="tg t' + (i + (a.grad | 0)) % 5 + '">' + esc(t) + '</span>'; }).join('');
      root.innerHTML = '<article class="post"><p class="crumb"><a href="artikel.html">&lsaquo; Semua artikel</a></p><div class="am-tags" style="justify-content:flex-start;margin-top:14px">' + tg + '</div><h1>' + esc(a.title) + '</h1><p class="meta">' + tgl(a.createdAt) + ' &middot; ' + menit(a) + ' menit baca</p>' + cover(a) + '<p class="lead">' + esc(a.excerpt) + '</p>' + clean(a.html) +
        '<div class="post-cta"><div><b style="font-size:20px">Coba NoctaPOS gratis</b><p style="font-size:15px;opacity:.8;margin:4px 0 0">Kas cocok, stok jelas, tetap jalan saat offline.</p></div><a data-app="daftar" href="Daftar.html" class="btn btn-em">Coba Gratis &rarr;</a></div><h3 class="rel-h">Artikel lainnya</h3><div class="am-grid" id="relGrid"></div></article>';
      S.list({ published: true }).then(function (l) { $('#relGrid').innerHTML = l.filter(function (x) { return x.id !== a.id; }).slice(0, 3).map(function (a) { return card(a); }).join(''); });
    });
  }
})();
