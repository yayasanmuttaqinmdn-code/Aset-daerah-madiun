import { useState, useEffect, FormEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  MapPin, 
  CheckCircle2, 
  Database,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  X,
  Settings,
  Menu
} from 'lucide-react';
import { Asset } from './types';
import Dashboard from './components/Dashboard';
import FormInput from './components/FormInput';
import DatabaseList from './components/DatabaseList';
import ExportPanel from './components/ExportPanel';
import SidebarNav from './components/SidebarNav';
import BalikNamaPanel from './components/BalikNamaPanel';
import PinjamBerkasPanel from './components/PinjamBerkasPanel';
import { initAuth, googleSignIn, logout, getAccessToken } from './utils/auth';
import { fetchAssetsSupabase, saveAssetSupabase, deleteAssetSupabase, syncAssetsSupabase, fetchAdminPassword, updateAdminPassword } from './utils/supabase';

export default function App() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [syncStatus, setSyncStatus] = useState<'synced' | 'pending' | 'offline'>('synced');
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<'admin' | 'viewer'>('viewer');

  // Google authentication states
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);
  const [spreadsheetId, setSpreadsheetId] = useState<string>('1TABYBj6rdO--FUbHbelQG7SG4j-gttvR25mSpurAU2Y');
  const [sheetsError, setSheetsError] = useState<string | null>(null);
  const [sheetsConnected, setSheetsConnected] = useState<boolean>(false);

  const checkSheetsStatus = async (tokenOverride?: string | null) => {
    const activeToken = tokenOverride !== undefined ? tokenOverride : googleToken;
    if (!activeToken) {
      setSheetsConnected(false);
      setSheetsError(null);
      return;
    }
    try {
      const headers: HeadersInit = { 'X-Google-Token': activeToken };
      const res = await fetch('/api/sheets/status', { headers });
      if (res.ok) {
        const data = await res.json();
        setSheetsConnected(data.connected);
        setSheetsError(data.error);
      } else {
        setSheetsConnected(false);
        setSheetsError('Gagal verifikasi status koneksi sheet.');
      }
    } catch (e) {
      console.error(e);
      setSheetsConnected(false);
      setSheetsError('Gagal menghubungi server.');
    }
  };

  // Google Sheets settings fetching has been disabled.
  useEffect(() => {
    // Disabled fetch to /api/settings since Google Sheets is no longer used
  }, []);

  const handleUpdateSpreadsheetId = async (newId: string) => {
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetId: newId }),
      });
      if (response.ok) {
        const result = await response.json();
        if (result.settings?.spreadsheetId) {
          setSpreadsheetId(result.settings.spreadsheetId);
          showToast('Spreadsheet ID berhasil diperbarui!');
          // Force database sync with the new sheet
          setSyncStatus('pending');
          await syncAssetsSupabase(assets);
          setSyncStatus('synced');
          showToast('Data berhasil diselaraskan ke Google Sheets baru!');
          await checkSheetsStatus(googleToken);
        }
      } else {
        showToast('Gagal mengubah Spreadsheet ID.');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal mengubah Spreadsheet ID (Koneksi offline).');
    }
  };

  // Sidebar toggle/visible and collapsed state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Auto-collapse / hide sidebar on smaller screens initially
  useEffect(() => {
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  }, []);

  // Custom secure password states
  const [adminPassword, setAdminPassword] = useState<string>('muttaqin');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  useEffect(() => {
    fetchAdminPassword().then(pass => setAdminPassword(pass));
  }, []);

  // States for changing the admin password
  const [oldPasswordInput, setOldPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [changePasswordError, setChangePasswordError] = useState<string | null>(null);

  // Helper to safely save backup to LocalStorage without heavy base64 image strings
  const loadAssets = async () => {
    setSyncStatus('pending');
    let serverData: Asset[] = [];

    // 1. Fetch from server
    try {
      serverData = await fetchAssetsSupabase();
      setAssets(serverData || []);
      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to load assets from Supabase', err);
      setSyncStatus('offline');
    }
  };

  // Synchronize Google Auth on mount (Forced Disconnect of Google Sheets as requested)
  useEffect(() => {
    // Clear legacy local backups
    try {
      localStorage.removeItem('madiun_assets_backup');
    } catch (e) {
      // Ignore
    }

    const doForceDisconnect = async () => {
      try {
        await logout();
      } catch (e) {
        console.error('Forced logout error:', e);
      }
      setGoogleUser(null);
      setGoogleToken(null);
      setSheetsConnected(false);
      setSheetsError(null);
      loadAssets(null);
    };
    doForceDisconnect();
  }, []);

  const handleSignInGoogle = async () => {
    // Disabled as requested
    showToast('Koneksi Google Sheets telah dinonaktifkan.');
  };

  const handleLogoutGoogle = async () => {
    try {
      await logout();
      setGoogleUser(null);
      setGoogleToken(null);
      setSheetsConnected(false);
      setSheetsError(null);
      showToast('Sambungan Google Sheets dinonaktifkan.');
      loadAssets(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Keep server and state matched on save operations
  const handleSaveAsset = async (savedAsset: Asset) => {
    setSyncStatus('pending');

    let updatedList: Asset[] = [];
    const isNew = !assets.some(a => a.id === savedAsset.id);

    if (isNew) {
      updatedList = [...assets, savedAsset];
    } else {
      updatedList = assets.map(a => a.id === savedAsset.id ? savedAsset : a);
    }
    
    setAssets(updatedList);

    try {
      await saveAssetSupabase(savedAsset);
      setSyncStatus('synced');
      showToast(isNew ? 'Aset berhasil didaftarkan ke server!' : 'Perubahan aset berhasil disimpan!');
    } catch (e) {
      setSyncStatus('offline');
      showToast('Gagal menyimpan ke server (Koneksi offline).');
    }

    if (editingAsset) {
      setEditingAsset(null);
      setCurrentTab('database');
    }
  };

  // Delete handler
  const handleDeleteAsset = async (id: string) => {
    setSyncStatus('pending');
    const updatedList = assets.filter(a => a.id !== id);
    setAssets(updatedList);

    try {
      await deleteAssetSupabase(id);
      setSyncStatus('synced');
      showToast('Aset berhasil dihapus dari database.');
    } catch (e) {
      setSyncStatus('offline');
      showToast('Gagal menghapus aset (Koneksi offline).');
    }
  };

  // Bulk restore importer
  const handleImportBackup = (importedAssets: Asset[]): boolean => {
    setSyncStatus('pending');
    showToast('Sedang mengimpor data ke server...');

    const mergedMap = new Map<string, Asset>();
    assets.forEach(a => mergedMap.set(a.id, a));
    importedAssets.forEach(a => mergedMap.set(a.id, a));

    const unifiedList = Array.from(mergedMap.values());
    setAssets(unifiedList);

    syncAssetsSupabase(unifiedList)
      .then(() => {
        setSyncStatus('synced');
        showToast(`Berhasil mengimpor ${importedAssets.length} aset.`);
      })
      .catch(() => {
        setSyncStatus('offline');
        showToast('Gagal menyimpan ke server (Koneksi offline).');
      });

    return true;
  };

  // Replace assets state completely (for backup restores)
  const handleReplaceAssets = async (newList: Asset[]) => {
    setSyncStatus('pending');
    showToast('Menyinkronkan data...');
    try {
      await syncAssetsSupabase(newList);
      setAssets(newList);
      showToast('Data berhasil disinkronisasi ke server!');
      setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to sync to server:', err);
      setSyncStatus('offline');
      showToast('Gagal terhubung ke server.');
    }
  };

  // Forced Sync
  const handleManualSync = async () => {
    setSyncStatus('pending');
    try {
      await syncAssetsSupabase(assets);
      const updatedFromServer = await fetchAssetsSupabase();
      if (updatedFromServer && updatedFromServer.length > 0) {
        setAssets(updatedFromServer);
      }
      setSyncStatus('synced');
      showToast('Sinkronisasi data sukses!');
    } catch (e) {
      setSyncStatus('offline');
      showToast('Tidak ada koneksi internet / server offline.');
    }
  };

  const handleSwitchToAdmin = () => {
    if (userRole === 'admin') return;
    setPasswordInput('');
    setPasswordError(false);
    setShowPasswordText(false);
    setShowPasswordModal(true);
  };

  const handleSwitchToViewer = () => {
    setUserRole('viewer');
    showToast('Berpindah sebagai Tamu (Hanya Lihat)');
  };

  const handleVerifyPassword = async (e: FormEvent) => {
    e.preventDefault();
    const latestPass = await fetchAdminPassword();
    setAdminPassword(latestPass);
    
    if (passwordInput === latestPass) {
      setUserRole('admin');
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError(false);
      showToast('Sandi Benar! Akses Admin diaktifkan.');
    } else {
      setPasswordError(true);
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    const latestPass = await fetchAdminPassword();
    setAdminPassword(latestPass);
    
    if (oldPasswordInput !== latestPass) {
      setChangePasswordError('Sandi lama salah!');
      return;
    }
    if (!newPasswordInput.trim()) {
      setChangePasswordError('Sandi baru tidak boleh kosong!');
      return;
    }
    if (newPasswordInput !== confirmNewPasswordInput) {
      setChangePasswordError('Konfirmasi sandi tidak cocok!');
      return;
    }

    const updatedPass = newPasswordInput.trim();
    try {
      await updateAdminPassword(updatedPass);
      setAdminPassword(updatedPass);
      setShowChangePasswordModal(false);
      
      setOldPasswordInput('');
      setNewPasswordInput('');
      setConfirmNewPasswordInput('');
      setChangePasswordError(null);
      showToast('Sandi khusus Admin berhasil diperbarui!');
    } catch (err) {
      setChangePasswordError('Gagal memperbarui sandi di server!');
    }
  };

  const handleTriggerEdit = (asset: Asset) => {
    setEditingAsset(asset);
    setCurrentTab('input');
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex overflow-hidden">
      {/* Visual Government-Inspired Left Sidebar Navigation */}
      <SidebarNav 
        currentTab={currentTab} 
        onChangeTab={(tab) => {
          // Reset edit state if user moves away from input tab manually
          if (tab !== 'input' && editingAsset) {
            setEditingAsset(null);
          }
          setCurrentTab(tab);
        }}
        syncStatus={syncStatus}
        totalCount={assets.length}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
        isCollapsed={sidebarCollapsed}
        setIsCollapsed={setSidebarCollapsed}
        userRole={userRole}
        onSwitchToAdmin={handleSwitchToAdmin}
        onSwitchToViewer={handleSwitchToViewer}
      />

      {/* Main Right Content Panel */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Visual Government-Inspired Top Header */}
        <header className="bg-emerald-800 border-b-4 border-emerald-900 text-white py-3 px-4 sticky top-0 z-45 shadow-md">
          <div className="w-full max-w-5xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Menu Toggle Button */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-1.5 hover:bg-emerald-700/80 rounded-lg text-emerald-100 hover:text-white transition-all cursor-pointer flex items-center justify-center mr-0.5"
                title={sidebarOpen ? "Sembunyikan Menu" : "Tampilkan Menu"}
              >
                <Menu className="w-4.5 h-4.5" />
              </button>

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-emerald-800 font-black text-md shadow-sm">T</div>
                <div>
                  <h1 className="text-xs font-black tracking-wide text-white leading-none uppercase">TIM PENGHIMPUN BENDA SB</h1>
                  <p className="text-[9px] text-emerald-250 uppercase tracking-widest font-extrabold mt-1 leading-none">DAERAH MADIUN</p>
                </div>
              </div>
            </div>

            {/* Sync Pill Indicator */}
            <div className="flex items-center gap-1.5">
              {syncStatus === 'synced' && (
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                  <Wifi className="w-3 h-3" /> Online
                </span>
              )}
              {syncStatus === 'pending' && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1 animate-pulse">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Sinkron
                </span>
              )}
              {syncStatus === 'offline' && (
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                  <WifiOff className="w-3 h-3" /> Offline
                </span>
              )}

              {/* Google Sheets Sync Pill (Removed as requested) */}
            </div>
          </div>
        </header>

        {/* Main Responsive Body Container */}
        <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-4 mb-6 overflow-x-hidden">
        
        {/* Interactive Role Switcher Panel */}
        {currentTab === 'dashboard' && (
          <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-3 flex flex-col gap-2.5 shadow-xs mb-4.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">🔑</span>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Otorisasi Peran:</span>
              </div>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 font-sans">
                <button 
                  onClick={handleSwitchToAdmin}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all duration-150 focus:outline-none cursor-pointer ${
                    userRole === 'admin' 
                      ? 'bg-emerald-800 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  🔒 Admin
                </button>
                <button 
                  onClick={handleSwitchToViewer}
                  className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all duration-150 focus:outline-none cursor-pointer ${
                    userRole === 'viewer' 
                      ? 'bg-slate-700 text-white shadow-xs' 
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  👥 Tamu
                </button>
              </div>
            </div>

            {userRole === 'admin' && (
              <div className="flex justify-end items-center border-t border-slate-100 pt-2 text-[10px]">
                <button
                  onClick={() => {
                    setOldPasswordInput('');
                    setNewPasswordInput('');
                    setConfirmNewPasswordInput('');
                    setChangePasswordError(null);
                    setShowChangePasswordModal(true);
                  }}
                  className="font-black uppercase tracking-wider text-emerald-800 hover:text-emerald-950 flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <Settings className="w-3 h-3" /> Ubah Sandi
                </button>
              </div>
            )}
          </div>
        )}

        <AnimatePresence mode="wait">
          {currentTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.15 }}
            >
              <Dashboard 
                assets={assets} 
                onNavigateToTab={(tab) => setCurrentTab(tab)} 
                syncStatus={syncStatus}
                onSyncManual={handleManualSync}
                googleUser={googleUser}
                googleToken={googleToken}
                onSignInGoogle={handleSignInGoogle}
                onLogoutGoogle={handleLogoutGoogle}
                spreadsheetId={spreadsheetId}
                onUpdateSpreadsheetId={handleUpdateSpreadsheetId}
                sheetsConnected={sheetsConnected}
                sheetsError={sheetsError}
              />
            </motion.div>
          )}

          {currentTab === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <FormInput 
                onSaveAsset={handleSaveAsset} 
                editingAsset={editingAsset}
                userRole={userRole}
                onCancelEdit={() => {
                  setEditingAsset(null);
                  setCurrentTab('database');
                }}
              />
            </motion.div>
          )}

          {currentTab === 'database' && (
            <motion.div
              key="database"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.15 }}
            >
              <DatabaseList 
                assets={assets} 
                onEditAsset={handleTriggerEdit} 
                onDeleteAsset={handleDeleteAsset}
                userRole={userRole}
              />
            </motion.div>
          )}

          {currentTab === 'baliknama' && (
            <motion.div
              key="baliknama"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <BalikNamaPanel 
                assets={assets} 
                onSaveAsset={handleSaveAsset}
                userRole={userRole}
                onNavigateToTab={(tab) => setCurrentTab(tab)}
                googleUser={googleUser}
              />
            </motion.div>
          )}

          {currentTab === 'pinjamberkas' && (
            <motion.div
              key="pinjamberkas"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
            >
              <PinjamBerkasPanel 
                assets={assets}
                onSaveAsset={handleSaveAsset}
                userRole={userRole}
                googleUser={googleUser}
              />
            </motion.div>
          )}

          {currentTab === 'export' && (
            <motion.div
              key="export"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.15 }}
            >
              <ExportPanel 
                assets={assets} 
                onImportBackup={handleImportBackup}
                userRole={userRole}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Persistent Floating Bottom Action Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            key="toast-message"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.95 }}
            className="fixed bottom-6 left-4 right-4 z-55 flex justify-center"
          >
            <div className="bg-slate-900 border border-slate-800 text-white font-semibold text-xs py-3 px-4 rounded-xl shadow-lg flex items-center gap-2 max-w-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ENTER PASSWORD MODAL */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div key="password-modal-wrapper" className="fixed inset-0 z-100 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPasswordModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Body Wrapper */}
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-sm bg-white rounded-2xl border-2 border-emerald-800 shadow-2xl p-6 overflow-hidden"
              >
                {/* Header branding lock */}
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3 mb-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-800 border border-emerald-150">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                      Otorisasi Sandi Admin
                    </h3>
                    <p className="text-[10px] text-slate-500 font-medium">
                      Masukkan sandi khusus untuk mengubah data
                    </p>
                  </div>
                </div>

                <form onSubmit={handleVerifyPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                      Sandi Khusus:
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswordText ? "text" : "password"}
                        value={passwordInput}
                        onChange={(e) => {
                          setPasswordInput(e.target.value);
                          setPasswordError(false);
                        }}
                        placeholder="Ketik sandi..."
                        className={`w-full bg-slate-50 border-2 rounded-xl py-2.5 pl-3.5 pr-10 text-xs font-medium focus:outline-none transition-colors ${
                          passwordError
                            ? "border-rose-500 focus:border-rose-600 focus:bg-rose-50/20"
                            : "border-slate-200/80 focus:border-emerald-700 focus:bg-white"
                        }`}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswordText(!showPasswordText)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      >
                        {showPasswordText ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {passwordError && (
                      <p className="text-[10px] text-rose-600 font-black flex items-center gap-1 mt-1">
                        ⚠️ Sandi salah! Hubungi Pengurus Yayasan.
                      </p>
                    )}
                  </div>

                  <div className="flex gap-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowPasswordModal(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700/90 rounded-xl text-xs font-black transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black transition-colors hover:shadow-xs cursor-pointer active:scale-97 duration-100"
                    >
                      Konfirmasi
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CHANGE PASSWORD MODAL */}
      <AnimatePresence>
        {showChangePasswordModal && (
          <motion.div key="change-password-modal-wrapper" className="fixed inset-0 z-100 overflow-y-auto">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowChangePasswordModal(false)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Body Wrapper */}
            <div className="flex min-h-full items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 15 }}
                className="relative w-full max-w-sm bg-white rounded-2xl border-2 border-emerald-800 shadow-2xl p-6 overflow-hidden"
              >
                {/* Header branding key */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-800 border border-emerald-150">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Ubah Sandi Admin
                      </h3>
                      <p className="text-[10px] text-slate-500 font-medium">
                        Atur sandi masuk khusus untuk Admin
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowChangePasswordModal(false)}
                    className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
                  {changePasswordError && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-2.5 text-rose-700 text-[10px] font-bold">
                      ⚠️ {changePasswordError}
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                      Sandi Lama:
                    </label>
                    <input
                      type="password"
                      value={oldPasswordInput}
                      onChange={(e) => setOldPasswordInput(e.target.value)}
                      placeholder="Sandi lama Anda..."
                      className="w-full bg-slate-50 border-2 border-slate-200/80 focus:border-emerald-700 focus:bg-white rounded-xl py-2 px-3 text-xs font-medium focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                      Sandi Baru:
                    </label>
                    <input
                      type="password"
                      value={newPasswordInput}
                      onChange={(e) => setNewPasswordInput(e.target.value)}
                      placeholder="Sandi baru..."
                      className="w-full bg-slate-50 border-2 border-slate-200/80 focus:border-emerald-700 focus:bg-white rounded-xl py-2 px-3 text-xs font-medium focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">
                      Konfirmasi Sandi Baru:
                    </label>
                    <input
                      type="password"
                      value={confirmNewPasswordInput}
                      onChange={(e) => setConfirmNewPasswordInput(e.target.value)}
                      placeholder="Ulangi sandi baru..."
                      className="w-full bg-slate-50 border-2 border-slate-200/80 focus:border-emerald-700 focus:bg-white rounded-xl py-2 px-3 text-xs font-medium focus:outline-none transition-colors"
                      required
                    />
                  </div>

                  <div className="flex gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowChangePasswordModal(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700/95 rounded-xl text-xs font-black transition-colors cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl text-xs font-black transition-colors hover:shadow-xs cursor-pointer active:scale-97 duration-100"
                    >
                      Simpan Sandi
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      </div>
    </div>
  );
}
