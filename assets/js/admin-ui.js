/* NoctaPOS admin — navigasi tab (Editor / Konten / Kategori) + pesan yang hilang sendiri.
   File terpisah karena CSP halaman admin tidak mengizinkan script inline. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var tabs = document.querySelectorAll('[data-tab]'), views = document.querySelectorAll('[data-view]');

  function show(name) {
    Array.prototype.forEach.call(tabs, function (b) { b.classList.toggle('on', b.dataset.tab === name); });
    Array.prototype.forEach.call(views, function (v) { v.hidden = v.dataset.view !== name; });
    window.scrollTo(0, 0);
  }
  Array.prototype.forEach.call(tabs, function (b) { b.addEventListener('click', function () { show(b.dataset.tab); }); });

  /* klik "Edit" di daftar konten -> pindah ke tab Editor (admin.js yang mengisi formulir) */
  $('#list').addEventListener('click', function (e) { if (e.target.dataset && e.target.dataset.e) show('editor'); });

  /* pesan (#msg) hilang sendiri setelah beberapa detik */
  var m = $('#msg'), t;
  new MutationObserver(function () {
    clearTimeout(t);
    if (m.textContent) t = setTimeout(function () { m.textContent = ''; m.className = ''; }, 4500);
  }).observe(m, { childList: true, characterData: true, subtree: true });
})();
