import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Tag,
  Calendar,
  Ticket,
  ChevronRight,
  ChevronDown,
  Lock,
  AlertCircle,
  XCircle,
  Clock,
  RefreshCw,
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
}

const POLL_INTERVAL_MS = 5000;
const POLL_MAX_DURATION_MS = 30 * 60 * 1000;

export default function Checkout({
  plan,
  userEmail,
  userName,
  onBack,
  onSuccess,
}: CheckoutProps) {
  const { showToast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  const [invoiceId, setInvoiceId] = useState("");
  const [xenditInvoiceUrl, setXenditInvoiceUrl] = useState<string | null>(null);

  const [promoCode, setPromoCode] = useState("");
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState("");
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollStartRef = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const startPolling = useCallback(() => {
    stopPolling();
    pollStartRef.current = Date.now();

    pollTimerRef.current = setInterval(async () => {
      if (Date.now() - pollStartRef.current > POLL_MAX_DURATION_MS) {
        stopPolling();
        setPaymentStatus("expired");
        return;
      }

      try {
        const { data: subStatus } = await aexonConnect.getSubscription();
        if (!subStatus) return;

        const status = (subStatus.status || "").toLowerCase();

        if (status === "active" || status === "trial") {
          stopPolling();
          setPaymentStatus("paid");
          onSuccess?.();
        } else if (status === "expired") {
          stopPolling();
          setPaymentStatus("expired");
        } else if (status === "cancelled" || status === "failed" || status === "rejected") {
          stopPolling();
          setPaymentStatus("failed");
        }
      } catch {
      }
    }, POLL_INTERVAL_MS);
  }, [stopPolling, onSuccess]);

  if (!plan) {
    return (
      <div style={{
        height: "100%", backgroundColor: "#F8FAFC",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}>
        <div style={{
          maxWidth: 420, width: "100%", backgroundColor: "#ffffff",
          borderRadius: 20, padding: 40, textAlign: "center",
          boxShadow: "0 8px 40px rgba(12,30,53,0.08)",
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 16, backgroundColor: "#FEF2F2",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
          }}>
            <AlertCircle style={{ width: 32, height: 32, color: "#EF4444" }} />
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 900, color: "#0C1E35", marginBottom: 8, fontFamily: "Outfit, sans-serif" }}>
            Data Paket Tidak Ditemukan
          </h2>
          <p style={{ fontSize: 14, color: "#94A3B8", marginBottom: 24 }}>
            Silakan kembali dan pilih paket lagi.
          </p>
          <button
            onClick={onBack}
            style={{
              padding: "14px 32px", backgroundColor: "#0C1E35", color: "#fff",
              fontWeight: 800, borderRadius: 14, border: "none", cursor: "pointer",
              fontSize: 14, fontFamily: "Outfit, sans-serif",
            }}
          >
            Kembali ke Pilihan Paket
          </button>
        </div>
      </div>
    );
  }

  const isAnnual = plan.billing_cycle === "annual";
  const pricePerMonth = plan.price;
  const subtotal = isAnnual ? pricePerMonth * 12 : pricePerMonth;
  const hasDiscount = plan.original_price !== null && plan.original_price > plan.price;
  const originalTotal = hasDiscount ? plan.original_price! * (isAnnual ? 12 : 1) : subtotal;
  const betaSavings = hasDiscount ? originalTotal - subtotal : 0;

  const promoDiscount = appliedPromo
    ? appliedPromo.discount_type === "percentage"
      ? Math.round(subtotal * (appliedPromo.discount_value / 100))
      : appliedPromo.discount_value
    : 0;

  const totalPrice = Math.max(0, subtotal - promoDiscount);

  const formatRupiah = (amount: number) =>
    "Rp" + amount.toLocaleString("id-ID");

  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError("");
    try {
      const { data, error } = await aexonConnect.validatePromo(code);
      if (error || !data) {
        setPromoError(error || "Kode promo tidak ditemukan");
        return;
      }
      setAppliedPromo({
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        label: data.label || `Diskon ${data.discount_type === "percentage" ? data.discount_value + "%" : formatRupiah(data.discount_value)}`,
      });
      showToast("Kode promo berhasil diterapkan!", "success");
    } catch {
      setPromoError("Gagal memvalidasi kode promo");
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode("");
    setPromoError("");
  };

  const handlePlaceOrder = async () => {
    setPaymentStatus("processing");
    try {
      const deviceId = getDeviceId();

      const { data: checkoutData, error: checkoutError } =
        await aexonConnect.createInvoice({
          plan_id: plan.id,
          device_id: deviceId,
          promo_code: appliedPromo?.code || undefined,
        });

      if (checkoutError || !checkoutData) {
        throw new Error(checkoutError || "Gagal membuat pesanan.");
      }

      setInvoiceId(checkoutData.invoice_id || checkoutData.order_id || "");

      const invoiceStatus = (checkoutData.status || "").toLowerCase();

      if (invoiceStatus === "paid" || invoiceStatus === "settled" || invoiceStatus === "completed") {
        setPaymentStatus("paid");
        showToast("Pembayaran berhasil! Langganan Anda aktif.", "success");
        onSuccess?.();
        return;
      }

      if (invoiceStatus === "expired") {
        setPaymentStatus("expired");
        showToast("Invoice telah kedaluwarsa. Silakan buat pesanan baru.", "error");
        return;
      }

      if (invoiceStatus === "failed" || invoiceStatus === "rejected") {
        setPaymentStatus("failed");
        showToast("Pembayaran ditolak oleh penyedia pembayaran.", "error");
        return;
      }

      if (checkoutData.invoice_url) {
        setXenditInvoiceUrl(checkoutData.invoice_url);
        setPaymentStatus("pending");
        startPolling();
        window.open(checkoutData.invoice_url, "_blank", "noopener,noreferrer");
      } else {
        setPaymentStatus("pending");
        startPolling();
      }

      showToast("Invoice berhasil dibuat. Silakan selesaikan pembayaran.", "success");
    } catch (err: any) {
      console.error("Failed to place order:", err);
      setPaymentStatus("idle");
      showToast(err?.message || "Gagal membuat pesanan. Silakan coba lagi.", "error");
    }
  };

  const handleRetryPayment = () => {
    if (xenditInvoiceUrl) {
      window.open(xenditInvoiceUrl, "_blank", "noopener,noreferrer");
      setPaymentStatus("pending");
      startPolling();
    }
  };

  if (paymentStatus === "paid") {
    return (
      <div style={{
        height: "100%", backgroundColor: "#F8FAFC",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        overflowY: "auto",
      }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            maxWidth: 520, width: "100%", backgroundColor: "#ffffff",
            borderRadius: 20, padding: 40, textAlign: "center",
            boxShadow: "0 8px 40px rgba(12,30,53,0.08)",
          }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: 20, backgroundColor: "#ECFDF5",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <CheckCircle2 style={{ width: 36, height: 36, color: "#10B981" }} />
          </div>
          <h2 style={{
            fontSize: 24, fontWeight: 900, color: "#0C1E35", marginBottom: 8,
            fontFamily: "Outfit, sans-serif",
          }}>
            Pembayaran Berhasil
          </h2>
          <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, marginBottom: 24 }}>
            Langganan Anda telah aktif. Selamat menggunakan Aexon Endoscopy!
          </p>
          {invoiceId && (
            <div style={{
              backgroundColor: "#F8FAFC", borderRadius: 12,
              padding: "14px 20px", marginBottom: 24,
              border: "1px solid #E2E8F0",
            }}>
              <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 4 }}>Invoice ID</div>
              <div style={{
                fontSize: 16, fontWeight: 800, color: "#0C1E35",
                fontFamily: "monospace", letterSpacing: "0.05em",
              }}>
                {invoiceId}
              </div>
            </div>
          )}
          <button
            onClick={onBack}
            style={{
              padding: "16px 40px", backgroundColor: "#0C1E35", color: "#fff",
              fontWeight: 800, borderRadius: 14, border: "none", cursor: "pointer",
              fontSize: 16, fontFamily: "Outfit, sans-serif",
              boxShadow: "0 4px 20px rgba(12,30,53,0.25)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1a3a5c")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0C1E35")}
          >
            Mulai Menggunakan Aexon
          </button>
        </motion.div>
      </div>
    );
  }

  if (paymentStatus === "failed" || paymentStatus === "expired") {
    const isExpired = paymentStatus === "expired";
    return (
      <div style={{
        height: "100%", backgroundColor: "#F8FAFC",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        overflowY: "auto",
      }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            maxWidth: 520, width: "100%", backgroundColor: "#ffffff",
            borderRadius: 20, padding: 40, textAlign: "center",
            boxShadow: "0 8px 40px rgba(12,30,53,0.08)",
          }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            backgroundColor: isExpired ? "#FFF7ED" : "#FEF2F2",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            {isExpired ? (
              <Clock style={{ width: 36, height: 36, color: "#F97316" }} />
            ) : (
              <XCircle style={{ width: 36, height: 36, color: "#EF4444" }} />
            )}
          </div>
          <h2 style={{
            fontSize: 24, fontWeight: 900, color: "#0C1E35", marginBottom: 8,
            fontFamily: "Outfit, sans-serif",
          }}>
            {isExpired ? "Pembayaran Kedaluwarsa" : "Pembayaran Gagal"}
          </h2>
          <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, marginBottom: 24 }}>
            {isExpired
              ? "Waktu pembayaran telah habis. Silakan buat pesanan baru untuk melanjutkan."
              : "Pembayaran Anda tidak berhasil atau ditolak. Silakan coba lagi atau pilih metode pembayaran lain."}
          </p>
          {invoiceId && (
            <div style={{
              backgroundColor: "#F8FAFC", borderRadius: 12,
              padding: "14px 20px", marginBottom: 24,
              border: "1px solid #E2E8F0",
            }}>
              <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 4 }}>Invoice ID</div>
              <div style={{
                fontSize: 16, fontWeight: 800, color: "#0C1E35",
                fontFamily: "monospace", letterSpacing: "0.05em",
              }}>
                {invoiceId}
              </div>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {xenditInvoiceUrl && !isExpired && (
              <button
                onClick={handleRetryPayment}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  width: "100%", padding: "16px 0", backgroundColor: "#0C1E35", color: "#fff",
                  fontWeight: 800, borderRadius: 14, border: "none", cursor: "pointer",
                  fontSize: 16, fontFamily: "Outfit, sans-serif",
                  boxShadow: "0 4px 20px rgba(12,30,53,0.25)",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#1a3a5c")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#0C1E35")}
              >
                <RefreshCw style={{ width: 16, height: 16 }} />
                Coba Bayar Lagi
              </button>
            )}
            <button
              onClick={onBack}
              style={{
                padding: "14px 0", fontSize: 14, color: "#64748B", fontWeight: 600,
                background: "none", border: "1px solid #E2E8F0", borderRadius: 12,
                cursor: "pointer", fontFamily: "Outfit, sans-serif", width: "100%",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#94A3B8"; e.currentTarget.style.color = "#0C1E35"; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.color = "#64748B"; }}
            >
              Kembali ke Pilihan Paket
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (paymentStatus === "pending") {
    return (
      <div style={{
        height: "100%", backgroundColor: "#F8FAFC",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        overflowY: "auto",
      }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            maxWidth: 520, width: "100%", backgroundColor: "#ffffff",
            borderRadius: 20, padding: 40, textAlign: "center",
            boxShadow: "0 8px 40px rgba(12,30,53,0.08)",
          }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: 20, backgroundColor: "#FFF7ED",
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 24px",
          }}>
            <Clock style={{ width: 36, height: 36, color: "#F97316" }} />
          </div>
          <h2 style={{
            fontSize: 24, fontWeight: 900, color: "#0C1E35", marginBottom: 8,
            fontFamily: "Outfit, sans-serif",
          }}>
            Menunggu Pembayaran
          </h2>
          <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, marginBottom: 8 }}>
            Silakan selesaikan pembayaran Anda. Halaman ini akan otomatis diperbarui setelah pembayaran diterima.
          </p>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: 8, marginBottom: 24,
          }}>
            <Loader2 className="animate-spin" style={{ width: 16, height: 16, color: "#F97316" }} />
            <span style={{ fontSize: 13, color: "#F97316", fontWeight: 600 }}>
              Memeriksa status pembayaran...
            </span>
          </div>

          {invoiceId && (
            <div style={{
              backgroundColor: "#F8FAFC", borderRadius: 12,
              padding: "14px 20px", marginBottom: 24,
              border: "1px solid #E2E8F0",
            }}>
              <div style={{ fontSize: 12, color: "#94A3B8", marginBottom: 4 }}>Invoice ID</div>
              <div style={{
                fontSize: 16, fontWeight: 800, color: "#0C1E35",
                fontFamily: "monospace", letterSpacing: "0.05em",
              }}>
                {invoiceId}
              </div>
            </div>
          )}

          {xenditInvoiceUrl && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
              <a
                href={xenditInvoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  width: "100%", padding: "16px 0", backgroundColor: "#0C1E35", color: "#fff",
                  fontWeight: 800, borderRadius: 14, fontSize: 16, textDecoration: "none",
                  fontFamily: "Outfit, sans-serif",
                  boxShadow: "0 4px 20px rgba(12,30,53,0.25)",
                  transition: "background-color 0.15s",
                }}
              >
                <CreditCard style={{ width: 18, height: 18 }} />
                Bayar Sekarang — {formatRupiah(totalPrice)}
                <ExternalLink style={{ width: 14, height: 14, opacity: 0.6 }} />
              </a>
              <p style={{ fontSize: 12, color: "#94A3B8", lineHeight: 1.5 }}>
                Anda akan diarahkan ke halaman pembayaran Xendit yang aman.
                <br />
                Tersedia: Virtual Account, E-Wallet, Kartu Kredit, QRIS, dll.
              </p>
            </div>
          )}

          <div style={{
            backgroundColor: "#F0F9FF", borderRadius: 12, padding: 16,
            marginBottom: 20, textAlign: "left", border: "1px solid #BAE6FD",
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#0C1E35", marginBottom: 6 }}>
              Ringkasan Pesanan
            </div>
            <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.8 }}>
              Paket: <strong>{plan.product_name || "Aexon"} ({isAnnual ? "Tahunan" : "Bulanan"})</strong>
              <br />
              Total: <strong>{formatRupiah(totalPrice)}</strong>
            </div>
          </div>

          <button
            onClick={() => {
              stopPolling();
              onBack();
            }}
            style={{
              fontSize: 14, color: "#94A3B8", fontWeight: 600,
              background: "none", border: "none", cursor: "pointer",
              fontFamily: "Outfit, sans-serif",
            }}
          >
            Kembali ke Pengaturan
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{
        backgroundColor: "#ffffff", borderBottom: "1px solid #E2E8F0",
        padding: "14px 32px", display: "flex", alignItems: "center", gap: 16,
        position: "sticky", top: 0, zIndex: 20,
      }}>
        <button
          onClick={onBack}
          style={{
            display: "flex", alignItems: "center", gap: 6, background: "none",
            border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600,
            color: "#64748B", fontFamily: "Outfit, sans-serif", transition: "color 150ms",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "#0C1E35")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
        >
          <ArrowLeft style={{ width: 18, height: 18 }} />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #0C1E35, #1e3a5f)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Lock style={{ width: 13, height: 13, color: "#fff" }} />
          </div>
          <span style={{
            fontSize: 16, fontWeight: 800, color: "#0C1E35",
            fontFamily: "Outfit, sans-serif",
          }}>
            Ringkasan Pesanan
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          display: "flex", alignItems: "center", gap: 5,
          fontSize: 12, color: "#94A3B8", fontFamily: "Plus Jakarta Sans, sans-serif",
        }}>
          <ShieldCheck style={{ width: 14, height: 14 }} />
          Transaksi Aman & Terenkripsi
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", backgroundColor: "#F8FAFC" }} className="custom-scrollbar">
        <div style={{
          maxWidth: 960, width: "100%", margin: "0 auto",
          padding: "40px 32px 60px", display: "flex", gap: 40,
        }}>
          <div style={{
            flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 28,
          }}>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
            >
              <div style={{
                display: "flex", alignItems: "center", gap: 8, fontSize: 12,
                color: "#94A3B8", marginBottom: 20, fontFamily: "Plus Jakarta Sans, sans-serif",
              }}>
                <span style={{ color: "#0C1E35", fontWeight: 600 }}>Paket</span>
                <ChevronRight style={{ width: 12, height: 12 }} />
                <span style={{ color: "#0C1E35", fontWeight: 600 }}>Ringkasan</span>
                <ChevronRight style={{ width: 12, height: 12 }} />
                <span>Pembayaran</span>
              </div>
              <h1 style={{
                fontSize: 22, fontWeight: 900, color: "#0C1E35",
                fontFamily: "Outfit, sans-serif", marginBottom: 4,
              }}>
                Ringkasan Pesanan
              </h1>
              <p style={{ fontSize: 13, color: "#94A3B8" }}>
                Tinjau pesanan Anda sebelum melanjutkan ke pembayaran
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div style={{
                fontSize: 13, fontWeight: 700, color: "#0C1E35", marginBottom: 12,
                fontFamily: "Outfit, sans-serif",
              }}>
                Pelanggan
              </div>
              <div style={{
                padding: 16, borderRadius: 12, border: "1px solid #E2E8F0",
                backgroundColor: "#F8FAFC", display: "flex", alignItems: "center", gap: 14,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: "linear-gradient(135deg, #0C1E35, #1e3a5f)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0, fontSize: 16, fontWeight: 800, color: "#fff",
                  fontFamily: "Outfit, sans-serif",
                }}>
                  {(userName || userEmail).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "#0C1E35", marginBottom: 1 }}>
                    {userName}
                  </div>
                  <div style={{
                    fontSize: 12, color: "#94A3B8", overflow: "hidden",
                    textOverflow: "ellipsis", whiteSpace: "nowrap",
                  }}>
                    {userEmail}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
            >
              <div style={{
                fontSize: 13, fontWeight: 700, color: "#0C1E35", marginBottom: 12,
                fontFamily: "Outfit, sans-serif",
              }}>
                Kode Promo
              </div>

              {appliedPromo ? (
                <div style={{
                  padding: "12px 16px", borderRadius: 12, backgroundColor: "#ECFDF5",
                  border: "1px solid #A7F3D0", display: "flex", alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <Ticket style={{ width: 16, height: 16, color: "#10B981" }} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#065F46" }}>
                        {appliedPromo.code}
                      </div>
                      <div style={{ fontSize: 12, color: "#059669" }}>
                        {appliedPromo.label}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={handleRemovePromo}
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      color: "#94A3B8", padding: 4,
                    }}
                  >
                    <XCircle style={{ width: 18, height: 18 }} />
                  </button>
                </div>
              ) : showPromoInput ? (
                <div style={{ display: "flex", gap: 8 }}>
                  <div style={{ flex: 1, position: "relative" }}>
                    <input
                      type="text"
                      value={promoCode}
                      onChange={(e) => {
                        setPromoCode(e.target.value.toUpperCase());
                        setPromoError("");
                      }}
                      placeholder="Masukkan kode promo"
                      style={{
                        width: "100%", padding: "12px 16px", borderRadius: 12, fontSize: 14,
                        border: promoError ? "1px solid #EF4444" : "1px solid #E2E8F0",
                        outline: "none", fontWeight: 600, letterSpacing: "0.05em",
                        fontFamily: "monospace",
                      }}
                      onKeyDown={(e) => { if (e.key === "Enter") handleApplyPromo(); }}
                    />
                    {promoError && (
                      <div style={{ fontSize: 12, color: "#EF4444", marginTop: 6 }}>
                        {promoError}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleApplyPromo}
                    disabled={promoLoading || !promoCode.trim()}
                    style={{
                      padding: "0 20px", borderRadius: 12, border: "none",
                      backgroundColor: promoLoading || !promoCode.trim() ? "#E2E8F0" : "#0C1E35",
                      color: promoLoading || !promoCode.trim() ? "#94A3B8" : "#fff",
                      fontWeight: 700, fontSize: 13, cursor: promoLoading || !promoCode.trim() ? "default" : "pointer",
                      display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
                    }}
                  >
                    {promoLoading ? (
                      <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                    ) : "Terapkan"}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowPromoInput(true)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, padding: "12px 16px",
                    borderRadius: 12, border: "1px dashed #CBD5E1", backgroundColor: "#fff",
                    cursor: "pointer", fontSize: 13, color: "#64748B", fontWeight: 600,
                    width: "100%", transition: "border-color 150ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#94A3B8")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#CBD5E1")}
                >
                  <Tag style={{ width: 14, height: 14 }} />
                  Punya kode promo?
                </button>
              )}
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <button
                onClick={handlePlaceOrder}
                disabled={paymentStatus === "processing"}
                style={{
                  width: "100%", padding: "16px 0",
                  backgroundColor: paymentStatus === "processing" ? "#94A3B8" : "#0C1E35",
                  color: "white", border: "none", borderRadius: 14,
                  fontSize: 16, fontWeight: 800,
                  cursor: paymentStatus === "processing" ? "not-allowed" : "pointer",
                  boxShadow: paymentStatus === "processing" ? "none" : "0 4px 20px rgba(12,30,53,0.25)",
                  transition: "all 150ms", fontFamily: "Outfit, sans-serif",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                }}
                onMouseEnter={(e) => {
                  if (paymentStatus !== "processing") e.currentTarget.style.backgroundColor = "#1a3a5c";
                }}
                onMouseLeave={(e) => {
                  if (paymentStatus !== "processing") e.currentTarget.style.backgroundColor = "#0C1E35";
                }}
              >
                {paymentStatus === "processing" ? (
                  <>
                    <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} />
                    Memproses...
                  </>
                ) : (
                  <>
                    <CreditCard style={{ width: 18, height: 18 }} />
                    Lanjutkan ke Pembayaran · {formatRupiah(totalPrice)}
                  </>
                )}
              </button>

              <div style={{
                display: "flex", alignItems: "center", justifyContent: "center",
                gap: 6, marginTop: 14, fontSize: 12, color: "#CBD5E1",
              }}>
                <ShieldCheck style={{ width: 13, height: 13 }} />
                Anda akan diarahkan ke halaman pembayaran yang aman
              </div>
            </motion.div>
          </div>

          <div style={{ width: 360, flexShrink: 0 }}>
            <div style={{
              position: "sticky", top: 40, backgroundColor: "#ffffff",
              borderRadius: 20, border: "1px solid #E2E8F0",
              boxShadow: "0 4px 24px rgba(0,0,0,0.04)", padding: 28,
            }}>
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.1 }}
              >
                <div style={{
                  display: "flex", alignItems: "center", gap: 14,
                  paddingBottom: 20, borderBottom: "1px solid #E2E8F0", marginBottom: 20,
                }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 14,
                    background: "linear-gradient(135deg, #0C1E35, #1e3a5f)",
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    <CreditCard style={{ width: 24, height: 24, color: "#fff" }} />
                  </div>
                  <div>
                    <div style={{
                      fontSize: 16, fontWeight: 800, color: "#0C1E35", marginBottom: 2,
                    }}>
                      {plan.product_name || "Aexon"}
                    </div>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 8, marginTop: 4,
                    }}>
                      <span style={{
                        fontSize: 13, fontWeight: 800, color: "#0C1E35",
                        backgroundColor: "#E2E8F0", padding: "5px 14px", borderRadius: 999,
                        letterSpacing: "0.02em", fontFamily: "Outfit, sans-serif",
                      }}>
                        {isAnnual ? "Tahunan" : "Bulanan"}
                      </span>
                      {hasDiscount && (
                        <span style={{
                          fontSize: 12, fontWeight: 800, color: "#fff",
                          backgroundColor: "#10B981", padding: "5px 12px", borderRadius: 999,
                          letterSpacing: "0.03em", fontFamily: "Outfit, sans-serif",
                        }}>
                          BETA
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {Array.isArray(plan.features) && plan.features.length > 0 && (
                  <div style={{
                    paddingBottom: 20, borderBottom: "1px solid #E2E8F0", marginBottom: 20,
                  }}>
                    <button
                      onClick={() => setFeaturesExpanded(!featuresExpanded)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6, width: "100%",
                        background: "none", border: "none", cursor: "pointer", padding: 0,
                        fontSize: 13, fontWeight: 600, color: "#64748B",
                        fontFamily: "Outfit, sans-serif",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#0C1E35")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#64748B")}
                    >
                      <ChevronDown style={{
                        width: 14, height: 14, flexShrink: 0,
                        transform: featuresExpanded ? "rotate(0deg)" : "rotate(-90deg)",
                        transition: "transform 200ms",
                      }} />
                      Fitur ({plan.features.length})
                    </button>
                    {featuresExpanded && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
                        {plan.features.map((f: string, i: number) => (
                          <div key={i} style={{
                            display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748B",
                          }}>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                              <circle cx="7" cy="7" r="7" fill="#ECFDF5" />
                              <path d="M4 7l2 2 4-4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {f}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: "#475569" }}>
                    <span>Subtotal</span>
                    <span style={{ fontWeight: 600, color: "#0C1E35" }}>{formatRupiah(subtotal)}</span>
                  </div>
                  {isAnnual && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#94A3B8" }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Calendar style={{ width: 11, height: 11 }} />
                        {formatRupiah(pricePerMonth)} × 12 bulan
                      </span>
                    </div>
                  )}
                  {hasDiscount && betaSavings > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "#94A3B8" }}>
                      <span>Harga normal</span>
                      <span style={{ textDecoration: "line-through" }}>{formatRupiah(originalTotal)}</span>
                    </div>
                  )}
                  {betaSavings > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#10B981" }}>
                        <Tag style={{ width: 12, height: 12 }} /> Diskon Beta
                      </span>
                      <span style={{ color: "#10B981", fontWeight: 600 }}>-{formatRupiah(betaSavings)}</span>
                    </div>
                  )}
                  {appliedPromo && promoDiscount > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, color: "#10B981" }}>
                        <Ticket style={{ width: 12, height: 12 }} /> Promo ({appliedPromo.code})
                      </span>
                      <span style={{ color: "#10B981", fontWeight: 600 }}>-{formatRupiah(promoDiscount)}</span>
                    </div>
                  )}
                </div>

                <div style={{
                  borderTop: "1px solid #E2E8F0", paddingTop: 16,
                  display: "flex", justifyContent: "space-between", alignItems: "baseline",
                }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: "#475569" }}>Total</span>
                  <div style={{ textAlign: "right" }}>
                    <div style={{
                      fontSize: 28, fontWeight: 900, color: "#0C1E35",
                      fontFamily: "Outfit, sans-serif",
                    }}>
                      {formatRupiah(totalPrice)}
                    </div>
                    {isAnnual && (
                      <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                        ≈ {formatRupiah(Math.round(totalPrice / 12))}/bulan
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
