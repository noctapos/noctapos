/* NoctaPOS — tampilan artikel (home, daftar + filter, detail) dan Panduan Pengguna (hub + detail). Dimuat SETELAH site.js. */
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
    var OK = { P: 1, BR: 1, H2: 1, H3: 1, H4: 1, STRONG: 1, B: 1, EM: 1, I: 1, U: 1, S: 1, UL: 1, OL: 1, LI: 1, BLOCKQUOTE: 1, A: 1, PRE: 1, CODE: 1, IMG: 1 };
    var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    (function walk(n) {
      Array.prototype.slice.call(n.children).forEach(function (c) {
        walk(c);
        if (!OK[c.tagName]) { if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED)$/.test(c.tagName)) c.remove(); else c.replaceWith.apply(c, c.childNodes); return; }
        Array.prototype.slice.call(c.attributes).forEach(function (at) { if (!(c.tagName === 'A' && at.name === 'href') && !(c.tagName === 'IMG' && (at.name === 'src' || at.name === 'alt'))) c.removeAttribute(at.name); });
        if (c.tagName === 'IMG') { if (!/^(https?:\/\/|assets\/)/i.test(c.getAttribute('src') || '')) { c.remove(); return; } c.setAttribute('loading', 'lazy'); }
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

  /* =================== PANDUAN PENGGUNA =================== */
  var GCATS = [
    { n: 'Memulai NoctaPOS', d: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09zM12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2zM9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5' },
    { n: 'Transaksi & Penjualan', d: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4zM3 6h18M16 10a4 4 0 0 1-8 0' },
    { n: 'Laporan & Analitik', d: 'M18 20V10M12 20V4M6 20v-6' },
    { n: 'Pengaturan & Personalisasi', d: 'M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1' },
    { n: 'Bantuan & Pemecahan Masalah', d: 'M3 14v-2a9 9 0 0 1 18 0v2M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z' },
    { n: 'Fitur Lainnya', d: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' }
  ];
  function gIcon(cat) { var c = GCATS.filter(function (x) { return x.n === cat; })[0] || GCATS[5]; return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + c.d + '"/></svg>'; }
  function gHref(a) { return 'panduan-detail.html?slug=' + encodeURIComponent(a.slug); }
  function gCard(a) {
    return '<a class="gd-card" href="' + esc(gHref(a)) + '"><span class="gd-ic">' + gIcon(a.category) + '</span><span class="gd-tx"><small>' + esc(a.category) + '</small><b>' + esc(a.title) + '</b><span>' + esc(a.excerpt) + '</span></span><span class="gd-go" aria-hidden="true">&rarr;</span></a>';
  }
  function gPop(a) {
    var g = (a.grad | 0) % 6;
    var th = /^https?:\/\//i.test(a.cover || '') ? '<img src="' + esc(a.cover) + '" alt="" loading="lazy">' : '<span class="gd-th g' + g + '">' + gIcon(a.category) + '</span>';
    return '<a class="gd-pop" href="' + esc(gHref(a)) + '">' + th + '<span class="gd-pb"><span class="gd-pill">' + gIcon(a.category) + esc(a.category) + '</span><b>' + esc(a.title) + '</b><span class="gd-pm"><span>' + menit(a) + ' menit baca</span><i aria-hidden="true">&rarr;</i></span></span></a>';
  }
  function slugId(t, used) { var s = t.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'bagian', b = s, n = 2; while (used[s]) s = b + '-' + n++; used[s] = 1; return s; }

  var gRoot = $('#gdHub');
  if (gRoot) S.list({ published: true, type: 'panduan' }).then(function (l) {
    var P = new URLSearchParams(location.search), st = { cat: P.get('cat') || '', q: (P.get('q') || '').trim() };
    var cats = $('#gdCats'), list = $('#gdList'), ttl = $('#gdListTitle'), empty = $('#gdEmpty'), inp = $('#gdQ'), track = $('#gdTrack'), dots = $('#gdDots');
    inp.value = st.q;
    function tiles() {
      cats.innerHTML = GCATS.map(function (c) { return '<button type="button" class="gd-cat' + (st.cat === c.n ? ' on' : '') + '" data-c="' + esc(c.n) + '"><span class="gd-cic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + c.d + '"/></svg></span>' + esc(c.n) + '</button>'; }).join('');
    }
    function render() {
      var q = st.q.toLowerCase();
      var f = l.filter(function (a) { return (!st.cat || a.category === st.cat) && (!q || (a.title + ' ' + a.excerpt + ' ' + a.category).toLowerCase().indexOf(q) >= 0); });
      ttl.textContent = q ? 'Hasil pencarian “' + st.q + '”' : st.cat || 'Semua panduan';
      list.innerHTML = f.map(gCard).join(''); empty.hidden = f.length > 0; tiles();
    }
    cats.addEventListener('click', function (e) {
      var b = e.target.closest('.gd-cat'); if (!b) return;
      st.cat = st.cat === b.dataset.c ? '' : b.dataset.c; render();
      $('#gdListSec').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    $('#gdAll').addEventListener('click', function () { st.cat = ''; st.q = ''; inp.value = ''; render(); $('#gdListSec').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    $('#gdSearch').addEventListener('submit', function (e) { e.preventDefault(); st.q = inp.value.trim(); if (st.q) st.cat = ''; render(); $('#gdListSec').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
    inp.addEventListener('input', function () { st.q = inp.value.trim(); if (st.q) st.cat = ''; render(); });

    var pop = l.filter(function (a) { return a.popular; }); if (!pop.length) pop = l.slice(0, 6);
    track.innerHTML = pop.map(gPop).join('');
    function step() { var c = track.firstElementChild; return c ? c.getBoundingClientRect().width + 20 : 300; }
    dots.innerHTML = pop.map(function (_, i) { return '<button type="button" aria-label="Tutorial ' + (i + 1) + '"></button>'; }).join('');
    function dot() { var i = Math.round(track.scrollLeft / step()); Array.prototype.forEach.call(dots.children, function (d, k) { d.classList.toggle('on', k === i); }); }
    track.addEventListener('scroll', dot, { passive: true });
    dots.addEventListener('click', function (e) { var i = Array.prototype.indexOf.call(dots.children, e.target); if (i >= 0) track.scrollTo({ left: i * step(), behavior: 'smooth' }); });
    $('#gdPrev').addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
    $('#gdNext').addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
    dot(); render();
  });

  var gPost = $('#gdPost');
  if (gPost) {
    var gs = new URLSearchParams(location.search).get('slug') || '';
    Promise.all([S.getBySlug(gs, 'panduan'), S.list({ published: true, type: 'panduan' })]).then(function (r) {
      var a = r[0], all = r[1];
      var home = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-label="Beranda"><path d="M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10"/></svg>';
      if (!a) { gPost.innerHTML = '<div class="gd-main" style="grid-column:1/-1"><h1>Panduan tidak ditemukan</h1><p>Panduan yang kamu cari belum ada atau sudah dihapus.</p><p><a class="btn btn-em" href="panduan-pengguna.html">&lsaquo; Kembali ke Pusat Panduan</a></p></div>'; return; }
      document.title = a.title + ' — Panduan NoctaPOS';
      var md = document.querySelector('meta[name=description]'); if (md) md.content = a.excerpt;
      var same = all.filter(function (x) { return x.category === a.category; }).reverse(), idx = same.map(function (x) { return x.id; }).indexOf(a.id);
      var others = GCATS.filter(function (c) { return c.n !== a.category; }).map(function (c) { return '<a href="panduan-pengguna.html?cat=' + encodeURIComponent(c.n) + '">' + esc(c.n) + '</a>'; }).join('');
      var side = '<aside class="gd-side"><form class="gd-sq" action="panduan-pengguna.html" role="search"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg><input name="q" placeholder="Cari panduan…" aria-label="Cari panduan"></form><h2>Lainnya dalam ' + esc(a.category) + '</h2><nav class="gd-sl">' +
        same.map(function (x) { return '<a href="' + esc(gHref(x)) + '"' + (x.id === a.id ? ' class="on" aria-current="page"' : '') + '>' + esc(x.title) + '</a>'; }).join('') + '</nav><h2>Kategori lain</h2><nav class="gd-sl">' + others + '</nav></aside>';
      var pn = (idx > 0 ? '<a class="gd-pn" href="' + esc(gHref(same[idx - 1])) + '"><small>&larr; Sebelumnya</small>' + esc(same[idx - 1].title) + '</a>' : '<span></span>') + (idx >= 0 && idx < same.length - 1 ? '<a class="gd-pn nx" href="' + esc(gHref(same[idx + 1])) + '"><small>Berikutnya &rarr;</small>' + esc(same[idx + 1].title) + '</a>' : '<span></span>');
      var main = '<main class="gd-main"><nav class="gd-bc" aria-label="Breadcrumb"><a href="index.html">' + home + '</a><i>&rsaquo;</i><a href="panduan-pengguna.html">Pusat Panduan</a><i>&rsaquo;</i><a href="panduan-pengguna.html?cat=' + encodeURIComponent(a.category) + '">' + esc(a.category) + '</a><i>&rsaquo;</i><span>' + esc(a.title) + '</span></nav>' +
        '<h1>' + esc(a.title) + '</h1><p class="gd-meta">' + tgl(a.updatedAt || a.createdAt) + ' &middot; ' + menit(a) + ' menit baca</p>' +
        (/^https?:\/\//i.test(a.cover || '') ? '<img class="gd-cover" src="' + esc(a.cover) + '" alt="">' : '') +
        '<div class="gd-body" id="gdBody">' + clean(a.html || '<p>' + esc(a.excerpt) + '</p>') + '</div>' +
        '<div class="gd-fb" id="gdFb"><b>Apakah panduan ini membantu?</b><span><button type="button" data-v="1">Ya</button><button type="button" data-v="0">Belum</button></span></div>' +
        '<div class="gd-pns">' + pn + '</div><div class="gd-help2"><div><b>Masih butuh bantuan?</b><p>Tim kami siap membantu kalau langkah di atas belum menyelesaikan masalahmu.</p></div><a class="btn btn-em" href="contact.html">Hubungi Kami &rarr;</a></div></main>';
      gPost.innerHTML = side + main + '<aside class="gd-toc" id="gdToc" hidden><h2>Di halaman ini</h2><nav></nav></aside>';
      var body = $('#gdBody'), used = {}, hs = body.querySelectorAll('h2,h3');
      if (hs.length) {
        var nav = $('#gdToc nav');
        Array.prototype.forEach.call(hs, function (h) { h.id = slugId(h.textContent, used); var l = document.createElement('a'); l.href = '#' + h.id; l.textContent = h.textContent; if (h.tagName === 'H3') l.className = 'sub'; nav.appendChild(l); });
        $('#gdToc').hidden = false;
        var links = nav.querySelectorAll('a');
        function spy() { var cur = hs[0]; Array.prototype.forEach.call(hs, function (h) { if (h.getBoundingClientRect().top < 140) cur = h; }); Array.prototype.forEach.call(links, function (k) { k.classList.toggle('on', k.getAttribute('href') === '#' + cur.id); }); }
        window.addEventListener('scroll', spy, { passive: true }); spy();
      } else { gPost.classList.add('no-toc'); }
      $('#gdFb').addEventListener('click', function (e) { if (e.target.dataset.v) this.innerHTML = '<b>' + (e.target.dataset.v === '1' ? 'Terima kasih atas masukanmu!' : 'Terima kasih. Kalau masih bingung, hubungi tim kami lewat halaman Kontak.') + '</b>'; });
    });
  }
})();
