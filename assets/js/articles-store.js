/* NoctaPOS — penyimpanan artikel + panduan pengguna (field `type`: 'artikel' | 'panduan'). MODE TES: localStorage (hanya di browser ini).
   Saat pindah ke Firebase, ganti ISI file ini ke Firestore. Nama fungsi dan bentuk datanya tetap sama. */
(function (w) {
  'use strict';
  var KEY = 'nocta_articles_v2', GKEY = 'nocta_guides_v1';
  var SEED = [
    { id: 'a1', slug: 'artikel-kas-laci-selisih', legacyUrl: 'artikel/artikel-kas-laci-selisih.html', title: '5 Penyebab Kas Laci Konter Selisih dan Cara Mengatasinya', category: 'Kas & Keuangan', tags: ['Kas Laci', 'BRILink'], excerpt: 'Selisih kas hampir selalu berasal dari kebiasaan pencatatan, bukan kecurangan. Kenali penyebabnya satu per satu.', cover: '', grad: 0, html: '', minutes: 4, status: 'published', createdAt: '2026-10-26T08:00:00.000Z' },
    { id: 'a2', slug: 'artikel-kulakan-berdasarkan-data', legacyUrl: 'artikel/artikel-kulakan-berdasarkan-data.html', title: 'Kulakan Pulsa dan Aksesori Berdasarkan Data, Bukan Firasat', category: 'Stok & Kulakan', tags: ['Stok', 'Analisis AI'], excerpt: 'Barang yang terasa laku belum tentu paling menghasilkan. Begini cara membaca data penjualan sebelum belanja stok.', cover: '', grad: 1, html: '', minutes: 4, status: 'published', createdAt: '2026-10-24T08:00:00.000Z' },
    { id: 'a3', slug: 'artikel-batas-minimum-uang-laci', legacyUrl: 'artikel/artikel-batas-minimum-uang-laci.html', title: 'Kenapa Konter BRILink Perlu Batas Minimum Uang Laci', category: 'Kas & Keuangan', tags: ['Notifikasi', 'BRILink'], excerpt: 'Pelanggan datang untuk tarik tunai besar, tetapi uang di laci tidak cukup. Peringatan dini mencegah hal itu.', cover: '', grad: 2, html: '', minutes: 3, status: 'published', createdAt: '2026-10-21T08:00:00.000Z' },
    { id: 'a4', slug: 'artikel-absensi-gps-konter', legacyUrl: 'artikel/artikel-absensi-gps-konter.html', title: 'Absensi GPS untuk Konter: Menutup Celah Kehadiran', category: 'Tim & Absensi', tags: ['Absensi', 'Karyawan'], excerpt: 'Absensi manual mudah dimanipulasi. Lokasi GPS dan kasir yang terkunci sebelum absen membuat jadwal lebih tertib.', cover: '', grad: 3, html: '', minutes: 3, status: 'published', createdAt: '2026-10-18T08:00:00.000Z' },
    { id: 'a5', slug: 'artikel-kpi-bonus-adil', legacyUrl: 'artikel/artikel-kpi-bonus-adil.html', title: 'Menyusun KPI Sederhana dan Bonus yang Adil untuk Karyawan Toko', category: 'Tim & Absensi', tags: ['KPI', 'Gaji'], excerpt: 'KPI tidak harus rumit. Tiga sampai lima indikator sudah cukup untuk menilai karyawan konter.', cover: '', grad: 4, html: '', minutes: 4, status: 'published', createdAt: '2026-10-14T08:00:00.000Z' },
    { id: 'a6', slug: 'artikel-kasir-offline-pwa', legacyUrl: 'artikel/artikel-kasir-offline-pwa.html', title: 'Jualan Tetap Jalan Saat Sinyal Mati: Cara Kerja Kasir Offline', category: 'Fitur & Panduan', tags: ['Offline', 'PWA'], excerpt: 'Sinyal di konter tidak selalu stabil. Aplikasi kasir yang offline-first membuat transaksi tetap tercatat.', cover: '', grad: 5, html: '', minutes: 3, status: 'published', createdAt: '2026-10-10T08:00:00.000Z' }
  ];
  function G(id, slug, title, cat, ex, min, pop, grad, day, html) {
    return { id: id, type: 'panduan', slug: slug, title: title, category: cat, tags: [], excerpt: ex, cover: '', grad: grad, html: html, minutes: min, popular: pop, status: 'published', createdAt: '2026-11-' + day + 'T08:00:00.000Z' };
  }
  /* CONTOH ISI — sesuaikan nama menu/langkah dengan aplikasi NoctaPOS yang sebenarnya, atau edit lewat admin.html */
  var GSEED = [
    G('g1', 'cara-mendaftar-dan-login', 'Cara Mendaftar dan Login ke NoctaPOS', 'Memulai NoctaPOS', 'Buat akun, masuk, dan siapkan toko pertamamu dalam beberapa menit.', 3, false, 0, '01',
      '<h2>Informasi Umum</h2><p>Akun NoctaPOS dipakai untuk masuk ke kasir dan melihat laporan toko. Satu akun bisa dipakai di perangkat berbeda.</p><h2>Membuat akun baru</h2><ol><li>Klik tombol <strong>Coba Gratis</strong> di halaman utama.</li><li>Isi nama, email, dan password.</li><li>Ikuti petunjuk di layar sampai akun aktif.</li></ol><h2>Masuk ke akun</h2><p>Klik <strong>Login</strong>, lalu masukkan email dan password yang sudah didaftarkan.</p><h2>Tips</h2><ul><li>Gunakan password yang tidak dipakai di layanan lain.</li><li>Jangan bagikan password ke karyawan, buat akun terpisah untuk mereka.</li></ul>'),
    G('g2', 'menyiapkan-saldo-awal-kas-dan-bank', 'Menyiapkan Saldo Awal Kas dan Bank', 'Memulai NoctaPOS', 'Isi saldo awal supaya kas tunai dan saldo bank terpisah dan mudah dicocokkan.', 4, false, 4, '02',
      '<h2>Informasi Umum</h2><p>NoctaPOS memisahkan kas tunai di laci dan saldo bank. Isi keduanya di awal agar laporan akurat sejak hari pertama.</p><h2>Langkah-langkah</h2><ol><li>Hitung uang tunai yang ada di laci sekarang.</li><li>Cek saldo rekening yang dipakai untuk layanan bank.</li><li>Masukkan kedua angka sebagai saldo awal.</li></ol><h2>Tips</h2><p>Lakukan pengisian saat toko tutup supaya tidak ada transaksi yang tercampur.</p>'),
    G('g3', 'cara-menambahkan-produk-baru', 'Cara Menambahkan Produk Baru', 'Transaksi & Penjualan', 'Tambahkan produk, harga, dan stok awal agar siap dijual di kasir.', 5, true, 0, '03',
      '<h2>Informasi Umum</h2><p>Produk yang sudah ditambahkan akan muncul di kasir dan ikut terhitung di laporan stok.</p><h2>Menambahkan produk</h2><ol><li>Buka menu <strong>Produk</strong>.</li><li>Klik tombol tambah (<strong>+</strong>).</li><li>Isi nama produk, harga beli, harga jual, dan stok awal.</li><li>Simpan.</li></ol><h2>Mengubah atau menghapus produk</h2><p>Pilih produk dari daftar, ubah datanya, lalu simpan. Produk yang sudah punya riwayat transaksi sebaiknya dinonaktifkan, bukan dihapus.</p><h2>Tips</h2><ul><li>Pakai nama yang konsisten, misalnya <em>Pulsa Tsel 10K</em>.</li><li>Isi harga beli supaya laba bisa dihitung.</li></ul>'),
    G('g4', 'cara-memproses-transaksi-penjualan', 'Cara Memproses Transaksi Penjualan', 'Transaksi & Penjualan', 'Catat penjualan dari memilih produk sampai pembayaran selesai.', 6, true, 2, '04',
      '<h2>Informasi Umum</h2><p>Setiap penjualan tercatat otomatis ke kas dan stok. Transaksi tetap bisa dicatat saat sinyal mati.</p><h2>Langkah-langkah</h2><ol><li>Buka halaman <strong>Kasir</strong>.</li><li>Pilih produk yang dibeli pelanggan.</li><li>Periksa jumlah dan total belanja.</li><li>Pilih metode bayar, lalu konfirmasi.</li></ol><h2>Jika salah input</h2><p>Segera koreksi sebelum tutup kasir supaya selisih kas tidak muncul di laporan.</p>'),
    G('g5', 'mencatat-tarik-tunai-dan-setor-tunai', 'Mencatat Tarik Tunai dan Setor Tunai BRILink', 'Transaksi & Penjualan', 'Catat transaksi agen supaya kas tunai dan saldo bank bergerak dengan benar.', 5, false, 1, '05',
      '<h2>Informasi Umum</h2><p>Tarik tunai menambah uang di bank dan mengurangi uang di laci, sedangkan setor tunai sebaliknya. NoctaPOS mencatat keduanya terpisah.</p><h2>Langkah-langkah</h2><ol><li>Pilih jenis transaksi: tarik tunai atau setor tunai.</li><li>Masukkan nominal dan biaya admin.</li><li>Konfirmasi transaksi.</li></ol><h2>Tips</h2><p>Catat tepat saat transaksi berlangsung, jangan menumpuk di akhir hari.</p>'),
    G('g6', 'cara-membaca-laporan-penjualan', 'Cara Membaca Laporan Penjualan', 'Laporan & Analitik', 'Pahami angka omzet, laba, dan produk terlaris di laporan.', 7, true, 3, '06',
      '<h2>Informasi Umum</h2><p>Laporan penjualan merangkum transaksi per hari atau per periode, sehingga kamu tahu mana yang laku dan mana yang menghasilkan.</p><h2>Yang perlu dilihat</h2><ul><li><strong>Omzet</strong>: total uang masuk dari penjualan.</li><li><strong>Laba</strong>: omzet dikurangi harga beli.</li><li><strong>Produk terlaris</strong>: acuan untuk kulakan berikutnya.</li></ul><h2>Membandingkan periode</h2><p>Bandingkan minggu ini dengan minggu lalu untuk melihat tren. Barang yang terasa laku belum tentu paling menguntungkan.</p>'),
    G('g7', 'mencocokkan-kas-laci-saat-tutup-kasir', 'Mencocokkan Kas Laci Saat Tutup Kasir', 'Laporan & Analitik', 'Hitung uang fisik dan bandingkan dengan catatan sistem untuk menemukan selisih.', 4, false, 4, '07',
      '<h2>Informasi Umum</h2><p>Di akhir shift, hitung uang fisik di laci lalu masukkan ke NoctaPOS. Sistem langsung menunjukkan selisihnya.</p><h2>Langkah-langkah</h2><ol><li>Hitung uang fisik di laci.</li><li>Masukkan nominalnya saat tutup kasir.</li><li>Periksa selisih yang muncul.</li></ol><h2>Jika ada selisih</h2><p>Cek transaksi hari itu, terutama tarik tunai dan setor tunai yang belum dicatat.</p>'),
    G('g8', 'mengatur-batas-minimum-uang-laci', 'Mengatur Batas Minimum Uang Laci', 'Pengaturan & Personalisasi', 'Dapatkan peringatan saat uang di laci hampir habis.', 3, false, 2, '08',
      '<h2>Informasi Umum</h2><p>Batas minimum membuat kamu diperingatkan sebelum uang laci tidak cukup untuk tarik tunai pelanggan.</p><h2>Langkah-langkah</h2><ol><li>Buka menu <strong>Pengaturan</strong>.</li><li>Cari pengaturan batas minimum kas.</li><li>Isi nominal sesuai kebutuhan toko, lalu simpan.</li></ol>'),
    G('g9', 'mengaktifkan-laporan-harian-ke-telegram', 'Mengaktifkan Laporan Harian ke Telegram', 'Pengaturan & Personalisasi', 'Terima ringkasan toko langsung di Telegram.', 4, false, 5, '09',
      '<h2>Informasi Umum</h2><p>Laporan ke Telegram membuat pemilik tetap tahu kondisi toko tanpa harus membuka aplikasi.</p><h2>Langkah-langkah</h2><ol><li>Buka menu <strong>Pengaturan</strong>, lalu bagian Telegram.</li><li>Ikuti petunjuk untuk menghubungkan akun Telegram.</li><li>Pilih laporan atau notifikasi yang ingin diterima.</li></ol>'),
    G('g10', 'transaksi-offline-belum-tersinkron', 'Transaksi Offline Belum Tersinkron, Apa yang Harus Dilakukan?', 'Bantuan & Pemecahan Masalah', 'Langkah cek saat transaksi yang dicatat tanpa sinyal belum muncul di laporan.', 4, false, 1, '10',
      '<h2>Informasi Umum</h2><p>Saat sinyal mati, transaksi disimpan di perangkat dan dikirim otomatis begitu koneksi kembali.</p><h2>Yang bisa dicoba</h2><ol><li>Pastikan perangkat sudah terhubung ke internet.</li><li>Biarkan aplikasi terbuka beberapa saat agar sinkronisasi berjalan.</li><li>Jangan menghapus data browser atau aplikasi sebelum sinkron selesai.</li></ol><h2>Masih bermasalah?</h2><p>Hubungi tim kami lewat halaman Kontak dan sertakan waktu transaksi yang belum muncul.</p>'),
    G('g11', 'absensi-gps-karyawan', 'Absensi GPS Karyawan', 'Fitur Lainnya', 'Pakai lokasi GPS agar kehadiran karyawan tercatat lebih tertib.', 4, false, 3, '11',
      '<h2>Informasi Umum</h2><p>Absensi GPS memastikan karyawan absen dari lokasi toko, dan kasir terkunci sebelum absen dilakukan.</p><h2>Langkah-langkah</h2><ol><li>Aktifkan fitur absensi di pengaturan.</li><li>Pastikan lokasi toko sudah diatur.</li><li>Minta karyawan mengizinkan akses lokasi di perangkatnya.</li></ol>')
  ];
  function read(k, seed, type) {
    var r = null;
    try { var s = localStorage.getItem(k); if (s) r = JSON.parse(s); } catch (e) {}
    if (!r) { r = seed.slice(); try { localStorage.setItem(k, JSON.stringify(r)); } catch (e) {} }
    return r.map(function (x) { x.type = type; return x; });
  }
  function load() { return read(KEY, SEED, 'artikel').concat(read(GKEY, GSEED, 'panduan')); }
  function persist(all) {
    var a = [], g = [];
    all.forEach(function (x) { (x.type === 'panduan' ? g : a).push(x); });
    try { localStorage.setItem(KEY, JSON.stringify(a)); localStorage.setItem(GKEY, JSON.stringify(g)); return true; } catch (e) { return false; }
  }
  var S = {
    /* list({published, type}) — type: 'artikel' (default) | 'panduan' | 'all' */
    list: function (o) {
      var t = (o && o.type) || 'artikel';
      var a = load().filter(function (x) { return (t === 'all' || x.type === t) && (!(o && o.published) || x.status === 'published'); });
      a.sort(function (x, y) { return x.createdAt < y.createdAt ? 1 : -1; });
      return Promise.resolve(a);
    },
    getBySlug: function (slug, type) {
      var f = load().filter(function (x) { return x.slug === slug && x.type === (type || 'artikel') && x.status === 'published'; })[0];
      return Promise.resolve(f || null);
    },
    getById: function (id) { return Promise.resolve(load().filter(function (x) { return x.id === id; })[0] || null); },
    save: function (art) {
      var a = load(), now = new Date().toISOString(), base = art.slug, n = 2;
      art.type = art.type === 'panduan' ? 'panduan' : 'artikel';
      while (a.some(function (x) { return x.type === art.type && x.slug === art.slug && x.id !== art.id; })) art.slug = base + '-' + n++;
      var i = art.id ? a.map(function (x) { return x.id; }).indexOf(art.id) : -1;
      if (i < 0) { art.id = (art.type === 'panduan' ? 'g' : 'a') + Date.now(); art.createdAt = now; a.push(art); }
      else { art.type = a[i].type; art.createdAt = a[i].createdAt; art.legacyUrl = a[i].legacyUrl; a[i] = art; }
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
      a.forEach(function (x) { x.type = x.type === 'panduan' ? 'panduan' : 'artikel'; });
      var cur = load(), hasG = a.some(function (x) { return x.type === 'panduan'; }), hasA = a.some(function (x) { return x.type === 'artikel'; });
      var keep = cur.filter(function (x) { return x.type === 'panduan' ? !hasG : !hasA; }); /* cadangan lama tanpa panduan tidak menghapus panduan yang ada */
      return persist(a.concat(keep)) ? Promise.resolve(a.length) : Promise.reject(new Error('Penyimpanan penuh.'));
    }
  };
  w.ArticleStore = S;
})(window);
