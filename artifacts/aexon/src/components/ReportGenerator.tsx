import React, { useState } from 'react';
import { motion } from 'motion/react';
import { FileText, Printer, CheckCircle2, FileImage, ShieldAlert, ArrowLeft, Mail, MessageCircle, Info, AlertTriangle, Download, Video, Camera, Layout, Columns, Grid, Plus, Trash2, ChevronRight, ChevronLeft } from 'lucide-react';
import { Session, Capture, HospitalSettings, UserProfile } from '../types';
import ImageEditor from './ImageEditor';

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
  const [isNavCollapsed] = useState(true); // Permanently folded as requested
  const [editingPhoto, setEditingPhoto] = useState<Capture | null>(null);
  const [pageToDelete, setPageToDelete] = useState<string | null>(null);

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

  const [selectedHospital, setSelectedHospital] = useState<HospitalSettings>(
    plan === 'enterprise' ? hospitalSettingsList[0] : hospitalSettingsList[0]
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
      if (activePage.selectedPhotos.length < 9) { // Max 9 photos for a 3x3 grid
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
      if (activePage.selectedVideos.length < 4) { // Max 4 videos
        updateActivePage({
          selectedVideos: [...activePage.selectedVideos, capture]
        });
      }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSavePDF = () => {
    window.print();
  };

  const handleEmail = () => {
    const subject = encodeURIComponent(`Laporan Endoskopi - ${session.patient.name}`);
    const body = encodeURIComponent(`Halo,\n\nBerikut adalah laporan endoskopi untuk pasien ${session.patient.name} (${session.patient.rmNumber}).\n\nTanggal: ${session.date.toLocaleDateString('id-ID')}\nOperator: ${session.patient.operator}\n\nSalam,\n${userProfile.name}`);
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleWhatsApp = () => {
    const text = encodeURIComponent(`Halo,\n\nBerikut adalah laporan endoskopi untuk pasien *${session.patient.name}* (${session.patient.rmNumber}).\n\nTanggal: ${session.date.toLocaleDateString('id-ID')}\nOperator: ${session.patient.operator}\n\nSalam,\n${userProfile.name}`);
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

  return (
    <div className="flex-1 bg-slate-50 flex flex-col font-sans text-slate-900 h-full overflow-hidden relative">
      <style dangerouslySetInnerHTML={{ __html: `
        @page {
          size: ${activePage.pageSize === 'F4' ? '215mm 330mm' : activePage.pageSize === 'Letter' ? 'letter' : 'A4'} ${activePage.orientation};
          margin: 0;
        }
          @media print {
            body { margin: 0; background: white !important; }
            .print-container { 
              width: 100% !important; 
              min-height: 100% !important; 
              box-shadow: none !important; 
              margin: 0 !important; 
              padding: 8mm !important; 
              page-break-after: always;
              background: white !important;
              color: black !important;
            }
            .print-container:last-child {
              page-break-after: auto;
            }
            .print-container * {
              line-height: 1.1 !important;
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
          }
      `}} />
      
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.05),transparent_70%)]" />
      </div>

      {/* Header */}
      <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-3xl flex items-center justify-between px-8 shrink-0 z-50 relative">
        <div className="flex items-center">
          <motion.button 
            whileHover={{ scale: 1.1, x: -2 }}
            whileTap={{ scale: 0.9 }}
            onClick={onBack}
            className="mr-6 p-3 rounded-2xl bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 transition-all border border-slate-200"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <div className="w-12 h-12 bg-[#0C1E35] rounded-2xl flex items-center justify-center shadow-lg shadow-slate-900/10 mr-4">
            <FileText className="w-6 h-6 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Report Studio</span>
            <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none uppercase">Generator Laporan</h1>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePrint}
            className="flex items-center px-6 py-3 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-slate-900/10"
          >
            <Printer className="w-4 h-4 mr-2" />
            CETAK LAPORAN
          </motion.button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Sidebar Navigation */}
        <div className={`${isNavCollapsed ? 'w-24' : 'w-64'} bg-white border-r border-slate-200 flex flex-col overflow-hidden transition-all duration-300 print:hidden`}>
          <div className="p-6 border-b border-slate-100 flex items-center justify-center">
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={addNewPage}
              className="w-12 h-12 flex items-center justify-center bg-slate-50 hover:bg-slate-100 text-slate-900 rounded-2xl transition-all border border-slate-200 shadow-sm"
              title="Tambah Halaman"
            >
              <Plus className="w-6 h-6" />
            </motion.button>
          </div>
          <div className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
            {!isNavCollapsed && <h3 className="px-4 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Daftar Halaman</h3>}
            {pages.map((page, index) => (
              <motion.div 
                whileHover={{ x: 4 }}
                key={page.id}
                className={`group flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border ${
                  activePageId === page.id 
                    ? 'bg-[#0C1E35] border-blue-500 shadow-xl shadow-slate-900/10 text-white' 
                    : 'bg-slate-50 border-slate-100 hover:bg-white hover:border-blue-100 text-slate-500'
                } ${isNavCollapsed ? 'justify-center' : ''}`}
                onClick={() => setActivePageId(page.id)}
                title={isNavCollapsed ? page.name : ''}
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${
                    activePageId === page.id ? 'bg-white text-blue-600' : 'bg-white text-slate-400 border border-slate-100'
                  }`}>
                    {index + 1}
                  </div>
                  {!isNavCollapsed && <span className="text-xs font-black truncate uppercase tracking-widest">{page.name}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Sidebar Controls */}
        <div className="w-96 bg-white border-r border-slate-200 flex flex-col overflow-y-auto print:hidden custom-scrollbar">
          <div className="p-8 border-b border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Pengaturan Halaman</h3>
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black text-blue-600 uppercase tracking-widest block mb-2">Nama Halaman</label>
                <div className="flex gap-3">
                  <input 
                    type="text"
                    value={activePage.name}
                    onChange={(e) => updateActivePage({ name: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                  />
                  {pages.length > 1 && (
                    <button 
                      onClick={() => handleDeletePage(activePageId)}
                      className="px-6 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-red-100"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 border-b border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Institusi (Kop Surat)</h3>
            <div className="relative">
              <select 
                disabled={plan === 'enterprise'}
                value={selectedHospital.id}
                onChange={(e) => {
                  const hospital = hospitalSettingsList.find(h => h.id === e.target.value);
                  if (hospital) setSelectedHospital(hospital);
                }}
                className={`w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none cursor-pointer ${plan === 'enterprise' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {hospitalSettingsList.map(h => (
                  <option key={h.id} value={h.id} className="bg-white">{h.name}</option>
                ))}
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                <Layout className="w-4 h-4 text-slate-400" />
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-medium italic mt-3">
              {plan === 'enterprise' 
                ? 'Kop surat dikunci oleh institusi Anda.' 
                : 'Pilih institusi untuk kop surat laporan.'}
            </p>
          </div>

          <div className="p-8 border-b border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Pilih Foto <span className="text-blue-600 ml-2">({activePage.selectedPhotos.length}/9)</span></h3>
            <div className="grid grid-cols-3 gap-3">
              {images.map(img => (
                <motion.div 
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  key={img.id}
                  onClick={() => handlePhotoSelect(img)}
                  className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                    activePage.selectedPhotos.find(p => p.id === img.id) 
                      ? 'border-blue-600 shadow-lg shadow-slate-900/10' 
                      : 'border-slate-100 hover:border-blue-500/30'
                  }`}
                >
                  <img src={img.url} alt="Capture" className="w-full h-full object-cover" />
                  {activePage.selectedPhotos.find(p => p.id === img.id) && (
                    <div className="absolute inset-0 bg-[#0C1E35]/20 flex items-center justify-center">
                      <div className="bg-[#0C1E35] rounded-full p-1 shadow-lg">
                        <CheckCircle2 className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
              {images.length === 0 && (
                <div className="col-span-3 p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <FileImage className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tidak ada foto di sesi ini</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-8 border-b border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Keterangan Foto</h3>
            <div className="space-y-6">
              {activePage.selectedPhotos.map((photo, idx) => (
                <div key={photo.id} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 overflow-hidden border border-slate-200 relative group/thumb">
                        <img src={photo.url} alt="Thumb" className="w-full h-full object-cover" />
                      </div>
                      <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Foto #{idx + 1}</span>
                    </div>
                    <motion.button 
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setEditingPhoto(photo)}
                      className="text-[9px] font-black text-blue-600 bg-blue-50 hover:bg-[#0C1E35] hover:text-white px-3 py-2 rounded-xl transition-all border border-blue-100 flex items-center gap-2 uppercase tracking-widest"
                    >
                      <Plus className="w-3 h-3" /> Marker
                    </motion.button>
                  </div>
                  <textarea 
                    value={activePage.photoCaptions[photo.id] || ''}
                    onChange={(e) => {
                      const newCaptions = { ...activePage.photoCaptions, [photo.id]: e.target.value };
                      updateActivePage({ photoCaptions: newCaptions });
                    }}
                    placeholder="Keterangan foto..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-28 resize-none transition-all"
                  />
                </div>
              ))}
              {activePage.selectedPhotos.length === 0 && (
                <p className="text-[10px] text-slate-400 italic font-medium">Pilih foto terlebih dahulu untuk menambah keterangan.</p>
              )}
            </div>
          </div>

          <div className="p-8 border-b border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Catatan Klinis</h3>
            <textarea
              value={activePage.clinicalNotes}
              onChange={(e) => updateActivePage({ clinicalNotes: e.target.value })}
              className="w-full h-64 bg-slate-50 border border-slate-200 rounded-2xl p-5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none transition-all"
              placeholder="Masukkan temuan klinis, diagnosis, atau rekomendasi..."
            />
          </div>

          <div className="p-8 border-b border-slate-100 bg-blue-50/30">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Format & Layout</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => updateActivePage({ reportType: 'clinical' })}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${
                    activePage.reportType === 'clinical' 
                      ? 'bg-[#0C1E35] border-blue-600 text-white shadow-xl shadow-slate-900/10' 
                      : 'bg-white border-slate-100 text-slate-500 hover:border-blue-500/30'
                  }`}
                >
                  <ShieldAlert className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Clinical</span>
                </button>
                
                <button
                  onClick={() => updateActivePage({ reportType: 'academic' })}
                  className={`flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all gap-2 ${
                    activePage.reportType === 'academic' 
                      ? 'bg-[#0C1E35] border-blue-600 text-white shadow-xl shadow-slate-900/10' 
                      : 'bg-white border-slate-100 text-slate-500 hover:border-blue-500/30'
                  }`}
                >
                  <FileText className="w-5 h-5" />
                  <span className="text-[9px] font-black uppercase tracking-widest">Academic</span>
                </button>
              </div>
              
              <div className="grid grid-cols-1 gap-2">
                {(['standard', 'beforeAfter', 'rightLeft'] as const).map((layout) => (
                  <button
                    key={layout}
                    onClick={() => updateActivePage({ reportLayout: layout })}
                    className={`flex items-center p-4 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      activePage.reportLayout === layout 
                        ? 'bg-blue-50 border-blue-500/50 text-blue-600' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-blue-100'
                    }`}
                  >
                    {layout === 'standard' && <Grid className="w-4 h-4 mr-3" />}
                    {layout === 'beforeAfter' && <Columns className="w-4 h-4 mr-3" />}
                    {layout === 'rightLeft' && <Layout className="w-4 h-4 mr-3" />}
                    {layout === 'standard' ? 'Standard Grid' : layout === 'beforeAfter' ? 'Before / After' : 'Right / Left'}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-2">
                {(['A4', 'F4', 'Letter'] as const).map((size) => (
                  <button
                    key={size}
                    onClick={() => updateActivePage({ pageSize: size })}
                    className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      activePage.pageSize === size 
                        ? 'bg-blue-50 border-blue-500/50 text-blue-600' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-blue-100'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(['portrait', 'landscape'] as const).map((orient) => (
                  <button
                    key={orient}
                    onClick={() => updateActivePage({ orientation: orient })}
                    className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${
                      activePage.orientation === orient 
                        ? 'bg-blue-50 border-blue-500/50 text-blue-600' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-blue-100'
                    }`}
                  >
                    {orient}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="p-8 border-t border-slate-100 bg-white space-y-6">
            <div className="grid grid-cols-2 gap-3">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handlePrint}
                className="flex items-center justify-center py-4 px-4 bg-[#0C1E35] hover:bg-[#1a3a5c] text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-slate-900/10"
              >
                <Printer className="w-4 h-4 mr-2" />
                Cetak
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSavePDF}
                className="flex items-center justify-center py-4 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-xl shadow-indigo-500/20"
              >
                <Download className="w-4 h-4 mr-2" />
                Simpan
              </motion.button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={handleEmail}
                className="flex items-center justify-center py-4 px-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
              >
                <Mail className="w-4 h-4 mr-2 text-blue-600" />
                Email
              </button>
              <button 
                onClick={handleWhatsApp}
                className="flex items-center justify-center py-4 px-4 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all"
              >
                <MessageCircle className="w-4 h-4 mr-2 text-emerald-600" />
                WhatsApp
              </button>
            </div>

            <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
              <div className="flex items-center gap-3 mb-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest">Privacy Disclaimer</span>
              </div>
              <p className="text-[9px] text-amber-600/70 leading-relaxed font-medium">
                Segala bentuk kebocoran data atau penyalahgunaan informasi medis yang terjadi di luar sistem Aexon adalah sepenuhnya di luar tanggung jawab Aexon.
              </p>
            </div>
          </div>
        </div>

        {/* Print Preview Area */}
        <div className="flex-1 bg-slate-200 overflow-y-auto p-12 flex flex-col items-center gap-12 print:p-0 print:bg-white print:block custom-scrollbar">
          {pages.map((page) => (
            <div 
              key={page.id}
              className={`bg-white shadow-2xl print:shadow-none p-16 relative flex flex-col transition-all duration-500 print-container ${
                activePageId === page.id ? 'ring-8 ring-blue-500/20 scale-100' : 'opacity-30 grayscale scale-[0.95]'
              } print:opacity-100 print:grayscale-0 print:scale-100 print:ring-0`}
              style={{ 
                width: getPageDimensions(page).width, 
                minHeight: getPageDimensions(page).minHeight 
              }}
            >
              
              {/* Report Header */}
              <div className="border-b-2 border-slate-200 pb-4 mb-4 flex justify-between items-start print-header">
                <div className="flex items-center">
                  {page.reportType === 'clinical' && selectedHospital.logoUrl && (
                    <img src={selectedHospital.logoUrl} alt="Hospital Logo" className="h-20 w-auto mr-6 object-contain" />
                  )}
                  <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1 uppercase">
                      {page.reportType === 'clinical' ? 'Laporan Endoskopi' : 'Academic Case Report'}
                    </h1>
                    {page.reportType === 'clinical' ? (
                      <div>
                        <p className="text-slate-900 font-black text-base leading-tight">{selectedHospital.name}</p>
                        <p className="text-slate-600 text-xs mt-1 max-w-md leading-relaxed">{selectedHospital.address}</p>
                        <div className="flex flex-wrap gap-x-4 text-slate-500 text-[10px] mt-2 font-bold uppercase tracking-wider">
                          <span>Telp: {selectedHospital.phone}</span>
                          {selectedHospital.fax && <span>Fax: {selectedHospital.fax}</span>}
                          {selectedHospital.website && <span>Web: {selectedHospital.website}</span>}
                          <span>Email: {selectedHospital.email}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Aexon Medical Documentation</p>
                    )}
                  </div>
                </div>
                <div className="text-right bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Waktu Tindakan</p>
                  <p className="text-xs font-black text-slate-900">
                    {session.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                  {page.reportType === 'clinical' && (
                    <p className="text-[10px] font-bold text-blue-600 mt-0.5">
                      Pukul {session.date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </p>
                  )}
                </div>
              </div>

              {/* Patient Data / Redacted Data */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4 print-patient-info">
                {page.reportType === 'clinical' ? (
                  <div className="grid grid-cols-3 gap-y-1.5 gap-x-6 text-[10px]">
                    <div>
                      <span className="text-slate-500 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Nama Pasien</span>
                      <span className="font-bold text-slate-900 text-xs">{session.patient.name}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">No. Rekam Medis</span>
                      <span className="font-bold text-slate-900 text-xs">{session.patient.rmNumber}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Jenis Kelamin</span>
                      <span className="font-bold text-slate-900 text-xs">{session.patient.gender}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Tanggal Lahir</span>
                      <span className="font-bold text-slate-900 text-xs">{session.patient.dob}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Usia Pasien</span>
                      <span className="font-bold text-slate-900 text-xs">{calculateAge(session.patient.dob)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Kategori / Lokasi</span>
                      <span className="font-bold text-slate-900 text-xs">{session.patient.category}</span>
                    </div>
                    <div className="col-span-3 pt-1.5 border-t border-slate-200 mt-1 grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-slate-500 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Dokter Operator</span>
                        <span className="font-bold text-slate-900 text-xs">{session.patient.operator}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Tindakan</span>
                        <ul className="list-disc list-inside font-bold text-slate-900 text-[10px]">
                          {session.patient.procedures.filter(p => p).map((p, i) => (
                            <li key={i}>{p}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="col-span-2 pt-1.5 border-t border-slate-100">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <span className="text-slate-500 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Diagnosis Utama</span>
                            <span className="font-bold text-slate-900 text-[10px]">{session.patient.diagnosis || '-'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-medium block mb-0.5 uppercase tracking-wider text-[8px]">Diagnosis Banding</span>
                            <span className="font-bold text-slate-900 text-[10px]">{session.patient.differentialDiagnosis || '-'}</span>
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
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 print-section-title">
                  {page.reportLayout === 'beforeAfter' ? 'Dokumentasi Before / After Surgery' : 
                   page.reportLayout === 'rightLeft' ? 'Dokumentasi Perbandingan Kanan / Kiri' : 
                   'Dokumentasi Visual'}
                </h3>
                {page.selectedPhotos.length > 0 ? (
                  <div className={`grid gap-3 print-grid ${page.reportLayout === 'standard' ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    {page.selectedPhotos.map((photo, index) => (
                      <div key={photo.id} className="space-y-1.5 print-photo-card">
                        <div className="relative aspect-video bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
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
                          <div className="bg-slate-50 border border-slate-100 rounded-md p-1.5 min-h-[30px]">
                            <p className="text-[8px] leading-tight font-medium text-slate-700 whitespace-pre-wrap break-words">
                              {page.photoCaptions[photo.id]}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-24 bg-slate-50 border border-slate-200 border-dashed rounded-xl flex items-center justify-center text-slate-400">
                    <p className="text-xs">Tidak ada foto yang dipilih</p>
                  </div>
                )}
              </div>

              {/* Video Documentation Section */}
              {activePage.selectedVideos.length > 0 && (
                <div className="mb-4 print-section">
                  <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 print-section-title">Dokumentasi Video</h3>
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
                <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-1 mb-2 print-section-title">Catatan Klinis</h3>
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
                    <p className="text-[10px] text-slate-600 mb-8">Dokter Pemeriksa,</p>
                    <div className="border-b border-slate-400 mb-1"></div>
                    <p className="font-bold text-slate-900 text-xs">{session.patient.operator}</p>
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-8 pt-3 border-t border-slate-200 text-center text-[10px] text-slate-400">
                <p>Generated by <span className="font-aexon">Aexon</span> Endoscopy System • {new Date().toLocaleString('id-ID')} • Halaman {pages.indexOf(page) + 1} dari {pages.length}</p>
              </div>
            </div>
          ))}
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

      {pageToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 border border-slate-200"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6 mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 text-center mb-2">Hapus Halaman?</h3>
            <p className="text-slate-500 text-center mb-8">
              Halaman ini sudah berisi data. Apakah Anda yakin ingin menghapusnya? Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setPageToDelete(null)}
                className="flex-1 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
              >
                Batal
              </button>
              <button 
                onClick={() => {
                  deletePage(pageToDelete);
                  setPageToDelete(null);
                }}
                className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-colors shadow-lg shadow-red-500/20"
              >
                Hapus
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
