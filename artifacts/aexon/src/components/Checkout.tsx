import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  Loader2,
  MessageCircle,
  ExternalLink,
  Mail as MailIcon,
  Tag,
  Calendar,
  Building2,
  Ticket,
  X,
  ChevronRight,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { aexonConnect, getDeviceId } from '../lib/aexonConnect';
import { useToast } from './ToastProvider';

interface CheckoutPlan {
  id: string;
  billing_cycle: 'monthly' | 'annual';
  price: number;
  original_price: number | null;
  features: string[];
  products: { name: string };
}

interface PromoResult {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  label: string;
}

interface CheckoutProps {
  plan: CheckoutPlan;
  userEmail: string;
  userName: string;
  onBack: () => void;
  onSuccess?: () => void;
}

export default function Checkout({ plan, userEmail, userName, onBack, onSuccess }: CheckoutProps) {
  const { showToast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');
  const [xenditInvoiceUrl, setXenditInvoiceUrl] = useState<string | null>(null);

  const [promoCode, setPromoCode] = useState('');
  const [promoLoading, setPromoLoading] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<PromoResult | null>(null);
  const [promoError, setPromoError] = useState('');
  const [showPromoInput, setShowPromoInput] = useState(false);
  const [featuresExpanded, setFeaturesExpanded] = useState(false);

  const isAnnual = plan.billing_cycle === 'annual';
  const pricePerMonth = plan.price;
  const subtotal = isAnnual ? pricePerMonth * 12 : pricePerMonth;
  const hasDiscount = plan.original_price !== null && plan.original_price > plan.price;
  const originalTotal = hasDiscount
    ? (plan.original_price! * (isAnnual ? 12 : 1))
    : subtotal;
  const betaSavings = hasDiscount ? originalTotal - subtotal : 0;

  const promoDiscount = appliedPromo
    ? appliedPromo.discount_type === 'percentage'
      ? Math.round(subtotal * (appliedPromo.discount_value / 100))
      : appliedPromo.discount_value
    : 0;

  const totalPrice = Math.max(0, subtotal - promoDiscount);

  const formatRupiah = (amount: number) =>
    'Rp' + amount.toLocaleString('id-ID');

  const generateOrderId = () => {
    const now = new Date();
    const y = now.getFullYear().toString().slice(-2);
    const m = (now.getMonth() + 1).toString().padStart(2, '0');
    const d = now.getDate().toString().padStart(2, '0');
    const r = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `AXN-${y}${m}${d}-${r}`;
  };

  const handleApplyPromo = async () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    setPromoLoading(true);
    setPromoError('');
    try {
      const { data, error } = await aexonConnect.validatePromo(code);

      if (error || !data) {
        setPromoError(error || 'Kode promo tidak ditemukan');
        return;
      }

      setAppliedPromo({
        code: data.code,
        discount_type: data.discount_type,
        discount_value: data.discount_value,
        label: data.label || `Diskon ${data.discount_type === 'percentage' ? data.discount_value + '%' : formatRupiah(data.discount_value)}`,
      });
      showToast('Kode promo berhasil diterapkan!', 'success');
    } catch (err) {
      setPromoError('Gagal memvalidasi kode promo');
    } finally {
      setPromoLoading(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoCode('');
    setPromoError('');
  };

  const handlePlaceOrder = async () => {
    setProcessing(true);
    try {
      const deviceId = getDeviceId();

      const { data: checkoutData, error: checkoutError } = await aexonConnect.createInvoice({
        plan_id: plan.id,
        device_id: deviceId,
        promo_code: appliedPromo?.code || undefined,
      });

      if (checkoutError || !checkoutData) {
        throw new Error(checkoutError || 'Gagal membuat pesanan.');
      }

      if (checkoutData.invoice_url) {
        window.open(checkoutData.invoice_url, '_blank');
        setXenditInvoiceUrl(checkoutData.invoice_url);
      }

      setOrderId(checkoutData.order_id || checkoutData.invoice_id);
      setOrderPlaced(true);
      showToast('Pesanan berhasil dibuat!', 'success');
      onSuccess?.();
    } catch (err: any) {
      console.error('Failed to place order:', err);
      showToast(err?.message || 'Gagal membuat pesanan. Silakan coba lagi.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  if (orderPlaced) {
    return (
      <div style={{
        height: '100%', backgroundColor: '#F8FAFC',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, overflowY: 'auto',
      }}>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{
            maxWidth: 520, width: '100%', backgroundColor: '#ffffff',
            borderRadius: 20, padding: 40, textAlign: 'center',
            boxShadow: '0 8px 40px rgba(12,30,53,0.08)',
          }}
        >
          <div style={{
            width: 72, height: 72, borderRadius: 20,
            backgroundColor: '#ECFDF5', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <CheckCircle2 style={{ width: 36, height: 36, color: '#10B981' }} />
          </div>

          <h2 style={{
            fontSize: 24, fontWeight: 900, color: '#0C1E35',
            marginBottom: 8, fontFamily: 'Outfit, sans-serif',
          }}>
            Pesanan Dibuat
          </h2>
          <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 8 }}>
            {xenditInvoiceUrl
              ? 'Invoice pembayaran Anda sudah siap. Klik tombol di bawah untuk menyelesaikan pembayaran.'
              : 'Pesanan Anda telah berhasil dibuat. Silakan lakukan pembayaran untuk mengaktifkan langganan.'
            }
          </p>

          <div style={{
            backgroundColor: '#F8FAFC', borderRadius: 12,
            padding: '14px 20px', marginBottom: 24,
            border: '1px solid #E2E8F0',
          }}>
            <div style={{ fontSize: 12, color: '#94A3B8', marginBottom: 4 }}>ID Pesanan</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#0C1E35', fontFamily: 'monospace', letterSpacing: '0.05em' }}>
              {orderId}
            </div>
          </div>

          {xenditInvoiceUrl ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
              <a
                href={xenditInvoiceUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  width: '100%', padding: '16px 0', backgroundColor: '#0C1E35', color: '#fff',
                  fontWeight: 800, borderRadius: 14, fontSize: 16, textDecoration: 'none',
                  transition: 'background-color 0.15s', fontFamily: 'Outfit, sans-serif',
                  boxShadow: '0 4px 20px rgba(12,30,53,0.25)',
                }}
              >
                <CreditCard style={{ width: 18, height: 18 }} />
                Bayar Sekarang — {formatRupiah(totalPrice)}
                <ExternalLink style={{ width: 14, height: 14, opacity: 0.6 }} />
              </a>
              <p style={{ textAlign: 'center', fontSize: 12, color: '#94A3B8', lineHeight: 1.5 }}>
                Anda akan diarahkan ke halaman pembayaran Xendit yang aman.
                <br />Tersedia: Virtual Account, E-Wallet, Kartu Kredit, QRIS, dll.
              </p>
            </div>
          ) : (
            <>
              <div style={{
                backgroundColor: '#F0F9FF', borderRadius: 12,
                padding: 16, marginBottom: 24, textAlign: 'left',
                border: '1px solid #BAE6FD',
              }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#0C1E35', marginBottom: 8 }}>
                  Transfer ke:
                </div>
                <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.8 }}>
                  Bank BCA — <strong>8730 4567 890</strong><br />
                  a.n. <strong>PT Aexon Digital Indonesia</strong><br />
                  Jumlah: <strong>{formatRupiah(totalPrice)}</strong>
                </div>
              </div>

              <p style={{ fontSize: 12, color: '#94A3B8', marginBottom: 20, lineHeight: 1.6 }}>
                Setelah transfer, kirim bukti pembayaran ke tim Aexon untuk verifikasi:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
                <a
                  href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo Aexon, saya ingin konfirmasi pembayaran.\nOrder ID: ${orderId}\nNama: ${userName}\nEmail: ${userEmail}\nPaket: ${plan.products?.name} (${isAnnual ? 'Tahunan' : 'Bulanan'})\nTotal: ${formatRupiah(totalPrice)}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    width: '100%', padding: '14px 0', backgroundColor: '#10B981', color: '#fff',
                    fontWeight: 700, borderRadius: 12, fontSize: 14, textDecoration: 'none',
                    transition: 'background-color 0.15s', fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  <MessageCircle style={{ width: 16, height: 16 }} />
                  Konfirmasi via WhatsApp
                  <ExternalLink style={{ width: 14, height: 14, opacity: 0.6 }} />
                </a>
                <a
                  href={`mailto:cs@aexon.id?subject=Konfirmasi Pembayaran ${orderId}&body=${encodeURIComponent(`Order ID: ${orderId}\nNama: ${userName}\nEmail: ${userEmail}\nPaket: ${plan.products?.name} (${isAnnual ? 'Tahunan' : 'Bulanan'})\nTotal: ${formatRupiah(totalPrice)}\n\n(Lampirkan bukti transfer)`)}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                    width: '100%', padding: '14px 0', border: '1px solid #E2E8F0',
                    color: '#475569', fontWeight: 700, borderRadius: 12, fontSize: 14,
                    textDecoration: 'none', backgroundColor: '#fff', transition: 'background-color 0.15s',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                >
                  <MailIcon style={{ width: 16, height: 16 }} />
                  Kirim Email Konfirmasi
                  <ExternalLink style={{ width: 14, height: 14, opacity: 0.4 }} />
                </a>
              </div>
            </>
          )}

          <button
            onClick={onBack}
            style={{
              fontSize: 14, color: '#94A3B8', fontWeight: 600,
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'Outfit, sans-serif',
            }}
          >
            Kembali ke Pengaturan
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{
        backgroundColor: '#ffffff', borderBottom: '1px solid #E2E8F0',
        padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16,
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, color: '#64748B',
            fontFamily: 'Outfit, sans-serif', transition: 'color 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#0C1E35'}
          onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
        >
          <ArrowLeft style={{ width: 18, height: 18 }} />
        </button>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'linear-gradient(135deg, #0C1E35, #1e3a5f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Lock style={{ width: 13, height: 13, color: '#fff' }} />
          </div>
          <span style={{ fontSize: 16, fontWeight: 800, color: '#0C1E35', fontFamily: 'Outfit, sans-serif' }}>
            Checkout
          </span>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12, color: '#94A3B8', fontFamily: 'Plus Jakarta Sans, sans-serif',
        }}>
          <ShieldCheck style={{ width: 14, height: 14 }} />
          Transaksi Aman & Terenkripsi
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#F8FAFC' }} className="custom-scrollbar">
        <div style={{
          maxWidth: 960, width: '100%', margin: '0 auto',
          padding: '40px 32px 60px',
          display: 'flex', gap: 40,
        }}>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 28 }}>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 12, color: '#94A3B8', marginBottom: 20,
                fontFamily: 'Plus Jakarta Sans, sans-serif',
              }}>
                <span style={{ color: '#0C1E35', fontWeight: 600 }}>Paket</span>
                <ChevronRight style={{ width: 12, height: 12 }} />
                <span style={{ color: '#0C1E35', fontWeight: 600 }}>Pembayaran</span>
                <ChevronRight style={{ width: 12, height: 12 }} />
                <span>Konfirmasi</span>
              </div>

              <h1 style={{
                fontSize: 22, fontWeight: 900, color: '#0C1E35',
                fontFamily: 'Outfit, sans-serif', marginBottom: 4,
              }}>
                Informasi Pembayaran
              </h1>
              <p style={{ fontSize: 13, color: '#94A3B8' }}>
                Lengkapi data di bawah untuk menyelesaikan pesanan
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#0C1E35',
                marginBottom: 12, fontFamily: 'Outfit, sans-serif',
              }}>
                Pelanggan
              </div>
              <div style={{
                padding: 16, borderRadius: 12,
                border: '1px solid #E2E8F0', backgroundColor: '#F8FAFC',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'linear-gradient(135deg, #0C1E35, #1e3a5f)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: 16, fontWeight: 800, color: '#fff',
                  fontFamily: 'Outfit, sans-serif',
                }}>
                  {(userName || userEmail).charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35', marginBottom: 1 }}>
                    {userName}
                  </div>
                  <div style={{ fontSize: 12, color: '#94A3B8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                fontSize: 13, fontWeight: 700, color: '#0C1E35',
                marginBottom: 12, fontFamily: 'Outfit, sans-serif',
              }}>
                Metode Pembayaran
              </div>
              <div style={{
                padding: 16, borderRadius: 12,
                border: '2px solid #0C1E35', backgroundColor: '#fff',
                display: 'flex', alignItems: 'center', gap: 14,
                position: 'relative',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  background: 'linear-gradient(135deg, #0038A8, #00D4FF)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <CreditCard style={{ width: 18, height: 18, color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35' }}>
                    Xendit Payment Gateway
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    VA, E-Wallet, Kartu Kredit, QRIS, Retail Outlet
                  </div>
                </div>
                <div style={{
                  width: 20, height: 20, borderRadius: '50%',
                  backgroundColor: '#0C1E35', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#fff' }} />
                </div>
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginTop: 10, flexWrap: 'wrap',
              }}>
                {['BCA', 'BNI', 'Mandiri', 'GoPay', 'OVO', 'DANA', 'QRIS'].map(method => (
                  <span key={method} style={{
                    fontSize: 10, fontWeight: 600, color: '#94A3B8',
                    backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                    padding: '3px 8px', borderRadius: 6,
                  }}>
                    {method}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div style={{
                fontSize: 13, fontWeight: 700, color: '#0C1E35',
                marginBottom: 12, fontFamily: 'Outfit, sans-serif',
              }}>
                Kode Promo
              </div>

              {appliedPromo ? (
                <div style={{
                  padding: '12px 16px', borderRadius: 12,
                  border: '1px solid #BBF7D0', backgroundColor: '#F0FDF4',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: '#DCFCE7', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Ticket style={{ width: 16, height: 16, color: '#16A34A' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#166534' }}>
                      {appliedPromo.code}
                    </div>
                    <div style={{ fontSize: 12, color: '#4ADE80' }}>
                      {appliedPromo.label} — Hemat {formatRupiah(promoDiscount)}
                    </div>
                  </div>
                  <button
                    onClick={handleRemovePromo}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      padding: 4, display: 'flex', borderRadius: 6,
                    }}
                  >
                    <X style={{ width: 16, height: 16, color: '#94A3B8' }} />
                  </button>
                </div>
              ) : !showPromoInput ? (
                <button
                  onClick={() => setShowPromoInput(true)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    padding: '12px 16px', borderRadius: 12,
                    border: '1px dashed #CBD5E1', backgroundColor: '#FAFBFC',
                    cursor: 'pointer', fontSize: 13, color: '#64748B',
                    fontWeight: 600, width: '100%',
                    transition: 'border-color 150ms, background-color 150ms',
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.backgroundColor = '#FAFBFC'; }}
                >
                  <Ticket style={{ width: 16, height: 16 }} />
                  Punya kode promo?
                </button>
              ) : (
                <AnimatePresence>
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    style={{ overflow: 'hidden' }}
                  >
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div style={{ flex: 1, position: 'relative' }}>
                        <input
                          type="text"
                          value={promoCode}
                          onChange={e => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                          placeholder="Masukkan kode promo"
                          onKeyDown={e => { if (e.key === 'Enter') handleApplyPromo(); }}
                          style={{
                            width: '100%', padding: '12px 16px',
                            border: promoError ? '1.5px solid #FCA5A5' : '1px solid #E2E8F0',
                            borderRadius: 12, fontSize: 14, color: '#0C1E35',
                            backgroundColor: '#fff', outline: 'none',
                            fontFamily: 'Plus Jakarta Sans, sans-serif',
                            fontWeight: 600, letterSpacing: '0.05em',
                            transition: 'border-color 150ms',
                          }}
                          onFocus={e => { if (!promoError) e.currentTarget.style.borderColor = '#0C1E35'; }}
                          onBlur={e => { if (!promoError) e.currentTarget.style.borderColor = '#E2E8F0'; }}
                          autoFocus
                        />
                      </div>
                      <button
                        onClick={handleApplyPromo}
                        disabled={promoLoading || !promoCode.trim()}
                        style={{
                          padding: '0 20px', borderRadius: 12, border: 'none',
                          backgroundColor: promoCode.trim() ? '#0C1E35' : '#E2E8F0',
                          color: promoCode.trim() ? '#fff' : '#94A3B8',
                          fontSize: 13, fontWeight: 700, cursor: promoCode.trim() ? 'pointer' : 'default',
                          fontFamily: 'Outfit, sans-serif', transition: 'all 150ms',
                          display: 'flex', alignItems: 'center', gap: 6,
                          flexShrink: 0,
                        }}
                        onMouseEnter={e => { if (promoCode.trim()) e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                        onMouseLeave={e => { if (promoCode.trim()) e.currentTarget.style.backgroundColor = '#0C1E35'; }}
                      >
                        {promoLoading ? (
                          <Loader2 className="animate-spin" style={{ width: 14, height: 14 }} />
                        ) : 'Terapkan'}
                      </button>
                    </div>
                    {promoError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ fontSize: 12, color: '#EF4444', marginTop: 8, fontWeight: 500 }}
                      >
                        {promoError}
                      </motion.p>
                    )}
                  </motion.div>
                </AnimatePresence>
              )}
            </motion.div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.25 }}
              style={{ borderTop: '1px solid #F1F5F9', paddingTop: 20 }}
            >
              <button
                onClick={handlePlaceOrder}
                disabled={processing}
                style={{
                  width: '100%', padding: '16px 0',
                  backgroundColor: processing ? '#94A3B8' : '#0C1E35',
                  color: 'white', border: 'none', borderRadius: 14,
                  fontSize: 16, fontWeight: 800,
                  cursor: processing ? 'not-allowed' : 'pointer',
                  boxShadow: processing ? 'none' : '0 4px 20px rgba(12,30,53,0.25)',
                  transition: 'all 150ms',
                  fontFamily: 'Outfit, sans-serif',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
                onMouseEnter={e => { if (!processing) e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                onMouseLeave={e => { if (!processing) e.currentTarget.style.backgroundColor = '#0C1E35'; }}
              >
                {processing ? (
                  <>
                    <Loader2 className="animate-spin" style={{ width: 18, height: 18 }} />
                    Memproses...
                  </>
                ) : (
                  <>Buat Pesanan · {formatRupiah(totalPrice)}</>
                )}
              </button>

              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, marginTop: 14, fontSize: 12, color: '#CBD5E1',
              }}>
                <ShieldCheck style={{ width: 13, height: 13 }} />
                Data Anda dilindungi enkripsi SSL
              </div>
            </motion.div>
          </div>

          <div style={{
            width: 360, flexShrink: 0,
          }}>
            <div style={{
              position: 'sticky', top: 40,
              backgroundColor: '#ffffff', borderRadius: 20,
              border: '1px solid #E2E8F0',
              boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
              padding: 28,
            }}>
            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                paddingBottom: 20, borderBottom: '1px solid #E2E8F0', marginBottom: 20,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: 'linear-gradient(135deg, #0C1E35, #1e3a5f)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <CreditCard style={{ width: 24, height: 24, color: '#fff' }} />
                </div>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#0C1E35', marginBottom: 2 }}>
                    {plan.products?.name || 'Aexon'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                    <span style={{
                      fontSize: 13, fontWeight: 800, color: '#0C1E35',
                      backgroundColor: '#E2E8F0', padding: '5px 14px',
                      borderRadius: 999, letterSpacing: '0.02em',
                      fontFamily: 'Outfit, sans-serif',
                    }}>
                      {isAnnual ? 'Tahunan' : 'Bulanan'}
                    </span>
                    {hasDiscount && (
                      <span style={{
                        fontSize: 12, fontWeight: 800, color: '#fff',
                        backgroundColor: '#10B981', padding: '5px 12px',
                        borderRadius: 999, letterSpacing: '0.03em',
                        fontFamily: 'Outfit, sans-serif',
                      }}>
                        BETA
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {Array.isArray(plan.features) && plan.features.length > 0 && (
                <div style={{ paddingBottom: 20, borderBottom: '1px solid #E2E8F0', marginBottom: 20 }}>
                  <button
                    onClick={() => setFeaturesExpanded(!featuresExpanded)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6, width: '100%',
                      background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                      fontSize: 13, fontWeight: 600, color: '#64748B',
                      fontFamily: 'Outfit, sans-serif',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#0C1E35'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#64748B'; }}
                  >
                    <ChevronDown style={{
                      width: 14, height: 14, flexShrink: 0,
                      transform: featuresExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                      transition: 'transform 200ms',
                    }} />
                    Fitur ({plan.features.length})
                  </button>
                  {featuresExpanded && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 10 }}>
                      {plan.features.map((f: string, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748B' }}>
                          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
                            <circle cx="7" cy="7" r="7" fill="#ECFDF5"/>
                            <path d="M4 7l2 2 4-4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#475569' }}>
                  <span>Subtotal</span>
                  <span style={{ fontWeight: 600, color: '#0C1E35' }}>
                    {formatRupiah(subtotal)}
                  </span>
                </div>
                {isAnnual && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#94A3B8' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Calendar style={{ width: 11, height: 11 }} /> {formatRupiah(pricePerMonth)} × 12 bulan
                    </span>
                  </div>
                )}
                {hasDiscount && betaSavings > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94A3B8' }}>
                    <span>Harga normal</span>
                    <span style={{ textDecoration: 'line-through' }}>{formatRupiah(originalTotal)}</span>
                  </div>
                )}
                {betaSavings > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981' }}>
                      <Tag style={{ width: 12, height: 12 }} /> Diskon Beta
                    </span>
                    <span style={{ color: '#10B981', fontWeight: 600 }}>-{formatRupiah(betaSavings)}</span>
                  </div>
                )}
                {appliedPromo && promoDiscount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981' }}>
                      <Ticket style={{ width: 12, height: 12 }} /> Promo ({appliedPromo.code})
                    </span>
                    <span style={{ color: '#10B981', fontWeight: 600 }}>-{formatRupiah(promoDiscount)}</span>
                  </div>
                )}
              </div>

              <div style={{
                borderTop: '1px solid #E2E8F0', paddingTop: 16,
                display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
              }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#475569' }}>Total</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: '#0C1E35', fontFamily: 'Outfit, sans-serif' }}>
                    {formatRupiah(totalPrice)}
                  </div>
                  {isAnnual && (
                    <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
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
