import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  FileText,
  Trash2,
  X,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { Session } from '../types';

interface SessionHistoryProps {
  sessions: Session[];
  onViewSession: (session: Session) => void;
  onDeleteSession: (sessionId: string) => void;
  onBack: () => void;
}

export default function SessionHistory({
  sessions,
  onViewSession,
  onDeleteSession,
  onBack,
}: SessionHistoryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; name: string } | null>(null);
  const itemsPerPage = 10;

  const FONT = "'Plus Jakarta Sans', sans-serif";

  const filteredSessions = sessions.filter(s =>
    s.patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.patient.rmNumber.includes(searchTerm) ||
    s.patient.procedures.some(p => p.toLowerCase().includes(searchTerm.toLowerCase())) ||
    s.patient.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredSessions.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentSessions = filteredSessions.slice(indexOfFirstItem, indexOfLastItem);

  const confirmDelete = () => {
    if (sessionToDelete) {
      onDeleteSession(sessionToDelete.id);
      setSessionToDelete(null);
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Poli': return '#3B82F6';
      case 'Kamar Operasi': return '#F97316';
      case 'IGD': return '#EF4444';
      default: return '#CBD5E1';
    }
  };

  // Pagination: show max 5 page numbers around current
  const getPageNumbers = () => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const start = Math.max(1, currentPage - 2);
    const end = Math.min(totalPages, start + 4);
    const adjusted = Math.max(1, end - 4);
    return Array.from({ length: end - adjusted + 1 }, (_, i) => adjusted + i);
  };

  return (
    <div
      style={{
        flex: 1, overflowY: 'auto', height: '100%',
        backgroundColor: '#F8FAFC', padding: 32,
        fontFamily: FONT,
      }}
      className="custom-scrollbar"
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Clock style={{ width: 20, height: 20, color: '#64748B' }} />
            <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0C1E35', margin: 0 }}>Riwayat Sesi</h2>
          </div>
          <p style={{ fontSize: 13, color: '#94A3B8', margin: 0 }}>
            {sessions.length} sesi tercatat
          </p>
        </div>
      </div>

      {/* Card wrapper */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: 14, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
        {/* Search bar */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 360 }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 14, height: 14, color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
              placeholder="Cari nama pasien, prosedur, ICD, RM..."
              style={{
                width: '100%', padding: '9px 34px 9px 36px', backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 13, color: '#0C1E35',
                outline: 'none', fontFamily: FONT, transition: 'border-color 150ms',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#2563EB'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#E2E8F0'; }}
            />
            {searchTerm && (
              <button
                onClick={() => { setSearchTerm(''); setCurrentPage(1); }}
                style={{
                  position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer',
                  padding: 2, display: 'flex',
                }}
              >
                <X style={{ width: 14, height: 14 }} />
              </button>
            )}
          </div>
          {searchTerm && (
            <span style={{ fontSize: 12, color: '#94A3B8', whiteSpace: 'nowrap' }}>
              {filteredSessions.length} hasil
            </span>
          )}
        </div>

        {/* Rows */}
        {filteredSessions.length === 0 ? (
          <div style={{ padding: '56px 0', textAlign: 'center' }}>
            <FileText style={{ width: 36, height: 36, color: '#E2E8F0', margin: '0 auto 10px', display: 'block' }} />
            <p style={{ fontSize: 13, fontWeight: 500, color: '#94A3B8' }}>
              {searchTerm ? 'Data Tidak Ditemukan' : 'Belum ada sesi tercatat'}
            </p>
          </div>
        ) : (
          <>
            <div>
              {currentSessions.map((session, idx) => (
                <div
                  key={session.id}
                  onClick={() => onViewSession(session)}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '12px 20px', gap: 12,
                    borderBottom: idx < currentSessions.length - 1 ? '1px solid #F8FAFC' : 'none',
                    cursor: 'pointer', transition: 'background 120ms',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFBFC'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  {/* Category bar */}
                  <div style={{ width: 3, height: 34, borderRadius: 2, backgroundColor: getCategoryColor(session.patient.category), flexShrink: 0 }} />

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0C1E35' }}>{session.patient.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B', marginTop: 2 }}>
                      {session.patient.procedures_icd9?.[0] || session.patient.procedures?.[0] || 'Prosedur'}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
                      {session.patient.diagnosis_icd10 && (
                        <span style={{ padding: '1px 6px', backgroundColor: '#EFF6FF', color: '#1D4ED8', fontSize: 9, fontWeight: 700, borderRadius: 4 }}>
                          {session.patient.diagnosis_icd10.split(' - ')[0]}
                        </span>
                      )}
                      <span style={{ padding: '1px 6px', backgroundColor: '#F1F5F9', color: '#64748B', fontSize: 9, fontWeight: 700, borderRadius: 4 }}>
                        {session.patient.category}
                      </span>
                      <span style={{ fontSize: 10, color: '#B0B8C4' }}>
                        {session.date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); onViewSession(session); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px',
                        backgroundColor: '#0C1E35', color: '#ffffff', border: 'none', borderRadius: 6,
                        fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'background 150ms',
                        fontFamily: FONT,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#1a3a5c'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#0C1E35'; }}
                    >
                      Laporan
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSessionToDelete({ id: session.id, name: session.patient.name }); }}
                      title="Hapus Sesi"
                      style={{
                        padding: '6px 10px', backgroundColor: 'transparent', border: '1px solid #E2E8F0',
                        borderRadius: 6, color: '#94A3B8', cursor: 'pointer', display: 'flex',
                        alignItems: 'center', justifyContent: 'center', transition: 'all 150ms',
                      }}
                      onMouseEnter={e => { const t = e.currentTarget as HTMLElement; t.style.backgroundColor = '#FEF2F2'; t.style.color = '#DC2626'; t.style.borderColor = '#FECACA'; }}
                      onMouseLeave={e => { const t = e.currentTarget as HTMLElement; t.style.backgroundColor = 'transparent'; t.style.color = '#94A3B8'; t.style.borderColor = '#E2E8F0'; }}
                    >
                      <Trash2 style={{ width: 13, height: 13 }} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination: ◀ [1] [2] [3] ▶ */}
            {totalPages > 1 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                padding: '12px 20px', borderTop: '1px solid #F1F5F9',
              }}>
                {/* Back arrow */}
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none', cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    backgroundColor: 'transparent', color: currentPage === 1 ? '#E2E8F0' : '#64748B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { if (currentPage !== 1) (e.currentTarget as HTMLElement).style.backgroundColor = '#F1F5F9'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <ChevronLeft style={{ width: 16, height: 16 }} />
                </button>

                {/* Page numbers */}
                {getPageNumbers().map(p => (
                  <button
                    key={p}
                    onClick={() => setCurrentPage(p)}
                    style={{
                      width: 32, height: 32, borderRadius: 8, fontSize: 12, fontWeight: 700,
                      border: 'none', cursor: 'pointer', transition: 'all 150ms',
                      backgroundColor: currentPage === p ? '#0C1E35' : 'transparent',
                      color: currentPage === p ? '#ffffff' : '#94A3B8',
                      fontFamily: FONT,
                    }}
                    onMouseEnter={e => { if (currentPage !== p) (e.currentTarget as HTMLElement).style.backgroundColor = '#F1F5F9'; }}
                    onMouseLeave={e => { if (currentPage !== p) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                  >
                    {p}
                  </button>
                ))}

                {/* Forward arrow */}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    width: 32, height: 32, borderRadius: 8, border: 'none', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    backgroundColor: 'transparent', color: currentPage === totalPages ? '#E2E8F0' : '#64748B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 150ms',
                  }}
                  onMouseEnter={e => { if (currentPage !== totalPages) (e.currentTarget as HTMLElement).style.backgroundColor = '#F1F5F9'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                >
                  <ChevronRight style={{ width: 16, height: 16 }} />
                </button>

                {/* Page info */}
                <span style={{ fontSize: 11, color: '#B0B8C4', marginLeft: 8 }}>
                  {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredSessions.length)} dari {filteredSessions.length}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      {/* Delete modal */}
      <AnimatePresence>
        {sessionToDelete && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
            onClick={() => setSessionToDelete(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ backgroundColor: '#ffffff', borderRadius: 20, padding: 28, maxWidth: 380, width: '100%' }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ width: 48, height: 48, backgroundColor: '#FEF2F2', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Trash2 style={{ width: 24, height: 24, color: '#EF4444' }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0C1E35', textAlign: 'center', marginBottom: 6 }}>Hapus Sesi?</h3>
              <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 20, lineHeight: 1.5 }}>
                Sesi untuk <span style={{ fontWeight: 700, color: '#0C1E35' }}>{sessionToDelete.name}</span> akan dihapus permanen.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setSessionToDelete(null)}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 13, border: '1px solid #E2E8F0', backgroundColor: '#ffffff', color: '#64748B', cursor: 'pointer', fontFamily: FONT }}
                >
                  Batal
                </button>
                <button
                  onClick={confirmDelete}
                  style={{ flex: 1, padding: '11px 0', borderRadius: 10, fontWeight: 700, fontSize: 13, border: 'none', backgroundColor: '#EF4444', color: '#ffffff', cursor: 'pointer', fontFamily: FONT }}
                >
                  Hapus
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}