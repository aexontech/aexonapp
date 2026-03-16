import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  ShieldCheck,
  CreditCard,
  Clock,
  CheckCircle2,
  Loader2,
  MessageCircle,
  ExternalLink,
  Mail as MailIcon,
  Receipt,
  Tag,
  Calendar,
  Building2,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from './ToastProvider';

interface CheckoutPlan {
  id: string;
  billing_cycle: 'monthly' | 'annual';
  price: number;
  original_price: number | null;
  features: string[];
  products: { name: string };
}

interface CheckoutProps {
  plan: CheckoutPlan;
  userEmail: string;
  userName: string;
  onBack: () => void;
}

export default function Checkout({ plan, userEmail, userName, onBack }: CheckoutProps) {
  const { showToast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderId, setOrderId] = useState('');

  const isAnnual = plan.billing_cycle === 'annual';
  const pricePerMonth = plan.price;
  const totalPrice = isAnnual ? pricePerMonth * 12 : pricePerMonth;
  const hasDiscount = plan.original_price !== null && plan.original_price > plan.price;
  const originalTotal = hasDiscount
    ? (plan.original_price! * (isAnnual ? 12 : 1))
    : totalPrice;
  const savings = hasDiscount ? originalTotal - totalPrice : 0;

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

  const handlePlaceOrder = async () => {
    setProcessing(true);
    try {
      const newOrderId = generateOrderId();

      if (!supabase) {
        throw new Error('Koneksi database tidak tersedia');
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
      }

      const { error: insertError } = await supabase.from('payment_logs').insert({
        user_id: user.id,
        plan_id: plan.id,
        amount: totalPrice,
        status: 'pending',
        order_id: newOrderId,
        billing_cycle: plan.billing_cycle,
      });

      if (insertError) {
        console.error('Insert error:', insertError);
        throw new Error('Gagal menyimpan pesanan ke database.');
      }

      setOrderId(newOrderId);
      setOrderPlaced(true);
      showToast('Pesanan berhasil dibuat!', 'success');
    } catch (err: any) {
      console.error('Failed to place order:', err);
      showToast(err?.message || 'Gagal membuat pesanan. Silakan coba lagi.', 'error');
    } finally {
      setProcessing(false);
    }
  };

  const sectionStyle: React.CSSProperties = {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    border: '1px solid #E2E8F0',
    padding: 24,
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    fontWeight: 700,
    color: '#94A3B8',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.06em',
    marginBottom: 12,
    fontFamily: 'Outfit, sans-serif',
  };

  if (orderPlaced) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#F8FAFC',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
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
            Pesanan Anda telah berhasil dibuat. Silakan lakukan pembayaran untuk mengaktifkan langganan.
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
    <div style={{
      minHeight: '100vh', backgroundColor: '#F8FAFC',
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        backgroundColor: '#ffffff', borderBottom: '1px solid #E2E8F0',
        padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: 14, fontWeight: 600, color: '#64748B',
            fontFamily: 'Outfit, sans-serif',
            transition: 'color 150ms',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#0C1E35'}
          onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
        >
          <ArrowLeft style={{ width: 18, height: 18 }} />
          Kembali
        </button>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#94A3B8', fontSize: 12 }}>
          <ShieldCheck style={{ width: 14, height: 14 }} />
          Transaksi Aman
        </div>
      </div>

      <div style={{
        flex: 1, display: 'flex', justifyContent: 'center',
        padding: '32px 24px 60px',
      }}>
        <div style={{
          maxWidth: 880, width: '100%',
          display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24,
          alignItems: 'start',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.05 }}
            >
              <h1 style={{
                fontSize: 24, fontWeight: 900, color: '#0C1E35',
                fontFamily: 'Outfit, sans-serif', marginBottom: 4,
              }}>
                Ringkasan Pembelian
              </h1>
              <p style={{ fontSize: 14, color: '#94A3B8' }}>
                Periksa detail pesanan Anda sebelum melanjutkan
              </p>
            </motion.div>

            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.1 }}
              style={sectionStyle}
            >
              <div style={labelStyle}>Detail Paket</div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 14,
                  background: 'linear-gradient(135deg, #0C1E35, #1e3a5f)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <CreditCard style={{ width: 22, height: 22, color: '#fff' }} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0C1E35', marginBottom: 2 }}>
                    {plan.products?.name || 'Aexon'}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 700, color: '#0C1E35',
                      backgroundColor: '#F1F5F9', padding: '3px 10px',
                      borderRadius: 999, fontFamily: 'Outfit, sans-serif',
                    }}>
                      {isAnnual ? 'Tahunan' : 'Bulanan'}
                    </span>
                    {hasDiscount && (
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: '#10B981',
                        backgroundColor: '#ECFDF5', padding: '3px 10px',
                        borderRadius: 999, fontFamily: 'Outfit, sans-serif',
                      }}>
                        BETA PRICE
                      </span>
                    )}
                  </div>
                  {Array.isArray(plan.features) && plan.features.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {plan.features.map((f: string, i: number) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748B' }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: '50%',
                            backgroundColor: '#ECFDF5', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path d="M2 5l2 2 4-4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </div>
                          {f}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.15 }}
              style={sectionStyle}
            >
              <div style={labelStyle}>Informasi Pelanggan</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    backgroundColor: '#F1F5F9', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Building2 style={{ width: 16, height: 16, color: '#64748B' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0C1E35' }}>{userName}</div>
                    <div style={{ fontSize: 12, color: '#94A3B8' }}>{userEmail}</div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              style={sectionStyle}
            >
              <div style={labelStyle}>Metode Pembayaran</div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: 16, backgroundColor: '#F0F9FF',
                borderRadius: 12, border: '1px solid #BAE6FD',
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10,
                  backgroundColor: '#fff', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  border: '1px solid #E2E8F0',
                }}>
                  <Receipt style={{ width: 18, height: 18, color: '#0C1E35' }} />
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35' }}>
                    Transfer Bank
                  </div>
                  <div style={{ fontSize: 12, color: '#64748B' }}>
                    BCA · Konfirmasi manual via WhatsApp / Email
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.15 }}
            style={{
              ...sectionStyle,
              position: 'sticky', top: 80,
              boxShadow: '0 8px 40px rgba(12,30,53,0.06)',
            }}
          >
            <div style={labelStyle}>Ringkasan Harga</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#475569' }}>
                <span>{plan.products?.name} — {isAnnual ? 'Tahunan' : 'Bulanan'}</span>
                <span style={{ fontWeight: 600 }}>
                  {formatRupiah(pricePerMonth)}/bln
                </span>
              </div>
              {isAnnual && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94A3B8' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Calendar style={{ width: 12, height: 12 }} /> 12 bulan
                  </span>
                  <span>{formatRupiah(pricePerMonth)} × 12</span>
                </div>
              )}
              {hasDiscount && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#94A3B8' }}>
                  <span>Harga normal</span>
                  <span style={{ textDecoration: 'line-through' }}>{formatRupiah(originalTotal)}</span>
                </div>
              )}
              {savings > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10B981' }}>
                    <Tag style={{ width: 12, height: 12 }} /> Hemat
                  </span>
                  <span style={{ color: '#10B981', fontWeight: 600 }}>-{formatRupiah(savings)}</span>
                </div>
              )}
            </div>

            <div style={{
              borderTop: '1px solid #E2E8F0',
              paddingTop: 16, marginBottom: 20,
              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
            }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35' }}>Total</span>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#0C1E35', fontFamily: 'Outfit, sans-serif' }}>
                  {formatRupiah(totalPrice)}
                </div>
                {isAnnual && (
                  <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>
                    ≈ {formatRupiah(pricePerMonth)}/bulan
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handlePlaceOrder}
              disabled={processing}
              style={{
                width: '100%', padding: '16px 0',
                backgroundColor: processing ? '#94A3B8' : '#0C1E35',
                color: 'white', border: 'none', borderRadius: 14,
                fontSize: 16, fontWeight: 800, cursor: processing ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 20px rgba(12,30,53,0.25)',
                transition: 'background-color 150ms',
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
                'Buat Pesanan'
              )}
            </button>

            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, marginTop: 14, fontSize: 12, color: '#94A3B8',
            }}>
              <ShieldCheck style={{ width: 13, height: 13 }} />
              Data Anda dilindungi enkripsi SSL
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
