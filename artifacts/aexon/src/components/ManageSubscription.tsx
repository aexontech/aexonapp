import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, CreditCard, Users, Zap, ShieldCheck, Calendar, ArrowRight, CheckCircle2, Building2, BarChart3, X, Plus, AlertCircle, TrendingUp, Clock, Download, Sparkles, Crown } from 'lucide-react';

interface ManageSubscriptionProps {
  onBack: () => void;
  onSubscribe?: () => void;
}

export default function ManageSubscription({ onBack, onSubscribe }: ManageSubscriptionProps) {
  const [activeModal, setActiveModal] = useState<'seats' | 'payment' | 'billing' | null>(null);

  const subscriptionInfo = {
    plan: 'Enterprise Corporate',
    status: 'Active',
    expiryDate: '12 Desember 2026',
    totalSeats: 50,
    usedSeats: 24,
    billingCycle: 'Annual',
    nextBilling: '12 Desember 2026',
    hospitalName: 'RSUP Jakarta'
  };

  const features = [
    'Unlimited Endoscopy Sessions',
    'AI-Powered Report Generation',
    'Multi-user Collaboration (50 Seats)',
    'Enterprise Local Storage (5TB)',
    'Advanced Security & Audit Logs',
    'Custom Hospital Branding',
    'Priority 24/7 Support',
    'Blockchain Data Verification'
  ];

  return (
    <div className="flex-1 p-8 max-w-6xl mx-auto w-full font-sans text-slate-900 overflow-y-auto h-full custom-scrollbar">
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={onBack}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Kelola Langganan Enterprise</h2>
          <p className="text-slate-500 text-sm">Monitor status paket, penggunaan seat, dan informasi penagihan institusi.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left Column: Plan Overview */}
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-[2.5rem] p-10 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
                    <Zap className="w-8 h-8 text-yellow-300" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black tracking-tight">{subscriptionInfo.plan}</h3>
                    <p className="text-indigo-100 text-sm opacity-80">{subscriptionInfo.hospitalName}</p>
                  </div>
                </div>
                <div className="px-4 py-1.5 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-[10px] font-black tracking-widest text-emerald-300 uppercase">
                  {subscriptionInfo.status}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-10">
                <div>
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Masa Berlaku</p>
                  <p className="text-lg font-bold">{subscriptionInfo.expiryDate}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Siklus Tagihan</p>
                  <p className="text-lg font-bold">{subscriptionInfo.billingCycle}</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Tagihan Berikutnya</p>
                  <p className="text-lg font-bold">{subscriptionInfo.nextBilling}</p>
                </div>
              </div>

              <div className="p-6 bg-white/10 rounded-3xl border border-white/10 backdrop-blur-sm">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-indigo-200" />
                    <span className="text-sm font-bold">Penggunaan Seat Dokter</span>
                  </div>
                  <span className="text-sm font-black">{subscriptionInfo.usedSeats} / {subscriptionInfo.totalSeats} Akun</span>
                </div>
                <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden p-0.5">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${(subscriptionInfo.usedSeats / subscriptionInfo.totalSeats) * 100}%` }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" 
                  />
                </div>
                <p className="text-[10px] text-indigo-200 mt-4 font-medium italic">
                  * Anda masih memiliki {subscriptionInfo.totalSeats - subscriptionInfo.usedSeats} slot dokter yang tersedia untuk didaftarkan.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-8 flex items-center">
              <ShieldCheck className="w-6 h-6 mr-3 text-blue-600" />
              Fitur Paket Enterprise
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {features.map((feature, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-slate-100 shrink-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className="text-sm font-bold text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Actions & Support */}
        <div className="space-y-8">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
            <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-6">Aksi Cepat</h4>
            <div className="space-y-4">
              <button 
                onClick={() => setActiveModal('seats')}
                className="w-full flex items-center justify-between p-5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <Users className="w-5 h-5" />
                  <span className="text-sm font-bold">Tambah Kuota Seat</span>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => setActiveModal('payment')}
                className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <CreditCard className="w-5 h-5" />
                  <span className="text-sm font-bold">Metode Pembayaran</span>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <button 
                onClick={() => setActiveModal('billing')}
                className="w-full flex items-center justify-between p-5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-4">
                  <Calendar className="w-5 h-5" />
                  <span className="text-sm font-bold">Riwayat Penagihan</span>
                </div>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {onSubscribe && (
            <div style={{
              background: 'linear-gradient(135deg, #0C1E35 0%, #1a3a5f 100%)',
              borderRadius: 24, padding: 28, position: 'relative', overflow: 'hidden',
            }}>
              <div style={{
                position: 'absolute', top: -30, right: -30, width: 120, height: 120,
                borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
              }} />
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(245,158,11,0.3)',
                  }}>
                    <Crown style={{ width: 18, height: 18, color: '#fff' }} />
                  </div>
                  <h4 style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', fontFamily: 'Outfit, sans-serif' }}>
                    Perpanjang Langganan
                  </h4>
                </div>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, marginBottom: 16 }}>
                  Pastikan layanan institusi Anda tetap berjalan tanpa gangguan.
                </p>
                <button
                  onClick={onSubscribe}
                  style={{
                    width: '100%', padding: '14px 0',
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    color: '#0C1E35', borderRadius: 14, fontSize: 14, fontWeight: 800,
                    border: 'none', cursor: 'pointer', fontFamily: 'Outfit, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: '0 4px 16px rgba(245,158,11,0.3)',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(245,158,11,0.4)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(245,158,11,0.3)'; }}
                >
                  <Sparkles style={{ width: 16, height: 16 }} />
                  Perpanjang Sekarang
                  <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              </div>
            </div>
          )}

          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#0C1E35] rounded-full blur-3xl -mr-16 -mt-16 opacity-20 group-hover:opacity-40 transition-opacity" />
            <div className="relative z-10">
              <h4 className="text-lg font-bold mb-4">Butuh Bantuan?</h4>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Manajer akun Enterprise Anda siap membantu konfigurasi sistem atau penambahan fitur khusus.
              </p>
              <button className="w-full py-4 bg-white text-slate-900 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-400 hover:text-white transition-all">
                HUBUNGI SUPPORT PRIORITAS
              </button>
            </div>
          </div>

          <div className="p-8 bg-blue-50 rounded-[2.5rem] border border-blue-100">
            <div className="flex items-center gap-4 mb-4">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              <h4 className="text-sm font-black text-blue-900 uppercase tracking-widest">Statistik Penyimpanan</h4>
            </div>
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold text-blue-700">
                <span>Penyimpanan Terpakai</span>
                <span>3.2 TB / 5 TB</span>
              </div>
              <div className="w-full h-2 bg-blue-200 rounded-full overflow-hidden">
                <div className="h-full bg-[#0C1E35] w-[64%]" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100">
                    {activeModal === 'seats' && <Users className="w-6 h-6 text-blue-600" />}
                    {activeModal === 'payment' && <CreditCard className="w-6 h-6 text-blue-600" />}
                    {activeModal === 'billing' && <Calendar className="w-6 h-6 text-blue-600" />}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                      {activeModal === 'seats' && 'Tambah Kuota Seat'}
                      {activeModal === 'payment' && 'Metode Pembayaran'}
                      {activeModal === 'billing' && 'Riwayat Penagihan'}
                    </h3>
                    <p className="text-slate-500 text-xs font-medium">
                      {activeModal === 'seats' && 'Perluas akses untuk lebih banyak dokter di institusi Anda.'}
                      {activeModal === 'payment' && 'Kelola kartu kredit atau metode pembayaran otomatis lainnya.'}
                      {activeModal === 'billing' && 'Daftar invoice dan status pembayaran langganan Anda.'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveModal(null)}
                  className="p-3 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-slate-900 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                {activeModal === 'seats' && (
                  <div className="space-y-8">
                    <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6 flex items-start gap-4">
                      <AlertCircle className="w-6 h-6 text-blue-600 shrink-0 mt-1" />
                      <div>
                        <h4 className="text-sm font-bold text-blue-900 mb-1">Informasi Penambahan Seat</h4>
                        <p className="text-xs text-blue-700 leading-relaxed">
                          Penambahan seat akan dikenakan biaya prorata hingga akhir periode langganan saat ini. Biaya per seat tambahan adalah Rp 450.000 / bulan.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Jumlah Seat Baru</label>
                        <div className="flex items-center gap-4">
                          <input 
                            type="number" 
                            defaultValue={5}
                            className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                          <span className="text-sm font-bold text-slate-500">Seat</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Estimasi Biaya</label>
                        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
                          <span className="text-lg font-black text-slate-900 tracking-tight">Rp 1.250.000</span>
                          <span className="text-[10px] text-slate-400 block mt-1">/ bulan (Prorata)</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Ringkasan Perubahan
                      </h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Kuota Saat Ini</span>
                          <span className="font-bold">50 Seat</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-500">Tambahan</span>
                          <span className="font-bold text-emerald-600">+5 Seat</span>
                        </div>
                        <div className="h-px bg-slate-200 my-2" />
                        <div className="flex justify-between text-base">
                          <span className="font-black text-slate-900">Total Kuota Baru</span>
                          <span className="font-black text-blue-600 underline underline-offset-4">55 Seat</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeModal === 'payment' && (
                  <div className="space-y-8">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Kartu Terdaftar</h4>
                      <div className="p-6 bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl text-white relative overflow-hidden shadow-xl">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500 rounded-full blur-3xl -mr-16 -mt-16 opacity-20" />
                        <div className="relative z-10">
                          <div className="flex justify-between items-start mb-10">
                            <CreditCard className="w-10 h-10 text-slate-400" />
                            <span className="text-xs font-bold tracking-widest opacity-60">VISA</span>
                          </div>
                          <p className="text-xl font-black tracking-[0.2em] mb-6">•••• •••• •••• 4242</p>
                          <div className="flex justify-between items-end">
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">Card Holder</p>
                              <p className="text-xs font-bold uppercase tracking-widest">RSUP JAKARTA ADMIN</p>
                            </div>
                            <div>
                              <p className="text-[8px] font-black uppercase tracking-widest opacity-50 mb-1">Expires</p>
                              <p className="text-xs font-bold">12/28</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <button className="w-full py-5 border-2 border-dashed border-slate-200 rounded-3xl text-slate-400 hover:text-blue-600 hover:border-blue-500/50 hover:bg-blue-50 transition-all flex items-center justify-center gap-3 group">
                      <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-black uppercase tracking-widest">Tambah Metode Pembayaran Baru</span>
                    </button>

                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                      <h4 className="text-xs font-black text-slate-900 uppercase tracking-widest mb-4">Opsi Lainnya</h4>
                      <div className="space-y-3">
                        <button className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-between">
                          <span>Transfer Bank (Virtual Account)</span>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </button>
                        <button className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 hover:bg-slate-50 transition-all flex items-center justify-between">
                          <span>E-Wallet (Gopay/OVO)</span>
                          <ArrowRight className="w-4 h-4 text-slate-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {activeModal === 'billing' && (
                  <div className="space-y-6">
                    <div className="overflow-hidden border border-slate-200 rounded-3xl">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200">
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            <th className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[
                            { id: 'INV-2024-001', date: '12 Des 2024', amount: 'Rp 150.000.000', status: 'Paid' },
                            { id: 'INV-2023-012', date: '12 Des 2023', amount: 'Rp 150.000.000', status: 'Paid' },
                            { id: 'INV-2022-012', date: '12 Des 2022', amount: 'Rp 120.000.000', status: 'Paid' }
                          ].map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50 transition-all group">
                              <td className="p-4">
                                <span className="text-xs font-black text-slate-900">{item.id}</span>
                              </td>
                              <td className="p-4">
                                <div className="flex items-center gap-2 text-slate-500">
                                  <Clock className="w-3 h-3" />
                                  <span className="text-xs font-medium">{item.date}</span>
                                </div>
                              </td>
                              <td className="p-4">
                                <span className="text-xs font-black text-slate-900">{item.amount}</span>
                              </td>
                              <td className="p-4">
                                <span className="px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full text-[9px] font-black uppercase tracking-widest">
                                  {item.status}
                                </span>
                              </td>
                              <td className="p-4 text-right">
                                <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                  <Download className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 text-center">
                      <p className="text-xs text-slate-500 font-medium">
                        Menampilkan 3 riwayat penagihan terakhir. Untuk riwayat lengkap, silakan hubungi tim finansial Aexon.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-8 border-t border-slate-100 bg-slate-50 shrink-0">
                <div className="flex gap-4">
                  <button 
                    onClick={() => setActiveModal(null)}
                    className="flex-1 py-4 bg-white border border-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-slate-50 transition-all"
                  >
                    TUTUP
                  </button>
                  {activeModal !== 'billing' && (
                    <button 
                      onClick={() => {
                        setActiveModal(null);
                      }}
                      className="flex-1 py-4 bg-[#0C1E35] text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-[#1a3a5c] transition-all shadow-xl shadow-slate-900/10"
                    >
                      {activeModal === 'seats' ? 'KONFIRMASI PENAMBAHAN' : 'SIMPAN PERUBAHAN'}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
