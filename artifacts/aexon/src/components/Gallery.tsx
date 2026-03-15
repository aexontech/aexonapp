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
  const [activeTab, setActiveTab] = useState<'photos' | 'videos'>('photos');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const photos = captures.filter(c => c.type === 'image');
  const videos = captures.filter(c => c.type === 'video');
  const activeItems = activeTab === 'photos' ? photos : videos;

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

  const exportSelected = () => {
    if (selectedIds.length === 0) return;
    const sel = captures.filter(c => selectedIds.includes(c.id));
    sel.forEach((cap, i) => {
      setTimeout(() => {
        downloadMedia(cap.url, cap.type);
      }, i * 300);
    });
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const tabItems: { id: 'photos' | 'videos'; label: string; count: number }[] = [
    { id: 'photos', label: 'Foto', count: photos.length },
    { id: 'videos', label: 'Video', count: videos.length },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F8FAFC', overflow: 'hidden', position: 'relative' }}>
      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #E2E8F0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onBack}
            style={{ padding: 10, backgroundColor: '#fff', border: '1px solid #0C1E35', borderRadius: 12, color: '#0C1E35', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 150ms' }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
          >
            <ArrowLeft style={{ width: 18, height: 18 }} />
          </motion.button>
          <div>
            <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', marginBottom: 2 }}>
              {session.patient.procedures.join(', ') || 'Prosedur'} &middot; {session.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
            <h1 className="font-aexon" style={{ fontSize: 18, fontWeight: 800, color: '#0C1E35', lineHeight: 1.2 }}>{session.patient.name}</h1>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4 }}>
          {tabItems.map(tab => (
            <button
              key={tab.id}
              onClick={() => { setActiveTab(tab.id); setSelectedIds([]); }}
              style={{
                padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: 13, fontWeight: activeTab === tab.id ? 700 : 500,
                backgroundColor: activeTab === tab.id ? '#fff' : 'transparent',
                color: activeTab === tab.id ? '#0C1E35' : '#94A3B8',
                boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 150ms', fontFamily: 'Outfit, sans-serif',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              {tab.label}
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10,
                backgroundColor: activeTab === tab.id ? '#EFF6FF' : '#E2E8F0',
                color: activeTab === tab.id ? '#0C1E35' : '#94A3B8',
              }}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {selectedIds.length > 0 ? (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={exportSelected}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#0C1E35', color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Outfit, sans-serif' }}
            >
              <Download style={{ width: 14, height: 14 }} />
              Export Pilihan ({selectedIds.length})
            </motion.button>
          ) : (
            <>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={exportBulkPhotos}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#fff', color: '#0C1E35', border: '1px solid #0C1E35', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
              >
                <Download style={{ width: 14, height: 14 }} />
                Ekspor Foto ({photos.length})
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => onViewReport?.(session)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', backgroundColor: '#fff', color: '#0C1E35', border: '1px solid #0C1E35', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif' }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
              >
                <FileText style={{ width: 14, height: 14 }} />
                Lihat Laporan
              </motion.button>
            </>
          )}
        </div>
      </header>

      <main className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {activeItems.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, backgroundColor: '#EFF6FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              {activeTab === 'photos' ? <FileImage style={{ width: 28, height: 28, color: '#94A3B8' }} /> : <FileVideo style={{ width: 28, height: 28, color: '#94A3B8' }} />}
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
              Tidak ada {activeTab === 'photos' ? 'foto' : 'video'} dalam sesi ini
            </p>
            <p style={{ fontSize: 12, color: '#CBD5E1' }}>
              Media akan muncul di sini setelah Anda melakukan capture
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {activeItems.map((item, i) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  key={item.id}
                  style={{
                    backgroundColor: isSelected ? '#EFF6FF' : '#fff',
                    borderRadius: 16, overflow: 'hidden', cursor: 'pointer',
                    border: isSelected ? '2px solid #0C1E35' : '2px solid #E2E8F0',
                    transition: 'all 150ms',
                    position: 'relative',
                  }}
                  onMouseEnter={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#0C1E35'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'; } }}
                  onMouseLeave={e => { if (!isSelected) { e.currentTarget.style.borderColor = '#E2E8F0'; e.currentTarget.style.boxShadow = 'none'; } }}
                >
                  <div style={{ position: 'relative', aspectRatio: '16/10', backgroundColor: '#F1F5F9' }}>
                    {item.type === 'image' ? (
                      <img src={item.url} alt="Capture" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    )}

                    <div
                      onClick={(e) => { e.stopPropagation(); toggleSelect(item.id); }}
                      style={{
                        position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 8,
                        border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.6)',
                        backgroundColor: isSelected ? '#0C1E35' : 'rgba(0,0,0,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', zIndex: 5,
                      }}
                    >
                      {isSelected && (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 6l2 2 4-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      )}
                    </div>

                    <div
                      style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.45)',
                        opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        transition: 'opacity 150ms', backdropFilter: 'blur(2px)',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
                    >
                      {item.type === 'image' && (
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={(e) => { e.stopPropagation(); setEditingPhoto(item); }}
                          style={{ padding: 10, backgroundColor: '#fff', color: '#0C1E35', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}
                        >
                          <Edit3 style={{ width: 16, height: 16 }} />
                        </motion.button>
                      )}
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); downloadMedia(item.url, item.type); }}
                        style={{ padding: 10, backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 12, border: '1px solid rgba(255,255,255,0.3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Download style={{ width: 16, height: 16 }} />
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => { e.stopPropagation(); setMediaToDelete(item.id); }}
                        style={{ padding: 10, backgroundColor: '#EF4444', color: '#fff', borderRadius: 12, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <Trash2 style={{ width: 16, height: 16 }} />
                      </motion.button>
                    </div>
                  </div>

                  <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>{item.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#64748B', padding: '2px 8px', backgroundColor: '#F1F5F9', borderRadius: 6 }}>
                      {item.type === 'image' ? 'PNG' : 'MP4'}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      <div style={{ backgroundColor: '#fff', borderTop: '1px solid #E2E8F0', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={exportBulkPhotos}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
              backgroundColor: '#0D9488', color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(13,148,136,0.2)',
              transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#0F766E'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0D9488'; }}
          >
            <Download style={{ width: 16, height: 16 }} />
            Export Pasien
          </button>
          <button
            onClick={() => onViewReport?.(session)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 20px',
              backgroundColor: '#0C1E35', color: '#fff', border: 'none', borderRadius: 12,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(12,30,53,0.25)',
              transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
          >
            <FileText style={{ width: 16, height: 16 }} />
            Lihat Laporan
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '8px 14px' }}>
            <span style={{ fontSize: 11, color: '#64748B' }}>
              <strong style={{ color: '#0C1E35' }}>{photos.length}</strong> foto &middot; <strong style={{ color: '#0C1E35' }}>{videos.length}</strong> video
            </span>
          </div>
          <div style={{ backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '8px 14px' }}>
            <span style={{ fontSize: 11, color: '#94A3B8' }}>
              Session: <strong style={{ color: '#0C1E35' }}>{session.id.substring(0, 8)}</strong>
            </span>
          </div>
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
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMediaToDelete(null)}
              style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{ position: 'relative', width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 25px 50px rgba(0,0,0,0.15)', overflow: 'hidden' }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div style={{ width: 56, height: 56, backgroundColor: '#FEF2F2', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, border: '1px solid #FECACA' }}>
                  <AlertTriangle style={{ width: 28, height: 28, color: '#DC2626' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0C1E35', marginBottom: 8 }}>Hapus Media?</h3>
                <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 28 }}>
                  Apakah Anda yakin ingin menghapus media ini? Tindakan ini bersifat permanen dan tidak dapat dibatalkan.
                </p>
                <div style={{ display: 'flex', gap: 12, width: '100%' }}>
                  <button
                    onClick={() => setMediaToDelete(null)}
                    style={{ flex: 1, padding: '12px 0', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 700, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#E2E8F0'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                  >
                    Batal
                  </button>
                  <button
                    onClick={confirmDeleteMedia}
                    style={{ flex: 1, padding: '12px 0', backgroundColor: '#DC2626', color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#B91C1C'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#DC2626'; }}
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
