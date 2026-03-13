import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Lock, User, KeyRound, Building2, ShieldCheck, ArrowRight, Globe, Mail, Eye, EyeOff } from 'lucide-react';
import { Logo, Pattern } from './Logo';

// Custom Google Icon
const GoogleIcon = () => (
  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
    />
    <path
      fill="currentColor"
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
    />
    <path
      fill="currentColor"
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
    />
    <path
      fill="currentColor"
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
    />
  </svg>
);

interface LauncherProps {
  onLogin: (role: 'doctor' | 'admin', username: string, fullName?: string) => void;
}

export default function Launcher({ onLogin }: LauncherProps) {
  const [loginMode, setLoginMode] = useState<'standard' | 'enterprise'>('standard');
  const [ssoRole, setSsoRole] = useState<'doctor' | 'admin'>('doctor');
  const [isRegistering, setIsRegistering] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [enterpriseId, setEnterpriseId] = useState('');
  const [strNumber, setStrNumber] = useState('');
  const [sipNumber, setSipNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    // Simulate authentication
    setTimeout(() => {
      if (isRegistering) {
        if (username && password && strNumber && sipNumber && fullName) {
          onLogin('doctor', username, fullName);
        } else {
          setError('Semua data wajib diisi untuk pendaftaran.');
          setIsLoading(false);
        }
        return;
      }

      if (loginMode === 'standard') {
        if (username && password) {
          onLogin('doctor', username);
        } else {
          setError('Username dan Password wajib diisi.');
          setIsLoading(false);
        }
      } else {
        const isDoctorSSO = ssoRole === 'doctor';
        if (isDoctorSSO) {
          if (username && password) {
            onLogin('doctor', username);
          } else {
            setError('ID Dokter dan Password wajib diisi.');
            setIsLoading(false);
          }
        } else {
          if (enterpriseId && username && password) {
            onLogin('admin', username);
          } else {
            setError('Enterprise ID, Username, dan Password wajib diisi.');
            setIsLoading(false);
          }
        }
      }
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 font-sans text-slate-900 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-slate-50" />
        <Pattern className="text-blue-500 opacity-[0.03]" />
        
        {/* Animated Blobs */}
        <motion.div 
          animate={{ 
            scale: [1, 1.2, 1],
            x: [0, 100, 0],
            y: [0, 50, 0]
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-blue-400/10 rounded-full blur-[120px]" 
        />
        <motion.div 
          animate={{ 
            scale: [1, 1.3, 1],
            x: [0, -100, 0],
            y: [0, -50, 0]
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-indigo-400/10 rounded-full blur-[120px]" 
        />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-xl w-full relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-3xl border border-white rounded-[3rem] p-12 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] relative overflow-hidden">
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-400" />
          
          <div className="flex flex-col items-center mb-12">
            <div className="relative mb-8">
              <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-10 animate-pulse" />
              <Logo mSize={100} wSize={50} className="relative z-10" showPattern />
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="px-4 py-1.5 bg-blue-50 border border-blue-100 rounded-full mb-4">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Aexon Pro V2.5</span>
              </div>
              <h2 className="text-4xl font-black tracking-tighter text-slate-900 mb-3">
                {isRegistering ? 'Daftar Akun' : 'Selamat Datang'}
              </h2>
              <p className="text-slate-500 text-sm font-medium max-w-[400px]">
                {isRegistering ? 'Lengkapi data medis profesional Anda' : 'Masuk ke sistem manajemen endoskopi terintegrasi'}
              </p>
            </div>
          </div>

          {/* Mode Switcher */}
          {!isRegistering && (
            <div className="space-y-6 mb-10">
              <div className="flex p-2 bg-slate-50 rounded-2xl border border-slate-100">
                <button
                  onClick={() => setLoginMode('standard')}
                  className={`flex-1 flex items-center justify-center py-4 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    loginMode === 'standard' 
                    ? 'bg-white text-slate-900 shadow-xl scale-[1.02] border border-slate-100' 
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <User className="w-4 h-4 mr-2" />
                  Pribadi
                </button>
                <button
                  onClick={() => setLoginMode('enterprise')}
                  className={`flex-1 flex items-center justify-center py-4 px-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    loginMode === 'enterprise' 
                    ? 'bg-white text-slate-900 shadow-xl scale-[1.02] border border-slate-100' 
                    : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Institusi
                </button>
              </div>

              {loginMode === 'enterprise' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="grid grid-cols-2 gap-4"
                >
                  <button
                    type="button"
                    onClick={() => setSsoRole('doctor')}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all gap-2 ${
                      ssoRole === 'doctor' 
                      ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-lg' 
                      : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    <User className={`w-6 h-6 ${ssoRole === 'doctor' ? 'text-blue-600' : 'text-slate-300'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Dokter</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSsoRole('admin')}
                    className={`flex flex-col items-center justify-center p-5 rounded-2xl border-2 transition-all gap-2 ${
                      ssoRole === 'admin' 
                      ? 'bg-blue-50 border-blue-500 text-blue-600 shadow-lg' 
                      : 'bg-slate-50 border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    <ShieldCheck className={`w-6 h-6 ${ssoRole === 'admin' ? 'text-blue-600' : 'text-slate-300'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Admin</span>
                  </button>
                </motion.div>
              )}
            </div>
          )}

          <AnimatePresence mode="wait">
            <motion.form 
              key={isRegistering ? 'register' : loginMode}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleLogin} 
              className="space-y-6"
            >
              {loginMode === 'enterprise' && ssoRole === 'admin' && !isRegistering && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Enterprise ID</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <Globe className="h-4 w-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={enterpriseId}
                      onChange={(e) => setEnterpriseId(e.target.value)}
                      className="block w-full pl-14 pr-5 py-4 border border-slate-100 rounded-2xl bg-slate-50 text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                      placeholder="RS-JAKARTA-01"
                    />
                  </div>
                </div>
              )}

              {isRegistering && (
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Nama Lengkap & Gelar</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                      <User className="h-4 w-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                    </div>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="block w-full pl-14 pr-5 py-4 border border-slate-100 rounded-2xl bg-slate-50 text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                      placeholder="Dr. Budi Santoso, Sp.PD"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
                  {isRegistering ? 'Username' : (loginMode === 'standard' ? 'ID Dokter / Username' : (ssoRole === 'admin' ? 'Admin Username' : 'ID Dokter Institusi'))}
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="block w-full pl-14 pr-5 py-4 border border-slate-100 rounded-2xl bg-slate-50 text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                    placeholder={isRegistering ? "username_baru" : (loginMode === 'standard' ? "budi.santoso" : (ssoRole === 'admin' ? "admin.rsup" : "dr.budi.sso"))}
                  />
                </div>
              </div>

              {isRegistering && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">No. STR</label>
                    <input
                      type="text"
                      value={strNumber}
                      onChange={(e) => setStrNumber(e.target.value)}
                      className="block w-full px-5 py-4 border border-slate-100 rounded-2xl bg-slate-50 text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                      placeholder="16 Digit"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">No. SIP</label>
                    <input
                      type="text"
                      value={sipNumber}
                      onChange={(e) => setSipNumber(e.target.value)}
                      className="block w-full px-5 py-4 border border-slate-100 rounded-2xl bg-slate-50 text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                      placeholder="SIP/2026/..."
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Password</label>
                  {!isRegistering && (
                    <button 
                      type="button" 
                      onClick={() => alert('Fitur reset password telah dikirim ke email terdaftar.')}
                      className="text-[9px] font-black text-blue-600 hover:text-blue-500 transition-colors uppercase tracking-widest"
                    >
                      Lupa?
                    </button>
                  )}
                </div>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
                    <KeyRound className="h-4 w-4 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-14 pr-14 py-4 border border-slate-100 rounded-2xl bg-slate-50 text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-5 flex items-center text-slate-300 hover:text-blue-500 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-red-50 border border-red-100 text-red-600 text-[10px] font-black p-4 rounded-2xl text-center uppercase tracking-widest"
                >
                  {error}
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={isLoading}
                className="w-full relative group overflow-hidden flex justify-center items-center py-5 px-6 rounded-[1.5rem] shadow-xl shadow-blue-500/20 text-[11px] font-black text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 uppercase tracking-[0.2em] mt-8"
              >
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative flex items-center">
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {isRegistering ? 'Daftar Sekarang' : 'Masuk ke Sistem'}
                      <ArrowRight className="w-4 h-4 ml-3 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </motion.button>

              {!isRegistering && loginMode === 'standard' && (
                <div className="space-y-6">
                  <div className="relative flex items-center">
                    <div className="flex-grow border-t border-slate-100"></div>
                    <span className="flex-shrink mx-4 text-[9px] font-black text-slate-300 uppercase tracking-[0.3em]">Atau</span>
                    <div className="flex-grow border-t border-slate-100"></div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onLogin('doctor', 'google_user')}
                    className="w-full flex items-center justify-center py-4 px-6 bg-white border border-slate-100 rounded-2xl text-[10px] font-black text-slate-600 hover:bg-slate-50 transition-all active:scale-[0.98] uppercase tracking-widest"
                  >
                    <GoogleIcon />
                    Google Account
                  </button>
                </div>
              )}

              <div className="text-center pt-4">
                <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="text-[10px] font-black text-blue-600 hover:text-blue-500 transition-colors uppercase tracking-[0.2em]"
                >
                  {isRegistering ? 'Sudah punya akun? Masuk' : 'Belum punya akun? Daftar'}
                </button>
              </div>
            </motion.form>
          </AnimatePresence>

          <div className="mt-12 pt-8 border-t border-slate-100 text-center">
            <p className="text-[9px] font-black text-slate-300 uppercase tracking-[0.2em]">
              © 2026 PT Aexon Inovasi Teknologi
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
