/* NoctaPOS — penyimpanan artikel. MODE TES: localStorage (hanya di browser ini).
   Saat pindah ke Firebase, ganti ISI file ini ke Firestore. Nama fungsi dan bentuk datanya tetap sama. */
(function (w) {
  'use strict';
  var KEY = 'nocta_articles_v2';
  var SEED = [
    { id: 'a1', slug: 'artikel-kas-laci-selisih', legacyUrl: 'artikel/artikel-kas-laci-selisih.html', title: '5 Penyebab Kas Laci Konter Selisih dan Cara Mengatasinya', category: 'Kas & Keuangan', tags: ['Kas Laci', 'BRILink'], excerpt: 'Selisih kas hampir selalu berasal dari kebiasaan pencatatan, bukan kecurangan. Kenali penyebabnya satu per satu.', cover: '', grad: 0, html: '', minutes: 4, status: 'published', createdAt: '2026-10-26T08:00:00.000Z' },
    { id: 'a2', slug: 'artikel-kulakan-berdasarkan-data', legacyUrl: 'artikel/artikel-kulakan-berdasarkan-data.html', title: 'Kulakan Pulsa dan Aksesori Berdasarkan Data, Bukan Firasat', category: 'Stok & Kulakan', tags: ['Stok', 'Analisis AI'], excerpt: 'Barang yang terasa laku belum tentu paling menghasilkan. Begini cara membaca data penjualan sebelum belanja stok.', cover: '', grad: 1, html: '', minutes: 4, status: 'published', createdAt: '2026-10-24T08:00:00.000Z' },
    { id: 'a3', slug: 'artikel-batas-minimum-uang-laci', legacyUrl: 'artikel/artikel-batas-minimum-uang-laci.html', title: 'Kenapa Konter BRILink Perlu Batas Minimum Uang Laci', category: 'Kas & Keuangan', tags: ['Notifikasi', 'BRILink'], excerpt: 'Pelanggan datang untuk tarik tunai besar, tetapi uang di laci tidak cukup. Peringatan dini mencegah hal itu.', cover: '', grad: 2, html: '', minutes: 3, status: 'published', createdAt: '2026-10-21T08:00:00.000Z' },
    { id: 'a4', slug: 'artikel-absensi-gps-konter', legacyUrl: 'artikel/artikel-absensi-gps-konter.html', title: 'Absensi GPS untuk Konter: Menutup Celah Kehadiran', category: 'Tim & Absensi', tags: ['Absensi', 'Karyawan'], excerpt: 'Absensi manual mudah dimanipulasi. Lokasi GPS dan kasir yang terkunci sebelum absen membuat jadwal lebih tertib.', cover: '', grad: 3, html: '', minutes: 3, status: 'published', createdAt: '2026-10-18T08:00:00.000Z' },
    { id: 'a5', slug: 'artikel-kpi-bonus-adil', legacyUrl: 'artikel/artikel-kpi-bonus-adil.html', title: 'Menyusun KPI Sederhana dan Bonus yang Adil untuk Karyawan Toko', category: 'Tim & Absensi', tags: ['KPI', 'Gaji'], excerpt: 'KPI tidak harus rumit. Tiga sampai lima indikator sudah cukup untuk menilai karyawan konter.', cover: '', grad: 4, html: '', minutes: 4, status: 'published', createdAt: '2026-10-14T08:00:00.000Z' },
    { id: 'a6', slug: 'artikel-kasir-offline-pwa', legacyUrl: 'artikel/artikel-kasir-offline-pwa.html', title: 'Jualan Tetap Jalan Saat Sinyal Mati: Cara Kerja Kasir Offline', category: 'Fitur & Panduan', tags: ['Offline', 'PWA'], excerpt: 'Sinyal di konter tidak selalu stabil. Aplikasi kasir yang offline-first membuat transaksi tetap tercatat.', cover: '', grad: 5, html: '', minutes: 3, status: 'published', createdAt: '2026-10-10T08:00:00.000Z' }
  ];
  function load() {
    try { var r = localStorage.getItem(KEY); if (r) return JSON.parse(r); } catch (e) {}
    try { localStorage.setItem(KEY, JSON.stringify(SEED)); } catch (e) {}
    return SEED.slice();
  }
  function persist(a) {
    try { localStorage.setItem(KEY, JSON.stringify(a)); return true; } catch (e) { return false; }
  }
  var S = {
    list: function (o) {
      var a = load().filter(function (x) { return !(o && o.published) || x.status === 'published'; });
      a.sort(function (x, y) { return x.createdAt < y.createdAt ? 1 : -1; });
      return Promise.resolve(a);
    },
    getBySlug: function (slug) {
      var f = load().filter(function (x) { return x.slug === slug && x.status === 'published'; })[0];
      return Promise.resolve(f || null);
    },
    getById: function (id) { return Promise.resolve(load().filter(function (x) { return x.id === id; })[0] || null); },
    save: function (art) {
      var a = load(), now = new Date().toISOString(), base = art.slug, n = 2;
      while (a.some(function (x) { return x.slug === art.slug && x.id !== art.id; })) art.slug = base + '-' + n++;
      var i = art.id ? a.map(function (x) { return x.id; }).indexOf(art.id) : -1;
      if (i < 0) { art.id = 'a' + Date.now(); art.createdAt = now; a.push(art); }
      else { art.createdAt = a[i].createdAt; art.legacyUrl = a[i].legacyUrl; a[i] = art; }
      art.updatedAt = now;
      return persist(a) ? Promise.resolve(art) : Promise.reject(new Error('Penyimpanan browser penuh.'));
    },
    remove: function (id) {
      return persist(load().filter(function (x) { return x.id !== id; })) ? Promise.resolve() : Promise.reject(new Error('Gagal menghapus.'));
    },
    exportJson: function () { return JSON.stringify(load(), null, 2); },
    importJson: function (txt) {
      var a = JSON.parse(txt);
      if (!Array.isArray(a)) throw new Error('Format salah.');
      return persist(a) ? Promise.resolve(a.length) : Promise.reject(new Error('Penyimpanan penuh.'));
    }
  };
  w.ArticleStore = S;
})(window);
