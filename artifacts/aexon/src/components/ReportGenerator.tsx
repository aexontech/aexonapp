import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Printer, CheckCircle2, FileImage, ShieldAlert, ArrowLeft, Mail, MessageCircle, Info, AlertTriangle, Download, Video, Camera, Layout, Columns, Grid, Plus, Trash2, ChevronRight, ChevronLeft, Loader2 } from 'lucide-react';
import { Session, Capture, HospitalSettings, UserProfile } from '../types';
import ImageEditor from './ImageEditor';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ReportPage {
  id: string;
  name: string;
  reportType: 'clinical' | 'academic';
  reportLayout: 'standard' | 'beforeAfter' | 'rightLeft';
  pageSize: 'A4' | 'F4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  selectedPhotos: Capture[];
  selectedVideos: Capture[];
  photoCaptions: Record<string, string>;
  clinicalNotes: string;
}

interface ReportGeneratorProps {
  session: Session;
  onBack: () => void;
  hospitalSettingsList: HospitalSettings[];
  userProfile: UserProfile;
  plan: 'subscription' | 'enterprise' | null;
}

export default function ReportGenerator({ session, onBack, hospitalSettingsList, userProfile, plan }: ReportGeneratorProps) {
  const [pages, setPages] = useState<ReportPage[]>([
    {
      id: 'page-1',
      name: 'Halaman 1',
      reportType: 'clinical',
      reportLayout: 'standard',
      pageSize: 'A4',
      orientation: 'portrait',
      selectedPhotos: [],
      selectedVideos: [],
      photoCaptions: {},
      clinicalNotes: ''
    }
  ]);
  const [activePageId, setActivePageId] = useState<string>('page-1');
  const [editingPhoto, setEditingPhoto] = useState<Capture | null>(null);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const printAreaRef = useRef<HTMLDivElement>(null);

  const activePage = pages.find(p => p.id === activePageId) || pages[0];

  const updateActivePage = (updates: Partial<ReportPage>) => {
    setPages(pages.map(p => p.id === activePageId ? { ...p, ...updates } : p));
  };

  const addNewPage = () => {
    const newId = `page-${Date.now()}`;
    const newPage: ReportPage = {
      id: newId,
      name: `Halaman ${pages.length + 1}`,
      reportType: 'clinical',
      reportLayout: 'standard',
      pageSize: 'A4',
      orientation: 'portrait',
      selectedPhotos: [],
      selectedVideos: [],
      photoCaptions: {},
      clinicalNotes: ''
    };
    setPages([...pages, newPage]);
    setActivePageId(newId);
  };

  const deletePage = (id: string) => {
    if (pages.length <= 1) return;
    const newPages = pages.filter(p => p.id !== id);
    setPages(newPages);
    if (activePageId === id) {
      const currentIndex = pages.findIndex(p => p.id === id);
      const nextActiveId = newPages[Math.min(currentIndex, newPages.length - 1)].id;
      setActivePageId(nextActiveId);
    }
  };

  const handleDeletePage = (id: string) => {
    if (pages.length <= 1) return;
    const page = pages.find(p => p.id === id);
    if (!page) return;

    const isPageEmpty = page.selectedPhotos.length === 0 && page.clinicalNotes.trim() === '';

    if (isPageEmpty) {
      deletePage(id);
    } else {
      setPageToDelete(id);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete') {
        if (document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          handleDeletePage(activePageId);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePageId, pages]);

  const isEnterprise = plan === 'enterprise';

  const [selectedHospital, setSelectedHospital] = useState<HospitalSettings | null>(
    hospitalSettingsList.length > 0 ? hospitalSettingsList[0] : null
  );

  const calculateAge = (dob: string) => {
    if (!dob) return '-';
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} Tahun`;
  };

  const getPageDimensions = (page: ReportPage) => {
    const isLandscape = page.orientation === 'landscape';
    let width, height;

    switch (page.pageSize) {
      case 'F4': 
        width = '215mm'; 
        height = '330mm'; 
        break;
      case 'Letter': 
        width = '216mm'; 
        height = '279mm'; 
        break;
      default: 
        width = '210mm'; 
        height = '297mm'; 
        break;
    }

    return isLandscape 
      ? { width: height, minHeight: width } 
      : { width: width, minHeight: height };
  };

  const handlePhotoSelect = (capture: Capture) => {
    if (activePage.selectedPhotos.find(p => p.id === capture.id)) {
      updateActivePage({
        selectedPhotos: activePage.selectedPhotos.filter(p => p.id !== capture.id)
      });
    } else {
      if (activePage.selectedPhotos.length < 9) {
        updateActivePage({
          selectedPhotos: [...activePage.selectedPhotos, capture]
        });
      }
    }
  };

  const handleVideoSelect = (capture: Capture) => {
    if (activePage.selectedVideos.find(p => p.id === capture.id)) {
      updateActivePage({
        selectedVideos: activePage.selectedVideos.filter(p => p.id !== capture.id)
      });
    } else {
      if (activePage.selectedVideos.length < 4) {
        updateActivePage({
          selectedVideos: [...activePage.selectedVideos, capture]
        });
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSavePDF = async () => {
    if (!printAreaRef.current || isSaving) return;
    setIsSaving(true);
    try {
      const pageElements = printAreaRef.current.querySelectorAll('.print-container') as NodeListOf<HTMLElement>;
      if (pageElements.length === 0) return;

      const savedStyles: string[] = [];
      pageElements.forEach((el) => {
        savedStyles.push(el.style.cssText);
        el.style.opacity = '1';
        el.style.filter = 'none';
        el.style.transform = 'none';
        el.style.boxShadow = 'none';
        (el as any).style.outline = 'none';
      });

      let pdf: jsPDF | null = null;

      for (let i = 0; i < pageElements.length; i++) {
        const el = pageElements[i];
        const page = pages[i];
        const isLandscape = page.orientation === 'landscape';
        const format = page.pageSize === 'F4' ? [215, 330] as [number, number] : page.pageSize === 'Letter' ? 'letter' as const : 'a4' as const;

        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i === 0) {
          pdf = new jsPDF({
            orientation: isLandscape ? 'landscape' : 'portrait',
            unit: 'mm',
            format: format,
          });
        } else {
          pdf!.addPage(format, isLandscape ? 'landscape' : 'portrait');
        }

        const pdfWidth = pdf!.internal.pageSize.getWidth();
        const pdfHeight = pdf!.internal.pageSize.getHeight();
        pdf!.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
      }

      pageElements.forEach((el, i) => {
        el.style.cssText = savedStyles[i];
      });

      const fileName = `Laporan_Endoskopi_${session.patient.name.replace(/\s+/g, '_')}_${session.date.toLocaleDateString('id-ID').replace(/\//g, '-')}.pdf`;
      pdf!.save(fileName);
    } catch (err) {
      console.error('PDF save error:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Laporan Endoskopi - ${session.patient.name} - ${session.date.toLocaleDateString('id-ID')}`);
    const procedures = session.patient.procedures?.join(', ') || '-';
    const diagnosis = session.patient.diagnosis || '-';
    const body = encodeURIComponent(
      `Yth. Sejawat,\n\n` +
      `Berikut ringkasan laporan endoskopi:\n\n` +
      `INFORMASI PASIEN\n` +
      `Nama Pasien  : ${session.patient.name}\n` +
      `No. RM       : ${session.patient.rmNumber}\n` +
      `Tanggal      : ${session.date.toLocaleDateString('id-ID')}\n` +
      `Operator     : ${session.patient.operator}\n` +
      `Perujuk      : ${session.patient.referringDoctor || '-'}\n\n` +
      `HASIL PEMERIKSAAN\n` +
      `Prosedur     : ${procedures}\n` +
      `Diagnosis    : ${diagnosis}\n` +
      `Jumlah Foto  : ${session.captures.filter(c => c.type === 'image').length}\n` +
      `Jumlah Video : ${session.captures.filter(c => c.type === 'video').length}\n\n` +
      `Laporan lengkap beserta dokumentasi foto terlampir.\n\n` +
      `Salam,\n${userProfile.name}`
    );
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleWhatsApp = () => {
    const procedures = session.patient.procedures?.join(', ') || '-';
    const diagnosis = session.patient.diagnosis || '-';
    const text = encodeURIComponent(
      `Yth. Sejawat,\n\n` +
      `Berikut ringkasan laporan endoskopi:\n\n` +
      `*INFORMASI PASIEN*\n` +
      `Nama Pasien : *${session.patient.name}*\n` +
      `No. RM : ${session.patient.rmNumber}\n` +
      `Tanggal : ${session.date.toLocaleDateString('id-ID')}\n` +
      `Operator : ${session.patient.operator}\n` +
      `Perujuk : ${session.patient.referringDoctor || '-'}\n\n` +
      `*HASIL PEMERIKSAAN*\n` +
      `Prosedur : ${procedures}\n` +
      `Diagnosis : ${diagnosis}\n` +
      `Jumlah Foto : ${session.captures.filter(c => c.type === 'image').length}\n` +
      `Jumlah Video : ${session.captures.filter(c => c.type === 'video').length}\n\n` +
      `Laporan lengkap beserta dokumentasi foto terlampir.\n\n` +
      `Salam,\n${userProfile.name}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const images = session.captures.filter(c => c.type === 'image');
  const videos = session.captures.filter(c => c.type === 'video');
  const caseId = `AX-${session.date.getFullYear()}-${String(session.date.getMonth() + 1).padStart(2, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

  const downloadMedia = (url: string, type: 'image' | 'video') => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `endo_capture_${new Date().getTime()}.${type === 'image' ? 'png' : 'webm'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, color: '#94A3B8',
    textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12,
  };

  const pillBtn = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '10px 12px', borderRadius: 10,
    fontSize: 12, fontWeight: 700, textAlign: 'center' as const,
    border: active ? 'none' : '1px solid #E2E8F0',
    backgroundColor: active ? '#0C1E35' : '#F8FAFC',
    color: active ? '#ffffff' : '#64748B',
    cursor: 'pointer', transition: 'all 150ms',
    fontFamily: 'Plus Jakarta Sans, sans-serif',
  });

  return (
    <div className="print:overflow-visible print:h-auto print:bg-white" style={{ flex: 1, backgroundColor: '#F8FAFC', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: ${activePage.pageSize === 'F4' ? '215mm 330mm' : activePage.pageSize === 'Letter' ? 'letter' : 'A4'} ${activePage.orientation};
          margin: 0;
        }
        @media print {
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            overflow: visible !important;
            height: auto !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #root > div > div {
            overflow: visible !important;
            height: auto !important;
          }
          .print-container { 
            width: 100% !important; 
            min-height: 100% !important; 
            box-shadow: none !important; 
            margin: 0 !important; 
            padding: 10mm !important; 
            page-break-after: always;
            background: white !important;
            color: black !important;
            opacity: 1 !important;
            filter: none !important;
            transform: none !important;
            ring: none !important;
          }
          .print-container:last-child {
            page-break-after: auto;
          }
          .print-container * {
            line-height: 1.2 !important;
          }
          .print-header {
            margin-bottom: 3mm !important;
            padding-bottom: 2mm !important;
          }
          .print-section-title {
            font-size: 12pt !important;
            margin-bottom: 2mm !important;
          }
          .print-grid {
            gap: 2mm !important;
          }
          .print-patient-info {
            margin-bottom: 4mm !important;
            padding: 3mm !important;
          }
          .print-grid img {
            max-width: 100% !important;
            height: auto !important;
          }
          .print-photo-card img {
            break-inside: avoid;
          }
          .print-section {
            break-inside: avoid;
          }
        }
      `}} />

      {/* Header */}
      <header className="print:hidden" style={{
        backgroundColor: '#ffffff', borderBottom: '1px solid #E2E8F0',
        padding: '0 24px', height: 64, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0, position: 'relative', zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            onClick={onBack}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: 10,
              backgroundColor: '#ffffff', color: '#0C1E35', cursor: 'pointer',
              fontSize: 12, fontWeight: 700, transition: 'all 150ms',
              fontFamily: 'Outfit, sans-serif',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#0C1E35'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#ffffff'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            <ChevronLeft style={{ width: 16, height: 16 }} />
            Kembali
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: '#0C1E35' }}>{session.patient.name}</span>
            <span style={{
              padding: '3px 10px', backgroundColor: '#F1F5F9', borderRadius: 6,
              fontSize: 11, fontWeight: 600, color: '#64748B',
            }}>
              {session.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        <button
          onClick={handlePrint}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', backgroundColor: '#0C1E35', color: '#ffffff',
            border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700,
            cursor: 'pointer', transition: 'background-color 150ms',
            fontFamily: 'Outfit, sans-serif',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1a3a5c'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0C1E35'}
        >
          <Printer style={{ width: 16, height: 16 }} />
          Cetak / PDF
        </button>
      </header>

      {/* Page Tabs */}
      <div className="print:hidden" style={{
        backgroundColor: '#ffffff', borderBottom: '1px solid #E2E8F0',
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0,
      }}>
        {pages.map((page, index) => (
          <button
            key={page.id}
            onClick={() => setActivePageId(page.id)}
            style={{
              padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
              border: 'none', cursor: 'pointer', transition: 'all 150ms',
              backgroundColor: activePageId === page.id ? '#0C1E35' : '#F8FAFC',
              color: activePageId === page.id ? '#ffffff' : '#64748B',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              display: 'flex', alignItems: 'center', gap: 6,
            }}
          >
            {page.name}
            {pages.length > 1 && activePageId === page.id && (
              <span
                onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id); }}
                style={{ marginLeft: 4, opacity: 0.7, fontSize: 14, lineHeight: 1 }}
              >×</span>
            )}
          </button>
        ))}
        <button
          onClick={addNewPage}
          style={{
            padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
            backgroundColor: '#F8FAFC', color: '#94A3B8',
            border: '1px dashed #CBD5E1', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 4,
            transition: 'all 150ms', fontFamily: 'Plus Jakarta Sans, sans-serif',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0C1E35'; e.currentTarget.style.color = '#0C1E35'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#CBD5E1'; e.currentTarget.style.color = '#94A3B8'; }}
        >
          <Plus style={{ width: 14, height: 14 }} />
          Tambah
        </button>
      </div>

      {/* Main layout */}
      <div className="print:overflow-visible print:block" style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 10 }}>
        {/* Left Settings Panel */}
        <div className="print:hidden custom-scrollbar" style={{
          width: 288, backgroundColor: '#ffffff', borderRight: '1px solid #E2E8F0',
          padding: 20, overflowY: 'auto', flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {/* Page Name */}
          <div>
            <div style={sectionLabelStyle}>Nama Halaman</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={activePage.name}
                onChange={(e) => updateActivePage({ name: e.target.value })}
                style={{
                  flex: 1, padding: '10px 14px', backgroundColor: '#F8FAFC',
                  border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 13,
                  color: '#0C1E35', outline: 'none',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                  transition: 'border-color 150ms',
                }}
                onFocus={e => e.currentTarget.style.borderColor = '#0C1E35'}
                onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
              />
              {pages.length > 1 && (
                <button
                  onClick={() => handleDeletePage(activePageId)}
                  style={{
                    padding: '0 14px', backgroundColor: '#FEF2F2', color: '#DC2626',
                    border: '1px solid #FECACA', borderRadius: 12, fontSize: 11,
                    fontWeight: 700, cursor: 'pointer', transition: 'all 150ms',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EF4444'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
                >
                  Hapus
                </button>
              )}
            </div>
          </div>

          {/* Report Type */}
          <div>
            <div style={sectionLabelStyle}>Jenis Laporan</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['clinical', 'academic'] as const).map(t => (
                <button key={t} onClick={() => updateActivePage({ reportType: t })} style={pillBtn(activePage.reportType === t)}>
                  {t === 'clinical' ? 'Klinis' : 'Akademik'}
                </button>
              ))}
            </div>
          </div>

          {/* Layout */}
          <div>
            <div style={sectionLabelStyle}>Layout</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(['standard', 'beforeAfter', 'rightLeft'] as const).map(l => (
                <button key={l} onClick={() => updateActivePage({ reportLayout: l })} style={{
                  ...pillBtn(activePage.reportLayout === l),
                  flex: 'none', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', textAlign: 'left' as const,
                }}>
                  {l === 'standard' && <Grid style={{ width: 14, height: 14 }} />}
                  {l === 'beforeAfter' && <Columns style={{ width: 14, height: 14 }} />}
                  {l === 'rightLeft' && <Layout style={{ width: 14, height: 14 }} />}
                  {l === 'standard' ? 'Standar' : l === 'beforeAfter' ? 'Before-After' : 'Kiri-Kanan'}
                </button>
              ))}
            </div>
          </div>

          {/* Paper Size */}
          <div>
            <div style={sectionLabelStyle}>Ukuran Kertas</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['A4', 'F4', 'Letter'] as const).map(s => (
                <button key={s} onClick={() => updateActivePage({ pageSize: s })} style={pillBtn(activePage.pageSize === s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Orientation */}
          <div>
            <div style={sectionLabelStyle}>Orientasi</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['portrait', 'landscape'] as const).map(o => (
                <button key={o} onClick={() => updateActivePage({ orientation: o })} style={pillBtn(activePage.orientation === o)}>
                  {o === 'portrait' ? 'Portrait' : 'Landscape'}
                </button>
              ))}
            </div>
          </div>

          {/* Kop Surat */}
          <div>
            <div style={sectionLabelStyle}>Kop Surat</div>
            {isEnterprise ? (
              <>
                {selectedHospital ? (
                  <div style={{ padding: 14, backgroundColor: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0C1E35' }}>{selectedHospital.name}</p>
                    {selectedHospital.address && <p style={{ fontSize: 11, color: '#64748B', marginTop: 4 }}>{selectedHospital.address}</p>}
                  </div>
                ) : (
                  <div style={{ padding: 14, backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle style={{ width: 14, height: 14, color: '#F59E0B', flexShrink: 0 }} />
                    <p style={{ fontSize: 12, color: '#92400E' }}>Kop surat belum dikonfigurasi oleh Admin Institusi.</p>
                  </div>
                )}
                <p style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', marginTop: 8 }}>Kop surat dikunci oleh institusi Anda.</p>
              </>
            ) : (
              <>
                {hospitalSettingsList.length > 0 ? (
                  <div style={{ position: 'relative' }}>
                    <select
                      value={selectedHospital?.id || ''}
                      onChange={(e) => {
                        const hospital = hospitalSettingsList.find(h => h.id === e.target.value);
                        if (hospital) setSelectedHospital(hospital);
                      }}
                      style={{
                        width: '100%', padding: '10px 14px', backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 13,
                        color: '#0C1E35', outline: 'none', cursor: 'pointer',
                        appearance: 'none' as const,
                      }}
                    >
                      {hospitalSettingsList.map(h => (
                        <option key={h.id} value={h.id}>{h.name || 'Kop Surat'}</option>
                      ))}
                    </select>
                    <div style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
                      <ChevronRight style={{ width: 14, height: 14, color: '#94A3B8', transform: 'rotate(90deg)' }} />
                    </div>
                  </div>
                ) : (
                  <div style={{ padding: 14, backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle style={{ width: 14, height: 14, color: '#F59E0B', flexShrink: 0 }} />
                    <p style={{ fontSize: 12, color: '#92400E' }}>Belum ada kop surat. Tambahkan di Settings → Kop Surat.</p>
                  </div>
                )}
                <p style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic', marginTop: 8 }}>Pilih kop surat untuk laporan.</p>
              </>
            )}
          </div>

          {/* Photos */}
          <div>
            <div style={sectionLabelStyle}>Foto <span style={{ color: '#3B82F6', marginLeft: 4 }}>({activePage.selectedPhotos.length}/9)</span></div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {images.map(img => {
                const isSelected = !!activePage.selectedPhotos.find(p => p.id === img.id);
                return (
                  <div
                    key={img.id}
                    onClick={() => handlePhotoSelect(img)}
                    style={{
                      position: 'relative', aspectRatio: '16/9', borderRadius: 8,
                      overflow: 'hidden', cursor: 'pointer',
                      border: isSelected ? '2px solid #0C1E35' : '2px solid transparent',
                      transition: 'border-color 150ms',
                    }}
                    onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#94A3B8'; }}
                    onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = 'transparent'; }}
                  >
                    <img src={img.url} alt="Capture" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: 4, right: 4,
                        width: 20, height: 20, borderRadius: '50%',
                        backgroundColor: '#0C1E35', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        <CheckCircle2 style={{ width: 14, height: 14, color: '#ffffff' }} />
                      </div>
                    )}
                  </div>
                );
              })}
              {images.length === 0 && (
                <div style={{
                  gridColumn: 'span 3', padding: 24, textAlign: 'center',
                  backgroundColor: '#F8FAFC', borderRadius: 12,
                  border: '1px dashed #CBD5E1',
                }}>
                  <FileImage style={{ width: 24, height: 24, margin: '0 auto 8px', color: '#CBD5E1' }} />
                  <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Tidak ada foto di sesi ini</p>
                </div>
              )}
            </div>
          </div>

          {/* Photo Captions */}
          {activePage.selectedPhotos.length > 0 && (
            <div>
              <div style={sectionLabelStyle}>Keterangan Foto</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activePage.selectedPhotos.map((photo, idx) => (
                  <div key={photo.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 6, overflow: 'hidden', border: '1px solid #E2E8F0' }}>
                          <img src={photo.url} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0C1E35' }}>Foto #{idx + 1}</span>
                      </div>
                      <button
                        onClick={() => setEditingPhoto(photo)}
                        style={{
                          fontSize: 11, fontWeight: 700, color: '#3B82F6',
                          backgroundColor: '#EFF6FF', border: '1px solid #DBEAFE',
                          borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 4,
                          transition: 'all 150ms',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = '#0C1E35'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#EFF6FF'; e.currentTarget.style.color = '#3B82F6'; e.currentTarget.style.borderColor = '#DBEAFE'; }}
                      >
                        <Plus style={{ width: 12, height: 12 }} /> Marker
                      </button>
                    </div>
                    <textarea
                      value={activePage.photoCaptions[photo.id] || ''}
                      onChange={(e) => {
                        const newCaptions = { ...activePage.photoCaptions, [photo.id]: e.target.value };
                        updateActivePage({ photoCaptions: newCaptions });
                      }}
                      placeholder="Keterangan foto..."
                      style={{
                        width: '100%', padding: 10, backgroundColor: '#F8FAFC',
                        border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 12,
                        color: '#0C1E35', outline: 'none', resize: 'vertical' as const,
                        minHeight: 60, fontFamily: 'Plus Jakarta Sans, sans-serif',
                        transition: 'border-color 150ms',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#0C1E35'}
                      onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Clinical Notes */}
          <div>
            <div style={sectionLabelStyle}>Catatan Klinis</div>
            <textarea
              value={activePage.clinicalNotes}
              onChange={(e) => updateActivePage({ clinicalNotes: e.target.value })}
              placeholder="Tambahkan catatan klinis..."
              style={{
                width: '100%', padding: 12, backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 13,
                color: '#0C1E35', outline: 'none', resize: 'vertical' as const,
                minHeight: 100, fontFamily: 'Plus Jakarta Sans, sans-serif',
                transition: 'border-color 150ms',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#0C1E35'}
              onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={handlePrint}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '12px 0', backgroundColor: '#0C1E35', color: '#ffffff',
                  border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', transition: 'background-color 150ms',
                  fontFamily: 'Outfit, sans-serif',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1a3a5c'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0C1E35'}
              >
                <Printer style={{ width: 14, height: 14 }} /> Cetak
              </button>
              <button
                onClick={handleSavePDF}
                disabled={isSaving}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '12px 0', backgroundColor: '#6366F1', color: '#ffffff',
                  border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  cursor: isSaving ? 'not-allowed' : 'pointer', transition: 'background-color 150ms',
                  opacity: isSaving ? 0.6 : 1, fontFamily: 'Outfit, sans-serif',
                }}
                onMouseEnter={e => { if (!isSaving) e.currentTarget.style.backgroundColor = '#4F46E5'; }}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#6366F1'}
              >
                {isSaving ? (
                  <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
                ) : (
                  <Download style={{ width: 14, height: 14 }} />
                )}
                {isSaving ? 'Menyimpan...' : 'Simpan PDF'}
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <button
                onClick={handleEmail}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '12px 0', backgroundColor: '#F8FAFC', color: '#475569',
                  border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 150ms',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
              >
                <Mail style={{ width: 14, height: 14, color: '#3B82F6' }} /> Email
              </button>
              <button
                onClick={handleWhatsApp}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  padding: '12px 0', backgroundColor: '#F8FAFC', color: '#475569',
                  border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', transition: 'all 150ms',
                  fontFamily: 'Plus Jakarta Sans, sans-serif',
                }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
              >
                <MessageCircle style={{ width: 14, height: 14, color: '#10B981' }} /> WhatsApp
              </button>
            </div>

            <div style={{
              padding: 12, backgroundColor: '#FFFBEB', border: '1px solid #FDE68A',
              borderRadius: 12, marginTop: 4,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <AlertTriangle style={{ width: 12, height: 12, color: '#F59E0B' }} />
                <span style={{ fontSize: 10, fontWeight: 700, color: '#92400E' }}>Privacy Disclaimer</span>
              </div>
              <p style={{ fontSize: 10, color: '#B45309', lineHeight: 1.5 }}>
                Segala bentuk kebocoran data atau penyalahgunaan informasi medis yang terjadi di luar sistem Aexon adalah sepenuhnya di luar tanggung jawab Aexon.
              </p>
            </div>
          </div>
        </div>

        {/* Right Preview Panel */}
        <div
          ref={printAreaRef}
          className="print:p-0 print:bg-white print:block print:overflow-visible custom-scrollbar"
          style={{
            flex: 1, backgroundColor: '#F1F5F9', overflowY: 'auto',
            padding: 32, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 48,
          }}
        >
          {pages.map((page) => (
            <div 
              key={page.id}
              className={`print-container print:opacity-100 print:grayscale-0 print:scale-100 print:ring-0 print:shadow-none`}
              style={{ 
                backgroundColor: '#ffffff',
                borderRadius: 8,
                boxShadow: activePageId === page.id
                  ? '0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)'
                  : '0 4px 20px rgba(0,0,0,0.06)',
                padding: 60,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 500ms',
                opacity: activePageId === page.id ? 1 : 0.3,
                filter: activePageId === page.id ? 'none' : 'grayscale(1)',
                transform: activePageId === page.id ? 'scale(1)' : 'scale(0.95)',
                width: getPageDimensions(page).width, 
                minHeight: getPageDimensions(page).minHeight,
                cursor: activePageId !== page.id ? 'pointer' : 'default',
              }}
              onClick={() => { if (activePageId !== page.id) setActivePageId(page.id); }}
            >
              
              {/* Navy Top Accent Bar */}
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#0C1E35]" />

              {/* Report Header */}
              <div className="border-b-2 border-[#0C1E35] pb-4 mb-4 flex justify-between items-start print-header mt-2">
                <div className="flex items-center">
                  {page.reportType === 'clinical' && selectedHospital?.logoUrl && (
                    <img src={selectedHospital.logoUrl} alt="Hospital Logo" className="h-20 w-auto mr-6 object-contain" />
                  )}
                  <div>
                    <h1 className="text-2xl font-black text-[#0C1E35] tracking-tight mb-1 uppercase">
                      {page.reportType === 'clinical' ? 'Laporan Endoskopi' : 'Academic Case Report'}
                    </h1>
                    {page.reportType === 'clinical' && selectedHospital ? (
                      <div>
                        <p className="text-[#0C1E35] font-black text-base leading-tight">{selectedHospital.name}</p>
                        <p className="text-slate-600 text-xs mt-1 max-w-md leading-relaxed">{selectedHospital.address}</p>
                        <div className="flex flex-wrap gap-x-4 text-[#0C1E35]/60 text-[10px] mt-2 font-bold uppercase tracking-wider">
                          {selectedHospital.phone && <span>Telp: {selectedHospital.phone}</span>}
                          {selectedHospital.fax && <span>Fax: {selectedHospital.fax}</span>}
                          {selectedHospital.website && <span>Web: {selectedHospital.website}</span>}
                          {selectedHospital.email && <span>Email: {selectedHospital.email}</span>}
                        </div>
                      </div>
                    ) : page.reportType === 'clinical' ? (
                      <p className="text-slate-400 text-xs mt-1 italic">Kop surat belum dikonfigurasi.</p>
                    ) : (
                      <p className="text-[#0C1E35]/60 font-bold text-sm uppercase tracking-widest">Aexon Medical Documentation</p>
                    )}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-[#0C1E35]/50 uppercase tracking-widest mb-1">Waktu Tindakan</p>
                  <p className="text-xs font-black text-[#0C1E35]">
                    {session.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {page.reportType === 'clinical' && (
                    <p className="text-[10px] font-bold text-[#0C1E35]/70 mt-0.5">
                      Pukul {session.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </p>
                  )}
                </div>
              </div>

              {/* Patient Data / Redacted Data */}
              <div className="bg-[#0C1E35]/[0.03] border border-[#0C1E35]/10 rounded-lg p-3 mb-4 print-patient-info">
                {page.reportType === 'clinical' ? (
                  <div className="grid grid-cols-3 gap-y-1.5 gap-x-6 text-[10px]">
                    <div>
                      <span className="text-[#0C1E35]/50 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Nama Pasien</span>
                      <span className="font-bold text-[#0C1E35] text-xs">{session.patient.name}</span>
                    </div>
                    <div>
                      <span className="text-[#0C1E35]/50 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">No. Rekam Medis</span>
                      <span className="font-bold text-[#0C1E35] text-xs">{session.patient.rmNumber}</span>
                    </div>
                    <div>
                      <span className="text-[#0C1E35]/50 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Jenis Kelamin</span>
                      <span className="font-bold text-[#0C1E35] text-xs">{session.patient.gender}</span>
                    </div>
                    <div>
                      <span className="text-[#0C1E35]/50 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Tanggal Lahir</span>
                      <span className="font-bold text-[#0C1E35] text-xs">{session.patient.dob}</span>
                    </div>
                    <div>
                      <span className="text-[#0C1E35]/50 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Usia Pasien</span>
                      <span className="font-bold text-[#0C1E35] text-xs">{calculateAge(session.patient.dob)}</span>
                    </div>
                    <div>
                      <span className="text-[#0C1E35]/50 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Kategori / Lokasi</span>
                      <span className="font-bold text-[#0C1E35] text-xs">{session.patient.category}</span>
                    </div>
                    <div className="col-span-3 pt-1.5 border-t border-[#0C1E35]/10 mt-1 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[#0C1E35]/50 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Dokter Operator</span>
                        <span className="font-bold text-[#0C1E35] text-xs">{session.patient.operator}</span>
                      </div>
                      <div>
                        <span className="text-[#0C1E35]/50 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Tindakan</span>
                        <ul className="list-disc list-inside font-bold text-[#0C1E35] text-[10px]">
                          {session.patient.procedures.filter(p => p).map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="col-span-2 pt-1.5 border-t border-[#0C1E35]/10">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-[#0C1E35]/50 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Diagnosis Utama</span>
                            <span className="font-bold text-[#0C1E35] text-[10px]">{session.patient.diagnosis || '-'}</span>
                          </div>
                          <div>
                            <span className="text-[#0C1E35]/50 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Diagnosis Banding</span>
                            <span className="font-bold text-[#0C1E35] text-[10px]">{session.patient.differentialDiagnosis || '-'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex items-center text-amber-600 bg-amber-50 p-1.5 rounded border border-amber-200 mb-1">
                      <ShieldAlert className="w-3.5 h-3.5 mr-2" />
                      <span className="text-[10px] font-medium">PII Redacted for Academic Use (Gender Preserved)</span>
                    </div>
                    <div className="grid grid-cols-3 gap-y-1.5 gap-x-6 text-[10px]">
                      <div>
                        <span className="text-slate-500 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Case ID</span>
                        <span className="font-bold text-slate-900 font-mono text-xs">{caseId}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Jenis Kelamin</span>
                        <span className="font-bold text-slate-900 text-xs">{session.patient.gender === 'Laki-laki' ? 'M' : 'F'}</span>
                      </div>
                      <div className="col-span-3 pt-1.5 border-t border-slate-200 mt-1">
                        <span className="text-slate-500 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Prosedur Utama</span>
                        <span className="font-bold text-slate-900 text-xs">{session.patient.procedures[0] || '-'}</span>
                      </div>
                      <div className="col-span-3 pt-1.5 border-t border-slate-100">
                        <span className="text-slate-500 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Diagnosis Akademik</span>
                        <span className="font-bold text-slate-900 text-xs">{session.patient.diagnosis || '-'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Photo Grid */}
              <div className="mb-4 print-section">
                <h3 className="text-sm font-bold text-[#0C1E35] border-b-2 border-[#0C1E35]/20 pb-1 mb-2 print-section-title flex items-center">
                  <span className="w-1 h-4 bg-[#0C1E35] rounded-full mr-2 inline-block" />
                  {page.reportLayout === 'beforeAfter' ? 'Dokumentasi Before / After Surgery' : 
                   page.reportLayout === 'rightLeft' ? 'Dokumentasi Perbandingan Kanan / Kiri' : 
                   'Dokumentasi Visual'}
                </h3>
                {page.selectedPhotos.length > 0 ? (
                  <div className={`grid gap-3 print-grid ${page.reportLayout === 'standard' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {page.selectedPhotos.map((photo, index) => (
                      <div key={photo.id} className="space-y-1.5 print-photo-card">
                        <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-[#0C1E35]/15">
                          <img src={photo.url} alt={`Capture ${index + 1}`} className="w-full h-full object-cover" />
                          {page.reportLayout !== 'standard' && (
                            <div className="absolute top-2 left-2 px-2 py-1 bg-[#0C1E35]/80 backdrop-blur-sm rounded text-[8px] font-black text-white uppercase tracking-widest">
                              {page.reportLayout === 'beforeAfter' 
                                ? (index % 2 === 0 ? 'Before' : 'After')
                                : (index % 2 === 0 ? 'Kanan' : 'Kiri')}
                            </div>
                          )}
                        </div>
                        {page.photoCaptions[photo.id] && (
                          <div className="bg-[#0C1E35]/[0.03] border border-[#0C1E35]/10 rounded-md p-1.5 min-h-[30px]">
                            <p className="text-[8px] leading-tight font-medium text-slate-700 whitespace-pre-wrap break-words">
                              {page.photoCaptions[photo.id]}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    height: 96, backgroundColor: '#F8FAFC', border: '1px dashed #CBD5E1',
                    borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <p style={{ fontSize: 12, color: '#94A3B8' }}>Tidak ada foto yang dipilih</p>
                  </div>
                )}
              </div>

              {/* Video Documentation Section */}
              {activePage.selectedVideos.length > 0 && (
                <div className="mb-4 print-section">
                  <h3 className="text-sm font-bold text-[#0C1E35] border-b-2 border-[#0C1E35]/20 pb-1 mb-2 print-section-title flex items-center">
                    <span className="w-1 h-4 bg-[#0C1E35] rounded-full mr-2 inline-block" />
                    Dokumentasi Video
                  </h3>
                  <div className="grid grid-cols-2 gap-3 print-grid">
                    {activePage.selectedVideos.map((video, index) => (
                      <div key={video.id} className="space-y-1.5 print-photo-card">
                        <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center">
                          <Video className="w-8 h-8 text-slate-300" />
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/5">
                            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Video {index + 1}</span>
                            <span className="text-[8px] text-slate-400 mt-1">{video.timestamp.toLocaleTimeString()}</span>
                          </div>
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-md p-1.5 text-center">
                          <p className="text-[8px] leading-tight font-bold text-slate-500 uppercase tracking-tighter">
                            Tersedia dalam format digital (H.265 HEVC)
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Clinical Notes */}
              <div className="mb-4 flex-1 print-section">
                <h3 className="text-sm font-bold text-[#0C1E35] border-b-2 border-[#0C1E35]/20 pb-1 mb-2 print-section-title flex items-center">
                  <span className="w-1 h-4 bg-[#0C1E35] rounded-full mr-2 inline-block" />
                  Catatan Klinis
                </h3>
                <div className="prose prose-sm prose-slate max-w-none text-[10px]">
                  {page.clinicalNotes ? (
                    <p className="whitespace-pre-wrap text-slate-700 leading-tight">{page.clinicalNotes}</p>
                  ) : (
                    <p className="text-slate-400 italic">Tidak ada catatan klinis.</p>
                  )}
                </div>
              </div>

              {/* Signature Area */}
              {page.reportType === 'clinical' && (
                <div className="mt-auto pt-4 flex justify-end">
                  <div className="text-center w-48">
                    <p className="text-[10px] text-[#0C1E35]/60 mb-8">Dokter Pemeriksa,</p>
                    <div className="border-b-2 border-[#0C1E35]/30 mb-1" />
                    <p className="font-bold text-[#0C1E35] text-xs">{session.patient.operator}</p>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 pt-3 border-t-2 border-[#0C1E35]/15 text-center text-[10px] text-[#0C1E35]/40 flex items-center justify-center gap-2">
                <span className="w-6 h-[2px] bg-[#0C1E35]/20 inline-block" />
                <p>Dihasilkan oleh <span className="font-aexon text-[#0C1E35]/60">Aexon</span> • {new Date().toLocaleString('id-ID')} • Halaman {pages.indexOf(page) + 1} dari {pages.length}</p>
                <span className="w-6 h-[2px] bg-[#0C1E35]/20 inline-block" />
              </div>

              {/* Navy Bottom Accent */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-[#0C1E35]/30" />
            </div>
          ))}

          {/* Page indicator */}
          <p style={{ fontSize: 12, color: '#94A3B8', textAlign: 'center', marginTop: -32 }}>
            Halaman {pages.findIndex(p => p.id === activePageId) + 1} dari {pages.length}
          </p>
        </div>
      </div>

      {/* Modals */}
      {editingPhoto && (
        <ImageEditor
          imageUrl={editingPhoto.originalUrl || editingPhoto.url}
          initialShapes={editingPhoto.shapes}
          onClose={() => setEditingPhoto(null)}
          onSave={(editedUrl, shapes) => {
            const updatedPhotos = activePage.selectedPhotos.map(p => 
              p.id === editingPhoto.id ? { 
                ...p, 
                url: editedUrl, 
                originalUrl: p.originalUrl || editingPhoto.url,
                shapes: shapes 
              } : p
            );
            updateActivePage({ selectedPhotos: updatedPhotos });
            setEditingPhoto(null);
          }}
        />
      )}

      <AnimatePresence>
        {pageToDelete && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPageToDelete(null)}
              style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                position: 'relative', backgroundColor: '#ffffff', borderRadius: 24,
                padding: 32, maxWidth: 380, width: '100%',
                boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{
                width: 56, height: 56, backgroundColor: '#FEF2F2', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <Trash2 style={{ width: 28, height: 28, color: '#EF4444' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#0C1E35', textAlign: 'center', marginBottom: 8 }}>Hapus Halaman?</h3>
              <p style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 1.5 }}>
                Halaman ini sudah berisi data. Apakah Anda yakin ingin menghapusnya?
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => setPageToDelete(null)}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
                    border: '1px solid #E2E8F0', backgroundColor: '#ffffff', color: '#64748B',
                    cursor: 'pointer', transition: 'background-color 150ms',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  Batal
                </button>
                <button
                  onClick={() => { deletePage(pageToDelete); setPageToDelete(null); }}
                  style={{
                    flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 700, fontSize: 14,
                    border: 'none', backgroundColor: '#EF4444', color: '#ffffff',
                    cursor: 'pointer', transition: 'background-color 150ms',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#DC2626'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EF4444'}
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
