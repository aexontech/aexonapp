import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Download, FileImage, FileVideo, Edit3, Info, Trash2, AlertTriangle, FileText } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Session, Capture, UserProfile } from '../types';
import ImageEditor from './ImageEditor';
import { useToast } from './ToastProvider';

interface GalleryProps {
  session: Session;
  onBack: () => void;
  onUpdateSession?: (session: Session) => void;
  onViewReport?: (session: Session) => void;
  userProfile?: UserProfile | null;
  allSessions?: Session[];
}

export default function Gallery({ session, onBack, onUpdateSession, onViewReport, userProfile, allSessions }: GalleryProps) {
  const { showToast } = useToast();
  const [captures, setCaptures] = useState<Capture[]>(session.captures);
  const [editingPhoto, setEditingPhoto] = useState<Capture | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);

  const photos = captures.filter(c => c.type === 'image');
  const videos = captures.filter(c => c.type === 'video');

  const updateCaptures = (newCaptures: Capture[]) => {
    setCaptures(newCaptures);
    if (onUpdateSession) {
      onUpdateSession({
        ...session,
        captures: newCaptures
      });
    }
  };

  const confirmDeleteMedia = () => {
    if (mediaToDelete) {
      const newCaptures = captures.filter(c => c.id !== mediaToDelete);
      updateCaptures(newCaptures);
      setMediaToDelete(null);
    }
  };

  const downloadMedia = (url: string, type: 'image' | 'video') => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `endo_${session.patient.rmNumber}_${new Date().getTime()}.${type === 'image' ? 'png' : 'mp4'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const exportBulkPhotos = () => {
    if (photos.length === 0) {
      showToast('Tidak ada foto untuk diekspor.', 'warning');
      return;
    }
    
    showToast('Peringatan: File media yang diekspor tidak terenkripsi. Simpan di lokasi yang aman.', 'warning', 6000);
    
    photos.forEach((photo, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = photo.url;
        a.download = `endo_${session.patient.rmNumber}_foto_${i + 1}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, i * 300);
    });
  };


  return (
    <div className="flex-1 flex bg-slate-50 h-full overflow-hidden relative">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.03),transparent_70%)]" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="h-20 border-b border-slate-200 bg-white/80 backdrop-blur-3xl flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-6">
            <motion.button 
              whileHover={{ scale: 1.1, x: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-400 hover:text-slate-900 transition-all border border-slate-200 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-1">Media Archive</span>
              <h1 className="text-xl font-black text-slate-900 tracking-tighter leading-none">GALERI SESI</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportBulkPhotos}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
              title="Download semua foto"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor Foto ({photos.length})
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onViewReport?.(session)}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg"
              title="Lihat laporan sesi"
            >
              <FileText className="w-3.5 h-3.5" />
              Lihat Laporan
            </motion.button>
            <div className="px-4 py-2 bg-white rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                SESSION ID: <span className="text-blue-600">{session.id.substring(0, 8)}</span>
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-16">
            <section>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center border border-blue-100">
                    <FileImage className="w-5 h-5 text-blue-600" />
                  </div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Koleksi Foto <span className="text-slate-400 ml-2 font-bold">({photos.length})</span></h2>
                </div>
              </div>
              
              {photos.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center shadow-sm">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <FileImage className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400 font-black uppercase tracking-widest">Tidak ada foto dalam sesi ini</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
                  {photos.map((photo, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={photo.id}
                      className="group relative bg-white rounded-[2rem] overflow-hidden border border-slate-200 hover:border-blue-500/50 transition-all shadow-xl shadow-slate-200/50 hover:shadow-blue-500/10"
                    >
                      <div className="aspect-video bg-slate-100 relative">
                        <img src={photo.url} alt="Capture" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setEditingPhoto(photo)}
                            className="p-3 bg-blue-600 hover:bg-blue-500 rounded-2xl text-white transition-all shadow-xl"
                            title="Edit Marker"
                          >
                            <Edit3 className="w-4 h-4" />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => downloadMedia(photo.url, 'image')}
                            className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-900 transition-all shadow-xl border border-white/10"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setMediaToDelete(photo.id)}
                            className="p-3 bg-red-600 hover:bg-red-500 rounded-2xl text-white transition-all shadow-xl"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                      <div className="p-5 flex justify-between items-center bg-white">
                        <span className="text-[10px] font-mono text-slate-400 font-black tracking-widest">{photo.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center border border-red-100">
                    <FileVideo className="w-5 h-5 text-red-600" />
                  </div>
                  <h2 className="text-sm font-black text-slate-900 uppercase tracking-[0.2em]">Rekaman Video <span className="text-slate-400 ml-2 font-bold">({videos.length})</span></h2>
                </div>
              </div>

              {videos.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-200 rounded-[2.5rem] p-20 text-center shadow-sm">
                  <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mx-auto mb-6">
                    <FileVideo className="w-10 h-10 text-slate-300" />
                  </div>
                  <p className="text-sm text-slate-400 font-black uppercase tracking-widest">Tidak ada rekaman video dalam sesi ini</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {videos.map((video, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={video.id}
                      className="group relative bg-white rounded-[2rem] overflow-hidden border border-slate-200 hover:border-red-500/50 transition-all shadow-xl shadow-slate-200/50 hover:shadow-red-500/10"
                    >
                      <div className="aspect-video bg-slate-100 relative">
                        <video src={video.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => downloadMedia(video.url, 'video')}
                            className="p-3 bg-white hover:bg-slate-50 rounded-2xl text-slate-900 transition-all shadow-xl border border-white/10"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setMediaToDelete(video.id)}
                            className="p-3 bg-red-600 hover:bg-red-500 rounded-2xl text-white transition-all shadow-xl"
                            title="Hapus"
                          >
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </div>
                      </div>
                      <div className="p-5 flex justify-between items-center bg-white">
                        <span className="text-[10px] font-mono text-slate-400 font-black tracking-widest">{video.timestamp.toLocaleTimeString()}</span>
                        <div className="flex items-center gap-2 px-2 py-1 bg-red-50 rounded-lg border border-red-100">
                          <span className="text-[8px] font-black text-red-600 uppercase tracking-widest">H.265 HEVC</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      <div className="w-96 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden shrink-0 relative z-20">
        <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-700 text-white shrink-0 shadow-2xl m-4 rounded-[2rem]">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/20">
              <Info className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] leading-none mb-1.5 text-blue-100">Informasi Sesi</h3>
              <p className="text-lg font-black tracking-tight">Detail Klinis</p>
            </div>
          </div>
          
          <div className="space-y-3 bg-black/10 p-5 rounded-2xl backdrop-blur-md border border-white/10">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-blue-100 uppercase tracking-widest">Nama Pasien</span>
              <span className="text-base font-black tracking-tight">{session.patient.name}</span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-[9px] font-black text-blue-100 uppercase tracking-widest">No. Rekam Medis</span>
              <span className="text-base font-black tracking-tight">{session.patient.rmNumber}</span>
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black text-blue-100 uppercase tracking-widest">Tanggal</span>
              <span className="text-[10px] font-black text-right">{session.date.toLocaleDateString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black text-blue-100 uppercase tracking-widest">Prosedur</span>
              <span className="text-[10px] font-black text-right max-w-[140px] truncate">{session.patient.procedures.join(', ') || '-'}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[9px] font-black text-blue-100 uppercase tracking-widest">Diagnosis</span>
              <span className="text-[10px] font-black text-right max-w-[140px] truncate">{session.patient.diagnosis || '-'}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
          <div>
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Statistik Media</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex flex-col items-center justify-center text-center group hover:bg-slate-100 transition-all">
                <FileImage className="w-6 h-6 text-blue-600 mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-2xl font-black text-slate-900 leading-none tracking-tighter">{photos.length}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Foto</span>
              </div>
              <div className="p-5 bg-slate-50 rounded-[1.5rem] border border-slate-100 flex flex-col items-center justify-center text-center group hover:bg-slate-100 transition-all">
                <FileVideo className="w-6 h-6 text-red-600 mb-3 group-hover:scale-110 transition-transform" />
                <span className="text-2xl font-black text-slate-900 leading-none tracking-tighter">{videos.length}</span>
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">Video</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-blue-50 rounded-[2rem] border border-blue-100">
            <h4 className="text-[10px] font-black text-blue-800 uppercase tracking-[0.2em] mb-4">Catatan Sesi</h4>
            <p className="text-[11px] text-blue-600 leading-relaxed font-medium italic">
              "Data sesi ini telah tersimpan secara aman di penyimpanan lokal dan dapat diakses kapan saja melalui dashboard riwayat."
            </p>
          </div>
        </div>

        <div className="p-8 border-t border-slate-100">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl hover:bg-black transition-all shadow-xl shadow-slate-200"
          >
            <ArrowLeft className="w-4 h-4" />
            KEMBALI KE DASHBOARD
          </motion.button>
        </div>
      </div>

      {editingPhoto && (
        <ImageEditor
          imageUrl={editingPhoto.url}
          onClose={() => setEditingPhoto(null)}
          onSave={(editedUrl) => {
            const newCaptures = captures.map(c => c.id === editingPhoto.id ? { ...c, url: editedUrl } : c);
            updateCaptures(newCaptures);
            setEditingPhoto(null);
          }}
        />
      )}

      <AnimatePresence>
        {mediaToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMediaToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-6 border border-red-100">
                  <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-3 uppercase">Hapus Media?</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-10">
                  Apakah Anda yakin ingin menghapus media ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
                </p>
                <div className="flex gap-4 w-full">
                  <button
                    onClick={() => setMediaToDelete(null)}
                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all"
                  >
                    BATAL
                  </button>
                  <button
                    onClick={confirmDeleteMedia}
                    className="flex-1 py-4 bg-red-600 hover:bg-red-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-red-500/20"
                  >
                    HAPUS PERMANEN
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
