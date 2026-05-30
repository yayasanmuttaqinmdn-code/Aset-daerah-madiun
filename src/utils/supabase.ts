import { createClient } from '@supabase/supabase-js';
import { Asset } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Mapper for DB to JS
const mapDbToAsset = (row: any): Asset => {
  const baseAsset = {
    id: row.id,
    type: row.type,
    createdAt: row.created_at,
    sedangBalikNama: row.sedang_balik_nama,
    namaPemilikBaru: row.nama_pemilik_baru,
    catatanBalikNama: row.catatan_balik_nama,
    tanggalMulaiBalikNama: row.tanggal_mulai_balik_nama,
    progresBalikNama: row.progres_balik_nama || [],
    riwayatBalikNama: row.riwayat_balik_nama || [],
    sedangDipinjam: row.sedang_dipinjam,
    peminjamanAktif: row.peminjaman_aktif,
    riwayatPeminjaman: row.riwayat_peminjaman || [],
  };

  if (row.type === 'tanah') {
    return {
      ...baseAsset,
      type: 'tanah',
      jenisSertifikat: row.jenis_sertifikat,
      nomerSertifikat: row.nomer_sertifikat,
      atasNamaSertifikat: row.atas_nama_sertifikat,
      lokasi: row.lokasi,
      penggunaan: row.penggunaan,
      tempatSimpanBerkas: row.tempat_simpan_berkas,
      luasTanah: row.luas_tanah,
    } as Asset;
  } else if (row.type === 'kendaraan') {
    return {
      ...baseAsset,
      type: 'kendaraan',
      jenisKendaraan: row.jenis_kendaraan,
      nomorPolisi: row.nomor_polisi,
      merk: row.merk,
      atasNama: row.atas_nama,
      tahunPembuatan: row.tahun_pembuatan,
      kondisiKendaraan: row.kondisi_kendaraan,
      tanggalBulanPajak: row.tanggal_bulan_pajak,
      penanggungJawabDaerah: row.penanggung_jawab_daerah,
    } as Asset;
  } else {
    return {
      ...baseAsset,
      type: 'bangunan',
      namaBangunan: row.nama_bangunan,
      lokasi: row.lokasi,
      luasBangunan: row.luas_bangunan,
      penggunaanBangunan: row.penggunaan_bangunan,
      nomerPBG: row.nomer_pbg,
      nomerSLF: row.nomer_slf,
      kondisi: row.kondisi,
      keteranganKerusakan: row.keterangan_kerusakan,
    } as Asset;
  }
};

// Mapper for JS to DB
const mapAssetToDb = (asset: any): any => {
  const dbRow: any = {
    id: asset.id,
    type: asset.type,
    created_at: asset.createdAt,
    sedang_balik_nama: asset.sedangBalikNama || false,
    nama_pemilik_baru: asset.namaPemilikBaru || null,
    catatan_balik_nama: asset.catatanBalikNama || null,
    tanggal_mulai_balik_nama: asset.tanggalMulaiBalikNama || null,
    progres_balik_nama: asset.progresBalikNama || null,
    riwayat_balik_nama: asset.riwayatBalikNama || null,
    sedang_dipinjam: asset.sedangDipinjam || false,
    peminjaman_aktif: asset.peminjamanAktif || null,
    riwayat_peminjaman: asset.riwayatPeminjaman || null,
  };

  if (asset.type === 'tanah') {
    dbRow.jenis_sertifikat = asset.jenisSertifikat || null;
    dbRow.nomer_sertifikat = asset.nomerSertifikat || null;
    dbRow.atas_nama_sertifikat = asset.atasNamaSertifikat || null;
    dbRow.lokasi = asset.lokasi || null;
    dbRow.penggunaan = asset.penggunaan || null;
    dbRow.tempat_simpan_berkas = asset.tempatSimpanBerkas || null;
    dbRow.luas_tanah = asset.luasTanah || null;
  } else if (asset.type === 'kendaraan') {
    dbRow.jenis_kendaraan = asset.jenisKendaraan || null;
    dbRow.nomor_polisi = asset.nomorPolisi || null;
    dbRow.merk = asset.merk || null;
    dbRow.atas_nama = asset.atasNama || null;
    dbRow.tahun_pembuatan = asset.tahunPembuatan || null;
    dbRow.kondisi_kendaraan = asset.kondisiKendaraan || null;
    dbRow.tanggal_bulan_pajak = asset.tanggalBulanPajak || null;
    dbRow.penanggung_jawab_daerah = asset.penanggungJawabDaerah || null;
  } else if (asset.type === 'bangunan') {
    dbRow.nama_bangunan = asset.namaBangunan || null;
    dbRow.luas_bangunan = asset.luasBangunan || null;
    dbRow.penggunaan_bangunan = asset.penggunaanBangunan || null;
    dbRow.nomer_pbg = asset.nomerPBG || null;
    dbRow.nomer_slf = asset.nomerSLF || null;
    dbRow.kondisi = asset.kondisi || null;
    dbRow.keterangan_kerusakan = asset.keteranganKerusakan || null;
    dbRow.lokasi = asset.lokasi || null;
  }

  return dbRow;
};

export const fetchAssetsSupabase = async (): Promise<Asset[]> => {
  if (!supabase) return [];
  const { data, error } = await supabase.from('assets').select('*');
  if (error) {
    console.error('Error fetching assets from Supabase:', error);
    throw error;
  }
  return (data || []).map(mapDbToAsset);
};

export const syncAssetsSupabase = async (assets: Asset[]): Promise<void> => {
  if (!supabase || assets.length === 0) return;
  const dbRows = assets.map(mapAssetToDb);
  const { error } = await supabase.from('assets').upsert(dbRows);
  if (error) {
    console.error('Error syncing assets to Supabase:', error);
    throw error;
  }
};

export const saveAssetSupabase = async (asset: Asset): Promise<void> => {
  if (!supabase) return;
  const dbRow = mapAssetToDb(asset);
  const { error } = await supabase.from('assets').upsert([dbRow]);
  if (error) {
    console.error('Error saving asset to Supabase:', error);
    throw error;
  }
};

export const deleteAssetSupabase = async (id: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('assets').delete().eq('id', id);
  if (error) {
    console.error('Error deleting asset from Supabase:', error);
    throw error;
  }
};

export const fetchAdminPassword = async (): Promise<string> => {
  if (!supabase) return 'muttaqin';
  const { data, error } = await supabase.from('app_settings').select('value').eq('key', 'admin_password').single();
  if (error || !data) {
    console.error('Error fetching admin password from Supabase:', error);
    return 'muttaqin';
  }
  return data.value;
};

export const updateAdminPassword = async (newPassword: string): Promise<void> => {
  if (!supabase) return;
  const { error } = await supabase.from('app_settings').upsert([{ key: 'admin_password', value: newPassword }]);
  if (error) {
    console.error('Error updating admin password in Supabase:', error);
    throw error;
  }
};

