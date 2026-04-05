import React, { useState } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, Save, Loader2, Info, CheckCircle2, User,
  CreditCard, FileText, ChevronRight, Shield, Clock,
} from "lucide-react";
import { aexonConnect } from "../lib/aexonConnect";
import { UserProfile, HospitalSettings } from "../types";
import { SubscriptionStatus } from "../lib/aexonConnect";
import { useToast } from "./ToastProvider";
import ConfirmModal from "./ConfirmModal";

interface ProfilePageProps {
  userProfile: UserProfile;
  plan: "subscription" | "enterprise" | "trial" | null;
  onBack: () => void;
  onUpdateUser: (profile: UserProfile) => void;
  subscriptionData?: SubscriptionStatus | null;
  trialDaysLeft?: number | null;
  hospitalSettingsList?: HospitalSettings[];
  onNavigateToSubscription?: () => void;
  onNavigateToSettings?: () => void;
  onNavigateToBantuan?: () => void;
}

const HeadsetIcon = ({ style }: { style?: React.CSSProperties }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" style={{ width: 16, height: 16, ...style }}>
    <path d="M4 17V12a8 8 0 0 1 16 0v5" />
    <rect x="2" y="14" width="4" height="6" rx="1.5" />
    <path d="M6 20v1.5a1.5 1.5 0 0 0 1.5 1.5H10" />
    <path d="M10 23a2.5 2.5 0 0 0 2.5-2.5v0a1 1 0 0 0-1-1H10" />
  </svg>
);

const NAME_COOLDOWN_DAYS = 14;
const FONT_BODY = "'Plus Jakarta Sans', sans-serif";
const FONT_HEADING = "'Plus Jakarta Sans', sans-serif";

function getInitials(name: string) {
  return (name || "D").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "–";
  return new Date(dateStr).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
}

export default function ProfilePage({
  userProfile, plan, onBack, onUpdateUser,
  subscriptionData, trialDaysLeft,
  hospitalSettingsList = [],
  onNavigateToSubscription,
  onNavigateToSettings,
  onNavigateToBantuan,
}: ProfilePageProps) {
  const { showToast } = useToast();
  const isDokterInstitusi = !!(userProfile.role !== "admin" && userProfile.enterprise_id);

  // Cooldown: source of truth is userProfile.lastNameChangeDate from server (doctor_accounts.last_name_change_at)
  const cooldownInfo = (() => {
    if (isDokterInstitusi) return { canEdit: false, daysLeft: 0 };
    const serverDate = userProfile.lastNameChangeDate;
    if (!serverDate) return { canEdit: true, daysLeft: 0 };
    const lastChange = new Date(serverDate);
    const diffDays = Math.ceil((Date.now() - lastChange.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < NAME_COOLDOWN_DAYS) return { canEdit: false, daysLeft: NAME_COOLDOWN_DAYS - diffDays };
    return { canEdit: true, daysLeft: 0 };
  })();

  const nameDisabled = isDokterInstitusi || !cooldownInfo.canEdit;

  const [form, setForm] = useState<UserProfile>({ ...userProfile });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showNameConfirm, setShowNameConfirm] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Block name changes when disabled (defense in depth — input is already disabled)
    if (e.target.name === "name" && nameDisabled) return;
    setForm({ ...form, [e.target.name]: e.target.value });
    setSaved(false);
  };

  const nameChanged = !nameDisabled && form.name !== userProfile.name;

  const doSave = async () => {
    setSaving(true);
    try {
      const payload: Record<string, any> = { specialty: form.specialization || null };
      if (!isDokterInstitusi) {
        // Only send full_name if name is editable and actually changed
        payload.full_name = nameChanged ? form.name : userProfile.name;
        payload.str_number = form.strNumber || null;
        payload.phone = form.phone;
      }
      if (nameChanged) {
        payload.last_name_change_at = new Date().toISOString();
      }
      const { error } = await aexonConnect.updateProfile(payload);
      if (error) { showToast("Gagal menyimpan: " + error, "error"); return; }
      const newCooldown = nameChanged ? new Date().toISOString() : userProfile.lastNameChangeDate;
      onUpdateUser({ ...form, name: nameChanged ? form.name : userProfile.name, lastNameChangeDate: newCooldown });
      setSaved(true);
      showToast("Profil berhasil disimpan.", "success");
      setTimeout(() => setSaved(false), 3000);
    } catch {
      showToast("Gagal terhubung ke server.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nameChanged) {
      setShowNameConfirm(true);
    } else {
      doSave();
    }
  };

  // ── Subscription helpers ──
  const sub = subscriptionData;
  const getSubBadge = () => {
    if (!sub) return { label: "Tidak Aktif", color: "#94A3B8", bg: "#F1F5F9", dot: "#CBD5E1" };
    switch (sub.status) {
      case "active": return { label: "Aktif", color: "#059669", bg: "#ECFDF5", dot: "#10B981" };
      case "trial": return { label: `Trial${trialDaysLeft != null ? ` · ${trialDaysLeft} hari` : ""}`, color: "#2563EB", bg: "#EFF6FF", dot: "#60A5FA" };
      case "pending": return { label: "Menunggu Pembayaran", color: "#D97706", bg: "#FFFBEB", dot: "#F59E0B" };
      case "expired": return { label: "Expired", color: "#DC2626", bg: "#FEF2F2", dot: "#F87171" };
      case "cancelled": return { label: "Dibatalkan", color: "#DC2626", bg: "#FEF2F2", dot: "#F87171" };
      default: return { label: "Tidak Aktif", color: "#94A3B8", bg: "#F1F5F9", dot: "#CBD5E1" };
    }
  };
  const badge = getSubBadge();

  // ── Styles ──
  const inputBase: React.CSSProperties = {
    width: "100%", padding: "11px 14px", borderRadius: 10, border: "1.5px solid #E2E8F0",
    fontSize: 14, color: "#0C1E35", backgroundColor: "#FFFFFF", outline: "none",
    fontFamily: FONT_BODY, transition: "border-color 150ms, box-shadow 150ms", boxSizing: "border-box",
  };
  const readOnlyStyle: React.CSSProperties = { ...inputBase, backgroundColor: "#F8FAFC", color: "#94A3B8", cursor: "not-allowed" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: 11, fontWeight: 600, color: "#64748B", marginBottom: 6, letterSpacing: "0.04em", textTransform: "uppercase", fontFamily: FONT_BODY };
  const cardBase: React.CSSProperties = { backgroundColor: "#ffffff", borderRadius: 16, border: "1px solid #E8ECF1", overflow: "hidden" };
  const cardHeaderStyle: React.CSSProperties = { padding: "14px 20px", borderBottom: "none", display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)", borderRadius: "16px 16px 0 0" };
  const ctaBtn: React.CSSProperties = {
    width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "12px 16px", backgroundColor: "#FAFBFC", border: "1.5px solid #E2E8F0",
    borderRadius: 12, cursor: "pointer", transition: "all 120ms", fontFamily: FONT_BODY,
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#F4F6F8", overflow: "hidden" }}>

      {/* ── Header ── */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #E8ECF1", padding: "14px 28px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#64748B", fontFamily: FONT_BODY }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#0C1E35")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Kembali
        </button>
        <div style={{ height: 16, width: 1, backgroundColor: "#E2E8F0" }} />
        <span style={{ fontSize: 16, fontWeight: 800, color: "#0C1E35", fontFamily: FONT_HEADING }}>Profil</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 80px" }} className="custom-scrollbar">
        <div style={{ maxWidth: 980, margin: "0 auto" }}>

          {/* ── Hero banner ── */}
          <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            style={{
              ...cardBase, marginBottom: 24, padding: 0, position: "relative",
              background: "linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)",
              border: "none",
            }}>
            {/* Subtle pattern overlay */}
            <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)", backgroundSize: "60px 60px, 40px 40px" }} />

            <div style={{ position: "relative", padding: "32px 32px", display: "flex", alignItems: "center", gap: 24 }}>
              {/* Avatar */}
              <div style={{
                width: 80, height: 80, borderRadius: 20, flexShrink: 0,
                background: "linear-gradient(135deg, #60A5FA, #2563EB)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 20px rgba(37,99,235,0.3)",
              }}>
                <span style={{ color: "#fff", fontWeight: 900, fontSize: 28, fontFamily: FONT_HEADING }}>{getInitials(form.name)}</span>
              </div>

              {/* Info */}
              <div style={{ flex: 1 }}>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: "#FFFFFF", margin: "0 0 4px", fontFamily: FONT_HEADING, lineHeight: 1.2 }}>
                  {form.name || "–"}
                </h1>
                <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: 0, fontFamily: FONT_BODY }}>
                  {form.specialization || "Belum diatur"}
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                  {isDokterInstitusi && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "4px 12px", fontSize: 11, fontWeight: 700, borderRadius: 8, backgroundColor: "rgba(13,148,136,0.15)", color: "#5EEAD4", fontFamily: FONT_BODY }}>
                      <Shield style={{ width: 12, height: 12 }} /> Dokter Institusi
                    </span>
                  )}
                </div>
              </div>

              {/* Status badge */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 14px",
                  borderRadius: 10, fontSize: 12, fontWeight: 700,
                  backgroundColor: "rgba(255,255,255,0.1)", backdropFilter: "blur(8px)",
                  color: "#FFFFFF", fontFamily: FONT_BODY, border: "1px solid rgba(255,255,255,0.08)",
                }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: badge.dot }} />
                  {badge.label}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", fontFamily: FONT_BODY }}>{form.email}</span>
              </div>
            </div>
          </motion.div>

          {/* ── Content: stacked cards ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

            {/* ═══ 1. Informasi Akun ═══ */}
            <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.06 }} style={cardBase}>
              {isDokterInstitusi && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 20px", backgroundColor: "#EFF6FF", borderBottom: "1px solid #DBEAFE" }}>
                  <Info style={{ width: 14, height: 14, color: "#3B82F6", flexShrink: 0, marginTop: 2 }} />
                  <p style={{ fontSize: 12, color: "#1D4ED8", lineHeight: 1.6, margin: 0, fontFamily: FONT_BODY }}>Nama dan email dikelola oleh Admin Institusi.</p>
                </div>
              )}
              <div style={cardHeaderStyle}>
                <User style={{ width: 14, height: 14, color: "#ffffff" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", fontFamily: FONT_HEADING }}>Informasi Akun</span>
              </div>
              <form onSubmit={handleSave} style={{ padding: 20 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>

                  {/* Nama */}
                  <div>
                    <label style={labelStyle}>Nama Lengkap & Gelar</label>
                    <input type="text" name="name" value={form.name || ""} onChange={handleChange}
                      disabled={nameDisabled}
                      style={nameDisabled ? { ...readOnlyStyle, opacity: 0.6 } : inputBase}
                      onFocus={(e) => { if (!nameDisabled) { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; } }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }} />
                    {!isDokterInstitusi && !cooldownInfo.canEdit && cooldownInfo.daysLeft > 0 && (
                      <p style={{ fontSize: 10, color: "#D97706", margin: "5px 0 0 2px", fontWeight: 600, fontFamily: FONT_BODY }}>
                        <Clock style={{ width: 10, height: 10, verticalAlign: "middle", marginRight: 3 }} />
                        Dapat diubah lagi dalam {cooldownInfo.daysLeft} hari
                      </p>
                    )}
                    {!isDokterInstitusi && cooldownInfo.canEdit && (
                      <p style={{ fontSize: 10, color: "#94A3B8", margin: "5px 0 0 2px", fontFamily: FONT_BODY }}>Dapat diubah sekali setiap {NAME_COOLDOWN_DAYS} hari</p>
                    )}
                  </div>

                  {/* Email */}
                  <div>
                    <label style={labelStyle}>Email</label>
                    <input type="email" value={form.email || ""} readOnly style={readOnlyStyle} />
                  </div>

                  {/* Spesialisasi */}
                  <div>
                    <label style={labelStyle}>Spesialisasi</label>
                    <input type="text" name="specialization" value={form.specialization || ""} onChange={handleChange} style={inputBase} placeholder="Contoh: Gastroenterohepatologi"
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }} />
                  </div>

                  {/* WhatsApp */}
                  {!isDokterInstitusi && (
                    <div>
                      <label style={labelStyle}>Nomor WhatsApp</label>
                      <input type="tel" name="phone" value={form.phone || ""} onChange={handleChange} style={inputBase} placeholder="08xx-xxxx-xxxx"
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }} />
                    </div>
                  )}

                  {/* STR */}
                  {!isDokterInstitusi && (
                    <div>
                      <label style={labelStyle}>No. STR</label>
                      <input type="text" name="strNumber" value={form.strNumber || ""} onChange={handleChange} style={inputBase} placeholder="16 digit nomor STR"
                        onFocus={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(37,99,235,0.08)"; }}
                        onBlur={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.boxShadow = "none"; }} />
                    </div>
                  )}
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 12, borderTop: "1px solid #F1F5F9" }}>
                  <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={saving}
                    style={{
                      display: "flex", alignItems: "center", gap: 8, padding: "11px 28px",
                      background: saved ? "linear-gradient(135deg, #059669, #10B981)" : "linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)",
                      color: "#fff", border: "none", borderRadius: 12, fontSize: 14, fontWeight: 700,
                      cursor: saving ? "not-allowed" : "pointer", fontFamily: FONT_HEADING,
                      opacity: saving ? 0.7 : 1, transition: "all 200ms",
                      boxShadow: saving ? "none" : "0 2px 8px rgba(12,30,53,0.15)",
                    }}>
                    {saving ? <><Loader2 className="animate-spin" style={{ width: 15, height: 15 }} /> Menyimpan...</>
                      : saved ? <><CheckCircle2 style={{ width: 15, height: 15 }} /> Tersimpan</>
                        : <><Save style={{ width: 15, height: 15 }} /> Simpan Perubahan</>}
                  </motion.button>
                </div>
              </form>
            </motion.div>

            {/* ═══ 2. Langganan + Kop Surat (side by side) ═══ */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>

              {/* ── Langganan card ── */}
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.12 }} style={cardBase}>
                <div style={cardHeaderStyle}>
                  <CreditCard style={{ width: 14, height: 14, color: "#ffffff" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", fontFamily: FONT_HEADING }}>Langganan</span>
                </div>
                <div style={{ padding: 20 }}>

                  {/* Badge */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, backgroundColor: badge.bg, color: badge.color, fontFamily: FONT_BODY }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: badge.dot }} />
                      {badge.label}
                    </span>
                  </div>

                  {/* Details */}
                  {sub ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
                      {sub.plan_name && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT_BODY }}>Paket</p>
                          <p style={{ fontSize: 15, color: "#0C1E35", margin: 0, fontWeight: 700, fontFamily: FONT_HEADING }}>{sub.plan_name}</p>
                        </div>
                      )}
                      {sub.billing_cycle && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT_BODY }}>Siklus</p>
                          <p style={{ fontSize: 14, color: "#0C1E35", margin: 0, fontWeight: 600, fontFamily: FONT_BODY }}>{sub.billing_cycle === "monthly" ? "Bulanan" : (sub.billing_cycle === "yearly" || sub.billing_cycle === "annual") ? "Tahunan" : sub.billing_cycle}</p>
                        </div>
                      )}
                      {sub.starts_at && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT_BODY }}>Aktif Sejak</p>
                          <p style={{ fontSize: 14, color: "#0C1E35", margin: 0, fontWeight: 600, fontFamily: FONT_BODY }}>{formatDate(sub.starts_at)}</p>
                        </div>
                      )}
                      {sub.expires_at && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT_BODY }}>Berlaku Hingga</p>
                          <p style={{ fontSize: 14, color: "#0C1E35", margin: 0, fontWeight: 600, fontFamily: FONT_BODY }}>{formatDate(sub.expires_at)}</p>
                        </div>
                      )}
                      {sub.auto_renew != null && (
                        <div>
                          <p style={{ fontSize: 10, fontWeight: 600, color: "#94A3B8", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em", fontFamily: FONT_BODY }}>Perpanjangan</p>
                          <p style={{ fontSize: 14, color: sub.auto_renew ? "#059669" : "#94A3B8", margin: 0, fontWeight: 600, fontFamily: FONT_BODY }}>{sub.auto_renew ? "Otomatis" : "Manual"}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: 13, color: "#94A3B8", margin: "0 0 18px", fontFamily: FONT_BODY, lineHeight: 1.6 }}>Belum ada langganan aktif.</p>
                  )}

                  {onNavigateToSubscription && (
                    <button onClick={onNavigateToSubscription} style={ctaBtn}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.backgroundColor = "#F0F4FF"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.backgroundColor = "#FAFBFC"; }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0C1E35", fontFamily: FONT_BODY }}>Kelola Langganan</span>
                      <ChevronRight style={{ width: 16, height: 16, color: "#94A3B8" }} />
                    </button>
                  )}
                </div>
              </motion.div>

              {/* ── Kop Surat card ── */}
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.18 }} style={cardBase}>
                <div style={cardHeaderStyle}>
                  <FileText style={{ width: 14, height: 14, color: "#ffffff" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#ffffff", fontFamily: FONT_HEADING }}>Kop Surat</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,0.5)", fontFamily: FONT_BODY }}>{hospitalSettingsList.length}/3</span>
                </div>
                <div style={{ padding: 20 }}>
                  {hospitalSettingsList.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "16px 0 20px" }}>
                      <div style={{ width: 48, height: 48, borderRadius: 14, backgroundColor: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}>
                        <FileText style={{ width: 22, height: 22, color: "#CBD5E1" }} />
                      </div>
                      <p style={{ fontSize: 13, color: "#94A3B8", margin: 0, fontFamily: FONT_BODY }}>Belum ada kop surat</p>
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
                      {hospitalSettingsList.slice(0, 3).map((h, i) => (
                        <div key={h.id || i} style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                          backgroundColor: "#FAFBFC", borderRadius: 10, border: "1px solid #F1F5F9",
                        }}>
                          {h.logoUrl ? (
                            <img src={h.logoUrl} alt="" style={{ width: 32, height: 32, borderRadius: 8, objectFit: "contain", backgroundColor: "#fff", border: "1px solid #E8ECF1" }} />
                          ) : (
                            <div style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: "#E8ECF1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <FileText style={{ width: 14, height: 14, color: "#94A3B8" }} />
                            </div>
                          )}
                          <p style={{ fontSize: 13, fontWeight: 600, color: "#0C1E35", margin: 0, flex: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: FONT_BODY }}>{h.name || "Tanpa Nama"}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {onNavigateToSettings && (
                    <button onClick={onNavigateToSettings} style={ctaBtn}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#2563EB"; e.currentTarget.style.backgroundColor = "#F0F4FF"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.backgroundColor = "#FAFBFC"; }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "#0C1E35", fontFamily: FONT_BODY }}>Kelola Kop Surat</span>
                      <ChevronRight style={{ width: 16, height: 16, color: "#94A3B8" }} />
                    </button>
                  )}
                </div>
              </motion.div>

            </div>

            {/* ═══ 3. CTA Butuh Bantuan (paling bawah) ═══ */}
            {onNavigateToBantuan && (
              <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.24 }}
                style={{
                  borderRadius: 16, overflow: "hidden",
                  background: "linear-gradient(135deg, #0D9488 0%, #0F766E 100%)",
                  transition: "transform 150ms",
                }}
              >
                <button
                  onClick={onNavigateToBantuan}
                  style={{
                    width: "100%", display: "flex", alignItems: "center", gap: 16,
                    padding: "18px 22px", background: "none", border: "none",
                    cursor: "pointer", textAlign: "left",
                  }}
                  onMouseEnter={(e) => {
                    const card = e.currentTarget.parentElement;
                    if (card) card.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    const card = e.currentTarget.parentElement;
                    if (card) card.style.transform = "translateY(0)";
                  }}
                >
                  <div style={{
                    width: 42, height: 42, borderRadius: 14, flexShrink: 0,
                    backgroundColor: "rgba(255,255,255,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <HeadsetIcon style={{ width: 22, height: 22, color: "#fff" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 15, fontWeight: 700, color: "#fff", margin: "0 0 2px", fontFamily: FONT_HEADING }}>
                      Butuh Bantuan?
                    </p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", margin: 0, fontFamily: FONT_BODY }}>
                      Kirim tiket ke tim support kami — kami siap membantu Anda.
                    </p>
                  </div>
                  <ChevronRight style={{ width: 20, height: 20, color: "rgba(255,255,255,0.5)", flexShrink: 0 }} />
                </button>
              </motion.div>
            )}

          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={showNameConfirm}
        onConfirm={() => { setShowNameConfirm(false); doSave(); }}
        onCancel={() => setShowNameConfirm(false)}
        title="Konfirmasi Ganti Nama"
        message={`Nama yang sudah diganti tidak dapat diubah lagi selama ${NAME_COOLDOWN_DAYS} hari. Yakin ingin menyimpan?`}
        confirmText="Ya, Simpan"
        cancelText="Batal"
        variant="warning"
      />
    </div>
  );
}