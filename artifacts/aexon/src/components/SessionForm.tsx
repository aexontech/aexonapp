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
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-[#0C1E35]/5 rounded-full blur-[120px]" />
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
            className="flex items-center px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Kembali
          </motion.button>
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-end">
              <span className="text-xs font-medium text-slate-500">Sesi Baru</span>
              <span className="text-xs font-medium text-slate-400">ID: {sessionId}</span>
            </div>
            <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center">
              <Activity className="w-5 h-5 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-8 shadow-sm relative overflow-visible">
          <div className="flex items-center mb-10">
            <div className="w-14 h-14 bg-[#0C1E35] rounded-2xl flex items-center justify-center mr-6">
              <ClipboardList className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 tracking-tight mb-1">Registrasi Sesi</h2>
              <p className="text-sm text-slate-500">Lengkapi data klinis pasien untuk memulai prosedur endoskopi.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-10">

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-6"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Identitas Pasien
                </h3>
                <span className="text-xs font-medium text-slate-400">Wajib Diisi *</span>
              </div>
              
              <div className="grid md:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Nama Lengkap *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-colors duration-150"
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">No. Rekam Medis *</label>
                  <input
                    type="text"
                    name="rmNumber"
                    required
                    value={formData.rmNumber}
                    onChange={handleChange}
                    className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-colors duration-150"
                    placeholder="RM-XXXXXX"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Tanggal Lahir</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-colors duration-150"
                    />
                    {age !== null && (
                      <motion.span
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="shrink-0 px-3 py-1.5 bg-[#0C1E35] rounded-lg text-white font-semibold text-xs whitespace-nowrap"
                      >
                        {age} thn
                      </motion.span>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Jenis Kelamin</label>
                  <div className="relative">
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-colors duration-150 appearance-none"
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <ArrowRight className="w-4 h-4 text-slate-400 rotate-90" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-5 gap-6">
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
                className="lg:col-span-3 bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-6"
              >
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center mb-2">
                  <Activity className="w-4 h-4 mr-2" />
                  Prosedur & Tindakan (ICD-9-CM)
                </h3>
                <div className="space-y-4">
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
                        <div className={`w-9 h-9 shrink-0 rounded-lg flex items-center justify-center font-semibold text-sm mt-1 ${
                          index === 0 
                            ? 'bg-[#0C1E35] text-white' 
                            : 'bg-slate-200 text-slate-600'
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
                            className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all mt-1"
                          >
                            <X className="w-4 h-4" />
                          </motion.button>
                        )}
                        {index === 0 && (
                          <div className="w-9 shrink-0" />
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
                      className="ml-12 flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors"
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
                className="lg:col-span-2 bg-slate-50 rounded-2xl p-6 border border-slate-100 space-y-6"
              >
                <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center">
                  <Stethoscope className="w-4 h-4 mr-2" />
                  Diagnosis (ICD-10)
                </h3>

                <div className="space-y-5">
                  <ICD10Autocomplete
                    value={formData.diagnosis_icd10}
                    onChange={(val) => updateField('diagnosis_icd10', val)}
                    label="Diagnosis Utama (ICD-10)"
                    required={formData.category === 'Kamar Operasi'}
                  />

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-slate-500 block">Diagnosis Banding</label>
                    <input
                      type="text"
                      name="differentialDiagnosis"
                      value={formData.differentialDiagnosis}
                      onChange={handleChange}
                      className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-colors duration-150"
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
              className="bg-slate-50 rounded-2xl p-6 border border-slate-100"
            >
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider flex items-center mb-6">
                <Building2 className="w-4 h-4 mr-2" />
                Administrasi
              </h3>
              <div className="grid md:grid-cols-3 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Operator / Dokter</label>
                  <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm flex items-center cursor-not-allowed">
                    <div className="w-2 h-2 bg-emerald-400 rounded-full mr-3 animate-pulse" />
                    {userProfile.name}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-slate-500">Kategori Layanan</label>
                  <div className="relative">
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-colors duration-150 appearance-none"
                    >
                      <option value="Poli">Poli Klinik</option>
                      <option value="Kamar Operasi">Kamar Operasi (OK)</option>
                      <option value="IGD">IGD</option>
                    </select>
                    <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                      <ArrowRight className="w-4 h-4 text-slate-400 rotate-90" />
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
                        className="w-full bg-red-50 border border-red-200 text-red-600 text-xs font-semibold p-3 rounded-xl text-center"
                      >
                        {validationError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    className="w-full flex items-center justify-center py-2.5 px-4 rounded-xl font-semibold text-sm text-white bg-[#0C1E35] hover:bg-[#1a3a5c] transition-colors"
                  >
                    Mulai Sesi
                    <ArrowRight className="w-4 h-4 ml-2" />
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
