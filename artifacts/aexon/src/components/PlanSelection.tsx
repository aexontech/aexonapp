import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Sparkles,
  Tag,
  CreditCard,
} from 'lucide-react';
import { aexonConnect, Plan } from '../lib/aexonConnect';
import { useToast } from './ToastProvider';

interface PlanSelectionProps {
  onSelectPlan: (plan: Plan) => void;
  onBack: () => void;
}

export default function PlanSelection({ onSelectPlan, onBack }: PlanSelectionProps) {
  const { showToast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const formatRupiah = (amount: number) =>
    'Rp' + amount.toLocaleString('id-ID');

  useEffect(() => {
    async function fetchPlans() {
      try {
        const { data: remotePlans, error } = await aexonConnect.getPlans();

        if (error || !remotePlans) {
          showToast('Gagal memuat paket', 'error');
        } else {
          setPlans(remotePlans);
        }
      } catch {
        showToast('Gagal memuat paket', 'error');
      } finally {
        setLoading(false);
      }
    }
    fetchPlans();
  }, []);

  const monthlyPlan = plans.find(p => p.billing_cycle === 'monthly');
  const annualPlan = plans.find(p => p.billing_cycle === 'annual');
  const annualTotal = (annualPlan?.price ?? 0) * 12;
  const monthlySavings = ((monthlyPlan?.price ?? 0) * 12) - annualTotal;

  const handleContinue = () => {
    const selected = plans.find(p => p.id === selectedId);
    if (selected) onSelectPlan(selected);
  };

  return (
    <div style={{
      height: '100%', backgroundColor: '#F8FAFC',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        backgroundColor: '#ffffff', borderBottom: '1px solid #E2E8F0',
        padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 16,
        position: 'sticky', top: 0, zIndex: 10,
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
          Kembali
        </button>
      </div>

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '48px 24px 80px',
        overflowY: 'auto',
      }} className="custom-scrollbar">
        <motion.div
          initial={{ y: 16, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          style={{ textAlign: 'center', marginBottom: 40, maxWidth: 480 }}
        >
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #0C1E35, #1e3a5f)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <CreditCard style={{ width: 26, height: 26, color: '#fff' }} />
          </div>
          <h1 style={{
            fontSize: 28, fontWeight: 900, color: '#0C1E35',
            fontFamily: 'Outfit, sans-serif', marginBottom: 8,
          }}>
            Pilih Paket Langganan
          </h1>
          <p style={{ fontSize: 15, color: '#94A3B8', lineHeight: 1.6 }}>
            Akses penuh fitur Aexon Endoscopy untuk mendukung praktik Anda
          </p>
        </motion.div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60 }}>
            <Loader2 className="animate-spin" style={{ width: 28, height: 28, color: '#CBD5E1', margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14, color: '#94A3B8' }}>Memuat paket...</p>
          </div>
        ) : plans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8', fontSize: 14 }}>
            Tidak ada paket tersedia saat ini
          </div>
        ) : (
          <>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: 20, maxWidth: 720, width: '100%', marginBottom: 32,
            }}>
              {plans.map((planItem, idx) => {
                const isSelected = selectedId === planItem.id;
                const isAnnual = planItem.billing_cycle === 'annual';
                const hasDiscount = planItem.original_price !== null && planItem.original_price > planItem.price;

                return (
                  <motion.div
                    key={planItem.id}
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 + idx * 0.08 }}
                    onClick={() => setSelectedId(planItem.id)}
                    style={{
                      backgroundColor: '#ffffff',
                      border: isSelected ? '2px solid #0C1E35' : '1px solid #E2E8F0',
                      borderRadius: 20,
                      padding: 28,
                      cursor: 'pointer',
                      transition: 'all 200ms',
                      position: 'relative',
                      boxShadow: isSelected
                        ? '0 8px 30px rgba(12,30,53,0.12)'
                        : '0 2px 8px rgba(12,30,53,0.04)',
                    }}
                    onMouseEnter={e => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#94A3B8';
                        e.currentTarget.style.boxShadow = '0 4px 16px rgba(12,30,53,0.08)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = '#E2E8F0';
                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(12,30,53,0.04)';
                      }
                    }}
                  >
                    {isAnnual && (
                      <span style={{
                        position: 'absolute', top: -12, right: 20,
                        backgroundColor: '#0C1E35', color: '#fff',
                        fontSize: 11, fontWeight: 800, padding: '5px 16px',
                        borderRadius: 999, letterSpacing: '0.04em',
                        fontFamily: 'Outfit, sans-serif',
                        boxShadow: '0 4px 12px rgba(12,30,53,0.3)',
                      }}>
                        PALING HEMAT
                      </span>
                    )}

                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      alignItems: 'flex-start', marginBottom: 16,
                    }}>
                      <div>
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6,
                        }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 10,
                            backgroundColor: isAnnual ? '#EFF6FF' : '#F1F5F9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            {isAnnual
                              ? <Sparkles style={{ width: 18, height: 18, color: '#3B82F6' }} />
                              : <Calendar style={{ width: 18, height: 18, color: '#64748B' }} />
                            }
                          </div>
                          <div>
                            <div style={{
                              fontSize: 18, fontWeight: 800, color: '#0C1E35',
                              fontFamily: 'Outfit, sans-serif',
                            }}>
                              {isAnnual ? 'Tahunan' : 'Bulanan'}
                            </div>
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: '#94A3B8', marginLeft: 46 }}>
                          {planItem.product_name || 'Aexon'}
                        </div>
                      </div>
                      <div style={{
                        width: 24, height: 24, borderRadius: '50%',
                        border: isSelected ? 'none' : '2px solid #E2E8F0',
                        backgroundColor: isSelected ? '#0C1E35' : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0, marginTop: 4, transition: 'all 150ms',
                      }}>
                        {isSelected && (
                          <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#fff' }} />
                        )}
                      </div>
                    </div>

                    <div style={{ marginBottom: 16 }}>
                      {hasDiscount && (
                        <div style={{
                          fontSize: 14, color: '#94A3B8',
                          textDecoration: 'line-through', marginBottom: 2,
                        }}>
                          {formatRupiah(planItem.original_price!)}
                        </div>
                      )}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                        <span style={{
                          fontSize: 32, fontWeight: 900, color: '#0C1E35',
                          fontFamily: 'Outfit, sans-serif',
                        }}>
                          {formatRupiah(planItem.price)}
                        </span>
                        <span style={{ fontSize: 14, color: '#94A3B8', fontWeight: 500 }}>
                          /bulan
                        </span>
                      </div>
                      {isAnnual && monthlySavings > 0 && (
                        <div style={{
                          fontSize: 12, color: '#10B981', marginTop: 6,
                          display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600,
                        }}>
                          <Tag style={{ width: 12, height: 12 }} />
                          Ditagih {formatRupiah(annualTotal)}/tahun · Hemat {formatRupiah(monthlySavings)}
                        </div>
                      )}
                    </div>

                    {Array.isArray(planItem.features) && planItem.features.length > 0 && (
                      <div style={{
                        borderTop: '1px solid #F1F5F9', paddingTop: 16,
                        display: 'flex', flexDirection: 'column', gap: 8,
                      }}>
                        {planItem.features.map((f: string, i: number) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: 8,
                            fontSize: 13, color: '#64748B',
                          }}>
                            <div style={{
                              width: 18, height: 18, borderRadius: '50%',
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
                  </motion.div>
                );
              })}
            </div>

            <motion.div
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              style={{ maxWidth: 720, width: '100%' }}
            >
              <button
                onClick={handleContinue}
                disabled={!selectedId}
                style={{
                  width: '100%', padding: '18px 0',
                  backgroundColor: selectedId ? '#0C1E35' : '#E2E8F0',
                  color: selectedId ? '#fff' : '#94A3B8',
                  border: 'none', borderRadius: 16,
                  fontSize: 16, fontWeight: 800,
                  cursor: selectedId ? 'pointer' : 'default',
                  boxShadow: selectedId ? '0 4px 20px rgba(12,30,53,0.25)' : 'none',
                  transition: 'all 200ms',
                  fontFamily: 'Outfit, sans-serif',
                }}
                onMouseEnter={e => { if (selectedId) e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                onMouseLeave={e => { if (selectedId) e.currentTarget.style.backgroundColor = '#0C1E35'; }}
              >
                Lanjutkan ke Pembayaran
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
