import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  CreditCard,
  Shield,
  Save,
  Upload,
  AlertCircle,
  Database,
  Key,
  CheckCircle2,
  CheckCircle,
  Lock,
  Download,
  RefreshCw,
  HardDrive,
  AlertTriangle,
  Loader2,
  X,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserProfile, HospitalSettings, Session } from '../types';
import { useToast } from './ToastProvider';
import ConfirmModal from './ConfirmModal';
import { saveUserData, loadUserData, getLocalStorageUsage } from '../lib/storage';
import { supabase } from '../lib/supabase';

interface SettingsProps {
  userProfile: UserProfile;
  hospitalSettingsList: HospitalSettings[];
  onUpdateUser: (profile: UserProfile) => void;
  onUpdateHospitalList: (settings: HospitalSettings[]) => void;
  onUpdateSessions: (sessions: Session[]) => void;
  onCancelSubscription: () => void;
  plan: 'subscription' | 'enterprise' | null;
  sessions: Session[];
}

interface RestoreConflict {
  backupSession: Session;
  existingSession: Session;
}

type ConflictAction = 'skip' | 'overwrite';

export default function Settings({ userProfile, hospitalSettingsList, onUpdateUser, onUpdateHospitalList, onUpdateSessions, onCancelSubscription, plan, sessions }: SettingsProps) {
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'profil' | 'keamanan' | 'langganan' | 'backup'>('profil');

  const [profileForm, setProfileForm] = useState<UserProfile>(userProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [backupDateFrom, setBackupDateFrom] = useState('');
  const [backupDateTo, setBackupDateTo] = useState('');
  const [restoreConflicts, setRestoreConflicts] = useState<RestoreConflict[]>([]);
  const [restoreNewSessions, setRestoreNewSessions] = useState<Session[]>([]);
  const [currentConflictIdx, setCurrentConflictIdx] = useState(0);
  const [conflictResults, setConflictResults] = useState<Map<string, ConflictAction>>(new Map());
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);

  const isAdmin = userProfile.role === 'admin';
  const isEnterprise = plan === 'enterprise';
  const isDokterInstitusi = !isAdmin && isEnterprise;

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);

    try {
      if (profileForm.name !== userProfile.name) {
        const now = new Date();
        if (userProfile.lastNameChangeDate) {
          const lastChange = new Date(userProfile.lastNameChangeDate);
          const diffDays = Math.ceil(Math.abs(now.getTime() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays < 7) {
            showToast(`Perubahan nama hanya dapat dilakukan sekali setiap 7 hari. Sisa waktu: ${7 - diffDays} hari.`, 'warning', 6000);
            setProfileSaving(false);
            return;
          }
        }
        profileForm.lastNameChangeDate = now.toISOString();
      }

      const { data: { user } } = await supabase.auth.getUser();
      const authId = user?.id;

      if (authId) {
        const { error } = await supabase
          .from('doctor_accounts')
          .update({
            full_name: profileForm.name,
            specialization: profileForm.specialization,
            str_number: profileForm.strNumber || null,
            sip_number: profileForm.sipNumber || null,
            phone: profileForm.phone,
          })
          .eq('user_id', authId);

        if (error) {
          onUpdateUser(profileForm);
          showToast('Gagal menyimpan ke server. Perubahan disimpan lokal saja.', 'warning');
          setProfileSaving(false);
          return;
        }
      }

      onUpdateUser(profileForm);
      setIsSaved(true);
      showToast('Profil berhasil disimpan.', 'success');
      setTimeout(() => setIsSaved(false), 3000);
    } catch {
      onUpdateUser(profileForm);
      showToast('Profil disimpan lokal (server tidak tersedia).', 'warning');
    }
    setProfileSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password minimal 6 karakter.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok.', 'warning');
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showToast(error.message || 'Gagal mengubah password.', 'error');
      } else {
        showToast('Password berhasil diubah.', 'success');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      showToast('Gagal terhubung ke server.', 'error');
    }
    setPasswordSaving(false);
  };

  const handleExportBackup = async () => {
    let filteredSessions = sessions;

    if (backupDateFrom || backupDateTo) {
      filteredSessions = sessions.filter(s => {
        const sessionDate = new Date(s.date).getTime();
        const from = backupDateFrom ? new Date(backupDateFrom).getTime() : 0;
        const to = backupDateTo ? new Date(backupDateTo).setHours(23, 59, 59, 999) : Infinity;
        return sessionDate >= from && sessionDate <= to;
      });
    }

    if (filteredSessions.length === 0) {
      showToast('Tidak ada sesi dalam rentang tanggal yang dipilih.', 'warning');
      return;
    }

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const dateStr = new Date().toISOString().slice(0, 10);
    const folderName = `Aexon_Backup_${userProfile.id}_${dateStr}`;
    const folder = zip.folder(folderName)!;

    folder.file('sessions.json', JSON.stringify(filteredSessions, null, 2));
    folder.file('manifest.json', JSON.stringify({
      userId: userProfile.id,
      exportDate: new Date().toISOString(),
      appVersion: '2.5.0',
      sessionCount: filteredSessions.length,
      note: 'Foto dan video tidak termasuk backup, tersimpan lokal di perangkat'
    }, null, 2));

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Aexon_Backup_${userProfile.id}_${dateStr}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(`Backup ${filteredSessions.length} sesi berhasil diunduh.`, 'success');
  };

  const handleImportBackup = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.zip';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setRestoreLoading(true);

      try {
        const JSZip = (await import('jszip')).default;
        const zip = await JSZip.loadAsync(file);

        let manifestFile: any = null;
        let sessionsFile: any = null;
        zip.forEach((path, entry) => {
          if (path.endsWith('manifest.json')) manifestFile = entry;
          if (path.endsWith('sessions.json')) sessionsFile = entry;
        });

        if (!manifestFile || !sessionsFile) {
          showToast('Format file backup tidak valid. File manifest.json atau sessions.json tidak ditemukan.', 'error');
          setRestoreLoading(false);
          return;
        }

        const manifestText = await manifestFile.async('text');
        const manifest = JSON.parse(manifestText);

        if (manifest.userId !== userProfile.id) {
          setShowMismatchModal(true);
          setRestoreLoading(false);
          return;
        }

        const sessionsText = await sessionsFile.async('text');
        const backupSessions: Session[] = JSON.parse(sessionsText);

        if (!Array.isArray(backupSessions) || backupSessions.length === 0) {
          showToast('File backup tidak berisi data sesi.', 'error');
          setRestoreLoading(false);
          return;
        }

        const existingIds = new Set(sessions.map(s => s.id));
        const newSessions: Session[] = [];
        const conflicts: RestoreConflict[] = [];

        for (const bs of backupSessions) {
          if (existingIds.has(bs.id)) {
            const existing = sessions.find(s => s.id === bs.id)!;
            conflicts.push({ backupSession: bs, existingSession: existing });
          } else {
            newSessions.push(bs);
          }
        }

        setRestoreNewSessions(newSessions);

        if (conflicts.length > 0) {
          setRestoreConflicts(conflicts);
          setCurrentConflictIdx(0);
          setConflictResults(new Map());
          setApplyToAll(false);
          setShowConflictModal(true);
        } else {
          finalizeRestore(newSessions, new Map());
        }
      } catch {
        showToast('Gagal membaca file backup. File mungkin rusak.', 'error');
      }
      setRestoreLoading(false);
    };
    input.click();
  };

  const handleConflictAction = (action: ConflictAction) => {
    const conflict = restoreConflicts[currentConflictIdx];
    const newResults = new Map(conflictResults);

    if (applyToAll) {
      for (let i = currentConflictIdx; i < restoreConflicts.length; i++) {
        newResults.set(restoreConflicts[i].backupSession.id, action);
      }
      setConflictResults(newResults);
      setShowConflictModal(false);
      finalizeRestore(restoreNewSessions, newResults);
    } else {
      newResults.set(conflict.backupSession.id, action);
      setConflictResults(newResults);

      if (currentConflictIdx < restoreConflicts.length - 1) {
        setCurrentConflictIdx(currentConflictIdx + 1);
      } else {
        setShowConflictModal(false);
        finalizeRestore(restoreNewSessions, newResults);
      }
    }
  };

  const finalizeRestore = (newSessions: Session[], results: Map<string, ConflictAction>) => {
    let merged = [...sessions];
    let added = newSessions.length;
    let skipped = 0;
    let overwritten = 0;

    merged = [...merged, ...newSessions];

    for (const conflict of restoreConflicts) {
      const action = results.get(conflict.backupSession.id);
      if (action === 'overwrite') {
        merged = merged.map(s => s.id === conflict.backupSession.id ? conflict.backupSession : s);
        overwritten++;
      } else {
        skipped++;
      }
    }

    onUpdateSessions(merged);
    saveUserData(userProfile.id, 'sessions', merged);

    const parts: string[] = [];
    if (added > 0) parts.push(`${added} ditambahkan`);
    if (skipped > 0) parts.push(`${skipped} dilewati`);
    if (overwritten > 0) parts.push(`${overwritten} ditimpa`);
    showToast(`Restore selesai: ${parts.join(', ')}.`, 'success', 5000);

    setRestoreConflicts([]);
    setRestoreNewSessions([]);
    setConflictResults(new Map());
  };

  const handleClearLocalData = () => {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith(`aexon_`) && k.endsWith(`_${userProfile.id}`)) {
        localStorage.removeItem(k);
      }
    }
    setShowClearDataModal(false);
    showToast('Semua data lokal berhasil dihapus. Halaman akan dimuat ulang.', 'warning', 3000);
    setTimeout(() => window.location.reload(), 2000);
  };

  const getInitials = (name: string) =>
    name.split(' ').filter(n => !n.startsWith('Dr.')).map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const tabs: { id: typeof activeTab; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'keamanan', label: 'Keamanan', icon: Shield },
    ...(!isDokterInstitusi ? [{ id: 'langganan' as const, label: 'Langganan', icon: CreditCard }] : []),
    { id: 'backup', label: 'Backup', icon: HardDrive },
  ];

  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto w-full font-sans text-slate-900 overflow-y-auto h-full custom-scrollbar">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Pengaturan</h2>
        <p className="text-slate-500 text-sm">Kelola profil, keamanan, dan preferensi akun Anda.</p>
      </div>

      <div className="flex gap-2 mb-8 border-b border-slate-100 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold transition-all border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-[#0C1E35] text-[#0C1E35]'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {isSaved && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="fixed top-6 right-6 bg-emerald-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center shadow-lg z-50"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            Perubahan Berhasil Disimpan
          </motion.div>
        )}
      </AnimatePresence>

      {activeTab === 'profil' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-8">
            <div className="flex items-center gap-5 mb-8">
              <div className="w-20 h-20 rounded-2xl bg-[#0C1E35] flex items-center justify-center">
                <span className="text-white font-black text-xl">{getInitials(profileForm.name)}</span>
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900">{profileForm.name}</h3>
                <p className="text-sm text-slate-500">{profileForm.specialization}</p>
              </div>
            </div>

            <div className="h-px bg-slate-100 mb-8" />

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm font-medium"
                  />
                  <p className="text-[10px] text-slate-400 ml-1 italic">Dapat diubah sekali setiap 7 hari.</p>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    readOnly
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed text-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Spesialisasi</label>
                  <input
                    type="text"
                    name="specialization"
                    value={profileForm.specialization}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nomor WhatsApp</label>
                  <input
                    type="tel"
                    name="phone"
                    value={profileForm.phone}
                    onChange={handleProfileChange}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">No. STR (Surat Tanda Registrasi)</label>
                  <input
                    type="text"
                    name="strNumber"
                    value={profileForm.strNumber || ''}
                    onChange={handleProfileChange}
                    placeholder="16 digit nomor STR"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm font-medium placeholder:text-slate-300"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">No. SIP (Surat Izin Praktik)</label>
                  <input
                    type="text"
                    name="sipNumber"
                    value={profileForm.sipNumber || ''}
                    onChange={handleProfileChange}
                    placeholder="Nomor SIP aktif"
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm font-medium placeholder:text-slate-300"
                  />
                </div>
              </div>
              <div className="pt-4 flex justify-end">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={profileSaving}
                  className="flex items-center gap-2 px-6 py-3 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white font-bold rounded-xl transition-all disabled:opacity-50"
                >
                  {profileSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {profileSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {activeTab === 'keamanan' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                <Key className="w-5 h-5 text-[#0C1E35]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Ganti Password</h3>
                <p className="text-sm text-slate-500">Perbarui password akun Anda.</p>
              </div>
            </div>

            <div className="h-px bg-slate-100 mb-6" />

            <form onSubmit={handleChangePassword} className="max-w-md space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password Baru</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm"
                  />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Konfirmasi Password Baru</label>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm"
                  />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={passwordSaving}
                className="flex items-center gap-2 px-6 py-3 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
                {passwordSaving ? 'Mengubah...' : 'Update Password'}
              </motion.button>
            </form>
          </div>

          <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-8">
            <h3 className="text-lg font-black text-slate-900 mb-6">Manajemen Data</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-5 bg-amber-50 rounded-xl border border-amber-100">
                <div className="flex items-center gap-3">
                  <Database className="w-5 h-5 text-amber-600" />
                  <div>
                    <h4 className="text-sm font-bold text-amber-900">Hapus Data Lokal</h4>
                    <p className="text-xs text-amber-700/70">Hapus semua riwayat sesi di browser ini.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClearDataModal(true)}
                  className="px-5 py-2 bg-white text-amber-600 font-bold rounded-xl hover:bg-amber-100 transition-colors border border-amber-200 text-sm"
                >
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {activeTab === 'langganan' && !isDokterInstitusi && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          {isAdmin ? (
            <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Paket Enterprise</h3>
                  <p className="text-sm text-slate-500">Kelola paket enterprise institusi Anda.</p>
                </div>
              </div>

              <div className="h-px bg-slate-100 mb-6" />

              <div className="p-6 bg-[#0C1E35] rounded-2xl text-white mb-6">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest block mb-1">Paket Aktif</span>
                    <h4 className="text-2xl font-black">Enterprise Access</h4>
                  </div>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 text-xs font-bold rounded-full">Aktif</span>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Jumlah Seat</p>
                    <p className="text-lg font-black">10 Dokter</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Berlaku Hingga</p>
                    <p className="text-lg font-black">12 Des 2026</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Admin</p>
                    <p className="text-lg font-black">{userProfile.name}</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => showToast('Hubungi tim sales Aexon untuk perpanjangan enterprise.', 'info')}
                className="px-6 py-3 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white font-bold rounded-xl transition-all text-sm"
              >
                Perpanjang Enterprise
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-[#0C1E35]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900">Langganan & Pembayaran</h3>
                  <p className="text-sm text-slate-500">Kelola paket aktif dan riwayat transaksi.</p>
                </div>
              </div>

              <div className="h-px bg-slate-100 mb-6" />

              <div className="p-6 bg-[#0C1E35] rounded-2xl text-white mb-8">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <span className="text-[10px] font-bold text-blue-300 uppercase tracking-widest block mb-1">Paket Saat Ini</span>
                    <h4 className="text-2xl font-black">
                      {plan === 'subscription' ? 'Annual Subscription' : 'Trial Period'}
                    </h4>
                  </div>
                  <span className={`px-3 py-1 text-xs font-bold rounded-full ${
                    plan === 'subscription' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-yellow-500/20 text-yellow-300'
                  }`}>
                    {plan === 'subscription' ? 'Aktif' : 'Trial'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Terdaftar</p>
                    <p className="text-sm font-bold">12 Des 2025</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Metode Bayar</p>
                    <p className="text-sm font-bold">•••• 4242</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Tagihan Berikutnya</p>
                    <p className="text-sm font-bold">12 Des 2026</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total</p>
                    <p className="text-sm font-bold">Rp 5.999.000</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => showToast('Mengarahkan ke halaman pembayaran...', 'info')}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-all border border-white/10"
                  >
                    Update Pembayaran
                  </button>
                  <button
                    onClick={onCancelSubscription}
                    className="px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 text-xs font-bold rounded-xl transition-all border border-red-400/20"
                  >
                    Batalkan Langganan
                  </button>
                </div>
              </div>

              <div className="mb-2">
                <h4 className="text-sm font-bold text-slate-900 mb-4">Riwayat Transaksi</h4>
                <div className="rounded-xl border border-slate-100 overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tanggal</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Deskripsi</th>
                        <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Jumlah</th>
                        <th className="px-5 py-3 text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {[
                        { date: '12 Des 2025', desc: 'Annual Subscription', amount: 'Rp 5.999.000', status: 'Selesai' },
                        { date: '12 Des 2024', desc: 'Annual Subscription', amount: 'Rp 5.999.000', status: 'Selesai' },
                      ].map((t, i) => (
                        <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3 font-medium text-slate-600">{t.date}</td>
                          <td className="px-5 py-3 font-bold text-slate-900">{t.desc}</td>
                          <td className="px-5 py-3 font-bold text-slate-900">{t.amount}</td>
                          <td className="px-5 py-3 text-right">
                            <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded-full">
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {(plan === null || plan === 'subscription') && (
                <div className="mt-6 p-5 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-bold text-[#0C1E35]">Perpanjang Langganan</h4>
                    <p className="text-xs text-slate-500 mt-0.5">Jangan sampai akses Anda terputus.</p>
                  </div>
                  <button
                    onClick={() => showToast('Mengarahkan ke halaman perpanjangan...', 'info')}
                    className="px-5 py-2.5 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Perpanjang Sekarang
                  </button>
                </div>
              )}
            </div>
          )}
        </motion.div>
      )}

      {activeTab === 'backup' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Download className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Ekspor Backup</h3>
                <p className="text-sm text-slate-500">Unduh data sesi dalam format ZIP.</p>
              </div>
            </div>

            <div className="h-px bg-slate-100 mb-6" />

            <p className="text-xs text-slate-500 mb-5 leading-relaxed">
              File backup berisi semua data sesi. Foto dan video tidak termasuk dalam backup. Anda dapat memfilter berdasarkan rentang tanggal.
            </p>

            <div className="grid grid-cols-2 gap-4 mb-5">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={backupDateFrom}
                  onChange={(e) => setBackupDateFrom(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm font-medium"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={backupDateTo}
                  onChange={(e) => setBackupDateTo(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500">
                {sessions.length} sesi tersedia
              </span>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleExportBackup}
                className="flex items-center gap-2 px-5 py-3 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white text-xs font-bold rounded-xl transition-all"
              >
                <Download className="w-4 h-4" />
                Unduh Backup
              </motion.button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <RefreshCw className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Restore dari Backup</h3>
                <p className="text-sm text-slate-500">Impor file backup yang sebelumnya diekspor.</p>
              </div>
            </div>

            <div className="h-px bg-slate-100 mb-6" />

            <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start gap-3 mb-6">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <p className="text-[11px] text-emerald-700 leading-relaxed">
                Restore <strong>menggabungkan</strong> data backup dengan data yang ada. Sesi baru otomatis ditambahkan, sesi duplikat akan dikonfirmasi.
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleImportBackup}
              disabled={restoreLoading}
              className="flex items-center gap-2 px-5 py-3 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white text-xs font-bold rounded-xl transition-all disabled:opacity-50"
            >
              {restoreLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {restoreLoading ? 'Memproses...' : 'Pilih File Backup (.zip)'}
            </motion.button>
          </div>
        </motion.div>
      )}

      <ConfirmModal
        isOpen={showClearDataModal}
        onConfirm={handleClearLocalData}
        onCancel={() => setShowClearDataModal(false)}
        title="Hapus Semua Data Lokal?"
        message="Apakah Anda yakin ingin menghapus semua riwayat sesi lokal Anda? Tindakan ini tidak dapat dibatalkan. Disarankan untuk membuat backup terlebih dahulu."
        confirmText="Ya, Hapus Semua"
        cancelText="Batalkan"
        variant="danger"
      />

      <AnimatePresence>
        {showMismatchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => setShowMismatchModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                </div>
                <h3 className="text-lg font-black text-slate-900">Akun Tidak Cocok</h3>
              </div>
              <p className="text-sm text-slate-600 mb-6">File backup ini milik akun lain. Restore hanya dapat dilakukan menggunakan backup dari akun yang sama.</p>
              <button
                onClick={() => setShowMismatchModal(false)}
                className="w-full py-3 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white rounded-xl text-sm font-bold transition-all"
              >
                Tutup
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConflictModal && restoreConflicts[currentConflictIdx] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Konflik Sesi</h3>
                    <p className="text-xs text-slate-400">{currentConflictIdx + 1} dari {restoreConflicts.length} konflik</p>
                  </div>
                </div>
                <button onClick={() => { setShowConflictModal(false); finalizeRestore(restoreNewSessions, conflictResults); }} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              <p className="text-sm text-slate-600 mb-4">Sesi dengan ID yang sama sudah ada di data lokal:</p>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Data Lokal</p>
                  <p className="text-sm font-bold text-slate-900">{restoreConflicts[currentConflictIdx].existingSession.patient.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(restoreConflicts[currentConflictIdx].existingSession.date).toLocaleDateString('id-ID')}</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                  <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-2">Dari Backup</p>
                  <p className="text-sm font-bold text-slate-900">{restoreConflicts[currentConflictIdx].backupSession.patient.name}</p>
                  <p className="text-xs text-slate-500 mt-1">{new Date(restoreConflicts[currentConflictIdx].backupSession.date).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              <label className="flex items-center gap-2 mb-6 cursor-pointer">
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={e => setApplyToAll(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-[#0C1E35] focus:ring-[#0C1E35]/20"
                />
                <span className="text-xs text-slate-600 font-medium">Terapkan ke semua konflik tersisa</span>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleConflictAction('skip')}
                  className="py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-all"
                >
                  {applyToAll ? 'Lewati Semua' : 'Lewati'}
                </button>
                <button
                  onClick={() => handleConflictAction('overwrite')}
                  className="py-3 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white rounded-xl text-sm font-bold transition-all"
                >
                  {applyToAll ? 'Timpa Semua' : 'Timpa'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
