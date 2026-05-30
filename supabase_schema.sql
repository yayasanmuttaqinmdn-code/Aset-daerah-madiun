-- Script SQL Supabase untuk Aplikasi Inventaris Daerah Madiun
-- Jalankan script ini pada menu "SQL Editor" di dashboard Supabase Anda.

-- Tabel pengaturan aplikasi untuk menyimpan password admin secara global
CREATE TABLE IF NOT EXISTS public.app_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Masukkan password default
INSERT INTO public.app_settings (key, value)
VALUES ('admin_password', 'muttaqin')
ON CONFLICT (key) DO NOTHING;

-- Mengaktifkan RLS untuk app_settings
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all operations for all users on app_settings" ON public.app_settings;
CREATE POLICY "Enable all operations for all users on app_settings" ON public.app_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Menghapus tabel jika sudah ada (opsional, berhati-hatilah agar tidak menghapus data jika sudah ada)
-- DROP TABLE IF EXISTS public.assets;

CREATE TABLE IF NOT EXISTS public.assets (
  -- Field Umum
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('tanah', 'kendaraan', 'bangunan')),
  created_at BIGINT NOT NULL,
  
  -- Field Status Balik Nama (Shared)
  sedang_balik_nama BOOLEAN DEFAULT false,
  nama_pemilik_baru TEXT,
  catatan_balik_nama TEXT,
  tanggal_mulai_balik_nama TEXT,
  riwayat_balik_nama JSONB, -- Menyimpan array RiwayatBalikNama
  
  -- Field Status Peminjaman (Shared)
  sedang_dipinjam BOOLEAN DEFAULT false,
  peminjaman_aktif JSONB,   -- Menyimpan object PeminjamanBerkas
  riwayat_peminjaman JSONB, -- Menyimpan array PeminjamanBerkas

  -- Field Khusus: Aset Tanah
  jenis_sertifikat TEXT CHECK (jenis_sertifikat IN ('SHM', 'WAQAF', 'SHGB', 'LETER C', NULL)),
  nomer_sertifikat TEXT,
  atas_nama_sertifikat TEXT,
  lokasi TEXT, -- Digunakan juga oleh Bangunan
  penggunaan TEXT,
  tempat_simpan_berkas TEXT,
  luas_tanah NUMERIC,

  -- Field Khusus: Aset Kendaraan
  jenis_kendaraan TEXT CHECK (jenis_kendaraan IN ('MOTOR', 'MOBIL', 'ELF', 'BUS', NULL)),
  nomor_polisi TEXT,
  merk TEXT,
  atas_nama TEXT,
  tahun_pembuatan INTEGER,
  kondisi_kendaraan TEXT CHECK (kondisi_kendaraan IN ('BAIK', 'RUSAK RINGAN', 'RUSAK BERAT', NULL)),
  tanggal_bulan_pajak TEXT,
  penanggung_jawab_daerah TEXT,

  -- Field Khusus: Aset Bangunan
  nama_bangunan TEXT,
  luas_bangunan NUMERIC,
  penggunaan_bangunan TEXT,
  nomer_pbg TEXT,
  nomer_slf TEXT,
  kondisi TEXT CHECK (kondisi IN ('BAIK', 'RUSAK RINGAN', 'RUSAK BERAT', NULL)),
  keterangan_kerusakan TEXT
);

-- Mengaktifkan Row Level Security (RLS)
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;

-- Membuat Policy agar semua pengguna anonim/terautentikasi dapat melakukan operasi CRUD (Baca, Tulis, Ubah, Hapus)
-- CATATAN: Untuk production yang aman, sesuaikan RLS ini agar hanya user yang terotentikasi yang bisa write.
DROP POLICY IF EXISTS "Enable all operations for all users" ON public.assets;
DROP POLICY IF EXISTS "Aktifkan semua operasi untuk semua pengguna" ON public.assets;

CREATE POLICY "Enable all operations for all users" ON public.assets
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Membuat Indeks untuk mempercepat pencarian berdasarkan tipe aset
CREATE INDEX IF NOT EXISTS idx_assets_type ON public.assets(type);
