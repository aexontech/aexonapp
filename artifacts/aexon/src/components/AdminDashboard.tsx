import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Users, UserPlus, Search, MoreVertical, Activity, Calendar,
  XCircle, Crown, Stethoscope, Phone, BadgeCheck, ChevronDown,
  Loader2, Building2, RefreshCw,
} from 'lucide-react';

interface EnterpriseDoctor {
  id: string;
  user_id: string | null;
  full_name: string;
  specialty: string | null;
  email: string;
  phone: string | null;
  str_number: string | null;
  sip_number: string | null;
  role: string;
  status: 'active' | 'inactive';
  created_at: string;
}

interface AdminDashboardProps {
  enterprise_id?: string | null;
  onAddDoctor: () => void;
  onManageSubscription: () => void;
  onSubscribe: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning') => void;
}

const FONT = "'Plus Jakarta Sans', sans-serif";

export default function AdminDashboard({ enterprise_id, onAddDoctor, onManageSubscription, onSubscribe, onShowToast }: AdminDashboardProps) {
  const [doctors, setDoctors] = useState<EnterpriseDoctor[]>([]);
  const [institution, setInstitution] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [doctorToRemove, setDoctorToRemove] = useState<EnterpriseDoctor | null>(null);
  const [expandedDoctorId, setExpandedDoctorId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchDoctors = useCallback(async () => {
    try {
      const { aexonConnect } = await import('../lib/aexonConnect');
      const [doctorsRes, instRes] = await Promise.all([
        aexonConnect.getEnterpriseDoctors(),
        aexonConnect.getInstitution(),
      ]);
      if (doctorsRes.data) setDoctors(doctorsRes.data.doctors.filter((d: any) => d.role !== 'admin'));
      if (instRes.data) setInstitution(instRes.data);
    } catch (err) { console.error('[AdminDashboard] fetch error:', err); }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { fetchDoctors(); }, [fetchDoctors]);

  const handleRemoveDoctor = async (doctor: EnterpriseDoctor) => {
    setActionLoading(doctor.id);
    try {
      const { aexonConnect } = await import('../lib/aexonConnect');
      const { data, error } = await aexonConnect.removeEnterpriseDoctor(doctor.id);
      if (error) onShowToast(error, 'error');
      else { onShowToast(data?.message || 'Dokter dikeluarkan.', 'success'); fetchDoctors(); }
    } catch { onShowToast('Gagal.', 'error'); }
    finally { setActionLoading(null); setDoctorToRemove(null); setSelectedDoctorId(null); }
  };

  const handleToggleStatus = async (doctorId: string) => {
    setActionLoading(doctorId);
    try {
      const { aexonConnect } = await import('../lib/aexonConnect');
      const { data, error } = await aexonConnect.toggleEnterpriseDoctorStatus(doctorId);
      if (error) onShowToast(error, 'error');
      else { onShowToast(data?.message || 'Status diperbarui.', 'success'); fetchDoctors(); }
    } catch { onShowToast('Gagal.', 'error'); }
    finally { setActionLoading(null); setSelectedDoctorId(null); }
  };

  const filtered = doctors.filter(d =>
    d.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (d.specialty || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const activeCount = doctors.filter(d => d.status === 'active').length;
  const inactiveCount = doctors.filter(d => d.status === 'inactive').length;
  const seatsFull = institution ? institution.used_seats >= institution.total_seats : false;
  const isExpired = institution?.subscription_expires_at ? new Date(institution.subscription_expires_at) < new Date() : true;

  const initials = (name: string) => {
    const p = name.split(' ').filter(n => !n.match(/^(Dr\.|dr\.|Prof\.)/i));
    return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : (p[0]?.[0] || 'D').toUpperCase();
  };
  const grads = ['linear-gradient(135deg,#3B82F6,#1D4ED8)','linear-gradient(135deg,#8B5CF6,#6D28D9)','linear-gradient(135deg,#059669,#047857)','linear-gradient(135deg,#E11D48,#BE123C)','linear-gradient(135deg,#F59E0B,#D97706)','linear-gradient(135deg,#0891B2,#0E7490)'];

  return (
    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', height: '100%', backgroundColor: '#F8FAFC' }}>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="orb-tr" /><div className="orb-bl" />
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '36px 32px 48px', position: 'relative', zIndex: 10 }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20, marginBottom: 28 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ padding: '5px 14px', backgroundColor: 'rgba(12,30,53,0.06)', color: '#0C1E35', fontSize: 11, fontWeight: 700, borderRadius: 20, letterSpacing: '0.05em', textTransform: 'uppercase' }}>Admin Panel</span>
                {institution && <span style={{ padding: '5px 14px', backgroundColor: '#ECFDF5', color: '#065F46', fontSize: 11, fontWeight: 700, borderRadius: 20, display: 'inline-flex', alignItems: 'center', gap: 4 }}><Building2 style={{ width: 12, height: 12 }} /> {institution.name}</span>}
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0C1E35', letterSpacing: '-0.02em', marginBottom: 4, fontFamily: FONT }}>Manajemen Institusi</h2>
              <p style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>Kelola akun dokter dan pantau seat enterprise.</p>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <button onClick={fetchDoctors} title="Refresh" style={{ width: 44, height: 44, borderRadius: 12, border: '1px solid #E2E8F0', backgroundColor: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <RefreshCw style={{ width: 16, height: 16, color: '#64748B' }} />
              </button>
              <button onClick={onAddDoctor} disabled={seatsFull || isExpired} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 24px', height: 44, background: seatsFull || isExpired ? '#94A3B8' : 'linear-gradient(135deg,#0C1E35,#152d4f)', color: '#fff', border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: seatsFull || isExpired ? 'not-allowed' : 'pointer', fontFamily: FONT, boxShadow: seatsFull || isExpired ? 'none' : '0 4px 20px rgba(12,30,53,0.25)' }}>
                <UserPlus style={{ width: 16, height: 16 }} /> {isExpired ? 'Expired' : seatsFull ? 'Seat Penuh' : 'Undang Dokter'}
              </button>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { l: 'Total Dokter', v: doctors.length, I: Users, c: '#3B82F6', b: '#EFF6FF' },
              { l: 'Aktif', v: activeCount, I: Activity, c: '#10B981', b: '#ECFDF5' },
              { l: 'Nonaktif', v: inactiveCount, I: XCircle, c: '#F59E0B', b: '#FFFBEB' },
              { l: 'Seat', v: institution ? `${institution.used_seats}/${institution.total_seats}` : '-', I: Crown, c: '#8B5CF6', b: '#F5F3FF' },
            ].map(s => (
              <div key={s.l} style={{ backgroundColor: '#fff', padding: '20px 22px', borderRadius: 16, border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: s.b, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <s.I style={{ width: 16, height: 16, color: s.c }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>{s.l}</span>
                </div>
                <p style={{ fontSize: 26, fontWeight: 800, color: '#0C1E35', margin: 0 }}>{s.v}</p>
              </div>
            ))}
          </div>

          {isLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '80px 0', gap: 10 }}>
              <Loader2 style={{ width: 22, height: 22, color: '#94A3B8', animation: 'spin 1s linear infinite' }} />
              <span style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Memuat...</span>
            </div>
          ) : (
          <div style={{ backgroundColor: '#fff', borderRadius: 16, border: '1px solid #E2E8F0', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 10 }}>
              <Search style={{ width: 16, height: 16, color: '#94A3B8' }} />
              <input type="text" placeholder="Cari dokter..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                style={{ flex: 1, fontSize: 13, fontWeight: 500, color: '#0C1E35', border: 'none', outline: 'none', backgroundColor: 'transparent', fontFamily: FONT }} />
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>{filtered.length}</span>
            </div>
            {filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '56px 24px' }}>
                <Users style={{ width: 44, height: 44, color: '#E2E8F0', margin: '0 auto 14px', display: 'block' }} />
                <p style={{ fontSize: 15, fontWeight: 700, color: '#94A3B8', margin: '0 0 4px' }}>{doctors.length === 0 ? 'Belum Ada Dokter' : 'Tidak Ditemukan'}</p>
                {doctors.length === 0 && !seatsFull && !isExpired && <button onClick={onAddDoctor} style={{ marginTop: 16, padding: '10px 22px', background: '#0C1E35', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}>Undang Dokter Pertama</button>}
              </div>
            ) : filtered.map((doc, idx) => {
              const active = doc.role === 'doctor';
              const expanded = expandedDoctorId === doc.id;
              return (
                <div key={doc.id} style={{ borderBottom: idx < filtered.length - 1 ? '1px solid #F8FAFC' : 'none' }}>
                  <div onClick={() => setExpandedDoctorId(expanded ? null : doc.id)} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', gap: 14, cursor: 'pointer' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: grads[idx % grads.length], display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 14, fontWeight: 800 }}>{initials(doc.full_name)}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#0C1E35', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{doc.full_name}</span>
                        <span style={{ padding: '2px 7px', borderRadius: 5, fontSize: 10, fontWeight: 700, backgroundColor: active ? '#ECFDF5' : '#FEF3C7', color: active ? '#065F46' : '#92400E' }}>{active ? 'Aktif' : 'Nonaktif'}</span>
                      </div>
                      <p style={{ fontSize: 11, color: '#94A3B8', margin: '2px 0 0' }}>{doc.specialty || 'Spesialis'} · {doc.email}</p>
                    </div>
                    <ChevronDown style={{ width: 14, height: 14, color: '#CBD5E1', transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
                    <div style={{ position: 'relative' }}>
                      <button onClick={e => { e.stopPropagation(); setSelectedDoctorId(selectedDoctorId === doc.id ? null : doc.id); }} style={{ width: 30, height: 30, borderRadius: 8, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <MoreVertical style={{ width: 14, height: 14, color: '#94A3B8' }} />
                      </button>
                      <AnimatePresence>
                        {selectedDoctorId === doc.id && (
                          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} onClick={e => e.stopPropagation()}
                            style={{ position: 'absolute', right: 0, top: '100%', zIndex: 50, width: 170, backgroundColor: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', boxShadow: '0 8px 24px rgba(0,0,0,0.08)', padding: 5, marginTop: 4 }}>
                            <button onClick={() => handleToggleStatus(doc.id)} disabled={actionLoading === doc.id} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: 12, fontWeight: 600, color: '#475569', backgroundColor: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 7 }}>
                              <Activity style={{ width: 13, height: 13 }} /> {active ? 'Nonaktifkan' : 'Aktifkan'}
                            </button>
                            <button onClick={() => { setDoctorToRemove(doc); setSelectedDoctorId(null); }} style={{ width: '100%', textAlign: 'left', padding: '8px 10px', fontSize: 12, fontWeight: 600, color: '#DC2626', backgroundColor: 'transparent', border: 'none', borderRadius: 7, cursor: 'pointer', fontFamily: FONT, display: 'flex', alignItems: 'center', gap: 7 }}>
                              <XCircle style={{ width: 13, height: 13, color: '#EF4444' }} /> Keluarkan
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <AnimatePresence>
                    {expanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} style={{ overflow: 'hidden' }}>
                        <div style={{ padding: '0 20px 14px', marginLeft: 54, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                          {[
                            { l: 'STR', v: doc.str_number, I: BadgeCheck, c: '#3B82F6' },
                            { l: 'SIP', v: doc.sip_number, I: Stethoscope, c: '#8B5CF6' },
                            { l: 'Telepon', v: doc.phone, I: Phone, c: '#10B981' },
                            { l: 'Bergabung', v: new Date(doc.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }), I: Calendar, c: '#F59E0B' },
                          ].map(f => (
                            <div key={f.l} style={{ padding: '10px 12px', backgroundColor: '#F8FAFC', borderRadius: 10, border: '1px solid #F1F5F9' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                                <f.I style={{ width: 11, height: 11, color: f.c }} />
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{f.l}</span>
                              </div>
                              <p style={{ fontSize: 12, fontWeight: 600, color: '#0C1E35', margin: 0 }}>{f.v || '-'}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>

      {/* Remove modal */}
      <AnimatePresence>
        {doctorToRemove && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDoctorToRemove(null)} style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} style={{ position: 'relative', width: '100%', maxWidth: 380, backgroundColor: '#fff', borderRadius: 20, padding: 28, boxShadow: '0 25px 50px rgba(0,0,0,0.15)' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#EF4444' }} />
              <div style={{ width: 48, height: 48, backgroundColor: '#FEF2F2', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}><XCircle style={{ width: 24, height: 24, color: '#EF4444' }} /></div>
              <h3 style={{ fontSize: 17, fontWeight: 800, color: '#0C1E35', textAlign: 'center', marginBottom: 6 }}>Keluarkan Dokter?</h3>
              <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 22, lineHeight: 1.6 }}><strong style={{ color: '#0C1E35' }}>{doctorToRemove.full_name}</strong> akan dikeluarkan. Akun tidak dihapus.</p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => setDoctorToRemove(null)} style={{ flex: 1, padding: '11px 0', backgroundColor: '#F1F5F9', color: '#475569', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT }}>Batal</button>
                <button onClick={() => handleRemoveDoctor(doctorToRemove)} disabled={actionLoading === doctorToRemove.id} style={{ flex: 1, padding: '11px 0', backgroundColor: '#EF4444', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: FONT, opacity: actionLoading === doctorToRemove.id ? 0.7 : 1 }}>{actionLoading === doctorToRemove.id ? '...' : 'Ya, Keluarkan'}</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}