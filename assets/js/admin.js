/* NoctaPOS — halaman admin artikel (MODE TES). Login di bawah HANYA password dummy, tidak aman. Ganti dengan Firebase Auth. */
(function () {
  'use strict';
  var PASS = 'nocta-admin', S = window.ArticleStore, $ = function (s) { return document.querySelector(s); };
  var q, cur = null, slugTouched = false, T = 'artikel', F = 'all';
  var TXT = { artikel: 'Artikel baru', panduan: 'Panduan baru' };
  function addCat(n, keep) {
    var sel = $('#f-gcat');
    if (!Array.prototype.some.call(sel.options, function (x) { return x.value === n; })) sel.insertBefore(new Option(n), sel.querySelector('option[value="__new"]'));
    if (!keep) sel.value = n;
  }
  function catEl() { return T === 'panduan' ? $('#f-gcat') : $('#f-cat'); }
  function setType(t) {
    T = t;
    ['artikel', 'panduan'].forEach(function (k) { $('#t-' + k).classList.toggle('on', k === t); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-for]'), function (el) { el.hidden = el.dataset.for !== t; });
    $('#typeHint').textContent = t === 'panduan' ? 'Tampil di halaman Panduan Pengguna (panduan-pengguna.html).' : 'Tampil di halaman Artikel (artikel.html).';
    $('#t-artikel').disabled = $('#t-panduan').disabled = !!(cur && cur.id);
    if (!cur) $('#mode').textContent = TXT[t];
  }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function slugify(t) { return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80); }
  function msg(t, ok) { var m = $('#msg'); m.textContent = t; m.className = t ? (ok ? 'ok' : 'err') : ''; }

  function gate() {
    var ok = sessionStorage.getItem('nocta_admin_ok') === '1';
    $('#login').hidden = ok; $('#panel').hidden = !ok; $('#logout').hidden = !ok;
    if (ok && !q) init();
  }
  $('#loginForm').addEventListener('submit', function (e) {
    e.preventDefault();
    if ($('#pw').value === PASS) { sessionStorage.setItem('nocta_admin_ok', '1'); gate(); } else { $('#loginErr').textContent = 'Password salah.'; }
  });
  $('#logout').addEventListener('click', function () { sessionStorage.removeItem('nocta_admin_ok'); location.reload(); });

  function reset() {
    cur = null; slugTouched = false;
    ['title', 'slug', 'cat', 'tags', 'excerpt', 'cover'].forEach(function (k) { $('#f-' + k).value = ''; });
    $('#f-grad').value = '0'; $('#f-pop').checked = false; q.setContents([]); setType(T); msg('');
  }
  function fill(a) {
    cur = a; slugTouched = true;
    setType(a.type === 'panduan' ? 'panduan' : 'artikel');
    $('#f-title').value = a.title; $('#f-slug').value = a.slug; $('#f-tags').value = (a.tags || []).join(', '); $('#f-pop').checked = !!a.popular;
    if (T === 'panduan') { var o = Array.prototype.some.call($('#f-gcat').options, function (x) { return x.value === a.category; }); if (!o) $('#f-gcat').appendChild(new Option(a.category)); $('#f-gcat').value = a.category; } else $('#f-cat').value = a.category;
    $('#f-excerpt').value = a.excerpt; $('#f-cover').value = a.cover || ''; $('#f-grad').value = a.grad | 0;
    q.setContents([]); q.clipboard.dangerouslyPasteHTML(a.html || '');
    $('#mode').textContent = 'Mengedit: ' + a.title; window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function renderList() {
    S.list({ type: 'all' }).then(function (all) {
      var l = all.filter(function (a) { return F === 'all' || a.type === F; });
      all.filter(function (a) { return a.type === 'panduan'; }).forEach(function (a) { if (a.category) addCat(a.category, true); });
      $('#cats').innerHTML = all.filter(function (a) { return a.type !== 'panduan'; }).map(function (a) { return '<option value="' + esc(a.category) + '">'; }).join('');
      $('#list').innerHTML = l.length ? l.map(function (a) {
        return '<div class="row"><div><b>' + esc(a.title) + '</b><small><span class="pill ' + (a.status === 'published' ? 'ok">Terbit' : 'dr">Draft') + '</span><span class="pill ' + (a.type === 'panduan' ? 'gp">Panduan' : 'tp">Artikel') + '</span>' + esc(a.category) + '</small></div><div class="acts">' +
          (a.status === 'published' ? '<a href="' + esc(a.type === 'panduan' ? 'panduan-detail.html?slug=' + encodeURIComponent(a.slug) : a.legacyUrl || 'detail.html?slug=' + encodeURIComponent(a.slug)) + '" target="_blank">Lihat</a>' : '') +
          '<button type="button" data-e="' + a.id + '">Edit</button><button type="button" data-d="' + a.id + '">Hapus</button></div></div>';
      }).join('') : '<p>Belum ada konten.</p>';
    });
  }
  function submit(status) {
    var title = $('#f-title').value.trim(), cat = catEl().value.trim(), ex = $('#f-excerpt').value.trim(), html = q.root.innerHTML;
    if (!title || !cat || !ex) return msg('Judul, kategori, dan ringkasan wajib diisi.');
    if (status === 'published' && !q.getText().trim() && !(cur && cur.legacyUrl)) return msg('Isi konten masih kosong.');
    var cover = $('#f-cover').value.trim();
    if (cover && !/^https?:\/\//i.test(cover)) return msg('Link gambar harus diawali http:// atau https://');
    var art = {
      id: cur ? cur.id : '', type: T, popular: T === 'panduan' && $('#f-pop').checked, slug: slugify($('#f-slug').value) || slugify(title) || 'artikel', title: title, category: cat,
      tags: T === 'panduan' ? [] : $('#f-tags').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean).slice(0, 2),
      excerpt: ex, cover: cover, grad: +$('#f-grad').value, html: q.getText().trim() ? html : '', status: status
    };
    if (cur && cur.minutes && !art.html) art.minutes = cur.minutes;
    S.save(art).then(function (a) {
      msg(status === 'published' ? (T === 'panduan' ? 'Terposting. Sudah tampil di Pusat Panduan dan halaman detail panduan.' : 'Terposting. Sudah tampil di home, halaman artikel, dan halaman detail.') : 'Draft tersimpan.', true);
      cur = a; $('#f-slug').value = a.slug; $('#mode').textContent = 'Mengedit: ' + a.title; setType(T); renderList();
    }).catch(function (e) { msg(e.message); });
  }
  function init() {
    q = new Quill('#editor', { theme: 'snow', placeholder: 'Tulis isi artikel di sini…', modules: { toolbar: { container: [[{ header: [2, 3, false] }], ['bold', 'italic', 'underline'], [{ list: 'ordered' }, { list: 'bullet' }], ['blockquote', 'link', 'image'], ['clean']], handlers: { image: function () {
      var u = (prompt('Link gambar (https://… atau assets/…):') || '').trim();
      if (!u) return;
      if (!/^(https?:\/\/|assets\/)/i.test(u)) return msg('Link gambar harus diawali https:// atau assets/');
      var r = q.getSelection(true); q.insertEmbed(r.index, 'image', u, 'user'); q.setSelection(r.index + 1);
    } } } } });
    setType('artikel');
    var lastCat = $('#f-gcat').value;
    $('#f-gcat').addEventListener('change', function () {
      if (this.value !== '__new') { lastCat = this.value; return; }
      var n = (prompt('Nama kategori panduan baru:') || '').trim().slice(0, 40);
      if (n) { addCat(n); lastCat = n; } else this.value = lastCat;
    });
    $('#t-artikel').addEventListener('click', function () { if (!cur) setType('artikel'); });
    $('#t-panduan').addEventListener('click', function () { if (!cur) setType('panduan'); });
    $('#ftabs').addEventListener('click', function (e) { if (!e.target.dataset.f) return; F = e.target.dataset.f; Array.prototype.forEach.call($('#ftabs').children, function (b) { b.classList.toggle('on', b === e.target); }); renderList(); });
    $('#f-title').addEventListener('input', function () { if (!slugTouched) $('#f-slug').value = slugify(this.value); });
    $('#f-slug').addEventListener('input', function () { slugTouched = true; });
    $('#btnPost').addEventListener('click', function () { submit('published'); });
    $('#btnDraft').addEventListener('click', function () { submit('draft'); });
    $('#btnReset').addEventListener('click', reset);
    $('#list').addEventListener('click', function (e) {
      var id = e.target.dataset.e || e.target.dataset.d; if (!id) return;
      if (e.target.dataset.e) S.getById(id).then(function (a) { if (a) fill(a); });
      else if (confirm('Hapus artikel ini?')) S.remove(id).then(function () { if (cur && cur.id === id) reset(); renderList(); });
    });
    $('#btnExport').addEventListener('click', function () {
      var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([S.exportJson()], { type: 'application/json' })); a.download = 'artikel-nocta.json'; a.click();
    });
    $('#importFile').addEventListener('change', function () {
      var f = this.files[0]; if (!f) return;
      f.text().then(function (t) { return S.importJson(t); }).then(function (n) { msg(n + ' artikel diimpor.', true); renderList(); }).catch(function (e) { msg(e.message); });
    });
    renderList();
  }
  gate();
})();
