import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion } from "motion/react";
import {
  ArrowLeft, ShieldCheck, CreditCard, CheckCircle2, Loader2,
  ExternalLink, Tag, AlertCircle, XCircle, Clock,
  RefreshCw, ToggleLeft, ToggleRight, Info, ChevronDown, X,
} from "lucide-react";
import { aexonConnect, getDeviceId, Plan } from "../lib/aexonConnect";
import { useToast } from "./ToastProvider";

type PaymentStatus = "idle" | "processing" | "pending" | "paid" | "failed" | "expired";

interface PromoResult {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  label: string;
}

interface CheckoutProps {
  plan: Plan;
  userEmail: string;
  userName: string;
  onBack: () => void;
  onSuccess?: () => void;
  onDone?: () => void;
}

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_DURATION_MS = 30 * 60 * 1000;
const AUTO_REDIRECT_SECONDS = 10;

export default function Checkout({ plan, userEmail, userName, onBack, onSuccess, onDone }: CheckoutProps) {
  const { showToast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [invoiceId, setInvoiceId] = useState("");
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(AUTO_REDIRECT_SECONDS);
  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState("");
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);
  const [autoRenew, setAutoRenew] = useState(true);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) { clearInterval(pollTimerRef.current); pollTimerRef.current = null; }
  }, []);

  useEffect(() => { return () => stopPolling(); }, [stopPolling]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "complete" && paymentStatus === "idle") {
      setPaymentStatus("pending"); startPolling();
    }
  }, []);

  const startPolling = useCallback(() => {
    stopPolling();
    pollStartRef.current = Date.now();
    pollTimerRef.current = setInterval(async () => {
      if (Date.now() - pollStartRef.current > POLL_MAX_DURATION_MS) {
        stopPolling(); setPaymentStatus("expired"); return;
      }
      try {
        const { data: subStatus } = await aexonConnect.getSubscription();
        if (!subStatus) return;
        const status = (subStatus.status || "").toLowerCase();
        if (status === "active" || status === "trial") { stopPolling(); setPaymentStatus("paid"); onSuccess?.(); }
        else if (status === "expired") { stopPolling(); setPaymentStatus("expired"); }
        else if (status === "cancelled" || status === "failed" || status === "rejected") { stopPolling(); setPaymentStatus("failed"); }
      } catch {}
    }, POLL_INTERVAL_MS);
  }, [stopPolling, onSuccess]);

  const isResultScreen = paymentStatus === "paid" || paymentStatus === "failed" || paymentStatus === "expired";

  const onSuccessRef = useRef(onSuccess);
  const onDoneRef = useRef(onDone);
  useEffect(() => { onSuccessRef.current = onSuccess; }, [onSuccess]);
  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  useEffect(() => {
    if (!isResultScreen) { setCountdown(AUTO_REDIRECT_SECONDS); return; }
    if (countdown <= 0) {
      if (paymentStatus === "paid" && onSuccessRef.current) onSuccessRef.current();
      if (onDoneRef.current) onDoneRef.current(); return;
    }
    const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [isResultScreen, countdown, paymentStatus]);

  if (!plan) {
    return (
      <div style={{ height: "100%", backgroundColor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 360, width: "100%", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: "#FEF2F2", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <AlertCircle style={{ width: 26, height: 26, color: "#EF4444" }} />
          </div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "#0C1E35", marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Paket Tidak Ditemukan</h2>
          <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 24 }}>Silakan kembali dan pilih paket.</p>
          <button onClick={onBack} style={{ padding: "12px 28px", backgroundColor: "#0C1E35", color: "#fff", fontWeight: 700, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Kembali
          </button>
        </div>
      </div>
    );
  }

  // ── PRICE LOGIC ─────────────────────────────────────────────────────────────
  // plan.price = total untuk periode billing (annual: total/tahun, monthly: total/bulan)
  const isAnnual = plan.billing_cycle === "annual";
  const subtotal = plan.price; // 4.788.000 (annual) atau 499.000 (monthly)
  const pricePerMonth = isAnnual ? Math.round(plan.price / 12) : plan.price;
  const hasDiscount = plan.original_price !== null && plan.original_price > plan.price;
  // betaSavings untuk display saja — harga sudah beta, tidak dikurangi dari total
  const betaSavings = hasDiscount ? plan.original_price! - plan.price : 0;
  const originalPerMonth = isAnnual && plan.original_price
    ? Math.round(plan.original_price / 12)
    : plan.original_price ?? null;

  const promoDiscount = appliedPromo
    ? appliedPromo.discount_type === "percentage"
      ? Math.round(subtotal * (appliedPromo.discount_value / 100))
      : appliedPromo.discount_value
    : 0;
  const totalPrice = Math.max(0, subtotal - promoDiscount);

  const fmt = (n: number) => "Rp" + n.toLocaleString("id-ID");

  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true); setPromoError("");
    try {
      const { data, error } = await aexonConnect.validatePromo(code);
      if (error || !data) { setPromoError(error || "Kode promo tidak ditemukan"); return; }
      setAppliedPromo({
        code: data.code, discount_type: data.discount_type, discount_value: data.discount_value,
        label: data.label || `Diskon ${data.discount_type === "percentage" ? data.discount_value + "%" : fmt(data.discount_value)}`,
      });
      showToast("Kode promo berhasil diterapkan.", "success");
    } catch { setPromoError("Gagal memvalidasi kode promo."); }
    finally { setPromoLoading(false); }
  };

  const handleRemovePromo = () => { setAppliedPromo(null); setPromoCode(""); setPromoError(""); };

  const handlePlaceOrder = async () => {
    setPaymentStatus("processing");
    try {
      const deviceId = getDeviceId();
      const returnUrl = `${window.location.origin}${import.meta.env.BASE_URL || "/"}subscription/checkout?payment=complete`;
      const { data: checkoutData, error: checkoutError } = await aexonConnect.createInvoice({
        plan_id: plan.id, device_id: deviceId,
        promo_code: appliedPromo?.code || undefined,
        return_url: returnUrl, auto_renew: autoRenew,
      });
      if (checkoutError || !checkoutData) throw new Error(checkoutError || "Gagal membuat pesanan.");
      setInvoiceId(checkoutData.invoice_id || checkoutData.order_id || "");
      const invoiceStatus = (checkoutData.status || "").toLowerCase();
      if (invoiceStatus === "paid" || invoiceStatus === "settled" || invoiceStatus === "completed") {
        setPaymentStatus("paid"); onSuccess?.(); return;
      }
      if (invoiceStatus === "expired") { setPaymentStatus("expired"); return; }
      if (invoiceStatus === "failed" || invoiceStatus === "rejected") { setPaymentStatus("failed"); return; }
      if (checkoutData.invoice_url) {
        setPaymentUrl(checkoutData.invoice_url); setPaymentStatus("pending");
        startPolling(); window.open(checkoutData.invoice_url, "_blank", "noopener,noreferrer");
      } else { setPaymentStatus("pending"); startPolling(); }
      showToast("Invoice berhasil dibuat.", "success");
    } catch (err: any) {
      setPaymentStatus("idle");
      const msg = err?.message || "";
      showToast(
        msg.toLowerCase().includes("not found") || msg.toLowerCase().includes("belum tersedia")
          ? "Layanan checkout belum tersedia. Hubungi administrator."
          : msg || "Gagal membuat pesanan. Silakan coba lagi.",
        "error"
      );
    }
  };

  // ── PAID ────────────────────────────────────────────────────────────────────
  if (paymentStatus === "paid") {
    return (
      <div style={{ height: "100%", backgroundColor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
        <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: "#ECFDF5", border: "1px solid #BBF7D0", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <CheckCircle2 style={{ width: 36, height: 36, color: "#10B981" }} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#0C1E35", marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pembayaran Berhasil</h2>
          <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, marginBottom: 24 }}>
            Langganan Aexon Anda kini aktif.
          </p>
          <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "14px 18px", marginBottom: 24, textAlign: "left" }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: "#64748B" }}>Paket</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "#0C1E35" }}>{isAnnual ? "Tahunan" : "Bulanan"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 13, color: "#64748B" }}>Total Dibayar</span>
              <span style={{ fontSize: 14, fontWeight: 800, color: "#059669" }}>{fmt(totalPrice)}</span>
            </div>
          </div>
          <p style={{ fontSize: 12, color: "#94A3B8", marginBottom: 16 }}>Kembali otomatis dalam {countdown} detik...</p>
          <button onClick={() => { if (onSuccess) onSuccess(); else if (onDone) onDone(); }}
            style={{ width: "100%", padding: "13px 0", backgroundColor: "#0C1E35", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Selesai
          </button>
        </motion.div>
      </div>
    );
  }

  // ── FAILED ──────────────────────────────────────────────────────────────────
  if (paymentStatus === "failed") {
    return (
      <div style={{ height: "100%", backgroundColor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: "#FEF2F2", border: "1px solid #FECACA", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <XCircle style={{ width: 36, height: 36, color: "#EF4444" }} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#0C1E35", marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Pembayaran Gagal</h2>
          <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, marginBottom: 24 }}>Transaksi tidak berhasil diproses. Silakan coba kembali.</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <button onClick={() => setPaymentStatus("idle")}
              style={{ width: "100%", padding: "13px 0", backgroundColor: "#0C1E35", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Coba Lagi
            </button>
            <button onClick={onBack}
              style={{ width: "100%", padding: "12px 0", backgroundColor: "transparent", color: "#64748B", border: "1px solid #E2E8F0", borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
              Kembali ke Paket
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── EXPIRED ─────────────────────────────────────────────────────────────────
  if (paymentStatus === "expired") {
    return (
      <div style={{ height: "100%", backgroundColor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
          <div style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <Clock style={{ width: 36, height: 36, color: "#F59E0B" }} />
          </div>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: "#0C1E35", marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Invoice Kedaluwarsa</h2>
          <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, marginBottom: 24 }}>Batas waktu pembayaran telah habis. Tidak ada dana yang terpotong.</p>
          <button onClick={() => setPaymentStatus("idle")}
            style={{ width: "100%", padding: "13px 0", backgroundColor: "#0C1E35", color: "#fff", border: "none", borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Buat Pembayaran Baru
          </button>
        </motion.div>
      </div>
    );
  }

  // ── PENDING ─────────────────────────────────────────────────────────────────
  if (paymentStatus === "pending") {
    return (
      <div style={{ height: "100%", backgroundColor: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
        <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
          style={{ maxWidth: 420, width: "100%", backgroundColor: "#ffffff", borderRadius: 20, padding: 32, boxShadow: "0 4px 24px rgba(12,30,53,0.06)", textAlign: "center", border: "1px solid #E2E8F0" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: "#FFFBEB", border: "1px solid #FDE68A", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Loader2 className="animate-spin" style={{ width: 24, height: 24, color: "#F59E0B" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0C1E35", marginBottom: 8, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Selesaikan Pembayaran</h2>
          <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 12 }}>
            Halaman pembayaran Xendit sudah dibuka di browser eksternal.
          </p>
          <div style={{ backgroundColor: "#EFF6FF", border: "1px solid #DBEAFE", borderRadius: 10, padding: "10px 14px", marginBottom: 16, textAlign: "left" }}>
            <p style={{ fontSize: 12, color: "#1D4ED8", margin: 0, lineHeight: 1.6, fontWeight: 600 }}>
              Setelah pembayaran selesai, kembali ke aplikasi ini. Status akan terupdate otomatis.
            </p>
          </div>
          {invoiceId && (
            <div style={{ backgroundColor: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "10px 14px", marginBottom: 16, textAlign: "left" }}>
              <p style={{ fontSize: 10, color: "#94A3B8", marginBottom: 3, fontWeight: 700, letterSpacing: "0.06em" }}>INVOICE ID</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: "#0C1E35", fontFamily: "monospace", margin: 0 }}>{invoiceId}</p>
            </div>
          )}
          {paymentUrl && (
            <div style={{ marginBottom: 16 }}>
              <a href={paymentUrl} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 0", backgroundColor: "#0C1E35", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 700, textDecoration: "none", fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: 6 }}>
                <CreditCard style={{ width: 16, height: 16 }} />
                Buka Halaman Pembayaran
                <ExternalLink style={{ width: 13, height: 13, opacity: 0.6 }} />
              </a>
              <p style={{ fontSize: 11, color: "#94A3B8" }}>Virtual Account · E-Wallet · Kartu Kredit · QRIS</p>
            </div>
          )}
          {/* Manual check button */}
          <button
            onClick={async () => {
              try {
                const { data } = await aexonConnect.getSubscription();
                const status = (data?.status || "").toLowerCase();
                if (status === "active" || status === "trial") {
                  stopPolling(); setPaymentStatus("paid"); onSuccess?.();
                } else if (status === "expired") {
                  stopPolling(); setPaymentStatus("expired");
                } else if (status === "cancelled" || status === "failed" || status === "rejected") {
                  stopPolling(); setPaymentStatus("failed");
                } else {
                  showToast("Pembayaran belum terdeteksi. Silakan tunggu beberapa saat.", "info");
                }
              } catch { showToast("Gagal memeriksa status. Coba lagi.", "error"); }
            }}
            style={{ width: "100%", padding: "12px 0", marginTop: 14, backgroundColor: "#F1F5F9", color: "#0C1E35", border: "none", borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#E2E8F0")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#F1F5F9")}
          >
            Saya Sudah Bayar — Cek Status
          </button>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 11, color: "#94A3B8", marginTop: 12 }}>
            <Loader2 className="animate-spin" style={{ width: 11, height: 11 }} />
            Memeriksa otomatis setiap 5 detik...
          </div>
        </motion.div>
      </div>
    );
  }

  // ── IDLE / PROCESSING ───────────────────────────────────────────────────────
  const features = (plan.features ?? []).filter((f: string) => !/^hemat\s+rp/i.test(f.trim()));

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#F4F6F8", overflow: "hidden" }}>

      {/* Header */}
      <div style={{ backgroundColor: "#ffffff", borderBottom: "1px solid #E8ECF1", padding: "14px 28px", display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
        <button onClick={onBack}
          style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#64748B", fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#0C1E35")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}>
          <ArrowLeft style={{ width: 16, height: 16 }} />
          Kembali ke Paket
        </button>
        <div style={{ height: 16, width: 1, backgroundColor: "#E2E8F0" }} />
        <span style={{ fontSize: 16, fontWeight: 800, color: "#0C1E35", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Checkout</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px 80px" }} className="custom-scrollbar">
        <div style={{ maxWidth: 960, margin: "0 auto" }}>

          {/* Two-column cart layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", gap: 24, alignItems: "start" }}>

            {/* ═══ LEFT COLUMN: Plan details + Promo ═══ */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Plan detail card */}
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                style={{ backgroundColor: "#ffffff", border: "1px solid #E8ECF1", borderRadius: 16, overflow: "hidden" }}>

                {/* Dark header */}
                <div style={{ background: "linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)", padding: "24px 28px", position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", inset: 0, opacity: 0.04, backgroundImage: "radial-gradient(circle at 20% 50%, #fff 1px, transparent 1px), radial-gradient(circle at 80% 20%, #fff 1px, transparent 1px)", backgroundSize: "60px 60px, 40px 40px" }} />
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.45)", fontWeight: 700, letterSpacing: "0.08em", margin: "0 0 8px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                          PAKET {isAnnual ? "TAHUNAN" : "BULANAN"}
                        </p>
                        {originalPerMonth && (
                          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", textDecoration: "line-through", margin: "0 0 4px" }}>
                            {fmt(originalPerMonth)}/bulan
                          </p>
                        )}
                        <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                          <span style={{ fontSize: 32, fontWeight: 900, color: "#ffffff", fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                            {fmt(pricePerMonth)}
                          </span>
                          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.45)" }}>/bln</span>
                        </div>
                        {isAnnual && (
                          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "6px 0 0" }}>
                            Ditagih {fmt(subtotal)}/tahun
                          </p>
                        )}
                      </div>
                      {hasDiscount && (
                        <span style={{
                          padding: "5px 12px", borderRadius: 999, fontSize: 10, fontWeight: 800,
                          backgroundColor: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)",
                          color: "#FCD34D", letterSpacing: "0.05em", whiteSpace: "nowrap",
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                        }}>
                          HARGA BETA
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Features */}
                {features.length > 0 && (
                  <div style={{ padding: "20px 28px" }}>
                    <button onClick={() => setFeaturesExpanded(!featuresExpanded)}
                      style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#64748B", fontWeight: 700, padding: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      <ChevronDown style={{ width: 14, height: 14, transform: featuresExpanded ? "rotate(180deg)" : "none", transition: "transform 200ms" }} />
                      {featuresExpanded ? "Sembunyikan fitur" : `Lihat semua fitur (${features.length})`}
                    </button>
                    {featuresExpanded && (
                      <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 10 }}>
                        {features.map((f: string, i: number) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <CheckCircle2 style={{ width: 14, height: 14, color: "#0D9488", flexShrink: 0 }} />
                            <span style={{ fontSize: 13, color: "#64748B", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{f}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>

              {/* Promo code */}
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.04 }}
                style={{ backgroundColor: "#ffffff", border: "1px solid #E8ECF1", borderRadius: 16, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: appliedPromo || showPromoInput ? 14 : 0 }}>
                  <Tag style={{ width: 15, height: 15, color: "#64748B" }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#0C1E35", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Kode Promo</span>
                  {!appliedPromo && !showPromoInput && (
                    <button onClick={() => setShowPromoInput(true)}
                      style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "#0D9488", fontWeight: 600, padding: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      + Masukkan kode
                    </button>
                  )}
                </div>
                {appliedPromo ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", backgroundColor: "#F5F3FF", border: "1px solid #DDD6FE", borderRadius: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <CheckCircle2 style={{ width: 15, height: 15, color: "#7C3AED" }} />
                      <div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#5B21B6", margin: 0 }}>{appliedPromo.code}</p>
                        <p style={{ fontSize: 12, color: "#7C3AED", margin: 0 }}>{appliedPromo.label}</p>
                      </div>
                    </div>
                    <button onClick={handleRemovePromo} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                      <X style={{ width: 15, height: 15, color: "#7C3AED" }} />
                    </button>
                  </div>
                ) : showPromoInput ? (
                  <div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input type="text" value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(""); }}
                        onKeyDown={(e) => { if (e.key === "Enter") handleApplyPromo(); }}
                        placeholder="Masukkan kode promo"
                        style={{ flex: 1, padding: "11px 14px", borderRadius: 10, border: promoError ? "1.5px solid #FCA5A5" : "1.5px solid #E2E8F0", fontSize: 13, outline: "none", backgroundColor: "#F8FAFC", fontFamily: "'Plus Jakarta Sans', sans-serif" }} />
                      <button onClick={handleApplyPromo} disabled={promoLoading || !promoCode.trim()}
                        style={{ padding: "11px 18px", borderRadius: 10, border: "1.5px solid #E2E8F0", backgroundColor: "#ffffff", color: "#0C1E35", fontSize: 13, fontWeight: 700, cursor: promoLoading || !promoCode.trim() ? "not-allowed" : "pointer", opacity: promoLoading || !promoCode.trim() ? 0.5 : 1, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                        {promoLoading ? <Loader2 className="animate-spin" style={{ width: 13, height: 13 }} /> : "Terapkan"}
                      </button>
                    </div>
                    {promoError && <p style={{ color: "#EF4444", fontSize: 12, marginTop: 6 }}>{promoError}</p>}
                  </div>
                ) : null}
              </motion.div>

              {/* User info */}
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.06 }}
                style={{ backgroundColor: "#ffffff", border: "1px solid #E8ECF1", borderRadius: 16, padding: "20px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg, #60A5FA, #2563EB)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: "#fff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {userName?.charAt(0)?.toUpperCase() || "D"}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#0C1E35", margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{userName || "Dokter"}</p>
                    <p style={{ fontSize: 13, color: "#94A3B8", margin: "2px 0 0" }}>{userEmail}</p>
                  </div>
                </div>
              </motion.div>
            </div>

            {/* ═══ RIGHT COLUMN: Summary + CTA ═══ */}
            <div style={{ position: "sticky", top: 0 }}>
              <motion.div initial={{ y: 8, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.08 }}
                style={{ backgroundColor: "#ffffff", border: "1px solid #E8ECF1", borderRadius: 16, padding: "24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

                <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0C1E35", margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Ringkasan Pembayaran</h3>

                {/* Breakdown */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#64748B" }}>
                    <span>{fmt(pricePerMonth)} × {isAnnual ? "12 bulan" : "1 bulan"}</span>
                    <span style={{ fontWeight: 600, color: "#0C1E35" }}>{fmt(subtotal)}</span>
                  </div>
                  {hasDiscount && betaSavings > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#10B981" }}>
                      <span>Diskon Beta (sudah diterapkan)</span>
                      <span style={{ fontWeight: 600 }}>–{fmt(betaSavings)}</span>
                    </div>
                  )}
                  {appliedPromo && promoDiscount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#7C3AED" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <Tag style={{ width: 12, height: 12 }} />
                        <span>Promo {appliedPromo.code}</span>
                      </div>
                      <span style={{ fontWeight: 600 }}>–{fmt(promoDiscount)}</span>
                    </div>
                  )}
                </div>

                {/* Total */}
                <div style={{ borderTop: "1.5px solid #E8ECF1", paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 15, fontWeight: 800, color: "#0C1E35", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Total</span>
                  <span style={{ fontSize: 22, fontWeight: 900, color: "#0C1E35", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{fmt(totalPrice)}</span>
                </div>

                {/* Auto renew */}
                <div style={{ borderTop: "1px solid #F1F5F9", paddingTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#0C1E35", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Perpanjangan Otomatis</span>
                    <button onClick={() => setAutoRenew(!autoRenew)} style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                      {autoRenew
                        ? <ToggleRight style={{ width: 32, height: 32, color: "#0D9488" }} />
                        : <ToggleLeft style={{ width: 32, height: 32, color: "#CBD5E1" }} />}
                    </button>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 5 }}>
                    <Info style={{ width: 12, height: 12, color: "#94A3B8", flexShrink: 0, marginTop: 2 }} />
                    <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {autoRenew
                        ? "Diperpanjang otomatis saat periode berakhir."
                        : "Tidak diperpanjang otomatis. Pembayaran manual diperlukan."}
                    </p>
                  </div>
                </div>

                {/* CTA */}
                <button onClick={handlePlaceOrder} disabled={paymentStatus === "processing"}
                  style={{
                    width: "100%", padding: "15px 0", marginTop: 4,
                    background: paymentStatus === "processing" ? "#94A3B8" : "linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)",
                    color: "#ffffff", border: "none", borderRadius: 12,
                    fontSize: 15, fontWeight: 700, cursor: paymentStatus === "processing" ? "not-allowed" : "pointer",
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    boxShadow: paymentStatus === "processing" ? "none" : "0 2px 12px rgba(12,30,53,0.2)",
                    transition: "all 150ms",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                  onMouseEnter={(e) => { if (paymentStatus !== "processing") e.currentTarget.style.background = "linear-gradient(135deg, #152d4f, #1a3a5f)"; }}
                  onMouseLeave={(e) => { if (paymentStatus !== "processing") e.currentTarget.style.background = "linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)"; }}>
                  {paymentStatus === "processing"
                    ? <><Loader2 className="animate-spin" style={{ width: 16, height: 16 }} /> Memproses...</>
                    : `Lanjutkan ke Pembayaran`}
                </button>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5 }}>
                  <ShieldCheck style={{ width: 12, height: 12, color: "#94A3B8" }} />
                  <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>Transaksi aman & terenkripsi via Xendit</p>
                </div>

              </motion.div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}