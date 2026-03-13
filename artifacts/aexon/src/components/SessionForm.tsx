import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import { User, FileText, Calendar, Activity, ArrowRight, ChevronLeft, Stethoscope, ClipboardList, Building2 } from 'lucide-react';
import { PatientData, UserProfile } from '../types';
import { Pattern } from './Logo';

interface SessionFormProps {
  onSubmit: (data: PatientData) => void;
  onCancel: () => void;
  userProfile: UserProfile;
}

export default function SessionForm({ onSubmit, onCancel, userProfile }: SessionFormProps) {
  const sessionId = useMemo(() => Math.random().toString(36).substr(2, 9).toUpperCase(), []);
  const [formData, setFormData] = useState<PatientData>({
    name: '',
    rmNumber: '',
    dob: '',
    gender: 'Laki-laki',
    operator: userProfile.name,
    procedures: ['', '', ''],
    diagnosis: '',
    differentialDiagnosis: '',
    category: 'Poli'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleProcedureChange = (index: number, value: string) => {
    const newProcedures = [...formData.procedures];
    newProcedures[index] = value;
    setFormData(prev => ({ ...prev, procedures: newProcedures }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Diagnosis Utama is mandatory if category is 'Kamar Operasi'
    if (formData.category === 'Kamar Operasi' && !formData.diagnosis) {
      alert('Diagnosis Utama wajib diisi untuk kategori Kamar Operasi (OK).');
      return;
    }

    if (formData.name && formData.rmNumber && formData.procedures[0]) {
      onSubmit(formData);
    }
  };

  return (
    <div className="flex-1 bg-slate-50 flex flex-col items-center p-8 font-sans text-slate-900 overflow-y-auto h-full custom-scrollbar relative">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Pattern className="text-blue-500 opacity-[0.03]" />
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/5 rounded-full blur-[120px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-5xl w-full relative z-10"
      >
        <div className="flex items-center justify-between mb-10">
          <motion.button 
            whileHover={{ x: -4 }}
            onClick={onCancel}
            className="flex items-center px-6 py-3 bg-white hover:bg-slate-50 text-slate-400 hover:text-slate-900 rounded-2xl transition-all border border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-[0.2em]"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            KEMBALI KE DASHBOARD
          </motion.button>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Sesi Baru</span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">ID: {sessionId}</span>
            </div>
            <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-[3.5rem] p-12 shadow-2xl shadow-slate-200/50 relative overflow-hidden">
          {/* Top accent bar */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-indigo-500 to-violet-400" />

          <div className="flex items-center mb-16">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center mr-8 shadow-2xl shadow-blue-500/20 rotate-3 group-hover:rotate-0 transition-transform">
              <ClipboardList className="w-10 h-10 text-white" />
            </div>
            <div>
              <h2 className="text-5xl font-black text-slate-900 tracking-tighter leading-none mb-3">Registrasi Sesi</h2>
              <p className="text-slate-500 text-base font-medium">Lengkapi data klinis pasien untuk memulai prosedur endoskopi.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-12">
            {/* Patient Info Section */}
            <div className="grid lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-10">
                <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2.5rem] p-10 shadow-2xl shadow-blue-900/20 space-y-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors" />
                  <div className="flex items-center justify-between mb-2 relative z-10">
                    <h3 className="text-[11px] font-black text-blue-100 uppercase tracking-[0.3em] flex items-center">
                      <User className="w-4 h-4 mr-3" />
                      IDENTITAS PASIEN
                    </h3>
                    <span className="text-[9px] font-bold text-blue-200 uppercase tracking-widest">Wajib Diisi *</span>
                  </div>
                  
                  <div className="grid md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] ml-1">Nama Lengkap *</label>
                      <div className="relative group">
                        <input
                          type="text"
                          name="name"
                          required
                          value={formData.name}
                          onChange={handleChange}
                          className="block w-full px-6 py-4.5 border border-white/20 rounded-2xl bg-white/10 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-bold text-sm"
                          placeholder="Contoh: Budi Santoso"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] ml-1">No. Rekam Medis *</label>
                      <input
                        type="text"
                        name="rmNumber"
                        required
                        value={formData.rmNumber}
                        onChange={handleChange}
                        className="block w-full px-6 py-4.5 border border-white/20 rounded-2xl bg-white/10 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-bold text-sm"
                        placeholder="RM-XXXXXX"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] ml-1">Tanggal Lahir</label>
                      <input
                        type="date"
                        name="dob"
                        value={formData.dob}
                        onChange={handleChange}
                        className="block w-full px-6 py-4.5 border border-white/20 rounded-2xl bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-bold text-sm [color-scheme:dark]"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] ml-1">Jenis Kelamin</label>
                      <div className="relative">
                        <select
                          name="gender"
                          value={formData.gender}
                          onChange={handleChange}
                          className="block w-full px-6 py-4.5 border border-white/20 rounded-2xl bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-bold text-sm appearance-none"
                        >
                          <option value="Laki-laki" className="text-slate-900">Laki-laki</option>
                          <option value="Perempuan" className="text-slate-900">Perempuan</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none">
                          <ArrowRight className="w-4 h-4 text-blue-200 rotate-90" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2.5rem] p-10 shadow-2xl shadow-blue-900/20 space-y-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors" />
                  <h3 className="text-[11px] font-black text-blue-100 uppercase tracking-[0.3em] flex items-center relative z-10">
                    <Stethoscope className="w-4 h-4 mr-3" />
                    DIAGNOSIS (ICD-10)
                  </h3>
                  <div className="grid md:grid-cols-2 gap-8 relative z-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] ml-1">
                        Diagnosis Utama {formData.category === 'Kamar Operasi' && '*'}
                      </label>
                      <input
                        type="text"
                        name="diagnosis"
                        list="icd10-list"
                        value={formData.diagnosis}
                        onChange={handleChange}
                        className="block w-full px-5 py-4 border border-white/20 rounded-2xl bg-white/10 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-bold text-sm"
                        placeholder="Diagnosis Utama"
                      />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] ml-1">Diagnosis Banding</label>
                      <input
                        type="text"
                        name="differentialDiagnosis"
                        list="icd10-list"
                        value={formData.differentialDiagnosis}
                        onChange={handleChange}
                        className="block w-full px-5 py-4 border border-white/20 rounded-2xl bg-white/10 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-bold text-sm"
                        placeholder="Diagnosis Banding"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2.5rem] p-10 shadow-2xl shadow-blue-900/20 space-y-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors" />
                  <h3 className="text-[11px] font-black text-blue-100 uppercase tracking-[0.3em] flex items-center mb-2 relative z-10">
                    <Activity className="w-4 h-4 mr-3" />
                    PROSEDUR & TINDAKAN (ICD-9)
                  </h3>
                  <div className="space-y-5 relative z-10">
                    {[0, 1, 2].map((index) => (
                      <div key={index} className="relative group">
                        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                          <span className="text-[10px] font-black text-blue-300">{index + 1}</span>
                        </div>
                        <input
                          type="text"
                          list="icd9-list"
                          required={index === 0}
                          value={formData.procedures[index]}
                          onChange={(e) => handleProcedureChange(index, e.target.value)}
                          className="block w-full pl-12 pr-6 py-4.5 border border-white/20 rounded-2xl bg-white/10 text-white placeholder-blue-300 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-bold text-sm"
                          placeholder={index === 0 ? "Tindakan Utama (Wajib)" : "Tindakan Tambahan (Opsional)"}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-10">

                <div className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2.5rem] p-10 shadow-2xl shadow-blue-900/20 space-y-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors" />
                  <h3 className="text-[11px] font-black text-blue-100 uppercase tracking-[0.3em] flex items-center relative z-10">
                    <Building2 className="w-4 h-4 mr-3" />
                    ADMINISTRASI
                  </h3>
                  <div className="space-y-6 relative z-10">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] ml-1">Kategori Layanan</label>
                      <div className="relative">
                        <select
                          name="category"
                          value={formData.category}
                          onChange={handleChange}
                          className="block w-full px-5 py-4 border border-white/20 rounded-2xl bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-bold text-sm appearance-none"
                        >
                          <option value="Poli" className="text-slate-900">Poli Klinik</option>
                          <option value="Kamar Operasi" className="text-slate-900">Kamar Operasi (OK)</option>
                          <option value="IGD" className="text-slate-900">IGD</option>
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-6 flex items-center pointer-events-none">
                          <ArrowRight className="w-4 h-4 text-blue-200 rotate-90" />
                        </div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] ml-1">Operator / Dokter</label>
                      <div className="px-5 py-4 bg-white/10 border border-white/20 rounded-2xl text-white font-black text-sm flex items-center shadow-sm">
                        <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 animate-pulse" />
                        Dr. {userProfile.name.split(' ').pop()}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-12 flex justify-end">
              <motion.button
                whileHover={{ scale: 1.02, y: -4 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                className="flex items-center justify-center py-6 px-16 rounded-[2.5rem] font-black text-white bg-blue-600 hover:bg-blue-700 shadow-[0_20px_50px_rgba(37,99,235,0.2)] transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <span className="relative z-10 flex items-center gap-4 tracking-[0.3em] uppercase text-xs">
                  MULAI SESI PROSEDUR
                  <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </span>
              </motion.button>
            </div>
          </form>
        </div>

        <datalist id="icd9-list">
          <option value="45.13 - Esophagogastroduodenoscopy [EGD]" />
          <option value="45.23 - Colonoscopy" />
          <option value="33.22 - Bronchoscopy" />
          <option value="54.21 - Laparoscopy" />
          <option value="80.20 - Arthroscopy" />
          <option value="57.32 - Cystoscopy" />
        </datalist>
        <datalist id="icd10-list">
          <option value="K29.7 - Gastritis, unspecified" />
          <option value="K21.9 - Gastro-esophageal reflux disease" />
          <option value="K25.9 - Gastric ulcer, unspecified" />
          <option value="K52.9 - Noninfective gastroenteritis and colitis" />
          <option value="C16.9 - Malignant neoplasm of stomach" />
          <option value="K92.2 - Gastrointestinal hemorrhage, unspecified" />
        </datalist>
      </motion.div>
    </div>
  );
}
