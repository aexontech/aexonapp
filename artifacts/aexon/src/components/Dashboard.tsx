import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, FileText, Activity, TrendingUp, Camera, ChevronRight, ArrowRight, Trash2, X, Lock, AlertTriangle, Stethoscope } from 'lucide-react';
import { Session, UserProfile } from '../types';

interface DashboardProps {
  sessions: Session[];
  onNewSession: () => void;
  onViewSession: (session: Session) => void;
  onViewGallery: (session: Session) => void;
  onDeleteSession: (sessionId: string) => void;
  onSubscribe: () => void;
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

export default function Dashboard({ sessions, onNewSession, onViewSession, onViewGallery, onDeleteSession, onSubscribe, userProfile, hasActiveAccess = true, selectedPlan = null, trialDaysLeft = null }: DashboardProps) {
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
      case 'Poli': return '#3B82F6';
      case 'Kamar Operasi': return '#F97316';
      case 'IGD': return '#EF4444';
      default: return '#CBD5E1';
    }
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const showSubscriptionBanner = !hasActiveAccess && selectedPlan === null && (trialDaysLeft === null || trialDaysLeft === 0);

  const stats = [
    { label: 'Total Sesi', value: sessions.length, icon: Activity, gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
    { label: 'Sesi Bulan Ini', value: thisMonthCount, icon: TrendingUp, gradient: 'linear-gradient(135deg, #0C1E35, #1a3a5c)' },
    { label: 'Total Media', value: totalMedia, icon: Camera, gradient: 'linear-gradient(135deg, #8B5CF6, #7C3AED)' },
  ];

  return (
    <div style={{ flex: 1, position: 'relative', overflowY: 'auto', height: '100%', backgroundColor: '#F8FAFC', padding: 32 }} className="custom-scrollbar">
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="orb-tr" />
        <div className="orb-bl" />
      </div>

      {showSubscriptionBanner && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            marginBottom: 32,
            backgroundColor: '#FFFBEB',
            border: '1px solid #FDE68A',
            borderRadius: 20,
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            position: 'relative',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <AlertTriangle style={{ width: 20, height: 20, color: '#F59E0B', flexShrink: 0 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: '#92400E' }}>
              Langganan Anda belum aktif. Untuk memulai sesi baru, silakan berlangganan di aexon.id
            </p>
          </div>
          <button
            onClick={onSubscribe}
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 20px',
              backgroundColor: '#F59E0B',
              color: '#ffffff',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontFamily: 'Outfit, sans-serif',
              transition: 'background-color 150ms',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#D97706'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F59E0B'}
          >
            Berlangganan Sekarang
          </button>
        </motion.div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, position: 'relative', zIndex: 10 }}>
        <div>
          <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500, marginBottom: 16 }}>{dateStr}</p>
          <h2 className="font-aexon" style={{ fontSize: 44, fontWeight: 400, color: '#94A3B8', letterSpacing: '-0.03em', lineHeight: 1.05, marginBottom: 4 }}>
            Selamat datang,
          </h2>
          <h2 className="font-aexon" style={{ fontSize: 44, fontWeight: 800, color: '#0C1E35', letterSpacing: '-0.03em', lineHeight: 1.05 }}>
            {userProfile.name}
          </h2>
          <p style={{ fontSize: 14, color: '#94A3B8', marginTop: 32, fontWeight: 500 }}>
            {userProfile.specialization}
          </p>
        </div>
        <div>
          {hasActiveAccess ? (
            <button
              onClick={onNewSession}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '14px 28px', backgroundColor: '#0C1E35', color: '#ffffff',
                border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
                cursor: 'pointer', boxShadow: '0 4px 20px rgba(12,30,53,0.25)',
                transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif',
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
                padding: '14px 28px', backgroundColor: '#E2E8F0', color: '#94A3B8',
                border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
                cursor: 'not-allowed', fontFamily: 'Outfit, sans-serif',
              }}
            >
              <Lock style={{ width: 16, height: 16 }} />
              Mulai Sesi Baru
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40, position: 'relative', zIndex: 10 }}>
        {stats.map((stat, i) => {
          const cardContent = (
            <div style={{
              backgroundColor: '#ffffff',
              borderRadius: i === 0 ? 22 : 20,
              padding: 24,
              position: 'relative',
              overflow: 'hidden',
              height: '100%',
            }}>
              <div style={{
                position: 'absolute', top: -20, right: -20,
                width: 80, height: 80, borderRadius: '50%',
                background: stat.gradient, opacity: 0.06,
              }} />
              <div style={{
                width: 44, height: 44, borderRadius: 14,
                background: stat.gradient,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16,
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}>
                <stat.icon style={{ width: 22, height: 22, color: '#ffffff' }} />
              </div>
              <div style={{
                fontSize: 36, fontWeight: 800, color: '#0C1E35',
                lineHeight: 1, marginBottom: 6,
                fontFamily: 'Outfit, sans-serif',
              }}>
                <AnimatedNumber value={stat.value} />
              </div>
              <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500 }}>
                {stat.label}
              </div>
            </div>
          );

          if (i === 0) {
            return (
              <div key={stat.label} className="featured-border" style={{ borderRadius: 24 }}>
                {cardContent}
              </div>
            );
          }

          return (
            <div key={stat.label} style={{
              backgroundColor: '#ffffff',
              borderRadius: 20,
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              transition: 'box-shadow 200ms, border-color 200ms',
            }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 24px rgba(0,0,0,0.04)'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
            >
              {cardContent}
            </div>
          );
        })}
      </div>

      <div style={{ position: 'relative', zIndex: 10 }}>
        {sessions.length === 0 && !searchTerm ? (
          <div style={{ backgroundColor: '#ffffff', borderRadius: 24, border: '1px solid #E2E8F0', boxShadow: '0 4px 24px rgba(0,0,0,0.04)', padding: 64, textAlign: 'center' }}>
            <div style={{ width: 80, height: 80, backgroundColor: '#F8FAFC', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <Stethoscope style={{ width: 40, height: 40, color: '#CBD5E1' }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#64748B', marginBottom: 8 }}>Belum ada sesi tercatat</h3>
            <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 500, maxWidth: 384, margin: '0 auto 24px' }}>
              Mulai sesi pertama Anda untuk mendokumentasikan prosedur endoskopi
            </p>
            {hasActiveAccess ? (
              <button
                onClick={onNewSession}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', backgroundColor: '#0C1E35', color: '#ffffff',
                  border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14,
                  cursor: 'pointer', boxShadow: '0 4px 20px rgba(12,30,53,0.25)',
                  transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1a3a5c'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0C1E35'}
              >
                <Plus style={{ width: 20, height: 20 }} />
                Mulai Sesi Baru
              </button>
            ) : (
              <button
                disabled
                title="Diperlukan langganan aktif"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '14px 28px', backgroundColor: '#E2E8F0', color: '#94A3B8',
                  border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 14,
                  cursor: 'not-allowed', fontFamily: 'Outfit, sans-serif',
                }}
              >
                <Lock style={{ width: 16, height: 16 }} />
                Mulai Sesi Baru
              </button>
            )}
          </div>
        ) : (
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: 24,
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #F1F5F9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
            }}>
              <h3 className="font-aexon" style={{ fontWeight: 800, fontSize: 18, color: '#0C1E35', letterSpacing: '-0.01em' }}>Riwayat Sesi</h3>
              <div style={{ position: 'relative', width: 288 }}>
                <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94A3B8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  placeholder="Cari prosedur, ICD, RM..."
                  style={{
                    width: '100%', padding: '10px 40px 10px 40px',
                    backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                    borderRadius: 12, fontSize: 13, color: '#0C1E35',
                    outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif',
                    transition: 'border-color 150ms',
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#0C1E35'}
                  onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
                />
                {searchTerm && (
                  <button
                    onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: 2 }}
                  >
                    <X style={{ width: 16, height: 16 }} />
                  </button>
                )}
              </div>
            </div>

            {filteredSessions.length === 0 ? (
              <div style={{ padding: '64px 0', textAlign: 'center' }}>
                <FileText style={{ width: 40, height: 40, color: '#E2E8F0', margin: '0 auto 12px' }} />
                <p style={{ fontSize: 14, fontWeight: 500, color: '#94A3B8' }}>Data Tidak Ditemukan</p>
              </div>
            ) : (
              <>
                <div>
                  {currentSessions.map((session, idx) => (
                    <div
                      key={session.id}
                      onClick={() => onViewSession(session)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '16px 24px',
                        borderLeft: `4px solid ${getCategoryBorderColor(session.patient.category)}`,
                        borderBottom: idx < currentSessions.length - 1 ? '1px solid #F8FAFC' : 'none',
                        cursor: 'pointer',
                        transition: 'background-color 150ms',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, minWidth: 0, flex: 1 }}>
                        <div>
                          <div style={{ fontSize: 15, fontWeight: 600, color: '#0C1E35' }}>
                            {session.patient.name}
                          </div>
                          <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
                            {session.patient.procedures_icd9?.[0] || session.patient.procedures?.[0] || 'Prosedur'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6, flexWrap: 'wrap' }}>
                            {session.patient.diagnosis_icd10 && (
                              <span style={{ padding: '2px 8px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: 10, fontWeight: 700, borderRadius: 6 }}>
                                {session.patient.diagnosis_icd10.split(' - ')[0]}
                              </span>
                            )}
                            <span style={{ padding: '2px 8px', backgroundColor: '#F1F5F9', color: '#64748B', fontSize: 10, fontWeight: 700, borderRadius: 6 }}>
                              {session.patient.category}
                            </span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#94A3B8' }}>
                              <Camera style={{ width: 12, height: 12 }} />
                              {session.captures.length}
                            </div>
                            <span style={{ fontSize: 12, color: '#94A3B8' }}>
                              {session.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                        <button
                          onClick={(e) => { e.stopPropagation(); onViewGallery(session); }}
                          title="Galeri Media"
                          style={{
                            padding: 10, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                            borderRadius: 10, color: '#64748B', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 150ms',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#0C1E35'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                        >
                          <Camera style={{ width: 16, height: 16 }} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); onViewSession(session); }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '8px 14px', backgroundColor: '#0C1E35', color: '#ffffff',
                            border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 700,
                            cursor: 'pointer', transition: 'background-color 150ms',
                            fontFamily: 'Outfit, sans-serif',
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1a3a5c'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0C1E35'}
                        >
                          Laporan
                          <ArrowRight style={{ width: 14, height: 14 }} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteClick(session.id, session.patient.name); }}
                          title="Hapus Sesi"
                          style={{
                            padding: 10, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                            borderRadius: 10, color: '#64748B', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'all 150ms',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; e.currentTarget.style.borderColor = '#FECACA'; }}
                          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                        >
                          <Trash2 style={{ width: 16, height: 16 }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {totalPages > 1 && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, borderTop: '1px solid #F1F5F9' }}>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        style={{
                          width: 36, height: 36, borderRadius: 10, fontSize: 12, fontWeight: 700,
                          border: 'none', cursor: 'pointer', transition: 'all 150ms',
                          backgroundColor: currentPage === p ? '#0C1E35' : '#F8FAFC',
                          color: currentPage === p ? '#ffffff' : '#94A3B8',
                          fontFamily: 'Outfit, sans-serif',
                        }}
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
      </div>

      <AnimatePresence>
        {sessionToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
            onClick={() => setSessionToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ backgroundColor: '#ffffff', borderRadius: 24, padding: 32, maxWidth: 400, width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ width: 56, height: 56, backgroundColor: '#FEF2F2', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <Trash2 style={{ width: 28, height: 28, color: '#EF4444' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0C1E35', textAlign: 'center', marginBottom: 8 }}>Hapus Sesi?</h3>
              <p style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
                Sesi untuk <span style={{ fontWeight: 700, color: '#0C1E35' }}>{sessionToDelete.name}</span> akan dihapus permanen.
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setSessionToDelete(null)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
                    border: '1px solid #E2E8F0', backgroundColor: '#ffffff', color: '#64748B',
                    cursor: 'pointer', transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
                    border: 'none', backgroundColor: '#EF4444', color: '#ffffff',
                    cursor: 'pointer', transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#DC2626'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EF4444'}
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
