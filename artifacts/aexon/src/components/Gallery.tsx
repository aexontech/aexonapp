import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Download, FileImage, FileVideo, Edit3, Trash2, AlertTriangle, FileText } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Session, Capture } from '../types';
import ImageEditor from './ImageEditor';
import { useToast } from './ToastProvider';

interface GalleryProps {
  session: Session;
  onBack: () => void;
  onUpdateSession?: (session: Session) => void;
  onViewReport?: (session: Session) => void;
}

export default function Gallery({ session, onBack, onUpdateSession, onViewReport }: GalleryProps) {
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
    <div className="flex-1 flex bg-[#0C1E35] h-full overflow-hidden relative">
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="h-20 border-b border-white/10 bg-white/5 backdrop-blur-3xl flex items-center justify-between px-8 shrink-0 z-10">
          <div className="flex items-center gap-6">
            <motion.button 
              whileHover={{ scale: 1.1, x: -2 }}
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white/60 hover:text-white transition-all border border-white/10"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-white/50">Media Archive</span>
              <h1 className="font-aexon text-2xl text-white tracking-tight leading-none">Galeri Sesi</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={exportBulkPhotos}
              className="flex items-center gap-2 px-4 py-2.5 bg-white text-[#0C1E35] hover:bg-white/90 rounded-xl text-sm font-semibold transition-colors"
              title="Download semua foto"
            >
              <Download className="w-3.5 h-3.5" />
              Ekspor Foto ({photos.length})
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onViewReport?.(session)}
              className="flex items-center gap-2 px-4 py-2.5 border border-white/20 text-white hover:bg-white/10 rounded-xl text-sm font-semibold transition-colors"
              title="Lihat laporan sesi"
            >
              <FileText className="w-3.5 h-3.5" />
              Lihat Laporan
            </motion.button>
            <div className="px-4 py-2 bg-white/10 rounded-xl border border-white/10">
              <span className="text-sm font-semibold text-white/60 uppercase tracking-wider">
                SESSION ID: <span className="text-white">{session.id.substring(0, 8)}</span>
              </span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto space-y-10">
            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                    <FileImage className="w-5 h-5 text-blue-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Koleksi Foto <span className="text-white/30 ml-2">({photos.length})</span></h2>
                </div>
              </div>
              
              {photos.length === 0 ? (
                <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-16 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileImage className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-sm text-white/40">Tidak ada foto dalam sesi ini</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {photos.map((photo, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={photo.id}
                      className="group relative bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                    >
                      <div className="aspect-video bg-black/20 relative">
                        <img src={photo.url} alt="Capture" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setEditingPhoto(photo)}
                            className="p-3 bg-white text-[#0C1E35] hover:bg-white/90 rounded-2xl transition-all shadow-xl"
                            title="Edit Marker"
                          >
                            <Edit3 className="w-4 h-4" />
                          </motion.button>
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => downloadMedia(photo.url, 'image')}
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all shadow-xl border border-white/10"
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
                      <div className="p-5 flex justify-between items-center">
                        <span className="text-xs text-white/40">{photo.timestamp.toLocaleTimeString()}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>

            <section>
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                    <FileVideo className="w-5 h-5 text-red-400" />
                  </div>
                  <h2 className="text-sm font-semibold text-white/60 uppercase tracking-wider">Rekaman Video <span className="text-white/30 ml-2">({videos.length})</span></h2>
                </div>
              </div>

              {videos.length === 0 ? (
                <div className="bg-white/5 border border-dashed border-white/10 rounded-2xl p-16 text-center">
                  <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <FileVideo className="w-8 h-8 text-white/20" />
                  </div>
                  <p className="text-sm text-white/40">Tidak ada rekaman video dalam sesi ini</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {videos.map((video, i) => (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      key={video.id}
                      className="group relative bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-all hover:shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
                    >
                      <div className="aspect-video bg-black/20 relative">
                        <video src={video.url} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                          <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => downloadMedia(video.url, 'video')}
                            className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all shadow-xl border border-white/10"
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
                      <div className="p-5 flex justify-between items-center">
                        <span className="text-xs text-white/40">{video.timestamp.toLocaleTimeString()}</span>
                        <span className="px-2.5 py-0.5 bg-red-500/20 text-red-400 text-xs font-semibold rounded-full border border-red-500/20">H.265</span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      <div className="w-96 bg-[#0a1929] border-l border-white/10 flex flex-col h-full overflow-hidden shrink-0 relative z-20">
        <div className="p-6 border-b border-white/10 shrink-0">
          <h3 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Informasi Sesi</h3>
          <div className="space-y-3 bg-white/5 p-4 rounded-2xl border border-white/10">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-white/40">Nama Pasien</span>
              <span className="text-sm font-bold text-white">{session.patient.name}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-medium text-white/40">No. Rekam Medis</span>
              <span className="text-sm font-bold text-white">{session.patient.rmNumber}</span>
            </div>
            <div className="h-px bg-white/10 my-1" />
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-white/40">Tanggal</span>
              <span className="text-xs text-white/70 text-right">{session.date.toLocaleDateString('id-ID')}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-white/40">Prosedur</span>
              <span className="text-xs text-white/70 text-right max-w-[140px] truncate">{session.patient.procedures.join(', ') || '-'}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs font-medium text-white/40">Diagnosis</span>
              <span className="text-xs text-white/70 text-right max-w-[140px] truncate">{session.patient.diagnosis || '-'}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <div>
            <h4 className="text-sm font-semibold text-white/50 uppercase tracking-wider mb-4">Statistik Media</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center hover:bg-white/10 transition-all duration-200">
                <FileImage className="w-5 h-5 text-blue-400 mb-2" />
                <span className="text-2xl font-bold text-white">{photos.length}</span>
                <span className="text-xs font-medium text-white/50 mt-1">Foto</span>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center hover:bg-white/10 transition-all duration-200">
                <FileVideo className="w-5 h-5 text-red-400 mb-2" />
                <span className="text-2xl font-bold text-white">{videos.length}</span>
                <span className="text-xs font-medium text-white/50 mt-1">Video</span>
              </div>
            </div>
          </div>

          <div className="p-4 bg-white/5 rounded-2xl border border-white/10">
            <h4 className="text-xs font-medium text-white/40 mb-2">Catatan Sesi</h4>
            <p className="text-xs text-white/50 leading-relaxed">
              Data sesi ini telah tersimpan secara aman di penyimpanan lokal dan dapat diakses kapan saja melalui dashboard riwayat.
            </p>
          </div>
        </div>

        <div className="p-6 border-t border-white/10">
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onBack}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#0C1E35] text-sm font-bold rounded-xl hover:bg-white/90 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Kembali ke Dashboard
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
              className="relative w-full max-w-md bg-white rounded-2xl p-8 shadow-xl overflow-hidden"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4 border border-red-100">
                  <AlertTriangle className="w-7 h-7 text-red-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Hapus Media?</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                  Apakah Anda yakin ingin menghapus media ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
                </p>
                <div className="flex gap-3 w-full">
                  <button
                    onClick={() => setMediaToDelete(null)}
                    className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-sm rounded-xl transition-all"
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmDeleteMedia}
                    className="flex-1 py-3 bg-red-600 hover:bg-red-700 text-white font-bold text-sm rounded-xl transition-all"
                  >
                    Hapus Permanen
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
