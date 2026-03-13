import React, { useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, CalendarDays, ArrowRight, ShieldAlert, Building2, Users } from 'lucide-react';

interface PricingProps {
  onSelectPlan: (plan: 'subscription') => void;
}

export default function Pricing({ onSelectPlan }: PricingProps) {
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  const handleContinue = () => {
    onSelectPlan('subscription');
  };

  const subscriptionPlans = [
    {
      id: 'monthly',
      name: 'Monthly',
      pricePerDay: 'Rp 23.300',
      period: '/ hari',
      fullPrice: 'Rp 699.000 / bulan',
      features: ['Akses penuh 1 Dokter', 'Penyimpanan lokal', 'Dukungan standar'],
      icon: <CalendarDays className="w-6 h-6 text-blue-600" />,
      cta: 'Pilih 1 Bulan',
      popular: false
    },
    {
      id: 'half-year',
      name: '6 Months',
      pricePerDay: 'Rp 19.994',
      period: '/ hari',
      fullPrice: 'Rp 3.599.000 / 6 bln (Rp 599.833 / bln)',
      features: ['Hemat 14% dari bulanan', 'Akses penuh 1 Dokter', 'Dukungan prioritas'],
      icon: <CalendarDays className="w-6 h-6 text-blue-600" />,
      cta: 'Pilih 6 Bulan',
      popular: false
    },
    {
      id: 'annual',
      name: 'Annual',
      pricePerDay: 'Rp 16.663',
      period: '/ hari',
      fullPrice: 'Rp 5.999.000 / tahun (Rp 499.917 / bln)',
      features: ['Hemat 28% dari bulanan', 'Akses penuh 1 Dokter', 'Dukungan prioritas'],
      icon: <CalendarDays className="w-6 h-6 text-blue-600" />,
      cta: 'Pilih Tahunan',
      popular: true
    }
  ];

  const enterprisePlans = [
    {
      id: 'clinic',
      name: 'Clinic',
      pricePerDay: 'Rp 9.258',
      period: '/ dokter / hari',
      fullPrice: 'Rp 9.999.000 / tahun (Maks 3 Dokter)',
      features: ['Rp 277.750 / dokter / bulan', 'Admin Dashboard RS', 'Manajemen Seat'],
      icon: <Users className="w-6 h-6 text-blue-600" />,
      cta: 'Hubungi Aexon'
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      pricePerDay: 'Rp 1.766',
      period: '/ dokter / hari',
      fullPrice: 'Rp 18.999.000 / tahun (10-30 Dokter)',
      features: ['Rp 53.000 / dokter / bulan', 'Audit log bulanan', 'Device registration'],
      icon: <Building2 className="w-6 h-6 text-blue-600" />,
      cta: 'Hubungi Aexon'
    },
    {
      id: 'enterprise-plus',
      name: 'Enterprise+',
      pricePerDay: 'Custom',
      period: '',
      fullPrice: 'Hubungi Sales untuk Penawaran Khusus',
      features: ['> 30 Dokter / User', 'Integrasi HIS/PACS', 'On-premise deployment'],
      icon: <ShieldAlert className="w-6 h-6 text-blue-600" />,
      cta: 'Hubungi Aexon'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center p-6 font-sans text-slate-900">
      <div className="w-full max-w-[1600px] flex-1 bg-gradient-to-br from-blue-50 via-white to-blue-100 rounded-[3rem] border border-slate-200 shadow-xl overflow-y-auto py-16 px-6 custom-scrollbar">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-2xl mx-auto mb-12"
        >
          <div className="inline-flex items-center justify-center p-2 bg-blue-50 rounded-full mb-6 border border-blue-100">
            <ShieldAlert className="w-5 h-5 text-blue-600 mr-2" />
            <span className="text-sm font-aexon text-blue-700 pr-2 tracking-wide">Aexon Commerce</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">Pilih Paket <span className="font-aexon">Aexon</span></h1>
          <p className="text-slate-500 text-lg">
            Pilih model berlangganan sesuai dengan volume pasien di klinik atau rumah sakit Anda.
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-12 w-full mb-12"
        >
          <div className="flex flex-wrap justify-center gap-6 w-full">
            {subscriptionPlans.map((plan) => (
              <motion.div 
                key={plan.id}
                whileHover={{ y: -5 }}
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative bg-white border rounded-[2.5rem] p-8 flex flex-col w-full md:w-[320px] cursor-pointer transition-all duration-200 ${
                  selectedPlan === plan.id ? 'border-blue-600 ring-4 ring-[#0C1E35]/20 shadow-2xl' : 
                  plan.popular ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-slate-200 shadow-sm'
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#0C1E35] text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                    Paling Populer
                  </div>
                )}
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 border transition-colors duration-200 ${
                  selectedPlan === plan.id ? 'bg-[#0C1E35] text-white border-blue-600' : 'bg-blue-50 text-blue-600 border-blue-100'
                }`}>
                  {React.cloneElement(plan.icon as any, { className: `w-7 h-7 ${selectedPlan === plan.id ? 'text-white' : 'text-blue-600'}` })}
                </div>
                <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">{plan.name}</h3>
                
                <div className="mb-2">
                  <span className="text-3xl font-black text-slate-900 tracking-tighter">{plan.pricePerDay}</span>
                  <span className="text-slate-500 text-sm font-bold uppercase tracking-wider ml-1">{plan.period}</span>
                </div>
                <p className="text-slate-400 text-[11px] font-bold mb-8 h-8 leading-relaxed">{plan.fullPrice}</p>

                <ul className="space-y-4 mb-10 flex-1">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-start">
                      <CheckCircle2 className="w-5 h-5 text-blue-500 mr-3 shrink-0" />
                      <span className="text-slate-600 text-sm font-medium">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all duration-200 shadow-lg active:scale-95 ${
                  selectedPlan === plan.id 
                  ? 'bg-[#0C1E35] text-white shadow-blue-600/25 ring-4 ring-blue-500/20' 
                  : 'bg-blue-500 text-white hover:bg-[#0C1E35] shadow-slate-900/10'
                }`}>
                  {plan.cta}
                </button>
              </motion.div>
            ))}
          </div>

          <div className="w-full space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-px bg-slate-200 flex-1" />
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Institutional & Enterprise</h2>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {enterprisePlans.map((plan) => (
                <motion.div 
                  key={plan.id}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedPlan(plan.id)}
                  className={`bg-white border rounded-2xl p-6 flex flex-col cursor-pointer transition-all duration-200 ${
                    selectedPlan === plan.id ? 'border-indigo-600 ring-4 ring-indigo-500/10 shadow-xl' : 'border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-6">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors duration-200 ${
                      selectedPlan === plan.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}>
                      {React.cloneElement(plan.icon as any, { className: `w-5 h-5 ${selectedPlan === plan.id ? 'text-white' : 'text-indigo-600'}` })}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-900 tracking-tight">{plan.name}</h4>
                      <p className="text-2xl font-black text-indigo-600 tracking-tighter">{plan.pricePerDay} <span className="text-[10px] uppercase tracking-wider font-bold">{plan.period}</span></p>
                    </div>
                  </div>
                  
                  <p className="text-[11px] text-slate-500 font-medium mb-6 line-clamp-2">{plan.fullPrice}</p>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center text-[11px] text-slate-600 font-medium">
                        <CheckCircle2 className="w-3 h-3 text-indigo-500 mr-2 shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <button className={`w-full py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-200 shadow-md active:scale-95 ${
                    selectedPlan === plan.id 
                    ? 'bg-indigo-600 text-white shadow-indigo-600/25 ring-4 ring-indigo-500/20' 
                    : 'bg-indigo-500 text-white hover:bg-indigo-600 shadow-indigo-500/20'
                  }`}>
                    {plan.cta}
                  </button>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex justify-center"
        >
          <button
            onClick={handleContinue}
            className="flex items-center justify-center py-4 px-12 rounded-full font-semibold text-lg bg-[#0C1E35] text-white hover:bg-[#1a3a5c] shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200"
          >
            Lanjutkan ke Dashboard
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
