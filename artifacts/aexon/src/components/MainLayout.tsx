import React, { useState, useEffect } from 'react';
import {
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  CreditCard,
  Clock,
  User,
  Zap,
} from 'lucide-react';
import { UserProfile } from '../types';
import { Monogram } from './Logo';

interface MainLayoutProps {
  children: React.ReactNode;
  activeMenu: string;
  onNavigate: (menu: any) => void;
  onLogout: () => void;
  plan: 'subscription' | 'enterprise' | 'trial' | null;
  trialDaysLeft: number | null;
  userProfile: UserProfile;
  subscriptionData?: any;
}

export default function MainLayout({
  children,
  activeMenu,
  onNavigate,
  onLogout,
  plan,
  trialDaysLeft,
  userProfile,
  subscriptionData,
}: MainLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showLogout, setShowLogout] = useState(false);
  const [sidebarActive, setSidebarActive] = useState<string>(activeMenu);

  const isAdmin = userProfile.role === 'admin';
  const isEnterprise = plan === 'enterprise';
  const isDokterEnterprise = !isAdmin && isEnterprise;

  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  // Sync sidebar highlight with parent activeMenu for sub-routes
  useEffect(() => {
    const subRouteMap: Record<string, string> = {
      'active-session': 'dashboard',
      'session-form': 'dashboard',
      'report-generator': 'dashboard',
      'gallery': 'dashboard',
      'patient-profile': 'dashboard',
      'add-doctor': 'admin-dashboard',
      'plan-selection': 'manage-subscription',
      'checkout': 'manage-subscription',
    };
    const mapped = subRouteMap[activeMenu];
    if (mapped) {
      setSidebarActive(mapped);
    } else if (activeMenu !== sidebarActive) {
      const allKnown = [
        'dashboard', 'admin-dashboard', 'session-history',
        'manage-subscription', 'settings', 'profile',
      ];
      if (allKnown.includes(activeMenu)) {
        setSidebarActive(activeMenu);
      }
    }
  }, [activeMenu]);

  // Close logout popup on outside click
  useEffect(() => {
    if (!showLogout) return;
    const close = () => setShowLogout(false);
    const t = setTimeout(() => document.addEventListener('click', close), 0);
    return () => { clearTimeout(t); document.removeEventListener('click', close); };
  }, [showLogout]);

  useEffect(() => {
    if (isCollapsed) setShowLogout(false);
  }, [isCollapsed]);

  const menuItems = isAdmin
  ? [
      { id: 'admin-dashboard', label: 'Beranda Admin', icon: <LayoutDashboard style={{ width: 18, height: 18 }} /> },
    ]
    : isDokterEnterprise
    ? [
        { id: 'dashboard', label: 'Beranda', icon: <LayoutDashboard style={{ width: 18, height: 18 }} /> },
        { id: 'session-history', label: 'Riwayat', icon: <Clock style={{ width: 18, height: 18 }} /> },
      ]
    : [
      { id: 'dashboard', label: 'Beranda', icon: <LayoutDashboard style={{ width: 18, height: 18 }} /> },
      { id: 'session-history', label: 'Riwayat', icon: <Clock style={{ width: 18, height: 18 }} /> },
    ];

  const accountItems = [
    { id: 'profile', label: 'Profil', icon: <User style={{ width: 18, height: 18 }} /> },
    ...(!isEnterprise ? [{ id: 'manage-subscription', label: 'Langganan', icon: <CreditCard style={{ width: 18, height: 18 }} /> }] : []),
    { id: 'settings', label: 'Pengaturan', icon: <Settings style={{ width: 18, height: 18 }} /> },
  ];

  const handleMenuClick = (id: string) => {
    setSidebarActive(id);
    onNavigate(id);
  };

  const getInitials = (name: string) =>
    name.split(' ').filter(n => !n.startsWith('Dr.')).map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const getSubscriptionCta = () => {
    // Enterprise — info banner kalau expired (tanpa CTA upgrade)
    if (isEnterprise) {
      const instExpired = subscriptionData?.institution_expired === true || subscriptionData?.active === false;
      if (instExpired) {
        return {
          variant: 'enterprise_expired' as const,
          text: isAdmin
            ? 'Langganan institusi telah berakhir. Hubungi tim Aexon untuk memperpanjang.'
            : 'Langganan institusi telah berakhir. Hubungi Admin RS Anda.',
        };
      }
      return null;
    }
    // Personal
    if (plan === 'subscription') return null;
    if (trialDaysLeft !== null && trialDaysLeft > 0 && trialDaysLeft <= 3) {
      return { variant: 'warn' as const, text: `${trialDaysLeft} hari lagi! Anda akan kehilangan Akses.` };
    }
    if (trialDaysLeft !== null && trialDaysLeft > 0) {
      return { variant: 'trial' as const, text: `${trialDaysLeft} hari tersisa. Upgrade untuk akses penuh.` };
    }
    return { variant: 'expired' as const, text: 'Akses terbatas. Perpanjang sekarang.' };
  };

  const getUserRoleLabel = () => {
    if (isAdmin) return 'Admin';
    if (isEnterprise) return 'Enterprise';
    if (plan === 'subscription') return 'Personal';
    if (trialDaysLeft !== null && trialDaysLeft > 0) return 'Trial';
    if (!plan && (trialDaysLeft === null || trialDaysLeft === 0)) return 'Expired';
    return 'Personal';
  };

  const subCta = getSubscriptionCta();
  const showDot = subCta !== null;
  const sidebarWidth = isCollapsed ? 68 : 220;

  const ctaVariants = {
    trial: { bg: 'linear-gradient(135deg, #1e3a5f, #0C1E35)', border: '1px solid rgba(255,255,255,0.06)', btnBg: '#2563EB' },
    warn: { bg: 'linear-gradient(135deg, #78350F, #451a03)', border: '1px solid rgba(251,191,36,0.1)', btnBg: '#F59E0B' },
    expired: { bg: 'linear-gradient(135deg, #7F1D1D, #450a0a)', border: '1px solid rgba(248,113,113,0.1)', btnBg: '#EF4444' },
    enterprise_expired: { bg: 'linear-gradient(135deg, #78350F, #451a03)', border: '1px solid rgba(251,191,36,0.1)', btnBg: '#F59E0B' },
  };

  const renderMenuItem = (item: { id: string; label: string; icon: React.ReactNode }, showNotifDot?: boolean) => {
    const active = sidebarActive === item.id;
    return (
      <button
        key={item.id}
        onClick={() => handleMenuClick(item.id)}
        title={isCollapsed ? item.label : ''}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: isCollapsed ? 'center' : 'flex-start',
          gap: isCollapsed ? 0 : 10,
          padding: isCollapsed ? '9px 0' : '8px 24px',
          border: 'none',
          background: 'none',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: active ? 600 : 500,
          color: active ? '#FFFFFF' : 'rgba(255,255,255,0.3)',
          transition: 'color 120ms',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
          position: 'relative',
        }}
        onMouseEnter={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)';
        }}
        onMouseLeave={(e) => {
          if (!active) (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.3)';
        }}
      >
        {/* Blue accent bar */}
        {active && !isCollapsed && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 3,
              height: 18,
              borderRadius: '0 2px 2px 0',
              background: '#60A5FA',
            }}
          />
        )}
        {item.icon}
        {!isCollapsed && item.label}
        {!isCollapsed && showNotifDot && showDot && !active && (
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: subCta?.variant === 'expired' || subCta?.variant === 'warn' ? '#EF4444' : '#FBBF24',
              marginLeft: 'auto',
            }}
          />
        )}
      </button>
    );
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#F8FAFC',
        display: 'flex',
        fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
        color: '#0C1E35',
        overflow: 'hidden',
      }}
      className="print:overflow-visible print:h-auto print:bg-white print:block print:static"
    >
      <aside
        style={{
          width: sidebarWidth,
          background: '#0C1E35',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          zIndex: 40,
          transition: 'width 250ms ease-in-out',
          flexShrink: 0,
          position: 'relative',
        }}
        className="print:hidden"
      >
        {/* Logo */}
        <div
          style={{
            padding: isCollapsed ? '22px 0' : '22px 20px 22px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
          }}
        >
          <div
            onClick={() => onNavigate(isAdmin ? 'admin-dashboard' : 'dashboard')}
            style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', gap: 9, overflow: 'hidden' }}
          >
            <Monogram bg="#0C1E35" fg="#FFFFFF" dot="#2563EB" size={isCollapsed ? 26 : 28} />
            {!isCollapsed && (
              <span className="font-aexon" style={{ fontSize: 17, color: '#FFFFFF' }}>
                Aexon
              </span>
            )}
          </div>
        </div>

        {/* Collapse toggle — posisi konsisten, mudah diklik */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Buka sidebar' : 'Tutup sidebar'}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'flex-start',
            gap: 8,
            padding: isCollapsed ? '10px 0' : '10px 24px',
            margin: '0 0 8px',
            background: 'none',
            border: 'none',
            borderTop: '1px solid rgba(255,255,255,0.04)',
            borderBottom: '1px solid rgba(255,255,255,0.04)',
            color: 'rgba(255,255,255,0.25)',
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            transition: 'color 120ms, background 120ms',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.5)';
            (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.25)';
            (e.currentTarget as HTMLElement).style.background = 'none';
          }}
        >
          {isCollapsed
            ? <ChevronRight style={{ width: 18, height: 18 }} />
            : <><ChevronLeft style={{ width: 18, height: 18 }} /><span>Tutup</span></>
          }
        </button>

        {/* Nav */}
        <nav style={{ flex: 1, paddingTop: 4, overflowY: 'auto', minHeight: 0 }}>
          {menuItems.map((item) => renderMenuItem(item, item.id === 'manage-subscription'))}

          <div
            style={{
              height: 1,
              background: 'rgba(255,255,255,0.04)',
              margin: isCollapsed ? '10px 16px' : '10px 24px',
            }}
          />

          {accountItems.map((item) => renderMenuItem(item))}
        </nav>

        {/* CTA card */}
        {subCta && !isCollapsed && (
          <div
            onClick={subCta.variant === 'enterprise_expired' ? undefined : () => handleMenuClick('plan-selection')}
            style={{
              margin: '0 14px 10px',
              padding: '18px 16px',
              borderRadius: 12,
              background: ctaVariants[subCta.variant].bg,
              border: ctaVariants[subCta.variant].border,
              position: 'relative',
              overflow: 'hidden',
              cursor: subCta.variant === 'enterprise_expired' ? 'default' : 'pointer',
            }}
          >
            <div style={{ position: 'absolute', width: 70, height: 70, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.04)', top: -18, right: -12 }} />
            <div style={{ position: 'absolute', width: 44, height: 44, borderRadius: '50%', border: '1px solid rgba(255,255,255,0.03)', bottom: 6, right: 24 }} />
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: subCta.variant === 'enterprise_expired' ? 0 : 12, lineHeight: 1.5, position: 'relative', zIndex: 1 }}>
              {subCta.text}
            </p>
            {subCta.variant !== 'enterprise_expired' && (
              <button
                onClick={(e) => { e.stopPropagation(); handleMenuClick('plan-selection'); }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '7px 14px',
                  background: ctaVariants[subCta.variant].btnBg,
                  border: 'none',
                  borderRadius: 7,
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 1,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                <Zap style={{ width: 12, height: 12 }} />
                Upgrade Plan
              </button>
            )}
          </div>
        )}

        {subCta && isCollapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }} title={subCta.text}>
            <div
              onClick={subCta.variant === 'enterprise_expired' ? undefined : () => handleMenuClick('plan-selection')}
              style={{
                width: 10, height: 10, borderRadius: '50%',
                background: ctaVariants[subCta.variant].btnBg,
                cursor: subCta.variant === 'enterprise_expired' ? 'default' : 'pointer',
                animation: subCta.variant !== 'trial' ? 'dotPulse 2s ease-in-out infinite' : 'none',
              }}
            />
          </div>
        )}

          {/* User + logout */}
          <div style={{ padding: isCollapsed ? '10px 0 14px' : '10px 14px 14px', borderTop: '1px solid rgba(255,255,255,0.04)', position: 'relative' }}>
          {isCollapsed ? (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div
                onClick={() => setIsCollapsed(false)}
                title={userProfile.name}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: 'linear-gradient(135deg, #2563EB, #60A5FA)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: 'white', fontWeight: 800, fontSize: 11, fontFamily: 'Outfit, sans-serif' }}>
                  {getInitials(userProfile.name)}
                </span>
              </div>
            </div>
          ) : (
            <>
              <div
                onClick={(e) => { e.stopPropagation(); setShowLogout(!showLogout); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px',
                  cursor: 'pointer', borderRadius: 8, transition: 'background 100ms',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{
                  width: 30, height: 30, borderRadius: 8,
                  background: 'linear-gradient(135deg, #2563EB, #60A5FA)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <span style={{ color: 'white', fontWeight: 800, fontSize: 11, fontFamily: 'Outfit, sans-serif' }}>
                    {getInitials(userProfile.name)}
                  </span>
                </div>
                <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', margin: 0, lineHeight: 1.3 }}>
                    {userProfile.name}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', margin: 0, lineHeight: 1.3, marginTop: 1 }}>
                    {getUserRoleLabel()}
                  </p>
                </div>
              </div>

              {showLogout && (
                <div style={{
                  position: 'absolute', bottom: '100%', left: 10, right: 10,
                  marginBottom: 6, padding: 4, borderRadius: 10,
                  backgroundColor: '#0C1E35', border: '1px solid rgba(255,255,255,0.15)',
                  boxShadow: '0 -8px 32px rgba(0,0,0,0.7)',
                  zIndex: 60,
                }}>
                  <button
                    onClick={() => { setShowLogout(false); handleMenuClick('profile'); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', border: 'none', background: 'none', textAlign: 'left',
                      fontFamily: "'Plus Jakarta Sans', sans-serif", borderRadius: 6, transition: 'background 100ms',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
                  >
                    <User style={{ width: 13, height: 13 }} />
                    Profil
                  </button>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '2px 6px' }} />
                  <button
                    onClick={onLogout}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 10px', color: '#F87171', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', border: 'none', background: 'rgba(248,113,113,0.08)', textAlign: 'left',
                      fontFamily: "'Plus Jakarta Sans', sans-serif", borderRadius: 6, transition: 'background 100ms',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.15)'; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.08)'; }}
                  >
                    <LogOut style={{ width: 13, height: 13 }} />
                    Logout
                  </button>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', marginTop: 4 }} title={isOnline ? 'Online' : 'Offline'}>
                <div style={{ width: 5, height: 5, borderRadius: '50%', background: isOnline ? '#34D399' : '#CBD5E1' }} />
                <span style={{ fontSize: 9, fontWeight: 600, color: 'rgba(255,255,255,0.12)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
            </>
          )}
        </div>
      </aside>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#F8FAFC' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'auto' }}>
          {children}
        </div>
      </main>
    </div>
  );
}