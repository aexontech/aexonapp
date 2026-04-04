import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Plus,
  FileText,
  Activity,
  TrendingUp,
  Camera,
  Lock,
  AlertTriangle,
  Stethoscope,
  Sparkles,
  Zap,
  Crown,
} from 'lucide-react';
import { Session, UserProfile } from '../types';

interface DashboardProps {
  sessions: Session[];
  onNewSession: () => void;
  onViewSession: (session: Session) => void;
  onViewGallery: (session: Session) => void;
  onDeleteSession: (sessionId: string) => void;
  onSubscribe: () => void;
  onNavigateHistory: () => void;
  userProfile: UserProfile;
  hasActiveAccess?: boolean;
  selectedPlan?: 'subscription' | 'enterprise' | 'trial' | null;
  trialDaysLeft?: number | null;
  subscriptionData?: any;
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

export default function Dashboard({
  sessions,
  onNewSession,
  onViewSession,
  onViewGallery,
  onDeleteSession,
  onSubscribe,
  onNavigateHistory,
  userProfile,
  hasActiveAccess = true,
  selectedPlan = null,
  trialDaysLeft = null,
  subscriptionData,
}: DashboardProps) {
  const [ctaHover, setCtaHover] = useState(false);

  const recentSessions = sessions.slice(0, 5);

  const totalMedia = sessions.reduce((acc, s) => acc + s.captures.length, 0);
  const thisMonthCount = sessions.filter(
    s => s.date.getMonth() === new Date().getMonth() && s.date.getFullYear() === new Date().getFullYear()
  ).length;

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Poli': return '#3B82F6';
      case 'Kamar Operasi': return '#F97316';
      case 'IGD': return '#EF4444';
      default: return '#CBD5E1';
    }
  };

  const now = new Date();
  const dateStr = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const isEnterprise = selectedPlan === 'enterprise';
  const isEnterpriseExpired = isEnterprise && (subscriptionData?.institution_expired === true || subscriptionData?.active === false);
  const showSubscriptionBanner = !isEnterprise && !hasActiveAccess && selectedPlan === null && (trialDaysLeft === null || trialDaysLeft === 0);
  const showTrialWarning = !isEnterprise && selectedPlan === null && trialDaysLeft !== null && trialDaysLeft > 0 && trialDaysLeft <= 3;

  const stats = [
    { label: 'Total sesi', value: sessions.length, icon: Activity, bg: '#0C1E35', iconBg: 'rgba(96,165,250,0.12)', iconColor: '#60A5FA' },
    { label: 'Sesi bulan ini', value: thisMonthCount, icon: TrendingUp, bg: '#1e293b', iconBg: 'rgba(52,211,153,0.10)', iconColor: '#34D399' },
    { label: 'Total media', value: totalMedia, icon: Camera, bg: '#1e293b', iconBg: 'rgba(167,139,250,0.10)', iconColor: '#A78BFA' },
  ];

  const ctaKeyframes = `
    @keyframes ctaGlow {
      0%, 100% { box-shadow: 0 4px 30px rgba(12,30,53,0.15), 0 0 0 0 rgba(245,158,11,0); }
      50% { box-shadow: 0 8px 40px rgba(12,30,53,0.2), 0 0 30px rgba(245,158,11,0.15); }
    }
    @keyframes floatY {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-6px); }
    }
  `;

  return (
    <div style={{ flex: 1, overflowY: 'auto', height: '100%', backgroundColor: '#F8FAFC', padding: 32, position: 'relative' }} className="custom-scrollbar">
      <style>{ctaKeyframes}</style>

      {/* Background orbs */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="orb-tr" />
        <div className="orb-bl" />
      </div>

      {/* Enterprise expired banner (info only, no CTA) */}
      {isEnterpriseExpired && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginBottom: 28, borderRadius: 20, overflow: 'hidden',
            background: 'linear-gradient(135deg, #78350F 0%, #451a03 100%)',
            position: 'relative', zIndex: 10,
            border: '1px solid rgba(251,191,36,0.15)',
          }}
        >
          <div style={{ position: 'absolute', top: -40, right: -40, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(251,191,36,0.1) 0%, transparent 70%)' }} />
          <div style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', gap: 20, position: 'relative' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 14, flexShrink: 0,
              backgroundColor: 'rgba(251,191,36,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: '1px solid rgba(251,191,36,0.2)',
            }}>
              <AlertTriangle style={{ width: 22, height: 22, color: '#FBBF24' }} />
            </div>
            <div>
              <h3 style={{ fontSize: 18, color: '#ffffff', marginBottom: 6, lineHeight: 1.3, fontWeight: 800 }}>
                Langganan Enterprise Tidak Aktif
              </h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, margin: 0 }}>
                {subscriptionData?.is_admin
                  ? 'Langganan institusi telah berakhir. Hubungi tim Aexon untuk memperpanjang langganan.'
                  : 'Langganan institusi telah berakhir. Hubungi Admin RS Anda untuk memperpanjang.'}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Subscription expired banner */}
      {showSubscriptionBanner && (
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginBottom: 28, borderRadius: 20, overflow: 'hidden',
            background: 'linear-gradient(135deg, #0C1E35 0%, #1a3a5c 40%, #0C1E35 100%)',
            animation: 'ctaGlow 4s ease-in-out infinite',
            position: 'relative', zIndex: 10,
          }}
        >
          <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)' }} />

          <div style={{ padding: '28px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, position: 'relative' }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 12,
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                  animation: 'floatY 3s ease-in-out infinite',
                }}>
                  <Crown style={{ width: 18, height: 18, color: '#fff' }} />
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: '#F59E0B', textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Upgrade Akun Anda
                </span>
              </div>
              <h3 style={{ fontSize: 22, color: '#ffffff', marginBottom: 8, lineHeight: 1.3, letterSpacing: '-0.01em' }}>
                Buka akses penuh ke semua fitur Aexon
              </h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6, maxWidth: 440, margin: 0 }}>
                Dokumentasi endoskopi profesional, laporan PDF, galeri media, dan backup data — semua dalam satu langganan.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 14 }}>
                {['PDF Report', 'Galeri Media', 'Backup & Restore', 'ICD Autocomplete'].map(feat => (
                  <span key={feat} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 8,
                    backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)',
                    fontSize: 11, fontWeight: 600,
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <Zap style={{ width: 10, height: 10, color: '#F59E0B' }} />
                    {feat}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <button
                onClick={onSubscribe}
                onMouseEnter={() => setCtaHover(true)}
                onMouseLeave={() => setCtaHover(false)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '16px 32px',
                  background: ctaHover
                    ? 'linear-gradient(135deg, #F59E0B, #D97706)'
                    : 'linear-gradient(135deg, #F59E0B, #EAB308)',
                  color: '#0C1E35', borderRadius: 16, fontSize: 15, fontWeight: 800,
                  border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: ctaHover
                    ? '0 8px 32px rgba(245,158,11,0.5), 0 0 20px rgba(245,158,11,0.3)'
                    : '0 4px 20px rgba(245,158,11,0.35)',
                  transform: ctaHover ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
                  transition: 'all 250ms cubic-bezier(0.22, 1, 0.36, 1)', whiteSpace: 'nowrap',
                }}
              >
                <Sparkles style={{ width: 18, height: 18 }} />
                Upgrade Plan
              </button>
              <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: 500 }}>
                Lihat paket langganan
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Trial warning (<=3 days) */}
      {showTrialWarning && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 28, borderRadius: 14, background: '#FFFBEB', border: '1px solid #FDE68A', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle style={{ width: 18, height: 18, color: '#D97706', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#92400E', margin: 0 }}>Trial berakhir dalam {trialDaysLeft} hari</p>
              <p style={{ fontSize: 12, color: '#B45309', margin: 0, marginTop: 2 }}>Perpanjang untuk tetap mengakses semua fitur</p>
            </div>
          </div>
          <button onClick={onSubscribe} style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#D97706', color: '#ffffff', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            <Zap style={{ width: 12, height: 12 }} /> Upgrade Plan
          </button>
        </motion.div>
      )}

      {/* Trial active */}
      {!showSubscriptionBanner && !showTrialWarning && selectedPlan === null && trialDaysLeft !== null && trialDaysLeft > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 28, borderRadius: 14, background: '#EFF6FF', border: '1px solid #BFDBFE', padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Sparkles style={{ width: 18, height: 18, color: '#2563EB', flexShrink: 0 }} />
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#0C1E35', margin: 0 }}>Trial Mode — {trialDaysLeft} hari tersisa</p>
              <p style={{ fontSize: 12, color: '#64748B', margin: 0, marginTop: 2 }}>Nikmati akses penuh selama masa trial</p>
            </div>
          </div>
          <button onClick={onSubscribe} style={{ flexShrink: 0, padding: '8px 16px', backgroundColor: '#2563EB', color: 'white', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Lihat Paket
          </button>
        </motion.div>
      )}

      {/* Pending activation */}
      {selectedPlan === 'subscription' && trialDaysLeft !== null && trialDaysLeft > 0 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: 28, borderRadius: 14, background: '#FFFBEB', border: '1px solid #FDE68A', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <Crown style={{ width: 18, height: 18, color: '#F59E0B', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: 13, fontWeight: 700, color: '#0C1E35', margin: 0 }}>Pembayaran Berhasil!</p>
            <p style={{ fontSize: 12, color: '#64748B', margin: 0, marginTop: 2 }}>Subscription aktif setelah trial ({trialDaysLeft} hari lagi).</p>
          </div>
        </motion.div>
      )}

      {/* Welcome */}
      <div style={{ marginBottom: 28, position: 'relative', zIndex: 10 }}>
        <p style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, marginBottom: 8 }}>{dateStr}</p>
        <h2 style={{ fontSize: 36, color: '#94A3B8', lineHeight: 1.05, marginBottom: 4, fontWeight: 400, letterSpacing: '-0.03em' }}>
          Selamat datang,
        </h2>
        <h2 style={{ fontSize: 36, color: '#0C1E35', lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.03em' }}>
          {userProfile.name}
        </h2>
        {userProfile.specialization && (
          <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 8, fontWeight: 500 }}>{userProfile.specialization}</p>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28, position: 'relative', zIndex: 10 }}>
        {stats.map((stat, i) => {
          const cardContent = (
            <div style={{ backgroundColor: stat.bg, borderRadius: i === 0 ? 18 : 14, padding: 20, position: 'relative', overflow: 'hidden', height: '100%' }}>
              <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `linear-gradient(135deg, ${stat.iconColor}22, transparent)` }} />
              <div style={{ position: 'absolute', top: 12, right: 14, width: 28, height: 28, borderRadius: 8, background: stat.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <stat.icon style={{ width: 14, height: 14, color: stat.iconColor }} />
              </div>
              <div style={{ fontSize: 32, fontWeight: 800, color: '#ffffff', lineHeight: 1, marginBottom: 4, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                <AnimatedNumber value={stat.value} />
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{stat.label}</div>
            </div>
          );

          if (i === 0) {
            return (
              <div key={stat.label} className="featured-border" style={{ borderRadius: 20 }}>
                {cardContent}
              </div>
            );
          }

          return (
            <div
              key={stat.label}
              style={{ borderRadius: 14, border: '1px solid rgba(255,255,255,0.04)', transition: 'box-shadow 200ms' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
            >
              {cardContent}
            </div>
          );
        })}
      </div>

      {/* Sesi Terbaru header + Sesi Baru button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 18, color: '#0C1E35', fontWeight: 800 }}>Sesi Terbaru</h3>
        {hasActiveAccess ? (
          <button
            onClick={onNewSession}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px',
              background: '#0C1E35', color: '#fff', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'background 150ms',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#1a3a5c'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#0C1E35'; }}
          >
            <Plus style={{ width: 16, height: 16 }} /> Mulai Sesi Baru
          </button>
      ) : isEnterprise ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6, padding: '11px 18px',
          background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 10,
          fontSize: 12, fontWeight: 600, color: '#92400E', fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          <AlertTriangle style={{ width: 13, height: 13 }} /> Langganan enterprise tidak aktif
        </div>
      ) : (
        <button disabled style={{
          display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px',
          background: '#E2E8F0', color: '#94A3B8', border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 700, cursor: 'not-allowed', fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>
          <Lock style={{ width: 14, height: 14 }} /> Mulai Sesi Baru
        </button>
        )}
      </div>

      {/* Session list — recent 5 only */}
      {sessions.length === 0 ? (
        <div style={{ backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #E2E8F0', padding: 56, textAlign: 'center' }}>
          <Stethoscope style={{ width: 40, height: 40, color: '#CBD5E1', margin: '0 auto 20px', display: 'block' }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: '#64748B', marginBottom: 6 }}>Belum ada sesi tercatat</h3>
          <p style={{ fontSize: 13, color: '#94A3B8', maxWidth: 320, margin: '0 auto 24px' }}>Mulai sesi pertama Anda untuk mendokumentasikan prosedur endoskopi</p>
          {hasActiveAccess ? (
            <button onClick={onNewSession} className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <Plus style={{ width: 18, height: 18 }} /> Mulai Sesi Baru
            </button>
          ) : isEnterprise ? (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px',
              background: '#F1F5F9', color: '#64748B',
              border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 13, fontWeight: 600, fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              <AlertTriangle style={{ width: 14, height: 14, color: '#F59E0B' }} />
              Langganan enterprise tidak aktif. Hubungi Admin RS.
            </div>
          ) : (
            <button onClick={onSubscribe} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px',
              background: 'linear-gradient(135deg, #F59E0B, #EAB308)', color: '#0C1E35',
              border: 'none', borderRadius: 12, fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              <Sparkles style={{ width: 16, height: 16 }} /> Mulai Berlangganan
            </button>
          )}
        </div>
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
          <div>
            {recentSessions.map((session, idx) => (
              <div
                key={session.id}
                onClick={() => onViewSession(session)}
                style={{
                  display: 'flex', alignItems: 'center', padding: '12px 20px', gap: 12,
                  borderBottom: idx < recentSessions.length - 1 ? '1px solid #F8FAFC' : 'none',
                  cursor: 'pointer', transition: 'background 120ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFBFC'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
              >
                {/* Category bar */}
                <div style={{ width: 3, height: 34, borderRadius: 2, backgroundColor: getCategoryColor(session.patient.category), flexShrink: 0 }} />

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0C1E35' }}>{session.patient.name}</div>
                  <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                    {session.patient.procedures_icd9?.[0] || session.patient.procedures?.[0] || 'Prosedur'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                    {session.patient.diagnosis_icd10 && (
                      <span style={{ padding: '1px 6px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: 9, fontWeight: 700, borderRadius: 4 }}>
                        {session.patient.diagnosis_icd10.split(' - ')[0]}
                      </span>
                    )}
                    <span style={{ padding: '1px 6px', backgroundColor: '#F1F5F9', color: '#64748B', fontSize: 9, fontWeight: 700, borderRadius: 4 }}>
                      {session.patient.category}
                    </span>
                    <span style={{ fontSize: 10, color: '#B0B8C4' }}>
                      {session.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                  <button
                    onClick={(e) => { e.stopPropagation(); onViewSession(session); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                      backgroundColor: '#0C1E35', color: '#ffffff', border: 'none', borderRadius: 6,
                      fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'background 150ms',
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1a3a5c'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#0C1E35'; }}
                  >
                    Laporan
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Lihat Semua footer */}
          {sessions.length > 5 && (
            <div
              onClick={onNavigateHistory}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: 14, borderTop: '1px solid #F1F5F9', cursor: 'pointer',
                color: '#64748B', fontSize: 13, fontWeight: 600, transition: 'color 150ms, background 150ms',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#0C1E35'; (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFBFC'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#64748B'; (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              Lihat Semua Riwayat ({sessions.length} sesi)
            </div>
          )}
        </div>
      )}
    </div>
  );
}