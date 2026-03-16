import React, { useState } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Download, FileImage, FileVideo, Edit3, Trash2, AlertTriangle, FileText, ChevronDown, ChevronUp, Lock, Loader2 } from 'lucide-react';
import { AnimatePresence } from 'motion/react';
import { Session, Capture } from '../types';
import ImageEditor from './ImageEditor';
import { useToast } from './ToastProvider';
import { encryptData, getEncryptionKey } from '../lib/storage';

interface GalleryProps {
  session: Session;
  userId: string;
  onBack: () => void;
  onUpdateSession?: (session: Session) => void;
  onViewReport?: (session: Session) => void;
}

export default function Gallery({ session, userId, onBack, onUpdateSession, onViewReport }: GalleryProps) {
  const { showToast } = useToast();
  const [captures, setCaptures] = useState<Capture[]>(session.captures);
  const [editingPhoto, setEditingPhoto] = useState<Capture | null>(null);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [photosCollapsed, setPhotosCollapsed] = useState(false);
  const [videosCollapsed, setVideosCollapsed] = useState(false);
  const [exportingCase, setExportingCase] = useState(false);

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

  const exportAll = () => {
    const allMedia = captures;
    if (allMedia.length === 0) {
      showToast('Tidak ada media untuk diekspor.', 'warning');
      return;
    }

    showToast('Peringatan: File media yang diekspor tidak terenkripsi. Simpan di lokasi yang aman.', 'warning', 6000);

    allMedia.forEach((item, i) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = item.url;
        a.download = `endo_${session.patient.rmNumber}_${item.type === 'image' ? 'foto' : 'video'}_${i + 1}.${item.type === 'image' ? 'png' : 'mp4'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, i * 300);
    });
  };

  const exportSelected = () => {
    if (selectedIds.length === 0) return;
    showToast('Peringatan: File media yang diekspor tidak terenkripsi. Simpan di lokasi yang aman.', 'warning', 6000);
    const sel = captures.filter(c => selectedIds.includes(c.id));
    sel.forEach((cap, i) => {
      setTimeout(() => {
        downloadMedia(cap.url, cap.type);
      }, i * 300);
    });
    setSelectedIds([]);
  };

  const handleExportCase = async () => {
    if (exportingCase) return;
    setExportingCase(true);
    try {
      const JSZip = (await import('jszip')).default;
      const zip = new JSZip();
      const key = getEncryptionKey(userId);

      const sessionData = {
        ...session,
        captures: captures.map(c => ({ ...c, url: '', originalUrl: undefined, shapes: undefined })),
      };
      const encryptedSession = encryptData(JSON.stringify(sessionData), key);
      zip.file('session.enc', encryptedSession);

      const mediaFolder = zip.folder('media')!;
      const exportedMediaIds: string[] = [];
      let skippedCount = 0;
      for (let i = 0; i < captures.length; i++) {
        const cap = captures[i];
        try {
          const resp = await fetch(cap.url);
          const blob = await resp.blob();
          const ext = cap.type === 'image' ? 'png' : 'mp4';
          mediaFolder.file(`${cap.id}.${ext}`, blob);
          exportedMediaIds.push(cap.id);
        } catch {
          skippedCount++;
        }
      }

      const manifest = {
        type: 'aexon_case_export',
        userId,
        sessionId: session.id,
        patientRM: session.patient.rmNumber,
        exportDate: new Date().toISOString(),
        appVersion: '2.5.0',
        mediaCount: exportedMediaIds.length,
        mediaIds: exportedMediaIds,
      };
      const encryptedManifest = encryptData(JSON.stringify(manifest), key);
      zip.file('manifest.enc', encryptedManifest);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const dateStr = new Date().toISOString().slice(0, 10);
      let fnHash = 0;
      const fnSrc = `${session.id}_${userId}_${dateStr}`;
      for (let c = 0; c < fnSrc.length; c++) { fnHash = ((fnHash << 5) - fnHash) + fnSrc.charCodeAt(c); fnHash |= 0; }
      const fileId = Math.abs(fnHash).toString(36).toUpperCase().slice(0, 6);
      a.download = `Aexon_Case_${fileId}_${dateStr}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const msg = skippedCount > 0
        ? `Case berhasil diekspor (${exportedMediaIds.length} media, ${skippedCount} gagal). Restore melalui menu Backup & Restore.`
        : 'Case berhasil diekspor (terenkripsi). Restore melalui menu Backup & Restore.';
      showToast(msg, skippedCount > 0 ? 'warning' : 'success', 5000);
    } catch (err) {
      console.error('Export case error:', err);
      showToast('Gagal mengekspor case. Silakan coba lagi.', 'error');
    } finally {
      setExportingCase(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const renderMediaCard = (item: Capture, i: number) => {
    const isSelected = selectedIds.includes(item.id);
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: i * 0.03 }}
        key={item.id}
        data-gallery-item
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
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F8FAFC', overflow: 'hidden', position: 'relative' }}>
      {/* Header */}
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ backgroundColor: '#F1F5F9', borderRadius: 10, padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
              <strong style={{ color: '#0C1E35' }}>{photos.length}</strong> foto
            </span>
            <span style={{ width: 1, height: 14, backgroundColor: '#CBD5E1' }} />
            <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>
              <strong style={{ color: '#0C1E35' }}>{videos.length}</strong> video
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        {captures.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, backgroundColor: '#EFF6FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <FileImage style={{ width: 28, height: 28, color: '#94A3B8' }} />
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#94A3B8', marginBottom: 4 }}>
              Tidak ada media dalam sesi ini
            </p>
            <p style={{ fontSize: 12, color: '#CBD5E1' }}>
              Media akan muncul di sini setelah Anda melakukan capture
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Photos Section */}
            {photos.length > 0 && (
              <div>
                <button
                  onClick={() => setPhotosCollapsed(!photosCollapsed)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '10px 16px', marginBottom: photosCollapsed ? 0 : 14,
                    backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
                    cursor: 'pointer', transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileImage style={{ width: 16, height: 16, color: '#3B82F6' }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35', fontFamily: 'Outfit, sans-serif' }}>
                      Foto
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                      backgroundColor: '#EFF6FF', color: '#3B82F6',
                    }}>
                      {photos.length}
                    </span>
                  </div>
                  {photosCollapsed
                    ? <ChevronDown style={{ width: 18, height: 18, color: '#94A3B8' }} />
                    : <ChevronUp style={{ width: 18, height: 18, color: '#94A3B8' }} />
                  }
                </button>
                {!photosCollapsed && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {photos.map((item, i) => renderMediaCard(item, i))}
                  </div>
                )}
              </div>
            )}

            {/* Videos Section */}
            {videos.length > 0 && (
              <div>
                <button
                  onClick={() => setVideosCollapsed(!videosCollapsed)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', padding: '10px 16px', marginBottom: videosCollapsed ? 0 : 14,
                    backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
                    cursor: 'pointer', transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#CBD5E1'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <FileVideo style={{ width: 16, height: 16, color: '#D97706' }} />
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35', fontFamily: 'Outfit, sans-serif' }}>
                      Video
                    </span>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
                      backgroundColor: '#FEF3C7', color: '#D97706',
                    }}>
                      {videos.length}
                    </span>
                  </div>
                  {videosCollapsed
                    ? <ChevronDown style={{ width: 18, height: 18, color: '#94A3B8' }} />
                    : <ChevronUp style={{ width: 18, height: 18, color: '#94A3B8' }} />
                  }
                </button>
                {!videosCollapsed && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                    {videos.map((item, i) => renderMediaCard(item, i))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Bottom action bar */}
      <div style={{
        backgroundColor: '#fff', borderTop: '1px solid #E2E8F0',
        padding: '14px 24px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {selectedIds.length > 0 ? (
            <button
              onClick={exportSelected}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                backgroundColor: '#0C1E35', color: '#fff', border: 'none', borderRadius: 14,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 16px rgba(12,30,53,0.2)',
                transition: 'all 150ms', fontFamily: 'Outfit, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
            >
              <Download style={{ width: 16, height: 16 }} />
              Download {selectedIds.length} Media Terpilih
            </button>
          ) : captures.length > 0 ? (
            <button
              onClick={exportAll}
              style={{
                display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
                backgroundColor: '#F8FAFC', color: '#0C1E35', border: '1px solid #E2E8F0', borderRadius: 14,
                fontSize: 13, fontWeight: 700, cursor: 'pointer',
                transition: 'all 150ms', fontFamily: 'Outfit, sans-serif',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.borderColor = '#0C1E35'; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
            >
              <Download style={{ width: 16, height: 16 }} />
              Download Semua ({captures.length})
            </button>
          ) : null}

          <button
            onClick={handleExportCase}
            disabled={exportingCase}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '12px 24px',
              backgroundColor: '#F8FAFC', color: '#0C1E35', border: '1px solid #E2E8F0', borderRadius: 14,
              fontSize: 13, fontWeight: 700, cursor: exportingCase ? 'not-allowed' : 'pointer',
              transition: 'all 150ms', fontFamily: 'Outfit, sans-serif',
              opacity: exportingCase ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!exportingCase) { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.borderColor = '#0C1E35'; } }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.borderColor = '#E2E8F0'; }}
          >
            {exportingCase ? (
              <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" />
            ) : (
              <Lock style={{ width: 14, height: 14 }} />
            )}
            {exportingCase ? 'Mengekspor...' : 'Export Case'}
          </button>
        </div>

        <button
          onClick={() => onViewReport?.(session)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '12px 28px',
            backgroundColor: '#0C1E35', color: '#fff', border: 'none', borderRadius: 14,
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(12,30,53,0.25)',
            transition: 'all 150ms', fontFamily: 'Outfit, sans-serif',
          }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          <FileText style={{ width: 16, height: 16 }} />
          Buat Laporan
        </button>
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
