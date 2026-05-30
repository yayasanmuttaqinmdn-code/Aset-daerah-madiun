import { useState, useEffect } from 'react';
import { MapPin, Car, Building, ShieldCheck, RefreshCw, Layers, FileSpreadsheet, CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';
import { Asset, AsetTanah } from '../types';

interface DashboardProps {
  assets: Asset[];
  onNavigateToTab: (tab: string) => void;
  syncStatus: 'synced' | 'pending' | 'offline';
  onSyncManual: () => void;
  googleUser: any;
  googleToken: string | null;
  onSignInGoogle: () => void;
  onLogoutGoogle: () => void;
  spreadsheetId: string;
  onUpdateSpreadsheetId: (newId: string) => Promise<void>;
  sheetsConnected: boolean;
  sheetsError: string | null;
}

export default function Dashboard({ 
  assets, 
  onNavigateToTab, 
  syncStatus, 
  onSyncManual,
  googleUser,
  googleToken,
  onSignInGoogle,
  onLogoutGoogle,
  spreadsheetId,
  onUpdateSpreadsheetId,
  sheetsConnected,
  sheetsError,
}: DashboardProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [inputSheetId, setInputSheetId] = useState(spreadsheetId);

  useEffect(() => {
    setInputSheetId(spreadsheetId);
  }, [spreadsheetId]);

  const handleSaveId = () => {
    if (!inputSheetId.trim()) {
      alert('Spreadsheet ID tidak boleh kosong.');
      return;
    }
    onUpdateSpreadsheetId(inputSheetId.trim());
  };
  const tanahCount = assets.filter(a => a.type === 'tanah').length;
  const kendaraanCount = assets.filter(a => a.type === 'kendaraan').length;
  const bangunanCount = assets.filter(a => a.type === 'bangunan').length;

  // Filter land assets matching "Yayasan Pondok Pesantren Muttaqin Josenan"
  const yayasanLandAssets = assets.filter(a => {
    if (a.type !== 'tanah') return false;
    const name = (a.atasNamaSertifikat || '').toLowerCase();
    return (
      name.includes('muttaqin') || 
      name.includes('mutaqin') || 
      name.includes('josenan') ||
      (name.includes('pondok') && name.includes('pesantren'))
    );
  }) as AsetTanah[];

  // Group vehicles by jenisKendaraan dynamically from the database
  const kendaraanJenis = assets
    .filter(a => a.type === 'kendaraan')
    .reduce(
      (acc, curr: any) => {
        const jenis = String(curr.jenisKendaraan || 'MOTOR').toUpperCase();
        acc[jenis] = (acc[jenis] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

  const getJenisColor = (jenis: string) => {
    switch (jenis) {
      case 'MOTOR': return { bg: 'bg-indigo-500', text: 'text-indigo-700' };
      case 'MOBIL': return { bg: 'bg-amber-500', text: 'text-amber-700' };
      case 'ELF': return { bg: 'bg-emerald-500', text: 'text-emerald-700' };
      case 'BUS': return { bg: 'bg-rose-500', text: 'text-rose-700' };
      default: return { bg: 'bg-sky-500', text: 'text-sky-700' };
    }
  };

  const bangunanKondisi = assets
    .filter(a => a.type === 'bangunan')
    .reduce(
      (acc, curr: any) => {
        const cond = curr.kondisi;
        if (cond === 'BAIK') acc.baik++;
        else if (cond === 'RUSAK RINGAN') acc.ringan++;
        else if (cond === 'RUSAK BERAT') acc.berat++;
        return acc;
      },
      { baik: 0, ringan: 0, berat: 0 }
    );

  // Recent Inputs
  const recentAssets = [...assets].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);

  return (
    <div className="space-y-6 pb-20">
      {/* Header Hero */}
      <motion.div 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden bg-gradient-to-r from-emerald-800 to-teal-950 p-6 rounded-3xl text-white shadow-md border border-emerald-700/30"
      >
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 opacity-10 pointer-events-none">
          <Layers className="w-80 h-80 text-white" />
        </div>
        <div className="relative z-10 flex flex-col space-y-3">
          <div className="flex justify-between items-center">
            <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-bold tracking-wider uppercase px-3 py-1 rounded-full flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Tim Penghimpun Benda Sabilillah 
            </span>
            <button 
              onClick={onSyncManual}
              className={`p-2 rounded-xl transition-all duration-300 touch-manipulation focus:outline-none flex items-center gap-1 text-xs font-semibold ${
                syncStatus === 'synced' 
                  ? 'bg-emerald-700/40 text-emerald-300' 
                  : 'bg-amber-500 text-emerald-950'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === 'pending' ? 'animate-spin' : ''}`} />
              {syncStatus === 'synced' ? 'Tersinkron' : 'Sinkronkan'}
            </button>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white leading-tight">
              DAFTAR ASET SB DAERAH MADIUN
            </h1>
            <p className="text-emerald-200 text-xs mt-1">
              Sistem Informasi Manajemen Terpadu untuk Tanah, Kendaraan Mobilisasi, dan Bangunan Gedung Madiun.
            </p>
          </div>
        </div>
      </motion.div>



      {/* Stats Bento Grid */}
      <div className="grid grid-cols-3 gap-3">
        {/* Card Tanah */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          onClick={() => onNavigateToTab('database')}
          className="bg-white p-3.5 rounded-2xl shadow-sm border-2 border-slate-200 flex flex-col justify-between cursor-pointer hover:border-blue-300 hover:shadow-md transition-all duration-200 active:scale-95"
        >
          <div className="p-2 bg-blue-100 text-blue-700 rounded-xl w-9 h-9 flex items-center justify-center">
            <span className="text-lg">🏘️</span>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Tanah</p>
            <p className="text-lg font-black text-slate-900 mt-1">{tanahCount} <span className="text-[10px] font-normal text-slate-400">Unit</span></p>
          </div>
        </motion.div>

        {/* Card Kendaraan */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15 }}
          onClick={() => onNavigateToTab('database')}
          className="bg-white p-3.5 rounded-2xl shadow-sm border-2 border-slate-200 flex flex-col justify-between cursor-pointer hover:border-amber-300 hover:shadow-md transition-all duration-200 active:scale-95"
        >
          <div className="p-2 bg-amber-100 text-amber-600 rounded-xl w-9 h-9 flex items-center justify-center">
            <span className="text-lg">🚐</span>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Kendaraan</p>
            <p className="text-lg font-black text-slate-900 mt-1">{kendaraanCount} <span className="text-[10px] font-normal text-slate-400">Unit</span></p>
          </div>
        </motion.div>

        {/* Card Bangunan */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => onNavigateToTab('database')}
          className="bg-white p-3.5 rounded-2xl shadow-sm border-2 border-slate-200 flex flex-col justify-between cursor-pointer hover:border-purple-300 hover:shadow-md transition-all duration-200 active:scale-95"
        >
          <div className="p-2 bg-purple-100 text-purple-600 rounded-xl w-9 h-9 flex items-center justify-center">
            <span className="text-lg">🏢</span>
          </div>
          <div className="mt-3">
            <p className="text-[10px] font-bold text-slate-500 uppercase leading-tight">Bangunan</p>
            <p className="text-lg font-black text-slate-900 mt-1">{bangunanCount} <span className="text-[10px] font-normal text-slate-400">Unit</span></p>
          </div>
        </motion.div>
      </div>

      {/* Aset Yayasan Pondok Pesantren Muttaqin Josenan */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-emerald-600 space-y-4 relative overflow-hidden transition-all duration-250">
        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-50 rounded-full translate-x-1/3 -translate-y-1/3 opacity-40 pointer-events-none" />
        <div className="flex justify-between items-center relative z-10 flex-wrap gap-2">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>🛡️ Aset Tanah Atas Nama Yayasan PP Muttaqin Josenan</span>
          </h3>
          <span className="bg-emerald-600 text-white text-[11px] px-3 py-1 rounded-full font-black shadow-xs">
            {yayasanLandAssets.length} dari {tanahCount} Aset Tanah
          </span>
        </div>

        <div className="space-y-3 relative z-10">
          <div className="flex items-center justify-between text-xs font-black text-slate-700">
            <span>Progres Sertifikasi</span>
            <span className="text-emerald-700 font-black">
              {tanahCount > 0 ? Math.round((yayasanLandAssets.length / tanahCount) * 100) : 0}% Selesai
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
            <div 
              className="bg-emerald-600 h-full rounded-full transition-all duration-500 shadow-inner" 
              style={{ width: `${tanahCount ? (yayasanLandAssets.length / tanahCount) * 100 : 0}%` }}
            />
          </div>
          <p className="text-[10px] text-slate-500 font-medium leading-relaxed font-sans mt-1">
            Sebanyak <strong className="text-emerald-800 font-extrabold">{yayasanLandAssets.length} dari {tanahCount} aset tanah</strong> yang tercatat di sistem ini telah resmi selesai balik nama atas nama <span className="underline decoration-emerald-300 font-bold text-slate-700">YAYASAN PONDOK PESANTREN MUTTAQIN JOSENAN</span>.
          </p>
        </div>
      </div>

      {/* Conditions Monitor */}
      <div className="grid grid-cols-1 gap-4">
        {/* Jenis Kendaraan */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-slate-200 space-y-3.5 hover:border-slate-300 transition-all duration-200">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">📊 Jenis Kendaraan di Database</span>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">({kendaraanCount} Unit)</span>
          </h3>
          <div className="space-y-3">
            {kendaraanCount === 0 ? (
              <p className="text-slate-400 text-xs font-medium text-center py-4">Belum ada data kendaraan.</p>
            ) : (
              Object.entries(kendaraanJenis).map(([jenis, count]) => {
                const colors = getJenisColor(jenis);
                const percent = (count / kendaraanCount) * 100;
                return (
                  <div key={jenis}>
                    <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                      <span>{jenis}</span>
                      <span className={colors.text}>{count} unit ({Math.round(percent)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`${colors.bg} h-full rounded-full transition-all duration-500`} 
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Kondisi Bangunan */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-slate-200 space-y-3.5 hover:border-slate-300 transition-all duration-200">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center justify-between">
            <span className="flex items-center gap-1.5">🏢 Kondisi Bangunan Gedung</span>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">({bangunanCount} Gedung)</span>
          </h3>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                <span>Baik</span>
                <span className="text-emerald-700">{bangunanKondisi.baik} unit</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${bangunanCount ? (bangunanKondisi.baik / bangunanCount) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                <span>Rusak Ringan</span>
                <span className="text-amber-700">{bangunanKondisi.ringan} unit</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${bangunanCount ? (bangunanKondisi.ringan / bangunanCount) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[11px] font-bold text-slate-600 mb-1.5">
                <span>Rusak Berat</span>
                <span className="text-rose-700">{bangunanKondisi.berat} unit</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-rose-500 h-full rounded-full transition-all duration-500" 
                  style={{ width: `${bangunanCount ? (bangunanKondisi.berat / bangunanCount) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity List */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border-2 border-slate-200 hover:border-slate-300 transition-all duration-200 space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <span>📝 Aktivitas Input Terakhir</span>
            <span className="bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-full uppercase font-bold">Terbaru</span>
          </h3>
          <button 
            type="button"
            onClick={() => onNavigateToTab('database')}
            className="text-xs text-emerald-800 font-bold hover:underline bg-emerald-50 px-2.5 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            Lihat Semua
          </button>
        </div>
        
        {recentAssets.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-xs font-medium">
            Belum ada aset terdaftar. Silakan masukkan data di Tab "Input Aset".
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentAssets.map((asset) => (
              <div key={asset.id} className="py-3 flex items-center justify-between first:pt-0 last:pb-0">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl text-lg ${
                    asset.type === 'tanah' ? 'bg-blue-50 text-blue-700' :
                    asset.type === 'kendaraan' ? 'bg-amber-50 text-amber-700' : 'bg-purple-50 text-purple-700'
                  }`}>
                    {asset.type === 'tanah' && '🏘️'}
                    {asset.type === 'kendaraan' && '🚐'}
                    {asset.type === 'bangunan' && '🏢'}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 leading-snug">
                      {asset.type === 'tanah' && `${asset.jenisSertifikat} - No. ${asset.nomerSertifikat}`}
                      {asset.type === 'kendaraan' && `${asset.merk} (${asset.nomorPolisi})`}
                      {asset.type === 'bangunan' && asset.namaBangunan}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Lokasi: {asset.type === 'kendaraan' ? (asset as any).atasNama : asset.lokasi}
                    </span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                    asset.type === 'tanah' ? 'bg-blue-100 text-blue-700' :
                    asset.type === 'kendaraan' ? 'bg-amber-100 text-amber-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {asset.type}
                  </span>
                  <div className="text-[9px] text-slate-400 mt-1 font-mono">
                    {new Date(asset.createdAt).toLocaleDateString('id-ID')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mobile Input Guide */}
      <div className="bg-amber-50/70 border-2 border-amber-200/50 p-5 rounded-2xl text-slate-800 text-xs leading-relaxed space-y-1.5 shadow-sm">
        <h4 className="font-extrabold text-amber-800 flex items-center gap-1 text-sm">💡 Petunjuk Input Ponsel:</h4>
        <p className="text-slate-600 font-medium">Aplikasi didesain khusus agar ringan & mudah diisi langsung dari lokasi lapangan (menggunakan Handphone). Anda bisa langsung mencatat ketika survei:</p>
        <ol className="list-decimal pl-4 mt-2 space-y-1 font-semibold text-slate-700">
          <li>Pilih tab <span className="text-amber-850 font-bold">"Input Aset"</span> untuk mencatat.</li>
          <li>Data tersimpan aman di <span className="text-amber-850 font-bold">Cloud Server</span> &amp; <span className="text-amber-850 font-bold">Local Storage</span> browser Anda.</li>
          <li>Ekspor data ke <span className="text-amber-850 font-bold">Google Sheets / Excel (CSV)</span> di tab <span className="text-amber-850 font-bold">"Ekspor"</span>.</li>
        </ol>
      </div>
    </div>
  );
}
