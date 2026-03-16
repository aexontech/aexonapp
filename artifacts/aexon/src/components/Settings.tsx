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
  Crop,
  Clock,
  Star,
  MessageCircle,
  ExternalLink
} from 'lucide-react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { UserProfile, HospitalSettings, Session } from '../types';

interface ProductPlan {
  id: string;
  billing_cycle: 'monthly' | 'annual';
  price: number;
  original_price: number | null;
  features: string[];
  products: {
    name: string;
  };
}
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
  onCheckout: (plan: ProductPlan) => void;
  plan: 'subscription' | 'enterprise' | null;
  sessions: Session[];
}

interface RestoreConflict {
  backupSession: Session;
  existingSession: Session;
}

type ConflictAction = 'skip' | 'overwrite';

export default function Settings({ userProfile, hospitalSettingsList, onUpdateUser, onUpdateHospitalList, onUpdateSessions, onCancelSubscription, onCheckout, plan, sessions }: SettingsProps) {
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
  const [kopVerifyModal, setKopVerifyModal] = useState<{ idx: number; type: 'name' | 'logo' | 'both'; newName?: string; oldName?: string } | null>(null);
  const [kopVerifyInput, setKopVerifyInput] = useState('');

  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropKopIdx, setCropKopIdx] = useState<number | null>(null);
  const [cropState, setCropState] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const logoInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

  const [showPlanModal, setShowPlanModal] = useState(false);
  const [billingHistory, setBillingHistory] = useState<any[]>([]);
  const [billingLoading, setBillingLoading] = useState(false);
  const [plans, setPlans] = useState<ProductPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    setKopForms(hospitalSettingsList);
  }, [hospitalSettingsList]);

  const isAdmin = userProfile.role === 'admin';
  const isEnterprise = plan === 'enterprise';
  const isDokterInstitusi = !isAdmin && isEnterprise;
  const isPersonal = !isAdmin && !isEnterprise;

  useEffect(() => {
    if (activeTab === 'langganan' && isPersonal) {
      setBillingLoading(true);
      supabase
        .from('payment_logs')
        .select('*')
        .eq('doctor_id', userProfile.id)
        .order('created_at', { ascending: false })
        .then(({ data, error }) => {
          if (!error && data) setBillingHistory(data);
          setBillingLoading(false);
        });
    }
  }, [activeTab, isPersonal, userProfile.id]);

  useEffect(() => {
    async function fetchPlansAndSettings() {
      if (!supabase) { setPlansLoading(false); return; }
      try {
        const { data: betaData } = await supabase
          .from('app_settings')
          .select('value')
          .eq('key', 'beta_mode')
          .maybeSingle();

        const isBetaMode = betaData?.value === 'true';

        const { data: allPlans, error } = await supabase
          .from('product_plans')
          .select('*, products(name)')
          .order('price', { ascending: true });
        if (error) {
          console.error('Failed to fetch plans:', error);
          showToast('Gagal memuat daftar paket. Silakan coba lagi nanti.', 'error');
        } else if (allPlans) {
          const filtered = allPlans.filter(p =>
            isBetaMode
              ? p.original_price !== null
              : p.original_price === null
          );
          setPlans(filtered);
        }
      } catch (err) {
        console.error('Failed to fetch plans:', err);
        showToast('Gagal memuat daftar paket.', 'error');
      } finally {
        setPlansLoading(false);
      }
    }
    fetchPlansAndSettings();
  }, []);

  const formatRupiah = (amount: number) =>
    'Rp' + amount.toLocaleString('id-ID');

  const monthlyPlan = plans.find(p => p.billing_cycle === 'monthly');
  const annualPlan = plans.find(p => p.billing_cycle === 'annual');
  const annualTotal = (annualPlan?.price ?? 0) * 12;
  const monthlySavings = ((monthlyPlan?.price ?? 0) * 12) - annualTotal;

  const COOLDOWN_DAYS = 30;
  const DELETE_COOLDOWN_DAYS = 7;
  const MIN_AGE_BEFORE_DELETE_DAYS = 3;

  const getKopOpsLog = useCallback((): { date: string; action: string }[] => {
    try {
      const key = `aexon_kop_ops_${userProfile.id}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  }, [userProfile.id]);

  const addKopOp = useCallback((action: string) => {
    const key = `aexon_kop_ops_${userProfile.id}`;
    const ops = getKopOpsLog();
    ops.push({ date: new Date().toISOString(), action });
    localStorage.setItem(key, JSON.stringify(ops));
  }, [userProfile.id, getKopOpsLog]);

  const getLastDeleteDate = useCallback((): Date | null => {
    const ops = getKopOpsLog();
    const deletes = ops.filter(op => op.action === 'delete').sort((a, b) => b.date.localeCompare(a.date));
    return deletes.length > 0 ? new Date(deletes[0].date) : null;
  }, [getKopOpsLog]);

  const canAddNewKop = useCallback((): { allowed: boolean; reason?: string; unlockDate?: Date } => {
    if (kopForms.length >= 3) return { allowed: false, reason: 'Maksimal 3 kop surat.' };
    const lastDel = getLastDeleteDate();
    if (lastDel) {
      const diffDays = (Date.now() - lastDel.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < DELETE_COOLDOWN_DAYS) {
        const unlockDate = new Date(lastDel.getTime() + DELETE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
        return { allowed: false, reason: `Tidak dapat menambah kop surat baru setelah penghapusan.`, unlockDate };
      }
    }
    return { allowed: true };
  }, [kopForms.length, getLastDeleteDate]);

  const canDeleteKop = useCallback((kop: HospitalSettings): { allowed: boolean; reason?: string } => {
    if (kop.createdAt) {
      const createdDate = new Date(kop.createdAt);
      const ageDays = (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays < MIN_AGE_BEFORE_DELETE_DAYS) {
        return { allowed: false, reason: `Kop surat baru dapat dihapus setelah ${MIN_AGE_BEFORE_DELETE_DAYS} hari sejak dibuat.` };
      }
    } else if (kop.name.trim()) {
      return { allowed: false, reason: `Simpan kop surat terlebih dahulu sebelum menghapus.` };
    }
    return { allowed: true };
  }, []);

  const getCooldownInfo = (kop: HospitalSettings) => {
    const nameTs = kop.last_name_changed;
    const logoTs = kop.last_logo_changed;
    const latestChange = [nameTs, logoTs].filter(Boolean).sort().pop();
    if (!latestChange) return { locked: false, unlockDate: null };
    const lastDate = new Date(latestChange);
    const diffDays = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < COOLDOWN_DAYS) {
      const unlockDate = new Date(lastDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000);
      return { locked: true, unlockDate };
    }
    return { locked: false, unlockDate: null };
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

    const original = hospitalSettingsList.find(h => h.id === kopId);
    const nameChanged = original && kop.name.trim() !== original.name;
    const logoChanged = original && (kop.logoUrl || '') !== (original.logoUrl || '');

    if (nameChanged || logoChanged) {
      if (!kop.name.trim() && nameChanged) {
        showToast('Nama RS / Klinik tidak boleh dikosongkan setelah diisi.', 'error');
        return;
      }
      const cooldown = getCooldownInfo(kop);
      if (cooldown.locked) {
        showToast(`Nama dan logo masih dalam masa cooldown. Dapat diubah pada ${cooldown.unlockDate!.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`, 'warning', 5000);
        return;
      }
      const changeType: 'name' | 'logo' | 'both' = (nameChanged && logoChanged) ? 'both' : nameChanged ? 'name' : 'logo';
      setKopVerifyModal({ idx, type: changeType, newName: kop.name.trim(), oldName: original?.name });
      setKopVerifyInput('');
      return;
    }

    commitKopSave(idx);
  };

  const commitKopSave = (idx: number, isIdentityChange = false) => {
    const kop = kopForms[idx];
    const kopId = kop.id || `kop-${Date.now()}`;
    const now = new Date().toISOString();

    setKopSaving(idx);
    const updatedKop = { ...kop, id: kopId };

    if (isIdentityChange) {
      const original = hospitalSettingsList.find(h => h.id === kopId);
      const nameChanged = original && kop.name.trim() !== original.name;
      const logoChanged = original && (kop.logoUrl || '') !== (original.logoUrl || '');
      if (nameChanged) updatedKop.last_name_changed = now;
      if (logoChanged) updatedKop.last_logo_changed = now;
    }

    const isNewRecord = !hospitalSettingsList.find(h => h.id === kopId);
    if (!updatedKop.createdAt && isNewRecord) updatedKop.createdAt = now;
    if (!updatedKop.createdAt && !isNewRecord) updatedKop.createdAt = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    const updated = [...kopForms];
    updated[idx] = updatedKop;
    setKopForms(updated);
    onUpdateHospitalList(updated);
    addKopOp(isIdentityChange ? 'identity_change' : 'save');
    setTimeout(() => {
      setKopSaving(null);
      showToast(`Kop Surat ${idx + 1} berhasil disimpan.`, 'success');
    }, 400);
  };

  const handleConfirmKopVerify = () => {
    if (!kopVerifyModal) return;
    commitKopSave(kopVerifyModal.idx, true);
    setKopVerifyModal(null);
    setKopVerifyInput('');
  };

  const handleAddKop = () => {
    const check = canAddNewKop();
    if (!check.allowed) {
      const msg = check.unlockDate
        ? `${check.reason} Dapat menambah kembali pada ${check.unlockDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}.`
        : check.reason!;
      showToast(msg, 'warning', 5000);
      return;
    }
    const now = new Date().toISOString();
    const newKop: HospitalSettings = {
      id: `kop-${Date.now()}`,
      name: '',
      address: '',
      phone: '',
      fax: '',
      email: '',
      website: '',
      logoUrl: '',
      createdAt: now,
    };
    setKopForms([...kopForms, newKop]);
    setExpandedKopIdx(kopForms.length);
    addKopOp('add');
  };

  const confirmDeleteKop = () => {
    if (kopToDelete === null) return;
    const kop = kopForms[kopToDelete];
    const deleteCheck = canDeleteKop(kop);
    if (!deleteCheck.allowed) {
      showToast(deleteCheck.reason!, 'warning', 5000);
      setKopToDelete(null);
      return;
    }
    const updated = kopForms.filter((_, i) => i !== kopToDelete);
    setKopForms(updated);
    onUpdateHospitalList(updated);
    addKopOp('delete');
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

  const inputBaseStyle: React.CSSProperties = {
    width: '100%',
    paddingTop: 11,
    paddingBottom: 11,
    paddingLeft: 14,
    paddingRight: 14,
    border: '1px solid #CBD5E1',
    borderRadius: 10,
    backgroundColor: '#fff',
    fontSize: 14,
    color: '#0C1E35',
    outline: 'none',
    transition: 'box-shadow 0.15s, border-color 0.15s',
    fontFamily: 'Outfit, sans-serif',
  };

  const readOnlyStyle: React.CSSProperties = {
    ...inputBaseStyle,
    backgroundColor: '#F8FAFC',
    color: '#64748B',
    cursor: 'not-allowed',
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#0C1E35';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(12,30,53,0.08)';
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = '#CBD5E1';
    e.currentTarget.style.boxShadow = 'none';
  };

  const cardStyle: React.CSSProperties = {
    background: '#fff',
    border: '1px solid #E2E8F0',
    borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    padding: 32,
  };

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 800,
    color: '#0C1E35',
    fontFamily: 'Outfit, sans-serif',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    marginLeft: 2,
    display: 'block',
    marginBottom: 6,
  };

  const mutedTextStyle: React.CSSProperties = {
    fontSize: 14,
    color: '#64748B',
  };

  const btnPrimaryStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 24px',
    backgroundColor: '#0C1E35',
    color: '#fff',
    fontWeight: 700,
    borderRadius: 12,
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    fontFamily: 'Outfit, sans-serif',
    transition: 'background-color 0.15s',
  };

  const dividerStyle: React.CSSProperties = {
    height: 1,
    backgroundColor: '#E2E8F0',
    border: 'none',
    margin: '24px 0',
  };

  const iconBoxStyle = (bg: string): React.CSSProperties => ({
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: bg,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  });

  return (
    <div
      className="custom-scrollbar"
      style={{
        flex: 1,
        padding: 32,
        maxWidth: 1024,
        margin: '0 auto',
        width: '100%',
        fontFamily: 'Outfit, sans-serif',
        color: '#0C1E35',
        overflowY: 'auto',
        height: '100%',
        position: 'relative',
      }}
    >
      <div className="orb-tr" />
      <div className="orb-bl" />

      <div style={{ marginBottom: 32 }}>
        <h2 className="font-aexon" style={{ fontSize: 26, fontWeight: 800, color: '#0C1E35', letterSpacing: '-0.01em', marginBottom: 4 }}>Pengaturan</h2>
        <p style={{ ...mutedTextStyle, fontSize: 14 }}>Kelola profil, keamanan, dan preferensi akun Anda.</p>
      </div>

      <div style={{ backgroundColor: '#F1F5F9', borderRadius: 16, padding: 4, display: 'inline-flex', gap: 4, marginBottom: 24 }}>
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '8px 16px',
              fontSize: 14,
              borderRadius: 12,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s',
              fontFamily: 'Outfit, sans-serif',
              fontWeight: activeTab === tab.id ? 600 : 400,
              backgroundColor: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? '#0C1E35' : '#64748B',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <tab.icon style={{ width: 16, height: 16 }} />
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
            style={{
              position: 'fixed',
              top: 24,
              right: 24,
              backgroundColor: '#10B981',
              color: '#fff',
              padding: '10px 20px',
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 8px 24px rgba(16,185,129,0.25)',
              zIndex: 50,
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            <CheckCircle2 style={{ width: 16, height: 16, marginRight: 8 }} />
            Perubahan Berhasil Disimpan
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ TAB: PROFIL ═══════════════ */}
      {activeTab === 'profil' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', backgroundColor: '#0C1E35', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <span style={{ color: '#fff', fontWeight: 900, fontSize: 18 }}>{getInitials(profileForm.name)}</span>
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0C1E35', fontFamily: 'Outfit, sans-serif' }}>{profileForm.name}</h3>
              <p style={mutedTextStyle}>{profileForm.specialization}</p>
              {isDokterInstitusi && (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 6, padding: '2px 10px', fontSize: 10, fontWeight: 700, borderRadius: 20, backgroundColor: '#F0FDFA', color: '#0F766E' }}>
                  Dokter Institusi
                </span>
              )}
            </div>

            {isDokterInstitusi && (
              <div style={{ padding: 16, backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
                <Info style={{ width: 16, height: 16, color: '#3B82F6', flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: '#1D4ED8', lineHeight: 1.6 }}>
                  Nama dan email dikelola oleh Admin Institusi Anda. Anda hanya dapat mengubah spesialisasi.
                </p>
              </div>
            )}

            <div style={{ ...dividerStyle, marginBottom: 32 }} />

            <form onSubmit={handleSaveProfile}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24 }}>
                <div>
                  <label style={labelStyle}>Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    name="name"
                    value={profileForm.name}
                    onChange={handleProfileChange}
                    readOnly={isDokterInstitusi}
                    style={isDokterInstitusi ? readOnlyStyle : inputBaseStyle}
                    onFocus={isDokterInstitusi ? undefined : handleInputFocus}
                    onBlur={isDokterInstitusi ? undefined : handleInputBlur}
                  />
                  {!isDokterInstitusi && (
                    <p style={{ fontSize: 10, color: '#94A3B8', marginLeft: 2, fontStyle: 'italic', marginTop: 4 }}>Dapat diubah sekali setiap 7 hari.</p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={profileForm.email}
                    readOnly
                    style={readOnlyStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Spesialisasi</label>
                  <input
                    type="text"
                    name="specialization"
                    value={profileForm.specialization}
                    onChange={handleProfileChange}
                    style={inputBaseStyle}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                </div>

                {!isDokterInstitusi && (
                  <>
                    <div>
                      <label style={labelStyle}>Nomor WhatsApp</label>
                      <input
                        type="tel"
                        name="phone"
                        value={profileForm.phone}
                        onChange={handleProfileChange}
                        style={inputBaseStyle}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>No. STR (Surat Tanda Registrasi)</label>
                      <input
                        type="text"
                        name="strNumber"
                        value={profileForm.strNumber || ''}
                        onChange={handleProfileChange}
                        placeholder="16 digit nomor STR"
                        style={inputBaseStyle}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>No. SIP (Surat Izin Praktik)</label>
                      <input
                        type="text"
                        name="sipNumber"
                        value={profileForm.sipNumber || ''}
                        onChange={handleProfileChange}
                        placeholder="Nomor SIP aktif"
                        style={inputBaseStyle}
                        onFocus={handleInputFocus}
                        onBlur={handleInputBlur}
                      />
                    </div>
                  </>
                )}
              </div>
              <div style={{ paddingTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  type="submit"
                  disabled={profileSaving}
                  style={{ ...btnPrimaryStyle, opacity: profileSaving ? 0.5 : 1 }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
                >
                  {profileSaving ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <Save style={{ width: 16, height: 16 }} />}
                  {profileSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </motion.button>
              </div>
            </form>
          </div>
        </motion.div>
      )}

      {/* ═══════════════ TAB: KEAMANAN ═══════════════ */}
      {activeTab === 'keamanan' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={iconBoxStyle('#F8FAFC')}>
                <Key style={{ width: 20, height: 20, color: '#0C1E35' }} />
              </div>
              <div>
                <h3 style={sectionHeadingStyle}>Ganti Password</h3>
                <p style={mutedTextStyle}>Perbarui password akun Anda.</p>
              </div>
            </div>

            <div style={dividerStyle} />

            <form onSubmit={handleChangePassword} style={{ maxWidth: 440, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={labelStyle}>Password Saat Ini</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showCurrentPass ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    style={{ ...inputBaseStyle, paddingRight: 48 }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                  <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
                    {showCurrentPass ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Password Baru</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    style={{ ...inputBaseStyle, paddingRight: 48 }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                  <button type="button" onClick={() => setShowNewPass(!showNewPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
                    {showNewPass ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Konfirmasi Password Baru</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    style={{ ...inputBaseStyle, paddingRight: 48 }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                  <button type="button" onClick={() => setShowConfirmPass(!showConfirmPass)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
                    {showConfirmPass ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                  </button>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={passwordSaving}
                style={{ ...btnPrimaryStyle, opacity: passwordSaving ? 0.5 : 1 }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
              >
                {passwordSaving ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <Lock style={{ width: 16, height: 16 }} />}
                {passwordSaving ? 'Mengubah...' : 'Update Password'}
              </motion.button>
            </form>
          </div>

          {!isAdmin && (
            <div style={cardStyle}>
              <h3 style={{ ...sectionHeadingStyle, marginBottom: 24 }}>Manajemen Data</h3>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFFBEB', borderRadius: 12, border: '1px solid #FDE68A' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Database style={{ width: 20, height: 20, color: '#D97706' }} />
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#78350F' }}>Hapus Data Lokal</h4>
                    <p style={{ fontSize: 12, color: '#92400E', opacity: 0.7 }}>Hapus semua riwayat sesi di browser ini.</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClearDataModal(true)}
                  style={{ padding: '8px 20px', backgroundColor: '#fff', color: '#D97706', fontWeight: 700, borderRadius: 12, border: '1px solid #FDE68A', cursor: 'pointer', fontSize: 14, transition: 'background-color 0.15s', fontFamily: 'Outfit, sans-serif' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF3C7'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
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
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {isDokterInstitusi && (
            <>
              <div style={{ padding: 16, backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <Info style={{ width: 16, height: 16, color: '#3B82F6', flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: '#1D4ED8', lineHeight: 1.6 }}>
                  Kop surat dikelola oleh Admin Institusi Anda. Hubungi admin untuk perubahan.
                </p>
              </div>

              {hospitalSettingsList.length > 0 ? (
                <div style={cardStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                    <div style={iconBoxStyle('#EEF2FF')}>
                      <FileText style={{ width: 20, height: 20, color: '#4F46E5' }} />
                    </div>
                    <div>
                      <h3 style={sectionHeadingStyle}>{hospitalSettingsList[0].name || 'Kop Surat Institusi'}</h3>
                      <p style={mutedTextStyle}>Kop surat yang ditetapkan oleh institusi Anda.</p>
                    </div>
                  </div>
                  <div style={dividerStyle} />
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                    {[
                      { label: 'Nama RS / Institusi', value: hospitalSettingsList[0].name },
                      { label: 'Alamat', value: hospitalSettingsList[0].address },
                      { label: 'No. Telepon', value: hospitalSettingsList[0].phone },
                      { label: 'No. Fax', value: hospitalSettingsList[0].fax || '-' },
                      { label: 'Email', value: hospitalSettingsList[0].email },
                      { label: 'Website', value: hospitalSettingsList[0].website || '-' },
                    ].map((field) => (
                      <div key={field.label}>
                        <label style={labelStyle}>{field.label}</label>
                        <input type="text" value={field.value || ''} readOnly style={readOnlyStyle} />
                      </div>
                    ))}
                  </div>
                  {hospitalSettingsList[0].logoUrl && (
                    <div style={{ marginTop: 20, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                      <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Logo Institusi</p>
                      <img src={hospitalSettingsList[0].logoUrl} alt="Logo" style={{ height: 64, width: 'auto', objectFit: 'contain' }} />
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ ...cardStyle, textAlign: 'center' }}>
                  <FileText style={{ width: 48, height: 48, color: '#E2E8F0', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, color: '#64748B', fontWeight: 500 }}>Kop surat belum dikonfigurasi oleh Admin Institusi.</p>
                </div>
              )}
            </>
          )}

          {isPersonal && (() => {
            const addCheck = canAddNewKop();
            return (
            <>
              <div style={{ padding: 14, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 12 }}>
                <Shield style={{ width: 16, height: 16, color: '#94A3B8', flexShrink: 0 }} />
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                    Nama & logo terkunci <strong>{COOLDOWN_DAYS} hari</strong> setelah diubah. Field lainnya (alamat, telepon, dll.) bebas diedit kapan saja.
                  </p>
                </div>
                <div style={{ padding: '6px 12px', backgroundColor: '#fff', borderRadius: 8, border: '1px solid #E2E8F0', flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#475569' }}>
                    {kopForms.length}/3 slot
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={sectionHeadingStyle}>Kop Surat Praktik</h3>
                  <p style={mutedTextStyle}>Kelola kop surat tempat praktik Anda (maks. 3).</p>
                </div>
                {kopForms.length < 3 && (
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleAddKop}
                    disabled={!addCheck.allowed}
                    style={{ ...btnPrimaryStyle, padding: '10px 16px', fontSize: 12, opacity: addCheck.allowed ? 1 : 0.4, cursor: addCheck.allowed ? 'pointer' : 'not-allowed' }}
                    onMouseEnter={e => { if (addCheck.allowed) e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
                    title={addCheck.allowed ? undefined : addCheck.reason}
                  >
                    <Plus style={{ width: 16, height: 16 }} />
                    Tambah Kop Surat
                  </motion.button>
                )}
              </div>

              {kopForms.length === 0 && (
                <div style={{ ...cardStyle, border: '2px dashed #CBD5E1', textAlign: 'center', padding: 48 }}>
                  <FileText style={{ width: 48, height: 48, color: '#E2E8F0', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, color: '#64748B', fontWeight: 500, marginBottom: 4 }}>Belum ada kop surat.</p>
                  <p style={{ fontSize: 12, color: '#94A3B8' }}>Klik "Tambah Kop Surat" untuk menambahkan tempat praktik.</p>
                </div>
              )}

              {!addCheck.allowed && addCheck.unlockDate && (
                <div style={{ padding: 12, backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CalendarClock style={{ width: 16, height: 16, color: '#F59E0B', flexShrink: 0 }} />
                  <p style={{ fontSize: 12, color: '#92400E' }}>
                    Penambahan kop surat baru tersedia pada <strong>{addCheck.unlockDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                  </p>
                </div>
              )}

              {kopForms.map((kop, kopIdx) => {
                const isExpanded = expandedKopIdx === kopIdx;
                const cooldownKop = getCooldownInfo(kop);
                const isSavingThis = kopSaving === kopIdx;
                const deleteCheckKop = canDeleteKop(kop);

                return (
                  <div key={kop.id || kopIdx} style={{ ...cardStyle, padding: 0, overflow: 'hidden' }}>
                    <button
                      onClick={() => setExpandedKopIdx(isExpanded ? null : kopIdx)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 20, background: 'none', border: 'none', cursor: 'pointer', transition: 'background-color 0.15s', fontFamily: 'Outfit, sans-serif' }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: '#0C1E35', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 900 }}>
                          {kopIdx + 1}
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35' }}>{kop.name || `Kop Surat ${kopIdx + 1}`}</h4>
                          {kop.address && <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2, maxWidth: 384, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{kop.address}</p>}
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp style={{ width: 16, height: 16, color: '#94A3B8' }} /> : <ChevronDown style={{ width: 16, height: 16, color: '#94A3B8' }} />}
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ padding: '0 24px 24px', borderTop: '1px solid #E2E8F0' }}>
                            {cooldownKop.locked && (
                              <div style={{ marginBottom: 20, marginTop: 16, padding: 12, backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                                <CalendarClock style={{ width: 16, height: 16, color: '#F59E0B', flexShrink: 0 }} />
                                <p style={{ fontSize: 12, color: '#92400E' }}>
                                  Nama dan logo dapat diubah kembali pada <strong>{cooldownKop.unlockDate!.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                                </p>
                              </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginTop: 16 }}>
                              <div>
                                <label style={labelStyle}>Nama RS / Klinik</label>
                                <input
                                  type="text"
                                  value={kop.name}
                                  onChange={(e) => handleKopFieldChange(kopIdx, 'name', e.target.value)}
                                  readOnly={cooldownKop.locked}
                                  style={cooldownKop.locked ? readOnlyStyle : inputBaseStyle}
                                  onFocus={cooldownKop.locked ? undefined : handleInputFocus}
                                  onBlur={cooldownKop.locked ? undefined : handleInputBlur}
                                  placeholder="Nama rumah sakit atau klinik (boleh diisi nanti)"
                                />
                                {cooldownKop.locked && (
                                  <p style={{ fontSize: 10, color: '#F59E0B', marginTop: 4 }}>Terkunci hingga {cooldownKop.unlockDate!.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                )}
                              </div>
                              <div>
                                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <ImagePlus style={{ width: 12, height: 12 }} /> Logo RS / Institusi
                                </label>
                                <input
                                  type="file"
                                  accept=".jpg,.jpeg,.png"
                                  ref={(el) => { if (el) logoInputRefs.current.set(kopIdx, el); }}
                                  onChange={(e) => handleLogoFileSelect(kopIdx, e)}
                                  style={{ display: 'none' }}
                                />
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                  {kop.logoUrl ? (
                                    <div style={{ height: 48, width: 48, borderRadius: 8, border: '1px solid #E2E8F0', overflow: 'hidden', backgroundColor: '#F8FAFC', flexShrink: 0 }}>
                                      <img src={kop.logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    </div>
                                  ) : (
                                    <div style={{ height: 48, width: 48, borderRadius: 8, border: '2px dashed #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8FAFC', flexShrink: 0 }}>
                                      <ImagePlus style={{ width: 20, height: 20, color: '#CBD5E1' }} />
                                    </div>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (!cooldownKop.locked) {
                                        const input = logoInputRefs.current.get(kopIdx);
                                        if (input) input.click();
                                      }
                                    }}
                                    disabled={cooldownKop.locked}
                                    style={{
                                      display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', fontSize: 12, fontWeight: 700, borderRadius: 12, transition: 'all 0.15s', cursor: cooldownKop.locked ? 'not-allowed' : 'pointer', fontFamily: 'Outfit, sans-serif',
                                      ...(cooldownKop.locked
                                        ? { backgroundColor: '#F1F5F9', color: '#94A3B8', border: '1px solid #E2E8F0' }
                                        : { backgroundColor: 'rgba(12,30,53,0.05)', color: '#0C1E35', border: '1px solid rgba(12,30,53,0.15)' }),
                                    }}
                                  >
                                    <Upload style={{ width: 14, height: 14 }} />
                                    {kop.logoUrl ? 'Ganti Logo' : 'Upload Logo'}
                                  </button>
                                  {kop.logoUrl && !cooldownKop.locked && (
                                    <button
                                      type="button"
                                      onClick={() => handleKopFieldChange(kopIdx, 'logoUrl', '')}
                                      style={{ padding: 10, color: '#EF4444', background: 'none', border: 'none', borderRadius: 12, cursor: 'pointer', transition: 'background-color 0.15s' }}
                                      title="Hapus logo"
                                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                    >
                                      <Trash2 style={{ width: 14, height: 14 }} />
                                    </button>
                                  )}
                                </div>
                                <p style={{ fontSize: 10, color: '#94A3B8', marginLeft: 2, marginTop: 4 }}>Format: .jpg, .png (maks. 5 MB)</p>
                              </div>
                              <div style={{ gridColumn: '1 / -1' }}>
                                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <MapPin style={{ width: 12, height: 12 }} /> Alamat
                                </label>
                                <input
                                  type="text"
                                  value={kop.address}
                                  onChange={(e) => handleKopFieldChange(kopIdx, 'address', e.target.value)}
                                  style={inputBaseStyle}
                                  onFocus={handleInputFocus}
                                  onBlur={handleInputBlur}
                                  placeholder="Jl. Kesehatan No. 1, Jakarta"
                                />
                              </div>
                              <div>
                                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Phone style={{ width: 12, height: 12 }} /> No. Telepon
                                </label>
                                <input
                                  type="tel"
                                  value={kop.phone}
                                  onChange={(e) => handleKopFieldChange(kopIdx, 'phone', e.target.value)}
                                  style={inputBaseStyle}
                                  onFocus={handleInputFocus}
                                  onBlur={handleInputBlur}
                                  placeholder="(021) 1234567"
                                />
                              </div>
                              <div>
                                <label style={labelStyle}>No. Fax</label>
                                <input
                                  type="tel"
                                  value={kop.fax || ''}
                                  onChange={(e) => handleKopFieldChange(kopIdx, 'fax', e.target.value)}
                                  style={inputBaseStyle}
                                  onFocus={handleInputFocus}
                                  onBlur={handleInputBlur}
                                  placeholder="(021) 1234568"
                                />
                              </div>
                              <div>
                                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <MailIcon style={{ width: 12, height: 12 }} /> Email RS
                                </label>
                                <input
                                  type="email"
                                  value={kop.email}
                                  onChange={(e) => handleKopFieldChange(kopIdx, 'email', e.target.value)}
                                  style={inputBaseStyle}
                                  onFocus={handleInputFocus}
                                  onBlur={handleInputBlur}
                                  placeholder="info@rumahsakit.co.id"
                                />
                              </div>
                              <div>
                                <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <Globe style={{ width: 12, height: 12 }} /> Website RS
                                </label>
                                <input
                                  type="url"
                                  value={kop.website || ''}
                                  onChange={(e) => handleKopFieldChange(kopIdx, 'website', e.target.value)}
                                  style={inputBaseStyle}
                                  onFocus={handleInputFocus}
                                  onBlur={handleInputBlur}
                                  placeholder="www.rumahsakit.co.id"
                                />
                              </div>
                            </div>

                            {kop.logoUrl && (
                              <div style={{ marginTop: 20, padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                                <p style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 8 }}>Preview Logo</p>
                                <img src={kop.logoUrl} alt="Logo" style={{ height: 80, width: 'auto', objectFit: 'contain' }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                              </div>
                            )}

                            <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <button
                                onClick={() => {
                                  if (!deleteCheckKop.allowed) {
                                    showToast(deleteCheckKop.reason!, 'warning', 5000);
                                    return;
                                  }
                                  setKopToDelete(kopIdx);
                                }}
                                disabled={!deleteCheckKop.allowed}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', color: deleteCheckKop.allowed ? '#EF4444' : '#94A3B8', background: 'none', border: 'none', fontSize: 12, fontWeight: 700, borderRadius: 12, cursor: deleteCheckKop.allowed ? 'pointer' : 'not-allowed', transition: 'background-color 0.15s', fontFamily: 'Outfit, sans-serif' }}
                                onMouseEnter={e => { if (deleteCheckKop.allowed) e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                                title={deleteCheckKop.allowed ? undefined : deleteCheckKop.reason}
                              >
                                <Trash2 style={{ width: 14, height: 14 }} />
                                Hapus Kop Surat
                              </button>
                              <motion.button
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleSaveKop(kopIdx)}
                                disabled={isSavingThis}
                                style={{ ...btnPrimaryStyle, opacity: isSavingThis ? 0.5 : 1 }}
                                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
                              >
                                {isSavingThis ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <Save style={{ width: 16, height: 16 }} />}
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
            );
          })()}
        </motion.div>
      )}

      {/* ═══════════════ TAB: LANGGANAN ═══════════════ */}
      {activeTab === 'langganan' && !isDokterInstitusi && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>

          {isAdmin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={iconBoxStyle('#FAF5FF')}>
                    <CreditCard style={{ width: 20, height: 20, color: '#9333EA' }} />
                  </div>
                  <div>
                    <h3 style={sectionHeadingStyle}>Paket Enterprise</h3>
                    <p style={mutedTextStyle}>Kelola paket enterprise institusi Anda.</p>
                  </div>
                </div>

                <div style={dividerStyle} />

                <div style={{ padding: 24, backgroundColor: '#0C1E35', borderRadius: 16, color: '#fff', marginBottom: 24 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>Paket Aktif</span>
                      <h4 style={{ fontSize: 24, fontWeight: 900 }}>Enterprise Access</h4>
                    </div>
                    <span style={{ padding: '4px 12px', backgroundColor: 'rgba(16,185,129,0.2)', color: '#6EE7B7', fontSize: 12, fontWeight: 700, borderRadius: 20 }}>Aktif</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                    <div>
                      <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Berlaku Hingga</p>
                      <p style={{ fontSize: 18, fontWeight: 900 }}>12 Des 2026</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Admin</p>
                      <p style={{ fontSize: 18, fontWeight: 900 }}>{userProfile.name}</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Enterprise ID</p>
                      <p style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace' }}>{userProfile.enterprise_id || '-'}</p>
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => showToast('Hubungi tim sales Aexon untuk perpanjangan enterprise.', 'info')}
                  style={{ ...btnPrimaryStyle, fontSize: 14 }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
                >
                  Perpanjang Enterprise
                </button>
              </div>

              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={iconBoxStyle('#EEF2FF')}>
                    <Users style={{ width: 20, height: 20, color: '#4F46E5' }} />
                  </div>
                  <div>
                    <h3 style={sectionHeadingStyle}>Seat Dokter</h3>
                    <p style={mutedTextStyle}>Kelola jumlah seat dokter di institusi Anda.</p>
                  </div>
                </div>

                <div style={dividerStyle} />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
                  <div style={{ padding: 20, backgroundColor: '#F8FAFC', borderRadius: 12, textAlign: 'center' }}>
                    <p style={{ fontSize: 24, fontWeight: 900, color: '#0C1E35' }}>10</p>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#64748B', marginTop: 4 }}>Total Seat</p>
                  </div>
                  <div style={{ padding: 20, backgroundColor: '#ECFDF5', borderRadius: 12, textAlign: 'center' }}>
                    <p style={{ fontSize: 24, fontWeight: 900, color: '#059669' }}>7</p>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#64748B', marginTop: 4 }}>Terpakai</p>
                  </div>
                  <div style={{ padding: 20, backgroundColor: '#EFF6FF', borderRadius: 12, textAlign: 'center' }}>
                    <p style={{ fontSize: 24, fontWeight: 900, color: '#2563EB' }}>3</p>
                    <p style={{ fontSize: 12, fontWeight: 500, color: '#64748B', marginTop: 4 }}>Tersedia</p>
                  </div>
                </div>

                <div style={{ marginBottom: 24 }}>
                  <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35', marginBottom: 12 }}>Dokter Terdaftar</h4>
                  <div style={{ borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', textAlign: 'left', fontSize: 14, borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#F8FAFC' }}>
                        <tr>
                          <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#475569' }}>Nama</th>
                          <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#475569' }}>Spesialisasi</th>
                          <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#475569' }}>Status</th>
                          <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#475569', textAlign: 'right' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { name: 'Dr. Budi Santoso, Sp.PD', spec: 'Penyakit Dalam', status: 'active' },
                          { name: 'Dr. Rina Wijaya, Sp.B', spec: 'Bedah Umum', status: 'active' },
                          { name: 'Dr. Ahmad Fauzi, Sp.OG', spec: 'Obstetri & Ginekologi', status: 'active' },
                          { name: 'Dr. Maya Sari, Sp.A', spec: 'Anak', status: 'active' },
                          { name: 'Dr. Hendra Pratama, Sp.JP', spec: 'Jantung & Pembuluh Darah', status: 'active' },
                          { name: 'Dr. Siti Nurhaliza, Sp.M', spec: 'Mata', status: 'inactive' },
                          { name: 'Dr. Dedi Kurniawan, Sp.THT', spec: 'THT-KL', status: 'active' },
                        ].map((doc, i) => (
                          <tr key={i} style={{ borderTop: '1px solid #F1F5F9' }}>
                            <td style={{ padding: '12px 20px', fontWeight: 700, color: '#0C1E35' }}>{doc.name}</td>
                            <td style={{ padding: '12px 20px', color: '#475569' }}>{doc.spec}</td>
                            <td style={{ padding: '12px 20px' }}>
                              <span style={{
                                padding: '4px 10px', fontSize: 10, fontWeight: 700, borderRadius: 20,
                                backgroundColor: doc.status === 'active' ? '#ECFDF5' : '#F1F5F9',
                                color: doc.status === 'active' ? '#059669' : '#64748B',
                              }}>
                                {doc.status === 'active' ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                              <button
                                onClick={() => showToast('Fitur kelola seat akan tersedia segera.', 'info')}
                                style={{ fontSize: 12, color: '#EF4444', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s', fontFamily: 'Outfit, sans-serif' }}
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
                  style={{ ...btnPrimaryStyle, padding: '10px 20px', fontSize: 12 }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
                >
                  + Tambah Seat Dokter
                </button>
              </div>
            </div>
          )}

          {isPersonal && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                  <div style={iconBoxStyle('#F8FAFC')}>
                    <CreditCard style={{ width: 20, height: 20, color: '#0C1E35' }} />
                  </div>
                  <div>
                    <h3 style={sectionHeadingStyle}>Langganan & Pembayaran</h3>
                    <p style={mutedTextStyle}>Kelola paket aktif dan riwayat transaksi.</p>
                  </div>
                </div>

                <div style={dividerStyle} />

                <div style={{ padding: 24, backgroundColor: '#0C1E35', borderRadius: 16, color: '#fff', marginBottom: 32 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                    <div>
                      <span style={{ fontSize: 10, fontWeight: 700, color: '#93C5FD', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'block', marginBottom: 4 }}>Paket Saat Ini</span>
                      <h4 style={{ fontSize: 24, fontWeight: 900 }}>
                        {plan === 'subscription' ? 'Annual Subscription' : 'Trial Period'}
                      </h4>
                    </div>
                    <span style={{
                      padding: '4px 12px', fontSize: 12, fontWeight: 700, borderRadius: 20,
                      backgroundColor: plan === 'subscription' ? 'rgba(16,185,129,0.2)' : 'rgba(234,179,8,0.2)',
                      color: plan === 'subscription' ? '#6EE7B7' : '#FDE047',
                    }}>
                      {plan === 'subscription' ? 'Aktif' : 'Trial'}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
                    <div>
                      <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Terdaftar</p>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>12 Des 2025</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Berlaku Hingga</p>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>12 Des 2026</p>
                    </div>
                    <div>
                      <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Status</p>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>{plan === 'subscription' ? 'Aktif' : 'Trial'}</p>
                    </div>
                  </div>
                </div>

                <div style={{ padding: 20, backgroundColor: '#EFF6FF', borderRadius: 12, border: '1px solid #DBEAFE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35' }}>Perpanjang Langganan</h4>
                    <p style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Jangan sampai akses Anda terputus.</p>
                  </div>
                  <button
                    onClick={() => { setSelectedPlanId(null); setShowPlanModal(true); }}
                    style={{ ...btnPrimaryStyle, padding: '10px 20px', fontSize: 12 }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
                  >
                    Perpanjang Sekarang
                  </button>
                </div>
              </div>

              <div style={cardStyle}>
                <h4 style={{ fontSize: 14, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16 }}>Riwayat Pembayaran</h4>
                {billingLoading ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 0' }}>
                    <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#CBD5E1' }} />
                  </div>
                ) : billingHistory.length === 0 ? (
                  <div style={{ padding: '48px 0', textAlign: 'center' }}>
                    <CreditCard style={{ width: 40, height: 40, color: '#E2E8F0', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: 14, fontWeight: 500, color: '#94A3B8' }}>Belum ada riwayat pembayaran</p>
                  </div>
                ) : (
                  <div style={{ borderRadius: 12, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', textAlign: 'left', fontSize: 14, borderCollapse: 'collapse' }}>
                      <thead style={{ backgroundColor: '#F8FAFC' }}>
                        <tr>
                          <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#475569' }}>Tanggal</th>
                          <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#475569' }}>Paket</th>
                          <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#475569' }}>Jumlah</th>
                          <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#475569' }}>Status</th>
                          <th style={{ padding: '12px 20px', fontSize: 12, fontWeight: 600, color: '#475569', textAlign: 'right' }}>Aksi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {billingHistory.map((row: any, i: number) => {
                          const statusMap: Record<string, { label: string; bg: string; color: string }> = {
                            paid: { label: 'Lunas', bg: '#ECFDF5', color: '#059669' },
                            pending: { label: 'Pending', bg: '#FFFBEB', color: '#D97706' },
                            failed: { label: 'Gagal', bg: '#FEF2F2', color: '#DC2626' },
                          };
                          const st = statusMap[row.status] || statusMap['pending'];
                          return (
                            <tr key={row.id || i} style={{ borderTop: '1px solid #F1F5F9' }}>
                              <td style={{ padding: '12px 20px', fontWeight: 500, color: '#475569' }}>
                                {new Date(row.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </td>
                              <td style={{ padding: '12px 20px', fontWeight: 700, color: '#0C1E35' }}>{row.plan_name || row.package || '-'}</td>
                              <td style={{ padding: '12px 20px', fontWeight: 700, color: '#0C1E35' }}>
                                {row.amount ? `Rp ${Number(row.amount).toLocaleString('id-ID')}` : '-'}
                              </td>
                              <td style={{ padding: '12px 20px' }}>
                                <span style={{ padding: '4px 10px', fontSize: 10, fontWeight: 700, borderRadius: 20, backgroundColor: st.bg, color: st.color }}>
                                  {st.label}
                                </span>
                              </td>
                              <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                                <button
                                  onClick={() => showToast('Fitur invoice segera hadir', 'info')}
                                  style={{ fontSize: 12, color: '#0C1E35', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.15s', fontFamily: 'Outfit, sans-serif' }}
                                >
                                  Unduh Invoice
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════ TAB: BACKUP ═══════════════ */}
      {activeTab === 'backup' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {isDokterInstitusi && (
            <div style={{ padding: 16, backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <Info style={{ width: 16, height: 16, color: '#3B82F6', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 12, color: '#1D4ED8', lineHeight: 1.6 }}>
                Langganan Anda dikelola oleh <strong>Admin Institusi</strong>. Hubungi admin Anda untuk informasi paket dan pembayaran.
              </p>
            </div>
          )}

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={iconBoxStyle('#ECFDF5')}>
                <Download style={{ width: 20, height: 20, color: '#059669' }} />
              </div>
              <div>
                <h3 style={sectionHeadingStyle}>Ekspor Backup</h3>
                <p style={mutedTextStyle}>Unduh data sesi dalam format ZIP.</p>
              </div>
            </div>

            <div style={dividerStyle} />

            <p style={{ fontSize: 12, color: '#64748B', marginBottom: 20, lineHeight: 1.6 }}>
              File backup berisi semua data sesi. Foto dan video tidak termasuk dalam backup. Anda dapat memfilter berdasarkan rentang tanggal.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              <div>
                <label style={labelStyle}>Dari Tanggal</label>
                <input
                  type="date"
                  value={backupDateFrom}
                  onChange={(e) => setBackupDateFrom(e.target.value)}
                  style={inputBaseStyle}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>
              <div>
                <label style={labelStyle}>Sampai Tanggal</label>
                <input
                  type="date"
                  value={backupDateTo}
                  onChange={(e) => setBackupDateTo(e.target.value)}
                  style={inputBaseStyle}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#64748B' }}>
                {sessions.length} sesi tersedia
              </span>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleExportBackup}
                style={{ ...btnPrimaryStyle, padding: '12px 20px', fontSize: 12 }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
              >
                <Download style={{ width: 16, height: 16 }} />
                Unduh Backup
              </motion.button>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={iconBoxStyle('#EFF6FF')}>
                <RefreshCw style={{ width: 20, height: 20, color: '#2563EB' }} />
              </div>
              <div>
                <h3 style={sectionHeadingStyle}>Restore dari Backup</h3>
                <p style={mutedTextStyle}>Impor file backup yang sebelumnya diekspor.</p>
              </div>
            </div>

            <div style={dividerStyle} />

            <div style={{ padding: 16, backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 24 }}>
              <CheckCircle style={{ width: 16, height: 16, color: '#10B981', flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: 11, color: '#065F46', lineHeight: 1.6 }}>
                Restore <strong>menggabungkan</strong> data backup dengan data yang ada. Sesi baru otomatis ditambahkan, sesi duplikat akan dikonfirmasi.
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleImportBackup}
              disabled={restoreLoading}
              style={{ ...btnPrimaryStyle, padding: '12px 20px', fontSize: 12, opacity: restoreLoading ? 0.5 : 1 }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
            >
              {restoreLoading ? <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> : <Upload style={{ width: 16, height: 16 }} />}
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
        message={`Apakah Anda yakin ingin menghapus Kop Surat ${kopToDelete !== null ? kopToDelete + 1 : ''}? Data kop surat ini akan dihapus secara permanen. Setelah dihapus, Anda tidak dapat menambahkan kop surat baru selama ${DELETE_COOLDOWN_DAYS} hari.`}
        confirmText="Ya, Hapus"
        cancelText="Batalkan"
        variant="danger"
      />

      <AnimatePresence>
        {kopVerifyModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
            onClick={() => { setKopVerifyModal(null); setKopVerifyInput(''); }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              style={{ backgroundColor: '#fff', borderRadius: 20, padding: 32, maxWidth: 460, width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield style={{ width: 20, height: 20, color: '#EA580C' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0C1E35' }}>Konfirmasi Perubahan Identitas</h3>
                  <p style={{ fontSize: 12, color: '#64748B' }}>Perubahan ini tidak dapat diubah selama {COOLDOWN_DAYS} hari</p>
                </div>
              </div>

              <div style={{ padding: 14, backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <AlertTriangle style={{ width: 16, height: 16, color: '#DC2626', flexShrink: 0, marginTop: 1 }} />
                  <div style={{ fontSize: 12, color: '#991B1B', lineHeight: 1.6 }}>
                    <strong>Peringatan:</strong> Anda sedang mengubah{' '}
                    {kopVerifyModal.type === 'both' ? 'nama dan logo' : kopVerifyModal.type === 'name' ? 'nama' : 'logo'}{' '}
                    kop surat. Setelah disimpan, {kopVerifyModal.type === 'both' ? 'nama dan logo' : kopVerifyModal.type === 'name' ? 'nama' : 'logo'}{' '}
                    akan terkunci selama <strong>{COOLDOWN_DAYS} hari</strong>.
                  </div>
                </div>
              </div>

              {kopVerifyModal.type !== 'logo' && kopVerifyModal.oldName && (
                <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>Nama sebelumnya:</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#475569', textDecoration: 'line-through' }}>{kopVerifyModal.oldName}</p>
                  <p style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4, marginTop: 8 }}>Nama baru:</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0C1E35' }}>{kopVerifyModal.newName}</p>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', display: 'block', marginBottom: 6 }}>
                  Ketik "<strong>KONFIRMASI</strong>" untuk melanjutkan:
                </label>
                <input
                  type="text"
                  value={kopVerifyInput}
                  onChange={e => setKopVerifyInput(e.target.value)}
                  placeholder="KONFIRMASI"
                  style={inputBaseStyle}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  autoFocus
                />
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                <button
                  onClick={() => { setKopVerifyModal(null); setKopVerifyInput(''); }}
                  style={{ padding: '10px 20px', fontSize: 13, fontWeight: 700, color: '#475569', backgroundColor: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: 12, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', transition: 'background-color 0.15s' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#E2E8F0'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                >
                  Batalkan
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirmKopVerify}
                  disabled={kopVerifyInput !== 'KONFIRMASI'}
                  style={{ ...btnPrimaryStyle, opacity: kopVerifyInput === 'KONFIRMASI' ? 1 : 0.4, cursor: kopVerifyInput === 'KONFIRMASI' ? 'pointer' : 'not-allowed', backgroundColor: '#DC2626' }}
                  onMouseEnter={e => { if (kopVerifyInput === 'KONFIRMASI') e.currentTarget.style.backgroundColor = '#B91C1C'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#DC2626'; }}
                >
                  <Shield style={{ width: 16, height: 16 }} />
                  Konfirmasi Perubahan
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMismatchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
            onClick={() => setShowMismatchModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.15)', padding: 32, maxWidth: 448, width: '100%' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                <div style={iconBoxStyle('#FEF2F2')}>
                  <AlertTriangle style={{ width: 20, height: 20, color: '#EF4444' }} />
                </div>
                <h3 style={sectionHeadingStyle}>Akun Tidak Cocok</h3>
              </div>
              <p style={{ fontSize: 14, color: '#475569', marginBottom: 24 }}>File backup ini milik akun lain. Restore hanya dapat dilakukan menggunakan backup dari akun yang sama.</p>
              <button
                onClick={() => setShowMismatchModal(false)}
                style={{ ...btnPrimaryStyle, width: '100%', justifyContent: 'center', padding: '12px 24px' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
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
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.15)', padding: 32, maxWidth: 512, width: '100%' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={iconBoxStyle('#FFFBEB')}>
                    <AlertTriangle style={{ width: 20, height: 20, color: '#F59E0B' }} />
                  </div>
                  <div>
                    <h3 style={sectionHeadingStyle}>Konflik Sesi</h3>
                    <p style={{ fontSize: 12, color: '#94A3B8' }}>{currentConflictIdx + 1} dari {restoreConflicts.length} konflik</p>
                  </div>
                </div>
                <button onClick={() => { setShowConflictModal(false); finalizeRestore(restoreNewSessions, conflictResults); }} style={{ padding: 8, background: 'none', border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'background-color 0.15s' }}>
                  <X style={{ width: 16, height: 16, color: '#94A3B8' }} />
                </button>
              </div>

              <p style={{ fontSize: 14, color: '#475569', marginBottom: 16 }}>Sesi dengan ID yang sama sudah ada di data lokal:</p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
                <div style={{ padding: 16, backgroundColor: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#64748B', marginBottom: 8 }}>Data Lokal</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35' }}>{restoreConflicts[currentConflictIdx].existingSession.patient.name}</p>
                  <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{new Date(restoreConflicts[currentConflictIdx].existingSession.date).toLocaleDateString('id-ID')}</p>
                </div>
                <div style={{ padding: 16, backgroundColor: '#EFF6FF', borderRadius: 12, border: '1px solid #BFDBFE' }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#60A5FA', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Dari Backup</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35' }}>{restoreConflicts[currentConflictIdx].backupSession.patient.name}</p>
                  <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{new Date(restoreConflicts[currentConflictIdx].backupSession.date).toLocaleDateString('id-ID')}</p>
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={e => setApplyToAll(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#0C1E35' }}
                />
                <span style={{ fontSize: 12, color: '#475569', fontWeight: 500 }}>Terapkan ke semua konflik tersisa</span>
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  onClick={() => handleConflictAction('skip')}
                  style={{ padding: '12px 0', backgroundColor: '#F1F5F9', color: '#475569', borderRadius: 12, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'background-color 0.15s', fontFamily: 'Outfit, sans-serif' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#E2E8F0'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                >
                  {applyToAll ? 'Lewati Semua' : 'Lewati'}
                </button>
                <button
                  onClick={() => handleConflictAction('overwrite')}
                  style={{ ...btnPrimaryStyle, justifyContent: 'center', padding: '12px 0', width: '100%' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
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
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 }}
            onClick={() => setCropModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{ backgroundColor: '#fff', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.15)', width: '100%', maxWidth: 512, overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ padding: 20, borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={iconBoxStyle('rgba(12,30,53,0.1)')}>
                    <Crop style={{ width: 20, height: 20, color: '#0C1E35' }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0C1E35' }}>Crop & Zoom Logo</h3>
                    <p style={{ fontSize: 12, color: '#64748B' }}>Sesuaikan area logo yang akan digunakan.</p>
                  </div>
                </div>
                <button
                  onClick={() => setCropModalOpen(false)}
                  style={{ padding: 8, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', transition: 'background-color 0.15s' }}
                >
                  <X style={{ width: 20, height: 20 }} />
                </button>
              </div>

              <div style={{ position: 'relative', width: '100%', height: 320, backgroundColor: '#0F172A' }}>
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

              <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <ZoomOut style={{ width: 16, height: 16, color: '#94A3B8', flexShrink: 0 }} />
                  <input
                    type="range"
                    min={1}
                    max={3}
                    step={0.1}
                    value={cropZoom}
                    onChange={(e) => setCropZoom(Number(e.target.value))}
                    style={{ flex: 1, accentColor: '#0C1E35', height: 6 }}
                  />
                  <ZoomIn style={{ width: 16, height: 16, color: '#94A3B8', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', width: 40, textAlign: 'right' }}>{Math.round(cropZoom * 100)}%</span>
                </div>

                <div style={{ display: 'flex', gap: 12 }}>
                  <button
                    onClick={() => setCropModalOpen(false)}
                    style={{ flex: 1, padding: '12px 16px', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 700, borderRadius: 12, fontSize: 14, border: 'none', cursor: 'pointer', transition: 'background-color 0.15s', fontFamily: 'Outfit, sans-serif' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#E2E8F0'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleCropConfirm}
                    style={{ ...btnPrimaryStyle, flex: 1, justifyContent: 'center', padding: '12px 16px', boxShadow: '0 8px 24px rgba(12,30,53,0.1)' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
                  >
                    <CheckCircle2 style={{ width: 16, height: 16 }} />
                    Terapkan Logo
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPlanModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
            onClick={() => setShowPlanModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{ backgroundColor: '#fff', borderRadius: 16, maxWidth: 560, width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.15)', overflow: 'hidden', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ padding: 24, borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <div>
                  <h3 style={sectionHeadingStyle}>Pilih Paket</h3>
                  <p style={{ ...mutedTextStyle, marginTop: 2 }}>Pilih paket yang sesuai kebutuhan Anda</p>
                </div>
                <button onClick={() => setShowPlanModal(false)} style={{ padding: 8, background: 'none', border: 'none', borderRadius: 12, cursor: 'pointer', transition: 'background-color 0.15s' }}>
                  <X style={{ width: 20, height: 20, color: '#94A3B8' }} />
                </button>
              </div>

              <div style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
                {plansLoading ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 14 }}>
                    <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: '#CBD5E1', margin: '0 auto 12px' }} />
                    Memuat paket...
                  </div>
                ) : plans.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 40, color: '#94A3B8', fontSize: 14 }}>
                    Tidak ada paket tersedia
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {plans.map((planItem) => {
                      const isSelected = selectedPlanId === planItem.id;
                      const isAnnual = planItem.billing_cycle === 'annual';
                      return (
                        <div
                          key={planItem.id}
                          onClick={() => setSelectedPlanId(planItem.id)}
                          style={{
                            border: isSelected
                              ? '2px solid #0C1E35'
                              : '1px solid #E2E8F0',
                            borderRadius: 16,
                            padding: '20px 24px',
                            cursor: 'pointer',
                            backgroundColor: isSelected ? '#F8FAFC' : 'white',
                            transition: 'all 150ms',
                            position: 'relative',
                          }}
                        >
                          {isAnnual && (
                            <span style={{
                              position: 'absolute', top: -10, right: 16,
                              backgroundColor: '#0C1E35', color: 'white',
                              fontSize: 10, fontWeight: 700, padding: '3px 12px',
                              borderRadius: 999, letterSpacing: '0.05em',
                            }}>
                              PALING HEMAT
                            </span>
                          )}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: '#0C1E35', marginBottom: 4 }}>
                                {planItem.products?.name || 'Paket'} — {isAnnual ? 'Tahunan' : 'Bulanan'}
                              </div>
                              {planItem.original_price && planItem.original_price > planItem.price && (
                                <div style={{ fontSize: 13, color: '#94A3B8', textDecoration: 'line-through', marginBottom: 2 }}>
                                  {formatRupiah(planItem.original_price)}
                                </div>
                              )}
                              <div style={{ fontSize: 24, fontWeight: 800, color: '#0C1E35' }}>
                                {formatRupiah(planItem.price)}
                                <span style={{ fontSize: 13, fontWeight: 400, color: '#94A3B8', marginLeft: 4 }}>
                                  /bulan
                                </span>
                              </div>
                              {isAnnual && monthlySavings > 0 && (
                                <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 4 }}>
                                  Ditagih {formatRupiah(annualTotal)}/tahun · Hemat {formatRupiah(monthlySavings)}
                                </p>
                              )}
                            </div>
                            <div style={{
                              width: 24, height: 24, borderRadius: '50%',
                              border: isSelected ? 'none' : '2px solid #E2E8F0',
                              backgroundColor: isSelected ? '#0C1E35' : 'transparent',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0, marginTop: 4,
                            }}>
                              {isSelected && (
                                <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'white' }} />
                              )}
                            </div>
                          </div>

                          {Array.isArray(planItem.features) && planItem.features.length > 0 && (
                            <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {planItem.features.slice(0, 4).map((f: string, i: number) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748B' }}>
                                  <div style={{ width: 16, height: 16, borderRadius: '50%', backgroundColor: '#ECFDF5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                                      <path d="M2 5l2 2 4-4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                    </svg>
                                  </div>
                                  {f}
                                </div>
                              ))}
                              {planItem.features.length > 4 && (
                                <div style={{ fontSize: 12, color: '#94A3B8', marginLeft: 24 }}>
                                  +{planItem.features.length - 4} fitur lainnya
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedPlanId && (
                  <div style={{ marginTop: 20 }}>
                    <button
                      onClick={() => {
                        const selected = plans.find(p => p.id === selectedPlanId);
                        if (selected) {
                          setShowPlanModal(false);
                          onCheckout(selected);
                        }
                      }}
                      style={{
                        width: '100%', padding: '14px 0',
                        backgroundColor: '#0C1E35', color: 'white',
                        border: 'none', borderRadius: 12,
                        fontSize: 15, fontWeight: 700, cursor: 'pointer',
                        boxShadow: '0 4px 20px rgba(12,30,53,0.25)',
                        transition: 'background-color 150ms',
                        fontFamily: 'Outfit, sans-serif',
                      }}
                      onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1a3a5c'}
                      onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0C1E35'}
                    >
                      Lanjutkan Pembayaran
                    </button>
                    <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', marginTop: 10 }}>
                      Pembayaran otomatis segera hadir
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
