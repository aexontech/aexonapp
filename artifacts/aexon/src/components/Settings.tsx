import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
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
  EyeOff,
  Info,
  Users,
  FileText,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  CalendarClock,
  ImagePlus,
  MapPin,
  Phone,
  Globe,
  Mail as MailIcon,
  ZoomIn,
  ZoomOut,
  Crop
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { UserProfile, HospitalSettings, Session } from '../types';
import { useToast } from './ToastProvider';
import ConfirmModal from './ConfirmModal';
import { saveUserData, loadUserData, getLocalStorageUsage } from '../lib/storage';
import { supabase } from '../lib/supabase';

async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<string> {
  const image = new Image();
  image.crossOrigin = 'anonymous';
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );
  return canvas.toDataURL('image/png');
}

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
  const [activeTab, setActiveTab] = useState<'profil' | 'keamanan' | 'kop-surat' | 'langganan' | 'backup'>('profil');

  const [profileForm, setProfileForm] = useState<UserProfile>(userProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
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

  const [expandedKopIdx, setExpandedKopIdx] = useState<number | null>(0);
  const [kopSaving, setKopSaving] = useState<number | null>(null);
  const [kopToDelete, setKopToDelete] = useState<number | null>(null);
  const [kopForms, setKopForms] = useState<HospitalSettings[]>(hospitalSettingsList);

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropKopIdx, setCropKopIdx] = useState<number | null>(null);
  const [cropState, setCropState] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const logoInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  useEffect(() => {
    setKopForms(hospitalSettingsList);
  }, [hospitalSettingsList]);

  const isAdmin = userProfile.role === 'admin';
  const isEnterprise = plan === 'enterprise';
  const isDokterInstitusi = !isAdmin && isEnterprise;
  const isPersonal = !isAdmin && !isEnterprise;

  const COOLDOWN_DAYS = 14;

  const getCooldownInfo = (kopId: string) => {
    const key = `aexon_kop_cooldown_${userProfile.id}_${kopId}`;
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return { locked: false, unlockDate: null };
      const { last_changed } = JSON.parse(stored);
      const lastDate = new Date(last_changed);
      const now = new Date();
      const diffMs = now.getTime() - lastDate.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      if (diffDays < COOLDOWN_DAYS) {
        const unlockDate = new Date(lastDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
        return { locked: true, unlockDate };
      }
      return { locked: false, unlockDate: null };
    } catch {
      return { locked: false, unlockDate: null };
    }
  };

  const setCooldown = (kopId: string) => {
    const key = `aexon_kop_cooldown_${userProfile.id}_${kopId}`;
    localStorage.setItem(key, JSON.stringify({ last_changed: new Date().toISOString() }));
  };

  const handleKopFieldChange = (idx: number, field: string, value: string) => {
    setKopForms(prev => prev.map((k, i) => i === idx ? { ...k, [field]: value } : k));
  };

  const handleLogoFileSelect = (idx: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      showToast('Format file harus .jpg atau .png', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast('Ukuran file maksimal 5 MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropKopIdx(idx);
      setCropState({ x: 0, y: 0 });
      setCropZoom(1);
      setCroppedAreaPixels(null);
      setCropModalOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCropConfirm = async () => {
    if (!cropImageSrc || croppedAreaPixels === null || cropKopIdx === null) return;
    try {
      const croppedDataUrl = await getCroppedImg(cropImageSrc, croppedAreaPixels);
      handleKopFieldChange(cropKopIdx, 'logoUrl', croppedDataUrl);
      setCropModalOpen(false);
      setCropImageSrc(null);
      showToast('Logo berhasil dipotong dan diterapkan.', 'success');
    } catch {
      showToast('Gagal memproses gambar.', 'error');
    }
  };

  const handleSaveKop = (idx: number) => {
    const kop = kopForms[idx];
    const kopId = kop.id || `kop-${Date.now()}`;
    if (!kop.name.trim()) {
      showToast('Nama RS / Klinik wajib diisi.', 'error');
      return;
    }

    const original = hospitalSettingsList.find(h => h.id === kopId);
    const nameChanged = original && kop.name.trim() !== original.name;
    const logoChanged = original && (kop.logoUrl || '') !== (original.logoUrl || '');

    if (nameChanged || logoChanged) {
      const cooldown = getCooldownInfo(kopId);
      if (cooldown.locked) {
        showToast(`Nama dan logo masih dalam masa cooldown. Dapat diubah pada ${cooldown.unlockDate!.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`, 'warning', 5000);
        return;
      }
      setCooldown(kopId);
    }

    setKopSaving(idx);
    const updated = [...kopForms];
    updated[idx] = { ...kop, id: kopId };
    onUpdateHospitalList(updated);
    setTimeout(() => {
      setKopSaving(null);
      showToast(`Kop Surat ${idx + 1} berhasil disimpan.`, 'success');
    }, 400);
  };

  const handleAddKop = () => {
    if (kopForms.length >= 3) return;
    const newKop: HospitalSettings = {
      id: `kop-${Date.now()}`,
      name: '',
      address: '',
      phone: '',
      fax: '',
      email: '',
      website: '',
      logoUrl: '',
    };
    setKopForms([...kopForms, newKop]);
    setExpandedKopIdx(kopForms.length);
  };

  const confirmDeleteKop = () => {
    if (kopToDelete === null) return;
    const updated = kopForms.filter((_, i) => i !== kopToDelete);
    setKopForms(updated);
    onUpdateHospitalList(updated);
    setKopToDelete(null);
    showToast('Kop surat berhasil dihapus.', 'success');
    if (expandedKopIdx === kopToDelete) setExpandedKopIdx(null);
  };

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);

    try {
      if (profileForm.name !== userProfile.name && !isDokterInstitusi) {
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
        const updatePayload: Record<string, any> = {
          specialization: profileForm.specialization,
        };

        if (!isDokterInstitusi) {
          updatePayload.full_name = profileForm.name;
          updatePayload.str_number = profileForm.strNumber || null;
          updatePayload.sip_number = profileForm.sipNumber || null;
          updatePayload.phone = profileForm.phone;
        }

        const { error } = await supabase
          .from('doctor_accounts')
          .update(updatePayload)
          .eq('user_id', authId);

        if (error) {
          showToast('Gagal menyimpan ke server: ' + error.message, 'error');
          setProfileSaving(false);
          return;
        }
      }

      onUpdateUser(profileForm);
      setIsSaved(true);
      showToast('Profil berhasil disimpan.', 'success');
      setTimeout(() => setIsSaved(false), 3000);
    } catch {
      showToast('Gagal terhubung ke server. Silakan coba lagi.', 'error');
    }
    setProfileSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      showToast('Masukkan password saat ini.', 'warning');
      return;
    }
    if (newPassword.length < 8) {
      showToast('Password baru minimal 8 karakter.', 'warning');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok.', 'warning');
      return;
    }

    setPasswordSaving(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: userProfile.email,
        password: currentPassword,
      });

      if (signInError) {
        showToast('Password saat ini salah.', 'error');
        setPasswordSaving(false);
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        showToast(error.message || 'Gagal mengubah password.', 'error');
      } else {
        showToast('Password berhasil diubah.', 'success');
        setCurrentPassword('');
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

  const visibleTabs: { id: typeof activeTab; label: string; icon: React.ComponentType<any> }[] = [
    { id: 'profil', label: 'Profil', icon: User },
    { id: 'keamanan', label: 'Keamanan', icon: Shield },
  ];

  if (!isAdmin) {
    visibleTabs.push({ id: 'kop-surat', label: 'Kop Surat', icon: FileText });
  }

  if (!isDokterInstitusi) {
    visibleTabs.push({ id: 'langganan', label: 'Langganan', icon: CreditCard });
  }

  visibleTabs.push({ id: 'backup', label: 'Backup & Restore', icon: HardDrive });

  const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-colors duration-150";
  const readOnlyClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed text-sm";

  return (
    <div className="flex-1 p-8 max-w-5xl mx-auto w-full font-sans text-slate-900 overflow-y-auto h-full custom-scrollbar">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Pengaturan</h2>
        <p className="text-slate-500 text-sm">Kelola profil, keamanan, dan preferensi akun Anda.</p>
      </div>

      <div className="bg-slate-100 rounded-2xl p-1 inline-flex gap-1 mb-6">
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-colors ${
              activeTab === tab.id
                ? 'bg-white text-slate-900 font-semibold shadow-sm'
                : 'text-slate-500 hover:text-slate-700 cursor-pointer'
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

      {/* ═══════════════ TAB: PROFIL ═══════════════ */}
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
                {isDokterInstitusi && (
                  <span className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-teal-50 text-teal-700">
                    Dokter Institusi
                  </span>
                )}
              </div>
            </div>

            {isDokterInstitusi && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3 mb-6">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Nama dan email dikelola oleh Admin Institusi Anda. Anda hanya dapat mengubah spesialisasi.
                </p>
              </div>
            )}

            <div className="h-px bg-slate-100 mb-8" />

            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 ml-1">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    readOnly={isDokterInstitusi}
                    className={isDokterInstitusi ? readOnlyClass : inputClass}
                  />
                  {!isDokterInstitusi && (
                    <p className="text-[10px] text-slate-400 ml-1 italic">Dapat diubah sekali setiap 7 hari.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 ml-1">Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    readOnly
                    className={readOnlyClass}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-500 ml-1">Spesialisasi</label>
                  <input
                    type="text"
                    name="specialization"
                    value={profileForm.specialization}
                    onChange={handleProfileChange}
                    className={inputClass}
                  />
                </div>

                {!isDokterInstitusi && (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500 ml-1">Nomor WhatsApp</label>
                      <input
                        type="tel"
                        name="phone"
                        value={profileForm.phone}
                        onChange={handleProfileChange}
                        className={inputClass}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500 ml-1">No. STR (Surat Tanda Registrasi)</label>
                      <input
                        type="text"
                        name="strNumber"
                        value={profileForm.strNumber || ''}
                        onChange={handleProfileChange}
                        placeholder="16 digit nomor STR"
                        className={inputClass + " placeholder:text-slate-300"}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-slate-500 ml-1">No. SIP (Surat Izin Praktik)</label>
                      <input
                        type="text"
                        name="sipNumber"
                        value={profileForm.sipNumber || ''}
                        onChange={handleProfileChange}
                        placeholder="Nomor SIP aktif"
                        className={inputClass + " placeholder:text-slate-300"}
                      />
                    </div>
                  </>
                )}
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

      {/* ═══════════════ TAB: KEAMANAN ═══════════════ */}
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
                <label className="text-xs font-medium text-slate-500 ml-1">Password Saat Ini</label>
                <div className="relative">
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm"
                  />
                  <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 ml-1">Password Baru</label>
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    className="w-full px-4 py-3 pr-12 border border-slate-200 rounded-xl bg-white focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-all text-sm"
                  />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 ml-1">Konfirmasi Password Baru</label>
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

          {!isAdmin && (
            <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-8">
              <h3 className="text-lg font-black text-slate-900 mb-6">Manajemen Data</h3>
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
          )}
        </motion.div>
      )}

      {/* ═══════════════ TAB: KOP SURAT ═══════════════ */}
      {activeTab === 'kop-surat' && !isAdmin && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {isDokterInstitusi && (
            <>
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
                <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Kop surat dikelola oleh Admin Institusi Anda. Hubungi admin untuk perubahan.
                </p>
              </div>

              {hospitalSettingsList.length > 0 ? (
                <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-8">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900">{hospitalSettingsList[0].name || 'Kop Surat Institusi'}</h3>
                      <p className="text-sm text-slate-500">Kop surat yang ditetapkan oleh institusi Anda.</p>
                    </div>
                  </div>
                  <div className="h-px bg-slate-100 mb-6" />
                  <div className="grid md:grid-cols-2 gap-5">
                    {[
                      { label: 'Nama RS / Institusi', value: hospitalSettingsList[0].name },
                      { label: 'Alamat', value: hospitalSettingsList[0].address },
                      { label: 'No. Telepon', value: hospitalSettingsList[0].phone },
                      { label: 'No. Fax', value: hospitalSettingsList[0].fax || '-' },
                      { label: 'Email', value: hospitalSettingsList[0].email },
                      { label: 'Website', value: hospitalSettingsList[0].website || '-' },
                    ].map((field) => (
                      <div key={field.label} className="space-y-1">
                        <label className="text-xs font-medium text-slate-500 ml-1">{field.label}</label>
                        <input type="text" value={field.value || ''} readOnly className={readOnlyClass} />
                      </div>
                    ))}
                  </div>
                  {hospitalSettingsList[0].logoUrl && (
                    <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-xs font-medium text-slate-500 mb-2">Logo Institusi</p>
                      <img src={hospitalSettingsList[0].logoUrl} alt="Logo" className="h-16 w-auto object-contain" />
                    </div>
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-8 text-center">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 font-medium">Kop surat belum dikonfigurasi oleh Admin Institusi.</p>
                </div>
              )}
            </>
          )}

          {isPersonal && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">Kop Surat Praktik</h3>
                  <p className="text-sm text-slate-500">Kelola kop surat tempat praktik Anda (maks. 3).</p>
                </div>
                {kopForms.length < 3 && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddKop}
                    className="flex items-center gap-2 px-4 py-2.5 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white text-xs font-bold rounded-xl transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    Tambah Kop Surat
                  </motion.button>
                )}
              </div>

              {kopForms.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
                  <FileText className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                  <p className="text-sm text-slate-500 font-medium mb-1">Belum ada kop surat.</p>
                  <p className="text-xs text-slate-400">Klik "Tambah Kop Surat" untuk menambahkan tempat praktik.</p>
                </div>
              )}

              {kopForms.map((kop, idx) => {
                const isExpanded = expandedKopIdx === idx;
                const cooldown = getCooldownInfo(kop.id);
                const isSavingThis = kopSaving === idx;

                return (
                  <div key={kop.id || idx} className="rounded-2xl border border-slate-100 shadow-sm bg-white overflow-hidden">
                    <button
                      onClick={() => setExpandedKopIdx(isExpanded ? null : idx)}
                      className="w-full flex items-center justify-between p-5 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0C1E35] flex items-center justify-center text-white text-xs font-black">
                          {idx + 1}
                        </div>
                        <div className="text-left">
                          <h4 className="text-sm font-bold text-slate-900">{kop.name || `Kop Surat ${idx + 1}`}</h4>
                          {kop.address && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-sm">{kop.address}</p>}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-6 pt-0 border-t border-slate-100">
                            {cooldown.locked && (
                              <div className="mb-5 p-3 bg-amber-50 border border-amber-100 rounded-xl flex items-center gap-2">
                                <CalendarClock className="w-4 h-4 text-amber-500 shrink-0" />
                                <p className="text-xs text-amber-700">
                                  Nama dan logo dapat diubah kembali pada <strong>{cooldown.unlockDate!.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                                </p>
                              </div>
                            )}

                            <div className="grid md:grid-cols-2 gap-5 mt-4">
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 ml-1">Nama RS / Klinik *</label>
                                <input
                                  type="text"
                                  value={kop.name}
                                  onChange={(e) => handleKopFieldChange(idx, 'name', e.target.value)}
                                  readOnly={cooldown.locked}
                                  className={cooldown.locked ? readOnlyClass : inputClass}
                                  placeholder="Nama rumah sakit atau klinik"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 ml-1 flex items-center gap-1">
                                  <ImagePlus className="w-3 h-3" /> Logo RS / Institusi
                                </label>
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png"
                                  ref={(el) => { if (el) logoInputRefs.current.set(idx, el); }}
                                  onChange={(e) => handleLogoFileSelect(idx, e)}
                                  className="hidden"
                                />
                                <div className="flex items-center gap-3">
                                  {kop.logoUrl ? (
                                    <div className="h-12 w-12 rounded-lg border border-slate-200 overflow-hidden bg-slate-50 shrink-0">
                                      <img src={kop.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                                    </div>
                                  ) : (
                                    <div className="h-12 w-12 rounded-lg border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 shrink-0">
                                      <ImagePlus className="w-5 h-5 text-slate-300" />
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!cooldown.locked) {
                                        const input = logoInputRefs.current.get(idx);
                                        if (input) input.click();
                                      }
                                    }}
                                    disabled={cooldown.locked}
                                    className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-xl transition-all ${
                                      cooldown.locked
                                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                        : 'bg-[#0C1E35]/5 hover:bg-[#0C1E35]/10 text-[#0C1E35] border border-[#0C1E35]/15'
                                    }`}
                                  >
                                    <Upload className="w-3.5 h-3.5" />
                                    {kop.logoUrl ? 'Ganti Logo' : 'Upload Logo'}
                                  </button>
                                  {kop.logoUrl && !cooldown.locked && (
                                    <button
                                      type="button"
                                      onClick={() => handleKopFieldChange(idx, 'logoUrl', '')}
                                      className="p-2.5 text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                      title="Hapus logo"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 ml-1">Format: .jpg, .png (maks. 5 MB)</p>
                              </div>
                              <div className="md:col-span-2 space-y-2">
                                <label className="text-xs font-medium text-slate-500 ml-1 flex items-center gap-1">
                                  <MapPin className="w-3 h-3" /> Alamat
                                </label>
                                <input
                                  type="text"
                                  value={kop.address}
                                  onChange={(e) => handleKopFieldChange(idx, 'address', e.target.value)}
                                  className={inputClass}
                                  placeholder="Jl. Kesehatan No. 1, Jakarta"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 ml-1 flex items-center gap-1">
                                  <Phone className="w-3 h-3" /> No. Telepon
                                </label>
                                <input
                                  type="tel"
                                  value={kop.phone}
                                  onChange={(e) => handleKopFieldChange(idx, 'phone', e.target.value)}
                                  className={inputClass}
                                  placeholder="(021) 1234567"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 ml-1">No. Fax</label>
                                <input
                                  type="tel"
                                  value={kop.fax || ''}
                                  onChange={(e) => handleKopFieldChange(idx, 'fax', e.target.value)}
                                  className={inputClass}
                                  placeholder="(021) 1234568"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 ml-1 flex items-center gap-1">
                                  <MailIcon className="w-3 h-3" /> Email RS
                                </label>
                                <input
                                  type="email"
                                  value={kop.email}
                                  onChange={(e) => handleKopFieldChange(idx, 'email', e.target.value)}
                                  className={inputClass}
                                  placeholder="info@rumahsakit.co.id"
                                />
                              </div>
                              <div className="space-y-2">
                                <label className="text-xs font-medium text-slate-500 ml-1 flex items-center gap-1">
                                  <Globe className="w-3 h-3" /> Website RS
                                </label>
                                <input
                                  type="url"
                                  value={kop.website || ''}
                                  onChange={(e) => handleKopFieldChange(idx, 'website', e.target.value)}
                                  className={inputClass}
                                  placeholder="www.rumahsakit.co.id"
                                />
                              </div>
                            </div>

                            {kop.logoUrl && (
                              <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <p className="text-xs font-medium text-slate-500 mb-2">Preview Logo</p>
                                <img src={kop.logoUrl} alt="Logo" className="h-20 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              </div>
                            )}

                            <div className="mt-6 flex items-center justify-between">
                              <button
                                onClick={() => setKopToDelete(idx)}
                                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 text-xs font-bold rounded-xl transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Hapus Kop Surat
                              </button>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSaveKop(idx)}
                                disabled={isSavingThis}
                                className="flex items-center gap-2 px-6 py-3 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white font-bold rounded-xl transition-all disabled:opacity-50"
                              >
                                {isSavingThis ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {isSavingThis ? 'Menyimpan...' : 'Simpan'}
                              </motion.button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </>
          )}
        </motion.div>
      )}

      {/* ═══════════════ TAB: LANGGANAN ═══════════════ */}
      {activeTab === 'langganan' && !isDokterInstitusi && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

          {/* ── ADMIN INSTITUSI: enterprise plan + seat management ── */}
          {isAdmin && (
            <div className="space-y-6">
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
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Berlaku Hingga</p>
                      <p className="text-lg font-black">12 Des 2026</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Admin</p>
                      <p className="text-lg font-black">{userProfile.name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Enterprise ID</p>
                      <p className="text-sm font-bold font-mono">{userProfile.enterprise_id || '-'}</p>
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

              <div className="rounded-2xl border border-slate-100 shadow-sm bg-white p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                    <Users className="w-5 h-5 text-indigo-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900">Seat Dokter</h3>
                    <p className="text-sm text-slate-500">Kelola jumlah seat dokter di institusi Anda.</p>
                  </div>
                </div>

                <div className="h-px bg-slate-100 mb-6" />

                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-5 bg-slate-50 rounded-xl text-center">
                    <p className="text-2xl font-black text-[#0C1E35]">10</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">Total Seat</p>
                  </div>
                  <div className="p-5 bg-emerald-50 rounded-xl text-center">
                    <p className="text-2xl font-black text-emerald-600">7</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">Terpakai</p>
                  </div>
                  <div className="p-5 bg-blue-50 rounded-xl text-center">
                    <p className="text-2xl font-black text-blue-600">3</p>
                    <p className="text-xs font-medium text-slate-500 mt-1">Tersedia</p>
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <h4 className="text-sm font-bold text-slate-900">Dokter Terdaftar</h4>
                  <div className="rounded-xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50">
                        <tr>
                          <th className="px-5 py-3 text-xs font-medium text-slate-500">Nama</th>
                          <th className="px-5 py-3 text-xs font-medium text-slate-500">Spesialisasi</th>
                          <th className="px-5 py-3 text-xs font-medium text-slate-500">Status</th>
                          <th className="px-5 py-3 text-right text-xs font-medium text-slate-500">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {[
                          { name: 'Dr. Budi Santoso, Sp.PD', spec: 'Penyakit Dalam', status: 'active' },
                          { name: 'Dr. Rina Wijaya, Sp.B', spec: 'Bedah Umum', status: 'active' },
                          { name: 'Dr. Ahmad Fauzi, Sp.OG', spec: 'Obstetri & Ginekologi', status: 'active' },
                          { name: 'Dr. Maya Sari, Sp.A', spec: 'Anak', status: 'active' },
                          { name: 'Dr. Hendra Pratama, Sp.JP', spec: 'Jantung & Pembuluh Darah', status: 'active' },
                          { name: 'Dr. Siti Nurhaliza, Sp.M', spec: 'Mata', status: 'inactive' },
                          { name: 'Dr. Dedi Kurniawan, Sp.THT', spec: 'THT-KL', status: 'active' },
                        ].map((doc, i) => (
                          <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-5 py-3 font-bold text-slate-900">{doc.name}</td>
                            <td className="px-5 py-3 text-slate-600">{doc.spec}</td>
                            <td className="px-5 py-3">
                              <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full ${
                                doc.status === 'active' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'
                              }`}>
                                {doc.status === 'active' ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-right">
                              <button
                                onClick={() => showToast('Fitur kelola seat akan tersedia segera.', 'info')}
                                className="text-xs text-red-500 hover:text-red-700 font-bold transition-colors"
                              >
                                Hapus
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <button
                  onClick={() => showToast('Fitur tambah seat akan tersedia segera.', 'info')}
                  className="px-5 py-2.5 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white text-xs font-bold rounded-xl transition-all"
                >
                  + Tambah Seat Dokter
                </button>
              </div>
            </div>
          )}

          {/* ── PERSONAL: plan status + billing + CTA ── */}
          {isPersonal && (
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
                        <th className="px-5 py-3 text-xs font-medium text-slate-500">Tanggal</th>
                        <th className="px-5 py-3 text-xs font-medium text-slate-500">Deskripsi</th>
                        <th className="px-5 py-3 text-xs font-medium text-slate-500">Jumlah</th>
                        <th className="px-5 py-3 text-right text-xs font-medium text-slate-500">Status</th>
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
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════ TAB: BACKUP ═══════════════ */}
      {activeTab === 'backup' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {isDokterInstitusi && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-start gap-3">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 leading-relaxed">
                Langganan Anda dikelola oleh <strong>Admin Institusi</strong>. Hubungi admin Anda untuk informasi paket dan pembayaran.
              </p>
            </div>
          )}

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
                <label className="text-xs font-medium text-slate-500 ml-1">Dari Tanggal</label>
                <input
                  type="date"
                  value={backupDateFrom}
                  onChange={(e) => setBackupDateFrom(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-slate-500 ml-1">Sampai Tanggal</label>
                <input
                  type="date"
                  value={backupDateTo}
                  onChange={(e) => setBackupDateTo(e.target.value)}
                  className={inputClass}
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

      <ConfirmModal
        isOpen={kopToDelete !== null}
        onConfirm={confirmDeleteKop}
        onCancel={() => setKopToDelete(null)}
        title="Hapus Kop Surat?"
        message={`Apakah Anda yakin ingin menghapus Kop Surat ${kopToDelete !== null ? kopToDelete + 1 : ''}? Data kop surat ini akan dihapus secara permanen.`}
        confirmText="Ya, Hapus"
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
                  <p className="text-xs font-medium text-slate-500 mb-2">Data Lokal</p>
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

      <AnimatePresence>
        {cropModalOpen && cropImageSrc && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
            onClick={() => setCropModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#0C1E35]/10 rounded-xl flex items-center justify-center">
                    <Crop className="w-5 h-5 text-[#0C1E35]" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900">Crop & Zoom Logo</h3>
                    <p className="text-xs text-slate-500">Sesuaikan area logo yang akan digunakan.</p>
                  </div>
                </div>
                <button
                  onClick={() => setCropModalOpen(false)}
                  className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="relative w-full h-80 bg-slate-900">
                <Cropper
                  image={cropImageSrc}
                  crop={cropState}
                  zoom={cropZoom}
                  aspect={1}
                  onCropChange={setCropState}
                  onZoomChange={setCropZoom}
                  onCropComplete={onCropComplete}
                  showGrid={true}
                  style={{
                    containerStyle: { background: '#0f172a' },
                    cropAreaStyle: { border: '2px solid #0C1E35' },
                  }}
                />
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <ZoomOut className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={cropZoom}
                    onChange={(e) => setCropZoom(Number(e.target.value))}
                    className="flex-1 accent-[#0C1E35] h-1.5"
                  />
                  <ZoomIn className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-xs font-bold text-slate-500 w-10 text-right">{Math.round(cropZoom * 100)}%</span>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCropModalOpen(false)}
                    className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-sm transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleCropConfirm}
                    className="flex-1 py-3 px-4 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-slate-900/10 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Terapkan Logo
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
