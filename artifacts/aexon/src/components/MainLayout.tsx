import React, { useState, useEffect } from 'react';
import { FileText, Plus, Settings, LogOut, ChevronLeft, ChevronRight, LayoutDashboard } from 'lucide-react';
import { UserProfile } from '../types';
import { Logo } from './Logo';

interface MainLayoutProps {
  children: React.ReactNode;
  activeMenu: 'dashboard' | 'admin-dashboard' | 'admin-kop-surat' | 'pricing' | 'session-form' | 'active-session' | 'report-generator' | 'settings' | 'gallery' | 'launcher' | 'add-doctor' | 'manage-subscription';
  onNavigate: (menu: any) => void;
  onLogout: () => void;
  plan: 'subscription' | 'enterprise' | null;
  trialDaysLeft: number | null;
  userProfile: UserProfile;
}

export default function MainLayout({ children, activeMenu, onNavigate, onLogout, plan, trialDaysLeft, userProfile }: MainLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);
  const [hoveredLogout, setHoveredLogout] = useState(false);
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

  const menuItems = isAdmin ? [
    { id: 'admin-dashboard', label: 'Admin Console', icon: <LayoutDashboard style={{ width: 20, height: 20 }} /> },
    { id: 'admin-kop-surat', label: 'Kop Surat Institusi', icon: <FileText style={{ width: 20, height: 20 }} /> },
  ] : [
    { id: 'dashboard', label: 'Beranda', icon: <LayoutDashboard style={{ width: 20, height: 20 }} /> },
    { id: 'session-form', label: 'Mulai Sesi Baru', icon: <Plus style={{ width: 20, height: 20 }} /> },
  ];

  const isActive = (itemId: string) =>
    activeMenu === itemId ||
    (activeMenu === 'active-session' && itemId === 'session-form') ||
    (activeMenu === 'report-generator' && itemId === 'dashboard') ||
    (activeMenu === 'add-doctor' && itemId === 'admin-dashboard') ||
    (activeMenu === 'manage-subscription' && itemId === 'admin-dashboard');

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

  const sidebarWidth = isCollapsed ? 72 : 256;

  const pulseKeyframes = `
    @keyframes dotPulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
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
            {!isCollapsed && (
              <span className="font-aexon" style={{ fontSize: 20, color: '#0C1E35' }}>Aexon</span>
            )}
          </div>
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(true)}
              style={{ padding: 6, borderRadius: 8, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
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
              style={{ padding: 6, borderRadius: 8, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
            >
              <ChevronRight style={{ width: 20, height: 20 }} />
            </button>
          </div>
        )}

        <nav style={{ flex: 1, padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {menuItems.map((item) => {
            const active = isActive(item.id);
            const hovered = hoveredNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id as any)}
                onMouseEnter={() => setHoveredNav(item.id)}
                onMouseLeave={() => setHoveredNav(null)}
                title={isCollapsed ? item.label : ''}
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
                  background: active ? '#0C1E35' : (hovered ? '#F8FAFC' : 'transparent'),
                  color: active ? 'white' : (hovered ? '#0C1E35' : '#64748B'),
                }}
              >
                {item.icon}
                {!isCollapsed && item.label}
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
            <div style={{
              background: subStatus.bg,
              border: `1px solid ${subStatus.border}`,
              borderRadius: 14,
              padding: '10px 12px',
              marginLeft: 0, marginRight: 0, marginBottom: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: subStatus.dotColor,
                  animation: subStatus.pulse ? 'dotPulse 2s ease-in-out infinite' : 'none',
                }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: subStatus.textColor }}>{subStatus.label}</span>
              </div>
              {subStatus.showCta && (
                <button
                  onClick={() => onNavigate('settings')}
                  style={{
                    width: '100%', marginTop: 6, padding: '6px 10px',
                    background: '#0C1E35', color: 'white', borderRadius: 8,
                    fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer',
                  }}
                >
                  Perpanjang Sekarang
                </button>
              )}
            </div>
          )}

          {(() => {
            const settingsActive = activeMenu === 'settings';
            const settingsHovered = hoveredNav === 'settings';
            return (
              <button
                onClick={() => onNavigate('settings')}
                onMouseEnter={() => setHoveredNav('settings')}
                onMouseLeave={() => setHoveredNav(null)}
                title={isCollapsed ? 'Pengaturan' : ''}
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
                  background: settingsActive ? '#0C1E35' : (settingsHovered ? '#F8FAFC' : 'transparent'),
                  color: settingsActive ? 'white' : (settingsHovered ? '#0C1E35' : '#64748B'),
                }}
              >
                <Settings style={{ width: 20, height: 20 }} />
                {!isCollapsed && 'Pengaturan'}
              </button>
            );
          })()}

          <div style={{ padding: isCollapsed ? '4px 0' : '4px 0', display: 'flex', alignItems: 'center', justifyContent: isCollapsed ? 'center' : 'flex-start', gap: isCollapsed ? 0 : 12, marginTop: 4 }}>
            <div style={{
              width: 40, height: 40, background: '#0C1E35', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 12 }}>{getInitials(userProfile.name)}</span>
            </div>
            {!isCollapsed && (
              <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: '#0C1E35', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0 }}>{userProfile.name}</p>
                <span style={{
                  display: 'inline-block', padding: '2px 8px', borderRadius: 999,
                  fontSize: 10, fontWeight: 700, marginTop: 2,
                  background: roleBadge.bg, color: roleBadge.color,
                }}>
                  {roleBadge.label}
                </span>
              </div>
            )}
          </div>

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
              <span style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginLeft: 8 }}>
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
