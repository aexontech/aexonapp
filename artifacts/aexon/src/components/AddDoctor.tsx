import React, { useState } from 'react';
import { motion } from 'motion/react';
import { UserPlus, ChevronLeft, Mail, Phone, ShieldCheck, Stethoscope, Building2, Save } from 'lucide-react';
import { UserProfile } from '../types';

interface AddDoctorProps {
  editingDoctor: UserProfile | null;
  onBack: () => void;
  onSave: (data: any) => void;
}

export default function AddDoctor({ editingDoctor, onBack, onSave }: AddDoctorProps) {
  const [formData, setFormData] = useState({
    name: editingDoctor?.name || '',
    email: editingDoctor?.email || '',
    phone: editingDoctor?.phone || '',
    specialization: editingDoctor?.specialization || '',
    strNumber: editingDoctor?.strNumber || '',
    sipNumber: editingDoctor?.sipNumber || '',
    role: 'doctor' as const,
    status: editingDoctor?.status || 'active' as const
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    alert(editingDoctor ? 'Data dokter berhasil diperbarui.' : 'Dokter baru berhasil didaftarkan ke sistem.');
  };

  return (
    <div className="flex-1 p-8 max-w-4xl mx-auto w-full font-sans text-slate-900 overflow-y-auto h-full custom-scrollbar">
      <div className="flex items-center gap-4 mb-10">
        <button 
          onClick={onBack}
          className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all shadow-sm"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">{editingDoctor ? 'Edit Profil Dokter' : 'Tambah Dokter Baru'}</h2>
          <p className="text-slate-500 text-sm">{editingDoctor ? 'Perbarui informasi tenaga medis dalam sistem.' : 'Daftarkan tenaga medis baru ke dalam sistem Enterprise.'}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
              <UserPlus className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Informasi Pribadi</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap & Gelar</label>
              <input 
                type="text"
                required
                value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm"
                placeholder="Contoh: Dr. Budi Santoso, Sp.PD"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Spesialisasi</label>
              <input 
                type="text"
                required
                value={formData.specialization}
                onChange={e => setFormData({...formData, specialization: e.target.value})}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm"
                placeholder="Contoh: Gastroenterohepatologi"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Institusi</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm"
                  placeholder="email@rsup.co.id"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor Telepon</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="tel"
                  value={formData.phone}
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="w-full pl-12 pr-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-bold text-sm"
                  placeholder="0812..."
                />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm space-y-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center border border-indigo-100">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Kredensial Medis</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor STR</label>
              <input 
                type="text"
                value={formData.strNumber}
                onChange={e => setFormData({...formData, strNumber: e.target.value})}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-sm"
                placeholder="16 Digit Nomor STR"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nomor SIP</label>
              <input 
                type="text"
                value={formData.sipNumber}
                onChange={e => setFormData({...formData, sipNumber: e.target.value})}
                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-bold text-sm"
                placeholder="SIP/XXXX/XXX/XXXX"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-4">
          <button 
            type="button"
            onClick={onBack}
            className="px-8 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl transition-all"
          >
            Batal
          </button>
          <button 
            type="submit"
            className="flex items-center px-10 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
          >
            <Save className="w-5 h-5 mr-2" />
            Simpan Data Dokter
          </button>
        </div>
      </form>
    </div>
  );
}
