import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, FileText, Activity, TrendingUp, Camera, ChevronRight, ArrowRight, Trash2, X, Lock, AlertTriangle, ExternalLink, Stethoscope } from 'lucide-react';
import { Session, UserProfile } from '../types';

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

function AnimatedNumber({ value, duration = 800 }: { value: number; duration?: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (value === 0) { setDisplay(0); return; }
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(eased * value));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value, duration]);

  return <>{display}</>;
}

export default function Dashboard({ sessions, onNewSession, onViewSession, onViewGallery, onDeleteSession, userProfile, hasActiveAccess = true, selectedPlan = null, trialDaysLeft = null }: DashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string, name: string } | null>(null);
  const itemsPerPage = 5;

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
  const thisMonthCount = sessions.filter(s => s.date.getMonth() === new Date().getMonth() && s.date.getFullYear() === new Date().getFullYear()).length;

  const getCategoryBorderColor = (category: string) => {
    switch (category) {
      case 'Poli': return 'border-l-4 border-l-blue-500';
      case 'Kamar Operasi': return 'border-l-4 border-l-orange-500';
      case 'IGD': return 'border-l-4 border-l-red-500';
      default: return 'border-l-4 border-l-slate-300';
    }
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const showSubscriptionBanner = !hasActiveAccess && selectedPlan === null && (trialDaysLeft === null || trialDaysLeft === 0);

  const recentSessions = sessions.slice(0, 5);

  const stats = [
    { label: 'Total Sesi', value: sessions.length, icon: Activity, gradient: 'from-blue-500 to-blue-600' },
    { label: 'Sesi Bulan Ini', value: thisMonthCount, icon: TrendingUp, gradient: 'from-[#0C1E35] to-[#1a3a5c]' },
    { label: 'Total Media', value: totalMedia, icon: Camera, gradient: 'from-purple-500 to-purple-600' },
  ];

  return (
    <div className="flex-1 relative overflow-y-auto h-full custom-scrollbar bg-slate-50 px-8 py-8">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-15%] right-[-10%] w-[45%] h-[45%] bg-[#0C1E35]/[0.04] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[35%] bg-indigo-500/[0.03] rounded-full blur-[100px]" />
      </div>

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
            className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition-all duration-200"
          >
            Berlangganan Sekarang
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </motion.div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, position: 'relative', zIndex: 10 }}>
        <div>
          <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500, marginBottom: 8 }}>{dateStr}</p>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 44, fontWeight: 400, color: '#94A3B8', letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 4 }}>
            Selamat datang,
          </h2>
          <h2 style={{ fontFamily: 'Outfit, sans-serif', fontSize: 44, fontWeight: 800, color: '#0C1E35', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            {userProfile.name}
          </h2>
          <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 8, fontWeight: 500 }}>
            {userProfile.specialization}
          </p>
        </div>
        <div>
          {hasActiveAccess ? (
            <button
              onClick={onNewSession}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', backgroundColor: '#0C1E35', color: '#ffffff',
                border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', boxShadow: '0 4px 20px rgba(12,30,53,0.25)',
                transition: 'background-color 150ms',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1a3a5c'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0C1E35'}
            >
              <Plus style={{ width: 18, height: 18 }} />
              Mulai Sesi Baru
            </button>
          ) : (
            <button
              disabled
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 24px', backgroundColor: '#E2E8F0', color: '#94A3B8',
                border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 600,
                cursor: 'not-allowed',
              }}
            >
              <Lock style={{ width: 16, height: 16 }} />
              Mulai Sesi Baru
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40, position: 'relative', zIndex: 10 }}>
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            style={{
              background: i === 0
                ? 'linear-gradient(135deg, #0C1E35 0%, #1E3A5F 50%, #0C1E35 100%)'
                : 'transparent',
              padding: i === 0 ? 2 : 0,
              borderRadius: 24,
              boxShadow: i === 0 ? '0 20px 60px rgba(12,30,53,0.18)' : 'none',
            }}
          >
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: i === 0 ? 22 : 20,
              border: i === 0 ? 'none' : '1px solid #E2E8F0',
              boxShadow: i === 0 ? 'none' : '0 4px 24px rgba(0,0,0,0.04)',
              padding: 24,
              position: 'relative',
              overflow: 'hidden',
              transition: 'transform 150ms, box-shadow 150ms',
              cursor: 'default',
            }}>
              <div style={{
                position: 'absolute', top: 0, right: 0,
                width: 80, height: 80, borderRadius: '50%',
                background: i === 0
                  ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                  : i === 1
                  ? 'linear-gradient(135deg, #0C1E35, #1a3a5c)'
                  : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                opacity: 0.06,
                marginRight: -40, marginTop: -40,
              }} />
              <div style={{
                width: 40, height: 40, borderRadius: 14,
                background: i === 0
                  ? 'linear-gradient(135deg, #3B82F6, #2563EB)'
                  : i === 1
                  ? 'linear-gradient(135deg, #0C1E35, #1a3a5c)'
                  : 'linear-gradient(135deg, #8B5CF6, #7C3AED)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}>
                <stat.icon style={{ width: 20, height: 20, color: '#ffffff' }} />
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: '#0C1E35', lineHeight: 1, marginBottom: 4 }}>
                <AnimatedNumber value={stat.value} />
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="relative z-10"
      >
        {sessions.length === 0 && !searchTerm ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-16 text-center">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <Stethoscope className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-xl font-bold text-slate-700 mb-2 tracking-tight">Belum ada sesi tercatat</h3>
            <p className="text-sm text-slate-400 font-medium max-w-sm mx-auto mb-6">
              Mulai sesi pertama Anda untuk mendokumentasikan prosedur endoskopi
            </p>
            {hasActiveAccess ? (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onNewSession}
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white rounded-xl font-semibold text-sm transition-colors shadow-lg shadow-[#0C1E35]/20"
              >
                <Plus className="w-5 h-5" />
                Mulai Sesi Baru
              </motion.button>
            ) : (
              <button
                disabled
                className="inline-flex items-center gap-2 px-6 py-3 bg-slate-200 text-slate-400 rounded-xl font-semibold text-sm cursor-not-allowed"
                title="Diperlukan langganan aktif"
              >
                <Lock className="w-4 h-4" />
                Mulai Sesi Baru
              </button>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_4px_24px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-b border-slate-100">
              <h3 className="font-aexon text-xl text-slate-900 tracking-tight">Riwayat Sesi</h3>
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all"
                  placeholder="Cari prosedur, ICD, RM..."
                />
                {searchTerm && (
                  <button
                    onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {filteredSessions.length === 0 ? (
              <div className="py-16 text-center">
                <FileText className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-400">Data Tidak Ditemukan</p>
              </div>
            ) : (
              <>
                <div className="divide-y divide-slate-50">
                  {currentSessions.map((session, i) => (
                    <motion.div
                      key={session.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className={`group flex items-center justify-between px-6 py-4 hover:bg-slate-50 ${getCategoryBorderColor(session.patient.category)} transition-all duration-200 cursor-pointer`}
                      style={{ transform: 'translateY(0)' }}
                      whileHover={{ y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
                      onClick={() => onViewSession(session)}
                    >
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div>
                          <div className="text-base font-semibold text-slate-900 group-hover:text-[#0C1E35] transition-colors">
                            {session.patient.name}
                          </div>
                          <div className="text-sm text-slate-500 mt-0.5">
                            {session.patient.procedures_icd9?.[0] || session.patient.procedures?.[0] || 'Prosedur'}
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            {session.patient.diagnosis_icd10 && (
                              <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded-md">
                                {session.patient.diagnosis_icd10.split(' - ')[0]}
                              </span>
                            )}
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md">
                              {session.patient.category}
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                              <Camera className="w-3 h-3" />
                              {session.captures.length}
                            </div>
                            <span className="text-xs text-slate-400">
                              {session.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); onViewGallery(session); }}
                          className="p-2.5 bg-slate-50 hover:bg-slate-900 text-slate-400 hover:text-white rounded-xl transition-all duration-200 border border-slate-100 hover:border-slate-900"
                          title="Galeri Media"
                        >
                          <Camera className="w-4 h-4" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={(e) => { e.stopPropagation(); onViewSession(session); }}
                          className="flex items-center gap-2 px-4 py-2.5 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white rounded-xl transition-all duration-200 text-xs font-bold"
                        >
                          Laporan
                          <ArrowRight className="w-3.5 h-3.5" />
                        </motion.button>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(session.id, session.patient.name); }}
                          className="p-2.5 bg-slate-50 hover:bg-red-600 text-slate-400 hover:text-white rounded-xl transition-all duration-200 border border-slate-100 hover:border-red-600"
                          title="Hapus Sesi"
                        >
                          <Trash2 className="w-4 h-4" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 p-4 border-t border-slate-100">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`w-9 h-9 rounded-lg text-xs font-bold transition-all ${
                          currentPage === p
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {sessionToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSessionToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl p-8 max-w-sm w-full shadow-2xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-5">
                <Trash2 className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 text-center mb-2">Hapus Sesi?</h3>
              <p className="text-sm text-slate-500 text-center mb-6">
                Sesi untuk <span className="font-semibold text-slate-700">{sessionToDelete.name}</span> akan dihapus permanen.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setSessionToDelete(null)}
                  className="flex-1 py-3 rounded-xl font-bold text-sm border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
