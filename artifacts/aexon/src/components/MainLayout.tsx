import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Plus, CalendarDays, Settings, LogOut, ChevronLeft, ChevronRight, Wifi, WifiOff } from 'lucide-react';
import { UserProfile } from '../types';
import { Logo } from './Logo';

interface MainLayoutProps {
  children: React.ReactNode;
  activeMenu: 'dashboard' | 'admin-dashboard' | 'pricing' | 'session-form' | 'active-session' | 'report-generator' | 'settings' | 'gallery' | 'launcher' | 'add-doctor' | 'manage-subscription';
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
    { id: 'admin-dashboard', label: 'Admin Console', icon: <FileText className="w-5 h-5" /> },
    { id: 'settings', label: 'Enterprise Settings', icon: <Settings className="w-5 h-5" /> },
  ] : [
    { id: 'dashboard', label: 'Beranda', icon: <Logo mSize={20} wSize={0} /> },
    { id: 'session-form', label: 'Mulai Sesi Baru', icon: <Plus className="w-5 h-5" /> },
    { id: 'pricing', label: 'Paket & Berlangganan', icon: <CalendarDays className="w-5 h-5" /> },
  ];

  const isActive = (itemId: string) =>
    activeMenu === itemId ||
    (activeMenu === 'active-session' && itemId === 'session-form') ||
    (activeMenu === 'report-generator' && itemId === 'dashboard');

  const getInitials = (name: string) =>
    name.split(' ').filter(n => !n.startsWith('Dr.')).map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const getRoleBadge = () => {
    if (isAdmin) return { label: 'Admin Institusi', color: 'bg-purple-100 text-purple-700' };
    if (plan === 'enterprise') return { label: 'Dokter Institusi', color: 'bg-teal-100 text-teal-700' };
    return { label: 'Personal', color: 'bg-blue-100 text-blue-700' };
  };

  const getSubscriptionChip = () => {
    if (plan === 'subscription') return { label: 'Aktif', color: 'bg-emerald-100 text-emerald-700' };
    if (plan === 'enterprise') return { label: 'Aktif', color: 'bg-emerald-100 text-emerald-700' };
    if (trialDaysLeft !== null && trialDaysLeft > 0) return { label: `Trial ${trialDaysLeft} hari`, color: 'bg-yellow-100 text-yellow-700' };
    return { label: 'Tidak Aktif', color: 'bg-red-100 text-red-700' };
  };

  const roleBadge = getRoleBadge();
  const subChip = getSubscriptionChip();

  return (
    <div className="h-screen bg-slate-50 flex font-sans text-slate-900 overflow-hidden relative">
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-100 flex flex-col h-full z-40 transition-all duration-300 ease-in-out shrink-0`}>
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

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
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
                  <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                    <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full ${roleBadge.color}`}>
                      {roleBadge.label}
                    </span>
                    <span className={`inline-flex px-2 py-0.5 text-[9px] font-bold rounded-full ${subChip.color}`}>
                      {subChip.label}
                    </span>
                  </div>
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
