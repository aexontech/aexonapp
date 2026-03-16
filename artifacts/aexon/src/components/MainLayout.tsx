import React, { useState, useEffect } from 'react';
import { FileText, Plus, Settings, LogOut, ChevronLeft, ChevronRight, LayoutDashboard, CreditCard, ChevronDown, User, Shield, Sparkles } from 'lucide-react';
import { UserProfile } from '../types';
import { Logo } from './Logo';

interface MainLayoutProps {
  children: React.ReactNode;
  activeMenu: 'dashboard' | 'admin-dashboard' | 'admin-kop-surat' | 'pricing' | 'session-form' | 'active-session' | 'report-generator' | 'settings' | 'gallery' | 'launcher' | 'add-doctor' | 'manage-subscription' | 'plan-selection' | 'checkout';
  onNavigate: (menu: any) => void;
  onLogout: () => void;
  plan: 'subscription' | 'enterprise' | null;
  trialDaysLeft: number | null;
  userProfile: UserProfile;
}

export default function MainLayout({ children, activeMenu, onNavigate, onLogout, plan, trialDaysLeft, userProfile }: MainLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hoveredLogout, setHoveredLogout] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const isAdmin = userProfile.role === 'admin';
  const isEnterprise = plan === 'enterprise';

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isCollapsed) setProfileOpen(false);
  }, [isCollapsed]);

  const menuItems = isAdmin ? [
    { id: 'admin-dashboard', label: 'Admin Console', icon: <LayoutDashboard style={{ width: 20, height: 20 }} /> },
    { id: 'admin-kop-surat', label: 'Kop Surat Institusi', icon: <FileText style={{ width: 20, height: 20 }} /> },
  ] : [
    { id: 'dashboard', label: 'Beranda', icon: <LayoutDashboard style={{ width: 20, height: 20 }} /> },
    { id: 'session-form', label: 'Mulai Sesi Baru', icon: <Plus style={{ width: 20, height: 20 }} /> },
    { id: 'plan-selection', label: 'Langganan', icon: <CreditCard style={{ width: 20, height: 20 }} /> },
  ];

  const isActive = (itemId: string) =>
    activeMenu === itemId ||
    (activeMenu === 'active-session' && itemId === 'session-form') ||
    (activeMenu === 'report-generator' && itemId === 'dashboard') ||
    (activeMenu === 'add-doctor' && itemId === 'admin-dashboard') ||
    (activeMenu === 'manage-subscription' && itemId === 'admin-dashboard') ||
    (activeMenu === 'checkout' && itemId === 'plan-selection');

  const getInitials = (name: string) =>
    name.split(' ').filter(n => !n.startsWith('Dr.')).map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const getRoleBadge = () => {
    if (isAdmin) return { label: 'Admin Institusi', bg: '#F5F3FF', color: '#7C3AED' };
    if (isEnterprise) return { label: 'Dokter Institusi', bg: '#F0FDFA', color: '#0D9488' };
    return { label: 'Personal', bg: '#EFF6FF', color: '#1D4ED8' };
  };

  const getSubscriptionStatus = () => {
    if (isAdmin || plan === 'subscription' || plan === 'enterprise') {
      return { state: 'active' as const, label: 'Aktif', dotColor: '#10B981', bg: '#ECFDF5', border: '#A7F3D0', textColor: '#065F46', pulse: false, showCta: false };
    }
    if (trialDaysLeft !== null && trialDaysLeft > 0 && trialDaysLeft <= 7) {
      return { state: 'warning' as const, label: `Trial — ${trialDaysLeft} hari lagi`, dotColor: '#F97316', bg: '#FFF7ED', border: '#FED7AA', textColor: '#C2410C', pulse: true, showCta: true };
    }
    if (trialDaysLeft !== null && trialDaysLeft > 7) {
      return { state: 'trial' as const, label: `Trial — ${trialDaysLeft} hari`, dotColor: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A', textColor: '#92400E', pulse: false, showCta: false };
    }
    return { state: 'inactive' as const, label: 'Tidak Aktif', dotColor: '#EF4444', bg: '#FEF2F2', border: '#FECACA', textColor: '#DC2626', pulse: true, showCta: true };
  };

  const roleBadge = getRoleBadge();
  const subStatus = getSubscriptionStatus();

  const sidebarWidth = isCollapsed ? 72 : 264;

  const pulseKeyframes = `
    @keyframes dotPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    @keyframes subtleShine {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
  `;

  return (
    <div style={{ height: '100vh', background: '#F8FAFC', display: 'flex', fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif", color: '#0C1E35', overflow: 'hidden', position: 'relative' }} className="print:overflow-visible print:h-auto print:bg-white print:block">
      <style>{pulseKeyframes}</style>

      <aside style={{ width: sidebarWidth, background: 'white', borderRight: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', height: '100%', zIndex: 40, transition: 'width 300ms ease-in-out', flexShrink: 0 }} className="print:hidden">
        <div style={{ height: 64, display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'space-between', paddingLeft: isCollapsed ? 0 : 16, paddingRight: isCollapsed ? 0 : 16, borderBottom: '1px solid #E2E8F0', flexShrink: 0 }}>
          <div
            onClick={() => onNavigate(isAdmin ? 'admin-dashboard' : 'dashboard')}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', overflow: 'hidden', gap: 8 }}
          >
            <Logo mSize={28} wSize={isCollapsed ? 0 : 18} />
          </div>
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              style={{ padding: 6, borderRadius: 8, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              <ChevronLeft style={{ width: 20, height: 20 }} />
            </button>
          )}
        </div>

        {isCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0', borderBottom: '1px solid #E2E8F0' }}>
            <button
              onClick={() => setIsCollapsed(false)}
              style={{ padding: 6, borderRadius: 8, color: '#64748B', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              <ChevronRight style={{ width: 20, height: 20 }} />
            </button>
          </div>
        )}

        {!isCollapsed && (
          <div style={{ padding: '16px 12px 8px', flexShrink: 0 }}>
            <div
              onClick={() => setProfileOpen(!profileOpen)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px',
                borderRadius: 16, cursor: 'pointer', transition: 'background-color 150ms',
                backgroundColor: profileOpen ? '#F1F5F9' : 'transparent',
              }}
              onMouseEnter={e => { if (!profileOpen) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
              onMouseLeave={e => { if (!profileOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <div style={{
                width: 42, height: 42, borderRadius: 14,
                background: 'linear-gradient(135deg, #0C1E35 0%, #1a3a5c 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                boxShadow: '0 2px 8px rgba(12,30,53,0.2)',
              }}>
                <span style={{ color: 'white', fontWeight: 800, fontSize: 13, fontFamily: 'Outfit, sans-serif' }}>{getInitials(userProfile.name)}</span>
              </div>
              <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0, lineHeight: 1.3 }}>{userProfile.name}</p>
                <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', lineHeight: 1.3, marginTop: 2 }}>
                  {userProfile.specialization || userProfile.email}
                </p>
              </div>
              <ChevronDown style={{
                width: 16, height: 16, color: '#94A3B8', flexShrink: 0,
                transition: 'transform 200ms',
                transform: profileOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              }} />
            </div>

            {profileOpen && (
              <div style={{
                marginTop: 4, padding: '8px',
                backgroundColor: '#F8FAFC', borderRadius: 14,
                border: '1px solid #F1F5F9',
              }}>
                <div style={{ padding: '8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      display: 'inline-flex', padding: '3px 10px', borderRadius: 999,
                      fontSize: 10, fontWeight: 700,
                      background: roleBadge.bg, color: roleBadge.color,
                    }}>
                      {roleBadge.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: subStatus.dotColor,
                        animation: subStatus.pulse ? 'dotPulse 2s ease-in-out infinite' : 'none',
                      }} />
                      <span style={{ fontSize: 10, fontWeight: 600, color: subStatus.textColor }}>{subStatus.label}</span>
                    </div>
                  </div>
                  {userProfile.email && (
                    <p style={{ fontSize: 11, color: '#94A3B8', margin: 0, wordBreak: 'break-all' }}>{userProfile.email}</p>
                  )}
                </div>
                <div style={{ height: 1, background: '#E2E8F0', margin: '6px 0' }} />
                <button
                  onClick={() => { setProfileOpen(false); onNavigate('settings'); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 10, border: 'none',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748B',
                    background: 'transparent', transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#0C1E35'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
                >
                  <User style={{ width: 14, height: 14 }} />
                  Profil & Pengaturan
                </button>
                <button
                  onClick={() => { setProfileOpen(false); onNavigate('settings'); }}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                    padding: '8px 10px', borderRadius: 10, border: 'none',
                    cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#64748B',
                    background: 'transparent', transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.color = '#0C1E35'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748B'; }}
                >
                  <Shield style={{ width: 14, height: 14 }} />
                  Keamanan
                </button>
              </div>
            )}
          </div>
        )}

        {isCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div
              onClick={() => setIsCollapsed(false)}
              title={userProfile.name}
              style={{
                width: 38, height: 38, borderRadius: 12,
                background: 'linear-gradient(135deg, #0C1E35 0%, #1a3a5c 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', boxShadow: '0 2px 8px rgba(12,30,53,0.2)',
              }}
            >
              <span style={{ color: 'white', fontWeight: 800, fontSize: 12, fontFamily: 'Outfit, sans-serif' }}>{getInitials(userProfile.name)}</span>
            </div>
          </div>
        )}

        <nav style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menuItems.map((item) => {
            const active = isActive(item.id);
            const isSubscription = item.id === 'plan-selection';
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as any)}
                title={isCollapsed ? item.label : ''}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  padding: isCollapsed ? 10 : '10px 16px',
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: active ? 700 : 500,
                  gap: isCollapsed ? 0 : 10,
                  backgroundColor: active ? '#0C1E35' : 'transparent',
                  color: active ? '#ffffff' : '#64748B',
                  transition: 'all 150ms',
                  position: 'relative',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {item.icon}
                {!isCollapsed && item.label}
                {isSubscription && !isCollapsed && subStatus.showCta && !active && (
                  <span style={{
                    marginLeft: 'auto', width: 8, height: 8, borderRadius: '50%',
                    background: '#F59E0B',
                    animation: 'dotPulse 2s ease-in-out infinite',
                  }} />
                )}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: 12, borderTop: '1px solid #F1F5F9', display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
          {isCollapsed ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }} title={subStatus.label}>
              <div style={{
                width: 10, height: 10, borderRadius: '50%',
                background: subStatus.dotColor,
                animation: subStatus.pulse ? 'dotPulse 2s ease-in-out infinite' : 'none',
              }} />
            </div>
          ) : (
            subStatus.showCta && (
              <button
                onClick={() => onNavigate('plan-selection')}
                style={{
                  width: '100%', padding: '10px 14px',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: 'white', borderRadius: 12,
                  fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontFamily: 'Outfit, sans-serif',
                  marginBottom: 8,
                  boxShadow: '0 2px 12px rgba(245,158,11,0.3)',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(245,158,11,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(245,158,11,0.3)'; }}
              >
                <Sparkles style={{ width: 14, height: 14 }} />
                Perpanjang Sekarang
              </button>
            )
          )}

          {(() => {
            const settingsActive = activeMenu === 'settings';
            return (
              <button
                onClick={() => onNavigate('settings')}
                title={isCollapsed ? 'Pengaturan' : ''}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  padding: isCollapsed ? 10 : '10px 16px',
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  gap: isCollapsed ? 0 : 10,
                  backgroundColor: settingsActive ? '#0C1E35' : 'transparent',
                  color: settingsActive ? '#ffffff' : '#64748B',
                  transition: 'all 150ms',
                }}
                onMouseEnter={e => { if (!settingsActive) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                onMouseLeave={e => { if (!settingsActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Settings style={{ width: 20, height: 20 }} />
                {!isCollapsed && 'Pengaturan'}
              </button>
            );
          })()}

          <button
            onClick={onLogout}
            onMouseEnter={() => setHoveredLogout(true)}
            onMouseLeave={() => setHoveredLogout(false)}
            title={isCollapsed ? 'Keluar' : ''}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: isCollapsed ? 'center' : 'flex-start',
              padding: isCollapsed ? '10px 0' : '10px 12px',
              gap: isCollapsed ? 0 : 10,
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 150ms',
              color: '#EF4444',
              background: hoveredLogout ? '#FEF2F2' : 'transparent',
            }}
          >
            <LogOut style={{ width: 20, height: 20 }} />
            {!isCollapsed && 'Keluar'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', padding: isCollapsed ? '8px 0' : '8px 16px' }} title={isOnline ? 'Online' : 'Offline'}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isOnline ? '#34D399' : '#CBD5E1' }} />
            {!isCollapsed && (
              <span style={{ fontSize: 9, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: 8 }}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            )}
          </div>
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', transition: 'all 300ms ease-in-out', background: '#F8FAFC' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          {children}
        </div>
      </main>
    </div>
  );
}
