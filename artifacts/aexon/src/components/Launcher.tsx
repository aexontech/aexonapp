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

  const pageStyle: React.CSSProperties = {
    background: '#F8FAFC',
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    position: 'relative',
    overflow: 'hidden',
  };

  const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 28,
    maxWidth: 440,
    width: '100%',
    padding: 44,
    boxShadow: '0 20px 60px rgba(12,30,53,0.12), 0 8px 24px rgba(12,30,53,0.08)',
    position: 'relative',
    zIndex: 1,
  };

  const inputIconStyle: React.CSSProperties = {
    position: 'absolute',
    left: 14,
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#64748B',
    pointerEvents: 'none',
  };

  const errorBoxStyle: React.CSSProperties = {
    background: '#FEF2F2',
    border: '1px solid #FECACA',
    borderRadius: 12,
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    fontSize: 13,
    color: '#DC2626',
  };

  const backBtnStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    background: 'none',
    border: 'none',
    color: '#64748B',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    marginBottom: 24,
    padding: 0,
  };

  const loginTypeCard = (type: LoginType, icon: React.ReactNode, label: string, subtitle: string) => {
    const selected = loginType === type;
    return (
      <button
        type="button"
        onClick={() => { setLoginType(type); setError(''); }}
        style={{
          borderRadius: 16,
          padding: 16,
          border: '2px solid',
          borderColor: selected ? '#0C1E35' : '#E2E8F0',
          background: selected ? '#0C1E35' : 'white',
          color: selected ? 'white' : '#64748B',
          cursor: 'pointer',
          transition: 'all 200ms',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {icon}
        <span style={{ fontSize: 13, fontWeight: 700 }}>{label}</span>
        <span style={{ fontSize: 11, lineHeight: 1.3, opacity: selected ? 0.8 : 1 }}>{subtitle}</span>
      </button>
    );
  };

  const logoHeader = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
      <Logo mSize={80} wSize={40} showPattern />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: 12 }}>
        <div className="badge-pill" style={{ fontSize: 11, marginTop: 8, marginBottom: 4 }}>
          Beta
        </div>
        <h2 className="font-aexon" style={{ fontSize: 28, textAlign: 'center', color: '#0C1E35', margin: '8px 0 4px' }}>
          Masuk Akun Aexon
        </h2>
        <p style={{ fontSize: 14, color: '#64748B', textAlign: 'center' }}>
          Bridging Innovation and Surgery
        </p>
      </div>
    </div>
  );

  if (viewMode === 'forgot') {
    return (
      <div style={pageStyle}>
        <div className="orb-tr" />
        <div className="orb-bl" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ maxWidth: 440, width: '100%', position: 'relative', zIndex: 1 }}
        >
          <div style={cardStyle}>
            <button
              onClick={() => { setViewMode('login'); setResetSent(false); setResetError(''); }}
              style={backBtnStyle}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
              Kembali ke Login
            </button>

            {resetSent ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ width: 64, height: 64, background: '#EFF6FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle2 style={{ width: 32, height: 32, color: '#0C1E35' }} />
                </div>
                <h2 className="font-aexon" style={{ fontSize: 24, color: '#0C1E35', marginBottom: 8 }}>Link reset password telah dikirim!</h2>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>
                  Periksa inbox email kamu. Link berlaku selama 1 jam.
                </p>
                <button
                  onClick={() => { setViewMode('login'); setResetSent(false); }}
                  className="btn-primary"
                  style={{ width: '100%' }}
                >
                  Kembali ke Login
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-aexon" style={{ fontSize: 24, color: '#0C1E35', marginBottom: 8 }}>Reset Password</h2>
                <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24, lineHeight: 1.6 }}>
                  Masukkan email terdaftar. Kami akan mengirimkan link untuk membuat password baru.
                </p>

                <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={inputIconStyle}>
                      <Mail style={{ width: 16, height: 16 }} />
                    </div>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      className="input-base"
                      style={{ paddingLeft: 44 }}
                      placeholder="Email terdaftar"
                      required
                    />
                  </div>

                  {resetError && (
                    <div style={errorBoxStyle}>
                      <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                      {resetError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="btn-primary"
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {resetLoading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : null}
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
        <div style={pageStyle}>
          <div className="orb-tr" />
          <div className="orb-bl" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ maxWidth: 440, width: '100%', position: 'relative', zIndex: 1 }}
          >
            <div style={cardStyle}>
              <button
                onClick={() => setViewMode('login')}
                style={backBtnStyle}
              >
                <ChevronLeft style={{ width: 16, height: 16 }} />
                Kembali ke Login
              </button>

              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ width: 64, height: 64, background: '#EFF6FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <Building2 style={{ width: 32, height: 32, color: '#0C1E35' }} />
                </div>
                <h2 className="font-aexon" style={{ fontSize: 24, color: '#0C1E35', marginBottom: 12 }}>Daftar Akun Institusi</h2>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 32 }}>
                  Untuk mendaftarkan institusi Anda (rumah sakit, klinik, atau fasilitas kesehatan), silakan hubungi tim Aexon terlebih dahulu. Kami akan membantu proses onboarding dan memberikan kode institusi untuk akun Anda.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <a
                    href="https://wa.me/6281234567890"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      width: '100%', padding: '12px 0', background: '#25D366', color: 'white',
                      fontWeight: 700, borderRadius: 12, fontSize: 14, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none',
                      border: 'none', cursor: 'pointer',
                    }}
                  >
                    <MessageCircle style={{ width: 16, height: 16 }} />
                    Hubungi Aexon via WhatsApp
                  </a>
                  <a
                    href="mailto:hello@aexon.id"
                    style={{
                      width: '100%', padding: '12px 0', background: 'white', color: '#0C1E35',
                      fontWeight: 700, borderRadius: 12, fontSize: 14, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: 8, textDecoration: 'none',
                      border: '2px solid #0C1E35', cursor: 'pointer',
                    }}
                  >
                    <Mail style={{ width: 16, height: 16 }} />
                    Kirim Email ke Aexon
                  </a>
                </div>

                <p style={{ fontSize: 11, color: '#64748B', marginTop: 24 }}>
                  Sudah punya kode institusi? Login dengan tab Institusi.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      );
    }

    return (
      <div style={pageStyle}>
        <div className="orb-tr" />
        <div className="orb-bl" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ maxWidth: 440, width: '100%', position: 'relative', zIndex: 1 }}
        >
          <div style={cardStyle}>
            <button
              onClick={() => { setViewMode('login'); setRegError(''); setRegSuccess(false); }}
              style={backBtnStyle}
            >
              <ChevronLeft style={{ width: 16, height: 16 }} />
              Kembali ke Login
            </button>

            {regSuccess ? (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ width: 64, height: 64, background: '#EFF6FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                  <CheckCircle2 style={{ width: 32, height: 32, color: '#0C1E35' }} />
                </div>
                <h2 className="font-aexon" style={{ fontSize: 24, color: '#0C1E35', marginBottom: 8 }}>Pendaftaran berhasil!</h2>
                <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 24 }}>
                  Cek email untuk verifikasi.
                </p>
                <button
                  onClick={() => { setViewMode('login'); setRegSuccess(false); }}
                  className="btn-primary"
                  style={{ width: '100%' }}
                >
                  Kembali ke Login
                </button>
              </div>
            ) : (
              <>
                <h2 className="font-aexon" style={{ fontSize: 24, color: '#0C1E35', marginBottom: 4 }}>Daftar Akun Personal</h2>
                <p style={{ fontSize: 14, color: '#64748B', marginBottom: 24 }}>Buat akun dokter baru</p>

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Nama Lengkap *</label>
                    <div style={{ position: 'relative' }}>
                      <div style={inputIconStyle}>
                        <User style={{ width: 16, height: 16 }} />
                      </div>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        disabled={regLoading}
                        className="input-base"
                        style={{ paddingLeft: 44, opacity: regLoading ? 0.5 : 1 }}
                        placeholder="Nama lengkap (tanpa gelar)"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Nomor STR *</label>
                    <input
                      type="text"
                      value={regStr}
                      onChange={(e) => setRegStr(e.target.value)}
                      disabled={regLoading}
                      className="input-base"
                      style={{ opacity: regLoading ? 0.5 : 1 }}
                      placeholder="Nomor Surat Tanda Registrasi"
                      required
                    />
                  </div>

                  <div>
                    <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Email *</label>
                    <div style={{ position: 'relative' }}>
                      <div style={inputIconStyle}>
                        <Mail style={{ width: 16, height: 16 }} />
                      </div>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        disabled={regLoading}
                        className="input-base"
                        style={{ paddingLeft: 44, opacity: regLoading ? 0.5 : 1 }}
                        placeholder="Email aktif"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Password *</label>
                    <div style={{ position: 'relative' }}>
                      <div style={inputIconStyle}>
                        <Lock style={{ width: 16, height: 16 }} />
                      </div>
                      <input
                        type={regShowPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        disabled={regLoading}
                        className="input-base"
                        style={{ paddingLeft: 44, paddingRight: 44, opacity: regLoading ? 0.5 : 1 }}
                        placeholder="Min. 8 karakter"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setRegShowPassword(!regShowPassword)}
                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
                      >
                        {regShowPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Konfirmasi Password *</label>
                    <div style={{ position: 'relative' }}>
                      <div style={inputIconStyle}>
                        <Lock style={{ width: 16, height: 16 }} />
                      </div>
                      <input
                        type={regShowPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        disabled={regLoading}
                        className="input-base"
                        style={{ paddingLeft: 44, opacity: regLoading ? 0.5 : 1 }}
                        placeholder="Ulangi password"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Nomor SIP (opsional)</label>
                    <input
                      type="text"
                      value={regSip}
                      onChange={(e) => setRegSip(e.target.value)}
                      disabled={regLoading}
                      className="input-base"
                      style={{ opacity: regLoading ? 0.5 : 1 }}
                      placeholder="Surat Izin Praktik"
                    />
                  </div>

                  <div>
                    <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Spesialisasi (opsional)</label>
                    <input
                      type="text"
                      value={regSpecialization}
                      onChange={(e) => setRegSpecialization(e.target.value)}
                      disabled={regLoading}
                      className="input-base"
                      style={{ opacity: regLoading ? 0.5 : 1 }}
                      placeholder="Contoh: Gastroenterohepatologi"
                    />
                  </div>

                  {regError && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      style={errorBoxStyle}
                    >
                      <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                      <span>{regError}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="btn-primary"
                    style={{ width: '100%', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                  >
                    {regLoading ? <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} /> : null}
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
    <div style={pageStyle}>
      <div className="orb-tr" />
      <div className="orb-bl" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        style={{ maxWidth: 440, width: '100%', position: 'relative', zIndex: 1 }}
      >
        <div style={cardStyle}>
          {logoHeader}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            {loginTypeCard('personal', <User style={{ width: 24, height: 24 }} />, 'Personal', 'Dokter spesialis\nlisensi pribadi')}
            {loginTypeCard('institusi', <Building2 style={{ width: 24, height: 24 }} />, 'Institusi', 'Dokter & Admin\nrumah sakit / klinik')}
          </div>

          <AnimatePresence mode="wait">
            {loginType === 'institusi' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden', marginBottom: 16 }}
              >
                <div style={{ background: '#F1F5F9', borderRadius: 12, padding: 4, display: 'flex', gap: 4 }}>
                  <button
                    type="button"
                    onClick={() => setInstitusiRole('doctor')}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: 'none', cursor: 'pointer',
                      background: institusiRole === 'doctor' ? 'white' : 'transparent',
                      color: institusiRole === 'doctor' ? '#0C1E35' : '#64748B',
                      boxShadow: institusiRole === 'doctor' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    Dokter Institusi
                  </button>
                  <button
                    type="button"
                    onClick={() => setInstitusiRole('admin')}
                    style={{
                      flex: 1, padding: '8px 0', borderRadius: 8, fontSize: 12, fontWeight: 600,
                      border: 'none', cursor: 'pointer',
                      background: institusiRole === 'admin' ? 'white' : 'transparent',
                      color: institusiRole === 'admin' ? '#0C1E35' : '#64748B',
                      boxShadow: institusiRole === 'admin' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                    }}
                  >
                    Admin Institusi
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Email</label>
              <div style={{ position: 'relative' }}>
                <div style={inputIconStyle}>
                  <Mail style={{ width: 16, height: 16 }} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="input-base"
                  style={{ paddingLeft: 44, opacity: isLoading ? 0.5 : 1 }}
                  placeholder="Email terdaftar"
                  required
                />
              </div>
            </div>

            <div>
              <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>Password</label>
              <div style={{ position: 'relative' }}>
                <div style={inputIconStyle}>
                  <Lock style={{ width: 16, height: 16 }} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="input-base"
                  style={{ paddingLeft: 44, paddingRight: 44, opacity: isLoading ? 0.5 : 1 }}
                  placeholder="Password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#64748B', cursor: 'pointer', padding: 0 }}
                >
                  {showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                </button>
              </div>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={errorBoxStyle}
              >
                <AlertCircle style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="btn-primary"
              style={{ width: '100%', marginTop: 8, fontSize: 15, padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {isLoading ? (
                <>
                  <Loader2 style={{ width: 16, height: 16, animation: 'spin 1s linear infinite' }} />
                  Masuk...
                </>
              ) : (
                'Masuk'
              )}
            </button>

            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <button
                type="button"
                onClick={() => { setViewMode('forgot'); setResetEmail(email); }}
                style={{ background: 'none', border: 'none', fontSize: 13, color: '#64748B', cursor: 'pointer', padding: 0 }}
              >
                Lupa password?
              </button>
            </div>
          </form>

          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid #F1F5F9', textAlign: 'center' }}>
            <p style={{ fontSize: 13, color: '#64748B' }}>
              Belum punya akun?{' '}
              <button
                type="button"
                onClick={() => { setViewMode('register'); setRegError(''); setRegSuccess(false); }}
                style={{ background: 'none', border: 'none', color: '#0C1E35', fontWeight: 600, cursor: 'pointer', padding: 0, fontSize: 13 }}
              >
                Daftar Sekarang
              </button>
            </p>
            <p style={{ fontSize: 11, color: '#CBD5E1', marginTop: 8 }}>
              &copy; 2026 PT Aexon Inovasi Teknologi
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
