import React, { useState, useRef, useCallback } from 'react';
import { motion } from 'motion/react';
import { Shield, FileText, Lock, Eye, Server, AlertTriangle, ArrowRight, ScrollText } from 'lucide-react';

interface EulaModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

const sections = [
  {
    title: '1. Penggunaan Aplikasi',
    icon: <Shield className="w-5 h-5" />,
    content: 'App ini hanya untuk tenaga medis berlisensi. Penggunaan di luar keperluan medis dilarang.',
  },
  {
    title: '2. Data Pasien',
    icon: <Lock className="w-5 h-5" />,
    content: 'Seluruh data pasien tersimpan secara lokal di perangkat ini dan terenkripsi per akun. Pengguna bertanggung jawab penuh atas keamanan data.',
  },
  {
    title: '3. Privasi',
    icon: <Eye className="w-5 h-5" />,
    content: 'Aexon tidak mengumpulkan atau mengirimkan data pasien ke server manapun tanpa persetujuan eksplisit pengguna.',
  },
  {
    title: '4. Lisensi',
    icon: <FileText className="w-5 h-5" />,
    content: 'Lisensi bersifat personal dan tidak dapat dipindahtangankan. Satu lisensi untuk satu dokter.',
  },
  {
    title: '5. Batasan Tanggung Jawab',
    icon: <AlertTriangle className="w-5 h-5" />,
    content: 'Aexon tidak bertanggung jawab atas keputusan medis yang diambil berdasarkan dokumentasi yang dibuat melalui aplikasi ini.',
  },
];

export default function EulaModal({ onAccept, onDecline }: EulaModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [declined, setDeclined] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 20) {
        setHasScrolledToBottom(true);
      }
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('aexon_eula_accepted', JSON.stringify({
      accepted: true,
      timestamp: new Date().toISOString(),
    }));
    onAccept();
  };

  const handleDecline = () => {
    setDeclined(true);
    try {
      window.close();
    } catch {
      // window.close may not work
    }
  };

  if (declined) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-8 font-sans">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Tutup Aplikasi</h2>
          <p className="text-slate-500 text-sm font-medium leading-relaxed">
            Anda perlu menyetujui EULA untuk menggunakan Aexon. Tutup tab browser ini untuk keluar dari aplikasi.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900">
      <div className="bg-[#0C1E35] px-8 py-10">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/10">
              <ScrollText className="w-6 h-6 text-[#0D9488]" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">Perjanjian Lisensi Pengguna Akhir (EULA)</h1>
              <p className="text-slate-400 text-sm font-medium mt-1">Aexon Endoscopy App — Baca sebelum menggunakan</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-8 space-y-8"
          style={{ maxHeight: 'calc(100vh - 280px)' }}
        >
          {sections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-slate-50 rounded-2xl p-6 border border-slate-100"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-[#0D9488]/10 rounded-xl flex items-center justify-center text-[#0D9488]">
                  {section.icon}
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">{section.title}</h3>
              </div>
              <p className="text-slate-600 text-sm font-medium leading-relaxed ml-11">{section.content}</p>
            </motion.div>
          ))}

          <div className="bg-[#0D9488]/5 rounded-2xl p-6 border border-[#0D9488]/20">
            <p className="text-sm text-slate-600 font-medium leading-relaxed">
              Dengan mengklik "Setuju & Lanjutkan", Anda menyatakan telah membaca, memahami, dan menyetujui seluruh ketentuan di atas.
            </p>
          </div>
        </div>

        {!hasScrolledToBottom && (
          <div className="text-center py-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Scroll ke bawah untuk melanjutkan</p>
          </div>
        )}

        <div className="p-8 border-t border-slate-200 bg-white flex items-center gap-4">
          <button
            onClick={handleDecline}
            className="flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all border-2 border-slate-200 text-slate-500 hover:bg-slate-50"
          >
            Tidak Setuju
          </button>
          <button
            onClick={handleAccept}
            disabled={!hasScrolledToBottom}
            className={`flex-1 py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
              hasScrolledToBottom
                ? 'bg-[#0D9488] text-white hover:bg-[#0D9488]/90 shadow-lg shadow-[#0D9488]/20'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            Setuju & Lanjutkan
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
