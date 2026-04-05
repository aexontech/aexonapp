import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "motion/react";
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
  ExternalLink,
  Type,
  Minus as MinusIcon,
  Plus as PlusIcon,
  Send,
  Paperclip,
  ArrowLeft,
  Image as ImageIcon,
} from "lucide-react";

const HeadsetIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, ...style }}>
    <path d="M4 17V12a8 8 0 0 1 16 0v5" />
    <rect x="2" y="14" width="4" height="6" rx="1.5" />
    <path d="M6 20v1.5a1.5 1.5 0 0 0 1.5 1.5H10" />
    <path d="M10 23a2.5 2.5 0 0 0 2.5-2.5v0a1 1 0 0 0-1-1H10" />
  </svg>
);
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { UserProfile, HospitalSettings, Session, Capture } from "../types";

import { useToast } from "./ToastProvider";
import ConfirmModal from "./ConfirmModal";
import {
  saveUserData,
  loadUserData,
  getLocalStorageUsage,
  decryptData,
} from "../lib/storage";
import {
  aexonConnect,
  Plan,
  SubscriptionStatus,
  SupportTicket,
  SupportTicketDetail,
  SupportCategory,
  SupportMessage,
} from "../lib/aexonConnect";
import DiskSpaceIndicator from './DiskSpaceIndicator';

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area,
): Promise<string> {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = reject;
    image.src = imageSrc;
  });

  const canvas = document.createElement("canvas");
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height,
  );
  return canvas.toDataURL("image/png");
}

interface SettingsProps {
  userProfile: UserProfile;
  hospitalSettingsList: HospitalSettings[];
  onUpdateUser: (profile: UserProfile) => void;
  onUpdateHospitalList: (settings: HospitalSettings[]) => void;
  onUpdateSessions: (sessions: Session[]) => void;
  onCancelSubscription: () => void;
  onCheckout: (plan: Plan) => void;
  onNavigateToProfile?: () => void;
  onNavigateToSubscription?: () => void;
  plan: "subscription" | "enterprise" | "trial" | null;
  sessions: Session[];
  subscriptionData?: SubscriptionStatus | null;
}

interface RestoreConflict {
  backupSession: Session;
  existingSession: Session;
}

type ConflictAction = "skip" | "overwrite";

export default function Settings({
  userProfile,
  hospitalSettingsList,
  onUpdateUser,
  onUpdateHospitalList,
  onUpdateSessions,
  onCancelSubscription,
  onCheckout,
  onNavigateToProfile,
  onNavigateToSubscription,
  plan,
  sessions,
  subscriptionData,
  initialTab,
}: SettingsProps & { initialTab?: string }) {
  const { showToast } = useToast();
  type SettingsTabId = "profil" | "keamanan" | "kop-surat" | "langganan" | "backup" | "tampilan" | "bantuan";
  const validTabs: SettingsTabId[] = ["profil", "keamanan", "kop-surat", "langganan", "backup", "tampilan", "bantuan"];
  const [activeTab, setActiveTab] = useState<SettingsTabId>(
    validTabs.includes(initialTab as SettingsTabId) ? (initialTab as SettingsTabId) : "keamanan"
  );

  useEffect(() => {
    if (initialTab && validTabs.includes(initialTab as SettingsTabId)) {
      setActiveTab(initialTab as SettingsTabId);
    }
  }, [initialTab]);

  const [profileForm, setProfileForm] = useState<UserProfile>(userProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showClearDataModal, setShowClearDataModal] = useState(false);
  const [fontSizePref, setFontSizePref] = useState<number>(
    userProfile.preferences?.fontSize ?? 17
  );
  const [fontSizeSaving, setFontSizeSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [backupDateFrom, setBackupDateFrom] = useState("");
  const [backupDateTo, setBackupDateTo] = useState("");
  const [restoreConflicts, setRestoreConflicts] = useState<RestoreConflict[]>(
    [],
  );
  const [restoreNewSessions, setRestoreNewSessions] = useState<Session[]>([]);
  const [currentConflictIdx, setCurrentConflictIdx] = useState(0);
  const [conflictResults, setConflictResults] = useState<
    Map<string, ConflictAction>
  >(new Map());
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [showMismatchModal, setShowMismatchModal] = useState(false);
  const [restoreLoading, setRestoreLoading] = useState(false);
  const [applyToAll, setApplyToAll] = useState(false);

  const [expandedKopIdx, setExpandedKopIdx] = useState<number | null>(0);
  const [kopSaving, setKopSaving] = useState<number | null>(null);
  const [cooldownResetLoading, setCooldownResetLoading] = useState<string | null>(null);
  const [cooldownResetSent, setCooldownResetSent] = useState<Set<string>>(new Set());
  const [kopToDelete, setKopToDelete] = useState<number | null>(null);
  const [kopForms, setKopForms] =
    useState<HospitalSettings[]>(hospitalSettingsList);
  const [kopVerifyModal, setKopVerifyModal] = useState<{
    idx: number;
    type: "name" | "logo" | "both";
    newName?: string;
    oldName?: string;
  } | null>(null);
  const [kopVerifyInput, setKopVerifyInput] = useState("");

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
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  // ── Support / Bantuan state ──
  const [supportView, setSupportView] = useState<"list" | "form" | "detail">("list");
  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>([]);
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportDetail, setSupportDetail] = useState<SupportTicketDetail | null>(null);
  const [supportDetailLoading, setSupportDetailLoading] = useState(false);
  const [supportUnread, setSupportUnread] = useState(0);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportCategory, setSupportCategory] = useState<SupportCategory>("bug");
  const [supportMessage, setSupportMessage] = useState("");
  const [supportScreenshot, setSupportScreenshot] = useState<File | null>(null);
  const [supportScreenshotPreview, setSupportScreenshotPreview] = useState<string | null>(null);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  const [supportReply, setSupportReply] = useState("");
  const [supportReplying, setSupportReplying] = useState(false);
  const supportFileRef = useRef<HTMLInputElement>(null);
  const supportChatEndRef = useRef<HTMLDivElement>(null);

  // Fetch unread count on mount + every 5 minutes (silent — no toast on error)
  useEffect(() => {
    let mounted = true;
    const fetchUnread = async () => {
      try {
        const { data, error } = await aexonConnect.getSupportUnreadCount();
        if (mounted && data) setSupportUnread(data.unread_count);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 5 * 60 * 1000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  // Fetch tickets when switching to bantuan tab
  useEffect(() => {
    if (activeTab === "bantuan" && supportView === "list") {
      loadSupportTickets();
    }
  }, [activeTab, supportView]);

  // Scroll chat to bottom when detail loads or reply sent
  useEffect(() => {
    if (supportDetail?.messages) {
      setTimeout(() => supportChatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }
  }, [supportDetail?.messages?.length]);

  const loadSupportTickets = async () => {
    setSupportLoading(true);
    try {
      const { data, error } = await aexonConnect.getSupportTickets({ limit: 50 });
      if (data) setSupportTickets(data);
    } catch {}
    finally { setSupportLoading(false); }
  };

  const openTicketDetail = async (ticketId: string) => {
    setSupportDetailLoading(true);
    setSupportView("detail");
    try {
      const { data, error } = await aexonConnect.getSupportTicketDetail(ticketId);
      if (data) {
        setSupportDetail(data);
        // Refresh unread count silently since viewing auto-marks as read
        try {
          const { data: uc } = await aexonConnect.getSupportUnreadCount();
          if (uc) setSupportUnread(uc.unread_count);
        } catch {}
      }
      if (error) showToast(error, "error");
    } catch { showToast("Gagal memuat detail tiket.", "error"); }
    finally { setSupportDetailLoading(false); }
  };

  const handleSubmitTicket = async () => {
    if (!supportSubject.trim() || !supportMessage.trim()) {
      showToast("Subject dan pesan wajib diisi.", "error");
      return;
    }
    setSupportSubmitting(true);
    try {
      let attachmentUrl: string | undefined;
      if (supportScreenshot) {
        const { data: uploadData, error: uploadErr } =
          await aexonConnect.uploadSupportAttachment(supportScreenshot);
        if (uploadErr) { showToast("Gagal upload screenshot: " + uploadErr, "error"); setSupportSubmitting(false); return; }
        attachmentUrl = uploadData?.url;
      }
      const { error } = await aexonConnect.createSupportTicket({
        subject: supportSubject.trim(),
        message: supportMessage.trim(),
        category: supportCategory,
        priority: "normal",
        attachment_url: attachmentUrl,
      });
      if (error) { showToast(error, "error"); }
      else {
        showToast("Tiket berhasil dikirim!", "success");
        setSupportSubject(""); setSupportMessage(""); setSupportCategory("bug");
        setSupportScreenshot(null); setSupportScreenshotPreview(null);
        setSupportView("list");
      }
    } catch { showToast("Gagal mengirim tiket.", "error"); }
    finally { setSupportSubmitting(false); }
  };

  const handleSupportReply = async () => {
    if (!supportReply.trim() || !supportDetail) return;
    setSupportReplying(true);
    try {
      const { data, error } = await aexonConnect.replySupportTicket(supportDetail.id, supportReply.trim());
      if (error) { showToast(error, "error"); }
      else if (data) {
        setSupportDetail(prev => prev ? { ...prev, messages: [...prev.messages, data] } : prev);
        setSupportReply("");
      }
    } catch { showToast("Gagal mengirim balasan.", "error"); }
    finally { setSupportReplying(false); }
  };

  const handleScreenshotSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { showToast("Ukuran file maksimal 5 MB.", "error"); return; }
    if (!file.type.startsWith("image/")) { showToast("Hanya file gambar yang diperbolehkan.", "error"); return; }
    setSupportScreenshot(file);
    const reader = new FileReader();
    reader.onload = (ev) => setSupportScreenshotPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    setKopForms(hospitalSettingsList);
  }, [hospitalSettingsList]);

  const isAdmin = userProfile.role === "admin";
  const isEnterprise = plan === "enterprise";
  const isDokterInstitusi = !isAdmin && isEnterprise;
  const isAdminEnterprise = isAdmin && isEnterprise;
  const isPersonal = !isAdmin && !isEnterprise;
  const canEditKop = isPersonal || isAdminEnterprise;
  const maxKopSlots = isAdminEnterprise ? 1 : 3;


  useEffect(() => {
    async function fetchPlansAndSettings() {
      try {
        const { data: remotePlans, error } = await aexonConnect.getPlans();
        if (error || !remotePlans) {
          console.error("Failed to fetch plans:", error);
          showToast(
            "Gagal memuat daftar paket. Silakan coba lagi nanti.",
            "error",
          );
        } else {
          setPlans(remotePlans);
        }
      } catch (err) {
        console.error("Failed to fetch plans:", err);
        showToast("Gagal memuat daftar paket.", "error");
      } finally {
        setPlansLoading(false);
      }
    }
    fetchPlansAndSettings();
  }, []);

  const formatRupiah = (amount: number) =>
    "Rp" + amount.toLocaleString("id-ID");

  const monthlyPlan = plans.find((p) => p.billing_cycle === "monthly");
  const annualPlan = plans.find((p) => p.billing_cycle === "annual");
  const annualTotal = (annualPlan?.price ?? 0) * 12;
  const monthlySavings = (monthlyPlan?.price ?? 0) * 12 - annualTotal;

  const COOLDOWN_DAYS = 30;
  const DELETE_COOLDOWN_DAYS = 7;
  const MIN_AGE_BEFORE_DELETE_DAYS = 3;

  const getKopOpsLog = useCallback((): { date: string; action: string }[] => {
    try {
      const key = `aexon_kop_ops_${userProfile.id}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [userProfile.id]);

  const addKopOp = useCallback(
    (action: string) => {
      const key = `aexon_kop_ops_${userProfile.id}`;
      const ops = getKopOpsLog();
      ops.push({ date: new Date().toISOString(), action });
      localStorage.setItem(key, JSON.stringify(ops));
    },
    [userProfile.id, getKopOpsLog],
  );

  const getLastDeleteDate = useCallback((): Date | null => {
    const ops = getKopOpsLog();
    const deletes = ops
      .filter((op) => op.action === "delete")
      .sort((a, b) => b.date.localeCompare(a.date));
    return deletes.length > 0 ? new Date(deletes[0].date) : null;
  }, [getKopOpsLog]);

  const canAddNewKop = useCallback((): {
    allowed: boolean;
    reason?: string;
    unlockDate?: Date;
  } => {
    if (kopForms.length >= maxKopSlots)
      return { allowed: false, reason: `Maksimal ${maxKopSlots} kop surat.` };
    const lastDel = getLastDeleteDate();
    if (lastDel) {
      const diffDays = (Date.now() - lastDel.getTime()) / (1000 * 60 * 60 * 24);
      if (diffDays < DELETE_COOLDOWN_DAYS) {
        const unlockDate = new Date(
          lastDel.getTime() + DELETE_COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
        );
        return {
          allowed: false,
          reason: `Tidak dapat menambah kop surat baru setelah penghapusan.`,
          unlockDate,
        };
      }
    }
    return { allowed: true };
  }, [kopForms.length, getLastDeleteDate, maxKopSlots]);

  const canDeleteKop = useCallback(
    (kop: HospitalSettings): { allowed: boolean; reason?: string } => {
      if (kop.createdAt) {
        const createdDate = new Date(kop.createdAt);
        const ageDays =
          (Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24);
        if (ageDays < MIN_AGE_BEFORE_DELETE_DAYS) {
          return {
            allowed: false,
            reason: `Kop surat baru dapat dihapus setelah ${MIN_AGE_BEFORE_DELETE_DAYS} hari sejak dibuat.`,
          };
        }
      } else if (kop.name.trim()) {
        return {
          allowed: false,
          reason: `Simpan kop surat terlebih dahulu sebelum menghapus.`,
        };
      }
      return { allowed: true };
    },
    [],
  );

  const getCooldownInfo = (kop: HospitalSettings) => {
    const nameTs = kop.last_name_changed;
    const logoTs = kop.last_logo_changed;
    const latestChange = [nameTs, logoTs].filter(Boolean).sort().pop();
    if (!latestChange) return { locked: false, unlockDate: null };
    const lastDate = new Date(latestChange);
    const diffDays = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays < COOLDOWN_DAYS) {
      const unlockDate = new Date(
        lastDate.getTime() + COOLDOWN_DAYS * 24 * 60 * 60 * 1000,
      );
      return { locked: true, unlockDate };
    }
    return { locked: false, unlockDate: null };
  };

  const handleKopFieldChange = (idx: number, field: string, value: string) => {
    setKopForms((prev) =>
      prev.map((k, i) => (i === idx ? { ...k, [field]: value } : k)),
    );
  };

  const handleLogoFileSelect = (
    idx: number,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
      showToast("Format file harus .jpg atau .png", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showToast("Ukuran file maksimal 5 MB", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setCropImageSrc(reader.result as string);
      setCropKopIdx(idx);
      setCropState({ x: 0, y: 0 });
      setCropZoom(1);
      setCroppedAreaPixels(null);
      // Reset document zoom DULU agar react-easy-crop coordinates akurat
      try {
        document.documentElement.style.zoom = "1";
      } catch {
        // Zoom reset non-critical
      }
      // Tunggu reflow selesai baru buka modal, supaya Cropper mount dengan zoom=1
      requestAnimationFrame(() => {
        setCropModalOpen(true);
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const onCropComplete = useCallback((_: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const closeCropModal = () => {
    setCropModalOpen(false);
    setCropImageSrc(null);
    // Restore document zoom
    const fs = userProfile?.preferences?.fontSize;
    const zoom = (typeof fs === "number" && fs !== 14) ? fs / 14 : 1;
    document.documentElement.style.zoom = `${zoom}`;
  };

  const handleCropConfirm = async () => {
    if (!cropImageSrc || croppedAreaPixels === null || cropKopIdx === null)
      return;
    try {
      const croppedDataUrl = await getCroppedImg(
        cropImageSrc,
        croppedAreaPixels,
      );
      handleKopFieldChange(cropKopIdx, "logoUrl", croppedDataUrl);
      closeCropModal();
      showToast("Logo berhasil dipotong dan diterapkan.", "success");
    } catch {
      closeCropModal();
      showToast("Gagal memproses gambar.", "error");
    }
  };

  const handleRequestCooldownReset = async (kopId: string, kopName: string) => {
    setCooldownResetLoading(kopId);
    try {
      const { error } = await aexonConnect.requestCooldownReset(kopId);
      if (error) {
        showToast(error, "error");
      } else {
        setCooldownResetSent((prev) => new Set(prev).add(kopId));
        showToast(
          `Request reset cooldown untuk "${kopName}" berhasil dikirim ke tim Aexon. Anda akan dihubungi melalui email.`,
          "success",
          5000,
        );
      }
    } catch {
      showToast("Gagal mengirim request. Coba lagi nanti.", "error");
    } finally {
      setCooldownResetLoading(null);
    }
  };

  const handleSaveKop = (idx: number) => {
    const kop = kopForms[idx];
    const kopId = kop.id || `kop-${Date.now()}`;

    const original = hospitalSettingsList.find((h) => h.id === kopId);
    const nameChanged = original && kop.name.trim() !== original.name;
    const logoChanged =
      original && (kop.logoUrl || "") !== (original.logoUrl || "");

    if (nameChanged || logoChanged) {
      if (!kop.name.trim() && nameChanged) {
        showToast(
          "Nama RS / Klinik tidak boleh dikosongkan setelah diisi.",
          "error",
        );
        return;
      }
      const cooldown = getCooldownInfo(kop);
      if (cooldown.locked) {
        showToast(
          `Nama dan logo masih dalam masa cooldown. Dapat diubah pada ${cooldown.unlockDate!.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.`,
          "warning",
          5000,
        );
        return;
      }
      const changeType: "name" | "logo" | "both" =
        nameChanged && logoChanged ? "both" : nameChanged ? "name" : "logo";
      setKopVerifyModal({
        idx,
        type: changeType,
        newName: kop.name.trim(),
        oldName: original?.name,
      });
      setKopVerifyInput("");
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
      const original = hospitalSettingsList.find((h) => h.id === kopId);
      const nameChanged = original && kop.name.trim() !== original.name;
      const logoChanged =
        original && (kop.logoUrl || "") !== (original.logoUrl || "");
      if (nameChanged) updatedKop.last_name_changed = now;
      if (logoChanged) updatedKop.last_logo_changed = now;
    }

    const isNewRecord = !hospitalSettingsList.find((h) => h.id === kopId);
    if (!updatedKop.createdAt && isNewRecord) updatedKop.createdAt = now;
    if (!updatedKop.createdAt && !isNewRecord)
      updatedKop.createdAt = new Date(
        Date.now() - 365 * 24 * 60 * 60 * 1000,
      ).toISOString();

    const updated = [...kopForms];
    updated[idx] = updatedKop;
    setKopForms(updated);
    onUpdateHospitalList(updated);
    addKopOp(isIdentityChange ? "identity_change" : "save");
    setTimeout(() => {
      setKopSaving(null);
      showToast(`Kop Surat ${idx + 1} berhasil disimpan.`, "success");
    }, 400);
  };

  const handleConfirmKopVerify = () => {
    if (!kopVerifyModal) return;
    commitKopSave(kopVerifyModal.idx, true);
    setKopVerifyModal(null);
    setKopVerifyInput("");
  };

  const handleAddKop = () => {
    const check = canAddNewKop();
    if (!check.allowed) {
      const msg = check.unlockDate
        ? `${check.reason} Dapat menambah kembali pada ${check.unlockDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}.`
        : check.reason!;
      showToast(msg, "warning", 5000);
      return;
    }
    const now = new Date().toISOString();
    const newKop: HospitalSettings = {
      id: `kop-${Date.now()}`,
      name: "",
      address: "",
      phone: "",
      fax: "",
      email: "",
      website: "",
      logoUrl: "",
      createdAt: now,
    };
    setKopForms([...kopForms, newKop]);
    setExpandedKopIdx(kopForms.length);
    addKopOp("add");
  };

  const confirmDeleteKop = () => {
    if (kopToDelete === null) return;
    const kop = kopForms[kopToDelete];
    const deleteCheck = canDeleteKop(kop);
    if (!deleteCheck.allowed) {
      showToast(deleteCheck.reason!, "warning", 5000);
      setKopToDelete(null);
      return;
    }
    const updated = kopForms.filter((_, i) => i !== kopToDelete);
    setKopForms(updated);
    onUpdateHospitalList(updated);
    addKopOp("delete");
    setKopToDelete(null);
    showToast("Kop surat berhasil dihapus.", "success");
    if (expandedKopIdx === kopToDelete) setExpandedKopIdx(null);
  };

  // Name cooldown: source of truth is server (userProfile.lastNameChangeDate from doctor_accounts.last_name_change_at)
  const settingsNameCooldown = (() => {
    if (isDokterInstitusi) return { canEdit: false, daysLeft: 0 };
    const serverDate = userProfile.lastNameChangeDate;
    if (!serverDate) return { canEdit: true, daysLeft: 0 };
    const lastChange = new Date(serverDate);
    const diffDays = Math.ceil((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 14) return { canEdit: false, daysLeft: 14 - diffDays };
    return { canEdit: true, daysLeft: 0 };
  })();
  const settingsNameDisabled = isDokterInstitusi || !settingsNameCooldown.canEdit;

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.name === "name" && settingsNameDisabled) return;
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);

    try {
      const nameActuallyChanged = !settingsNameDisabled && profileForm.name !== userProfile.name;

      const updatePayload: Record<string, any> = {
        specialization: profileForm.specialization,
      };

      if (!isDokterInstitusi) {
        updatePayload.full_name = nameActuallyChanged ? profileForm.name : userProfile.name;
        updatePayload.str_number = profileForm.strNumber || null;
        updatePayload.phone = profileForm.phone;
      }

      if (nameActuallyChanged) {
        updatePayload.last_name_change_at = new Date().toISOString();
      }

      const { error } = await aexonConnect.updateProfile(updatePayload);

      if (error) {
        showToast("Gagal menyimpan ke server: " + error, "error");
        setProfileSaving(false);
        return;
      }

      const newCooldown = nameActuallyChanged ? new Date().toISOString() : userProfile.lastNameChangeDate;
      onUpdateUser({ ...profileForm, name: nameActuallyChanged ? profileForm.name : userProfile.name, lastNameChangeDate: newCooldown });
      setIsSaved(true);
      showToast("Profil berhasil disimpan.", "success");
      setTimeout(() => setIsSaved(false), 3000);
    } catch {
      showToast("Gagal terhubung ke server. Silakan coba lagi.", "error");
    }
    setProfileSaving(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentPassword) {
      showToast("Masukkan password saat ini.", "warning");
      return;
    }
    if (newPassword.length < 8) {
      showToast("Password baru minimal 8 karakter.", "warning");
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast("Konfirmasi password tidak cocok.", "warning");
      return;
    }

    setPasswordSaving(true);
    try {
      const { error } = await aexonConnect.changePassword(
        currentPassword,
        newPassword,
      );

      if (error) {
        showToast(
          error.includes("current") || error.includes("invalid")
            ? "Password saat ini salah."
            : error || "Gagal mengubah password.",
          "error",
        );
        setPasswordSaving(false);
        return;
      }

      showToast("Password berhasil diubah.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      showToast("Gagal terhubung ke server.", "error");
    }
    setPasswordSaving(false);
  };

  const handleExportBackup = async () => {
    let filteredSessions = sessions;

    if (backupDateFrom || backupDateTo) {
      filteredSessions = sessions.filter((s) => {
        const sessionDate = new Date(s.date).getTime();
        const from = backupDateFrom ? new Date(backupDateFrom).getTime() : 0;
        const to = backupDateTo
          ? new Date(backupDateTo).setHours(23, 59, 59, 999)
          : Infinity;
        return sessionDate >= from && sessionDate <= to;
      });
    }

    if (filteredSessions.length === 0) {
      showToast(
        "Tidak ada sesi dalam rentang tanggal yang dipilih.",
        "warning",
      );
      return;
    }

    const JSZip = (await import("jszip")).default;
    const zip = new JSZip();
    const dateStr = new Date().toISOString().slice(0, 10);
    const folderName = `Aexon_Backup_${userProfile.id}_${dateStr}`;
    const folder = zip.folder(folderName)!;

    folder.file("sessions.json", JSON.stringify(filteredSessions, null, 2));
    folder.file(
      "manifest.json",
      JSON.stringify(
        {
          userId: userProfile.id,
          exportDate: new Date().toISOString(),
          appVersion: "2.5.0",
          sessionCount: filteredSessions.length,
          note: "Foto dan video tidak termasuk backup, tersimpan lokal di perangkat",
        },
        null,
        2,
      ),
    );

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Aexon_Backup_${userProfile.id}_${dateStr}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(
      `Backup ${filteredSessions.length} sesi berhasil diunduh.`,
      "success",
    );
  };

  const handleImportBackup = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".zip";
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setRestoreLoading(true);

      try {
        const JSZip = (await import("jszip")).default;
        const zip = await JSZip.loadAsync(file);

        let manifestEncFile: any = null;
        let sessionEncFile: any = null;
        let manifestFile: any = null;
        let sessionsFile: any = null;
        zip.forEach((path, entry) => {
          if (path.endsWith("manifest.enc")) manifestEncFile = entry;
          if (path.endsWith("session.enc")) sessionEncFile = entry;
          if (path.endsWith("manifest.json")) manifestFile = entry;
          if (path.endsWith("sessions.json")) sessionsFile = entry;
        });

        if (manifestEncFile && sessionEncFile) {
          const manifestEncText = await manifestEncFile.async("text");
          let manifest: any;
          try {
            const decryptedManifest = await decryptData(
              manifestEncText,
              userProfile.id,
            );
            manifest = JSON.parse(decryptedManifest);
          } catch {
            setShowMismatchModal(true);
            setRestoreLoading(false);
            return;
          }

          if (
            manifest.type !== "aexon_case_export" ||
            manifest.userId !== userProfile.id
          ) {
            setShowMismatchModal(true);
            setRestoreLoading(false);
            return;
          }

          const sessionEncText = await sessionEncFile.async("text");
          let caseSession: Session;
          try {
            const decryptedSession = await decryptData(
              sessionEncText,
              userProfile.id,
            );
            caseSession = JSON.parse(decryptedSession);
          } catch {
            showToast(
              "Gagal mendekripsi data case. File mungkin rusak atau bukan milik akun ini.",
              "error",
            );
            setRestoreLoading(false);
            return;
          }

          const mediaEntries: { id: string; ext: string; entry: any }[] = [];
          zip.forEach((path, entry) => {
            const mediaMatch = path.match(/media\/([^.]+)\.(png|mp4)$/);
            if (mediaMatch) {
              mediaEntries.push({
                id: mediaMatch[1],
                ext: mediaMatch[2],
                entry,
              });
            }
          });

          const restoredCaptures: Capture[] = [];
          for (const me of mediaEntries) {
            const blob = await me.entry.async("blob");
            const mimeType = me.ext === "png" ? "image/png" : "video/mp4";
            const blobWithType = new Blob([blob], { type: mimeType });
            const url = URL.createObjectURL(blobWithType);

            const originalCapture = caseSession.captures.find(
              (c) => c.id === me.id,
            );
            restoredCaptures.push({
              id: me.id,
              type: me.ext === "png" ? "image" : "video",
              url,
              timestamp: originalCapture?.timestamp || new Date(),
              caption: originalCapture?.caption,
            });
          }

          caseSession.date = new Date(caseSession.date);
          caseSession.captures = restoredCaptures.map((c) => ({
            ...c,
            timestamp: new Date(c.timestamp),
          }));

          const backupSessions = [caseSession];
          const existingIds = new Set(sessions.map((s) => s.id));
          const newSessions: Session[] = [];
          const conflicts: RestoreConflict[] = [];

          for (const bs of backupSessions) {
            if (existingIds.has(bs.id)) {
              const existing = sessions.find((s) => s.id === bs.id)!;
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
            showToast(
              `Case "${caseSession.patient.name}" berhasil di-restore dengan ${restoredCaptures.length} media.`,
              "success",
              5000,
            );
          }

          setRestoreLoading(false);
          return;
        }

        if (!manifestFile || !sessionsFile) {
          showToast(
            "Format file backup tidak valid. File manifest atau sessions tidak ditemukan.",
            "error",
          );
          setRestoreLoading(false);
          return;
        }

        const manifestText = await manifestFile.async("text");
        const manifest = JSON.parse(manifestText);

        if (manifest.userId !== userProfile.id) {
          setShowMismatchModal(true);
          setRestoreLoading(false);
          return;
        }

        const sessionsText = await sessionsFile.async("text");
        const backupSessions: Session[] = JSON.parse(sessionsText);

        if (!Array.isArray(backupSessions) || backupSessions.length === 0) {
          showToast("File backup tidak berisi data sesi.", "error");
          setRestoreLoading(false);
          return;
        }

        const existingIds = new Set(sessions.map((s) => s.id));
        const newSessions: Session[] = [];
        const conflicts: RestoreConflict[] = [];

        for (const bs of backupSessions) {
          if (existingIds.has(bs.id)) {
            const existing = sessions.find((s) => s.id === bs.id)!;
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
        showToast("Gagal membaca file backup. File mungkin rusak.", "error");
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

  const finalizeRestore = async (
    newSessions: Session[],
    results: Map<string, ConflictAction>,
  ) => {
    let merged = [...sessions];
    let added = newSessions.length;
    let skipped = 0;
    let overwritten = 0;

    merged = [...merged, ...newSessions];

    for (const conflict of restoreConflicts) {
      const action = results.get(conflict.backupSession.id);
      if (action === "overwrite") {
        merged = merged.map((s) =>
          s.id === conflict.backupSession.id ? conflict.backupSession : s,
        );
        overwritten++;
      } else {
        skipped++;
      }
    }

    onUpdateSessions(merged);
    await saveUserData(userProfile.id, "sessions", merged);

    const parts: string[] = [];
    if (added > 0) parts.push(`${added} ditambahkan`);
    if (skipped > 0) parts.push(`${skipped} dilewati`);
    if (overwritten > 0) parts.push(`${overwritten} ditimpa`);
    showToast(`Restore selesai: ${parts.join(", ")}.`, "success", 5000);

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
    showToast(
      "Semua data lokal berhasil dihapus. Halaman akan dimuat ulang.",
      "warning",
      3000,
    );
    setTimeout(() => window.location.reload(), 2000);
  };

  const savedFontSize = userProfile.preferences?.fontSize ?? 17;
  const fontSizeChanged = fontSizePref !== savedFontSize;

  const previewFontSize = (size: number) => {
    const clamped = Math.max(12, Math.min(24, size));
    setFontSizePref(clamped);
  };

  const confirmFontSizeChange = async () => {
    setFontSizeSaving(true);
    try {
      const { error } = await aexonConnect.updateProfile({
        preferences: { fontSize: fontSizePref },
      });
      if (error) {
        showToast("Gagal menyimpan preferensi font.", "error");
        setFontSizePref(savedFontSize);
        setFontSizeSaving(false);
        return;
      }
      const updatedProfile = {
        ...userProfile,
        preferences: { fontSize: fontSizePref },
      };
      onUpdateUser(updatedProfile);
      showToast("Ukuran font berhasil diubah.", "success");
    } catch {
      showToast("Gagal terhubung ke server.", "error");
      setFontSizePref(savedFontSize);
    }
    setFontSizeSaving(false);
  };

  const getInitials = (name: string) =>
    name
      .split(" ")
      .filter((n) => !n.startsWith("Dr."))
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

  const visibleTabs: {
    id: typeof activeTab;
    label: string;
    icon: React.ComponentType<any>;
  }[] = [

    { id: "keamanan", label: "Keamanan", icon: Shield },
  ];

  if (!isAdmin || isAdminEnterprise) {
    visibleTabs.push({ id: "kop-surat", label: "Kop Surat", icon: FileText });
  }

  if (!isDokterInstitusi) {

  }

  visibleTabs.push({
    id: "backup",
    label: "Backup & Restore",
    icon: HardDrive,
  });

  visibleTabs.push({
    id: "tampilan",
    label: "Tampilan",
    icon: Type,
  });

  visibleTabs.push({
    id: "bantuan",
    label: "Bantuan",
    icon: HeadsetIcon,
  });

  const FONT_BODY = "'Plus Jakarta Sans', sans-serif";
  const FONT_HEADING = "'Plus Jakarta Sans', sans-serif";

  const inputBaseStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 14px",
    borderRadius: 10,
    border: "1.5px solid #E2E8F0",
    fontSize: 14,
    color: "#0C1E35",
    backgroundColor: "#FFFFFF",
    outline: "none",
    fontFamily: FONT_BODY,
    transition: "border-color 150ms, box-shadow 150ms",
    boxSizing: "border-box",
  };

  const readOnlyStyle: React.CSSProperties = {
    ...inputBaseStyle,
    backgroundColor: "#F8FAFC",
    color: "#94A3B8",
    cursor: "not-allowed",
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#2563EB";
    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)";
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "#E2E8F0";
    e.currentTarget.style.boxShadow = "none";
  };

  const cardBase: React.CSSProperties = {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    border: "1px solid #E8ECF1",
    overflow: "hidden",
  };

  const cardStyle: React.CSSProperties = {
    ...cardBase,
    padding: 0,
  };

  const cardHeaderStyle: React.CSSProperties = {
    padding: "14px 20px",
    borderBottom: "none",
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)",
    borderRadius: "16px 16px 0 0",
  };

  const cardBodyStyle: React.CSSProperties = {
    padding: 24,
  };

  const sectionHeadingStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 800,
    color: "#0C1E35",
    fontFamily: FONT_HEADING,
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: 11,
    fontWeight: 600,
    color: "#64748B",
    marginBottom: 6,
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    fontFamily: FONT_BODY,
  };

  const mutedTextStyle: React.CSSProperties = {
    fontSize: 14,
    color: "#64748B",
    fontFamily: FONT_BODY,
  };

  const btnPrimaryStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "11px 28px",
    background: "linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)",
    color: "#fff",
    fontWeight: 700,
    borderRadius: 12,
    border: "none",
    cursor: "pointer",
    fontSize: 14,
    fontFamily: FONT_HEADING,
    transition: "all 200ms",
    boxShadow: "0 2px 8px rgba(12,30,53,0.15)",
  };

  const dividerStyle: React.CSSProperties = {
    height: 1,
    backgroundColor: "#F1F5F9",
    border: "none",
    margin: "20px 0",
  };

  const iconBoxStyle = (bg: string): React.CSSProperties => ({
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  });

  return (
    <div
      style={{
        height: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#F4F6F8",
        overflow: "hidden",
      }}
    >
      {/* ── Header ── */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #E8ECF1", padding: "14px 28px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: "#0C1E35", fontFamily: FONT_HEADING }}>Pengaturan</span>
      </div>

      <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "28px 28px 80px" }}>
        <div style={{ maxWidth: 980, margin: "0 auto" }}>

          {/* ── Hero banner ── */}
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            style={{
              ...cardBase, marginBottom: 24, padding: 0, position: "relative",
              background: "linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)",
              border: "none",
            }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)", backgroundSize: "60px 60px, 40px 40px" }} />
            <div style={{ position: "relative", padding: "28px 32px", display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, flexShrink: 0,
                background: "linear-gradient(135deg, #60A5FA, #2563EB)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
              }}>
                <Shield style={{ width: 26, height: 26, color: "#fff" }} />
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, color: "#FFFFFF", margin: "0 0 4px", fontFamily: FONT_HEADING, lineHeight: 1.2 }}>
                  Pengaturan
                </h1>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0, fontFamily: FONT_BODY }}>
                  Kelola keamanan, preferensi, dan data akun Anda.
                </p>
              </div>
            </div>
          </motion.div>

          {/* ── Tab bar ── */}
          <div
            style={{
              backgroundColor: "#F1F5F9",
              borderRadius: 14,
              padding: 4,
              display: "inline-flex",
              gap: 4,
              marginBottom: 24,
            }}
          >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 16px",
              fontSize: 14,
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              transition: "all 0.15s",
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              fontWeight: activeTab === tab.id ? 600 : 400,
              backgroundColor: activeTab === tab.id ? "#fff" : "transparent",
              color: activeTab === tab.id ? "#0C1E35" : "#64748B",
              boxShadow:
                activeTab === tab.id ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
            }}
          >
            <tab.icon style={{ width: 16, height: 16 }} />
            {tab.label}
            {tab.id === "bantuan" && supportUnread > 0 && (
              <span style={{
                minWidth: 18, height: 18, borderRadius: 9, backgroundColor: "#EF4444",
                color: "#fff", fontSize: 11, fontWeight: 700, display: "inline-flex",
                alignItems: "center", justifyContent: "center", padding: "0 5px",
                lineHeight: 1, fontFamily: FONT_BODY,
              }}>
                {supportUnread > 99 ? "99+" : supportUnread}
              </span>
            )}
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
              position: "fixed",
              top: 24,
              right: 24,
              backgroundColor: "#10B981",
              color: "#fff",
              padding: "10px 20px",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              boxShadow: "0 8px 24px rgba(16,185,129,0.25)",
              zIndex: 50,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}
          >
            <CheckCircle2 style={{ width: 16, height: 16, marginRight: 8 }} />
            Perubahan Berhasil Disimpan
          </motion.div>
        )}
      </AnimatePresence>

      {/* ═══════════════ TAB: PROFIL ═══════════════ */}
      {activeTab === "profil" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 24px",textAlign:"center" }}>
          <div style={{ width:60,height:60,borderRadius:16,backgroundColor:"#EFF6FF",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}>
            <User style={{ width:26,height:26,color:"#3B82F6" }} />
          </div>
          <h3 style={{ fontSize:17,fontWeight:800,color:"#0C1E35",marginBottom:8,fontFamily:"'Plus Jakarta Sans', sans-serif" }}>Edit Profil</h3>
          <p style={{ fontSize:13,color:"#64748B",lineHeight:1.6,marginBottom:22,maxWidth:300 }}>Kelola nama, spesialisasi, dan STR Anda.</p>
          <button onClick={() => onNavigateToProfile?.()} style={{ padding:"11px 26px",backgroundColor:"#0C1E35",color:"#fff",border:"none",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans', sans-serif" }}
            onMouseEnter={(e)=>(e.currentTarget.style.backgroundColor="#1a3a5c")} onMouseLeave={(e)=>(e.currentTarget.style.backgroundColor="#0C1E35")}>
            Buka Halaman Profil
          </button>
        </motion.div>
      )}
      {/* ═══════════════ TAB: KEAMANAN ═══════════════ */}
      {activeTab === "keamanan" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", flexDirection: "column", gap: 24 }}
        >
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <Key style={{ width: 14, height: 14, color: "#ffffff" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", fontFamily: FONT_HEADING }}>Ganti Password</span>
            </div>

            <div style={cardBodyStyle}>
            <form
              onSubmit={handleChangePassword}
              style={{
                maxWidth: 440,
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              <div>
                <label style={labelStyle}>Password Saat Ini</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showCurrentPass ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Masukkan password saat ini"
                    style={{ ...inputBaseStyle, paddingRight: 48 }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPass(!showCurrentPass)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#94A3B8",
                      padding: 4,
                    }}
                  >
                    {showCurrentPass ? (
                      <EyeOff style={{ width: 16, height: 16 }} />
                    ) : (
                      <Eye style={{ width: 16, height: 16 }} />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Password Baru</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showNewPass ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimal 8 karakter"
                    style={{ ...inputBaseStyle, paddingRight: 48 }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#94A3B8",
                      padding: 4,
                    }}
                  >
                    {showNewPass ? (
                      <EyeOff style={{ width: 16, height: 16 }} />
                    ) : (
                      <Eye style={{ width: 16, height: 16 }} />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Konfirmasi Password Baru</label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ulangi password baru"
                    style={{ ...inputBaseStyle, paddingRight: 48 }}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    style={{
                      position: "absolute",
                      right: 12,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "#94A3B8",
                      padding: 4,
                    }}
                  >
                    {showConfirmPass ? (
                      <EyeOff style={{ width: 16, height: 16 }} />
                    ) : (
                      <Eye style={{ width: 16, height: 16 }} />
                    )}
                  </button>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={passwordSaving}
                style={{
                  ...btnPrimaryStyle,
                  opacity: passwordSaving ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#1a3a5c";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#0C1E35";
                }}
              >
                {passwordSaving ? (
                  <Loader2
                    className="animate-spin"
                    style={{ width: 16, height: 16 }}
                  />
                ) : (
                  <Lock style={{ width: 16, height: 16 }} />
                )}
                {passwordSaving ? "Mengubah..." : "Update Password"}
              </motion.button>
            </form>
            </div>
          </div>

          {!isAdmin && (
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <Database style={{ width: 14, height: 14, color: "#ffffff" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", fontFamily: FONT_HEADING }}>Manajemen Data</span>
              </div>
              <div style={cardBodyStyle}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: 20,
                  backgroundColor: "#FFFBEB",
                  borderRadius: 12,
                  border: "1px solid #FDE68A",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Database
                    style={{ width: 20, height: 20, color: "#D97706" }}
                  />
                  <div>
                    <h4
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: "#78350F",
                      }}
                    >
                      Hapus Data Lokal
                    </h4>
                    <p style={{ fontSize: 12, color: "#92400E", opacity: 0.7 }}>
                      Hapus semua riwayat sesi di browser ini.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowClearDataModal(true)}
                  style={{
                    padding: "8px 20px",
                    backgroundColor: "#fff",
                    color: "#D97706",
                    fontWeight: 700,
                    borderRadius: 12,
                    border: "1px solid #FDE68A",
                    cursor: "pointer",
                    fontSize: 14,
                    transition: "background-color 0.15s",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#FEF3C7";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#fff";
                  }}
                >
                  Hapus
                </button>
              </div>
              </div>
            </div>
          )}
        </motion.div>
      )}

      {/* ═══════════════ TAB: KOP SURAT ═══════════════ */}
      {activeTab === "kop-surat" && (!isAdmin || isAdminEnterprise) && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", flexDirection: "column", gap: 24 }}
        >
          {isDokterInstitusi && (
            <>
              <div
                style={{
                  padding: 16,
                  backgroundColor: "#EFF6FF",
                  border: "1px solid #DBEAFE",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <Info
                  style={{
                    width: 16,
                    height: 16,
                    color: "#3B82F6",
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                />
                <p style={{ fontSize: 12, color: "#1D4ED8", lineHeight: 1.6 }}>
                  Kop surat dikelola oleh Admin Institusi Anda. Hubungi admin
                  untuk perubahan.
                </p>
              </div>

              {hospitalSettingsList.length > 0 ? (
                <div style={cardStyle}>
                  <div style={cardHeaderStyle}>
                    <FileText style={{ width: 14, height: 14, color: "#ffffff" }} />
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", fontFamily: FONT_HEADING }}>
                      {hospitalSettingsList[0].name || "Kop Surat Institusi"}
                    </span>
                  </div>
                  <div style={cardBodyStyle}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(280px, 1fr))",
                      gap: 20,
                    }}
                  >
                    {[
                      {
                        label: "Nama RS / Institusi",
                        value: hospitalSettingsList[0].name,
                      },
                      {
                        label: "Alamat",
                        value: hospitalSettingsList[0].address,
                      },
                      {
                        label: "No. Telepon",
                        value: hospitalSettingsList[0].phone,
                      },
                      {
                        label: "No. Fax",
                        value: hospitalSettingsList[0].fax || "-",
                      },
                      { label: "Email", value: hospitalSettingsList[0].email },
                      {
                        label: "Website",
                        value: hospitalSettingsList[0].website || "-",
                      },
                    ].map((field) => (
                      <div key={field.label}>
                        <label style={labelStyle}>{field.label}</label>
                        <input
                          type="text"
                          value={field.value || ""}
                          readOnly
                          style={readOnlyStyle}
                        />
                      </div>
                    ))}
                  </div>
                  {hospitalSettingsList[0].logoUrl && (
                    <div
                      style={{
                        marginTop: 20,
                        padding: 16,
                        backgroundColor: "#F8FAFC",
                        borderRadius: 12,
                        border: "1px solid #E2E8F0",
                      }}
                    >
                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          color: "#475569",
                          marginBottom: 8,
                        }}
                      >
                        Logo Institusi
                      </p>
                      <img
                        src={hospitalSettingsList[0].logoUrl}
                        alt="Logo"
                        style={{
                          height: 64,
                          width: "auto",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  )}
                  </div>
                </div>
              ) : (
                  <div style={{ ...cardStyle, textAlign: "center", padding: "48px 24px" }}>
                  <FileText
                    style={{
                      width: 48,
                      height: 48,
                      color: "#E2E8F0",
                      margin: "0 auto 12px",
                    }}
                  />
                  <p
                    style={{ fontSize: 14, color: "#64748B", fontWeight: 500 }}
                  >
                    Kop surat belum dikonfigurasi oleh Admin Institusi.
                  </p>
                </div>
              )}
            </>
          )}

          {canEditKop &&
            (() => {
              const addCheck = canAddNewKop();
              return (
                <>
                  <div
                    style={{
                      padding: 14,
                      backgroundColor: "#F8FAFC",
                      border: "1px solid #E2E8F0",
                      borderRadius: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <Shield
                      style={{
                        width: 16,
                        height: 16,
                        color: "#94A3B8",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <p
                        style={{
                          fontSize: 12,
                          color: "#475569",
                          lineHeight: 1.5,
                        }}
                      >
                        Nama & logo terkunci{" "}
                        <strong>{COOLDOWN_DAYS} hari</strong> setelah diubah.
                        Field lainnya (alamat, telepon, dll.) bebas diedit kapan
                        saja.
                      </p>
                    </div>
                    <div
                      style={{
                        padding: "6px 12px",
                        backgroundColor: "#fff",
                        borderRadius: 8,
                        border: "1px solid #E2E8F0",
                        flexShrink: 0,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: "#475569",
                        }}
                      >
                        {kopForms.length}/{maxKopSlots} slot
                      </span>
                    </div>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div>
                      <h3 style={sectionHeadingStyle}>{isAdminEnterprise ? 'Kop Surat Institusi' : 'Kop Surat Praktik'}</h3>
                      <p style={mutedTextStyle}>
                        Kelola kop surat {isAdminEnterprise ? 'institusi Anda' : 'tempat praktik Anda'} (maks. {maxKopSlots}).
                      </p>
                    </div>
                    {kopForms.length < maxKopSlots && (
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={handleAddKop}
                        disabled={!addCheck.allowed}
                        style={{
                          ...btnPrimaryStyle,
                          padding: "10px 16px",
                          fontSize: 12,
                          opacity: addCheck.allowed ? 1 : 0.4,
                          cursor: addCheck.allowed ? "pointer" : "not-allowed",
                        }}
                        onMouseEnter={(e) => {
                          if (addCheck.allowed)
                            e.currentTarget.style.backgroundColor = "#1a3a5c";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = "#0C1E35";
                        }}
                        title={addCheck.allowed ? undefined : addCheck.reason}
                      >
                        <Plus style={{ width: 16, height: 16 }} />
                        Tambah Kop Surat
                      </motion.button>
                    )}
                  </div>

                  {kopForms.length === 0 && (
                    <div
                      style={{
                        ...cardStyle,
                        border: "2px dashed #CBD5E1",
                        textAlign: "center",
                        padding: 48,
                      }}
                    >
                      <FileText
                        style={{
                          width: 48,
                          height: 48,
                          color: "#E2E8F0",
                          margin: "0 auto 12px",
                        }}
                      />
                      <p
                        style={{
                          fontSize: 14,
                          color: "#64748B",
                          fontWeight: 500,
                          marginBottom: 4,
                        }}
                      >
                        Belum ada kop surat.
                      </p>
                      <p style={{ fontSize: 12, color: "#94A3B8" }}>
                        Klik "Tambah Kop Surat" untuk menambahkan tempat
                        praktik.
                      </p>
                    </div>
                  )}

                  {!addCheck.allowed && addCheck.unlockDate && (
                    <div
                      style={{
                        padding: 12,
                        backgroundColor: "#FFFBEB",
                        border: "1px solid #FDE68A",
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <CalendarClock
                        style={{
                          width: 16,
                          height: 16,
                          color: "#F59E0B",
                          flexShrink: 0,
                        }}
                      />
                      <p style={{ fontSize: 12, color: "#92400E" }}>
                        Penambahan kop surat baru tersedia pada{" "}
                        <strong>
                          {addCheck.unlockDate.toLocaleDateString("id-ID", {
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                          })}
                        </strong>
                        .
                      </p>
                    </div>
                  )}

                  {kopForms.map((kop, kopIdx) => {
                    const isExpanded = expandedKopIdx === kopIdx;
                    const cooldownKop = getCooldownInfo(kop);
                    const isSavingThis = kopSaving === kopIdx;
                    const deleteCheckKop = canDeleteKop(kop);

                    return (
                      <div
                        key={kop.id || kopIdx}
                        style={{ ...cardStyle, padding: 0, overflow: "hidden" }}
                      >
                        <button
                          onClick={() =>
                            setExpandedKopIdx(isExpanded ? null : kopIdx)
                          }
                          style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: 20,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            transition: "background-color 0.15s",
                            fontFamily: "'Plus Jakarta Sans', sans-serif",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = "#F8FAFC";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 12,
                            }}
                          >
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                backgroundColor: "#0C1E35",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color: "#fff",
                                fontSize: 12,
                                fontWeight: 900,
                              }}
                            >
                              {kopIdx + 1}
                            </div>
                            <div style={{ textAlign: "left" }}>
                              <h4
                                style={{
                                  fontSize: 14,
                                  fontWeight: 700,
                                  color: "#0C1E35",
                                }}
                              >
                                {kop.name || `Kop Surat ${kopIdx + 1}`}
                              </h4>
                              {kop.address && (
                                <p
                                  style={{
                                    fontSize: 12,
                                    color: "#94A3B8",
                                    marginTop: 2,
                                    maxWidth: 384,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {kop.address}
                                </p>
                              )}
                            </div>
                          </div>
                          {isExpanded ? (
                            <ChevronUp
                              style={{
                                width: 16,
                                height: 16,
                                color: "#94A3B8",
                              }}
                            />
                          ) : (
                            <ChevronDown
                              style={{
                                width: 16,
                                height: 16,
                                color: "#94A3B8",
                              }}
                            />
                          )}
                        </button>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              style={{ overflow: "hidden" }}
                            >
                              <div
                                style={{
                                  padding: "0 24px 24px",
                                  borderTop: "1px solid #E2E8F0",
                                }}
                              >
                                {cooldownKop.locked && (
                                  <div
                                    style={{
                                      marginBottom: 20,
                                      marginTop: 16,
                                      padding: 12,
                                      backgroundColor: "#FFFBEB",
                                      border: "1px solid #FDE68A",
                                      borderRadius: 12,
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <CalendarClock
                                        style={{
                                          width: 16,
                                          height: 16,
                                          color: "#F59E0B",
                                          flexShrink: 0,
                                        }}
                                      />
                                      <p
                                        style={{ fontSize: 12, color: "#92400E", flex: 1, margin: 0 }}
                                      >
                                        Nama dan logo dapat diubah kembali pada{" "}
                                        <strong>
                                          {cooldownKop.unlockDate!.toLocaleDateString(
                                            "id-ID",
                                            {
                                              day: "numeric",
                                              month: "long",
                                              year: "numeric",
                                            },
                                          )}
                                        </strong>
                                        .
                                      </p>
                                    </div>
                                    {isAdminEnterprise && kop.id && (
                                      <div style={{ marginTop: 10, display: "flex", justifyContent: "flex-end" }}>
                                        <button
                                          onClick={() => handleRequestCooldownReset(kop.id, kop.name)}
                                          disabled={
                                            cooldownResetLoading === kop.id ||
                                            cooldownResetSent.has(kop.id)
                                          }
                                          style={{
                                            padding: "6px 14px",
                                            borderRadius: 8,
                                            fontSize: 12,
                                            fontWeight: 700,
                                            border: "none",
                                            cursor:
                                              cooldownResetLoading === kop.id || cooldownResetSent.has(kop.id)
                                                ? "not-allowed"
                                                : "pointer",
                                            backgroundColor: cooldownResetSent.has(kop.id)
                                              ? "#D1FAE5"
                                              : "#0C1E35",
                                            color: cooldownResetSent.has(kop.id)
                                              ? "#065F46"
                                              : "#ffffff",
                                            opacity:
                                              cooldownResetLoading === kop.id ? 0.6 : 1,
                                            fontFamily:
                                              "'Plus Jakarta Sans', sans-serif",
                                            transition: "all 150ms",
                                          }}
                                        >
                                          {cooldownResetSent.has(kop.id)
                                            ? "Request Terkirim ✓"
                                            : cooldownResetLoading === kop.id
                                            ? "Mengirim..."
                                            : "Minta Reset Cooldown"}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns:
                                      "repeat(auto-fit, minmax(280px, 1fr))",
                                    gap: 20,
                                    marginTop: 16,
                                  }}
                                >
                                  <div>
                                    <label style={labelStyle}>
                                      Nama RS / Klinik
                                    </label>
                                    <input
                                      type="text"
                                      value={kop.name}
                                      onChange={(e) =>
                                        handleKopFieldChange(
                                          kopIdx,
                                          "name",
                                          e.target.value,
                                        )
                                      }
                                      readOnly={cooldownKop.locked}
                                      style={
                                        cooldownKop.locked
                                          ? readOnlyStyle
                                          : inputBaseStyle
                                      }
                                      onFocus={
                                        cooldownKop.locked
                                          ? undefined
                                          : handleInputFocus
                                      }
                                      onBlur={
                                        cooldownKop.locked
                                          ? undefined
                                          : handleInputBlur
                                      }
                                      placeholder="Nama rumah sakit atau klinik (boleh diisi nanti)"
                                    />
                                    {cooldownKop.locked && (
                                      <p
                                        style={{
                                          fontSize: 10,
                                          color: "#F59E0B",
                                          marginTop: 4,
                                        }}
                                      >
                                        Terkunci hingga{" "}
                                        {cooldownKop.unlockDate!.toLocaleDateString(
                                          "id-ID",
                                          {
                                            day: "numeric",
                                            month: "short",
                                            year: "numeric",
                                          },
                                        )}
                                      </p>
                                    )}
                                  </div>
                                  <div>
                                    <label
                                      style={{
                                        ...labelStyle,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <ImagePlus
                                        style={{ width: 12, height: 12 }}
                                      />{" "}
                                      Logo RS / Institusi
                                    </label>
                                    <input
                                      type="file"
                                      accept=".jpg,.jpeg,.png"
                                      ref={(el) => {
                                        if (el)
                                          logoInputRefs.current.set(kopIdx, el);
                                      }}
                                      onChange={(e) =>
                                        handleLogoFileSelect(kopIdx, e)
                                      }
                                      style={{ display: "none" }}
                                    />
                                    <div
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 12,
                                      }}
                                    >
                                      {kop.logoUrl ? (
                                        <div
                                          style={{
                                            height: 48,
                                            width: 48,
                                            borderRadius: 8,
                                            border: "1px solid #E2E8F0",
                                            overflow: "hidden",
                                            backgroundColor: "#F8FAFC",
                                            flexShrink: 0,
                                          }}
                                        >
                                          <img
                                            src={kop.logoUrl}
                                            alt="Logo"
                                            style={{
                                              width: "100%",
                                              height: "100%",
                                              objectFit: "contain",
                                            }}
                                          />
                                        </div>
                                      ) : (
                                        <div
                                          style={{
                                            height: 48,
                                            width: 48,
                                            borderRadius: 8,
                                            border: "2px dashed #CBD5E1",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            backgroundColor: "#F8FAFC",
                                            flexShrink: 0,
                                          }}
                                        >
                                          <ImagePlus
                                            style={{
                                              width: 20,
                                              height: 20,
                                              color: "#CBD5E1",
                                            }}
                                          />
                                        </div>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (!cooldownKop.locked) {
                                            const input =
                                              logoInputRefs.current.get(kopIdx);
                                            if (input) input.click();
                                          }
                                        }}
                                        disabled={cooldownKop.locked}
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 8,
                                          padding: "10px 16px",
                                          fontSize: 12,
                                          fontWeight: 700,
                                          borderRadius: 12,
                                          transition: "all 0.15s",
                                          cursor: cooldownKop.locked
                                            ? "not-allowed"
                                            : "pointer",
                                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                                          ...(cooldownKop.locked
                                            ? {
                                                backgroundColor: "#F1F5F9",
                                                color: "#94A3B8",
                                                border: "1px solid #E2E8F0",
                                              }
                                            : {
                                                backgroundColor:
                                                  "rgba(12,30,53,0.05)",
                                                color: "#0C1E35",
                                                border:
                                                  "1px solid rgba(12,30,53,0.15)",
                                              }),
                                        }}
                                      >
                                        <Upload
                                          style={{ width: 14, height: 14 }}
                                        />
                                        {kop.logoUrl
                                          ? "Ganti Logo"
                                          : "Upload Logo"}
                                      </button>
                                      {kop.logoUrl && !cooldownKop.locked && (
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleKopFieldChange(
                                              kopIdx,
                                              "logoUrl",
                                              "",
                                            )
                                          }
                                          style={{
                                            padding: 10,
                                            color: "#EF4444",
                                            background: "none",
                                            border: "none",
                                            borderRadius: 12,
                                            cursor: "pointer",
                                            transition:
                                              "background-color 0.15s",
                                          }}
                                          title="Hapus logo"
                                          onMouseEnter={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                              "#FEF2F2";
                                          }}
                                          onMouseLeave={(e) => {
                                            e.currentTarget.style.backgroundColor =
                                              "transparent";
                                          }}
                                        >
                                          <Trash2
                                            style={{ width: 14, height: 14 }}
                                          />
                                        </button>
                                      )}
                                    </div>
                                    <p
                                      style={{
                                        fontSize: 10,
                                        color: "#94A3B8",
                                        marginLeft: 2,
                                        marginTop: 4,
                                      }}
                                    >
                                      Format: .jpg, .png (maks. 5 MB)
                                    </p>
                                  </div>
                                  <div style={{ gridColumn: "1 / -1" }}>
                                    <label
                                      style={{
                                        ...labelStyle,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <MapPin
                                        style={{ width: 12, height: 12 }}
                                      />{" "}
                                      Alamat
                                    </label>
                                    <input
                                      type="text"
                                      value={kop.address}
                                      onChange={(e) =>
                                        handleKopFieldChange(
                                          kopIdx,
                                          "address",
                                          e.target.value,
                                        )
                                      }
                                      style={inputBaseStyle}
                                      onFocus={handleInputFocus}
                                      onBlur={handleInputBlur}
                                      placeholder="Jl. Kesehatan No. 1, Jakarta"
                                    />
                                  </div>
                                  <div>
                                    <label
                                      style={{
                                        ...labelStyle,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <Phone
                                        style={{ width: 12, height: 12 }}
                                      />{" "}
                                      No. Telepon
                                    </label>
                                    <input
                                      type="tel"
                                      value={kop.phone}
                                      onChange={(e) =>
                                        handleKopFieldChange(
                                          kopIdx,
                                          "phone",
                                          e.target.value,
                                        )
                                      }
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
                                      value={kop.fax || ""}
                                      onChange={(e) =>
                                        handleKopFieldChange(
                                          kopIdx,
                                          "fax",
                                          e.target.value,
                                        )
                                      }
                                      style={inputBaseStyle}
                                      onFocus={handleInputFocus}
                                      onBlur={handleInputBlur}
                                      placeholder="(021) 1234568"
                                    />
                                  </div>
                                  <div>
                                    <label
                                      style={{
                                        ...labelStyle,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <MailIcon
                                        style={{ width: 12, height: 12 }}
                                      />{" "}
                                      Email RS
                                    </label>
                                    <input
                                      type="email"
                                      value={kop.email}
                                      onChange={(e) =>
                                        handleKopFieldChange(
                                          kopIdx,
                                          "email",
                                          e.target.value,
                                        )
                                      }
                                      style={inputBaseStyle}
                                      onFocus={handleInputFocus}
                                      onBlur={handleInputBlur}
                                      placeholder="info@rumahsakit.co.id"
                                    />
                                  </div>
                                  <div>
                                    <label
                                      style={{
                                        ...labelStyle,
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 4,
                                      }}
                                    >
                                      <Globe
                                        style={{ width: 12, height: 12 }}
                                      />{" "}
                                      Website RS
                                    </label>
                                    <input
                                      type="url"
                                      value={kop.website || ""}
                                      onChange={(e) =>
                                        handleKopFieldChange(
                                          kopIdx,
                                          "website",
                                          e.target.value,
                                        )
                                      }
                                      style={inputBaseStyle}
                                      onFocus={handleInputFocus}
                                      onBlur={handleInputBlur}
                                      placeholder="www.rumahsakit.co.id"
                                    />
                                  </div>
                                </div>

                                {kop.logoUrl && (
                                  <div
                                    style={{
                                      marginTop: 20,
                                      padding: 16,
                                      backgroundColor: "#F8FAFC",
                                      borderRadius: 12,
                                      border: "1px solid #E2E8F0",
                                    }}
                                  >
                                    <p
                                      style={{
                                        fontSize: 12,
                                        fontWeight: 600,
                                        color: "#475569",
                                        marginBottom: 8,
                                      }}
                                    >
                                      Preview Logo
                                    </p>
                                    <img
                                      src={kop.logoUrl}
                                      alt="Logo"
                                      style={{
                                        height: 80,
                                        width: "auto",
                                        objectFit: "contain",
                                      }}
                                      onError={(e) => {
                                        (
                                          e.target as HTMLImageElement
                                        ).style.display = "none";
                                      }}
                                    />
                                  </div>
                                )}

                                <div
                                  style={{
                                    marginTop: 24,
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                  }}
                                >
                                  <button
                                    onClick={() => {
                                      if (!deleteCheckKop.allowed) {
                                        showToast(
                                          deleteCheckKop.reason!,
                                          "warning",
                                          5000,
                                        );
                                        return;
                                      }
                                      setKopToDelete(kopIdx);
                                    }}
                                    disabled={!deleteCheckKop.allowed}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 8,
                                      padding: "8px 16px",
                                      color: deleteCheckKop.allowed
                                        ? "#EF4444"
                                        : "#94A3B8",
                                      background: "none",
                                      border: "none",
                                      fontSize: 12,
                                      fontWeight: 700,
                                      borderRadius: 12,
                                      cursor: deleteCheckKop.allowed
                                        ? "pointer"
                                        : "not-allowed",
                                      transition: "background-color 0.15s",
                                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                                    }}
                                    onMouseEnter={(e) => {
                                      if (deleteCheckKop.allowed)
                                        e.currentTarget.style.backgroundColor =
                                          "#FEF2F2";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "transparent";
                                    }}
                                    title={
                                      deleteCheckKop.allowed
                                        ? undefined
                                        : deleteCheckKop.reason
                                    }
                                  >
                                    <Trash2 style={{ width: 14, height: 14 }} />
                                    Hapus Kop Surat
                                  </button>
                                  <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleSaveKop(kopIdx)}
                                    disabled={isSavingThis}
                                    style={{
                                      ...btnPrimaryStyle,
                                      opacity: isSavingThis ? 0.5 : 1,
                                    }}
                                    onMouseEnter={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "#1a3a5c";
                                    }}
                                    onMouseLeave={(e) => {
                                      e.currentTarget.style.backgroundColor =
                                        "#0C1E35";
                                    }}
                                  >
                                    {isSavingThis ? (
                                      <Loader2
                                        className="animate-spin"
                                        style={{ width: 16, height: 16 }}
                                      />
                                    ) : (
                                      <Save style={{ width: 16, height: 16 }} />
                                    )}
                                    {isSavingThis ? "Menyimpan..." : "Simpan"}
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
      {activeTab === "langganan" && !isDokterInstitusi && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          style={{ display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"60px 24px",textAlign:"center" }}>
          <div style={{ width:60,height:60,borderRadius:16,backgroundColor:"#EFF6FF",display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px" }}>
            <CreditCard style={{ width:26,height:26,color:"#3B82F6" }} />
          </div>
          <h3 style={{ fontSize:17,fontWeight:800,color:"#0C1E35",marginBottom:8,fontFamily:"'Plus Jakarta Sans', sans-serif" }}>Kelola Langganan</h3>
          <p style={{ fontSize:13,color:"#64748B",lineHeight:1.6,marginBottom:22,maxWidth:300 }}>Lihat status, riwayat pembayaran, dan kelola perpanjangan otomatis.</p>
          <button onClick={() => onNavigateToSubscription?.()} style={{ padding:"11px 26px",backgroundColor:"#0C1E35",color:"#fff",border:"none",borderRadius:12,fontSize:13,fontWeight:700,cursor:"pointer",fontFamily:"'Plus Jakarta Sans', sans-serif" }}
            onMouseEnter={(e)=>(e.currentTarget.style.backgroundColor="#1a3a5c")} onMouseLeave={(e)=>(e.currentTarget.style.backgroundColor="#0C1E35")}>
            Buka Halaman Langganan
          </button>
        </motion.div>
      )}


      {/* ═══════════════ TAB: BACKUP ═══════════════ */}
      {activeTab === "backup" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", flexDirection: "column", gap: 24 }}
        >
          {isDokterInstitusi && (
            <div
              style={{
                padding: 16,
                backgroundColor: "#EFF6FF",
                border: "1px solid #DBEAFE",
                borderRadius: 12,
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
              }}
            >
              <Info
                style={{
                  width: 16,
                  height: 16,
                  color: "#3B82F6",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              <p style={{ fontSize: 12, color: "#1D4ED8", lineHeight: 1.6 }}>
                Langganan Anda dikelola oleh <strong>Admin Institusi</strong>.
                Hubungi admin Anda untuk informasi paket dan pembayaran.
              </p>
            </div>
          )}

          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <Download style={{ width: 14, height: 14, color: "#ffffff" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", fontFamily: FONT_HEADING }}>Ekspor Backup</span>
            </div>
            <div style={cardBodyStyle}>

            <p
              style={{
                fontSize: 12,
                color: "#64748B",
                marginBottom: 20,
                lineHeight: 1.6,
              }}
            >
              File backup berisi semua data sesi. Foto dan video tidak termasuk
              dalam backup. Anda dapat memfilter berdasarkan rentang tanggal.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 16,
                marginBottom: 20,
              }}
            >
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

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>
                {sessions.length} sesi tersedia
              </span>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleExportBackup}
                style={{
                  ...btnPrimaryStyle,
                  padding: "12px 20px",
                  fontSize: 12,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#1a3a5c";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#0C1E35";
                }}
              >
                <Download style={{ width: 16, height: 16 }} />
                Unduh Backup
              </motion.button>
            </div>
            </div>
          </div>

          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <RefreshCw style={{ width: 14, height: 14, color: "#ffffff" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", fontFamily: FONT_HEADING }}>Restore dari Backup</span>
            </div>
            <div style={cardBodyStyle}>

            <div
              style={{
                padding: 16,
                backgroundColor: "#ECFDF5",
                border: "1px solid #A7F3D0",
                borderRadius: 12,
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                marginBottom: 24,
              }}
            >
              <CheckCircle
                style={{
                  width: 16,
                  height: 16,
                  color: "#10B981",
                  flexShrink: 0,
                  marginTop: 2,
                }}
              />
              <p style={{ fontSize: 11, color: "#065F46", lineHeight: 1.6 }}>
                Restore <strong>menggabungkan</strong> data backup dengan data
                yang ada. Sesi baru otomatis ditambahkan, sesi duplikat akan
                dikonfirmasi.
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleImportBackup}
              disabled={restoreLoading}
              style={{
                ...btnPrimaryStyle,
                padding: "12px 20px",
                fontSize: 12,
                opacity: restoreLoading ? 0.5 : 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#1a3a5c";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "#0C1E35";
              }}
            >
              {restoreLoading ? (
                <Loader2
                  className="animate-spin"
                  style={{ width: 16, height: 16 }}
                />
              ) : (
                <Upload style={{ width: 16, height: 16 }} />
              )}
              {restoreLoading ? "Memproses..." : "Pilih File Backup (.zip)"}
            </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════ TAB: TAMPILAN ═══════════════ */}
      {activeTab === "tampilan" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", flexDirection: "column", gap: 24 }}
        >
          <div style={cardStyle}>
            <div style={cardHeaderStyle}>
              <Type style={{ width: 14, height: 14, color: "#ffffff" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", fontFamily: FONT_HEADING }}>Ukuran Font</span>
            </div>
            <div style={cardBodyStyle}>
              <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 24, fontFamily: FONT_BODY }}>
                Sesuaikan ukuran teks yang ditampilkan di seluruh aplikasi. Pengaturan ini tersimpan di akun Anda dan akan mengikuti ke perangkat manapun.
              </p>

              {/* Preview */}
              <div style={{
                padding: "20px 24px", borderRadius: 12, border: "1.5px solid #E2E8F0",
                backgroundColor: "#FAFBFC", marginBottom: 24,
              }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, fontFamily: FONT_BODY }}>
                  Preview
                </p>
                <p style={{ fontSize: fontSizePref, color: "#0C1E35", margin: 0, lineHeight: 1.6, fontFamily: FONT_BODY, transition: "font-size 150ms" }}>
                  Ini adalah contoh tampilan teks pada ukuran font yang dipilih.
                </p>
                <p style={{ fontSize: Math.max(fontSizePref - 2, 11), color: "#64748B", margin: "6px 0 0", lineHeight: 1.5, fontFamily: FONT_BODY, transition: "font-size 150ms" }}>
                  Semakin besar ukuran font, semakin mudah dibaca. Sesuaikan dengan kenyamanan Anda.
                </p>
              </div>

              {/* Slider */}
              <div style={{ maxWidth: 480 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 12 }}>
                  <button
                    onClick={() => previewFontSize(fontSizePref - 1)}
                    disabled={fontSizePref <= 12 || fontSizeSaving}
                    style={{
                      width: 36, height: 36, borderRadius: 10, border: "1.5px solid #E2E8F0",
                      backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: fontSizePref <= 12 || fontSizeSaving ? "not-allowed" : "pointer",
                      opacity: fontSizePref <= 12 ? 0.3 : 1, transition: "all 150ms", flexShrink: 0,
                    }}
                  >
                    <MinusIcon style={{ width: 16, height: 16, color: "#0C1E35" }} />
                  </button>
                  <input
                    type="range"
                    min={12}
                    max={24}
                    step={1}
                    value={fontSizePref}
                    onChange={(e) => previewFontSize(Number(e.target.value))}
                    disabled={fontSizeSaving}
                    style={{ flex: 1, accentColor: "#0C1E35", height: 6, cursor: fontSizeSaving ? "wait" : "pointer" }}
                  />
                  <button
                    onClick={() => previewFontSize(fontSizePref + 1)}
                    disabled={fontSizePref >= 24 || fontSizeSaving}
                    style={{
                      width: 36, height: 36, borderRadius: 10, border: "1.5px solid #E2E8F0",
                      backgroundColor: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                      cursor: fontSizePref >= 24 || fontSizeSaving ? "not-allowed" : "pointer",
                      opacity: fontSizePref >= 24 ? 0.3 : 1, transition: "all 150ms", flexShrink: 0,
                    }}
                  >
                    <PlusIcon style={{ width: 16, height: 16, color: "#0C1E35" }} />
                  </button>
                </div>

                {/* Labels */}
                <div style={{ display: "flex", justifyContent: "space-between", padding: "0 52px" }}>
                  <span style={{ fontSize: 10, color: "#CBD5E1", fontFamily: FONT_BODY }}>12px</span>
                  <span style={{ fontSize: 10, color: "#CBD5E1", fontFamily: FONT_BODY }}>24px</span>
                </div>

                {/* Current value badge + actions */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", marginTop: 16, gap: 8 }}>
                  <div style={{
                    padding: "8px 20px", borderRadius: 10,
                    background: "linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)",
                    display: "inline-flex", alignItems: "center", gap: 8,
                  }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: "#fff", fontFamily: FONT_HEADING }}>{fontSizePref}</span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: FONT_BODY }}>px</span>
                  </div>
                  {fontSizePref !== 14 && !fontSizeChanged && (
                    <button
                      onClick={() => previewFontSize(17)}
                      disabled={fontSizeSaving}
                      style={{
                        padding: "8px 14px", borderRadius: 10, border: "1.5px solid #E2E8F0",
                        backgroundColor: "#fff", fontSize: 11, fontWeight: 600, color: "#64748B",
                        cursor: "pointer", fontFamily: FONT_BODY, transition: "all 150ms",
                      }}
                    >
                      Reset ke 17px
                    </button>
                  )}
                </div>

                {/* CTA: Simpan perubahan */}
                {fontSizeChanged && (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 20 }}>
                    <button
                      onClick={() => setFontSizePref(savedFontSize)}
                      disabled={fontSizeSaving}
                      style={{
                        padding: "10px 20px", borderRadius: 10, border: "1.5px solid #E2E8F0",
                        backgroundColor: "#fff", fontSize: 12, fontWeight: 600, color: "#64748B",
                        cursor: "pointer", fontFamily: FONT_BODY, transition: "all 150ms",
                      }}
                    >
                      Batal
                    </button>
                    <button
                      onClick={confirmFontSizeChange}
                      disabled={fontSizeSaving}
                      style={{
                        padding: "10px 24px", borderRadius: 10, border: "none",
                        background: "linear-gradient(135deg, #0C1E35 0%, #152d4f 100%)",
                        fontSize: 12, fontWeight: 700, color: "#fff",
                        cursor: fontSizeSaving ? "wait" : "pointer", fontFamily: FONT_BODY,
                        display: "flex", alignItems: "center", gap: 6,
                        boxShadow: "0 2px 8px rgba(12,30,53,0.2)",
                        opacity: fontSizeSaving ? 0.6 : 1,
                      }}
                    >
                      {fontSizeSaving ? (
                        <><Loader2 className="animate-spin" style={{ width: 14, height: 14 }} /> Menyimpan...</>
                      ) : (
                        <>Simpan Ukuran Font</>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {fontSizeSaving && !fontSizeChanged && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
                  <Loader2 className="animate-spin" style={{ width: 14, height: 14, color: "#94A3B8" }} />
                  <span style={{ fontSize: 12, color: "#94A3B8", fontFamily: FONT_BODY }}>Menyimpan...</span>
                </div>
              )}

              <div style={{ marginTop: 20, padding: 14, backgroundColor: "#F8FAFC", borderRadius: 12, border: "1px solid #E8ECF1", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Info style={{ width: 14, height: 14, color: "#94A3B8", flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: "#64748B", lineHeight: 1.6, margin: 0, fontFamily: FONT_BODY }}>
                  Pengaturan ini tersimpan di server dan terhubung ke akun Anda. Jika Anda berpindah komputer atau login dari perangkat lain, ukuran font akan tetap mengikuti preferensi akun.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ═══════════════ TAB: BANTUAN ═══════════════ */}
      {activeTab === "bantuan" && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ display: "flex", flexDirection: "column", gap: 24 }}
        >
          {/* ── Bantuan: Form Kirim Tiket ── */}
          {supportView === "form" && (
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <button
                  onClick={() => setSupportView("list")}
                  style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                >
                  <ArrowLeft style={{ width: 16, height: 16, color: "#fff" }} />
                </button>
                <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", fontFamily: FONT_HEADING }}>Kirim Tiket Baru</span>
              </div>
              <div style={cardBodyStyle}>
                <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                  {/* Subject */}
                  <div>
                    <label style={labelStyle}>Subject</label>
                    <input
                      value={supportSubject}
                      onChange={(e) => setSupportSubject(e.target.value)}
                      placeholder="Ringkasan masalah Anda"
                      maxLength={120}
                      style={inputBaseStyle}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    />
                  </div>
                  {/* Kategori */}
                  <div>
                    <label style={labelStyle}>Kategori</label>
                    <div style={{ position: "relative" }}>
                      <select
                        value={supportCategory}
                        onChange={(e) => setSupportCategory(e.target.value as SupportCategory)}
                        style={{
                          ...inputBaseStyle,
                          appearance: "none",
                          paddingRight: 36,
                          cursor: "pointer",
                        }}
                      >
                        <option value="bug">Bug / Masalah Teknis</option>
                        <option value="fitur">Permintaan Fitur</option>
                        <option value="akun">Akun & Login</option>
                        <option value="pembayaran">Pembayaran & Langganan</option>
                        <option value="lainnya">Lainnya</option>
                      </select>
                      <ChevronDown style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#94A3B8", pointerEvents: "none" }} />
                    </div>
                  </div>
                  {/* Pesan */}
                  <div>
                    <label style={labelStyle}>Pesan</label>
                    <textarea
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      placeholder="Jelaskan detail masalah atau permintaan Anda..."
                      rows={5}
                      style={{
                        ...inputBaseStyle,
                        resize: "vertical",
                        minHeight: 120,
                        lineHeight: 1.6,
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                  </div>
                  {/* Screenshot */}
                  <div>
                    <label style={labelStyle}>Screenshot (opsional, maks 5 MB)</label>
                    <input
                      ref={supportFileRef}
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotSelect}
                      style={{ display: "none" }}
                    />
                    {supportScreenshotPreview ? (
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                        <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "1.5px solid #E2E8F0" }}>
                          <img src={supportScreenshotPreview} alt="Preview" style={{ width: 120, height: 80, objectFit: "cover", display: "block" }} />
                          <button
                            onClick={() => { setSupportScreenshot(null); setSupportScreenshotPreview(null); if (supportFileRef.current) supportFileRef.current.value = ""; }}
                            style={{
                              position: "absolute", top: 4, right: 4, width: 22, height: 22, borderRadius: 11,
                              backgroundColor: "rgba(0,0,0,0.6)", border: "none", cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}
                          >
                            <X style={{ width: 12, height: 12, color: "#fff" }} />
                          </button>
                        </div>
                        <span style={{ fontSize: 12, color: "#64748B", fontFamily: FONT_BODY, marginTop: 4 }}>{supportScreenshot?.name}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => supportFileRef.current?.click()}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: 8,
                          padding: "10px 18px", borderRadius: 10, border: "1.5px dashed #CBD5E1",
                          backgroundColor: "#F8FAFC", cursor: "pointer", fontSize: 13,
                          color: "#64748B", fontFamily: FONT_BODY, transition: "all 150ms",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0D9488"; e.currentTarget.style.color = "#0D9488"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#CBD5E1"; e.currentTarget.style.color = "#64748B"; }}
                      >
                        <ImageIcon style={{ width: 16, height: 16 }} />
                        Lampirkan Screenshot
                      </button>
                    )}
                  </div>
                  {/* Submit */}
                  <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                    <button
                      onClick={() => setSupportView("list")}
                      style={{
                        padding: "11px 24px", borderRadius: 12, border: "1.5px solid #E2E8F0",
                        backgroundColor: "#fff", fontSize: 14, fontWeight: 600, color: "#64748B",
                        cursor: "pointer", fontFamily: FONT_BODY,
                      }}
                    >
                      Batal
                    </button>
                    <button
                      onClick={handleSubmitTicket}
                      disabled={supportSubmitting || !supportSubject.trim() || !supportMessage.trim()}
                      style={{
                        ...btnPrimaryStyle,
                        opacity: supportSubmitting || !supportSubject.trim() || !supportMessage.trim() ? 0.5 : 1,
                        cursor: supportSubmitting ? "wait" : "pointer",
                      }}
                    >
                      {supportSubmitting ? (
                        <><Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> Mengirim...</>
                      ) : (
                        <><Send style={{ width: 16, height: 16 }} /> Kirim Tiket</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Bantuan: Detail Tiket (Chat) ── */}
          {supportView === "detail" && (
            <div style={cardStyle}>
              <div style={{ ...cardHeaderStyle, justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <button
                    onClick={() => { setSupportView("list"); setSupportDetail(null); }}
                    style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                  >
                    <ArrowLeft style={{ width: 16, height: 16, color: "#fff" }} />
                  </button>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", fontFamily: FONT_HEADING }}>
                    {supportDetail?.subject || "Detail Tiket"}
                  </span>
                </div>
                {supportDetail && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8,
                    backgroundColor: supportDetail.status === "new" ? "rgba(13,148,136,0.2)" :
                      supportDetail.status === "in_progress" ? "rgba(245,158,11,0.2)" : "rgba(148,163,184,0.2)",
                    color: supportDetail.status === "new" ? "#0D9488" :
                      supportDetail.status === "in_progress" ? "#D97706" : "#64748B",
                    fontFamily: FONT_BODY,
                  }}>
                    {supportDetail.status === "new" ? "Baru" : supportDetail.status === "in_progress" ? "Diproses" : "Selesai"}
                  </span>
                )}
              </div>
              <div style={{ ...cardBodyStyle, padding: 0 }}>
                {supportDetailLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 48 }}>
                    <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: "#94A3B8" }} />
                  </div>
                ) : supportDetail ? (
                  <>
                    {/* Ticket info bar */}
                    <div style={{
                      padding: "12px 20px", backgroundColor: "#F8FAFC", borderBottom: "1px solid #E8ECF1",
                      display: "flex", flexWrap: "wrap", gap: 16, fontSize: 12, color: "#64748B", fontFamily: FONT_BODY,
                    }}>
                      <span>Kategori: <strong style={{ color: "#0C1E35" }}>
                        {supportDetail.category === "bug" ? "Bug" : supportDetail.category === "fitur" ? "Fitur" :
                         supportDetail.category === "akun" ? "Akun" : supportDetail.category === "pembayaran" ? "Pembayaran" : "Lainnya"}
                      </strong></span>
                      <span>Dibuat: <strong style={{ color: "#0C1E35" }}>{new Date(supportDetail.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</strong></span>
                    </div>
                    {/* Chat messages */}
                    <div style={{ padding: 20, maxHeight: 420, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }} className="custom-scrollbar">
                      {supportDetail.messages.map((msg) => {
                        const isUser = msg.sender === "user";
                        return (
                          <div
                            key={msg.id}
                            style={{
                              display: "flex",
                              justifyContent: isUser ? "flex-end" : "flex-start",
                            }}
                          >
                            <div style={{
                              maxWidth: "75%",
                              padding: "10px 16px",
                              borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                              backgroundColor: isUser ? "#0C1E35" : "#F1F5F9",
                              color: isUser ? "#fff" : "#0C1E35",
                              fontSize: 14,
                              lineHeight: 1.6,
                              fontFamily: FONT_BODY,
                              wordBreak: "break-word",
                            }}>
                              <div style={{ marginBottom: 4 }}>{msg.message}</div>
                              <div style={{
                                fontSize: 10, textAlign: "right",
                                color: isUser ? "rgba(255,255,255,0.5)" : "#94A3B8",
                              }}>
                                {new Date(msg.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={supportChatEndRef} />
                    </div>
                    {/* Reply box */}
                    {supportDetail.status !== "resolved" && (
                      <div style={{
                        padding: "14px 20px", borderTop: "1px solid #E8ECF1",
                        display: "flex", alignItems: "flex-end", gap: 10,
                      }}>
                        <textarea
                          value={supportReply}
                          onChange={(e) => setSupportReply(e.target.value)}
                          placeholder="Tulis balasan..."
                          rows={2}
                          style={{
                            ...inputBaseStyle,
                            resize: "none",
                            minHeight: 44,
                            flex: 1,
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSupportReply(); }
                          }}
                          onFocus={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; }}
                          onBlur={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }}
                        />
                        <button
                          onClick={handleSupportReply}
                          disabled={supportReplying || !supportReply.trim()}
                          style={{
                            width: 44, height: 44, borderRadius: 12, border: "none",
                            backgroundColor: supportReply.trim() ? "#0D9488" : "#E2E8F0",
                            cursor: supportReply.trim() ? "pointer" : "default",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            transition: "all 150ms", flexShrink: 0,
                          }}
                        >
                          {supportReplying ? (
                            <Loader2 className="animate-spin" style={{ width: 18, height: 18, color: "#fff" }} />
                          ) : (
                            <Send style={{ width: 18, height: 18, color: supportReply.trim() ? "#fff" : "#94A3B8" }} />
                          )}
                        </button>
                      </div>
                    )}
                    {supportDetail.status === "resolved" && (
                      <div style={{
                        padding: "14px 20px", borderTop: "1px solid #E8ECF1", textAlign: "center",
                        fontSize: 13, color: "#94A3B8", fontFamily: FONT_BODY,
                      }}>
                        <CheckCircle style={{ width: 14, height: 14, display: "inline", verticalAlign: "middle", marginRight: 6 }} />
                        Tiket ini telah ditandai selesai.
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ padding: 48, textAlign: "center", color: "#94A3B8", fontSize: 14, fontFamily: FONT_BODY }}>
                    Tiket tidak ditemukan.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Bantuan: List Tiket Saya ── */}
          {supportView === "list" && (
            <div style={cardStyle}>
              <div style={{ ...cardHeaderStyle, justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <HeadsetIcon style={{ width: 14, height: 14, color: "#ffffff" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", fontFamily: FONT_HEADING }}>Tiket Saya</span>
                </div>
                <button
                  onClick={() => setSupportView("form")}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "6px 14px", borderRadius: 8, border: "1.5px solid rgba(255,255,255,0.2)",
                    backgroundColor: "rgba(255,255,255,0.1)", cursor: "pointer",
                    fontSize: 12, fontWeight: 600, color: "#fff", fontFamily: FONT_BODY,
                    transition: "all 150ms",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.1)"; }}
                >
                  <Plus style={{ width: 14, height: 14 }} />
                  Tiket Baru
                </button>
              </div>
              <div style={cardBodyStyle}>
                {supportLoading ? (
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: 48 }}>
                    <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: "#94A3B8" }} />
                  </div>
                ) : supportTickets.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <HeadsetIcon style={{ width: 40, height: 40, color: "#CBD5E1", margin: "0 auto 12px" }} />
                    <p style={{ fontSize: 15, fontWeight: 600, color: "#0C1E35", margin: "0 0 6px", fontFamily: FONT_HEADING }}>
                      Belum ada tiket bantuan
                    </p>
                    <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 20px", fontFamily: FONT_BODY }}>
                      Ada kendala atau pertanyaan? Kirim tiket dan tim kami akan membantu.
                    </p>
                    <button
                      onClick={() => setSupportView("form")}
                      style={btnPrimaryStyle}
                    >
                      <Send style={{ width: 16, height: 16 }} />
                      Kirim Tiket Pertama
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {supportTickets.map((ticket) => {
                      const statusLabel = ticket.status === "new" ? "Baru" : ticket.status === "in_progress" ? "Diproses" : "Selesai";
                      const statusBg = ticket.status === "new" ? "#ECFDF5" : ticket.status === "in_progress" ? "#FFFBEB" : "#F1F5F9";
                      const statusColor = ticket.status === "new" ? "#0D9488" : ticket.status === "in_progress" ? "#D97706" : "#94A3B8";
                      return (
                        <button
                          key={ticket.id}
                          onClick={() => openTicketDetail(ticket.id)}
                          style={{
                            display: "flex", alignItems: "center", gap: 14,
                            padding: "14px 16px", borderRadius: 12,
                            border: "1.5px solid #E8ECF1", backgroundColor: "#fff",
                            cursor: "pointer", textAlign: "left", width: "100%",
                            transition: "all 150ms", fontFamily: FONT_BODY,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#0D9488"; e.currentTarget.style.backgroundColor = "#FAFFFE"; }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E8ECF1"; e.currentTarget.style.backgroundColor = "#fff"; }}
                        >
                          <div style={{
                            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                            backgroundColor: statusBg,
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <MessageCircle style={{ width: 18, height: 18, color: statusColor }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                              <span style={{
                                fontSize: 14, fontWeight: 600, color: "#0C1E35",
                                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                              }}>
                                {ticket.subject}
                              </span>
                              <span style={{
                                fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
                                backgroundColor: statusBg, color: statusColor,
                                flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.04em",
                              }}>
                                {statusLabel}
                              </span>
                              {ticket.unread && (
                                <span style={{
                                  width: 8, height: 8, borderRadius: 4,
                                  backgroundColor: "#EF4444", flexShrink: 0,
                                }} />
                              )}
                            </div>
                            <div style={{ fontSize: 12, color: "#94A3B8" }}>
                              {new Date(ticket.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                              {" · "}
                              {ticket.category === "bug" ? "Bug" : ticket.category === "fitur" ? "Fitur" :
                               ticket.category === "akun" ? "Akun" : ticket.category === "pembayaran" ? "Pembayaran" : "Lainnya"}
                            </div>
                          </div>
                          <ChevronDown style={{ width: 16, height: 16, color: "#CBD5E1", transform: "rotate(-90deg)", flexShrink: 0 }} />
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
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
        message={`Apakah Anda yakin ingin menghapus Kop Surat ${kopToDelete !== null ? kopToDelete + 1 : ""}? Data kop surat ini akan dihapus secara permanen. Setelah dihapus, Anda tidak dapat menambahkan kop surat baru selama ${DELETE_COOLDOWN_DAYS} hari.`}
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
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 16,
            }}
            onClick={() => {
              setKopVerifyModal(null);
              setKopVerifyInput("");
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "#fff",
                borderRadius: 20,
                padding: 32,
                maxWidth: 460,
                width: "100%",
                boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: "#FFF7ED",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Shield style={{ width: 20, height: 20, color: "#EA580C" }} />
                </div>
                <div>
                  <h3
                    style={{ fontSize: 16, fontWeight: 800, color: "#0C1E35" }}
                  >
                    Konfirmasi Perubahan Identitas
                  </h3>
                  <p style={{ fontSize: 12, color: "#64748B" }}>
                    Perubahan ini tidak dapat diubah selama {COOLDOWN_DAYS} hari
                  </p>
                </div>
              </div>

              <div
                style={{
                  padding: 14,
                  backgroundColor: "#FEF2F2",
                  border: "1px solid #FECACA",
                  borderRadius: 12,
                  marginBottom: 20,
                }}
              >
                <div
                  style={{ display: "flex", alignItems: "flex-start", gap: 8 }}
                >
                  <AlertTriangle
                    style={{
                      width: 16,
                      height: 16,
                      color: "#DC2626",
                      flexShrink: 0,
                      marginTop: 1,
                    }}
                  />
                  <div
                    style={{ fontSize: 12, color: "#991B1B", lineHeight: 1.6 }}
                  >
                    <strong>Peringatan:</strong> Anda sedang mengubah{" "}
                    {kopVerifyModal.type === "both"
                      ? "nama dan logo"
                      : kopVerifyModal.type === "name"
                        ? "nama"
                        : "logo"}{" "}
                    kop surat. Setelah disimpan,{" "}
                    {kopVerifyModal.type === "both"
                      ? "nama dan logo"
                      : kopVerifyModal.type === "name"
                        ? "nama"
                        : "logo"}{" "}
                    akan terkunci selama <strong>{COOLDOWN_DAYS} hari</strong>.
                  </div>
                </div>
              </div>

              {kopVerifyModal.type !== "logo" && kopVerifyModal.oldName && (
                <div
                  style={{
                    marginBottom: 16,
                    padding: 12,
                    backgroundColor: "#F8FAFC",
                    borderRadius: 10,
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <p
                    style={{ fontSize: 11, color: "#94A3B8", marginBottom: 4 }}
                  >
                    Nama sebelumnya:
                  </p>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#475569",
                      textDecoration: "line-through",
                    }}
                  >
                    {kopVerifyModal.oldName}
                  </p>
                  <p
                    style={{
                      fontSize: 11,
                      color: "#94A3B8",
                      marginBottom: 4,
                      marginTop: 8,
                    }}
                  >
                    Nama baru:
                  </p>
                  <p
                    style={{ fontSize: 13, fontWeight: 700, color: "#0C1E35" }}
                  >
                    {kopVerifyModal.newName}
                  </p>
                </div>
              )}

              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "#475569",
                    display: "block",
                    marginBottom: 6,
                  }}
                >
                  Ketik "<strong>KONFIRMASI</strong>" untuk melanjutkan:
                </label>
                <input
                  type="text"
                  value={kopVerifyInput}
                  onChange={(e) => setKopVerifyInput(e.target.value)}
                  placeholder="KONFIRMASI"
                  style={inputBaseStyle}
                  onFocus={handleInputFocus}
                  onBlur={handleInputBlur}
                  autoFocus
                />
              </div>

              <div
                style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}
              >
                <button
                  onClick={() => {
                    setKopVerifyModal(null);
                    setKopVerifyInput("");
                  }}
                  style={{
                    padding: "10px 20px",
                    fontSize: 13,
                    fontWeight: 700,
                    color: "#475569",
                    backgroundColor: "#F1F5F9",
                    border: "1px solid #E2E8F0",
                    borderRadius: 12,
                    cursor: "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    transition: "background-color 0.15s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#E2E8F0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#F1F5F9";
                  }}
                >
                  Batalkan
                </button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleConfirmKopVerify}
                  disabled={kopVerifyInput !== "KONFIRMASI"}
                  style={{
                    ...btnPrimaryStyle,
                    opacity: kopVerifyInput === "KONFIRMASI" ? 1 : 0.4,
                    cursor:
                      kopVerifyInput === "KONFIRMASI"
                        ? "pointer"
                        : "not-allowed",
                    backgroundColor: "#DC2626",
                  }}
                  onMouseEnter={(e) => {
                    if (kopVerifyInput === "KONFIRMASI")
                      e.currentTarget.style.backgroundColor = "#B91C1C";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#DC2626";
                  }}
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
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 16,
            }}
            onClick={() => setShowMismatchModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
                padding: 32,
                maxWidth: 448,
                width: "100%",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  marginBottom: 16,
                }}
              >
                <div style={iconBoxStyle("#FEF2F2")}>
                  <AlertTriangle
                    style={{ width: 20, height: 20, color: "#EF4444" }}
                  />
                </div>
                <h3 style={sectionHeadingStyle}>Akun Tidak Cocok</h3>
              </div>
              <p style={{ fontSize: 14, color: "#475569", marginBottom: 24 }}>
                File backup ini milik akun lain. Restore hanya dapat dilakukan
                menggunakan backup dari akun yang sama.
              </p>
              <button
                onClick={() => setShowMismatchModal(false)}
                style={{
                  ...btnPrimaryStyle,
                  width: "100%",
                  justifyContent: "center",
                  padding: "12px 24px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "#1a3a5c";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "#0C1E35";
                }}
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
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 16,
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
                padding: 32,
                maxWidth: 512,
                width: "100%",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={iconBoxStyle("#FFFBEB")}>
                    <AlertTriangle
                      style={{ width: 20, height: 20, color: "#F59E0B" }}
                    />
                  </div>
                  <div>
                    <h3 style={sectionHeadingStyle}>Konflik Sesi</h3>
                    <p style={{ fontSize: 12, color: "#94A3B8" }}>
                      {currentConflictIdx + 1} dari {restoreConflicts.length}{" "}
                      konflik
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowConflictModal(false);
                    finalizeRestore(restoreNewSessions, conflictResults);
                  }}
                  style={{
                    padding: 8,
                    background: "none",
                    border: "none",
                    borderRadius: 8,
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                  }}
                >
                  <X style={{ width: 16, height: 16, color: "#94A3B8" }} />
                </button>
              </div>

              <p style={{ fontSize: 14, color: "#475569", marginBottom: 16 }}>
                Sesi dengan ID yang sama sudah ada di data lokal:
              </p>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                  marginBottom: 24,
                }}
              >
                <div
                  style={{
                    padding: 16,
                    backgroundColor: "#F8FAFC",
                    borderRadius: 12,
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#64748B",
                      marginBottom: 8,
                    }}
                  >
                    Data Lokal
                  </p>
                  <p
                    style={{ fontSize: 14, fontWeight: 700, color: "#0C1E35" }}
                  >
                    {
                      restoreConflicts[currentConflictIdx].existingSession
                        .patient.name
                    }
                  </p>
                  <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                    {new Date(
                      restoreConflicts[currentConflictIdx].existingSession.date,
                    ).toLocaleDateString("id-ID")}
                  </p>
                </div>
                <div
                  style={{
                    padding: 16,
                    backgroundColor: "#EFF6FF",
                    borderRadius: 12,
                    border: "1px solid #BFDBFE",
                  }}
                >
                  <p
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#60A5FA",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                      marginBottom: 8,
                    }}
                  >
                    Dari Backup
                  </p>
                  <p
                    style={{ fontSize: 14, fontWeight: 700, color: "#0C1E35" }}
                  >
                    {
                      restoreConflicts[currentConflictIdx].backupSession.patient
                        .name
                    }
                  </p>
                  <p style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                    {new Date(
                      restoreConflicts[currentConflictIdx].backupSession.date,
                    ).toLocaleDateString("id-ID")}
                  </p>
                </div>
              </div>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 24,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={applyToAll}
                  onChange={(e) => setApplyToAll(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: "#0C1E35" }}
                />
                <span
                  style={{ fontSize: 12, color: "#475569", fontWeight: 500 }}
                >
                  Terapkan ke semua konflik tersisa
                </span>
              </label>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <button
                  onClick={() => handleConflictAction("skip")}
                  style={{
                    padding: "12px 0",
                    backgroundColor: "#F1F5F9",
                    color: "#475569",
                    borderRadius: 12,
                    fontSize: 14,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#E2E8F0";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#F1F5F9";
                  }}
                >
                  {applyToAll ? "Lewati Semua" : "Lewati"}
                </button>
                <button
                  onClick={() => handleConflictAction("overwrite")}
                  style={{
                    ...btnPrimaryStyle,
                    justifyContent: "center",
                    padding: "12px 0",
                    width: "100%",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#1a3a5c";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#0C1E35";
                  }}
                >
                  {applyToAll ? "Timpa Semua" : "Timpa"}
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
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: 16,
            }}
            onClick={() => closeCropModal()}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
                width: "100%",
                maxWidth: 680,
                overflow: "hidden",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: 20,
                  borderBottom: "1px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={iconBoxStyle("rgba(12,30,53,0.1)")}>
                    <Crop style={{ width: 20, height: 20, color: "#0C1E35" }} />
                  </div>
                  <div>
                    <h3
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: "#0C1E35",
                      }}
                    >
                      Crop & Zoom Logo
                    </h3>
                    <p style={{ fontSize: 12, color: "#64748B" }}>
                      Sesuaikan area logo yang akan digunakan.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => closeCropModal()}
                  style={{
                    padding: 8,
                    borderRadius: 8,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#94A3B8",
                    transition: "background-color 0.15s",
                  }}
                >
                  <X style={{ width: 20, height: 20 }} />
                </button>
              </div>

              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 480,
                  backgroundColor: "#0F172A",
                  touchAction: "none",
                }}
              >
                <Cropper
                  image={cropImageSrc}
                  crop={cropState}
                  zoom={cropZoom}
                  minZoom={0.5}
                  maxZoom={5}
                  onCropChange={setCropState}
                  onZoomChange={setCropZoom}
                  onCropComplete={onCropComplete}
                  showGrid={true}
                  objectFit="contain"
                  restrictPosition={false}
                  style={{
                    containerStyle: { background: "#0f172a", touchAction: "none" },
                    cropAreaStyle: { border: "2px solid #0C1E35" },
                  }}
                />
              </div>

              <div
                style={{
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <ZoomOut
                    style={{
                      width: 16,
                      height: 16,
                      color: "#94A3B8",
                      flexShrink: 0,
                    }}
                  />
                  <input
                    type="range"
                    min={0.5}
                    max={5}
                    step={0.1}
                    value={cropZoom}
                    onChange={(e) => setCropZoom(Number(e.target.value))}
                    style={{ flex: 1, accentColor: "#0C1E35", height: 6 }}
                  />
                  <ZoomIn
                    style={{
                      width: 16,
                      height: 16,
                      color: "#94A3B8",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#64748B",
                      width: 40,
                      textAlign: "right",
                    }}
                  >
                    {Math.round(cropZoom * 100)}%
                  </span>
                </div>

                <div style={{ display: "flex", gap: 12 }}>
                  <button
                    onClick={() => closeCropModal()}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      backgroundColor: "#F1F5F9",
                      color: "#475569",
                      fontWeight: 700,
                      borderRadius: 12,
                      fontSize: 14,
                      border: "none",
                      cursor: "pointer",
                      transition: "background-color 0.15s",
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#E2E8F0";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#F1F5F9";
                    }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={handleCropConfirm}
                    style={{
                      ...btnPrimaryStyle,
                      flex: 1,
                      justifyContent: "center",
                      padding: "12px 16px",
                      boxShadow: "0 8px 24px rgba(12,30,53,0.1)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = "#1a3a5c";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = "#0C1E35";
                    }}
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
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 50,
              padding: 16,
            }}
            onClick={() => setShowPlanModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              style={{
                backgroundColor: "#fff",
                borderRadius: 16,
                maxWidth: 560,
                width: "100%",
                boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
                overflow: "hidden",
                maxHeight: "90vh",
                display: "flex",
                flexDirection: "column",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                style={{
                  padding: 24,
                  borderBottom: "1px solid #E2E8F0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  flexShrink: 0,
                }}
              >
                <div>
                  <h3 style={sectionHeadingStyle}>Pilih Paket</h3>
                  <p style={{ ...mutedTextStyle, marginTop: 2 }}>
                    Pilih paket yang sesuai kebutuhan Anda
                  </p>
                </div>
                <button
                  onClick={() => setShowPlanModal(false)}
                  style={{
                    padding: 8,
                    background: "none",
                    border: "none",
                    borderRadius: 12,
                    cursor: "pointer",
                    transition: "background-color 0.15s",
                  }}
                >
                  <X style={{ width: 20, height: 20, color: "#94A3B8" }} />
                </button>
              </div>

              <div style={{ padding: 24, overflowY: "auto", flex: 1 }}>
                {plansLoading ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "#94A3B8",
                      fontSize: 14,
                    }}
                  >
                    <Loader2
                      className="animate-spin"
                      style={{
                        width: 24,
                        height: 24,
                        color: "#CBD5E1",
                        margin: "0 auto 12px",
                      }}
                    />
                    Memuat paket...
                  </div>
                ) : plans.length === 0 ? (
                  <div
                    style={{
                      textAlign: "center",
                      padding: 40,
                      color: "#94A3B8",
                      fontSize: 14,
                    }}
                  >
                    Tidak ada paket tersedia
                  </div>
                ) : (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                    }}
                  >
                    {plans.map((planItem) => {
                      const isSelected = selectedPlanId === planItem.id;
                      const isAnnual = planItem.billing_cycle === "annual";
                      return (
                        <div
                          key={planItem.id}
                          onClick={() => setSelectedPlanId(planItem.id)}
                          style={{
                            border: isSelected
                              ? "2px solid #0C1E35"
                              : "1px solid #E2E8F0",
                            borderRadius: 16,
                            padding: "20px 24px",
                            cursor: "pointer",
                            backgroundColor: isSelected ? "#F8FAFC" : "white",
                            transition: "all 150ms",
                            position: "relative",
                          }}
                        >
                          {isAnnual && (
                            <span
                              style={{
                                position: "absolute",
                                top: -10,
                                right: 16,
                                backgroundColor: "#0C1E35",
                                color: "white",
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "3px 12px",
                                borderRadius: 999,
                                letterSpacing: "0.05em",
                              }}
                            >
                              PALING HEMAT
                            </span>
                          )}
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "flex-start",
                            }}
                          >
                            <div>
                              <div
                                style={{
                                  fontSize: 16,
                                  fontWeight: 700,
                                  color: "#0C1E35",
                                  marginBottom: 4,
                                }}
                              >
                                {planItem.product_name || "Paket"} —{" "}
                                {isAnnual ? "Tahunan" : "Bulanan"}
                              </div>
                              {planItem.original_price &&
                                planItem.original_price > planItem.price && (
                                  <div
                                    style={{
                                      fontSize: 13,
                                      color: "#94A3B8",
                                      textDecoration: "line-through",
                                      marginBottom: 2,
                                    }}
                                  >
                                    {formatRupiah(planItem.original_price)}
                                  </div>
                                )}
                              <div
                                style={{
                                  fontSize: 24,
                                  fontWeight: 800,
                                  color: "#0C1E35",
                                }}
                              >
                                {formatRupiah(planItem.price)}
                                <span
                                  style={{
                                    fontSize: 13,
                                    fontWeight: 400,
                                    color: "#94A3B8",
                                    marginLeft: 4,
                                  }}
                                >
                                  /bulan
                                </span>
                              </div>
                              {isAnnual && monthlySavings > 0 && (
                                <p
                                  style={{
                                    fontSize: 12,
                                    color: "#94A3B8",
                                    marginTop: 4,
                                  }}
                                >
                                  Ditagih {formatRupiah(annualTotal)}/tahun ·
                                  Hemat {formatRupiah(monthlySavings)}
                                </p>
                              )}
                            </div>
                            <div
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                border: isSelected
                                  ? "none"
                                  : "2px solid #E2E8F0",
                                backgroundColor: isSelected
                                  ? "#0C1E35"
                                  : "transparent",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                marginTop: 4,
                              }}
                            >
                              {isSelected && (
                                <div
                                  style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    backgroundColor: "white",
                                  }}
                                />
                              )}
                            </div>
                          </div>

                          {Array.isArray(planItem.features) &&
                            planItem.features.length > 0 &&
                            (() => {
                              const filtered = planItem.features.filter(
                                (f: string) => !/^hemat\s+rp/i.test(f.trim()),
                              );
                              return (
                                filtered.length > 0 && (
                                  <div
                                    style={{
                                      marginTop: 12,
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 6,
                                    }}
                                  >
                                    {filtered
                                      .slice(0, 4)
                                      .map((f: string, i: number) => (
                                        <div
                                          key={i}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 8,
                                            fontSize: 13,
                                            color: "#64748B",
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: 16,
                                              height: 16,
                                              borderRadius: "50%",
                                              backgroundColor: "#ECFDF5",
                                              display: "flex",
                                              alignItems: "center",
                                              justifyContent: "center",
                                              flexShrink: 0,
                                            }}
                                          >
                                            <svg
                                              width="10"
                                              height="10"
                                              viewBox="0 0 10 10"
                                              fill="none"
                                            >
                                              <path
                                                d="M2 5l2 2 4-4"
                                                stroke="#10B981"
                                                strokeWidth="1.5"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                              />
                                            </svg>
                                          </div>
                                          {f}
                                        </div>
                                      ))}
                                    {filtered.length > 4 && (
                                      <div
                                        style={{
                                          fontSize: 12,
                                          color: "#94A3B8",
                                          marginLeft: 24,
                                        }}
                                      >
                                        +{filtered.length - 4} fitur lainnya
                                      </div>
                                    )}
                                  </div>
                                )
                              );
                            })()}
                        </div>
                      );
                    })}
                  </div>
                )}

                {selectedPlanId && (
                  <div style={{ marginTop: 20 }}>
                    <button
                      onClick={() => {
                        const selected = plans.find(
                          (p) => p.id === selectedPlanId,
                        );
                        if (selected) {
                          setShowPlanModal(false);
                          onCheckout(selected);
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "14px 0",
                        backgroundColor: "#0C1E35",
                        color: "white",
                        border: "none",
                        borderRadius: 12,
                        fontSize: 15,
                        fontWeight: 700,
                        cursor: "pointer",
                        boxShadow: "0 4px 20px rgba(12,30,53,0.25)",
                        transition: "background-color 150ms",
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.backgroundColor = "#1a3a5c")
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.backgroundColor = "#0C1E35")
                      }
                    >
                      Lanjutkan Pembayaran
                    </button>

                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
        </div>
      </div>
    </div>
  );
}