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
      const wrapperEls = printAreaRef.current.querySelectorAll('.print-page-wrapper') as NodeListOf<HTMLElement>;
      const containerEls = printAreaRef.current.querySelectorAll('.print-container') as NodeListOf<HTMLElement>;
      if (containerEls.length === 0) return;

      const savedWrapperStyles: string[] = [];
      wrapperEls.forEach((el) => {
        savedWrapperStyles.push(el.style.cssText);
        el.style.opacity = '1';
        el.style.filter = 'none';
        el.style.transform = 'none';
      });

      const savedContainerStyles: string[] = [];
      containerEls.forEach((el) => {
        savedContainerStyles.push(el.style.cssText);
        el.style.boxShadow = 'none';
        el.style.borderRadius = '0';
        (el as any).style.outline = 'none';
      });

      let pdf: jsPDF | null = null;

      try {
        for (let i = 0; i < containerEls.length; i++) {
          const el = containerEls[i];
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

          const canvasAspect = canvas.width / canvas.height;
          const pageAspect = pdfWidth / pdfHeight;
          let imgW = pdfWidth;
          let imgH = pdfHeight;
          let imgX = 0;
          let imgY = 0;

          if (canvasAspect > pageAspect) {
            imgH = pdfWidth / canvasAspect;
            imgY = 0;
          } else {
            imgW = pdfHeight * canvasAspect;
            imgX = (pdfWidth - imgW) / 2;
          }

          pdf!.addImage(imgData, 'JPEG', imgX, imgY, imgW, imgH);
        }

        const fileName = `Laporan_Endoskopi_${session.patient.name.replace(/\s+/g, '_')}_${session.date.toLocaleDateString('id-ID').replace(/\//g, '-')}.pdf`;
        pdf!.save(fileName);
      } finally {
        wrapperEls.forEach((el, i) => {
          el.style.cssText = savedWrapperStyles[i];
        });
        containerEls.forEach((el, i) => {
          el.style.cssText = savedContainerStyles[i];
        });
      }
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
            width: 100% !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #root, #root > *, #root > * > * {
            overflow: visible !important;
            height: auto !important;
            display: block !important;
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .print-hide {
            display: none !important;
          }
          #print-area-wrapper {
            display: block !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            overflow: visible !important;
            width: 100% !important;
            height: auto !important;
            flex: none !important;
            gap: 0 !important;
          }
          .print-page-wrapper {
            opacity: 1 !important;
            filter: none !important;
            transform: none !important;
            position: static !important;
            display: block !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-container { 
            width: 100% !important;
            max-width: 100% !important;
            min-height: auto !important;
            height: auto !important;
            box-shadow: none !important; 
            border-radius: 0 !important;
            margin: 0 !important; 
            padding: 10mm !important; 
            page-break-after: always;
            page-break-inside: avoid;
            background: white !important;
            color: black !important;
            opacity: 1 !important;
            filter: none !important;
            transform: none !important;
            overflow: visible !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
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
      <header className="print:hidden print-hide" style={{
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
      <div className="print:hidden print-hide" style={{
        backgroundColor: '#ffffff', borderBottom: '1px solid #E2E8F0',
        padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0, overflowX: 'auto',
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
              whiteSpace: 'nowrap', flexShrink: 0,
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
            whiteSpace: 'nowrap', flexShrink: 0,
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
        <div className="print:hidden print-hide custom-scrollbar" style={{
          width: 288, backgroundColor: '#ffffff', borderRight: '1px solid #E2E8F0',
          padding: 20, overflowY: 'auto', flexShrink: 0,
          display: 'flex', flexDirection: 'column', gap: 20,
        }}>
          {/* Page Name */}
          <div>
            <div style={sectionLabelStyle}>Nama Halaman</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
              <input
                type="text"
                value={activePage.name}
                onChange={(e) => updateActivePage({ name: e.target.value })}
                style={{
                  flex: 1, minWidth: 0, padding: '10px 14px', backgroundColor: '#F8FAFC',
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
                    padding: '0 12px', backgroundColor: '#FEF2F2', color: '#DC2626',
                    border: '1px solid #FECACA', borderRadius: 12, fontSize: 11,
                    fontWeight: 700, cursor: 'pointer', transition: 'all 150ms',
                    fontFamily: 'Outfit, sans-serif',
                    flexShrink: 0, whiteSpace: 'nowrap',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EF4444'; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; e.currentTarget.style.color = '#DC2626'; }}
                >
                  <Trash2 style={{ width: 14, height: 14 }} />
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
          id="print-area-wrapper"
          ref={printAreaRef}
          className="print:p-0 print:bg-white print:block print:overflow-visible custom-scrollbar"
          style={{
            flex: 1, backgroundColor: '#E8ECF1', overflowY: 'auto',
            padding: 40, display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 48,
          }}
        >
          {pages.map((page) => {
            const isActive = activePageId === page.id;
            const pageIdx = pages.indexOf(page);
            return (
            <div
              key={page.id}
              className="print-page-wrapper"
              style={{
                position: 'relative',
                transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: isActive ? 1 : 0.25,
                filter: isActive ? 'none' : 'grayscale(1)',
                transform: isActive ? 'scale(1)' : 'scale(0.93)',
                cursor: isActive ? 'default' : 'pointer',
              }}
              onClick={() => { if (!isActive) setActivePageId(page.id); }}
            >
              <div
                className={`print-container print:opacity-100 print:grayscale-0 print:scale-100 print:ring-0 print:shadow-none`}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 4,
                  boxShadow: isActive
                    ? '0 25px 60px rgba(12,30,53,0.18), 0 8px 20px rgba(12,30,53,0.08), 0 0 0 1px rgba(12,30,53,0.04)'
                    : '0 4px 16px rgba(0,0,0,0.06)',
                  padding: '48px 52px 40px',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  width: getPageDimensions(page).width,
                  minHeight: getPageDimensions(page).minHeight,
                }}
              >
                {/* Top accent bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 5,
                  background: 'linear-gradient(90deg, #0C1E35 0%, #1a3a5c 40%, #0C1E35 100%)',
                }} />

                {/* Report Header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  paddingBottom: 16, marginBottom: 16, marginTop: 4,
                  borderBottom: '2.5px solid #0C1E35',
                }} className="print-header">
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {page.reportType === 'clinical' && selectedHospital?.logoUrl && (
                      <img src={selectedHospital.logoUrl} alt="Hospital Logo" style={{
                        height: 72, width: 'auto', marginRight: 20, objectFit: 'contain',
                      }} />
                    )}
                    <div>
                      <div style={{
                        fontSize: 9, fontWeight: 800, color: 'rgba(12,30,53,0.4)',
                        textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 4,
                      }}>
                        {page.reportType === 'clinical' ? 'Laporan Medis' : 'Academic Report'}
                      </div>
                      <h1 style={{
                        fontSize: 20, fontWeight: 900, color: '#0C1E35',
                        letterSpacing: '-0.02em', marginBottom: 6, lineHeight: 1.1,
                        textTransform: 'uppercase',
                      }}>
                        {page.reportType === 'clinical' ? 'Laporan Endoskopi' : 'Academic Case Report'}
                      </h1>
                      {page.reportType === 'clinical' && selectedHospital ? (
                        <div>
                          <p style={{ color: '#0C1E35', fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>{selectedHospital.name}</p>
                          <p style={{ color: '#475569', fontSize: 10, marginTop: 3, maxWidth: 340, lineHeight: 1.5 }}>{selectedHospital.address}</p>
                          <div style={{
                            display: 'flex', flexWrap: 'wrap', gap: '0 14px',
                            color: 'rgba(12,30,53,0.5)', fontSize: 8.5, marginTop: 6,
                            fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                          }}>
                            {selectedHospital.phone && <span>Telp: {selectedHospital.phone}</span>}
                            {selectedHospital.fax && <span>Fax: {selectedHospital.fax}</span>}
                            {selectedHospital.website && <span>Web: {selectedHospital.website}</span>}
                            {selectedHospital.email && <span>Email: {selectedHospital.email}</span>}
                          </div>
                        </div>
                      ) : page.reportType === 'clinical' ? (
                        <p style={{ color: '#94A3B8', fontSize: 10, marginTop: 2, fontStyle: 'italic' }}>Kop surat belum dikonfigurasi.</p>
                      ) : (
                        <p style={{ color: 'rgba(12,30,53,0.5)', fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.15em' }}>Aexon Medical Documentation</p>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, paddingTop: 2 }}>
                    <div style={{
                      backgroundColor: 'rgba(12,30,53,0.04)', borderRadius: 8,
                      padding: '10px 14px', border: '1px solid rgba(12,30,53,0.06)',
                    }}>
                      <p style={{ fontSize: 8, fontWeight: 800, color: 'rgba(12,30,53,0.4)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 4 }}>Waktu Tindakan</p>
                      <p style={{ fontSize: 12, fontWeight: 800, color: '#0C1E35' }}>
                        {session.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      {page.reportType === 'clinical' && (
                        <p style={{ fontSize: 9, fontWeight: 700, color: 'rgba(12,30,53,0.6)', marginTop: 2 }}>
                          Pukul {session.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Patient Data / Redacted Data */}
                <div style={{
                  background: 'linear-gradient(135deg, rgba(12,30,53,0.025) 0%, rgba(12,30,53,0.04) 100%)',
                  border: '1px solid rgba(12,30,53,0.08)',
                  borderRadius: 8, padding: 14, marginBottom: 18,
                }} className="print-patient-info">
                  {page.reportType === 'clinical' ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 20px', fontSize: 10 }}>
                      {[
                        { label: 'Nama Pasien', value: session.patient.name },
                        { label: 'No. Rekam Medis', value: session.patient.rmNumber },
                        { label: 'Jenis Kelamin', value: session.patient.gender },
                        { label: 'Tanggal Lahir', value: session.patient.dob },
                        { label: 'Usia Pasien', value: calculateAge(session.patient.dob) },
                        { label: 'Kategori / Lokasi', value: session.patient.category },
                      ].map((item, i) => (
                        <div key={i}>
                          <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, color: 'rgba(12,30,53,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>{item.label}</span>
                          <span style={{ fontWeight: 700, color: '#0C1E35', fontSize: 11 }}>{item.value}</span>
                        </div>
                      ))}
                      <div style={{ gridColumn: 'span 3', borderTop: '1px solid rgba(12,30,53,0.08)', marginTop: 4, paddingTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                          <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, color: 'rgba(12,30,53,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Dokter Operator</span>
                          <span style={{ fontWeight: 700, color: '#0C1E35', fontSize: 11 }}>{session.patient.operator}</span>
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, color: 'rgba(12,30,53,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Tindakan</span>
                          <ul style={{ listStyleType: 'disc', paddingLeft: 14, margin: 0, fontWeight: 700, color: '#0C1E35', fontSize: 10 }}>
                            {session.patient.procedures.filter(p => p).map((p, i) => (
                              <li key={i}>{p}</li>
                            ))}
                          </ul>
                        </div>
                        <div style={{ gridColumn: 'span 2', borderTop: '1px solid rgba(12,30,53,0.06)', paddingTop: 8 }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                            <div>
                              <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, color: 'rgba(12,30,53,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Diagnosis Utama</span>
                              <span style={{ fontWeight: 700, color: '#0C1E35', fontSize: 10 }}>{session.patient.diagnosis || '-'}</span>
                            </div>
                            <div>
                              <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, color: 'rgba(12,30,53,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Diagnosis Banding</span>
                              <span style={{ fontWeight: 700, color: '#0C1E35', fontSize: 10 }}>{session.patient.differentialDiagnosis || '-'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div style={{
                        display: 'flex', alignItems: 'center', color: '#92400E',
                        backgroundColor: '#FFFBEB', padding: '6px 10px', borderRadius: 6,
                        border: '1px solid #FDE68A', marginBottom: 10,
                      }}>
                        <ShieldAlert style={{ width: 13, height: 13, marginRight: 8, flexShrink: 0 }} />
                        <span style={{ fontSize: 9, fontWeight: 600 }}>PII Redacted for Academic Use (Gender Preserved)</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 20px', fontSize: 10 }}>
                        <div>
                          <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Case ID</span>
                          <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 11, fontFamily: 'monospace' }}>{caseId}</span>
                        </div>
                        <div>
                          <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Jenis Kelamin</span>
                          <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 11 }}>{session.patient.gender === 'Laki-laki' ? 'M' : 'F'}</span>
                        </div>
                        <div style={{ gridColumn: 'span 3', borderTop: '1px solid #E2E8F0', marginTop: 4, paddingTop: 8 }}>
                          <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Prosedur Utama</span>
                          <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 11 }}>{session.patient.procedures[0] || '-'}</span>
                        </div>
                        <div style={{ gridColumn: 'span 3', borderTop: '1px solid #F1F5F9', paddingTop: 8 }}>
                          <span style={{ display: 'block', fontSize: 7.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Diagnosis Akademik</span>
                          <span style={{ fontWeight: 700, color: '#0F172A', fontSize: 11 }}>{session.patient.diagnosis || '-'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Photo Grid */}
                <div style={{ marginBottom: 18 }} className="print-section">
                  <h3 style={{
                    fontSize: 12, fontWeight: 800, color: '#0C1E35',
                    display: 'flex', alignItems: 'center', gap: 8,
                    paddingBottom: 6, marginBottom: 10,
                    borderBottom: '2px solid rgba(12,30,53,0.12)',
                  }} className="print-section-title">
                    <span style={{ width: 3, height: 16, backgroundColor: '#0C1E35', borderRadius: 2, flexShrink: 0, display: 'inline-block' }} />
                    {page.reportLayout === 'beforeAfter' ? 'Dokumentasi Before / After Surgery' :
                     page.reportLayout === 'rightLeft' ? 'Dokumentasi Perbandingan Kanan / Kiri' :
                     'Dokumentasi Visual'}
                  </h3>
                  {page.selectedPhotos.length > 0 ? (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: page.reportLayout === 'standard' ? 'repeat(3, 1fr)' : 'repeat(2, 1fr)',
                      gap: 10,
                    }} className="print-grid">
                      {page.selectedPhotos.map((photo, index) => (
                        <div key={photo.id} className="print-photo-card">
                          <div style={{
                            position: 'relative', aspectRatio: '16/9',
                            backgroundColor: '#F1F5F9', borderRadius: 6,
                            overflow: 'hidden', border: '1px solid rgba(12,30,53,0.1)',
                          }}>
                            <img src={photo.url} alt={`Capture ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {page.reportLayout !== 'standard' && (
                              <div style={{
                                position: 'absolute', top: 6, left: 6,
                                padding: '3px 8px', backgroundColor: 'rgba(12,30,53,0.85)',
                                backdropFilter: 'blur(4px)', borderRadius: 4,
                                fontSize: 7, fontWeight: 900, color: '#ffffff',
                                textTransform: 'uppercase', letterSpacing: '0.15em',
                              }}>
                                {page.reportLayout === 'beforeAfter'
                                  ? (index % 2 === 0 ? 'Before' : 'After')
                                  : (index % 2 === 0 ? 'Kanan' : 'Kiri')}
                              </div>
                            )}
                            <div style={{
                              position: 'absolute', bottom: 4, right: 6,
                              fontSize: 7, fontWeight: 800, color: 'rgba(255,255,255,0.7)',
                              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                            }}>
                              {index + 1}/{page.selectedPhotos.length}
                            </div>
                          </div>
                          {page.photoCaptions[photo.id] && (
                            <div style={{
                              backgroundColor: 'rgba(12,30,53,0.025)',
                              border: '1px solid rgba(12,30,53,0.06)',
                              borderRadius: 4, padding: '5px 8px', marginTop: 5,
                            }}>
                              <p style={{ fontSize: 8, lineHeight: 1.4, fontWeight: 500, color: '#475569', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}>
                                {page.photoCaptions[photo.id]}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{
                      height: 80, backgroundColor: '#FAFBFC', border: '1.5px dashed #CBD5E1',
                      borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>Tidak ada foto yang dipilih</p>
                    </div>
                  )}
                </div>

                {/* Video Documentation Section */}
                {page.selectedVideos.length > 0 && (
                  <div style={{ marginBottom: 18 }} className="print-section">
                    <h3 style={{
                      fontSize: 12, fontWeight: 800, color: '#0C1E35',
                      display: 'flex', alignItems: 'center', gap: 8,
                      paddingBottom: 6, marginBottom: 10,
                      borderBottom: '2px solid rgba(12,30,53,0.12)',
                    }} className="print-section-title">
                      <span style={{ width: 3, height: 16, backgroundColor: '#0C1E35', borderRadius: 2, flexShrink: 0, display: 'inline-block' }} />
                      Dokumentasi Video
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }} className="print-grid">
                      {page.selectedVideos.map((video, index) => (
                        <div key={video.id} className="print-photo-card">
                          <div style={{
                            position: 'relative', aspectRatio: '16/9',
                            backgroundColor: '#F1F5F9', borderRadius: 6,
                            overflow: 'hidden', border: '1px solid #E2E8F0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Video style={{ width: 28, height: 28, color: '#CBD5E1' }} />
                            <div style={{
                              position: 'absolute', inset: 0, display: 'flex',
                              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              backgroundColor: 'rgba(15,23,42,0.03)',
                            }}>
                              <span style={{ fontSize: 9, fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Video {index + 1}</span>
                              <span style={{ fontSize: 7.5, color: '#94A3B8', marginTop: 3 }}>{video.timestamp.toLocaleTimeString()}</span>
                            </div>
                          </div>
                          <div style={{
                            backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9',
                            borderRadius: 4, padding: '4px 8px', textAlign: 'center', marginTop: 5,
                          }}>
                            <p style={{ fontSize: 7.5, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 }}>
                              Tersedia dalam format digital (H.265 HEVC)
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Clinical Notes */}
                <div style={{ marginBottom: 18, flex: 1 }} className="print-section">
                  <h3 style={{
                    fontSize: 12, fontWeight: 800, color: '#0C1E35',
                    display: 'flex', alignItems: 'center', gap: 8,
                    paddingBottom: 6, marginBottom: 10,
                    borderBottom: '2px solid rgba(12,30,53,0.12)',
                  }} className="print-section-title">
                    <span style={{ width: 3, height: 16, backgroundColor: '#0C1E35', borderRadius: 2, flexShrink: 0, display: 'inline-block' }} />
                    Catatan Klinis
                  </h3>
                  <div style={{ fontSize: 10 }}>
                    {page.clinicalNotes ? (
                      <p style={{ whiteSpace: 'pre-wrap', color: '#475569', lineHeight: 1.6, margin: 0 }}>{page.clinicalNotes}</p>
                    ) : (
                      <p style={{ color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>Tidak ada catatan klinis.</p>
                    )}
                  </div>
                </div>

                {/* Signature Area */}
                {page.reportType === 'clinical' && (
                  <div style={{ marginTop: 'auto', paddingTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
                    <div style={{ textAlign: 'center', width: 180 }}>
                      <p style={{ fontSize: 9, color: 'rgba(12,30,53,0.5)', marginBottom: 48 }}>Dokter Pemeriksa,</p>
                      <div style={{ borderBottom: '2px solid rgba(12,30,53,0.25)', marginBottom: 6 }} />
                      <p style={{ fontWeight: 800, color: '#0C1E35', fontSize: 11, margin: 0 }}>{session.patient.operator}</p>
                    </div>
                  </div>
                )}

                {/* Footer */}
                <div style={{
                  marginTop: 24, paddingTop: 12,
                  borderTop: '1.5px solid rgba(12,30,53,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                  <span style={{ width: 20, height: 1.5, backgroundColor: 'rgba(12,30,53,0.15)', display: 'inline-block' }} />
                  <p style={{ fontSize: 8, color: 'rgba(12,30,53,0.35)', fontWeight: 600, margin: 0 }}>
                    Dihasilkan oleh <span className="font-aexon" style={{ color: 'rgba(12,30,53,0.55)' }}>Aexon</span> &bull; {new Date().toLocaleString('id-ID')} &bull; Halaman {pageIdx + 1} dari {pages.length}
                  </p>
                  <span style={{ width: 20, height: 1.5, backgroundColor: 'rgba(12,30,53,0.15)', display: 'inline-block' }} />
                </div>

                {/* Bottom accent */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 3,
                  background: 'linear-gradient(90deg, transparent 0%, rgba(12,30,53,0.2) 20%, rgba(12,30,53,0.2) 80%, transparent 100%)',
                }} />
              </div>
            </div>
            );
          })}
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
