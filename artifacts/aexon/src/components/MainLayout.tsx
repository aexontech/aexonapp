import React, { useState, useEffect } from 'react';
import { FileText, Plus, Settings, LogOut, ChevronLeft, ChevronRight, LayoutDashboard, Home } from 'lucide-react';
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
    { id: 'admin-dashboard', label: 'Admin Console', icon: <LayoutDashboard className="w-5 h-5" /> },
    { id: 'admin-kop-surat', label: 'Kop Surat Institusi', icon: <FileText className="w-5 h-5" /> },
  ] : [
    { id: 'dashboard', label: 'Beranda', icon: <Home className="w-5 h-5" /> },
    { id: 'session-form', label: 'Mulai Sesi Baru', icon: <Plus className="w-5 h-5" /> },
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
    if (isAdmin) return { label: 'Admin Institusi', color: 'bg-purple-100 text-purple-700' };
    if (isEnterprise) return { label: 'Dokter Institusi', color: 'bg-teal-100 text-teal-700' };
    return { label: 'Personal', color: 'bg-blue-100 text-blue-700' };
  };

  const getSubscriptionStatus = () => {
    if (isAdmin || plan === 'subscription' || plan === 'enterprise') {
      return { state: 'active' as const, label: 'Aktif', sublabel: 'Langganan aktif', dotColor: 'bg-emerald-500', bgColor: 'bg-emerald-50', borderColor: 'border-emerald-200', textColor: 'text-emerald-700', pulse: false, showCta: false };
    }
    if (trialDaysLeft !== null && trialDaysLeft > 0 && trialDaysLeft <= 7) {
      return { state: 'warning' as const, label: `Trial — ${trialDaysLeft} hari lagi`, sublabel: 'Segera berlangganan', dotColor: 'bg-orange-500', bgColor: 'bg-orange-50', borderColor: 'border-orange-200', textColor: 'text-orange-700', pulse: true, showCta: true, ctaLabel: 'Segera Berlangganan', ctaBg: 'bg-orange-500 hover:bg-orange-600' };
    }
    if (trialDaysLeft !== null && trialDaysLeft > 7) {
      return { state: 'trial' as const, label: `Trial — ${trialDaysLeft} hari lagi`, sublabel: '', dotColor: 'bg-yellow-500', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-100', textColor: 'text-yellow-700', pulse: false, showCta: false };
    }
    return { state: 'inactive' as const, label: 'Tidak Aktif', sublabel: 'Berlangganan Sekarang', dotColor: 'bg-red-500', bgColor: 'bg-red-50', borderColor: 'border-red-200', textColor: 'text-red-700', pulse: true, showCta: true, ctaLabel: 'Berlangganan Sekarang', ctaBg: 'bg-[#0C1E35] hover:bg-[#1a3a5c]' };
  };

  const roleBadge = getRoleBadge();
  const subStatus = getSubscriptionStatus();

  return (
    <div className="h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden relative print:overflow-visible print:h-auto print:bg-white print:block">
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-100 flex flex-col h-full z-40 transition-all duration-300 ease-in-out shrink-0 print:hidden`}>
        <div className={`h-16 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-4'} border-b border-slate-100 shrink-0`}>
          <div
            onClick={() => onNavigate(isAdmin ? 'admin-dashboard' : 'dashboard')}
            className={`flex items-center cursor-pointer hover:opacity-80 transition-opacity overflow-hidden ${isCollapsed ? 'hidden' : ''}`}
          >
            <Logo mSize={28} wSize={isCollapsed ? 0 : 18} />
          </div>
          {isCollapsed && (
            <div
              onClick={() => onNavigate(isAdmin ? 'admin-dashboard' : 'dashboard')}
              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity"
            >
              <Logo mSize={28} wSize={0} />
            </div>
          )}
          {!isCollapsed && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {isCollapsed && (
          <div className="flex justify-center py-2 border-b border-slate-100">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        )}

        <nav className="flex-1 p-3 space-y-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as any)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                isActive(item.id)
                  ? 'bg-[#0C1E35] text-white shadow-sm'
                  : 'text-gray-500 hover:bg-slate-50'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <div className={`${isCollapsed ? '' : 'mr-3'} ${
                isActive(item.id) ? 'text-white' : 'text-gray-400'
              }`}>
                {item.icon}
              </div>
              {!isCollapsed && item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-slate-100 space-y-1 shrink-0">
          {isCollapsed ? (
            <div className="flex justify-center py-2" title={subStatus.label}>
              <div className={`w-2.5 h-2.5 rounded-full ${subStatus.dotColor} ${subStatus.pulse ? 'animate-pulse' : ''}`} />
            </div>
          ) : (
            <div className={`${subStatus.bgColor} border ${subStatus.borderColor} rounded-xl p-3 mb-1`}>
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${subStatus.dotColor} shrink-0 ${subStatus.pulse ? 'animate-pulse' : ''}`} />
                <span className={`text-xs font-semibold ${subStatus.textColor}`}>{subStatus.label}</span>
              </div>
              {subStatus.sublabel && !subStatus.showCta && (
                <p className={`text-[10px] ${subStatus.textColor} opacity-75 mt-1 ml-[18px]`}>{subStatus.sublabel}</p>
              )}
              {subStatus.showCta && (
                <button
                  onClick={() => onNavigate('settings')}
                  className={`w-full mt-2 px-3 py-1.5 ${(subStatus as any).ctaBg} text-white text-[10px] font-bold rounded-lg transition-colors`}
                >
                  {(subStatus as any).ctaLabel}
                </button>
              )}
            </div>
          )}

          <button
            onClick={() => onNavigate('settings')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
              activeMenu === 'settings'
                ? 'bg-[#0C1E35] text-white shadow-sm'
                : 'text-gray-500 hover:bg-slate-50'
            }`}
            title={isCollapsed ? 'Pengaturan' : ''}
          >
            <Settings className={`${isCollapsed ? '' : 'mr-3'} w-5 h-5 ${activeMenu === 'settings' ? 'text-white' : 'text-gray-400'}`} />
            {!isCollapsed && 'Pengaturan'}
          </button>

          <div className={`mt-3 mb-2 ${isCollapsed ? 'px-1' : 'px-2'}`}>
            <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
              <div className="w-10 h-10 bg-[#0C1E35] rounded-full flex items-center justify-center shrink-0">
                <span className="text-white font-bold text-xs">{getInitials(userProfile.name)}</span>
              </div>
              {!isCollapsed && (
                <div className="overflow-hidden flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{userProfile.name}</p>
                  <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full mt-1 ${roleBadge.color}`}>
                    {roleBadge.label}
                  </span>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={onLogout}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all duration-200`}
            title={isCollapsed ? 'Keluar' : ''}
          >
            <LogOut className={`${isCollapsed ? '' : 'mr-3'} w-5 h-5 text-red-400`} />
            {!isCollapsed && 'Keluar'}
          </button>

          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-2 mt-1`} title={isOnline ? 'Online' : 'Offline'}>
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-slate-300'}`} />
            {!isCollapsed && (
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-2">
                {isOnline ? 'Online' : 'Offline'}
              </span>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out bg-white">
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
