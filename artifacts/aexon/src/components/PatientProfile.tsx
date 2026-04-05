import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Camera,
  Video,
  FileText,
  Edit3,
  Download,
  Calendar,
  Hash,
  Stethoscope,
  Activity,
  Image as ImageIcon,
  CheckCircle2,
  X,
  Maximize,
  Trash2,
  FolderOpen,
  Loader2,
  Save,
  Plus,
  Minus,
} from 'lucide-react';
import { Session, Capture, PatientData } from '../types';
import ImageEditor from './ImageEditor';
import SessionFlowNav from './SessionFlowNav';
import DiskSpaceIndicator from './DiskSpaceIndicator';
import ConfirmModal from './ConfirmModal';
import ICD10Autocomplete from './ICD10Autocomplete';
import ICD9Autocomplete from './ICD9Autocomplete';
import {
  isElectron,
  exportCapturesFromDisk,
  deleteCaptureFromDisk,
  updateSessionMeta,
} from '../lib/electronStorage';

type TabId = 'media' | 'reports';

interface PatientProfileProps {
  session: Session;
  onBack: () => void;
  onEditReport: (session: Session, pageConfig?: any[]) => void;
  onViewGallery: (session: Session) => void;
  onUpdateSession?: (session: Session) => void;
}

export default function PatientProfile({
  session,
  onBack,
  onEditReport,
  onViewGallery,
  onUpdateSession,
}: PatientProfileProps) {
  const [activeTab, setActiveTab] = useState<TabId>('media');
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photos' | 'videos'>('all');
  const [selectedMediaIds, setSelectedMediaIds] = useState<string[]>([]);
  const [previewCapture, setPreviewCapture] = useState<Capture | null>(null);
  const [editingCapture, setEditingCapture] = useState<Capture | null>(null);
  const [videoThumbnails, setVideoThumbnails] = useState<Record<string, string>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteReportModal, setShowDeleteReportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [fileSizes, setFileSizes] = useState<Record<string, number>>({});
  const [previewReportUrl, setPreviewReportUrl] = useState<string | null>(null);

  // Edit Patient Data state
  const [showEditPatientModal, setShowEditPatientModal] = useState(false);
  const [patientForm, setPatientForm] = useState({
    name: '',
    rmNumber: '',
    diagnosis: '',
    diagnosis_icd10: '',
    differentialDiagnosis: '',
    differentialDiagnosis_icd10: '',
    procedures_icd9: [''] as string[],
  });

  const openPatientEditor = () => {
    setPatientForm({
      name: session.patient.name || '',
      rmNumber: session.patient.rmNumber || '',
      diagnosis: session.patient.diagnosis || '',
      diagnosis_icd10: session.patient.diagnosis_icd10 || '',
      differentialDiagnosis: session.patient.differentialDiagnosis || '',
      differentialDiagnosis_icd10: session.patient.differentialDiagnosis_icd10 || '',
      procedures_icd9: session.patient.procedures_icd9?.length ? [...session.patient.procedures_icd9] : [''],
    });
    setShowEditPatientModal(true);
  };

  const savePatientData = () => {
    const updatedPatient: PatientData = {
      ...session.patient,
      name: patientForm.name,
      rmNumber: patientForm.rmNumber,
      diagnosis: patientForm.diagnosis,
      diagnosis_icd10: patientForm.diagnosis_icd10,
      differentialDiagnosis: patientForm.differentialDiagnosis,
      differentialDiagnosis_icd10: patientForm.differentialDiagnosis_icd10,
      procedures_icd9: patientForm.procedures_icd9.filter(p => p.trim()),
    };
    onUpdateSession?.({ ...session, patient: updatedPatient });
    setShowEditPatientModal(false);
  };

  // Estimate file sizes — coba semua sumber URL
  useEffect(() => {
    session.captures.forEach(capture => {
      // Coba semua kemungkinan sumber data
      const sources = [capture.dataUrl, capture.url].filter(Boolean) as string[];
      for (const src of sources) {
        if (src.startsWith('data:')) {
          const base64Part = src.split(',')[1];
          if (base64Part) {
            setFileSizes(prev => ({ ...prev, [capture.id]: Math.round(base64Part.length * 0.75) }));
            return;
          }
        }
      }
      // Fallback: blob URL
      for (const src of sources) {
        if (src.startsWith('blob:')) {
          fetch(src).then(r => r.blob()).then(blob => {
            if (blob.size > 0) {
              setFileSizes(prev => ({ ...prev, [capture.id]: blob.size }));
            }
          }).catch(() => {});
          return;
        }
      }
      // Fallback: URL biasa — ambil via HEAD request
      const src = sources[0];
      if (src) {
        fetch(src, { method: 'HEAD' }).then(r => {
          const cl = r.headers.get('content-length');
          if (cl) setFileSizes(prev => ({ ...prev, [capture.id]: parseInt(cl, 10) }));
        }).catch(() => {});
      }
    });
  }, [session.captures]);

  // Generate thumbnail dari frame pertama video
  useEffect(() => {
    const videos = session.captures.filter(c => c.type === 'video' && !c.thumbnail);
    if (videos.length === 0) return;

    videos.forEach(capture => {
      const src = capture.url || capture.dataUrl;
      if (!src) return;

      const vid = document.createElement('video');
      vid.muted = true;
      vid.playsInline = true;
      vid.preload = 'auto';
      vid.crossOrigin = 'anonymous';

      vid.addEventListener('loadeddata', () => {
        // Ambil frame pertama (time = 0)
        vid.currentTime = 0;
      }, { once: true });

      vid.addEventListener('seeked', () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = Math.round(320 * (vid.videoHeight / (vid.videoWidth || 1))) || 200;
          const ctx = canvas.getContext('2d');
          if (ctx && vid.videoWidth > 0) {
            ctx.drawImage(vid, 0, 0, canvas.width, canvas.height);
            const thumb = canvas.toDataURL('image/jpeg', 0.7);
            setVideoThumbnails(prev => ({ ...prev, [capture.id]: thumb }));
          }
        } catch {}
      }, { once: true });

      vid.src = src;
      vid.load();
    });
  }, [session.captures]);

  const handleAnnotationSave = (editedUrl: string, shapes: any[]) => {
    const updated: Session = {
      ...session,
      captures: session.captures.map(c =>
        c.id === editingCapture?.id
          ? { ...c, url: editedUrl, dataUrl: editedUrl, originalUrl: c.originalUrl || c.url || c.dataUrl, shapes }
          : c
      ),
    };
    onUpdateSession?.(updated);
    setEditingCapture(null);
  };

  const patient = session.patient;
  const photoCount = session.captures.filter(c => c.type === 'image' || !c.type).length;
  const videoCount = session.captures.filter(c => c.type === 'video').length;

  // Kode unik confidential untuk nama file laporan (tanpa data pasien)
  const reportFileCode = (() => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    // Deterministic hash dari session ID supaya konsisten
    let hash = 0;
    const seed = session.id + session.date.toISOString();
    for (let i = 0; i < seed.length; i++) {
      hash = ((hash << 5) - hash) + seed.charCodeAt(i);
      hash |= 0;
    }
    let code = '';
    let h = Math.abs(hash);
    for (let i = 0; i < 6; i++) {
      code += chars[h % chars.length];
      h = Math.floor(h / chars.length) || (h + 7);
    }
    return code;
  })();

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Poli': return { bg: '#EFF6FF', color: '#1D4ED8' };
      case 'Kamar Operasi': return { bg: '#FFF7ED', color: '#C2410C' };
      case 'IGD': return { bg: '#FEF2F2', color: '#DC2626' };
      default: return { bg: '#F1F5F9', color: '#64748B' };
    }
  };

  const catStyle = getCategoryColor(patient.category);

  const filteredCaptures = mediaFilter === 'all'
    ? session.captures
    : mediaFilter === 'photos'
      ? session.captures.filter(c => c.type === 'image' || !c.type)
      : session.captures.filter(c => c.type === 'video');

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '';
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.round(bytes / 1024)} KB`;
  };

  const toggleMediaSelect = (id: string) => {
    setSelectedMediaIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const selectAllVisible = () => {
    const allIds = filteredCaptures.map(c => c.id);
    setSelectedMediaIds(prev => {
      const newSet = new Set([...prev, ...allIds]);
      return Array.from(newSet);
    });
  };

  const clearSelection = () => setSelectedMediaIds([]);

  const handleSaveSelected = async () => {
    const selected = session.captures.filter(c => selectedMediaIds.includes(c.id));
    if (selected.length === 0) return;

    // Electron: export via folder picker → decrypt → save .jpg/.mp4
    if (isElectron()) {
      setIsExporting(true);
      try {
        const captureInfos = selected.map(c => ({ id: c.id, type: c.type }));
        const result = await exportCapturesFromDisk(session.id, captureInfos);
        if (result.success && result.exported) {
          setSelectedMediaIds([]);
        }
      } catch (err) {
        console.error('[PatientProfile] Export failed:', err);
      } finally {
        setIsExporting(false);
      }
      return;
    }

    // Browser/Replit: download via anchor tag
    selected.forEach((capture, index) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = capture.url || capture.dataUrl || '';
        const ext = capture.type === 'video' ? 'mp4' : 'png';
        a.download = `media_${index + 1}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 300);
    });
  };

  const handleDeleteSelected = async () => {
    if (selectedMediaIds.length === 0) return;
    setIsDeleting(true);

    try {
      // Electron: hapus .enc dari disk
      if (isElectron()) {
        for (const captureId of selectedMediaIds) {
          await deleteCaptureFromDisk(session.id, captureId);
        }
      }

      // Update session: remove deleted captures
      const updatedCaptures = session.captures.filter(c => !selectedMediaIds.includes(c.id));
      const updatedSession: Session = { ...session, captures: updatedCaptures };

      // Electron: update metadata di disk
      if (isElectron()) {
        await updateSessionMeta(
          session.id,
          session.patient,
          updatedCaptures,
          session.status,
          session.clinicalNotes,
        );
      }

      // Update state di parent
      onUpdateSession?.(updatedSession);
      setSelectedMediaIds([]);
    } catch (err) {
      console.error('[PatientProfile] Delete failed:', err);
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const handleDeleteReport = async () => {
    try {
      // Electron: hapus report dari disk
      if (isElectron() && window.aexonStorage) {
        const reportId = `report_${session.id}`;
        await window.aexonStorage.deleteReport(session.id, reportId);
      }

      // Update session: hapus clinicalNotes (menandakan laporan dihapus)
      const updatedSession: Session = { ...session, clinicalNotes: undefined };
      onUpdateSession?.(updatedSession);
    } catch (err) {
      console.error('[PatientProfile] Delete report failed:', err);
    } finally {
      setShowDeleteReportModal(false);
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'media', label: 'Foto & Video', icon: <Camera style={{ width: 15, height: 15 }} /> },
    { id: 'reports', label: 'Laporan', icon: <FileText style={{ width: 15, height: 15 }} /> },
  ];

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <SessionFlowNav
        currentStep="patient-profile"
        onBack={onBack}
        backLabel="Beranda"
        onNext={() => onEditReport(session)}
        nextLabel="Buat laporan"
      />
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        height: '100%',
        backgroundColor: '#F4F6F8',
        padding: 32,
      }}
      className="custom-scrollbar"
    >

      {/* Patient header card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: 16,
          border: '1px solid #E8ECF1',
          padding: 28,
          marginBottom: 24,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              {/* Avatar */}
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: 'linear-gradient(135deg, #0C1E35, #1e3a5c)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    color: 'white',
                    fontWeight: 800,
                    fontSize: 16,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {patient.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div>
                <h2
                  style={{
                    fontSize: 24,
                    fontWeight: 900,
                    color: '#0C1E35',
                    lineHeight: 1.2,
                    marginBottom: 4,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                  }}
                >
                  {patient.name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span
                    style={{
                      padding: '2px 8px',
                      backgroundColor: catStyle.bg,
                      color: catStyle.color,
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 6,
                    }}
                  >
                    {patient.category}
                  </span>
                  {patient.diagnosis_icd10 && (
                    <span
                      style={{
                        padding: '2px 8px',
                        backgroundColor: '#EFF6FF',
                        color: '#1D4ED8',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 6,
                      }}
                    >
                      {patient.diagnosis_icd10.split(' - ')[0]}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Info grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '12px 32px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Hash style={{ width: 14, height: 14, color: '#94A3B8' }} />
                <div>
                  <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    No. RM
                  </p>
                  <p style={{ fontSize: 13, color: '#0C1E35', fontWeight: 600, margin: 0 }}>
                    {patient.rmNumber || '-'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar style={{ width: 14, height: 14, color: '#94A3B8' }} />
                <div>
                  <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Tanggal Sesi
                  </p>
                  <p style={{ fontSize: 13, color: '#0C1E35', fontWeight: 600, margin: 0 }}>
                    {session.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Stethoscope style={{ width: 14, height: 14, color: '#94A3B8' }} />
                <div>
                  <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Diagnosis
                  </p>
                  <p style={{ fontSize: 13, color: '#0C1E35', fontWeight: 600, margin: 0 }}>
                    {patient.diagnosis || '-'}
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Activity style={{ width: 14, height: 14, color: '#94A3B8' }} />
                <div>
                  <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                    Prosedur
                  </p>
                  <p style={{ fontSize: 13, color: '#0C1E35', fontWeight: 600, margin: 0 }}>
                    {patient.procedures_icd9?.[0] || patient.procedures?.[0] || '-'}
                  </p>
                </div>
              </div>

              {/* Edit Data Pasien button */}
              <button
                onClick={openPatientEditor}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16,
                  padding: '7px 14px', backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0',
                  borderRadius: 8, fontSize: 12, fontWeight: 600, color: '#64748B',
                  cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'all 150ms',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#0C1E35'; e.currentTarget.style.color = '#0C1E35'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.color = '#64748B'; }}
              >
                <Edit3 style={{ width: 13, height: 13 }} />
                Edit Data Pasien
              </button>
            </div>
          </div>

          {/* Quick stats on the right */}
          <div style={{ display: 'flex', gap: 12, flexShrink: 0 }}>
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: '14px 20px',
                textAlign: 'center',
                minWidth: 80,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0C1E35', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                {photoCount}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginTop: 4 }}>Foto</div>
            </div>
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: '14px 20px',
                textAlign: 'center',
                minWidth: 80,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0C1E35', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                {videoCount}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginTop: 4 }}>Video</div>
            </div>
            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: 12,
                padding: '14px 20px',
                textAlign: 'center',
                minWidth: 80,
              }}
            >
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0C1E35', fontFamily: "'Plus Jakarta Sans', sans-serif", lineHeight: 1 }}>
                {session.captures.length}
              </div>
              <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, marginTop: 4 }}>Total</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 20px',
                border: 'none',
                borderBottom: active ? '2px solid #0D9488' : '2px solid transparent',
                background: 'none',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: active ? 700 : 500,
                color: active ? '#0C1E35' : '#94A3B8',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'all 150ms',
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        {activeTab === 'media' && (
          <div style={{ backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #E8ECF1', overflow: 'hidden' }}>
            {/* Header: filter tabs + actions */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', borderBottom: '1.5px solid #E8ECF1' }}>
                {([
                  { key: 'all', label: 'Semua', count: session.captures.length },
                  { key: 'photos', label: 'Foto', count: photoCount },
                  { key: 'videos', label: 'Video', count: videoCount },
                ] as const).map(f => {
                  const isActive = mediaFilter === f.key;
                  return (
                    <button key={f.key} onClick={() => setMediaFilter(f.key)}
                      style={{
                        padding: '8px 16px', fontSize: 12, fontWeight: isActive ? 700 : 500,
                        border: 'none', borderBottom: isActive ? '2px solid #0D9488' : '2px solid transparent',
                        cursor: 'pointer', backgroundColor: 'transparent',
                        color: isActive ? '#0C1E35' : '#94A3B8', transition: 'all 150ms',
                        fontFamily: "'Plus Jakarta Sans', sans-serif", marginBottom: '-1.5px',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}>
                      {f.label}
                      <span style={{ fontSize: 9, fontWeight: 700, backgroundColor: isActive ? '#E6F7F5' : '#F1F5F9', color: isActive ? '#0D9488' : '#94A3B8', padding: '1px 6px', borderRadius: 8 }}>{f.count}</span>
                    </button>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                {selectedMediaIds.length > 0 && (
                  <>
                    <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{selectedMediaIds.length} dipilih</span>
                    <button onClick={clearSelection}
                      style={{ padding: '5px 10px', fontSize: 11, fontWeight: 600, color: '#94A3B8', background: 'none', border: '1px solid #E8ECF1', borderRadius: 6, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      Batal
                    </button>
                    <button onClick={() => setShowDeleteModal(true)}
                      disabled={isDeleting}
                      style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#fff', backgroundColor: '#EF4444', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4, opacity: isDeleting ? 0.6 : 1 }}>
                      <Trash2 style={{ width: 12, height: 12 }} /> Hapus
                    </button>
                    <button onClick={handleSaveSelected}
                      disabled={isExporting}
                      style={{ padding: '5px 12px', fontSize: 11, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg, #0C1E35, #152d4f)', border: 'none', borderRadius: 6, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", display: 'flex', alignItems: 'center', gap: 4, opacity: isExporting ? 0.6 : 1 }}>
                      {isExporting ? <Loader2 style={{ width: 12, height: 12, animation: 'spin 1s linear infinite' }} /> : <Download style={{ width: 12, height: 12 }} />} Simpan
                    </button>
                  </>
                )}
                {selectedMediaIds.length === 0 && filteredCaptures.length > 0 && (
                  <button onClick={selectAllVisible}
                    style={{ padding: '5px 12px', fontSize: 11, fontWeight: 600, color: '#64748B', background: 'none', border: '1px solid #E8ECF1', borderRadius: 6, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Pilih Semua
                  </button>
                )}
              </div>
            </div>

            {/* Grid gallery */}
            {filteredCaptures.length === 0 ? (
              <div style={{ padding: '48px 0', textAlign: 'center' }}>
                <Camera style={{ width: 36, height: 36, color: '#E8ECF1', margin: '0 auto 10px', display: 'block' }} />
                <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>Belum ada media</p>
              </div>
            ) : (
              <div style={{ padding: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                {filteredCaptures.map((capture, idx) => {
                  const isSelected = selectedMediaIds.includes(capture.id);
                  return (
                    <div key={capture.id || idx}
                      onClick={() => toggleMediaSelect(capture.id)}
                      onDoubleClick={() => setPreviewCapture(capture)}
                      style={{
                        width: '100%', aspectRatio: '1', borderRadius: 10,
                        backgroundColor: '#F1F5F9', overflow: 'hidden', cursor: 'pointer',
                        position: 'relative', border: isSelected ? '2.5px solid #0D9488' : '2.5px solid transparent',
                        transition: 'border-color 150ms',
                      }}>
                      {capture.type === 'video' ? (
                        (capture.thumbnail || videoThumbnails[capture.id]) ? (
                          <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                            <img src={capture.thumbnail || videoThumbnails[capture.id]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                              <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)' }}>
                                <div style={{ width: 0, height: 0, borderLeft: '12px solid #fff', borderTop: '7px solid transparent', borderBottom: '7px solid transparent', marginLeft: 3 }} />
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f1623, #1a2a3f)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                            <div style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <div style={{ width: 0, height: 0, borderLeft: '14px solid rgba(255,255,255,0.7)', borderTop: '8px solid transparent', borderBottom: '8px solid transparent', marginLeft: 4 }} />
                            </div>
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>VIDEO</span>
                          </div>
                        )
                      ) : (capture.thumbnail || capture.dataUrl || capture.url) ? (
                          <img src={capture.thumbnail || capture.dataUrl || capture.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Camera style={{ width: 24, height: 24, color: '#CBD5E1' }} />
                        </div>
                      )}
                      {/* Select checkbox */}
                      <div style={{
                        position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 6,
                        border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.7)',
                        backgroundColor: isSelected ? '#0D9488' : 'rgba(0,0,0,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
                      }}>
                        {isSelected && <CheckCircle2 style={{ width: 14, height: 14, color: '#fff' }} />}
                      </div>
                      {/* Type badge + file size */}
                      <div style={{ position: 'absolute', bottom: 6, left: 6, display: 'flex', gap: 3, alignItems: 'center' }}>
                        {capture.type === 'video' && (
                          <div style={{ padding: '2px 6px', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Video style={{ width: 10, height: 10, color: 'white' }} />
                            <span style={{ fontSize: 9, color: 'white', fontWeight: 600 }}>Video</span>
                          </div>
                        )}
                        {(fileSizes[capture.id] ?? 0) > 0 && (
                          <div style={{ padding: '2px 6px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 4 }}>
                            <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.85)', fontWeight: 600 }}>{formatFileSize(fileSizes[capture.id])}</span>
                          </div>
                        )}
                      </div>
                      {/* Preview + Edit on hover */}
                      <div style={{ position: 'absolute', bottom: 6, right: 6, opacity: 0, transition: 'opacity 150ms', display: 'flex', gap: 4 }}
                        onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}>
                        {capture.type !== 'video' && (
                          <button onClick={(e) => { e.stopPropagation(); setEditingCapture(capture); }}
                            title="Anotasi"
                            style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: '#0C1E35', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.3)' }}>
                            <Edit3 style={{ width: 13, height: 13 }} />
                          </button>
                        )}
                        <button onClick={(e) => { e.stopPropagation(); setPreviewCapture(capture); }}
                          title="Preview"
                          style={{ width: 28, height: 28, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Maximize style={{ width: 14, height: 14 }} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Preview modal */}
        {previewCapture && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(10px)', padding: 40 }}
            onClick={() => setPreviewCapture(null)}>
            <div style={{ position: 'relative', maxWidth: 900, width: '100%', backgroundColor: '#000', borderRadius: 16, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.3)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ aspectRatio: '16/10', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {previewCapture.type === 'video' ? (
                  <video src={previewCapture.url || previewCapture.dataUrl} controls autoPlay muted playsInline
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    onDoubleClick={e => e.stopPropagation()} />
                ) : (
                  <img src={previewCapture.thumbnail || previewCapture.dataUrl || previewCapture.url} alt=""
                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                )}
              </div>
              <button onClick={() => setPreviewCapture(null)}
                style={{ position: 'absolute', top: 12, right: 12, width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.5)', border: 'none', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <X style={{ width: 18, height: 18 }} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (() => {
          const savedReports: { id: string; savedAt: string; pdfDataUrl: string; hospitalName: string | null; pageConfig?: any[] }[] = (session as any).savedReports || [];
          return (
          <div style={{ backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #E8ECF1', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0C1E35', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Laporan ({savedReports.length})
              </h3>
              <button
                onClick={() => onEditReport(session)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px',
                  background: '#0C1E35', color: '#fff', border: 'none', borderRadius: 8,
                  fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                <Edit3 style={{ width: 14, height: 14 }} />
                {savedReports.length > 0 ? 'Buat Versi Baru' : 'Buat Laporan'}
              </button>
            </div>

            <div style={{ padding: 20 }}>
              {savedReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <FileText style={{ width: 36, height: 36, color: '#E8ECF1', margin: '0 auto 10px', display: 'block' }} />
                  <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500, margin: '0 0 4px' }}>Belum ada laporan tersimpan</p>
                  <p style={{ fontSize: 11, color: '#CBD5E1', margin: 0 }}>Buat laporan di Report Generator lalu tekan "Simpan PDF"</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[...savedReports].reverse().map((report, idx) => {
                    const versionNum = savedReports.length - idx;
                    const savedDate = new Date(report.savedAt);
                    const dateStr = savedDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                    const timeStr = savedDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
                    // Random code dari report ID (6 karakter alfanumerik)
                    const code = report.id.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase() || 'XXXXXX';
                    const fileName = `RPT-${code}-v${versionNum}.pdf`;
                    return (
                      <div key={report.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '14px 16px', backgroundColor: '#F8FAFC', borderRadius: 10,
                        border: idx === 0 ? '1px solid #D1D5DB' : '1px solid transparent',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
                            backgroundColor: idx === 0 ? '#EFF6FF' : '#F1F5F9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <FileText style={{ width: 16, height: 16, color: idx === 0 ? '#2563EB' : '#94A3B8' }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <p style={{ fontSize: 13, fontWeight: 600, color: '#0C1E35', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fileName}</p>
                              {idx === 0 && (
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#2563EB', backgroundColor: '#EFF6FF', padding: '1px 6px', borderRadius: 4, flexShrink: 0 }}>Terbaru</span>
                              )}
                            </div>
                            <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>
                              {dateStr} pukul {timeStr}
                              {report.hospitalName && <span> &middot; {report.hospitalName}</span>}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                          <button
                            onClick={() => setPreviewReportUrl(report.pdfDataUrl)}
                            title="Preview PDF"
                            style={{
                              padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4,
                              backgroundColor: 'transparent', border: '1px solid #E8ECF1', borderRadius: 6,
                              color: '#64748B', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                            }}
                          >
                            <Maximize style={{ width: 12, height: 12 }} />
                            Preview
                          </button>
                          <button
                            onClick={() => onEditReport(session, report.pageConfig)}
                            title="Edit & Buat Versi Baru"
                            style={{
                              padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 4,
                              backgroundColor: 'transparent', border: '1px solid #E8ECF1', borderRadius: 6,
                              color: '#64748B', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                            }}
                          >
                            <Edit3 style={{ width: 12, height: 12 }} />
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = report.pdfDataUrl;
                              link.download = fileName;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            title="Download PDF"
                            style={{
                              padding: 6, backgroundColor: 'transparent',
                              border: '1px solid #E8ECF1', borderRadius: 6,
                              color: '#64748B', cursor: 'pointer', display: 'flex',
                            }}
                          >
                            <Download style={{ width: 14, height: 14 }} />
                          </button>
                          <button
                            onClick={() => {
                              const updated = savedReports.filter(r => r.id !== report.id);
                              onUpdateSession?.({ ...session, savedReports: updated } as any);
                            }}
                            title="Hapus Versi"
                            style={{
                              padding: 6, backgroundColor: 'transparent',
                              border: '1px solid #E8ECF1', borderRadius: 6,
                              color: '#64748B', cursor: 'pointer', display: 'flex',
                            }}
                          >
                            <Trash2 style={{ width: 14, height: 14 }} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          );
        })()}
      </motion.div>

      {/* Disk Space */}
      <div style={{ padding: '0 32px 24px' }}>
        <DiskSpaceIndicator />
      </div>

      {/* Image Editor / Anotasi */}
      {editingCapture && (
        <ImageEditor
          imageUrl={editingCapture.originalUrl || editingCapture.url || editingCapture.dataUrl || ''}
          initialShapes={editingCapture.shapes}
          onSave={handleAnnotationSave}
          onClose={() => setEditingCapture(null)}
        />
      )}

      {/* Delete Media Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        onConfirm={handleDeleteSelected}
        onCancel={() => setShowDeleteModal(false)}
        title="Hapus Media?"
        message={`${selectedMediaIds.length} foto/video yang dipilih akan dihapus secara permanen dari komputer ini dan tidak dapat dikembalikan.`}
        confirmText={isDeleting ? "Menghapus..." : "Hapus Permanen"}
        cancelText="Batal"
        variant="danger"
        icon={<Trash2 className="w-10 h-10 text-red-500" />}
      />

      {/* Delete Report Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteReportModal}
        onConfirm={handleDeleteReport}
        onCancel={() => setShowDeleteReportModal(false)}
        title="Hapus Laporan?"
        message="Laporan ini akan dihapus secara permanen dari komputer dan tidak dapat dikembalikan."
        confirmText="Hapus Permanen"
        cancelText="Batal"
        variant="danger"
        icon={<Trash2 className="w-10 h-10 text-red-500" />}
      />

      {/* Edit Data Pasien Modal */}
      {showEditPatientModal && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 120,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(10px)',
            padding: 32,
          }}
          onClick={() => setShowEditPatientModal(false)}
        >
          <div
            style={{
              position: 'relative', width: '100%', maxWidth: 600,
              backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              padding: '16px 24px', borderBottom: '1px solid #E8ECF1',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: 'linear-gradient(135deg, #0C1E35 0%, #152d4f 100%)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Edit3 style={{ width: 16, height: 16, color: '#fff' }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: '#fff', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Edit Data Pasien
                </span>
              </div>
              <button
                onClick={() => setShowEditPatientModal(false)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* Form */}
            <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '70vh', overflowY: 'auto' }} className="custom-scrollbar">

              {/* Nama & No. RM */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    Nama Pasien
                  </label>
                  <input
                    type="text"
                    value={patientForm.name}
                    onChange={e => setPatientForm({ ...patientForm, name: e.target.value })}
                    placeholder="Nama lengkap pasien"
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0',
                      fontSize: 14, color: '#0C1E35', backgroundColor: '#fff', outline: 'none',
                      fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    No. Rekam Medis
                  </label>
                  <input
                    type="text"
                    value={patientForm.rmNumber}
                    onChange={e => setPatientForm({ ...patientForm, rmNumber: e.target.value })}
                    placeholder="No. RM"
                    style={{
                      width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0',
                      fontSize: 14, color: '#0C1E35', backgroundColor: '#fff', outline: 'none',
                      fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: 'border-box',
                    }}
                    onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
                    onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>

              {/* Diagnosis */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Diagnosis
                </label>
                <input
                  type="text"
                  value={patientForm.diagnosis}
                  onChange={e => setPatientForm({ ...patientForm, diagnosis: e.target.value })}
                  placeholder="Diagnosis utama"
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0',
                    fontSize: 14, color: '#0C1E35', backgroundColor: '#fff', outline: 'none',
                    fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              {/* ICD-10 */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  ICD-10
                </label>
                <ICD10Autocomplete
                  value={patientForm.diagnosis_icd10}
                  onChange={val => setPatientForm({ ...patientForm, diagnosis_icd10: val })}
                  placeholder="Cari kode ICD-10..."
                />
              </div>

              {/* Diagnosis Banding */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Diagnosis Banding
                </label>
                <input
                  type="text"
                  value={patientForm.differentialDiagnosis}
                  onChange={e => setPatientForm({ ...patientForm, differentialDiagnosis: e.target.value })}
                  placeholder="Diagnosis banding (opsional)"
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #E2E8F0',
                    fontSize: 14, color: '#0C1E35', backgroundColor: '#fff', outline: 'none',
                    fontFamily: "'Plus Jakarta Sans', sans-serif", boxSizing: 'border-box',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(37,99,235,0.08)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; }}
                />
              </div>

              {/* ICD-10 Diagnosis Banding */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  ICD-10 Diagnosis Banding
                </label>
                <ICD10Autocomplete
                  value={patientForm.differentialDiagnosis_icd10}
                  onChange={val => setPatientForm({ ...patientForm, differentialDiagnosis_icd10: val })}
                  placeholder="Cari kode ICD-10 diagnosis banding..."
                />
              </div>

              {/* Prosedur ICD-9 */}
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 6, letterSpacing: '0.04em', textTransform: 'uppercase', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                  Prosedur (ICD-9)
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {patientForm.procedures_icd9.map((proc, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <ICD9Autocomplete
                          value={proc}
                          onChange={val => {
                            const updated = [...patientForm.procedures_icd9];
                            updated[i] = val;
                            setPatientForm({ ...patientForm, procedures_icd9: updated });
                          }}
                          index={i}
                          placeholder="Cari kode ICD-9..."
                        />
                      </div>
                      {patientForm.procedures_icd9.length > 1 && (
                        <button
                          onClick={() => {
                            const updated = patientForm.procedures_icd9.filter((_, j) => j !== i);
                            setPatientForm({ ...patientForm, procedures_icd9: updated });
                          }}
                          style={{
                            width: 32, height: 32, borderRadius: 8, border: '1px solid #E8ECF1',
                            backgroundColor: '#fff', cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}
                        >
                          <Minus style={{ width: 14, height: 14, color: '#94A3B8' }} />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={() => setPatientForm({ ...patientForm, procedures_icd9: [...patientForm.procedures_icd9, ''] })}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px',
                      backgroundColor: '#F8FAFC', border: '1.5px dashed #CBD5E1', borderRadius: 8,
                      fontSize: 12, fontWeight: 600, color: '#64748B', cursor: 'pointer',
                      fontFamily: "'Plus Jakarta Sans', sans-serif", alignSelf: 'flex-start',
                    }}
                  >
                    <Plus style={{ width: 13, height: 13 }} />
                    Tambah Prosedur
                  </button>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '16px 24px', borderTop: '1px solid #E8ECF1',
              display: 'flex', justifyContent: 'flex-end', gap: 10,
            }}>
              <button
                onClick={() => setShowEditPatientModal(false)}
                style={{
                  padding: '10px 20px', borderRadius: 10, border: '1.5px solid #E2E8F0',
                  backgroundColor: '#fff', fontSize: 13, fontWeight: 600, color: '#64748B',
                  cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}
              >
                Batal
              </button>
              <button
                onClick={savePatientData}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 24px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #0C1E35 0%, #152d4f 100%)',
                  fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 2px 8px rgba(12,30,53,0.2)',
                }}
              >
                <Save style={{ width: 14, height: 14 }} />
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewReportUrl && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 120,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(10px)',
            padding: 32,
          }}
          onClick={() => setPreviewReportUrl(null)}
        >
          <div
            style={{
              position: 'relative', width: '100%', maxWidth: 900, height: '90vh',
              backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 25px 50px rgba(0,0,0,0.3)',
              display: 'flex', flexDirection: 'column',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              padding: '12px 20px', borderBottom: '1px solid #E8ECF1',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
            }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35', margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Preview Laporan
              </p>
              <button
                onClick={() => setPreviewReportUrl(null)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  backgroundColor: '#F4F6F8', border: 'none', color: '#64748B',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>
            <iframe
              src={previewReportUrl}
              title="PDF Preview"
              style={{ flex: 1, border: 'none', width: '100%' }}
            />
          </div>
        </div>
      )}
    </div>
    </div>
  );
}