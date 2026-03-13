import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Plus, CalendarDays, Settings, LogOut, ChevronLeft, ChevronRight, Menu } from 'lucide-react';
import { UserProfile } from '../types';
import { Logo } from './Logo';

interface MainLayoutProps {
  children: React.ReactNode;
  activeMenu: 'dashboard' | 'admin-dashboard' | 'pricing' | 'session-form' | 'active-session' | 'report-generator' | 'settings' | 'gallery' | 'launcher' | 'add-doctor' | 'manage-subscription';
  onNavigate: (menu: any) => void;
  onLogout: () => void;
  plan: 'subscription' | 'token' | 'enterprise' | null;
  tokens: number;
  trialDaysLeft: number | null;
  userProfile: UserProfile;
}

export default function MainLayout({ children, activeMenu, onNavigate, onLogout, plan, tokens, trialDaysLeft, userProfile }: MainLayoutProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const isAdmin = userProfile.role === 'admin';
  const subscriptionDaysLeft = 3; // Mocked for demo
  const isWarning = (trialDaysLeft !== null) || 
                    (plan === 'subscription' && subscriptionDaysLeft < 5) || 
                    (plan === 'token' && tokens < 3);

  const menuItems = isAdmin ? [
    { id: 'admin-dashboard', label: 'Admin Console', icon: <FileText className="w-5 h-5" /> },
    { id: 'settings', label: 'Enterprise Settings', icon: <Settings className="w-5 h-5" /> },
  ] : [
    { id: 'dashboard', label: 'Beranda', icon: <Logo mSize={20} wSize={0} /> },
    { id: 'session-form', label: 'Mulai Sesi Baru', icon: <Plus className="w-5 h-5" /> },
    { id: 'pricing', label: 'Paket & Berlangganan', icon: <CalendarDays className="w-5 h-5" /> },
  ];

  return (
    <div className="h-screen bg-slate-100 flex font-sans text-slate-900 overflow-hidden relative">
      {/* Decorative Background Elements */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-blue-100/30 rounded-full blur-[120px] -mr-64 -mt-64 pointer-events-none z-0" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-indigo-100/20 rounded-full blur-[100px] -ml-48 -mb-48 pointer-events-none z-0" />
      
      {/* Sidebar */}
      <aside className={`${isCollapsed ? 'w-20' : 'w-64'} bg-white border-r border-slate-200 flex flex-col h-full z-40 transition-all duration-300 ease-in-out shadow-sm shrink-0`}>
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

        <div className="p-4 border-b border-slate-100 shrink-0 overflow-hidden">
          <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'mb-5 px-1'}`}>
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0 border border-white/20">
              <span className="text-white font-black text-sm">
                {userProfile.name.split(' ').filter(n => !n.startsWith('Dr.')).map(n => n[0]).join('').slice(0, 2)}
              </span>
            </div>
            {!isCollapsed && (
              <div className="ml-4 overflow-hidden">
                <p className="text-sm font-black text-slate-900 truncate tracking-tight">{userProfile.name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate">{userProfile.specialization}</p>
                </div>
              </div>
            )}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as any)}
              className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3 rounded-xl text-sm font-medium transition-all ${
                activeMenu === item.id || (activeMenu === 'active-session' && item.id === 'session-form') || (activeMenu === 'report-generator' && item.id === 'dashboard')
                  ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
              title={isCollapsed ? item.label : ''}
            >
              <div className={`${isCollapsed ? '' : 'mr-3'} ${
                activeMenu === item.id || (activeMenu === 'active-session' && item.id === 'session-form') || (activeMenu === 'report-generator' && item.id === 'dashboard')
                  ? 'text-blue-600' 
                  : 'text-slate-400'
              }`}>
                {item.icon}
              </div>
              {!isCollapsed && item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-1 shrink-0">
          {/* Unified Status & Subscription Card */}
          {!isCollapsed && (
            <motion.div 
              whileHover={{ scale: 1.02 }}
              className={`mb-4 p-4 rounded-2xl shadow-lg border border-white/10 relative overflow-hidden group cursor-pointer transition-all ${
                isWarning ? 'bg-gradient-to-br from-orange-500 to-red-600 shadow-orange-500/25' :
                plan === 'enterprise' ? 'bg-gradient-to-br from-indigo-600 to-purple-700 shadow-indigo-500/20' :
                'bg-gradient-to-br from-blue-600 to-indigo-700 shadow-blue-500/20'
              }`}
              onClick={() => onNavigate('pricing')}
            >
              <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-full blur-xl -mr-8 -mt-8 group-hover:bg-white/20 transition-colors" />
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${
                    isWarning ? 'bg-white' : 'bg-emerald-400'
                  }`} />
                  <p className="text-[10px] font-black text-white/80 uppercase tracking-[0.15em]">
                    {plan === 'subscription' ? 'Masa Aktif' : 
                     plan === 'token' ? 'Status Token' : 
                     plan === 'enterprise' ? 'Akses Enterprise' : 
                     trialDaysLeft !== null ? 'Masa Percobaan' : 'Status Akses'}
                  </p>
                </div>

                {plan === 'subscription' && (
                  <>
                    <p className="text-[11px] text-white font-bold leading-tight mb-3">Langganan berakhir dalam <span className={isWarning ? 'text-white underline underline-offset-2' : 'text-emerald-400'}>{subscriptionDaysLeft} hari</span>.</p>
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-3">
                      <motion.div initial={{ width: 0 }} animate={{ width: '85%' }} className={`h-full ${isWarning ? 'bg-white' : 'bg-emerald-400'}`} />
                    </div>
                  </>
                )}

                {plan === 'token' && (
                  <>
                    <p className="text-[11px] text-white font-bold leading-tight mb-3">Tersisa <span className={isWarning ? 'text-white underline underline-offset-2' : 'text-emerald-400'}>{tokens} Token</span> Sesi.</p>
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-3">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(100, (tokens/50)*100)}%` }} className={`h-full ${isWarning ? 'bg-white' : 'bg-emerald-400'}`} />
                    </div>
                  </>
                )}

                {plan === 'enterprise' && (
                  <p className="text-[11px] text-white font-bold leading-tight mb-3">Terhubung via <span className="text-emerald-400">SSO Institusi</span>.</p>
                )}

                {trialDaysLeft !== null && plan === null && (
                  <>
                    <p className="text-[11px] text-white font-bold leading-tight mb-3">Trial berakhir dalam <span className="text-white font-black">{trialDaysLeft} hari</span>.</p>
                    <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden mb-3">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${(trialDaysLeft/7)*100}%` }} className="h-full bg-white" />
                    </div>
                  </>
                )}

                {plan === null && trialDaysLeft === null && (
                  <p className="text-[11px] text-white font-bold leading-tight mb-3">Belum ada paket aktif.</p>
                )}

                <div className="mt-4 py-2.5 px-3 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl border border-white/20 flex items-center justify-center text-[10px] font-black text-white uppercase tracking-wider transition-all group-hover:scale-[1.02] active:scale-95 shadow-sm">
                  {plan === 'subscription' || trialDaysLeft !== null || plan === null ? 'Perpanjang Sekarang' : 'Lihat Detail Paket'}
                  <ChevronRight className="w-3 h-3 ml-1.5 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </div>
            </motion.div>
          )}
          
          <button 
            onClick={() => onNavigate('settings')}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3 rounded-xl text-sm font-medium transition-all ${
              activeMenu === 'settings'
                ? 'bg-blue-50 text-blue-700 shadow-sm border border-blue-100'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
            title={isCollapsed ? 'Pengaturan' : ''}
          >
            <Settings className={`${isCollapsed ? '' : 'mr-3'} w-5 h-5 ${activeMenu === 'settings' ? 'text-blue-600' : 'text-slate-400'}`} />
            {!isCollapsed && 'Pengaturan'}
          </button>
          <button 
            onClick={onLogout}
            className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'px-4'} py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all`}
            title={isCollapsed ? 'Keluar' : ''}
          >
            <LogOut className={`${isCollapsed ? '' : 'mr-3'} w-5 h-5 text-red-400`} />
            {!isCollapsed && 'Keluar'}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden transition-all duration-300 ease-in-out bg-white">
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
