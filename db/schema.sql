-- NoctaPOS: penyimpanan artikel + panduan pengguna (Cloudflare D1)
-- Aman dijalankan berulang (semua IF NOT EXISTS / OR IGNORE):
--   npx wrangler d1 execute noctapos-db --remote --file=db/schema.sql

CREATE TABLE IF NOT EXISTS content (
  id         TEXT PRIMARY KEY,
  type       TEXT NOT NULL CHECK (type IN ('artikel','panduan')),
  slug       TEXT NOT NULL,
  title      TEXT NOT NULL,
  category   TEXT NOT NULL,
  tags       TEXT NOT NULL DEFAULT '[]',
  excerpt    TEXT NOT NULL DEFAULT '',
  cover      TEXT NOT NULL DEFAULT '',
  cover_alt  TEXT NOT NULL DEFAULT '',
  cover_pos  TEXT NOT NULL DEFAULT 'center',
  grad       INTEGER NOT NULL DEFAULT 0,
  html       TEXT NOT NULL DEFAULT '',
  minutes    INTEGER NOT NULL DEFAULT 3,
  popular    INTEGER NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  legacy_url TEXT NOT NULL DEFAULT '',
  meta_title TEXT NOT NULL DEFAULT '',
  meta_desc  TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT ''
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_content_type_slug ON content (type, slug);
CREATE INDEX IF NOT EXISTS ix_content_list ON content (type, status, created_at DESC);

CREATE TABLE IF NOT EXISTS categories (
  type TEXT NOT NULL CHECK (type IN ('artikel','panduan')),
  name TEXT NOT NULL,
  pos  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (type, name)
);

INSERT OR IGNORE INTO categories (type, name, pos) VALUES
  ('artikel', 'Kas & Keuangan', 1),
  ('artikel', 'Stok & Kulakan', 2),
  ('artikel', 'Tim & Absensi', 3),
  ('artikel', 'Fitur & Panduan', 4),
  ('panduan', 'Memulai NoctaPOS', 1),
  ('panduan', 'Transaksi & Penjualan', 2),
  ('panduan', 'Laporan & Analitik', 3),
  ('panduan', 'Pengaturan & Personalisasi', 4),
  ('panduan', 'Bantuan & Pemecahan Masalah', 5),
  ('panduan', 'Fitur Lainnya', 6);

-- Pembatas percobaan login (dipakai _middleware.js)
CREATE TABLE IF NOT EXISTS login_attempts (
  ip TEXT NOT NULL,
  at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_login_attempts ON login_attempts (ip, at);

-- Galeri gambar (diunggah dari admin; disajikan lewat /media/<id>.<ext>)
CREATE TABLE IF NOT EXISTS media (
  id         TEXT PRIMARY KEY,
  mime       TEXT NOT NULL,
  bytes      INTEGER NOT NULL,
  w          INTEGER NOT NULL DEFAULT 0,
  h          INTEGER NOT NULL DEFAULT 0,
  name       TEXT NOT NULL DEFAULT '',
  data       TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_media_created ON media (created_at DESC);
