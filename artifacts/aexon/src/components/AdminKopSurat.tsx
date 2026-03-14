import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Save, Loader2, ImagePlus, MapPin, Phone, Globe, Mail } from 'lucide-react';
import { HospitalSettings } from '../types';
import { useToast } from './ToastProvider';

interface AdminKopSuratProps {
  hospitalSettingsList: HospitalSettings[];
  onUpdateHospitalList: (list: HospitalSettings[]) => void;
  enterprise_id?: string | null;
}

export default function AdminKopSurat({ hospitalSettingsList, onUpdateHospitalList, enterprise_id }: AdminKopSuratProps) {
  const { showToast } = useToast();
  const existingKop = hospitalSettingsList[0] || null;
  const [kopForm, setKopForm] = useState({
    name: existingKop?.name || '',
    logoUrl: existingKop?.logoUrl || '',
    address: existingKop?.address || '',
    phone: existingKop?.phone || '',
    fax: existingKop?.fax || '',
    email: existingKop?.email || '',
    website: existingKop?.website || '',
  });
  const [kopSaving, setKopSaving] = useState(false);

  const handleSaveKop = () => {
    if (!kopForm.name.trim()) {
      showToast('Nama RS / Institusi wajib diisi.', 'error');
      return;
    }
    setKopSaving(true);
    const kopData: HospitalSettings = {
      id: existingKop?.id || `kop-inst-${Date.now()}`,
      name: kopForm.name.trim(),
      logoUrl: kopForm.logoUrl.trim() || undefined,
      address: kopForm.address.trim(),
      phone: kopForm.phone.trim(),
      fax: kopForm.fax.trim() || undefined,
      email: kopForm.email.trim(),
      website: kopForm.website.trim() || undefined,
      enterpriseId: enterprise_id || undefined,
    };
    onUpdateHospitalList([kopData]);
    setTimeout(() => {
      setKopSaving(false);
      showToast('Kop surat institusi berhasil disimpan.', 'success');
    }, 400);
  };

  const handleKopChange = (field: string, value: string) => {
    setKopForm(prev => ({ ...prev, [field]: value }));
  };

  const inputClass = "w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-colors duration-150";

  return (
    <div className="flex-1 p-8 max-w-4xl mx-auto w-full font-sans text-slate-900 overflow-y-auto h-full custom-scrollbar">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Kop Surat Institusi</h2>
        <p className="text-sm text-slate-500">Kelola kop surat yang digunakan oleh seluruh dokter di institusi Anda.</p>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Informasi Kop Surat
          </h3>
        </div>
        <div className="p-6">
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">Nama RS / Institusi *</label>
              <input
                type="text"
                value={kopForm.name}
                onChange={(e) => handleKopChange('name', e.target.value)}
                placeholder="Nama rumah sakit atau klinik"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <ImagePlus className="w-3 h-3" /> Logo URL
              </label>
              <input
                type="url"
                value={kopForm.logoUrl}
                onChange={(e) => handleKopChange('logoUrl', e.target.value)}
                placeholder="https://example.com/logo.png"
                className={inputClass}
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Alamat Lengkap
              </label>
              <input
                type="text"
                value={kopForm.address}
                onChange={(e) => handleKopChange('address', e.target.value)}
                placeholder="Jl. Kesehatan No. 1, Jakarta"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Phone className="w-3 h-3" /> No. Telepon
              </label>
              <input
                type="tel"
                value={kopForm.phone}
                onChange={(e) => handleKopChange('phone', e.target.value)}
                placeholder="(021) 1234567"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500">No. Fax</label>
              <input
                type="tel"
                value={kopForm.fax}
                onChange={(e) => handleKopChange('fax', e.target.value)}
                placeholder="(021) 1234568"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Mail className="w-3 h-3" /> Email RS
              </label>
              <input
                type="email"
                value={kopForm.email}
                onChange={(e) => handleKopChange('email', e.target.value)}
                placeholder="info@rumahsakit.co.id"
                className={inputClass}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Globe className="w-3 h-3" /> Website
              </label>
              <input
                type="url"
                value={kopForm.website}
                onChange={(e) => handleKopChange('website', e.target.value)}
                placeholder="www.rumahsakit.co.id"
                className={inputClass}
              />
            </div>
          </div>

          {kopForm.logoUrl && (
            <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-2">Preview Logo</p>
              <img src={kopForm.logoUrl} alt="Logo Preview" className="h-16 w-auto object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          )}

          <div className="mt-6 flex justify-end">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSaveKop}
              disabled={kopSaving}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white font-semibold text-sm rounded-xl transition-colors disabled:opacity-50"
            >
              {kopSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {kopSaving ? 'Menyimpan...' : 'Simpan Kop Surat'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
