import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Database, 
  FileSpreadsheet, 
  RefreshCw,
  FolderOpen,
  X,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Users,
  Settings
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface SidebarNavProps {
  currentTab: string;
  onChangeTab: (tab: string) => void;
  syncStatus: 'synced' | 'pending' | 'offline';
  totalCount: number;
  isOpen: boolean; // Mobile open state OR Desktop visible state
  setIsOpen: (isOpen: boolean) => void;
  isCollapsed: boolean; // Desktop collapsed state (icon-only rail)
  setIsCollapsed: (isCollapsed: boolean) => void;
  userRole: 'admin' | 'viewer';
  onSwitchToAdmin: () => void;
  onSwitchToViewer: () => void;
}

export default function SidebarNav({
  currentTab,
  onChangeTab,
  totalCount,
  isOpen,
  setIsOpen,
  isCollapsed,
  setIsCollapsed,
  userRole,
  onSwitchToAdmin,
  onSwitchToViewer
}: SidebarNavProps) {
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'input', label: 'Input Aset', icon: PlusCircle },
    { id: 'database', label: 'Lihat & Cari', icon: Database },
    { id: 'baliknama', label: 'Balik Nama', icon: RefreshCw },
    { id: 'pinjamberkas', label: 'Pinjam Berkas', icon: FolderOpen },
    { id: 'export', label: 'Ekspor', icon: FileSpreadsheet },
  ];

  const handleTabClick = (tabId: string) => {
    onChangeTab(tabId);
    // Auto-close on mobile when tab is clicked
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  const activeTabDetails = tabs.find(t => t.id === currentTab);

  return (
    <>
      {/* 1. MOBILE DRAWER OVERLAY (backdrop) - visible only on smaller screens when sidebar isOpen */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* SPATIAL PLACEHOLDER to prevent content hiding behind fixed sidebar */}
      <div 
        className={`flex-shrink-0 transition-all duration-300 ${
          isOpen ? (isCollapsed ? 'lg:w-[72px]' : 'lg:w-64') : 'lg:w-0'
        } ${!isOpen ? 'w-[72px]' : 'w-[72px] lg:hidden'}`} 
      />

      {/* 2. MAIN RETRACTABLE SIDEBAR CONTAINER */}
      <aside
        className={`fixed inset-y-0 left-0 z-45 bg-emerald-800 border-r-4 border-emerald-950 text-white flex flex-col justify-between transition-all duration-300 shadow-2xl lg:shadow-none ${
          isOpen 
            ? 'w-64 translate-x-0'
            : 'w-[72px] translate-x-0'
        } ${
          isOpen 
            ? (isCollapsed ? 'lg:w-[72px] lg:translate-x-0' : 'lg:w-64 lg:translate-x-0')
            : 'lg:-translate-x-full lg:w-0 lg:border-r-0'
        }`}
      >
        {/* UPPER PART */}
        <div className="flex flex-col flex-1 overflow-y-auto overflow-x-hidden pt-4 px-3 space-y-5">
          {/* Header & Close/Collapse controls */}
          <div className="flex items-center justify-between pb-3 border-b border-emerald-700/60 min-h-[50px]">
            
            {/* Logo/Identity when expanded */}
            <div className={`items-center gap-2.5 px-1 animate-fadeIn ${
              isOpen ? 'flex' : 'hidden'
            } ${isOpen && !isCollapsed ? 'lg:flex' : 'lg:hidden'}`}>
              <div className="w-8 h-8 flex-shrink-0 bg-white text-emerald-850 rounded-lg flex items-center justify-center font-black text-md shadow-md">
                T
              </div>
              <div className="leading-tight">
                <h2 className="text-[10px] font-black tracking-wide text-white uppercase">TIM BENDA SB</h2>
                <p className="text-[7px] text-emerald-300 font-black tracking-wider leading-none mt-0.5">DAERAH MADIUN</p>
              </div>
            </div>

            {/* Logo placeholder when collapsed */}
            <div className={`mx-auto w-8 h-8 bg-white text-emerald-850 rounded-lg items-center justify-center font-black text-sm shadow-md ${
              !isOpen ? 'flex' : 'hidden'
            } ${isOpen && isCollapsed ? 'lg:flex' : 'lg:hidden'}`}>
              T
            </div>

            {/* Mobile close button (X) */}
            <button
              onClick={() => setIsOpen(false)}
              className="lg:hidden p-1.5 hover:bg-emerald-700 rounded-lg text-emerald-200 hover:text-white transition-all cursor-pointer absolute right-3"
              style={{ display: isOpen ? 'block' : 'none' }}
            >
              <X className="w-4 h-4" />
            </button>

            {/* Desktop collapse chevron button */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={`hidden lg:flex p-1 hover:bg-emerald-700 border border-emerald-700/50 rounded-md text-emerald-250 hover:text-white transition-all cursor-pointer ${
                isCollapsed ? 'mx-auto' : ''
              }`}
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Role selector panel inside Sidebar (Clean styling) */}
          <div className="px-1.5 flex justify-center">
            {/* COMPACT ROLE VIEW */}
            <div className={`flex-col items-center gap-2 py-2 ${
              !isOpen ? 'flex' : 'hidden'
            } ${isOpen && isCollapsed ? 'lg:flex' : 'lg:hidden'}`}>
              <button
                onClick={userRole === 'admin' ? onSwitchToViewer : onSwitchToAdmin}
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all border shadow-xs cursor-pointer ${
                  userRole === 'admin' 
                    ? 'bg-amber-500 text-emerald-950 border-amber-600' 
                    : 'bg-emerald-900 border-emerald-950 text-emerald-200'
                }`}
                title={userRole === 'admin' ? 'Beralih ke Tamu' : 'Beralih ke Admin'}
              >
                {userRole === 'admin' ? '🔒' : '👥'}
              </button>
            </div>

            {/* EXPANDED ROLE VIEW */}
            <div className={`w-full bg-emerald-900/55 p-2 rounded-xl border border-emerald-700/40 space-y-1.5 ${
              isOpen ? 'block' : 'hidden'
            } ${isOpen && !isCollapsed ? 'lg:block' : 'lg:hidden'}`}>
              <span className="text-[9px] font-black uppercase text-emerald-300 tracking-wider block px-1.5 leading-none mb-1">
                Peran & Akses:
              </span>
              <div className="flex bg-emerald-950 p-1 rounded-lg border border-emerald-800/80 font-sans">
                <button 
                  onClick={onSwitchToAdmin}
                  className={`flex-1 py-1.5 rounded text-[9px] font-black uppercase transition-all duration-150 cursor-pointer ${
                    userRole === 'admin' 
                      ? 'bg-emerald-700 text-white shadow-xs' 
                      : 'text-emerald-300 hover:text-white'
                  }`}
                >
                  🔒 Admin
                </button>
                <button 
                  onClick={onSwitchToViewer}
                  className={`flex-1 py-1.5 rounded text-[9px] font-black uppercase transition-all duration-150 cursor-pointer ${
                    userRole === 'viewer' 
                      ? 'bg-slate-700 text-white shadow-xs' 
                      : 'text-emerald-300 hover:text-white'
                  }`}
                >
                  👥 Tamu
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Items list */}
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = currentTab === tab.id;
              
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`relative w-full flex items-center py-2.5 px-3 rounded-xl transition-all select-none duration-150 cursor-pointer text-left focus:outline-none ${
                    isActive 
                      ? 'bg-amber-400 text-emerald-950 font-black shadow-md border-r-4 border-amber-600' 
                      : 'text-emerald-100 hover:bg-emerald-700 hover:text-white'
                  } ${
                    isOpen ? 'justify-start' : 'justify-center'
                  } ${isOpen && isCollapsed ? 'lg:justify-center' : 'lg:justify-start'}`}
                >
                  <Icon className={`w-4.5 h-4.5 flex-shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`} />
                  
                  <span className={`text-xs tracking-wide whitespace-nowrap ${
                    isOpen ? 'block ml-3' : 'hidden ml-0'
                  } ${isOpen && !isCollapsed ? 'lg:block lg:ml-3' : 'lg:hidden lg:ml-0'}`}>
                    {tab.label}
                  </span>
                  
                  {/* Badge count for database records */}
                  {tab.id === 'database' && totalCount > 0 && (
                    <span className={`absolute bg-rose-600 text-white font-extrabold text-[8px] rounded-full h-4 min-w-[16px] px-1 flex items-center justify-center border border-emerald-800 ${
                      !isOpen ? 'top-1 right-2' : 'top-auto right-3'
                    } ${isOpen && isCollapsed ? 'lg:top-1 lg:right-2' : 'lg:top-auto lg:right-3'}`}>
                      {totalCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* LOWER PART / FOOTER SECTION */}
        <div className="p-3 border-t border-emerald-700/40 bg-emerald-900/30 overflow-hidden flex justify-center">
          <div className={`space-y-1.5 w-full animate-fadeIn ${
            isOpen ? 'block' : 'hidden'
          } ${isOpen && !isCollapsed ? 'lg:block' : 'lg:hidden'}`}>
            <div className="flex items-center justify-between text-[10px] text-emerald-250 leading-tight">
              <span className="font-semibold">Sistem Status</span>
              <span className="font-mono text-[9px] bg-emerald-900/60 px-1.5 py-0.5 rounded border border-emerald-750/50">v1.2</span>
            </div>
            <p className="text-[9px] text-emerald-300/80 leading-normal font-medium">
              Sistem Informasi Manajemen data aset Daerah Madiun
            </p>
          </div>
          
          <div className={`text-center text-[10px] font-mono text-emerald-300 font-bold ${
            !isOpen ? 'block' : 'hidden'
          } ${isOpen && isCollapsed ? 'lg:block' : 'lg:hidden'}`}>
            YMA
          </div>
        </div>
      </aside>
    </>
  );
}
