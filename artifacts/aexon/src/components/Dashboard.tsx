import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Calendar, FileText, User, Clock, Settings, LogOut, Sparkles, Activity, ShieldCheck, TrendingUp, BarChart3, Clock3, ArrowRight, Zap, Camera, Database, ChevronRight, RefreshCw, Trash2, X, Lock, AlertTriangle, HardDrive, ExternalLink } from 'lucide-react';
import { Session, UserProfile } from '../types';
import { Pattern } from './Logo';
import { getLocalStorageUsage } from '../lib/storage';

interface DashboardProps {
  sessions: Session[];
  onNewSession: () => void;
  onViewSession: (session: Session) => void;
  onViewGallery: (session: Session) => void;
  onDeleteSession: (sessionId: string) => void;
  userProfile: UserProfile;
  hasActiveAccess?: boolean;
  selectedPlan?: 'subscription' | 'enterprise' | null;
  trialDaysLeft?: number | null;
}

export default function Dashboard({ sessions, onNewSession, onViewSession, onViewGallery, onDeleteSession, userProfile, hasActiveAccess = true, selectedPlan = null, trialDaysLeft = null }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string, name: string } | null>(null);
  const itemsPerPage = 8;

  const storageInfo = useMemo(() => getLocalStorageUsage(), [sessions.length]);

  const handleDeleteClick = (sessionId: string, patientName: string) => {
    setSessionToDelete({ id: sessionId, name: patientName });
  };

  const confirmDelete = () => {
    if (sessionToDelete) {
      onDeleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    }
  };

  const filteredSessions = sessions.filter(s => 
    s.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.patient.rmNumber.includes(searchTerm) ||
    s.patient.procedures.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())) ||
    s.patient.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSessions = filteredSessions.slice(indexOfFirstItem, indexOfLastItem);

  const totalMedia = sessions.reduce((acc, s) => acc + s.captures.length, 0);

  const getCategoryBorderColor = (category: string) => {
    switch (category) {
      case 'Poli': return 'border-l-4 border-l-blue-500';
      case 'Kamar Operasi': return 'border-l-4 border-l-orange-500';
      case 'IGD': return 'border-l-4 border-l-red-500';
      default: return 'border-l-4 border-l-slate-300';
    }
  };

  const stats = [
    { label: 'Total Sesi', value: sessions.length, icon: FileText, color: 'text-white', bg: 'bg-blue-600', gradient: 'from-blue-600 to-indigo-600', trend: '+12%', description: 'Sesi tersimpan' },
    { label: 'Bulan Ini', value: sessions.filter(s => s.date.getMonth() === new Date().getMonth()).length, icon: TrendingUp, color: 'text-white', bg: 'bg-emerald-500', gradient: 'from-emerald-500 to-teal-500', trend: '+5%', description: 'Pertumbuhan' },
    { label: 'Total Media', value: totalMedia, icon: Camera, color: 'text-white', bg: 'bg-rose-500', gradient: 'from-rose-500 to-orange-500', trend: '+18%', description: 'Foto & Video' },
    { label: 'Storage', value: storageInfo.usedFormatted, icon: Database, color: 'text-white', bg: 'bg-violet-600', gradient: 'from-violet-600 to-purple-600', trend: storageInfo.usedMB > 4 ? 'Warning' : 'OK', description: 'Terpakai' },
  ];

  const showSubscriptionBanner = !hasActiveAccess && selectedPlan === null && (trialDaysLeft === null || trialDaysLeft === 0);

  return (
    <div className="flex-1 font-sans text-slate-900 relative overflow-y-auto h-full custom-scrollbar bg-slate-50 px-8 lg:px-12 py-10">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-purple-400/10 rounded-full blur-[100px] pointer-events-none" />

      {showSubscriptionBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 bg-amber-50 border border-amber-200 rounded-2xl p-5 flex items-center justify-between relative z-10"
        >
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm font-semibold text-amber-800">
              Langganan Anda belum aktif. Untuk memulai sesi baru, silakan berlangganan di aexon.id
            </p>
          </div>
          <a
            href="https://aexon.id/harga"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all duration-200"
          >
            Berlangganan Sekarang
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      )}
      
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-8 mb-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-white/80 backdrop-blur-md border border-slate-200 text-slate-500 text-[10px] font-black rounded-lg">V2.5.0</span>
          </div>
          <h2 className="text-6xl font-black text-slate-900 tracking-tighter leading-[0.9]">
            Hello, <br />
            <span className="text-blue-900">
              Dr. {userProfile.name}
            </span>
          </h2>
          <p className="text-slate-500 text-sm font-bold max-w-md">
            Sistem cerdas Anda siap digunakan. Kelola data klinis dengan presisi dan efisiensi maksimal.
          </p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12 relative z-10">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-white p-6 rounded-2xl border border-white shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-200 overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${stat.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-200 rounded-full -mr-16 -mt-16`} />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                  <stat.icon className={`w-6 h-6 ${stat.color === 'text-white' ? 'text-white' : stat.color}`} />
                </div>
                <div className={`px-2 py-1 rounded-lg border text-[10px] font-black ${
                  stat.label === 'Storage' && storageInfo.usedMB > 4 
                    ? 'bg-red-50 border-red-100 text-red-500' 
                    : 'bg-slate-50 border-slate-100 text-slate-400'
                }`}>
                  {stat.label === 'Storage' && storageInfo.usedMB > 4 && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                  {stat.trend}
                </div>
              </div>
              <div>
                <div className="text-4xl font-black text-slate-900 tracking-tighter mb-1">{stat.value}</div>
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{stat.label}</div>
                <div className="text-[9px] font-bold text-slate-300 mt-2 italic">{stat.description}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-12 relative z-10">
        <div className="lg:col-span-8 space-y-8">
          <div className="bg-white/90 backdrop-blur-3xl p-10 rounded-[3.5rem] border border-white shadow-2xl shadow-slate-200/60 relative overflow-hidden group/history">
            <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-[100px] -mr-48 -mt-48 pointer-events-none" />
            
            <motion.button 
              whileHover={hasActiveAccess ? { scale: 1.02, y: -4 } : {}}
              whileTap={hasActiveAccess ? { scale: 0.98 } : {}}
              onClick={onNewSession}
              disabled={!hasActiveAccess}
              className={`w-full py-6 text-sm font-black rounded-2xl flex items-center justify-center gap-4 group relative overflow-hidden mb-8 transition-all duration-200 ${
                hasActiveAccess 
                  ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/20' 
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              title={!hasActiveAccess ? 'Diperlukan langganan aktif' : ''}
            >
              {hasActiveAccess && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
              )}
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center relative z-10 transition-colors ${
                hasActiveAccess ? 'bg-white/10 group-hover:bg-white/20' : 'bg-slate-300/30'
              }`}>
                {hasActiveAccess ? <Plus className="w-6 h-6" /> : <Lock className="w-5 h-5" />}
              </div>
              <span className="relative z-10 tracking-[0.1em]">MULAI SESI OPERASI BARU</span>
            </motion.button>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-8 mb-10 relative z-10">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-600/30 transition-transform duration-200">
                  <Clock3 className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight">Riwayat Sesi</h3>
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mt-1">Daftar tindakan terbaru</p>
                </div>
              </div>
              <div className="relative w-full sm:w-80 group/search">
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within/search:text-blue-500 transition-colors" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-14 pr-12 py-4 bg-slate-50 border border-slate-100 rounded-3xl text-sm font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all shadow-inner"
                  placeholder="Cari RM atau Nama..."
                />
                {searchTerm && (
                  <button
                    onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              {sessions.length === 0 && !searchTerm ? (
                <div className="py-24 text-center">
                  <div className="w-28 h-28 bg-blue-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-blue-100">
                    <div className="relative">
                      <FileText className="w-12 h-12 text-blue-300" />
                      <div className="absolute -right-1 -bottom-1 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Plus className="w-3.5 h-3.5 text-white" />
                      </div>
                    </div>
                  </div>
                  <h3 className="text-xl font-black text-slate-700 mb-3 tracking-tight">Belum ada sesi</h3>
                  <p className="text-sm text-slate-400 font-medium mb-8 max-w-sm mx-auto">
                    Mulai sesi baru untuk mendokumentasikan prosedur endoskopi
                  </p>
                  {hasActiveAccess && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={onNewSession}
                      className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all duration-200 shadow-xl shadow-blue-500/20"
                    >
                      <Plus className="w-5 h-5" />
                      Mulai Sesi Baru
                    </motion.button>
                  )}
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="py-32 text-center">
                  <motion.div 
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 4, repeat: Infinity }}
                    className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-inner"
                  >
                    <FileText className="w-10 h-10 text-slate-200" />
                  </motion.div>
                  <p className="text-sm font-black text-slate-300 uppercase tracking-[0.3em]">Data Tidak Ditemukan</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4">
                    {currentSessions.map((session, i) => (
                      <motion.div
                        key={session.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`group/item flex flex-col sm:flex-row items-center justify-between p-6 bg-slate-50/50 hover:bg-white rounded-2xl ${getCategoryBorderColor(session.patient.category)} border-y border-r border-transparent hover:border-blue-100 hover:shadow-2xl hover:shadow-blue-500/5 transition-all duration-200`}
                      >
                        <div className="flex items-center gap-6 w-full sm:w-auto mb-6 sm:mb-0">
                          <div className="w-16 h-16 rounded-3xl bg-white flex items-center justify-center text-slate-900 font-black text-xl border border-slate-100 shadow-sm group-hover/item:bg-blue-600 group-hover/item:text-white transition-all duration-200">
                            {session.patient.name.charAt(0)}
                          </div>
                          <div>
                            <div className="text-lg font-black text-slate-900 group-hover/item:text-blue-600 transition-colors tracking-tight">{session.patient.name}</div>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="px-3 py-1 bg-slate-200/50 text-[9px] font-black text-slate-500 rounded-lg uppercase tracking-widest">RM: {session.patient.rmNumber}</span>
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{session.patient.procedures[0]}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="text-right hidden sm:block mr-4">
                            <div className="text-sm font-black text-slate-900">{session.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</div>
                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{session.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => onViewGallery(session)}
                              className="p-4 bg-white hover:bg-slate-900 text-slate-400 hover:text-white rounded-2xl transition-all duration-200 border border-slate-100 hover:border-slate-900 shadow-sm"
                              title="Galeri Media"
                            >
                              <Camera className="w-5 h-5" />
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => onViewSession(session)}
                              className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl transition-all duration-200 shadow-xl shadow-blue-500/20 text-[11px] font-black uppercase tracking-widest"
                            >
                              LAPORAN
                              <ArrowRight className="w-4 h-4" />
                            </motion.button>
                            <motion.button 
                              whileHover={{ scale: 1.1 }}
                              whileTap={{ scale: 0.9 }}
                              onClick={() => handleDeleteClick(session.id, session.patient.name)}
                              className="p-4 bg-white hover:bg-red-600 text-slate-400 hover:text-white rounded-2xl transition-all duration-200 border border-slate-100 hover:border-red-600 shadow-sm"
                              title="Hapus Sesi"
                            >
                              <Trash2 className="w-5 h-5" />
                            </motion.button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-8 mt-12 pt-8 border-t border-slate-100">
                    {totalPages > 1 ? (
                      <div className="flex items-center gap-3">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                          <button
                            key={p}
                            onClick={() => setCurrentPage(p)}
                            className={`w-12 h-12 rounded-2xl text-[11px] font-black transition-all duration-200 ${
                              currentPage === p 
                                ? 'bg-slate-900 text-white shadow-2xl scale-110' 
                                : 'bg-white text-slate-400 border border-slate-100 hover:border-slate-900'
                            }`}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 space-y-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-slate-900 to-indigo-950 p-8 rounded-[3rem] text-white relative overflow-hidden shadow-2xl group"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] -mr-32 -mt-32 opacity-30 group-hover:opacity-50 transition-opacity duration-200" />
            <Pattern className="text-white opacity-[0.05] absolute inset-0 scale-150 rotate-45" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-md">
                  <ShieldCheck className="w-7 h-7 text-blue-400" />
                </div>
                <div className="px-3 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-[9px] font-black tracking-widest text-blue-400 uppercase">
                  VERIFIED
                </div>
              </div>
              <h3 className="text-2xl font-black mb-2 tracking-tight">Lisensi Profesional</h3>
              <p className="text-slate-400 text-xs mb-8 leading-relaxed font-medium">
                Akses penuh fitur premium aktif. <br />
                Berlaku hingga <span className="text-white font-bold">12 Des 2026</span>.
              </p>
              
                <div className="space-y-4 mb-10">
                  <div className="flex justify-between items-end">
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sisa Ruang Disk</span>
                    <span className="text-[10px] font-black text-blue-400">COMING SOON</span>
                  </div>
                  <div className="h-2.5 bg-white/5 rounded-full overflow-hidden p-0.5">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 1.5, ease: "easeOut" }}
                      className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 rounded-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                    />
                  </div>
                </div>

              <button className="w-full flex items-center justify-center gap-3 px-6 py-5 bg-white text-slate-900 text-[11px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-400 hover:text-white transition-all duration-200 active:scale-95 shadow-xl">
                PERPANJANG LISENSI
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </motion.div>

          <div className="bg-white p-8 rounded-[3rem] border border-white shadow-2xl shadow-slate-200/60 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
                    <Database className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em]">Penyimpanan Lokal</h3>
                </div>
                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border shadow-sm ${
                  storageInfo.usedMB > 4 
                    ? 'bg-red-100 text-red-600 border-red-200' 
                    : 'bg-blue-100 text-blue-600 border-blue-200'
                }`}>
                  {storageInfo.usedFormatted}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100">
                    <Database className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <div className="text-[11px] font-black text-slate-900">Data Integrity</div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Local verification</div>
                  </div>
                </div>
              </div>

              <div className="mt-8 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <p className="text-[10px] text-slate-500 font-bold leading-relaxed italic">
                  "Semua data tersimpan secara lokal di perangkat ini untuk memastikan privasi dan keamanan maksimal."
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {sessionToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSessionToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-8 mx-auto">
                <Trash2 className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 text-center mb-4 tracking-tight">Hapus Sesi?</h3>
              <p className="text-slate-500 text-center mb-10 text-sm font-medium leading-relaxed">
                Apakah Anda yakin ingin menghapus data sesi untuk <span className="text-slate-900 font-bold">"{sessionToDelete.name}"</span>? Semua foto dan video dalam sesi ini akan dihapus permanen.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDelete}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-200 shadow-lg shadow-red-600/20"
                >
                  YA, HAPUS PERMANEN
                </button>
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-200"
                >
                  BATALKAN
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
