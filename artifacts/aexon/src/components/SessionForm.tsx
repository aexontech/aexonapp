import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Activity, ArrowRight, ChevronLeft, Stethoscope, ClipboardList, Building2, Plus, X } from 'lucide-react';
import { PatientData, UserProfile } from '../types';
import { Pattern } from './Logo';
import ICD10Autocomplete from './ICD10Autocomplete';
import ICD9Autocomplete from './ICD9Autocomplete';

interface SessionFormProps {
  onSubmit: (data: PatientData) => void;
  onCancel: () => void;
  userProfile: UserProfile;
}

function calculateAge(dob: string): number | null {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export default function SessionForm({ onSubmit, onCancel, userProfile }: SessionFormProps) {
  const sessionId = useMemo(() => Math.random().toString(36).substr(2, 9).toUpperCase(), []);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PatientData>({
    name: '',
    rmNumber: '',
    dob: '',
    gender: 'Laki-laki',
    operator: userProfile.name,
    procedures: [''],
    diagnosis: '',
    differentialDiagnosis: '',
    category: 'Poli',
    diagnosis_icd10: '',
    procedures_icd9: [''],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const updateField = (field: keyof PatientData, value: string) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'diagnosis_icd10') {
        updated.diagnosis = value;
      }
      return updated;
    });
  };

  const updateProcedure = (index: number, value: string) => {
    setFormData(prev => {
      const newProcedures = [...prev.procedures_icd9];
      newProcedures[index] = value;
      return {
        ...prev,
        procedures_icd9: newProcedures,
        procedures: newProcedures,
      };
    });
  };

  const addProcedure = () => {
    if (formData.procedures_icd9.length < 5) {
      setFormData(prev => ({
        ...prev,
        procedures_icd9: [...prev.procedures_icd9, ''],
        procedures: [...prev.procedures, ''],
      }));
    }
  };

  const removeProcedure = (index: number) => {
    if (formData.procedures_icd9.length <= 1) return;
    setFormData(prev => {
      const newProcedures = prev.procedures_icd9.filter((_, i) => i !== index);
      return {
        ...prev,
        procedures_icd9: newProcedures,
        procedures: newProcedures,
      };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.category === 'Kamar Operasi' && !formData.diagnosis_icd10) {
      setValidationError('Diagnosis Utama wajib diisi untuk kategori Kamar Operasi (OK).');
      return;
    }

    setValidationError(null);
    if (formData.name && formData.rmNumber && formData.procedures_icd9[0]) {
      onSubmit(formData);
    }
  };

  const age = calculateAge(formData.dob);

  return (
    <div className="flex-1 bg-slate-50 flex flex-col items-center p-8 font-sans text-slate-900 overflow-y-auto h-full custom-scrollbar relative">
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

        <div className="bg-white border border-slate-200 rounded-[3.5rem] p-12 shadow-2xl shadow-slate-200/50 relative overflow-visible">
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

          <form onSubmit={handleSubmit} className="space-y-10">

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2.5rem] p-10 shadow-2xl shadow-blue-900/20 space-y-8 relative overflow-hidden group"
            >
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
                  <div className="flex items-center gap-4">
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className="block w-full px-6 py-4.5 border border-white/20 rounded-2xl bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-bold text-sm [color-scheme:dark]"
                    />
                    {age !== null && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="shrink-0 px-4 py-2 bg-white/20 rounded-xl text-white font-black text-xs whitespace-nowrap"
                      >
                        {age} thn
                      </motion.span>
                    )}
                  </div>
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
            </motion.div>

            <div className="grid lg:grid-cols-5 gap-8">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="lg:col-span-3 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2.5rem] p-10 shadow-2xl shadow-blue-900/20 space-y-8 relative overflow-visible group"
              >
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors" />
                <h3 className="text-[11px] font-black text-blue-100 uppercase tracking-[0.3em] flex items-center mb-2 relative z-10">
                  <Activity className="w-4 h-4 mr-3" />
                  PROSEDUR & TINDAKAN (ICD-9-CM)
                </h3>
                <div className="space-y-4 relative z-10">
                  <AnimatePresence mode="popLayout">
                    {formData.procedures_icd9.map((proc, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex items-start gap-3"
                      >
                        <div className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center font-black text-sm mt-1 ${
                          index === 0 
                            ? 'bg-white/25 text-white' 
                            : 'bg-white/10 text-blue-200'
                        }`}>
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <ICD9Autocomplete
                            value={proc}
                            onChange={(val) => updateProcedure(index, val)}
                            index={index}
                          />
                        </div>
                        {index > 0 && (
                          <motion.button
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            type="button"
                            onClick={() => removeProcedure(index)}
                            className="w-10 h-10 shrink-0 rounded-xl bg-white/10 hover:bg-red-500/30 border border-white/20 flex items-center justify-center text-blue-200 hover:text-white transition-all mt-1"
                          >
                            <X className="w-4 h-4" />
                          </motion.button>
                        )}
                        {index === 0 && (
                          <div className="w-10 shrink-0" />
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>

                  {formData.procedures_icd9.length < 5 && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      type="button"
                      onClick={addProcedure}
                      className="ml-[52px] flex items-center gap-2 px-5 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-2xl text-blue-100 hover:text-white transition-all text-xs font-black uppercase tracking-widest"
                    >
                      <Plus className="w-4 h-4" />
                      Tambah Tindakan
                    </motion.button>
                  )}
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
                className="lg:col-span-2 bg-white border-l-4 border-blue-600 rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 space-y-8 relative overflow-visible group"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 blur-2xl group-hover:bg-blue-100 transition-colors" />
                <h3 className="text-[11px] font-black text-blue-700 uppercase tracking-[0.3em] flex items-center relative z-10">
                  <Stethoscope className="w-4 h-4 mr-3 text-blue-600" />
                  DIAGNOSIS (ICD-10)
                </h3>

                <div className="space-y-6 relative z-10">
                  <ICD10Autocomplete
                    value={formData.diagnosis_icd10}
                    onChange={(val) => updateField('diagnosis_icd10', val)}
                    label="Diagnosis Utama (ICD-10)"
                    required={formData.category === 'Kamar Operasi'}
                  />

                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1 block mb-2">Diagnosis Banding</label>
                    <input
                      type="text"
                      name="differentialDiagnosis"
                      value={formData.differentialDiagnosis}
                      onChange={handleChange}
                      className="block w-full px-5 py-4 min-h-[48px] border border-slate-200 rounded-2xl bg-white text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-semibold text-sm"
                      placeholder="Diagnosis banding (opsional)..."
                    />
                  </div>
                </div>
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 }}
              className="bg-gradient-to-br from-blue-600 to-indigo-800 rounded-[2.5rem] p-10 shadow-2xl shadow-blue-900/20 relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors" />
              <h3 className="text-[11px] font-black text-blue-100 uppercase tracking-[0.3em] flex items-center mb-8 relative z-10">
                <Building2 className="w-4 h-4 mr-3" />
                ADMINISTRASI
              </h3>
              <div className="grid md:grid-cols-3 gap-8 relative z-10">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] ml-1">Operator / Dokter</label>
                  <div className="px-5 py-4.5 bg-white/10 border border-white/20 rounded-2xl text-white font-black text-sm flex items-center shadow-sm">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3 animate-pulse" />
                    {userProfile.name}
                  </div>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-blue-200 uppercase tracking-[0.15em] ml-1">Kategori Layanan</label>
                  <div className="relative">
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="block w-full px-5 py-4.5 border border-white/20 rounded-2xl bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/50 transition-all font-bold text-sm appearance-none"
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
                <div className="flex flex-col items-end gap-3">
                  <AnimatePresence>
                    {validationError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="w-full bg-red-50 border border-red-200 text-red-600 text-xs font-bold p-4 rounded-2xl text-center"
                      >
                        {validationError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.button
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full flex items-center justify-center py-5 px-8 rounded-2xl font-black text-blue-700 bg-white hover:bg-blue-50 shadow-lg shadow-blue-900/10 transition-all group/btn relative overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center gap-3 tracking-[0.2em] uppercase text-xs">
                      MULAI SESI
                      <ArrowRight className="w-5 h-5 group-hover/btn:translate-x-1 transition-transform" />
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>

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
