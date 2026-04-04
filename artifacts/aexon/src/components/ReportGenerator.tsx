import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { FileText, Printer, CheckCircle2, FileImage, ShieldAlert, ArrowLeft, Mail, MessageCircle, Info, AlertTriangle, Download, Video, Camera, Layout, Columns, Grid, Plus, Trash2, ChevronRight, ChevronLeft, Loader2, Save } from 'lucide-react';
import { Session, Capture, HospitalSettings, UserProfile } from '../types';
import ImageEditor from './ImageEditor';
import SessionFlowNav from './SessionFlowNav';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

interface ReportPage {
  id: string;
  name: string;
  reportType: 'clinical' | 'academic';
  reportLayout: 'standard' | 'beforeAfter' | 'rightLeft';
  pageSize: 'A4' | 'F4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  examType: 'endoskopi' | 'mikroskop';
  selectedPhotos: Capture[];
  selectedVideos: Capture[];
  photoCaptions: Record<string, string>;
  clinicalNotes: string;
}

interface SavedReport {
  id: string;
  savedAt: string;
  pdfDataUrl: string;
  pageConfig: ReportPage[];
  hospitalName: string | null;
}

interface ReportGeneratorProps {
  session: Session;
  onBack: () => void;
  hospitalSettingsList: HospitalSettings[];
  userProfile: UserProfile;
  plan: 'subscription' | 'enterprise' | 'trial' | null;
  onUpdateSession?: (session: Session) => void;
}

export default function ReportGenerator({ session, onBack, hospitalSettingsList, userProfile, plan, onUpdateSession }: ReportGeneratorProps) {
  const [pages, setPages] = useState<ReportPage[]>([
    {
      id: 'page-1',
      name: 'Halaman 1',
      reportType: 'clinical',
      reportLayout: 'standard',
      pageSize: 'A4',
      orientation: 'portrait',
      examType: 'endoskopi',
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
  const [previewZoom, setPreviewZoom] = useState(0.6);
  const [mediaFilter, setMediaFilter] = useState<'all' | 'photos' | 'videos'>('all');
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
      examType: 'endoskopi',
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
      ? { width: height, height: width } 
      : { width, height };
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
    handleSavePDF();
  };

  const handleSavePDF = async () => {
    if (!printAreaRef.current || isSaving) return;
    setIsSaving(true);

    // Reset document zoom agar html2canvas akurat
    const savedZoom = document.documentElement.style.zoom;
    document.documentElement.style.zoom = '1';

    // Tunggu reflow selesai
    await new Promise(r => setTimeout(r, 100));

    try {
      const wrapperEls = printAreaRef.current.querySelectorAll('.print-page-wrapper') as NodeListOf<HTMLElement>;
      const containerEls = printAreaRef.current.querySelectorAll('.print-container') as NodeListOf<HTMLElement>;
      if (containerEls.length === 0) {
        document.documentElement.style.zoom = savedZoom;
        setIsSaving(false);
        return;
      }

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
            windowWidth: el.scrollWidth,
            windowHeight: el.scrollHeight,
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
        
        // Electron: simpan PDF + config ke encrypted disk storage
        if (window.aexonStorage && pdf) {
          try {
            const reportId = `rpt_${Date.now()}`;
            const pdfData = new Uint8Array(pdf.output('arraybuffer'));
            const configJson = JSON.stringify({ pages, selectedHospital });
            await window.aexonStorage.saveReport(session.id, reportId, pdfData, configJson);
            console.log(`[Electron] Report ${reportId} saved`);
          } catch (err) {
            console.warn('[Electron] Failed to save report:', err);
          }
        }

        // Filename confidential (tanpa nama pasien)
        const rndCode = (Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 4)).toUpperCase();
        const fileName = `RPT-${rndCode}.pdf`;

        // Coba Electron save dialog
        try {
          const electron = (window as any).require?.('electron');
          if (electron?.remote?.dialog || (window as any).electronAPI) {
            const dialog = electron?.remote?.dialog;
            if (dialog) {
              const result = await dialog.showSaveDialog({
                defaultPath: fileName,
                filters: [{ name: 'PDF', extensions: ['pdf'] }],
              });
              if (!result.canceled && result.filePath) {
                const fs = electron.remote.require('fs');
                const pdfOutput = pdf!.output('arraybuffer');
                fs.writeFileSync(result.filePath, Buffer.from(pdfOutput));
              }
            } else {
              pdf!.save(fileName);
            }
          } else {
            pdf!.save(fileName);
          }
        } catch {
          pdf!.save(fileName);
        }
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
      // Restore document zoom
      document.documentElement.style.zoom = savedZoom;
      setIsSaving(false);
    }
  };

  const handleEmail = async () => {
    if (!printAreaRef.current) return;
    setIsSaving(true);
    const savedZoom = document.documentElement.style.zoom;
    document.documentElement.style.zoom = '1';
    await new Promise(r => setTimeout(r, 100));

    try {
      const wrapperEls = printAreaRef.current.querySelectorAll('.print-page-wrapper') as NodeListOf<HTMLElement>;
      const containerEls = printAreaRef.current.querySelectorAll('.print-container') as NodeListOf<HTMLElement>;
      if (containerEls.length === 0) return;

      const savedWrapperStyles: string[] = [];
      wrapperEls.forEach((el) => { savedWrapperStyles.push(el.style.cssText); el.style.opacity = '1'; el.style.filter = 'none'; el.style.transform = 'none'; });
      const savedContainerStyles: string[] = [];
      containerEls.forEach((el) => { savedContainerStyles.push(el.style.cssText); el.style.boxShadow = 'none'; el.style.borderRadius = '0'; (el as any).style.outline = 'none'; });

      let pdf: jsPDF | null = null;
      try {
        for (let i = 0; i < containerEls.length; i++) {
          const el = containerEls[i];
          const page = pages[i];
          const isLandscape = page.orientation === 'landscape';
          const format = page.pageSize === 'F4' ? [215, 330] as [number, number] : page.pageSize === 'Letter' ? 'letter' as const : 'a4' as const;
          const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: el.scrollWidth, windowHeight: el.scrollHeight });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          if (i === 0) { pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm', format }); }
          else { pdf!.addPage(format, isLandscape ? 'landscape' : 'portrait'); }
          const pdfW = pdf!.internal.pageSize.getWidth();
          const pdfH = pdf!.internal.pageSize.getHeight();
          const cA = canvas.width / canvas.height;
          const pA = pdfW / pdfH;
          let iW = pdfW, iH = pdfH, iX = 0, iY = 0;
          if (cA > pA) { iH = pdfW / cA; } else { iW = pdfH * cA; iX = (pdfW - iW) / 2; }
          pdf!.addImage(imgData, 'JPEG', iX, iY, iW, iH);
        }

        const rndCode = (Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 4)).toUpperCase();
        const fileName = `RPT-${rndCode}.pdf`;
        const pdfBlob = pdf!.output('blob');
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        // Coba Web Share API (kirim file langsung ke email app)
        if (navigator.canShare?.({ files: [pdfFile] })) {
          await navigator.share({
            files: [pdfFile],
            title: `Laporan ${activePage.examType === 'mikroskop' ? 'Mikroskop' : 'Endoskopi'}`,
          });
        } else {
          // Fallback: download PDF lalu buka email
          pdf!.save(fileName);
          const examLabel = activePage.examType === 'mikroskop' ? 'Mikroskop' : 'Endoskopi';
          const subject = encodeURIComponent(`Laporan ${examLabel} - ${session.date.toLocaleDateString('id-ID')}`);
          const body = encodeURIComponent(`Yth. Sejawat,\n\nTerlampir laporan ${examLabel.toLowerCase()}.\n\nSalam,\n${userProfile.name}`);
          window.location.href = `mailto:?subject=${subject}&body=${body}`;
        }
      } finally {
        wrapperEls.forEach((el, i) => { el.style.cssText = savedWrapperStyles[i]; });
        containerEls.forEach((el, i) => { el.style.cssText = savedContainerStyles[i]; });
      }
    } catch (err) {
      console.error('Email share error:', err);
    } finally {
      document.documentElement.style.zoom = savedZoom;
      setIsSaving(false);
    }
  };

  const handleWhatsApp = async () => {
    if (!printAreaRef.current) return;

    // Generate PDF dulu
    setIsSaving(true);
    const savedZoom = document.documentElement.style.zoom;
    document.documentElement.style.zoom = '1';
    await new Promise(r => setTimeout(r, 100));

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
          const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: el.scrollWidth, windowHeight: el.scrollHeight });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          if (i === 0) { pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm', format }); }
          else { pdf!.addPage(format, isLandscape ? 'landscape' : 'portrait'); }
          const pdfW = pdf!.internal.pageSize.getWidth();
          const pdfH = pdf!.internal.pageSize.getHeight();
          const cA = canvas.width / canvas.height;
          const pA = pdfW / pdfH;
          let iW = pdfW, iH = pdfH, iX = 0, iY = 0;
          if (cA > pA) { iH = pdfW / cA; } else { iW = pdfH * cA; iX = (pdfW - iW) / 2; }
          pdf!.addImage(imgData, 'JPEG', iX, iY, iW, iH);
        }

        const rndCode = (Math.random().toString(36).substring(2, 8) + Math.random().toString(36).substring(2, 4)).toUpperCase();
        const fileName = `RPT-${rndCode}.pdf`;

        // Buat File object dari PDF
        const pdfBlob = pdf!.output('blob');
        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

        // Coba Web Share API (kirim file langsung ke WhatsApp)
        if (navigator.canShare?.({ files: [pdfFile] })) {
          await navigator.share({ files: [pdfFile] });
        } else {
          // Fallback: simpan PDF lalu buka WhatsApp
          pdf!.save(fileName);
          window.open('https://web.whatsapp.com/', '_blank');
        }
      } finally {
        wrapperEls.forEach((el, i) => { el.style.cssText = savedWrapperStyles[i]; });
        containerEls.forEach((el, i) => { el.style.cssText = savedContainerStyles[i]; });
      }
    } catch (err) {
      console.error('WhatsApp share error:', err);
    } finally {
      document.documentElement.style.zoom = savedZoom;
      setIsSaving(false);
    }
  };

  const [savingReport, setSavingReport] = useState(false);

  const handleSaveReportSnapshot = async () => {
    if (!printAreaRef.current || savingReport) return;
    setSavingReport(true);

    const savedZoom = document.documentElement.style.zoom;
    document.documentElement.style.zoom = '1';
    await new Promise(r => setTimeout(r, 100));

    try {
      const containerEls = printAreaRef.current.querySelectorAll('.print-container') as NodeListOf<HTMLElement>;
      const wrapperEls = printAreaRef.current.querySelectorAll('.print-page-wrapper') as NodeListOf<HTMLElement>;
      if (containerEls.length === 0) return;

      const savedWrapperStyles: string[] = [];
      wrapperEls.forEach((el) => { savedWrapperStyles.push(el.style.cssText); el.style.opacity = '1'; el.style.filter = 'none'; el.style.transform = 'none'; });
      const savedContainerStyles: string[] = [];
      containerEls.forEach((el) => { savedContainerStyles.push(el.style.cssText); el.style.boxShadow = 'none'; el.style.borderRadius = '0'; (el as any).style.outline = 'none'; });

      let pdf: jsPDF | null = null;
      try {
        for (let i = 0; i < containerEls.length; i++) {
          const el = containerEls[i];
          const page = pages[i];
          const isLandscape = page.orientation === 'landscape';
          const format = page.pageSize === 'F4' ? [215, 330] as [number, number] : page.pageSize === 'Letter' ? 'letter' as const : 'a4' as const;
          const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false, windowWidth: el.scrollWidth, windowHeight: el.scrollHeight });
          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          if (i === 0) { pdf = new jsPDF({ orientation: isLandscape ? 'landscape' : 'portrait', unit: 'mm', format }); }
          else { pdf!.addPage(format, isLandscape ? 'landscape' : 'portrait'); }
          const pdfW = pdf!.internal.pageSize.getWidth();
          const pdfH = pdf!.internal.pageSize.getHeight();
          const cA = canvas.width / canvas.height;
          const pA = pdfW / pdfH;
          let iW = pdfW, iH = pdfH, iX = 0, iY = 0;
          if (cA > pA) { iH = pdfW / cA; } else { iW = pdfH * cA; iX = (pdfW - iW) / 2; }
          pdf!.addImage(imgData, 'JPEG', iX, iY, iW, iH);
        }

        if (pdf) {
          const pdfDataUrl = pdf.output('datauristring');
          const reportSnapshot: SavedReport = {
            id: `rpt_${Date.now()}`,
            savedAt: new Date().toISOString(),
            pdfDataUrl,
            pageConfig: pages.map(p => ({ ...p })),
            hospitalName: selectedHospital?.name || null,
          };

          // Tambahkan ke session.savedReports (append, bukan replace — history versioning)
          const existingReports: SavedReport[] = (session as any).savedReports || [];
          const updatedSession = {
            ...session,
            savedReports: [...existingReports, reportSnapshot],
          };
          onUpdateSession?.(updatedSession as Session);
          // Navigate ke profil pasien setelah simpan
          onBack();
        }
      } finally {
        wrapperEls.forEach((el, i) => { el.style.cssText = savedWrapperStyles[i]; });
        containerEls.forEach((el, i) => { el.style.cssText = savedContainerStyles[i]; });
      }
    } catch (err) {
      console.error('Save report snapshot error:', err);
    } finally {
      document.documentElement.style.zoom = savedZoom;
      setSavingReport(false);
    }
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
          html {
            zoom: 1 !important;
          }
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
          #root > * > * > aside,
          header,
          .print-hide,
          nav {
            display: none !important;
          }
          #root, #root > *, #root > * > *, #root > * > * > * {
            overflow: visible !important;
            height: auto !important;
            display: block !important;
            position: static !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            flex: none !important;
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
            width: 100% !important;
          }
          .print-container {
            width: 100% !important;
            max-width: 100% !important;
            height: 100vh !important;
            max-height: 100vh !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            page-break-after: always;
            page-break-inside: avoid;
            break-inside: avoid;
            background: white !important;
            color: black !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .print-photo-card {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-grid {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-container:last-child {
            page-break-after: auto;
          }
          .print-header {
            margin-bottom: 3mm !important;
            padding-bottom: 2mm !important;
          }
          .print-section {
            break-inside: avoid;
          }
          .print-grid {
            gap: 2mm !important;
          }
        }
      `}} />

      {/* Session Flow Navigation */}
      <SessionFlowNav
        currentStep="report-generator"
        onBack={onBack}
        backLabel="Kembali"
      />

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
        {/* Left Settings Panel — Redesigned */}
        <div className="print:hidden print-hide custom-scrollbar" style={{
          width: 300, backgroundColor: '#ffffff', borderRight: '1px solid #E8ECF1',
          overflowY: 'auto', flexShrink: 0,
          display: 'flex', flexDirection: 'column',
          fontFamily: "'Plus Jakarta Sans', sans-serif",
        }}>

          {/* ① PENGATURAN DOKUMEN */}
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #F1F5F9' }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Pengaturan Dokumen</p>

            {/* Kop Surat */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' }}>Kop Surat</label>
              {isEnterprise ? (
                selectedHospital ? (
                  <div style={{ padding: '8px 12px', backgroundColor: '#F4F6F8', borderRadius: 10, border: '1px solid #E8ECF1' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#0C1E35', margin: 0 }}>{selectedHospital.name}</p>
                  </div>
                ) : (
                  <div style={{ padding: '8px 12px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <AlertTriangle style={{ width: 12, height: 12, color: '#F59E0B' }} />
                    <p style={{ fontSize: 11, color: '#92400E', margin: 0 }}>Belum dikonfigurasi</p>
                  </div>
                )
              ) : hospitalSettingsList.length > 0 ? (
                <div style={{ position: 'relative' }}>
                  <select
                    value={selectedHospital?.id || ''}
                    onChange={(e) => { const h = hospitalSettingsList.find(h => h.id === e.target.value); if (h) setSelectedHospital(h); }}
                    style={{ width: '100%', padding: '8px 12px', backgroundColor: '#F4F6F8', border: '1px solid #E8ECF1', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#0C1E35', outline: 'none', cursor: 'pointer', appearance: 'none' as const, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  >
                    {hospitalSettingsList.map(h => (
                      <option key={h.id} value={h.id}>{h.name || 'Kop Surat'}</option>
                    ))}
                  </select>
                  <ChevronRight style={{ width: 12, height: 12, color: '#94A3B8', position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none' }} />
                </div>
              ) : (
                <p style={{ fontSize: 11, color: '#94A3B8', fontStyle: 'italic' }}>Belum ada kop surat</p>
              )}
            </div>

            {/* Kertas + Orientasi — 1 baris */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1, position: 'relative' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' }}>Kertas</label>
                <select
                  value={activePage.pageSize}
                  onChange={(e) => updateActivePage({ pageSize: e.target.value as 'A4' | 'F4' | 'Letter' })}
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#F4F6F8', border: '1px solid #E8ECF1', borderRadius: 10, fontSize: 11, fontWeight: 600, color: '#0C1E35', outline: 'none', cursor: 'pointer', appearance: 'none' as const, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  <option value="A4">A4</option>
                  <option value="F4">F4 / Folio</option>
                  <option value="Letter">Letter</option>
                    </select>
                    <ChevronRight style={{ width: 12, height: 12, color: '#94A3B8', position: 'absolute', right: 10, bottom: 11, transform: 'rotate(90deg)', pointerEvents: 'none' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' }}>Orientasi</label>
                <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #E8ECF1', overflow: 'hidden' }}>
                  {(['portrait', 'landscape'] as const).map(o => (
                    <button key={o} onClick={() => updateActivePage({ orientation: o })} style={{
                      flex: 1, padding: '7px 0', fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer',
                      backgroundColor: activePage.orientation === o ? '#0C1E35' : '#F4F6F8',
                      color: activePage.orientation === o ? '#fff' : '#64748B',
                      fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 150ms',
                    }}>
                      {o === 'portrait' ? 'Portrait' : 'Landscape'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Jenis Laporan + Layout — 1 baris */}
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' }}>Jenis</label>
                <div style={{ display: 'flex', borderRadius: 10, border: '1px solid #E8ECF1', overflow: 'hidden' }}>
                  {(['clinical', 'academic'] as const).map(t => (
                    <button key={t} onClick={() => updateActivePage({ reportType: t })} style={{
                      flex: 1, padding: '7px 0', fontSize: 10, fontWeight: 700, border: 'none', cursor: 'pointer',
                      backgroundColor: activePage.reportType === t ? '#0C1E35' : '#F4F6F8',
                      color: activePage.reportType === t ? '#fff' : '#64748B',
                      fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'all 150ms',
                    }}>
                      {t === 'clinical' ? 'Klinis' : 'Akademik'}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ flex: 1, position: 'relative' }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' }}>Layout</label>
                <select
                  value={activePage.reportLayout}
                  onChange={(e) => updateActivePage({ reportLayout: e.target.value as any })}
                  style={{ width: '100%', padding: '8px 10px', backgroundColor: '#F4F6F8', border: '1px solid #E8ECF1', borderRadius: 10, fontSize: 11, fontWeight: 600, color: '#0C1E35', outline: 'none', cursor: 'pointer', appearance: 'none' as const, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                >
                  <option value="standard">Standar</option>
                  <option value="beforeAfter">Before-After</option>
                  <option value="rightLeft">Kiri-Kanan</option>
                      </select>
                      <ChevronRight style={{ width: 12, height: 12, color: '#94A3B8', position: 'absolute', right: 10, bottom: 11, transform: 'rotate(90deg)', pointerEvents: 'none' }} />
                    </div>
                  </div>

                  {/* Jenis Pemeriksaan */}
            <div style={{ marginTop: 12, position: 'relative' }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#64748B', marginBottom: 4, display: 'block' }}>Pemeriksaan / Tindakan</label>
              <select
                value={activePage.examType}
                onChange={(e) => updateActivePage({ examType: e.target.value as 'endoskopi' | 'mikroskop' })}
                style={{ width: '100%', padding: '8px 10px', backgroundColor: '#F4F6F8', border: '1px solid #E8ECF1', borderRadius: 10, fontSize: 11, fontWeight: 600, color: '#0C1E35', outline: 'none', cursor: 'pointer', appearance: 'none' as const, fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                <option value="endoskopi">Endoskopi</option>
                <option value="mikroskop">Mikroskop</option>
              </select>
              <ChevronRight style={{ width: 12, height: 12, color: '#94A3B8', position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%) rotate(90deg)', pointerEvents: 'none', marginTop: 10 }} />
            </div>
          </div>

          {/* ② FOTO & VIDEO */}
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #F1F5F9' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Foto & Video</p>
              <span style={{ fontSize: 10, fontWeight: 700, color: '#0D9488' }}>{activePage.selectedPhotos.length}/9</span>
            </div>

            {/* Filter tabs */}
            <div style={{ display: 'flex', borderBottom: '1.5px solid #E8ECF1', marginBottom: 10 }}>
              {([
                { key: 'all' as const, label: 'Semua', count: images.length + videos.length },
                { key: 'photos' as const, label: 'Foto', count: images.length },
                { key: 'videos' as const, label: 'Video', count: videos.length },
              ]).map(f => (
                <button key={f.key} onClick={() => setMediaFilter(f.key)} style={{
                  flex: 1, padding: '6px 0', fontSize: 10, fontWeight: mediaFilter === f.key ? 700 : 500,
                  border: 'none', borderBottom: mediaFilter === f.key ? '2px solid #0D9488' : '2px solid transparent',
                  cursor: 'pointer', backgroundColor: 'transparent', marginBottom: '-1.5px',
                  color: mediaFilter === f.key ? '#0C1E35' : '#94A3B8', fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}>
                  {f.label} <span style={{ fontSize: 9, marginLeft: 2 }}>{f.count}</span>
                </button>
              ))}
            </div>

            {/* Media grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5 }}>
              {(mediaFilter === 'videos' ? videos : mediaFilter === 'photos' ? images : [...images, ...videos]).map(item => {
                const isPhoto = item.type === 'image';
                const isSelected = isPhoto
                  ? !!activePage.selectedPhotos.find(p => p.id === item.id)
                  : !!activePage.selectedVideos.find(p => p.id === item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => isPhoto ? handlePhotoSelect(item) : handleVideoSelect(item)}
                    style={{
                      position: 'relative', aspectRatio: '1', borderRadius: 8,
                      overflow: 'hidden', cursor: 'pointer',
                      border: isSelected ? '2px solid #0D9488' : '2px solid transparent',
                      transition: 'border-color 150ms',
                    }}
                  >
                    {isPhoto ? (
                      <img src={item.dataUrl || item.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : item.thumbnail ? (
                      <img src={item.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #0f1623, #1a2a3f)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Video style={{ width: 16, height: 16, color: 'rgba(255,255,255,0.4)' }} />
                      </div>
                    )}
                    {isSelected && (() => {
                      const orderIndex = isPhoto
                        ? activePage.selectedPhotos.findIndex(p => p.id === item.id) + 1
                        : activePage.selectedVideos.findIndex(p => p.id === item.id) + 1;
                      return (
                        <div style={{ position: 'absolute', top: 3, right: 3, width: 18, height: 18, borderRadius: '50%', backgroundColor: '#0D9488', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{orderIndex}</span>
                        </div>
                      );
                    })()}
                    {!isPhoto && (
                      <div style={{ position: 'absolute', bottom: 2, left: 2, padding: '1px 4px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 3 }}>
                        <span style={{ fontSize: 8, color: '#fff', fontWeight: 600 }}>VID</span>
                      </div>
                    )}
                  </div>
                );
              })}
              {images.length === 0 && videos.length === 0 && (
                <div style={{ gridColumn: 'span 3', padding: 20, textAlign: 'center', backgroundColor: '#F4F6F8', borderRadius: 10, border: '1px dashed #CBD5E1' }}>
                  <Camera style={{ width: 20, height: 20, margin: '0 auto 6px', color: '#CBD5E1', display: 'block' }} />
                  <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Tidak ada media</p>
                </div>
              )}
            </div>
          </div>

          {/* ③ KETERANGAN FOTO */}
          {activePage.selectedPhotos.length > 0 && (
            <div style={{ padding: '16px 18px', borderBottom: '1px solid #F1F5F9' }}>
              <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Keterangan Foto</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {activePage.selectedPhotos.map((photo, idx) => (
                  <div key={photo.id}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 6, overflow: 'hidden', border: '1px solid #E8ECF1', flexShrink: 0 }}>
                          <img src={photo.dataUrl || photo.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#0C1E35' }}>Foto #{idx + 1}</span>
                      </div>
                      <button onClick={() => setEditingPhoto(photo)} style={{
                        fontSize: 10, fontWeight: 700, color: '#0D9488', backgroundColor: '#E6F7F5',
                        border: '1px solid #B2DFDB', borderRadius: 6, padding: '3px 8px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 3, fontFamily: "'Plus Jakarta Sans', sans-serif",
                      }}>
                        <Plus style={{ width: 10, height: 10 }} /> Marker
                      </button>
                    </div>
                    <textarea
                      value={activePage.photoCaptions[photo.id] || ''}
                      onChange={(e) => updateActivePage({ photoCaptions: { ...activePage.photoCaptions, [photo.id]: e.target.value } })}
                      placeholder="Keterangan foto..."
                      rows={2}
                      style={{
                        width: '100%', padding: '8px 10px', backgroundColor: '#F4F6F8',
                        border: '1px solid #E8ECF1', borderRadius: 8, fontSize: 11,
                        color: '#0C1E35', outline: 'none', resize: 'vertical' as const,
                        fontFamily: "'Plus Jakarta Sans', sans-serif", transition: 'border-color 150ms',
                      }}
                      onFocus={e => e.currentTarget.style.borderColor = '#0D9488'}
                      onBlur={e => e.currentTarget.style.borderColor = '#E8ECF1'}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ④ CATATAN KLINIS */}
          <div style={{ padding: '16px 18px', borderBottom: '1px solid #F1F5F9', flex: 1 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Kesimpulan</p>
            <textarea
              value={activePage.clinicalNotes}
              onChange={(e) => updateActivePage({ clinicalNotes: e.target.value })}
              placeholder="Tambahkan kesimpulan..."
              style={{
                width: '100%', padding: 10, backgroundColor: '#F4F6F8',
                border: '1px solid #E8ECF1', borderRadius: 10, fontSize: 12,
                color: '#0C1E35', outline: 'none', resize: 'vertical' as const,
                minHeight: 80, fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: 'border-color 150ms',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#0D9488'}
              onBlur={e => e.currentTarget.style.borderColor = '#E8ECF1'}
            />
          </div>

          {/* AKSI */}
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={handleSaveReportSnapshot} disabled={savingReport} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '13px 0', background: 'linear-gradient(135deg, #0C1E35, #1a3a5c)', color: '#ffffff',
              border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700,
              cursor: savingReport ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: '0 2px 8px rgba(12,30,53,0.25)', opacity: savingReport ? 0.7 : 1,
            }}>
              {savingReport ? <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> : <Save style={{ width: 15, height: 15 }} />}
              {savingReport ? 'Menyimpan...' : 'Simpan PDF'}
            </button>
            <button onClick={handlePrint} disabled={isSaving} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              padding: '12px 0', backgroundColor: '#F4F6F8', color: '#0C1E35',
              border: '1px solid #E8ECF1', borderRadius: 10, fontSize: 12, fontWeight: 700,
              cursor: isSaving ? 'not-allowed' : 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              opacity: isSaving ? 0.7 : 1,
            }}>
              {isSaving ? <Loader2 style={{ width: 15, height: 15, animation: 'spin 1s linear infinite' }} /> : <Printer style={{ width: 15, height: 15 }} />}
              {isSaving ? 'Mencetak...' : 'Cetak'}
            </button>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <button onClick={handleEmail} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '10px 0', backgroundColor: '#F4F6F8', color: '#475569',
                border: '1px solid #E8ECF1', borderRadius: 10, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                <Mail style={{ width: 13, height: 13, color: '#3B82F6' }} /> Email
              </button>
              <button onClick={handleWhatsApp} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                padding: '10px 0', backgroundColor: '#F4F6F8', color: '#475569',
                border: '1px solid #E8ECF1', borderRadius: 10, fontSize: 11, fontWeight: 700,
                cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                <MessageCircle style={{ width: 13, height: 13, color: '#10B981' }} /> WhatsApp
              </button>
            </div>
          </div>
        </div>

        {/* Right Preview Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Zoom slider bar */}
          <div className="print-hide" style={{
            backgroundColor: '#fff', borderBottom: '1px solid #E8ECF1',
            padding: '8px 24px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>Zoom</span>
            <button
              onClick={() => setPreviewZoom(Math.max(0.3, previewZoom - 0.1))}
              style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F6F8', border: '1px solid #E8ECF1', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#475569', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              −
            </button>
            <input
              type="range" min={0.3} max={1.2} step={0.05} value={previewZoom}
              onChange={(e) => setPreviewZoom(Number(e.target.value))}
              style={{ width: 100, accentColor: '#0C1E35', height: 4 }}
            />
            <button
              onClick={() => setPreviewZoom(Math.min(1.2, previewZoom + 0.1))}
              style={{ width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4F6F8', border: '1px solid #E8ECF1', borderRadius: 8, cursor: 'pointer', fontSize: 16, fontWeight: 700, color: '#475569', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              +
            </button>
            <span style={{ fontSize: 11, color: '#0C1E35', fontWeight: 700, width: 36, fontFamily: 'Plus Jakarta Sans, sans-serif' }}>{Math.round(previewZoom * 100)}%</span>
            <button
              onClick={() => setPreviewZoom(0.6)}
              style={{ fontSize: 10, color: '#94A3B8', background: 'none', border: '1px solid #E8ECF1', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif' }}
            >
              Reset
            </button>
          </div>

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
                transform: `scale(${isActive ? previewZoom : previewZoom * 0.93})`,
                transformOrigin: 'top center',
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
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  width: getPageDimensions(page).width,
                  height: getPageDimensions(page).height,
                  overflow: 'hidden',
                }}
              >
                {/* Top line accent */}
                <div style={{
                  height: 3, flexShrink: 0,
                  background: '#0C1E35',
                  borderRadius: '2px 2px 0 0',
                }} />

                {/* Content area with print-safe margins */}
                <div style={{ padding: '36px 40px 28px', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

                {/* Hospital Header */}
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  marginBottom: 16,
                }} className="print-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {page.reportType === 'clinical' && selectedHospital?.logoUrl && (
                <img src={selectedHospital.logoUrl} alt="" style={{
                  height: 72, width: 'auto', objectFit: 'contain', borderRadius: 6,
                }} />
                    )}
                    <div>
                      {page.reportType === 'clinical' && selectedHospital ? (
                        <>
                          <p style={{ fontSize: 12, fontWeight: 800, color: '#0C1E35', margin: 0 }}>{selectedHospital.name}</p>
                          <p style={{ fontSize: 8, color: '#64748B', margin: '2px 0 0', maxWidth: 300, lineHeight: 1.4 }}>{selectedHospital.address}</p>
                          <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '0 8px', marginTop: 3 }}>
                            {selectedHospital.phone && <span style={{ fontSize: 7, color: '#94A3B8' }}>Telp: {selectedHospital.phone}</span>}
                            {selectedHospital.fax && <span style={{ fontSize: 7, color: '#94A3B8' }}>Fax: {selectedHospital.fax}</span>}
                            {selectedHospital.email && <span style={{ fontSize: 7, color: '#94A3B8' }}>Email: {selectedHospital.email}</span>}
                            {selectedHospital.website && <span style={{ fontSize: 7, color: '#94A3B8' }}>Web: {selectedHospital.website}</span>}
                          </div>
                        </>
                      ) : page.reportType === 'clinical' ? (
                        <p style={{ fontSize: 10, color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>Kop surat belum dikonfigurasi</p>
                      ) : (
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#0C1E35', textTransform: 'uppercase' as const, letterSpacing: '0.15em', margin: 0 }}>Aexon Medical Documentation</p>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                    <p style={{ fontSize: 7, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, letterSpacing: '0.1em', margin: '0 0 2px' }}>
                      {session.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                    {page.reportType === 'clinical' && (
                      <p style={{ fontSize: 8, color: '#64748B', margin: 0 }}>
                        Pukul {session.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                      </p>
                    )}
                  </div>
                </div>

                {/* Title + Patient Card */}
                <div style={{ border: '1px solid #E8ECF1', borderRadius: 8, overflow: 'hidden', marginBottom: 14 }} className="print-patient-info">
                  <div style={{ background: '#0C1E35', padding: '8px 14px' }}>
                    <p style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', margin: 0, textTransform: 'uppercase' as const }}>
                      {page.reportType === 'clinical'
                        ? (page.examType === 'mikroskop' ? 'Laporan Mikroskop' : 'Laporan Endoskopi')
                        : 'Academic Case Report'}
                    </p>
                  </div>

                  {page.reportType === 'clinical' ? (
                    <>
                      <div style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 14px', fontSize: 10 }}>
                          {[
                            { label: 'Nama', value: session.patient.name },
                            { label: 'No. RM', value: session.patient.rmNumber },
                            { label: 'JK / Usia', value: `${session.patient.gender === 'Laki-laki' ? 'L' : 'P'} / ${calculateAge(session.patient.dob)}` },
                          ].map((item, i) => (
                            <div key={i}>
                              <span style={{ display: 'block', fontSize: 7, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, marginBottom: 1 }}>{item.label}</span>
                              <span style={{ fontWeight: 700, color: '#0C1E35' }}>{item.value}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ borderTop: '1px solid #F1F5F9', marginTop: 8, paddingTop: 8, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 14px', fontSize: 10 }}>
                          <div>
                            <span style={{ display: 'block', fontSize: 7, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, marginBottom: 1 }}>Operator</span>
                            <span style={{ fontWeight: 700, color: '#0C1E35' }}>{session.patient.operator}</span>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: 7, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, marginBottom: 1 }}>Tindakan</span>
                            <span style={{ fontWeight: 700, color: '#0C1E35' }}>
                              {session.patient.procedures.filter(p => p).join(', ') || '-'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid #E8ECF1', display: 'flex' }}>
                        <div style={{ flex: 1, padding: '8px 14px', background: 'rgba(12,30,53,0.03)', borderRight: '1px solid #E8ECF1' }}>
                          <span style={{ fontSize: 7, fontWeight: 700, color: '#0C1E35', textTransform: 'uppercase' as const }}>Dx. utama</span>
                          <p style={{ fontSize: 10, fontWeight: 700, margin: '1px 0 0', color: '#0C1E35' }}>{session.patient.diagnosis || '-'}</p>
                        </div>
                        <div style={{ flex: 1, padding: '8px 14px' }}>
                          <span style={{ fontSize: 7, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const }}>Dx. banding</span>
                          <p style={{ fontSize: 10, fontWeight: 700, margin: '1px 0 0', color: '#0C1E35' }}>{session.patient.differentialDiagnosis || '-'}</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ padding: '10px 14px' }}>
                        <div style={{
                          display: 'flex', alignItems: 'center', color: '#92400E',
                          backgroundColor: '#FFFBEB', padding: '6px 10px', borderRadius: 6,
                          border: '1px solid #FDE68A', marginBottom: 10,
                        }}>
                          <ShieldAlert style={{ width: 13, height: 13, marginRight: 8, flexShrink: 0 }} />
                          <span style={{ fontSize: 9, fontWeight: 600 }}>PII Redacted for Academic Use (Gender Preserved)</span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 14px', fontSize: 10 }}>
                          <div>
                            <span style={{ display: 'block', fontSize: 7, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, marginBottom: 1 }}>Case ID</span>
                            <span style={{ fontWeight: 700, color: '#0C1E35', fontFamily: 'monospace' }}>{caseId}</span>
                          </div>
                          <div>
                            <span style={{ display: 'block', fontSize: 7, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const, marginBottom: 1 }}>Jenis Kelamin</span>
                            <span style={{ fontWeight: 700, color: '#0C1E35' }}>{session.patient.gender === 'Laki-laki' ? 'M' : 'F'}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ borderTop: '1px solid #E8ECF1', display: 'flex' }}>
                        <div style={{ flex: 1, padding: '8px 14px', borderRight: '1px solid #E8ECF1' }}>
                          <span style={{ fontSize: 7, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const }}>Prosedur utama</span>
                          <p style={{ fontSize: 10, fontWeight: 700, margin: '1px 0 0', color: '#0C1E35' }}>{session.patient.procedures[0] || '-'}</p>
                        </div>
                        <div style={{ flex: 1, padding: '8px 14px' }}>
                          <span style={{ fontSize: 7, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' as const }}>Diagnosis akademik</span>
                          <p style={{ fontSize: 10, fontWeight: 700, margin: '1px 0 0', color: '#0C1E35' }}>{session.patient.diagnosis || '-'}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Photo Grid + Kesimpulan + Signature — semua dalam flex:1 agar fit 1 halaman */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
                {/* Photo Grid */}
                <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', flexShrink: 1, minHeight: 0 }} className="print-section">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, flexShrink: 0 }}>
                    <div style={{ width: 3, height: 12, backgroundColor: '#0C1E35', borderRadius: 1, flexShrink: 0, display: 'inline-block' }} />
                    <h3 style={{ fontSize: 11, fontWeight: 800, color: '#0C1E35', margin: 0 }} className="print-section-title">
                      {page.reportLayout === 'beforeAfter' ? 'Dokumentasi Before / After Surgery' :
                       page.reportLayout === 'rightLeft' ? 'Dokumentasi Perbandingan Kanan / Kiri' :
                       'Dokumentasi visual'}
                    </h3>
                    <div style={{ flex: 1, height: 1, backgroundColor: '#E8ECF1' }} />
                  </div>
                  {page.selectedPhotos.length > 0 ? (() => {
                    const count = page.selectedPhotos.length;
                    const isCompare = page.reportLayout !== 'standard';
                    const cols = isCompare ? 2 : count <= 2 ? 2 : 3;
                    const photoGap = count <= 4 ? 8 : 4;
                    return (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${cols}, 1fr)`,
                      gap: photoGap,
                      flex: 1,
                      minHeight: 0,
                    }} className="print-grid">
                      {page.selectedPhotos.map((photo, index) => (
                        <div key={photo.id} className="print-photo-card" style={{ minHeight: 0, display: 'flex', flexDirection: 'column' }}>
                          <div style={{
                            position: 'relative', flex: 1, minHeight: 0,
                            backgroundColor: '#F1F5F9', borderRadius: 4,
                            overflow: 'hidden', border: '1px solid rgba(12,30,53,0.08)',
                          }}>
                            <img src={photo.dataUrl || photo.url} alt={`Capture ${index + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            {isCompare && (
                              <div style={{
                                position: 'absolute', top: 6, left: 6,
                                padding: '3px 8px', backgroundColor: 'rgba(12,30,53,0.85)',
                                backdropFilter: 'blur(4px)', borderRadius: 4,
                                fontSize: 8, fontWeight: 900, color: '#ffffff',
                                textTransform: 'uppercase' as const, letterSpacing: '0.15em',
                              }}>
                                {page.reportLayout === 'beforeAfter'
                                  ? (index % 2 === 0 ? 'Before' : 'After')
                                  : (index % 2 === 0 ? 'Kanan' : 'Kiri')}
                              </div>
                            )}
                            <div style={{
                              position: 'absolute', bottom: 4, right: 6,
                              fontSize: 8, fontWeight: 800, color: 'rgba(255,255,255,0.7)',
                              textShadow: '0 1px 3px rgba(0,0,0,0.5)',
                            }}>
                              {index + 1}/{page.selectedPhotos.length}
                            </div>
                          </div>
                          {page.photoCaptions[photo.id] && (
                            <div style={{
                              backgroundColor: 'rgba(12,30,53,0.025)',
                              border: '1px solid rgba(12,30,53,0.06)',
                              borderRadius: 4, padding: '4px 8px', marginTop: 3, flexShrink: 0,
                            }}>
                              <p style={{ fontSize: 8, lineHeight: 1.4, fontWeight: 500, color: '#475569', whiteSpace: 'pre-wrap' as const, wordBreak: 'break-word' as const, margin: 0, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>
                                {page.photoCaptions[photo.id]}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    );
                  })() : (
                    <div style={{
                      height: 80, backgroundColor: '#FAFBFC', border: '1.5px dashed #CBD5E1',
                      borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>Tidak ada foto yang dipilih</p>
                    </div>
                  )}
                </div>

                {/* Video Documentation Section */}
                {page.selectedVideos.length > 0 && (
                  <div style={{ marginBottom: 8, flexShrink: 0 }} className="print-section">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 3, height: 12, backgroundColor: '#0C1E35', borderRadius: 1, flexShrink: 0, display: 'inline-block' }} />
                      <h3 style={{ fontSize: 11, fontWeight: 800, color: '#0C1E35', margin: 0 }} className="print-section-title">
                        Dokumentasi Video
                      </h3>
                      <div style={{ flex: 1, height: 1, backgroundColor: '#E8ECF1' }} />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }} className="print-grid">
                      {page.selectedVideos.map((video, index) => (
                        <div key={video.id} className="print-photo-card">
                          <div style={{
                            position: 'relative', aspectRatio: '4/3',
                            backgroundColor: '#F1F5F9', borderRadius: 4,
                            overflow: 'hidden', border: '1px solid #E2E8F0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <Video style={{ width: 28, height: 28, color: '#CBD5E1' }} />
                            <div style={{
                              position: 'absolute', inset: 0, display: 'flex',
                              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                              backgroundColor: 'rgba(15,23,42,0.03)',
                            }}>
                              <span style={{ fontSize: 9, fontWeight: 800, color: '#475569', textTransform: 'uppercase' as const, letterSpacing: '0.15em' }}>Video {index + 1}</span>
                              <span style={{ fontSize: 7.5, color: '#94A3B8', marginTop: 3 }}>{video.timestamp.toLocaleTimeString()}</span>
                            </div>
                          </div>
                          <div style={{
                            backgroundColor: '#F8FAFC', border: '1px solid #F1F5F9',
                            borderRadius: 4, padding: '3px 8px', textAlign: 'center' as const, marginTop: 3,
                          }}>
                            <p style={{ fontSize: 7, fontWeight: 700, color: '#64748B', textTransform: 'uppercase' as const, letterSpacing: '0.05em', margin: 0 }}>
                              Tersedia dalam format digital
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                  {/* Kesimpulan */}
                  <div className="print-section" style={{ flexShrink: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <div style={{ width: 3, height: 12, backgroundColor: '#0C1E35', borderRadius: 1, flexShrink: 0, display: 'inline-block' }} />
                      <h3 style={{ fontSize: 11, fontWeight: 800, color: '#0C1E35', margin: 0 }} className="print-section-title">
                        Kesimpulan
                      </h3>
                      <div style={{ flex: 1, height: 1, backgroundColor: '#E8ECF1' }} />
                    </div>
                    <div style={{ fontSize: 10 }}>
                      {page.clinicalNotes ? (
                        <p style={{ whiteSpace: 'pre-wrap' as const, color: '#475569', lineHeight: 1.6, margin: 0 }}>{page.clinicalNotes}</p>
                      ) : (
                        <p style={{ color: '#94A3B8', fontStyle: 'italic', margin: 0 }}>Tidak ada kesimpulan.</p>
                      )}
                    </div>
                  </div>

                  {/* Spacer — mendorong signature ke bawah */}
                  <div style={{ flex: 1 }} />

                  {/* Signature Area — selalu di pojok kanan bawah */}
                  {page.reportType === 'clinical' && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, flexShrink: 0 }}>
                      <div style={{ textAlign: 'center' as const, width: 170 }}>
                        <p style={{ fontSize: 9, color: '#94A3B8', marginBottom: 30 }}>Dokter Pemeriksa,</p>
                        <div style={{ borderBottom: '1.5px solid #CBD5E1', marginBottom: 4 }} />
                        <p style={{ fontWeight: 800, color: '#0C1E35', fontSize: 10, margin: 0 }}>{session.patient.operator}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderTop: '1px solid #E8ECF1', paddingTop: 5, flexShrink: 0,
                }}>
                  <p style={{ fontSize: 8, color: '#94A3B8', margin: 0 }}>
                    <span className="font-aexon" style={{ color: '#0C1E35', fontWeight: 700 }}>Aexon</span> &middot; Medical documentation
                  </p>
                  <p style={{ fontSize: 8, color: '#94A3B8', fontWeight: 600, margin: 0 }}>
                    Hal {pageIdx + 1}/{pages.length}
                  </p>
                </div>

                </div>{/* close content area */}

              </div>
            </div>
            );
          })}
        </div>
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
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
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
                    fontFamily: 'Plus Jakarta Sans, sans-serif',
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