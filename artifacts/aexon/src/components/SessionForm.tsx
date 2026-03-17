import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { User, Activity, ArrowRight, ChevronLeft, Stethoscope, ClipboardList, Building2, Plus, X } from 'lucide-react';
import { PatientData, UserProfile } from '../types';
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
    differentialDiagnosis_icd10: '',
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
      if (field === 'differentialDiagnosis_icd10') {
        updated.differentialDiagnosis = value;
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

  const sectionCardStyle: React.CSSProperties = {
    backgroundColor: 'white',
    border: '1px solid #CBD5E1',
    borderRadius: 16,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  };

  const sectionBodyStyle: React.CSSProperties = {
    padding: 28,
  };

  const sectionHeaderBarStyle: React.CSSProperties = {
    background: 'linear-gradient(135deg, #0C1E35 0%, #1E3A5F 100%)',
    padding: '14px 28px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: '15px 15px 0 0',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 800, color: '#FFFFFF',
    textTransform: 'uppercase', letterSpacing: '0.08em',
    display: 'flex', alignItems: 'center', gap: 8,
    margin: 0,
  };

  const fieldLabelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#475569',
    textTransform: 'uppercase', letterSpacing: '0.06em',
    display: 'block', marginBottom: 6,
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    border: '1px solid #CBD5E1',
    borderRadius: 10,
    padding: '11px 14px',
    fontSize: 14,
    backgroundColor: 'white',
    color: '#0C1E35',
    outline: 'none',
    transition: 'border 150ms, box-shadow 150ms',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#0C1E35';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(12,30,53,0.08)';
  };
  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = '#CBD5E1';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div style={{ flex: 1, backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 32, overflowY: 'auto', height: '100%', position: 'relative' }} className="custom-scrollbar">
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="orb-tr" />
        <div className="orb-bl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        style={{ maxWidth: 900, width: '100%', position: 'relative', zIndex: 10 }}
      >
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: 24, backgroundColor: 'white', borderBottom: '1px solid #E2E8F0',
          padding: '12px 24px', borderRadius: '16px 16px 0 0',
        }}>
          <button
            onClick={onCancel}
            style={{
              display: 'flex', alignItems: 'center', padding: '8px 14px',
              backgroundColor: 'white', border: '1px solid #E2E8F0',
              borderRadius: 10, color: '#0C1E35', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, transition: 'all 150ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            <ChevronLeft style={{ width: 16, height: 16, marginRight: 6 }} />
            Kembali
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: '#0C1E35', textTransform: 'uppercase' }}>Sesi Baru</span>
              <span style={{ fontSize: 11, color: '#64748B' }}>ID: {sessionId}</span>
            </div>
            <div style={{ width: 40, height: 40, backgroundColor: '#EFF6FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity style={{ width: 20, height: 20, color: '#0C1E35' }} />
            </div>
          </div>
        </div>

        <div style={{
          backgroundColor: 'white', borderRadius: '0 0 16px 16px', padding: 40,
          boxShadow: '0 8px 40px rgba(12,30,53,0.08)',
          position: 'relative', overflow: 'visible',
        }}>
          <div style={{
            height: 4, position: 'absolute', top: 0, left: 0, right: 0,
            background: 'linear-gradient(90deg, #0C1E35 0%, #1E3A5F 60%, #0C1E35 100%)',
          }} />

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 40 }}>
            <div style={{ width: 64, height: 64, backgroundColor: '#EFF6FF', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: 24 }}>
              <ClipboardList style={{ width: 28, height: 28, color: '#0C1E35' }} />
            </div>
            <div>
              <h2 className="font-aexon" style={{ fontSize: 36, color: '#0C1E35', marginBottom: 4 }}>Registrasi Sesi</h2>
              <p style={{ fontSize: 14, color: '#64748B' }}>Lengkapi data klinis pasien untuk memulai prosedur endoskopi.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            <div style={sectionCardStyle}>
              <div style={sectionHeaderBarStyle}>
                <h3 style={sectionLabelStyle}>
                  <User style={{ width: 16, height: 16, color: '#FFFFFF' }} />
                  Identitas Pasien
                </h3>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>Wajib Diisi *</span>
              </div>

              <div style={{ ...sectionBodyStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
                <div>
                  <label style={fieldLabelStyle}>Nama Lengkap *</label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    style={inputStyle}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="Contoh: Budi Santoso"
                  />
                </div>

                <div>
                  <label style={fieldLabelStyle}>No. Rekam Medis *</label>
                  <input
                    type="text"
                    name="rmNumber"
                    required
                    value={formData.rmNumber}
                    onChange={handleChange}
                    style={inputStyle}
                    onFocus={handleInputFocus}
                    onBlur={handleInputBlur}
                    placeholder="RM-XXXXXX"
                  />
                </div>

                <div>
                  <label style={fieldLabelStyle}>Tanggal Lahir</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <input
                      type="date"
                      name="dob"
                      value={formData.dob}
                      onChange={handleChange}
                      style={inputStyle}
                      onFocus={handleInputFocus}
                      onBlur={handleInputBlur}
                    />
                    {age !== null && (
                      <span style={{
                        flexShrink: 0, padding: '4px 12px',
                        backgroundColor: '#EFF6FF', color: '#0C1E35',
                        borderRadius: 8, fontWeight: 600, fontSize: 12,
                        whiteSpace: 'nowrap',
                      }}>
                        {age} thn
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <label style={fieldLabelStyle}>Jenis Kelamin</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      name="gender"
                      value={formData.gender}
                      onChange={handleChange}
                      style={{ ...inputStyle, appearance: 'none', paddingRight: 40, cursor: 'pointer' }}
                      onFocus={handleInputFocus as any}
                      onBlur={handleInputBlur as any}
                    >
                      <option value="Laki-laki">Laki-laki</option>
                      <option value="Perempuan">Perempuan</option>
                    </select>
                    <div style={{ position: 'absolute', inset: '0 0 0 auto', paddingRight: 14, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <ArrowRight style={{ width: 16, height: 16, color: '#64748B', transform: 'rotate(90deg)' }} />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={sectionCardStyle}>
              <div style={sectionHeaderBarStyle}>
                <h3 style={sectionLabelStyle}>
                  <Stethoscope style={{ width: 16, height: 16, color: '#FFFFFF' }} />
                  Diagnosis ICD-10
                </h3>
              </div>

              <div style={{ ...sectionBodyStyle, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, overflow: 'visible' }}>
                <div style={{ position: 'relative', overflow: 'visible' }}>
                  <ICD10Autocomplete
                    value={formData.diagnosis_icd10}
                    onChange={(val) => updateField('diagnosis_icd10', val)}
                    label="Diagnosis Utama (ICD-10)"
                    required={formData.category === 'Kamar Operasi'}
                  />
                </div>

                <div style={{ position: 'relative', overflow: 'visible' }}>
                  <ICD10Autocomplete
                    value={formData.differentialDiagnosis_icd10}
                    onChange={(val) => updateField('differentialDiagnosis_icd10', val)}
                    label="Diagnosis Banding (ICD-10)"
                    placeholder="Cari diagnosis banding ICD-10..."
                  />
                </div>
              </div>
            </div>

            <div style={sectionCardStyle}>
              <div style={sectionHeaderBarStyle}>
                <h3 style={sectionLabelStyle}>
                  <Activity style={{ width: 16, height: 16, color: '#FFFFFF' }} />
                  Prosedur & Tindakan (ICD-9-CM)
                </h3>
              </div>
              <div style={{ ...sectionBodyStyle, display: 'flex', flexDirection: 'column', gap: 16 }}>
                <AnimatePresence mode="popLayout">
                  {formData.procedures_icd9.map((proc, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}
                    >
                      <div style={{
                        width: 32, height: 32, flexShrink: 0, borderRadius: 8,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 700, fontSize: 13, marginTop: 4,
                        backgroundColor: '#0C1E35', color: 'white',
                      }}>
                        {index + 1}
                      </div>
                      <div style={{ flex: 1, position: 'relative', overflow: 'visible' }}>
                        <ICD9Autocomplete
                          value={proc}
                          onChange={(val) => updateProcedure(index, val)}
                          index={index}
                        />
                      </div>
                      {index > 0 && (
                        <button
                          type="button"
                          onClick={() => removeProcedure(index)}
                          style={{
                            width: 32, height: 32, flexShrink: 0, borderRadius: 10,
                            backgroundColor: '#FEF2F2', border: 'none',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#EF4444', cursor: 'pointer', marginTop: 4,
                            transition: 'background-color 150ms',
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEE2E2'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                        >
                          <X style={{ width: 16, height: 16 }} />
                        </button>
                      )}
                      {index === 0 && <div style={{ width: 32, flexShrink: 0 }} />}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {formData.procedures_icd9.length < 5 && (
                  <button
                    type="button"
                    onClick={addProcedure}
                    style={{
                      marginLeft: 44, display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 16px', backgroundColor: 'white',
                      border: '1px dashed #94A3B8', borderRadius: 10,
                      color: '#64748B', fontSize: 13, fontWeight: 600,
                      cursor: 'pointer', transition: 'all 150ms',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = '#0C1E35'; e.currentTarget.style.color = '#0C1E35'; e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#94A3B8'; e.currentTarget.style.color = '#64748B'; e.currentTarget.style.backgroundColor = 'white'; }}
                  >
                    <Plus style={{ width: 16, height: 16 }} />
                    Tambah Tindakan
                  </button>
                )}
              </div>
            </div>

            <div style={sectionCardStyle}>
              <div style={sectionHeaderBarStyle}>
                <h3 style={sectionLabelStyle}>
                  <Building2 style={{ width: 16, height: 16, color: '#FFFFFF' }} />
                  Administrasi
                </h3>
              </div>
              <div style={{ ...sectionBodyStyle, display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 24, alignItems: 'end' }}>
                <div>
                  <label style={fieldLabelStyle}>Operator / Dokter</label>
                  <div style={{
                    backgroundColor: '#F8FAFC', border: '1px solid #CBD5E1',
                    borderRadius: 10, padding: '11px 14px', display: 'flex',
                    alignItems: 'center', color: '#0C1E35', fontWeight: 600,
                    fontSize: 14, cursor: 'not-allowed',
                  }}>
                    <div style={{ width: 8, height: 8, backgroundColor: '#10B981', borderRadius: '50%', marginRight: 12, animation: 'dotPulse 2s ease-in-out infinite' }} />
                    {userProfile.name}
                  </div>
                </div>
                <div>
                  <label style={fieldLabelStyle}>Kategori Layanan</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleChange}
                      style={{ ...inputStyle, appearance: 'none', paddingRight: 40, cursor: 'pointer' }}
                      onFocus={handleInputFocus as any}
                      onBlur={handleInputBlur as any}
                    >
                      <option value="Poli">Poli Klinik</option>
                      <option value="Kamar Operasi">Kamar Operasi (OK)</option>
                      <option value="IGD">IGD</option>
                    </select>
                    <div style={{ position: 'absolute', inset: '0 0 0 auto', paddingRight: 14, display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
                      <ArrowRight style={{ width: 16, height: 16, color: '#64748B', transform: 'rotate(90deg)' }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <AnimatePresence>
                    {validationError && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        style={{
                          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
                          color: '#DC2626', fontSize: 12, fontWeight: 600,
                          padding: '8px 12px', borderRadius: 10, textAlign: 'center',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {validationError}
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button
                    type="submit"
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center',
                      justifyContent: 'center', gap: 8, backgroundColor: '#0C1E35',
                      color: 'white', border: 'none', borderRadius: 12,
                      padding: '14px 32px', fontSize: 15, fontWeight: 700,
                      cursor: 'pointer', boxShadow: '0 4px 20px rgba(12,30,53,0.3)',
                      transition: 'background-color 150ms',
                    }}
                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1a3a5c'}
                    onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0C1E35'}
                  >
                    Mulai Sesi
                    <ArrowRight style={{ width: 16, height: 16 }} />
                  </button>
                </div>
              </div>
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
