/* NoctaPOS — admin konten (artikel + panduan).
   KEAMANAN: login lewat form + cookie sesi HttpOnly bertanda tangan HMAC
   (diverifikasi di functions/api/admin/_middleware.js). */
(function () {
  'use strict';
  var S = window.ArticleStore, $ = function (s) { return document.querySelector(s); };
  var DEV = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  var SITE = DEV ? 'https://noctapos.id' : location.origin;
  var PATH = { artikel: 'detail', panduan: 'panduan-detail' };
  var TXT = { artikel: 'Artikel baru', panduan: 'Panduan baru' };
  var ICON = ['M4 2h8v12H4zM6 5h4M6 8h4', 'M2 5l6-3 6 3v7l-6 3-6-3zM2 5l6 3 6-3M8 8v7', 'M2 6l1-3h10l1 3v1a2 2 0 01-4 0 2 2 0 01-4 0 2 2 0 01-4 0zM3 9v5h10V9', 'M3 13V7M8 13V3M13 13V9', 'M8 2a6 6 0 100 12A6 6 0 008 2zM8 5v3l2 1', 'M2 8h12M8 2v12'];
  var q, cur = null, slugTouched = false, T = 'artikel', F = 'all', CM = 'artikel', dirty = false, busy = false, tok = 0, lastCat = '', seoT;

  /* ---------- util ---------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function slugify(t) { return String(t || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }
  function msg(t, ok, id) { var m = $(id || '#msg'); m.textContent = t; if (!id) m.className = t ? (ok ? 'ok' : 'err') : ''; }
  function isImg(u) { return /^(https?:\/\/|assets\/|\/media\/)/i.test(u || ''); }
  function setDirty(v) { dirty = v; }
  function okLeave() { return !dirty || confirm('Ada perubahan yang belum disimpan. Lanjut dan buang perubahan?'); }
  window.addEventListener('beforeunload', function (e) { if (dirty) { e.preventDefault(); e.returnValue = ''; } });
  /* buang tag/atribut berbahaya (impor JSON, halaman lama) */
  function safeHtml(h) {
    var d = new DOMParser().parseFromString('<body>' + h + '</body>', 'text/html');
    Array.prototype.forEach.call(d.body.querySelectorAll('script,style,iframe,object,embed,link,meta,form,input,button,svg,math,base'), function (n) { n.remove(); });
    Array.prototype.forEach.call(d.body.querySelectorAll('*'), function (n) {
      Array.prototype.slice.call(n.attributes).forEach(function (at) {
        var nm = at.name.toLowerCase();
        if (nm.indexOf('on') === 0 || nm === 'style' || ((nm === 'href' || nm === 'src') && /^\s*(javascript|data|vbscript):/i.test(at.value))) n.removeAttribute(at.name);
      });
    });
    return d.body.innerHTML;
  }
  function getHtml() {
    var h = q.root.innerHTML.replace(/\ufeff/g, '').replace(/<span class="ql-cursor">[^<]*<\/span>/g, '').replace(/^(<p><br><\/p>)+/, '').replace(/(<p><br><\/p>)+$/, '');
    return (q.getText().trim() || q.root.querySelector('img')) ? h : '';
  }
  function pubHref(a) {
    if (a.type === 'panduan') return 'panduan-detail?slug=' + encodeURIComponent(a.slug);
    return (!a.html && a.legacyUrl && a.legacyUrl.replace(/\.html$/i, '')) || 'detail?slug=' + encodeURIComponent(a.slug);
  }

  /* ---------- akses ---------- */
  function showPanel(who) {
    $('#login').hidden = true; $('#locked').hidden = true; $('#panel').hidden = false;
    $('#who').textContent = who || '';
    if (!q) init();
  }
  function boot() {
    $('#logout').addEventListener('click', function () {
      if (!okLeave()) return;
      fetch('/api/admin/login', { method: 'DELETE' }).then(function () {
        dirty = false;
        location.reload();
      });
    });

    fetch('/api/admin/content?type=artikel')
      .then(function (r) { if (!r.ok) throw new Error('x'); return r.json(); })
      .then(function (data) { 
        if (Array.isArray(data)) {
            showPanel('Admin NoctaPOS'); 
        } else {
            throw new Error('Format data salah');
        }
      })
      .catch(function () { 
        $('#panel').hidden = true; 
        $('#locked').hidden = true; 
        $('#login').hidden = false;
      });

    $('#loginForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var em = $('#em').value.trim();
      var pw = $('#pw').value;
      if (!em || !pw) return;
      
      var btn = this.querySelector('button');
      btn.textContent = 'Memeriksa...';
      btn.disabled = true;

      fetch('/api/admin/login', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, password: pw })
      })
      .then(function (r) { 
        return r.json().then(function(data) {
          if (!r.ok) throw new Error(data.error || 'Gagal masuk');
          return data;
        });
      })
      .then(function () {
        $('#loginErr').textContent = '';
        showPanel('Admin NoctaPOS');
      })
      .catch(function (er) {
        $('#loginErr').textContent = er.message;
        btn.textContent = 'Masuk';
        btn.disabled = false;
      });
    });
  }
   
  /* ---------- tipe & kategori ---------- */
  function loadCats(sel) {
    var el = $('#f-cat'), keep = el.value;
    return S.cats(T).then(function (l) {
      if (sel && sel !== '__new' && l.indexOf(sel) < 0) l.push(sel); 
      el.innerHTML = l.map(function (c) { return '<option>' + esc(c) + '</option>'; }).join('') + '<option value="__new">+ Tambah kategori baru…</option>';
      var want = sel || keep;
      el.value = l.indexOf(want) >= 0 ? want : (l[0] || '__new');
      lastCat = el.value;
    });
  }
  function setType(t, sel) {
    T = t;
    ['artikel', 'panduan'].forEach(function (k) { $('#t-' + k).classList.toggle('on', k === t); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-for]'), function (el) { el.hidden = el.dataset.for !== t; });
    $('#typeHint').textContent = t === 'panduan' ? 'Tampil di halaman Panduan Pengguna (panduan-pengguna.html).' : 'Tampil di halaman Artikel (artikel.html).';
    $('#t-artikel').disabled = $('#t-panduan').disabled = !!(cur && cur.id);
    if (!cur) $('#mode').textContent = TXT[t];
    $('#btnPost span').textContent = cur && cur.status === 'published' ? 'Perbarui' : 'Post';
    seoRefresh();
    return loadCats(sel);
  }

  /* ---------- sampul ---------- */
  function coverRefresh() {
    var u = $('#f-cover').value.trim(), box = $('#coverPrev'), g = +$('#f-grad').value | 0;
    box.className = 'cover-prev g' + g; box.innerHTML = '';
    if (isImg(u)) {
      var im = new Image(); im.alt = ''; im.src = u; im.style.objectPosition = 'center ' + $('#f-cpos').value;
      im.onerror = function () { box.innerHTML = '<span class="cp-err">Gambar tidak bisa dimuat. Cek linknya.</span>'; };
      box.appendChild(im);
      var l = document.createElement('span'); l.className = 'cp-lbl'; l.textContent = 'Pratinjau, dipotong seperti kartu'; box.appendChild(l);
    } else {
      box.innerHTML = '<svg viewBox="0 0 16 16"><path d="' + ICON[g % 6] + '"/></svg><span class="cp-lbl">Sampul bawaan</span>';
    }
  }

  /* ---------- SEO ---------- */
  function cnt(id, n, lo, hi) { var e = $(id); e.textContent = n + (hi ? ' / ' + hi : ''); e.className = 'cnt' + (n >= lo && n <= hi ? ' good' : n ? ' bad' : ''); }
  function seoRefresh() {
    if (!q) return;
    var title = $('#f-title').value.trim(), mt = $('#f-mtitle').value.trim(), md = $('#f-mdesc').value.trim(), ex = $('#f-excerpt').value.trim();
    var slug = slugify($('#f-slug').value) || slugify(title) || '…', st = mt || title, sd = md || ex;
    cnt('#c-title', title.length, 20, 70); cnt('#c-ex', ex.length, 50, 220); cnt('#c-mt', mt.length, 30, 60); cnt('#c-md', md.length, 70, 160);
    $('#slugHint').textContent = SITE.replace(/^https?:\/\//, '') + '/' + PATH[T] + '?slug=' + slug + (cur && cur.status === 'published' && cur.slug !== slug ? ' (mengubah slug konten terbit akan mematahkan link lama)' : '');
    $('#serpU').textContent = SITE.replace(/^https?:\/\//, '') + '/' + PATH[T] + '?slug=' + slug;
    $('#serpT').textContent = ((st || 'Judul halaman') + (/noctapos/i.test(st) ? '' : ' | NoctaPOS')).slice(0, 62) + (st.length > 52 ? '…' : '');
    $('#serpD').textContent = sd.length > 160 ? sd.slice(0, 157) + '…' : (sd || 'Ringkasan akan tampil di sini.');
    var text = q.getText().trim(), words = text ? text.split(/\s+/).length : 0, imgs = Array.prototype.slice.call(q.root.querySelectorAll('img'));
    var noAlt = imgs.filter(function (i) { return !(i.getAttribute('alt') || '').trim(); }).length;
    var minW = T === 'panduan' ? 120 : 300, effT = (mt || title).length, effD = (md || ex).length;
    var items = [
      [effT >= 30 && effT <= 60, 'Judul SEO 30–60 karakter (sekarang ' + effT + ')'],
      [effD >= 70 && effD <= 160, 'Deskripsi 70–160 karakter (sekarang ' + effD + ')'],
      [slug.length > 2 && slug.length <= 60 && slug !== '…', 'Slug singkat dan jelas (maks. 60 karakter, pakai kata kunci)'],
      [words >= minW, 'Isi minimal ' + minW + ' kata (sekarang ' + words + ')'],
      [words < 200 || q.root.querySelectorAll('h2,h3').length > 0, 'Ada subjudul (Heading) supaya mudah dipindai'],
      [isImg($('#f-cover').value.trim()) && !!$('#f-calt').value.trim(), 'Gambar sampul + teks alternatif terisi'],
      [!imgs.length || noAlt === 0, imgs.length ? (noAlt ? noAlt + ' gambar di isi belum punya teks alternatif' : 'Semua gambar di isi punya teks alternatif') : 'Gambar di dalam isi (opsional)'],
      [q.root.querySelectorAll('a').length > 0, 'Ada minimal satu tautan (ke artikel/halaman lain)']
    ];
    var good = items.filter(function (i) { return i[0]; }).length;
    $('#seoList').innerHTML = items.map(function (i) { return '<li class="' + (i[0] ? 'ok' : '') + '">' + esc(i[1]) + '</li>'; }).join('');
    var sc = $('#seoScore'); sc.textContent = good + '/' + items.length; sc.className = 'score' + (good >= 7 ? ' ok' : '');
  }
  function later() { clearTimeout(seoT); seoT = setTimeout(seoRefresh, 250); }

  /* ---------- form ---------- */
  function clearForm() {
    ['title', 'slug', 'tags', 'excerpt', 'cover', 'calt', 'mtitle', 'mdesc'].forEach(function (k) { $('#f-' + k).value = ''; });
    $('#f-grad').value = '0'; $('#f-cpos').value = 'center'; $('#f-pop').checked = false; q.setContents([]); $('#legacyNote').hidden = true;
  }
  function reset() {
    if (!okLeave()) return;
    tok++; cur = null; slugTouched = false; clearForm(); setDirty(false); msg('');
    setType(T).then(function () { coverRefresh(); });
  }
  function setBody(html) { q.setContents([]); q.clipboard.dangerouslyPasteHTML(0, safeHtml(html), 'silent'); }
  function loadLegacy(url) {
    return fetch(url, { cache: 'no-store', credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); }).then(function (t) {
      var d = new DOMParser().parseFromString(t, 'text/html'), r = d.querySelector('article.post') || d.querySelector('.post') || d.querySelector('main') || d.body;
      ['.crumb', '.am-tags', 'h1', '.meta', '.am-img', '.lead', '.post-cta', '.rel-h', '#relGrid', '.am-grid', 'nav', 'header', 'footer'].forEach(function (s) { Array.prototype.forEach.call(r.querySelectorAll(s), function (n) { n.remove(); }); });
      var h = safeHtml(r.innerHTML), plain = h.replace(/<[^>]*>/g, ' ').trim();
      if (plain.length < 40) throw new Error('isi tidak ditemukan');
      return h;
    });
  }
  function fill(a) {
    if (!okLeave()) return;
    var my = ++tok; cur = a; slugTouched = true; clearForm(); setDirty(false);
    var t = a.type === 'panduan' ? 'panduan' : 'artikel';
    $('#f-title').value = a.title; $('#f-slug').value = a.slug; $('#f-tags').value = (a.tags || []).join(', '); $('#f-pop').checked = !!a.popular;
    $('#f-excerpt').value = a.excerpt || ''; $('#f-cover').value = a.cover || ''; $('#f-grad').value = a.grad | 0;
    $('#f-cpos').value = /^(top|bottom)$/.test(a.coverPos) ? a.coverPos : 'center'; $('#f-calt').value = a.coverAlt || '';
    $('#f-mtitle').value = a.metaTitle || ''; $('#f-mdesc').value = a.metaDesc || '';
    $('#mode').textContent = 'Mengedit: ' + a.title; window.scrollTo({ top: 0, behavior: 'smooth' });
    setType(t, a.category).then(function () { coverRefresh(); });
    if (a.html) { setBody(a.html); seoRefresh(); }
    else if (a.legacyUrl) {
      msg('Memuat isi artikel lama…', true);
      loadLegacy(a.legacyUrl).then(function (h) {
        if (my !== tok) return;
        setBody(h); setDirty(false); seoRefresh(); msg('Isi artikel lama sudah dimuat. Rapikan jika perlu, lalu klik Perbarui.', true);
        $('#legacyNote').hidden = false; $('#legacyNote').textContent = 'Artikel ini awalnya halaman statis (' + a.legacyUrl + '). Setelah kamu klik Perbarui, link di blog otomatis pindah ke halaman baru. Hapus/redirect file lama agar tidak jadi konten ganda di Google.';
      }).catch(function (e) {
        if (my !== tok) return;
        $('#legacyNote').hidden = false;
        $('#legacyNote').textContent = 'Isi lama tidak bisa dimuat otomatis (' + e.message + '). Kalau disimpan dengan editor kosong, halaman lama tetap dipakai dan hanya judul/ringkasan/sampul di kartu yang berubah. Mau ganti isinya? Tulis ulang di editor.';
        msg('');
      });
    } else seoRefresh();
  }
  function submit(status) {
    if (busy) return;
    var title = $('#f-title').value.trim(), cat = $('#f-cat').value, ex = $('#f-excerpt').value.trim(), html = getHtml(), cover = $('#f-cover').value.trim();
    if (!title || !cat || cat === '__new' || !ex) return msg('Judul, kategori, dan ringkasan wajib diisi.');
    if (status === 'published' && !html && !(cur && cur.legacyUrl)) return msg('Isi konten masih kosong.');
    if (cover && !isImg(cover)) return msg('Link gambar sampul harus diawali https://, assets/ atau /media/');
    if (/src=["']data:/i.test(html)) return msg('Ada gambar yang ditempel/diseret langsung. Hapus, lalu masukkan lewat tombol gambar (pakai link https:// atau assets/).');
    if (status === 'draft' && cur && cur.status === 'published' && !confirm('Konten ini sedang terbit. Simpan sebagai draft akan menyembunyikannya dari publik. Lanjut?')) return;
    var art = {
      id: cur ? cur.id : '', type: T, popular: T === 'panduan' && $('#f-pop').checked, slug: slugify($('#f-slug').value) || slugify(title) || (T === 'panduan' ? 'panduan' : 'artikel'),
      title: title, category: cat, tags: T === 'panduan' ? [] : $('#f-tags').value.split(',').map(function (t) { return t.trim().slice(0, 40); }).filter(Boolean).slice(0, 2),
      excerpt: ex, cover: cover, coverAlt: $('#f-calt').value.trim(), coverPos: $('#f-cpos').value, grad: +$('#f-grad').value, html: html, status: status,
      metaTitle: $('#f-mtitle').value.trim(), metaDesc: $('#f-mdesc').value.trim()
    };
    if (cur && cur.minutes && !art.html) art.minutes = cur.minutes;
    busy = true; $('#btnPost').disabled = $('#btnDraft').disabled = true;
    S.save(art).then(function (a) {
      var pg = T === 'panduan';
      msg(status === 'published' ? (pg ? 'Terposting. Sudah tampil di Pusat Panduan dan halaman detail panduan.' : 'Terposting. Sudah tampil di home, halaman artikel, dan halaman detail.') : 'Draft tersimpan.', true);
      cur = a; setDirty(false); $('#f-slug').value = a.slug; $('#mode').textContent = 'Mengedit: ' + a.title;
      $('#legacyNote').hidden = true; setType(T, a.category); renderList(); renderCats();
    }).catch(function (e) { msg(e.message || 'Gagal menyimpan.'); }).then(function () { busy = false; $('#btnPost').disabled = $('#btnDraft').disabled = false; });
  }

  /* ---------- daftar konten ---------- */
  function renderList() {
    var kw = ($('#lq').value || '').toLowerCase();
    S.list({ type: 'all' }).then(function (all) {
      var l = all.filter(function (a) { return (F === 'all' || a.type === F) && (!kw || (a.title + ' ' + a.category).toLowerCase().indexOf(kw) >= 0); });
      $('#list').innerHTML = l.length ? l.map(function (a) {
        var pub = a.status === 'published';
        return '<div class="row"><div><b>' + esc(a.title) + '</b><small><span class="pill ' + (pub ? 'ok">Terbit' : 'dr">Draft') + '</span><span class="pill ' + (a.type === 'panduan' ? 'gp">Panduan' : 'tp">Artikel') + '</span>' + esc(a.category) + '</small></div><div class="acts">' +
          (pub ? '<a href="' + esc(pubHref(a)) + '" target="_blank" rel="noopener">Lihat</a>' : '') +
          '<button type="button" data-e="' + esc(a.id) + '">Edit</button><button type="button" data-p="' + esc(a.id) + '">' + (pub ? 'Jadikan draft' : 'Terbitkan') + '</button><button type="button" data-d="' + esc(a.id) + '">Hapus</button></div></div>';
      }).join('') : '<p>Belum ada konten.</p>';
    });
  }

  /* ---------- kelola kategori ---------- */
  function renderCats() {
    ['artikel', 'panduan'].forEach(function (k) { $('#cm-' + k).classList.toggle('on', k === CM); });
    Promise.all([S.cats(CM), S.list({ type: CM })]).then(function (r) {
      var n = {}; r[1].forEach(function (a) { n[a.category] = (n[a.category] || 0) + 1; });
      $('#cmList').innerHTML = r[0].length ? r[0].map(function (c) {
        return '<div class="row"><div><b>' + esc(c) + '</b><small>' + (n[c] || 0) + ' konten</small></div><div class="acts"><button type="button" data-ren="' + esc(c) + '">Ubah nama</button><button type="button" data-del="' + esc(c) + '">Hapus</button></div></div>';
      }).join('') : '<p class="hint">Belum ada kategori.</p>';
    });
  }
  function catDone(text, ok) { msg(text, ok, '#cmMsg'); renderCats(); renderList(); if (CM === T) loadCats(); }

  /* ---------- impor / ekspor ---------- */
  function validImport(t) {
    if (t.length > 3e6) throw new Error('File terlalu besar.');
    var a = JSON.parse(t);
    if (!Array.isArray(a) || a.length > 1000) throw new Error('Format salah.');
    return a.map(function (x, i) {
      if (!x || typeof x !== 'object' || !x.title || !x.slug) throw new Error('Ada entri tanpa judul/slug.');
      var o = {}; ['id', 'legacyUrl', 'title', 'category', 'excerpt', 'cover', 'coverAlt', 'metaTitle', 'metaDesc', 'createdAt', 'updatedAt'].forEach(function (k) { o[k] = x[k] == null ? '' : String(x[k]).slice(0, k === 'excerpt' || k === 'metaDesc' ? 400 : 300); });
      o.type = x.type === 'panduan' ? 'panduan' : 'artikel'; o.id = o.id || (o.type === 'panduan' ? 'g' : 'a') + Date.now() + i;
      o.slug = slugify(x.slug) || 'konten'; o.html = safeHtml(String(x.html || '')); o.status = x.status === 'published' ? 'published' : 'draft';
      o.tags = Array.isArray(x.tags) ? x.tags.slice(0, 2).map(function (t) { return String(t).slice(0, 40); }) : [];
      o.grad = (x.grad | 0) % 6; o.minutes = x.minutes | 0; o.popular = !!x.popular; o.coverPos = /^(top|bottom)$/.test(x.coverPos) ? x.coverPos : 'center';
      if (o.cover && !isImg(o.cover)) o.cover = '';
      if (o.legacyUrl && !/^artikel\/[a-z0-9-]+\.html$/i.test(o.legacyUrl)) o.legacyUrl = '';
      o.createdAt = o.createdAt || new Date().toISOString();
      return o;
    });
  }
  function sitemap() { window.open('/sitemap.xml', '_blank', 'noopener'); } /* sitemap dibuat otomatis oleh server */

  /* ---------- gambar di editor: ukuran, rata kiri/tengah/kanan, pindah atas/bawah, teks alternatif ---------- */
  function registerImage() {
    try {
      var Base = Quill.import('formats/image'), KEYS = ['alt', 'width', 'data-align'];
      class NoctaImage extends Base {
        static formats(node) { var f = {}; KEYS.forEach(function (k) { if (node.hasAttribute(k)) f[k] = node.getAttribute(k); }); return f; }
        format(name, value) {
          if (KEYS.indexOf(name) < 0) return super.format(name, value);
          if (value) this.domNode.setAttribute(name, value); else this.domNode.removeAttribute(name);
        }
      }
      Quill.register(NoctaImage, true);
    } catch (e) { console.error('format gambar:', e); }
  }
  /* gambar selalu ditaruh di barisnya sendiri supaya mudah dipindah */
  function insertImage(u, alt) {
    var r = q.getSelection(true) || { index: Math.max(0, q.getLength() - 1) }, idx = r.index;
    var ln = q.getLine(idx), start = q.getIndex(ln[0]);
    if (ln[0].length() > 1 && idx > start) { q.insertText(idx, '\n', 'user'); idx++; }
    q.insertEmbed(idx, 'image', u, 'user');
    if (q.getLine(idx)[0].length() > 2) q.insertText(idx + 1, '\n', 'user');
    if (alt) q.formatText(idx, 1, 'alt', alt, 'user');
    q.setSelection(idx + 1, 0, 'silent');
  }
  function imageTools() {
    var bar = $('#imgBar'), frame = $('#imgFrame'), range = $('#imgRange'), rv = $('#imgRv'), sel = null, tm, Delta = Quill.import('delta');
    if (!bar || !frame) return;
    q.container.appendChild(frame); q.container.appendChild(bar);
    function hide() { sel = null; bar.hidden = true; frame.hidden = true; }
    function idxOf() { var b = sel && Quill.find(sel); return b ? q.getIndex(b) : -1; }
    function fmt(name, val) { var i = idxOf(); if (i < 0) return; q.formatText(i, 1, name, val, 'user'); setTimeout(place, 0); }
    function place() {
      if (!sel || !q.root.contains(sel)) return hide();
      var c = q.container.getBoundingClientRect(), r = sel.getBoundingClientRect(), v = q.root.getBoundingClientRect();
      if (r.bottom < v.top + 4 || r.top > v.bottom - 4) { bar.hidden = true; frame.hidden = true; return; }
      frame.hidden = false; bar.hidden = false;
      frame.style.left = (r.left - c.left) + 'px'; frame.style.top = (r.top - c.top) + 'px'; frame.style.width = r.width + 'px'; frame.style.height = r.height + 'px';
      var bh = bar.offsetHeight, top = r.top - c.top - bh - 8;
      if (top < 4) top = r.bottom - c.top + 8;
      if (top + bh > c.height - 4) top = 8;
      bar.style.top = top + 'px'; bar.style.left = Math.max(4, Math.min(r.left - c.left, c.width - bar.offsetWidth - 4)) + 'px';
      var w = sel.getAttribute('width') || '', al = sel.getAttribute('data-align') || '', pct = w ? parseInt(w, 10) : Math.min(100, Math.round(r.width / (q.root.clientWidth || 1) * 100));
      Array.prototype.forEach.call(bar.querySelectorAll('[data-w]'), function (b) { b.classList.toggle('on', b.dataset.w === w); });
      Array.prototype.forEach.call(bar.querySelectorAll('[data-a]'), function (b) { b.classList.toggle('on', b.dataset.a === al); });
      if (document.activeElement !== range) range.value = pct || 100;
      rv.textContent = (pct || 100) + '%';
    }
    function move(dir) {
      var i = idxOf(); if (i < 0) return;
      var ln = q.getLine(i)[0], start = q.getIndex(ln), len = ln.length(), nb = dir < 0 ? ln.prev : ln.next;
      if (!nb) return msg(dir < 0 ? 'Gambar sudah di posisi paling atas.' : 'Gambar sudah di posisi paling bawah.');
      var nlen = nb.length(), content = q.getContents(start, len), d, ni;
      /* Delta.concat() mengembalikan Delta BARU, jadi hasilnya harus ditampung ke d */
      if (dir < 0) { d = new Delta().retain(start - nlen).concat(content).retain(nlen).delete(len); ni = start - nlen + (i - start); }
      else { d = new Delta().retain(start).delete(len).retain(nlen).concat(content); ni = start + nlen + (i - start); }
      q.updateContents(d, 'user');
      var leaf = q.getLeaf(ni)[0];
      sel = leaf && leaf.domNode && leaf.domNode.tagName === 'IMG' ? leaf.domNode : null;
      if (sel) { sel.scrollIntoView({ block: 'nearest' }); place(); } else hide();
    }
    q.root.addEventListener('click', function (e) { if (e.target && e.target.tagName === 'IMG') { sel = e.target; place(); } });
    document.addEventListener('mousedown', function (e) {
      if (!sel || bar.contains(e.target) || (e.target.tagName === 'IMG' && q.root.contains(e.target))) return;
      hide();
    });
    q.root.addEventListener('scroll', place); window.addEventListener('resize', place);
    /* seret gambar: bar disembunyikan; isi editor menggulir sendiri saat gambar dibawa ke tepi atas/bawah editor,
       dan halaman ikut menggulir kalau gambar dibawa ke tepi layar */
    var dragY = null, lastOver = 0, raf = 0;
    function stopDrag() { dragY = null; }
    function tick() {
      if (dragY === null || Date.now() - lastOver > 1500) { dragY = null; raf = 0; return; }
      var r = q.root.getBoundingClientRect();
      if (dragY < r.top + 56) q.root.scrollTop -= 14; else if (dragY > r.bottom - 56) q.root.scrollTop += 14;
      if (dragY < 100) window.scrollBy(0, -10); else if (dragY > window.innerHeight - 60) window.scrollBy(0, 10);
      raf = requestAnimationFrame(tick);
    }
    q.root.addEventListener('dragstart', function (e) {
      if (!e.target || e.target.tagName !== 'IMG') return;
      hide(); dragY = e.clientY; lastOver = Date.now(); if (!raf) raf = requestAnimationFrame(tick);
    });
    document.addEventListener('dragover', function (e) { if (dragY !== null) { dragY = e.clientY; lastOver = Date.now(); } });
    ['dragend', 'drop', 'mouseup'].forEach(function (n) { document.addEventListener(n, stopDrag); });
    q.on('text-change', function () { if (sel) setTimeout(place, 0); });
    bar.addEventListener('mousedown', function (e) { if (e.target.tagName !== 'INPUT') e.preventDefault(); });
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button'); if (!b || !sel) return;
      if (b.dataset.w) fmt('width', sel.getAttribute('width') === b.dataset.w ? false : b.dataset.w);          /* klik lagi = kembali ke ukuran asli */
      else if (b.dataset.a) fmt('data-align', sel.getAttribute('data-align') === b.dataset.a ? false : b.dataset.a);
      else if (b.dataset.m) move(+b.dataset.m);
      else if (b.dataset.act === 'alt') {
        var v = prompt('Teks alternatif gambar (deskripsi singkat, bagus untuk SEO):', sel.getAttribute('alt') || '');
        if (v !== null) fmt('alt', v.trim().slice(0, 125));
      } else if (b.dataset.act === 'del') {
        var i = idxOf(); if (i < 0) return;
        q.deleteText(i, 1, 'user'); hide();
        var ln = q.getLine(Math.min(i, Math.max(0, q.getLength() - 1)))[0];
        if (ln && ln.length() === 1 && q.getLength() > 1) q.deleteText(q.getIndex(ln), 1, 'user');   /* buang baris kosong sisa gambar */
      }
    });
    range.addEventListener('input', function () { rv.textContent = range.value + '%'; clearTimeout(tm); tm = setTimeout(function () { fmt('width', range.value + '%'); }, 120); });
  }

  /* tombol tinggi editor: Kecil / Sedang / Besar (selain tarik pojok kanan bawah editor) */
  function heightButtons() {
    var hb = document.querySelectorAll('[data-h]');
    Array.prototype.forEach.call(hb, function (b) {
      b.addEventListener('click', function () {
        q.container.style.height = b.dataset.h + 'px';
        Array.prototype.forEach.call(hb, function (x) { x.classList.toggle('on', x === b); });
        window.dispatchEvent(new Event('resize'));
      });
    });
  }

  /* ---------- galeri gambar: unggah + kecilkan + kompres otomatis (disimpan di D1, disajikan lewat /media/...) ---------- */
  var MEDIA = { maxW: 1200, targetKB: 180, cb: null };
  function mediaApi(path, opt) {
    opt = opt || {};
    var init = { method: opt.method || 'GET', credentials: 'same-origin', cache: 'no-store', headers: {} };
    if (opt.body !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opt.body); }
    return fetch(path, init).then(function (r) {
      return r.text().then(function (t) {
        var j = null; try { j = t ? JSON.parse(t) : null; } catch (e) {}
        if (!r.ok) throw new Error((j && j.error) || (r.status === 401 || r.status === 403 ? 'Sesi login habis. Muat ulang halaman.' : 'Gagal (' + r.status + ').'));
        return j;
      });
    }, function () { throw new Error('Tidak bisa terhubung ke server.'); });
  }
  function blobToBase64(blob) {
    return new Promise(function (res, rej) {
      var fr = new FileReader();
      fr.onload = function () { res(String(fr.result).split(',')[1]); };
      fr.onerror = function () { rej(new Error('Gagal membaca gambar.')); };
      fr.readAsDataURL(blob);
    });
  }
  function toBlob(canvas, type, q) { return new Promise(function (res) { canvas.toBlob(res, type, q); }); }

  /* kecilkan (maks. 1200 px lebar) lalu kompres ke WebP; kualitas/ukuran diturunkan bertahap sampai <= ~180 KB */
  async function compressImage(file) {
    var bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); }
    catch (e) { try { bmp = await createImageBitmap(file); } catch (e2) { throw new Error('Format gambar tidak didukung. Pakai JPG, PNG, atau WebP.'); } }
    var scale = Math.min(1, MEDIA.maxW / bmp.width), q = 0.82, out = null, w = bmp.width, h = bmp.height;
    for (var i = 0; i < 12; i++) {
      w = Math.max(1, Math.round(bmp.width * scale)); h = Math.max(1, Math.round(bmp.height * scale));
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      var x = c.getContext('2d'); x.drawImage(bmp, 0, 0, w, h);
      out = await toBlob(c, 'image/webp', q);
      if (!out || out.type !== 'image/webp') {            /* browser lama tanpa WebP -> JPEG berlatar putih */
        x.globalCompositeOperation = 'destination-over'; x.fillStyle = '#fff'; x.fillRect(0, 0, w, h);
        out = await toBlob(c, 'image/jpeg', q);
      }
      if (!out) throw new Error('Gagal memproses gambar.');
      if (out.size <= MEDIA.targetKB * 1024) break;
      if (q > 0.55) q -= 0.09; else if (w > 640) scale *= 0.85; else break;
    }
    if (bmp.close) bmp.close();
    return { blob: out, w: w, h: h };
  }
  async function uploadFile(file, status) {
    if (!/^image\//i.test(file.type)) throw new Error('File harus berupa gambar (JPG, PNG, atau WebP).');
    if (file.size > 25 * 1024 * 1024) throw new Error('File terlalu besar (maks. 25 MB).');
    status('Mengecilkan dan mengompres…');
    var r = await compressImage(file);
    status('Mengunggah (' + Math.round(r.blob.size / 1024) + ' KB)…');
    return mediaApi('/api/admin/media', { method: 'POST', body: { name: file.name, w: r.w, h: r.h, data: await blobToBase64(r.blob) } });
  }

  function mdMsg(t) { $('#mdMsg').textContent = t; }
  function closeMedia() { $('#mediaDlg').hidden = true; MEDIA.cb = null; }
  function pickMedia(url) { var cb = MEDIA.cb; closeMedia(); if (cb) cb(url); }
  function renderGrid(items) {
    var g = $('#mdGrid'); g.textContent = '';
    if (!items.length) { var p = document.createElement('p'); p.className = 'hint'; p.textContent = 'Belum ada gambar. Unggah yang pertama.'; g.appendChild(p); return; }
    items.forEach(function (m) {
      var d = document.createElement('div'); d.className = 'mi'; d.tabIndex = 0; d.setAttribute('role', 'button'); d.setAttribute('aria-label', 'Pilih gambar ' + m.name);
      var im = document.createElement('img'); im.src = m.url; im.alt = ''; im.loading = 'lazy';
      var s = document.createElement('span'); s.textContent = Math.round(m.bytes / 1024) + ' KB · ' + m.w + '×' + m.h;
      var x = document.createElement('button'); x.type = 'button'; x.className = 'mx'; x.textContent = '✕'; x.title = 'Hapus dari galeri'; x.setAttribute('aria-label', 'Hapus gambar');
      d.addEventListener('click', function () { pickMedia(m.url); });
      d.addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target === d) pickMedia(m.url); });
      x.addEventListener('click', function (e) {
        e.stopPropagation();
        if (!confirm('Hapus gambar ini dari galeri?')) return;
        mediaApi('/api/admin/media?id=' + encodeURIComponent(m.id), { method: 'DELETE' }).then(loadGrid, function (err) { mdMsg(err.message); });
      });
      d.appendChild(im); d.appendChild(s); d.appendChild(x); g.appendChild(d);
    });
  }
  function loadGrid() { mediaApi('/api/admin/media').then(renderGrid, function (e) { mdMsg(e.message); }); }
  function openMedia(cb) {
    MEDIA.cb = cb; $('#mediaDlg').hidden = false;
    mdMsg('Gambar otomatis dikecilkan (maks. 1200 px) dan dikompres ke WebP.'); loadGrid();
  }
  function mediaInit() {
    var dlg = $('#mediaDlg'); if (!dlg) return;
    $('#mdClose').addEventListener('click', closeMedia);
    dlg.addEventListener('mousedown', function (e) { if (e.target === dlg) closeMedia(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !dlg.hidden) closeMedia(); });
    $('#mdPick').addEventListener('click', function () { $('#mdFile').click(); });
    $('#mdFile').addEventListener('change', async function () {
      var f = this.files && this.files[0]; this.value = ''; if (!f) return;
      var b = $('#mdPick'); b.disabled = true;
      try { var r = await uploadFile(f, mdMsg); pickMedia(r.url); }
      catch (e) { mdMsg(e.message); }
      finally { b.disabled = false; }
    });
    $('#mdUse').addEventListener('click', function () {
      var u = $('#mdLink').value.trim();
      if (!isImg(u)) return mdMsg('Link harus diawali https://, assets/ atau /media/');
      $('#mdLink').value = ''; pickMedia(u);
    });
    $('#btnCoverPick').addEventListener('click', function () {
      openMedia(function (u) { var el = $('#f-cover'); el.value = u; el.dispatchEvent(new Event('input', { bubbles: true })); });
    });
  }

  /* ---------- init ---------- */
  function init() {
    registerImage();
    q = new Quill('#editor', { theme: 'snow', placeholder: 'Tulis isi di sini…', modules: { toolbar: { container: [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['blockquote', 'link', 'image'], ['clean']], handlers: { image: function () {
      openMedia(function (u) {
        var alt = (prompt('Teks alternatif gambar (deskripsi singkat, bagus untuk SEO):') || '').trim().slice(0, 125);
        insertImage(u, alt);
      });
    } } } } });
    q.on('text-change', function (d, o, src) { if (src === 'user') setDirty(true); later(); });
    try { imageTools(); } catch (e) { console.error('alat gambar:', e); }
    heightButtons();
    try { mediaInit(); } catch (e) { console.error('galeri gambar:', e); }
    ['title', 'slug', 'tags', 'excerpt', 'cover', 'calt', 'mtitle', 'mdesc', 'grad', 'cpos', 'pop', 'cat'].forEach(function (k) {
      $('#f-' + k).addEventListener('input', function () { if (k !== 'cat' || this.value !== '__new') setDirty(true); if (k === 'cover' || k === 'grad' || k === 'cpos') coverRefresh(); later(); });
    });
    $('#f-cat').addEventListener('change', function () {
      if (this.value !== '__new') { lastCat = this.value; return; }
      var n = (prompt('Nama kategori baru:') || '').trim();
      if (!n) { this.value = lastCat; return; }
      S.addCat(T, n).then(function (name) { return loadCats(name); }).then(function () { renderCats(); }).catch(function (e) { msg(e.message); $('#f-cat').value = lastCat; });
    });
    $('#f-title').addEventListener('input', function () { if (!slugTouched) $('#f-slug').value = slugify(this.value); });
    $('#f-slug').addEventListener('input', function () { slugTouched = true; });
    $('#t-artikel').addEventListener('click', function () { if (!cur && T !== 'artikel') setType('artikel'); });
    $('#t-panduan').addEventListener('click', function () { if (!cur && T !== 'panduan') setType('panduan'); });
    $('#btnPost').addEventListener('click', function () { submit('published'); });
    $('#btnDraft').addEventListener('click', function () { submit('draft'); });
    $('#btnReset').addEventListener('click', reset);
    $('#ftabs').addEventListener('click', function (e) { if (!e.target.dataset.f) return; F = e.target.dataset.f; Array.prototype.forEach.call($('#ftabs').children, function (b) { b.classList.toggle('on', b === e.target); }); renderList(); });
    $('#lq').addEventListener('input', renderList);
    $('#list').addEventListener('click', function (e) {
      var d = e.target.dataset, id = d.e || d.d || d.p; if (!id) return;
      if (d.e) S.getById(id).then(function (a) { if (a) fill(a); });
      else if (d.p) S.getById(id).then(function (a) {
        if (!a) return;
        var pub = a.status === 'published';
        if (pub && !confirm('Sembunyikan dari publik (jadikan draft)?')) return;
        if (!pub && !a.html && !a.legacyUrl) return msg('Isi masih kosong. Edit dulu, baru terbitkan.');
        a.status = pub ? 'draft' : 'published'; return S.save(a).then(function () { msg(pub ? 'Dijadikan draft.' : 'Sudah terbit.', true); renderList(); if (cur && cur.id === a.id) cur = a; });
      }).catch(function (er) { msg(er.message); });
      else if (confirm('Hapus konten ini? Tidak bisa dibatalkan (ekspor JSON dulu untuk cadangan).')) S.remove(id).then(function () { if (cur && cur.id === id) { setDirty(false); reset(); } renderList(); renderCats(); }).catch(function (er) { msg(er.message); });
    });
    ['artikel', 'panduan'].forEach(function (k) { $('#cm-' + k).addEventListener('click', function () { CM = k; renderCats(); }); });
    $('#cmAdd').addEventListener('click', function () {
      var v = $('#cmNew').value; S.addCat(CM, v).then(function (n) { $('#cmNew').value = ''; catDone('Kategori “' + n + '” siap dipakai.', true); }).catch(function (e) { msg(e.message, false, '#cmMsg'); });
    });
    $('#cmNew').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('#cmAdd').click(); } });
    $('#cmList').addEventListener('click', function (e) {
      var d = e.target.dataset;
      if (d.del != null && d.del !== '') { if (confirm('Hapus kategori “' + d.del + '”?')) S.removeCat(CM, d.del).then(function () { catDone('Kategori dihapus.', true); }).catch(function (er) { msg(er.message, false, '#cmMsg'); }); }
      else if (d.ren) { var n = (prompt('Nama baru untuk “' + d.ren + '” (jika sudah ada, kontennya digabung):', d.ren) || '').trim(); if (n && n !== d.ren) S.renameCat(CM, d.ren, n).then(function () { if (cur && cur.category === d.ren) cur.category = n; catDone('Kategori diubah menjadi “' + n + '”.', true); }).catch(function (er) { msg(er.message, false, '#cmMsg'); }); }
    });
    $('#btnExport').addEventListener('click', function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([S.exportJson()], { type: 'application/json' })); a.download = 'konten-nocta-' + new Date().toISOString().slice(0, 10) + '.json'; a.click();
    });
    $('#btnMap').addEventListener('click', sitemap);
    $('#importFile').addEventListener('change', function () {
      var f = this.files[0], inp = this; if (!f) return;
      if (!confirm('Impor akan menimpa konten sejenis (artikel / panduan) yang ada di server. Sudah ekspor cadangan?')) { inp.value = ''; return; }
      f.text().then(function (t) { return S.importJson(JSON.stringify(validImport(t))); }).then(function (n) { msg(n + ' konten diimpor.', true); renderList(); renderCats(); loadCats(); }).catch(function (e) { msg(e.message); }).then(function () { inp.value = ''; });
    });
    setType('artikel').then(function () { coverRefresh(); });
    renderList(); renderCats();
  }
  boot();
})();
