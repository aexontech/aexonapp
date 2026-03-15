import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, Eye, EyeOff, ChevronLeft, Loader2, AlertCircle, CheckCircle2, User, Building2, MessageCircle } from 'lucide-react';
import { Logo } from './Logo';
import { supabase } from '../lib/supabase';

type LoginType = 'personal' | 'institusi';
type InstitusiRole = 'doctor' | 'admin';
type ViewMode = 'login' | 'forgot' | 'register';

interface LauncherProps {
  onLogin: (role: 'doctor' | 'admin', email: string, fullName: string, plan: 'subscription' | 'enterprise' | null, trialDaysLeft: number | null, enterpriseId?: string) => void;
}

export default function Launcher({ onLogin }: LauncherProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('login');
  const [loginType, setLoginType] = useState<LoginType>('personal');
  const [institusiRole, setInstitusiRole] = useState<InstitusiRole>('doctor');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [resetEmail, setResetEmail] = useState('');
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');

  const [regName, setRegName] = useState('');
  const [regStr, setRegStr] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regSip, setRegSip] = useState('');
  const [regSpecialization, setRegSpecialization] = useState('');
  const [regShowPassword, setRegShowPassword] = useState(false);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');
  const [regSuccess, setRegSuccess] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
      if (authError) throw authError;

      const { data: profile, error: profileError } = await supabase
        .from('doctor_accounts')
        .select('*')
        .eq('user_id', data.user.id)
        .single();

      if (profileError || !profile) {
        setError('Profil dokter tidak ditemukan. Hubungi administrator.');
        setIsLoading(false);
        await supabase.auth.signOut();
        return;
      }

      if (loginType === 'personal' && profile.enterprise_id) {
        setError('Akun ini terdaftar sebagai akun institusi. Pilih tab Institusi.');
        setIsLoading(false);
        return;
      }
      if (loginType === 'institusi' && !profile.enterprise_id) {
        setError('Akun ini bukan akun institusi. Pilih tab Personal.');
        setIsLoading(false);
        return;
      }
      if (loginType === 'institusi' && institusiRole === 'admin' && profile.role !== 'admin') {
        setError('Akun ini adalah Dokter Institusi. Pilih Dokter Institusi.');
        setIsLoading(false);
        return;
      }
      if (loginType === 'institusi' && institusiRole === 'doctor' && profile.role !== 'doctor') {
        setError('Akun ini adalah Admin Institusi. Pilih Admin Institusi.');
        setIsLoading(false);
        return;
      }

      let plan: 'subscription' | 'enterprise' | null = null;
      let trialDaysLeft: number | null = null;

      if (profile.enterprise_id) {
        plan = 'enterprise';
      } else {
        const { data: subscription } = await supabase
          .from('subscriptions')
          .select('*, product_plans(*), products(*)')
          .eq('doctor_id', profile.id)
          .in('status', ['active', 'trial'])
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        if (subscription) {
          plan = 'subscription';
          if (subscription.status === 'trial' && subscription.current_period_end) {
            const end = new Date(subscription.current_period_end);
            const now = new Date();
            trialDaysLeft = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          }
        }
      }

      onLogin(
        profile.role ?? 'doctor',
        data.user.email ?? '',
        profile.full_name ?? data.user.email ?? '',
        plan,
        trialDaysLeft,
        profile.enterprise_id ?? undefined
      );

    } catch (err: any) {
      setError(
        err.message === 'Invalid login credentials'
          ? 'Email atau password salah. Periksa kembali.'
          : err.message ?? 'Koneksi gagal. Periksa internet dan coba lagi.'
      );
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');

    if (!regStr.trim()) {
      setRegError('Nomor STR wajib diisi.');
      setRegLoading(false);
      return;
    }
    if (regPassword.length < 8) {
      setRegError('Password minimal 8 karakter.');
      setRegLoading(false);
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Konfirmasi password tidak cocok.');
      setRegLoading(false);
      return;
    }

    const fullName = regName.trim();

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: {
            full_name: fullName,
            str_number: regStr.trim(),
            sip_number: regSip.trim()
          }
        }
      });
      if (signUpError) {
        if (signUpError.message?.includes('already registered')) {
          throw new Error('Email sudah terdaftar. Gunakan email lain atau login.');
        }
        throw signUpError;
      }

      if (data.user) {
        await supabase.from('doctor_accounts').insert({
          user_id: data.user.id,
          full_name: fullName,
          str_number: regStr.trim(),
          sip_number: regSip.trim() || null,
          role: 'doctor',
          specialization: regSpecialization.trim() || null
        });
      }

      setRegSuccess(true);
    } catch (err: any) {
      setRegError(err.message || 'Pendaftaran gagal. Coba lagi.');
    } finally {
      setRegLoading(false);
    }
  };

  const backgroundElements = (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full bg-slate-50" />
      <motion.div
        animate={{ scale: [1, 1.2, 1], x: [0, 100, 0], y: [0, 50, 0] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute -top-[20%] -left-[10%] w-[70%] h-[70%] bg-[#0C1E35]/5 rounded-full blur-[120px]"
      />
      <motion.div
        animate={{ scale: [1, 1.3, 1], x: [0, -100, 0], y: [0, -50, 0] }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
        className="absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-indigo-400/10 rounded-full blur-[120px]"
      />
    </div>
  );

  const logoHeader = (
    <div className="flex flex-col items-center mb-8">
      <div className="relative mb-5">
        <div className="absolute inset-0 bg-[#0C1E35] blur-3xl opacity-10 animate-pulse" />
        <Logo mSize={80} wSize={40} className="relative z-10" showPattern />
      </div>
      <div className="flex flex-col items-center text-center">
        <div className="px-3 py-1 bg-slate-100 border border-slate-200 rounded-full mb-3">
          <span className="text-[10px] font-bold text-[#0C1E35] uppercase tracking-[0.2em]">Beta</span>
        </div>
        <h2 className="font-aexon text-[28px] tracking-tight text-gray-900 mb-2">
          Masuk ke Aexon
        </h2>
        <p className="text-gray-400 text-sm font-medium">
          Bridging Innovation and Surgery
        </p>
      </div>
    </div>
  );

  if (viewMode === 'forgot') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 relative overflow-hidden">
        {backgroundElements}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[420px] w-full relative z-10"
        >
          <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10">
            <button
              onClick={() => { setViewMode('login'); setResetSent(false); setResetError(''); }}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors mb-6"
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali ke Login
            </button>

            {resetSent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8 text-[#0C1E35]" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Link reset password telah dikirim!</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Periksa inbox email kamu. Link berlaku selama 1 jam.
                </p>
                <button
                  onClick={() => { setViewMode('login'); setResetSent(false); }}
                  className="w-full py-3 bg-[#0C1E35] text-white font-bold rounded-xl hover:bg-[#1a3a5c] transition-colors text-sm"
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
                      className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm"
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
                    className="w-full py-3 bg-[#0C1E35] text-white font-bold rounded-xl hover:bg-[#1a3a5c] transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {resetLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
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

  if (viewMode === 'register') {
    if (loginType === 'institusi') {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 relative overflow-hidden">
          {backgroundElements}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-[420px] w-full relative z-10"
          >
            <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10">
              <button
                onClick={() => setViewMode('login')}
                className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors mb-6"
              >
                <ChevronLeft className="w-4 h-4" />
                Kembali ke Login
              </button>

              <div className="text-center py-4">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-5">
                  <Building2 className="w-8 h-8 text-[#0C1E35]" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-3">Daftar Akun Institusi</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-8">
                  Untuk mendaftarkan institusi Anda (rumah sakit, klinik, atau fasilitas kesehatan), silakan hubungi tim Aexon terlebih dahulu. Kami akan membantu proses onboarding dan memberikan kode institusi untuk akun Anda.
                </p>

                <div className="space-y-3">
                  <a
                    href="https://wa.me/6281234567890"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-[#25D366] text-white font-bold rounded-xl hover:bg-[#25D366]/90 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Hubungi Aexon via WhatsApp
                  </a>
                  <a
                    href="mailto:hello@aexon.id"
                    className="w-full py-3 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    <Mail className="w-4 h-4" />
                    Kirim Email ke Aexon
                  </a>
                </div>

                <p className="text-[11px] text-gray-400 mt-6">
                  Sudah punya kode institusi? Login dengan tab Institusi.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-8 relative overflow-hidden">
        {backgroundElements}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-[420px] w-full relative z-10"
        >
          <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10">
            <button
              onClick={() => { setViewMode('login'); setRegError(''); setRegSuccess(false); }}
              className="flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-gray-800 transition-colors mb-6"
            >
              <ChevronLeft className="w-4 h-4" />
              Kembali ke Login
            </button>

            {regSuccess ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-5">
                  <CheckCircle2 className="w-8 h-8 text-[#0C1E35]" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">Pendaftaran berhasil!</h2>
                <p className="text-sm text-gray-500 leading-relaxed mb-6">
                  Cek email untuk verifikasi.
                </p>
                <button
                  onClick={() => { setViewMode('login'); setRegSuccess(false); }}
                  className="w-full py-3 bg-[#0C1E35] text-white font-bold rounded-xl hover:bg-[#1a3a5c] transition-colors text-sm"
                >
                  Kembali ke Login
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-xl font-bold text-gray-900 mb-1">Daftar Akun Personal</h2>
                <p className="text-sm text-gray-500 mb-6">Buat akun dokter baru</p>

                <form onSubmit={handleRegister} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 ml-1">Nama Lengkap *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        disabled={regLoading}
                        className="block w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm disabled:opacity-50"
                        placeholder="Nama lengkap (tanpa gelar)"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 ml-1">Nomor STR *</label>
                    <input
                      type="text"
                      value={regStr}
                      onChange={(e) => setRegStr(e.target.value)}
                      disabled={regLoading}
                      className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm disabled:opacity-50"
                      placeholder="Nomor Surat Tanda Registrasi"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 ml-1">Email *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Mail className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        disabled={regLoading}
                        className="block w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm disabled:opacity-50"
                        placeholder="Email aktif"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 ml-1">Password *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type={regShowPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        disabled={regLoading}
                        className="block w-full pl-11 pr-11 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm disabled:opacity-50"
                        placeholder="Min. 8 karakter"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setRegShowPassword(!regShowPassword)}
                        className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        {regShowPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 ml-1">Konfirmasi Password *</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <Lock className="h-4 w-4 text-gray-400" />
                      </div>
                      <input
                        type={regShowPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        disabled={regLoading}
                        className="block w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm disabled:opacity-50"
                        placeholder="Ulangi password"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 ml-1">Nomor SIP (opsional)</label>
                    <input
                      type="text"
                      value={regSip}
                      onChange={(e) => setRegSip(e.target.value)}
                      disabled={regLoading}
                      className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm disabled:opacity-50"
                      placeholder="Surat Izin Praktik"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-gray-500 ml-1">Spesialisasi (opsional)</label>
                    <input
                      type="text"
                      value={regSpecialization}
                      onChange={(e) => setRegSpecialization(e.target.value)}
                      disabled={regLoading}
                      className="block w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm disabled:opacity-50"
                      placeholder="Contoh: Gastroenterohepatologi"
                    />
                  </div>

                  {regError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-2 text-red-600 text-xs bg-red-50 border border-red-100 rounded-xl p-3"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{regError}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="w-full py-3 bg-[#0C1E35] text-white font-bold rounded-xl hover:bg-[#1a3a5c] transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-1"
                  >
                    {regLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Daftar
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
      {backgroundElements}

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-[420px] w-full relative z-10"
      >
        <div className="bg-white rounded-3xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] p-10">
          {logoHeader}

          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              onClick={() => { setLoginType('personal'); setError(''); }}
              className={`flex flex-col items-center gap-1 p-4 rounded-2xl border-2 transition-all duration-200 ${
                loginType === 'personal'
                  ? 'bg-[#0C1E35] border-[#0C1E35] text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <User className="w-5 h-5 mb-0.5" />
              <span className="text-sm font-bold">Personal</span>
              <span className={`text-[10px] leading-tight text-center ${loginType === 'personal' ? 'text-white/80' : 'text-gray-400'}`}>
                Dokter spesialis{'\n'}lisensi pribadi
              </span>
            </button>
            <button
              type="button"
              onClick={() => { setLoginType('institusi'); setError(''); }}
              className={`flex flex-col items-center gap-1 p-4 rounded-2xl border-2 transition-all duration-200 ${
                loginType === 'institusi'
                  ? 'bg-[#0C1E35] border-[#0C1E35] text-white'
                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <Building2 className="w-5 h-5 mb-0.5" />
              <span className="text-sm font-bold">Institusi</span>
              <span className={`text-[10px] leading-tight text-center ${loginType === 'institusi' ? 'text-white/80' : 'text-gray-400'}`}>
                Dokter & Admin{'\n'}rumah sakit / klinik
              </span>
            </button>
          </div>

          <AnimatePresence mode="wait">
            {loginType === 'institusi' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden mb-5"
              >
                <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setInstitusiRole('doctor')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      institusiRole === 'doctor'
                        ? 'bg-white text-[#0C1E35] shadow-sm'
                        : 'text-gray-400 hover:text-gray-500'
                    }`}
                  >
                    Dokter Institusi
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstitusiRole('admin')}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
                      institusiRole === 'admin'
                        ? 'bg-white text-[#0C1E35] shadow-sm'
                        : 'text-gray-400 hover:text-gray-500'
                    }`}
                  >
                    Admin Institusi
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
                  className="block w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm disabled:opacity-50"
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
                  className="block w-full pl-11 pr-11 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm disabled:opacity-50"
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
              className="w-full py-3 bg-[#0C1E35] text-white font-bold rounded-xl hover:bg-[#1a3a5c] transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
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
                onClick={() => { setViewMode('forgot'); setResetEmail(email); }}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                Lupa password?
              </button>
            </div>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-1">
            <p className="text-xs text-gray-400">
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => { setViewMode('register'); setRegError(''); setRegSuccess(false); }}
                className="text-[#0C1E35] font-medium hover:underline"
              >
                Daftar Sekarang
              </button>
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
