import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ChevronLeft, Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { Logo } from './Logo';
import { supabase } from '../lib/supabase';

interface LauncherProps {
  onLogin: (role: 'doctor' | 'admin', email: string, fullName: string, plan: 'subscription' | 'enterprise' | null, trialDaysLeft: number | null) => void;
}

export default function Launcher({ onLogin }: LauncherProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const { data: profile } = await supabase
        .from('doctor_accounts')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('*, product_plans(*), products(*)')
        .eq('doctor_id', profile?.id)
        .in('status', ['active', 'trial'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      const plan: 'subscription' | 'enterprise' | null = subscription?.status === 'active' ? 'subscription' :
                   subscription?.status === 'trial' ? 'subscription' : null;

      let trialDaysLeft: number | null = null;
      if (subscription?.status === 'trial' && subscription?.current_period_end) {
        const end = new Date(subscription.current_period_end);
        const now = new Date();
        trialDaysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      }

      onLogin('doctor', data.user.email ?? '', profile?.full_name ?? data.user.email ?? '', plan, trialDaysLeft);

    } catch (err: any) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email atau password salah. Periksa kembali.'
        : 'Koneksi gagal. Periksa internet dan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');

    try {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: 'https://aexon.id/reset-password'
      });
      if (resetErr) throw resetErr;
      setResetSent(true);
    } catch (err: any) {
      setResetError(err.message || 'Gagal mengirim link reset. Coba lagi.');
    } finally {
      setResetLoading(false);
    }
  };

  if (showForgotPassword) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 relative overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-slate-50" />
          <motion.div
            animate={{ scale: [1, 1.2, 1], x: [0, 100, 0], y: [0, 50, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-teal-400/10 rounded-full blur-[120px]"
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[420px] w-full relative z-10"
        >
          <div className="bg-white rounded-3xl shadow-2xl p-10">
            <button
              onClick={() => { setShowForgotPassword(false); setResetSent(false); setResetError(''); }}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors mb-6"
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali ke Login
            </button>

            {resetSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8 text-[#0D9488]" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Link reset password telah dikirim!</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Periksa inbox email kamu. Link berlaku selama 1 jam.
                </p>
                <button
                  onClick={() => { setShowForgotPassword(false); setResetSent(false); }}
                  className="w-full py-3 bg-[#0D9488] text-white font-bold rounded-xl hover:bg-[#0D9488]/90 transition-colors text-sm"
                >
                  Kembali ke Login
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Reset Password</h2>
                <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                  Masukkan email terdaftar. Kami akan mengirimkan link untuk membuat password baru.
                </p>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-gray-400" />
                    </div>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all text-sm"
                      placeholder="Email terdaftar"
                      required
                    />
                  </div>

                  {resetError && (
                    <div className="flex items-center gap-2 text-red-600 text-xs">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {resetError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="w-full py-3 bg-[#0D9488] text-white font-bold rounded-xl hover:bg-[#0D9488]/90 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {resetLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : null}
                    Kirim Link Reset
                  </button>
                </form>
              </>
            )}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 relative overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-slate-50" />
        <motion.div
          animate={{ scale: [1, 1.2, 1], x: [0, 100, 0], y: [0, 50, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-teal-400/10 rounded-full blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.3, 1], x: [0, -100, 0], y: [0, -50, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
          className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-indigo-400/10 rounded-full blur-[120px]"
        />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-[420px] w-full relative z-10"
      >
        <div className="bg-white rounded-3xl shadow-2xl p-10">
          <div className="flex flex-col items-center mb-8">
            <div className="relative mb-5">
              <div className="absolute inset-0 bg-[#0D9488] blur-3xl opacity-10 animate-pulse" />
              <Logo mSize={80} wSize={40} className="relative z-10" showPattern />
            </div>
            <div className="flex flex-col items-center text-center">
              <div className="px-3 py-1 bg-teal-50 border border-teal-100 rounded-full mb-3">
                <span className="text-[10px] font-bold text-[#0D9488] uppercase tracking-[0.2em]">v2.5.0</span>
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-2">
                Selamat Datang
              </h2>
              <p className="text-gray-500 text-sm font-medium">
                Masuk ke sistem manajemen endoskopi
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 ml-1">Email</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all text-sm disabled:opacity-50"
                  placeholder="Email terdaftar"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-500 ml-1">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="block w-full pl-11 pr-11 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0D9488]/20 focus:border-[#0D9488] transition-all text-sm disabled:opacity-50"
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl p-3"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#0D9488] text-white font-bold rounded-xl hover:bg-[#0D9488]/90 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Masuk...
                </>
              ) : (
                'Masuk'
              )}
            </button>

            <div className="text-right">
              <button
                type="button"
                onClick={() => { setShowForgotPassword(true); setResetEmail(email); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Lupa password?
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-1">
            <p className="text-xs text-gray-400">
              Belum punya akun? Daftar di{' '}
              <a href="https://aexon.id" target="_blank" rel="noopener noreferrer" className="text-[#0D9488] font-medium hover:underline">
                aexon.id
              </a>
            </p>
            <p className="text-[10px] text-gray-300">
              &copy; 2026 PT Aexon Inovasi Teknologi
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
