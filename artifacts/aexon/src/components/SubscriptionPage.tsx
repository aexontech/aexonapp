import React, { useState, useEffect, useCallback } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, FileText, CheckCircle2, Clock, AlertTriangle,
  ChevronLeft, ChevronRight, X, Loader2, TrendingUp, Shield,
  RefreshCw, XOctagon,
} from "lucide-react";
import { aexonConnect, SubscriptionStatus, BillingHistoryItem } from "../lib/aexonConnect";
import { useToast } from "./ToastProvider";

interface SubscriptionPageProps {
  onBack: () => void;
  onSubscribe: () => void;
  isEnterprise?: boolean;
  isAdmin?: boolean;
  subscriptionData?: SubscriptionStatus | null;
}

// ─── Helpers ──────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n);

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }) : "–";

const fmtDateShort = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) : "–";

const daysLeft = (d?: string | null) =>
  d ? Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000)) : 0;

const SITE_URL = "https://www.aexon.id";
const PER_PAGE = 5;

// ─── Status badge (sama dengan Web HeaderBadge) ───────────────────

const STATUS_BADGE: Record<string, { label: string; color: string; bg: string; border: string }> = {
  trial:              { label: "Trial Aktif",              color: "#FAC775", bg: "rgba(250,199,117,0.2)", border: "rgba(250,199,117,0.3)" },
  active:             { label: "Aktif",                    color: "#5DCAA5", bg: "rgba(13,148,136,0.2)",  border: "rgba(13,148,136,0.3)"  },
  pending_activation: { label: "Aktif Setelah Trial",      color: "#4ADE80", bg: "rgba(134,239,172,0.2)", border: "rgba(134,239,172,0.3)" },
  pending:            { label: "Aktif Setelah Trial",      color: "#4ADE80", bg: "rgba(134,239,172,0.2)", border: "rgba(134,239,172,0.3)" },
  expired:            { label: "Expired",                  color: "#FCA5A5", bg: "rgba(239,68,68,0.15)",  border: "rgba(239,68,68,0.25)"  },
  grace:              { label: "Masa Tenggang",            color: "#FAC775", bg: "rgba(250,199,117,0.2)", border: "rgba(250,199,117,0.3)" },
  none:               { label: "Tidak Aktif",              color: "#94A3B8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)" },
};

const PAY_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  PAID:      { label: "Berhasil",    bg: "#DCFCE7", color: "#166534" },
  PENDING:   { label: "Menunggu",    bg: "#FEF9C3", color: "#854D0E" },
  EXPIRED:   { label: "Kedaluwarsa",bg: "#FEE2E2", color: "#991B1B" },
  FAILED:    { label: "Gagal",       bg: "#FEE2E2", color: "#991B1B" },
  CANCELLED: { label: "Dibatalkan", bg: "#F1F5F9", color: "#475569" },
};

// ─── Progress calc (sama dengan Web getProgressPct) ───────────────

function calcPct(sub: SubscriptionStatus | null): number {
  if (!sub) return 0;
  if (sub.status === "trial") {
    const days = daysLeft(sub.expires_at);
    return Math.round((days / 7) * 100);
  }
  if (sub.status === "active" && sub.current_period_start && sub.expires_at) {
    const total = new Date(sub.expires_at).getTime() - new Date(sub.current_period_start).getTime();
    const rem   = new Date(sub.expires_at).getTime() - Date.now();
    return Math.max(0, Math.min(100, Math.round((rem / total) * 100)));
  }
  if ((sub.status === "pending_activation" || sub.status === "pending") && sub.expires_at) {
    const days  = daysLeft(sub.expires_at);
    const total = sub.billing_cycle === "annual" ? 365 : 30;
    return Math.round((days / total) * 100);
  }
  return 0;
}

// ─── Derived text functions (sama dengan Web) ─────────────────────

function getStatusText(sub: SubscriptionStatus | null): { value: string; sub2: string } {
  if (!sub || sub.status === "none") return { value: "Tidak aktif", sub2: "Belum berlangganan" };
  if (sub.status === "trial")        return { value: "Trial", sub2: "7 hari gratis" };
  if (sub.status === "active")       return { value: "Aktif", sub2: "Langganan berjalan" };
  if (sub.status === "pending_activation" || sub.status === "pending")
    return { value: "Aktivasi otomatis", sub2: `Otomatis aktif pada ${sub.expires_at ? fmtDateShort(sub.expires_at) : ""}` };
  if (sub.status === "expired")
    return { value: "Expired", sub2: sub.expires_at ? `Berakhir ${fmtDateShort(sub.expires_at)}` : "" };
  if (sub.status === "grace") return { value: "Tenggang", sub2: "Segera perbarui" };
  return { value: sub.status, sub2: "" };
}

function getDaysText(sub: SubscriptionStatus | null): { label: string; value: string; sub2: string } {
  if (!sub || sub.status === "none")   return { label: "Masa aktif", value: "–", sub2: "Belum berlangganan" };
  if (sub.status === "trial")          return { label: "Sisa trial", value: `${daysLeft(sub.expires_at)}`, sub2: "hari tersisa" };
  if (sub.status === "active" && sub.expires_at)
    return { label: "Sisa masa aktif", value: `${daysLeft(sub.expires_at)}`, sub2: "hari tersisa" };
  if ((sub.status === "pending_activation" || sub.status === "pending") && sub.expires_at)
    return { label: "Aktivasi dalam", value: `${daysLeft(sub.expires_at)}`, sub2: "hari lagi" };
  if (sub.status === "grace" && sub.grace_until)
    return { label: "Masa tenggang", value: `${daysLeft(sub.grace_until)}`, sub2: "hari tersisa" };
  if (sub.status === "expired")        return { label: "Sudah berakhir", value: "–", sub2: "" };
  return { label: "Masa aktif", value: "–", sub2: "" };
}

function getPaketText(sub: SubscriptionStatus | null, cancelDone: boolean): { value: string; sub2: string } {
  if (!sub || sub.status === "none") return { value: "–", sub2: "Belum berlangganan" };
  if (sub.status === "trial") return { value: "Trial", sub2: "7 hari gratis" };
  const cycle = sub.billing_cycle === "annual" ? "Tahunan" : sub.billing_cycle === "monthly" ? "Bulanan" : "–";
  const autoRenew = sub.auto_renew && !cancelDone ? "Auto-perpanjang aktif" : "Auto-perpanjang tidak aktif";
  return { value: cycle, sub2: autoRenew };
}

function getProgressColor(sub: SubscriptionStatus | null): string {
  if (!sub || sub.status === "expired") return "#DC2626";
  if (sub.status === "trial") return "linear-gradient(90deg,#D97706,#F59E0B)";
  return "linear-gradient(90deg,#0D9488,#14B8A6)";
}

// ─── Component ────────────────────────────────────────────────────

  export default function SubscriptionPage({ onBack, onSubscribe, isEnterprise, isAdmin }: SubscriptionPageProps) {
  const { showToast } = useToast();
    // Enterprise: tampilkan halaman khusus
    if (isEnterprise) {
      return (
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#F4F6F8', overflow: 'hidden' }}>
          <div style={{ backgroundColor: '#fff', borderBottom: '1px solid #E8ECF1', padding: '14px 28px', display: 'flex', alignItems: 'center', gap: 14, flexShrink: 0 }}>
            <button onClick={onBack} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: '#64748B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              <ArrowLeft style={{ width: 16, height: 16 }} /> Kembali
            </button>
            <div style={{ height: 16, width: 1, backgroundColor: '#E2E8F0' }} />
            <span style={{ fontSize: 16, fontWeight: 800, color: '#0C1E35', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Langganan Institusi</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '32px 28px' }} className="custom-scrollbar">
            <div style={{ maxWidth: 560, margin: '0 auto' }}>
              <div style={{
                borderRadius: 20, overflow: 'hidden', position: 'relative',
                background: 'linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)',
                padding: '40px 36px', textAlign: 'center', marginBottom: 28,
              }}>
                <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)' }} />
                <Shield style={{ width: 40, height: 40, color: 'rgba(255,255,255,0.3)', margin: '0 auto 16px' }} />
                <h2 style={{ fontSize: 22, fontWeight: 800, color: '#fff', marginBottom: 10, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Langganan Enterprise
                </h2>
                <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {isAdmin
                    ? 'Langganan institusi Anda dikelola oleh Tim Aexon. Hubungi kami untuk perpanjangan atau perubahan paket.'
                    : 'Langganan institusi dikelola oleh Admin RS Anda. Hubungi admin untuk informasi langganan.'}
                </p>
              </div>
              <div style={{
                backgroundColor: '#fff', borderRadius: 16, border: '1px solid #E8ECF1',
                padding: '24px 28px', textAlign: 'center',
              }}>
                <p style={{ fontSize: 13, color: '#64748B', marginBottom: 16, lineHeight: 1.6, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  {isAdmin
                    ? 'Untuk memperpanjang langganan, menambah seat, atau mengubah paket:'
                    : 'Jika ada pertanyaan tentang langganan institusi:'}
                </p>
                <a
                  href="https://wa.me/6282142465814?text=Halo%20Tim%20Aexon%2C%20saya%20ingin%20bertanya%20tentang%20langganan%20enterprise."
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    padding: '12px 24px', background: '#0C1E35', color: '#fff',
                    border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
                    textDecoration: 'none', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  Hubungi Tim Aexon
                </a>
              </div>
            </div>
          </div>
        </div>
      );
    }

  const [sub, setSub]           = useState<SubscriptionStatus | null>(null);
  const [billing, setBilling]   = useState<BillingHistoryItem[]>([]);
  const [loadSub, setLoadSub]   = useState(true);
  const [loadBill, setLoadBill] = useState(true);
  const [page, setPage]         = useState(1);
  const [showCancel, setShowCancel]     = useState(false);
  const [cancelling, setCancelling]     = useState(false);
  const [cancelDone, setCancelDone]     = useState(false);
  const [cancelError, setCancelError]   = useState("");
  const [cancellingInvoice, setCancellingInvoice] = useState<string | null>(null);
  const [loadingPayUrl, setLoadingPayUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadSub(true); setLoadBill(true);
    try { const { data } = await aexonConnect.getSubscription(); if (data) setSub(data); }
    catch {} finally { setLoadSub(false); }
    try { const { data } = await aexonConnect.getBillingHistory(); if (Array.isArray(data)) setBilling(data); }
    catch {} finally { setLoadBill(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCancelAutoRenew = async () => {
    setCancelling(true); setCancelError("");
    try {
      const { error } = await aexonConnect.cancelSubscription();
      if (error) { setCancelError(error); return; }
      setCancelDone(true); setShowCancel(false);
      setSub((p) => p ? { ...p, auto_renew: false } : p);
      showToast("Perpanjangan otomatis dinonaktifkan.", "success");
    } catch { setCancelError("Terjadi kesalahan. Silakan coba lagi."); }
    finally { setCancelling(false); }
  };

  const handleContinuePayment = async (invoiceNumber: string) => {
    setLoadingPayUrl(invoiceNumber);
    try {
      const res = await aexonConnect.getPaymentUrl(invoiceNumber);
      if (res.error || !res.data?.invoice_url) {
        showToast("Gagal mengambil URL pembayaran.", "error");
        return;
      }
      if (res.data.status === "EXPIRED") {
        showToast("Invoice sudah kedaluwarsa. Buat pembayaran baru.", "warning");
        load();
        return;
      }
      window.open(res.data.invoice_url, "_blank", "noopener,noreferrer");
    } catch { showToast("Gagal mengambil URL pembayaran.", "error"); }
    finally { setLoadingPayUrl(null); }
  };

  const handleCancelInvoice = async (invoiceNumber: string) => {
    setCancellingInvoice(invoiceNumber);
    try {
      const res = await aexonConnect.cancelPendingInvoice(invoiceNumber);
      if (res.error) { showToast(res.error, "error"); return; }
      showToast("Invoice berhasil dibatalkan.", "success");
      load();
    } catch { showToast("Gagal membatalkan invoice.", "error"); }
    finally { setCancellingInvoice(null); }
  };

  // ── Derived ─────────────────────────────────────────────────────
  const status       = sub?.status || "none";
  const badge        = STATUS_BADGE[status] || STATUS_BADGE.none;
  const trialDays    = daysLeft(status === "trial" ? sub?.expires_at : null);
  const progress     = calcPct(sub);
  const progColor    = getProgressColor(sub);
  const statusText   = getStatusText(sub);
  const daysText     = getDaysText(sub);
  const paketText    = getPaketText(sub, cancelDone);
  const canCancel    = status === "active" && sub?.auto_renew && !cancelDone;
  const totalPages   = Math.ceil(billing.length / PER_PAGE);
  const visible      = billing.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const s: React.CSSProperties = { fontFamily: "Outfit, sans-serif" };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#F0F4F8", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ backgroundColor: "#fff", borderBottom: "1px solid #E2E8F0", padding: "14px 24px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#64748B", ...s }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#0C1E35")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}>
          <ArrowLeft style={{ width: 16, height: 16 }} /> Kembali
        </button>
        <div style={{ height: 18, width: 1, backgroundColor: "#E2E8F0" }} />
        <span style={{ fontSize: 15, fontWeight: 800, color: "#0C1E35", ...s }}>Langganan</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "24px 24px 80px" }} className="custom-scrollbar">
        <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* ── Header card (navy, sama dengan Web) ─────────────── */}
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            style={{ background: "#0C1E35", borderRadius: 20, padding: "24px 28px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, borderRadius: "50%", background: "rgba(13,148,136,0.12)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", bottom: -40, left: "35%", width: 140, height: 140, borderRadius: "50%", background: "rgba(13,148,136,0.07)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.08em", margin: 0, ...s }}>STATUS LANGGANAN</p>
              {!loadSub && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                  {badge.label}
                </span>
              )}
            </div>

            {loadSub ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.4)" }}>
                <Loader2 className="animate-spin" style={{ width: 16, height: 16 }} />
                <span style={{ fontSize: 13 }}>Memuat...</span>
              </div>
            ) : (
              <>
                {/* Progress bar */}
                {progress > 0 && (
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "rgba(255,255,255,0.35)", marginBottom: 6 }}>
                      <span>Masa aktif tersisa</span><span>{progress}%</span>
                    </div>
                    <div style={{ height: 7, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${progress}%`, background: progColor, borderRadius: 999, transition: "width 0.5s ease" }} />
                    </div>
                  </div>
                )}

                {/* Metric row — sama dengan Web */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                  {/* Status */}
                  <div>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.1em", margin: "0 0 5px", ...s }}>STATUS</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 3px", ...s }}>{statusText.value}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: 0 }}>{statusText.sub2}</p>
                  </div>
                  {/* Sisa hari */}
                  <div>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.1em", margin: "0 0 5px", ...s }}>{daysText.label.toUpperCase()}</p>
                    <p style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: "0 0 3px", ...s }}>{daysText.value}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: 0 }}>{daysText.sub2}</p>
                  </div>
                  {/* Paket */}
                  <div>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 700, letterSpacing: "0.1em", margin: "0 0 5px", ...s }}>PAKET AKTIF</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#fff", margin: "0 0 3px", lineHeight: 1.2, ...s }}>{paketText.value}</p>
                    <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: 0 }}>{paketText.sub2}</p>
                  </div>
                </div>
              </>
            )}
          </motion.div>

          {/* ── Banner (sama persis dengan Web) ─────────────────── */}
          {!loadSub && sub && (
            <>
              {(status === "pending_activation" || status === "pending") && (() => {
                const activationDate = (sub as any).trial_ends_at
                  ? fmtDate((sub as any).trial_ends_at)
                  : sub.expires_at ? fmtDate(sub.expires_at) : "–";
                return (
                  <div style={{ borderRadius: 14, padding: "16px 20px", background: "linear-gradient(135deg,#059669,#10B981)", display: "flex", alignItems: "center", gap: 14 }}>
                    <CheckCircle2 style={{ width: 16, height: 16, color: "#fff", flexShrink: 0 }} />
                    <p style={{ color: "#fff", fontSize: 13, fontWeight: 500, lineHeight: 1.5, margin: 0 }}>
                      <strong>Pembayaran diterima</strong> — Subscription akan aktif setelah trial berakhir pada <strong>{activationDate}</strong>
                    </p>
                  </div>
                );
              })()}

              {status === "trial" && trialDays <= 4 && (
                <div style={{ borderRadius: 14, padding: "16px 20px", background: "linear-gradient(135deg,#D97706,#F59E0B)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <p style={{ color: "#fff", fontSize: 13, fontWeight: 500, lineHeight: 1.5, margin: 0 }}>
                    ⏰ Trial kamu berakhir dalam <strong>{trialDays} hari</strong> — Berlangganan sekarang untuk tidak kehilangan akses
                  </p>
                  <button onClick={onSubscribe} style={{ background: "#fff", color: "#B45309", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", ...s }}>
                    Pilih Paket →
                  </button>
                </div>
              )}

              {(status === "expired" || status === "none") && (
                <div style={{ borderRadius: 14, padding: "16px 20px", background: "linear-gradient(135deg,#B91C1C,#DC2626)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <p style={{ color: "#fff", fontSize: 13, fontWeight: 500, lineHeight: 1.5, margin: 0 }}>
                    Langganan kamu telah berakhir — Perbarui sekarang untuk kembali mengakses semua fitur
                  </p>
                  <button onClick={onSubscribe} style={{ background: "#fff", color: "#B91C1C", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", ...s }}>
                    Buat Invoice Baru →
                  </button>
                </div>
              )}

              {status === "grace" && (
                <div style={{ borderRadius: 14, padding: "16px 20px", background: "linear-gradient(135deg,#D97706,#F59E0B)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
                  <p style={{ color: "#fff", fontSize: 13, fontWeight: 500, lineHeight: 1.5, margin: 0 }}>
                    ⚠️ Masa tenggang aktif hingga <strong>{fmtDate(sub.grace_until)}</strong> — Segera perbarui langganan
                  </p>
                  <button onClick={onSubscribe} style={{ background: "#fff", color: "#B45309", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer", ...s }}>
                    Perbarui
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Detail Langganan ─────────────────────────────────── */}
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.06 }}
            style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #E8EDF2" }}>
            <div style={{ background: "#0C1E35", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Shield style={{ width: 15, height: 15, color: "rgba(255,255,255,0.7)" }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Detail Langganan</span>
              </div>
              {sub && <span style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "5px 13px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block" }} />
                {badge.label}
              </span>}
            </div>
            <div style={{ background: "#fff", padding: "4px 24px 16px" }}>
              {loadSub ? (
                <p style={{ padding: "16px 0", color: "#94A3B8", fontSize: 13 }}>Memuat...</p>
              ) : !sub || status === "none" ? (
                <div style={{ padding: "20px 0" }}>
                  <p style={{ color: "#64748B", fontSize: 14, marginBottom: 14 }}>Anda belum memiliki langganan aktif.</p>
                  <button onClick={onSubscribe}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#0C1E35", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", ...s }}>
                    Lihat Paket →
                  </button>
                </div>
              ) : (
                <>
                  {([
                    sub.plan_name ? ["Paket", sub.plan_name] : null,
                    sub.billing_cycle ? ["Siklus tagihan", sub.billing_cycle === "annual" ? "Tahunan" : "Bulanan"] : null,
                    status === "trial" && sub.expires_at ? ["Trial berakhir", fmtDate(sub.expires_at)] : null,
                    status === "active" && sub.current_period_start ? ["Aktif sejak", fmtDate(sub.current_period_start)] : null,
                    status === "active" && sub.expires_at ? ["Aktif hingga", fmtDate(sub.expires_at)] : null,
                    (status === "pending_activation" || status === "pending") ? ["Aktivasi", "Setelah trial berakhir"] : null,
                    (status === "pending_activation" || status === "pending") && sub.expires_at ? ["Aktif mulai", fmtDate(sub.expires_at)] : null,
                  ] as Array<[string,string] | null>).filter((item): item is [string, string] => item !== null).map(([label, value], i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 0", borderBottom: "1px solid #F8FAFC" }}>
                      <span style={{ fontSize: 13, color: "#64748B" }}>{label}</span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#0C1E35" }}>{value}</span>
                    </div>
                  ))}

                  {/* Perpanjangan otomatis — toggle switch */}
                  {status === "active" && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 0", borderBottom: "1px solid #F8FAFC" }}>
                      <div>
                        <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>Perpanjangan otomatis</p>
                        <p style={{ fontSize: 11, color: "#94A3B8", margin: "2px 0 0" }}>
                          {sub.auto_renew && !cancelDone
                            ? `Diperpanjang otomatis pada ${fmtDateShort(sub.expires_at)}`
                            : "Tidak diperpanjang otomatis"}
                        </p>
                      </div>
                      <button
                        onClick={() => { if (sub.auto_renew && !cancelDone) setShowCancel(true); }}
                        disabled={cancelDone || !sub.auto_renew}
                        style={{
                          position: "relative", display: "inline-flex", alignItems: "center",
                          width: 44, height: 24, borderRadius: 999, border: "none",
                          backgroundColor: sub.auto_renew && !cancelDone ? "#0D9488" : "#CBD5E1",
                          cursor: sub.auto_renew && !cancelDone ? "pointer" : "not-allowed",
                          padding: 0, transition: "background-color 200ms", flexShrink: 0,
                        }}
                      >
                        <span style={{
                          position: "absolute",
                          left: sub.auto_renew && !cancelDone ? 22 : 2,
                          width: 20, height: 20, borderRadius: "50%",
                          backgroundColor: "#fff",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                          transition: "left 200ms",
                        }} />
                      </button>
                    </div>
                  )}
                  {showCancel && (
                    <div style={{ background: "#FEF2F2", border: "1.5px solid #FECACA", borderRadius: 12, padding: 16, margin: "12px 0" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: "#991B1B", marginBottom: 6 }}>Nonaktifkan Perpanjangan Otomatis?</p>
                      <p style={{ fontSize: 12, color: "#B91C1C", lineHeight: 1.6, marginBottom: 4 }}>✓ Subscription Anda <strong>tetap aktif</strong> hingga <strong>{fmtDate(sub.expires_at)}</strong></p>
                      <p style={{ fontSize: 12, color: "#B91C1C", lineHeight: 1.6, marginBottom: 14 }}>✗ Setelah tanggal tersebut, tidak akan diperpanjang otomatis.</p>
                      {cancelError && <p style={{ fontSize: 12, color: "#DC2626", marginBottom: 10 }}>{cancelError}</p>}
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={handleCancelAutoRenew} disabled={cancelling}
                          style={{ display: "flex", alignItems: "center", gap: 5, background: "#DC2626", color: "#fff", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: cancelling ? "not-allowed" : "pointer", opacity: cancelling ? 0.7 : 1, ...s }}>
                          {cancelling && <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} />}
                          {cancelling ? "Memproses..." : "Ya, Nonaktifkan"}
                        </button>
                        <button onClick={() => setShowCancel(false)}
                          style={{ background: "none", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "8px 16px", fontSize: 12, color: "#64748B", cursor: "pointer" }}>
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
                  {cancelDone && (
                    <div style={{ background: "#F0FDF4", border: "1.5px solid #10B981", borderRadius: 12, padding: 14, display: "flex", alignItems: "flex-start", gap: 8, margin: "12px 0" }}>
                      <CheckCircle2 style={{ width: 16, height: 16, color: "#10B981", marginTop: 1, flexShrink: 0 }} />
                      <p style={{ fontSize: 12, color: "#065F46", lineHeight: 1.6, margin: 0 }}>
                        Perpanjangan otomatis berhasil dinonaktifkan. Subscription tetap aktif hingga <strong>{fmtDate(sub.expires_at)}</strong>.
                      </p>
                    </div>
                  )}

                  {/* Perbarui / Perpanjang */}
                  <div style={{ padding: "16px 0 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: "#0C1E35", margin: 0 }}>
                        {status === "active" ? "Perpanjang Langganan" : "Aktifkan Langganan"}
                      </p>
                      <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0" }}>Jangan sampai akses Anda terputus.</p>
                    </div>
                    <button onClick={onSubscribe}
                      style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#0C1E35", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 600, cursor: "pointer", ...s }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1a3a5c")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0C1E35")}>
                      <TrendingUp style={{ width: 14, height: 14 }} />
                      {status === "active" ? "Perpanjang Sekarang" : "Pilih Paket"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </motion.div>

          {/* ── Riwayat Pembayaran ───────────────────────────────── */}
          <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.1 }}
            style={{ borderRadius: 16, overflow: "hidden", border: "1px solid #E8EDF2" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#0C1E35" }}>
                  <td colSpan={4} style={{ padding: "16px 24px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <FileText style={{ width: 15, height: 15, color: "rgba(255,255,255,0.8)" }} />
                      <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>Riwayat Pembayaran</span>
                    </div>
                  </td>
                </tr>
                <tr style={{ background: "#1E3A5F" }}>
                  {["Paket & Dokumen", "Tanggal", "Jumlah", "Status"].map((h, i) => (
                    <th key={i} style={{ padding: "10px 16px", fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.6)", textAlign: i > 0 ? "center" : "left", letterSpacing: "0.04em", textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadBill ? (
                  <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Memuat...</td></tr>
                ) : billing.length === 0 ? (
                  <tr><td colSpan={4} style={{ padding: 32, textAlign: "center", color: "#94A3B8", fontSize: 13 }}>Belum ada riwayat pembayaran.</td></tr>
                ) : visible.map((item, i) => {
                  const ps  = PAY_STATUS[item.status] || { label: item.status, bg: "#F1F5F9", color: "#475569" };
                  const key = item.access_key ? `?key=${item.access_key}` : "";
                  const invoiceUrl = item.invoice_number ? `${SITE_URL}/invoice/${item.invoice_number}${key}` : null;
                  const receiptUrl = item.invoice_number && item.status === "PAID" ? `${SITE_URL}/receipt/${item.invoice_number}${key}` : null;
                  // plan_name sudah berisi "Beta - Bulanan" / "Standard - Tahunan" dari DB
                  const planLabel = item.plan_name || (item.is_beta ? "Beta" : "Standard");
                  return (
                    <tr key={item.id || i} style={{ background: i % 2 === 0 ? "#F8FAFC" : "#fff" }}>
                      <td style={{ padding: "14px 16px", verticalAlign: "top", borderBottom: i < visible.length - 1 ? "1px solid #EEF2F7" : "none" }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#0C1E35", marginBottom: 2 }}>
                          {planLabel}
                        </p>
                        <p style={{ fontSize: 11, color: "#94A3B8", marginBottom: 8 }}>{item.invoice_number || "–"}</p>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {invoiceUrl && (
                            <button onClick={() => window.open(invoiceUrl, "_blank")}
                              style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: "#0D9488", background: "#E1F5EE", borderRadius: 6, padding: "4px 9px", border: "none", cursor: "pointer" }}>
                              <FileText style={{ width: 10, height: 10 }} /> Invoice
                            </button>
                          )}
                          {receiptUrl ? (
                            <button onClick={() => window.open(receiptUrl, "_blank")}
                              style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, fontWeight: 600, color: "#0D9488", background: "#E1F5EE", borderRadius: 6, padding: "4px 9px", border: "none", cursor: "pointer" }}>
                              <CheckCircle2 style={{ width: 10, height: 10 }} /> Receipt
                            </button>
                          ) : (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11, color: "#CBD5E1", background: "#F1F5F9", borderRadius: 6, padding: "4px 9px" }}>
                              Receipt —
                            </span>
                          )}
                        </div>
                        {item.status === "PENDING" && item.invoice_number && (
                          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                            <button
                              onClick={() => handleContinuePayment(item.invoice_number!)}
                              disabled={loadingPayUrl === item.invoice_number}
                              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#fff", background: "#0C1E35", borderRadius: 6, padding: "5px 12px", border: "none", cursor: loadingPayUrl === item.invoice_number ? "wait" : "pointer", opacity: loadingPayUrl === item.invoice_number ? 0.6 : 1 }}>
                              {loadingPayUrl === item.invoice_number ? "Memuat..." : "Lanjutkan Pembayaran"}
                            </button>
                            <button
                              onClick={() => handleCancelInvoice(item.invoice_number!)}
                              disabled={cancellingInvoice === item.invoice_number}
                              style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 600, color: "#DC2626", background: "#FEF2F2", borderRadius: 6, padding: "5px 12px", border: "1px solid #FECACA", cursor: cancellingInvoice === item.invoice_number ? "wait" : "pointer", opacity: cancellingInvoice === item.invoice_number ? 0.6 : 1 }}>
                              {cancellingInvoice === item.invoice_number ? "Membatalkan..." : "Batalkan"}
                            </button>
                          </div>
                        )}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 12, color: "#64748B", textAlign: "center", verticalAlign: "middle", borderBottom: i < visible.length - 1 ? "1px solid #EEF2F7" : "none" }}>
                        {fmtDateShort(item.created_at)}
                      </td>
                      <td style={{ padding: "14px 16px", fontSize: 13, fontWeight: 700, color: "#0C1E35", textAlign: "center", verticalAlign: "middle", borderBottom: i < visible.length - 1 ? "1px solid #EEF2F7" : "none" }}>
                        {fmt(item.amount)}
                      </td>
                      <td style={{ padding: "14px 16px", textAlign: "center", verticalAlign: "middle", borderBottom: i < visible.length - 1 ? "1px solid #EEF2F7" : "none" }}>
                        <span style={{ display: "inline-block", padding: "4px 11px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: ps.bg, color: ps.color }}>{ps.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={{ background: "#fff", padding: "12px 16px", borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "7px 14px", fontSize: 13, color: page === 1 ? "#CBD5E1" : "#64748B", cursor: page === 1 ? "not-allowed" : "pointer", fontWeight: 600 }}>
                  <ChevronLeft style={{ width: 14, height: 14 }} /> Sebelumnya
                </button>
                <span style={{ fontSize: 13, color: "#64748B" }}>Hal. {page} / {totalPages}</span>
                <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "7px 14px", fontSize: 13, color: page === totalPages ? "#CBD5E1" : "#64748B", cursor: page === totalPages ? "not-allowed" : "pointer", fontWeight: 600 }}>
                  Selanjutnya <ChevronRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            )}
          </motion.div>

        </div>
      </div>
    </div>
  );
}