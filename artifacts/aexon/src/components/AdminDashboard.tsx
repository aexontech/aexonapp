import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  UserPlus, 
  Search, 
  MoreVertical, 
  ShieldCheck, 
  Activity, 
  Calendar,
  Mail,
  CheckCircle2,
  XCircle,
  Building2
} from 'lucide-react';
import { UserProfile } from '../types';

interface AdminDashboardProps {
  doctors: UserProfile[];
  enterprise_id?: string | null;
  onAddDoctor: () => void;
  onEditDoctor: (doctor: UserProfile) => void;
  onDeleteDoctor: (id: string) => void;
  onToggleDoctorStatus: (id: string) => void;
  onManageSubscription: () => void;
}

export default function AdminDashboard({ 
  doctors, 
  enterprise_id,
  onAddDoctor, 
  onEditDoctor, 
  onDeleteDoctor, 
  onToggleDoctorStatus, 
  onManageSubscription 
}: AdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [doctorToDelete, setDoctorToDelete] = useState<UserProfile | null>(null);

  const institutionDoctors = enterprise_id 
    ? doctors.filter(d => d.enterprise_id === enterprise_id)
    : doctors;

  const filteredDoctors = institutionDoctors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleDeleteClick = (doctor: UserProfile) => {
    setDoctorToDelete(doctor);
    setSelectedDoctorId(null);
  };

  const confirmDelete = () => {
    if (doctorToDelete) {
      onDeleteDoctor(doctorToDelete.id);
      setDoctorToDelete(null);
    }
  };

  const stats = [
    { label: 'Total Dokter', value: institutionDoctors.length.toString(), icon: Users, gradient: 'linear-gradient(135deg, #3B82F6, #2563EB)' },
    { label: 'Aktif Hari Ini', value: institutionDoctors.filter(d => d.status === 'active').length.toString(), icon: Activity, gradient: 'linear-gradient(135deg, #059669, #047857)' },
    { label: 'Sesi Selesai', value: '142', icon: CheckCircle2, gradient: 'linear-gradient(135deg, #6366F1, #4F46E5)' },
  ];

  return (
    <div className="custom-scrollbar" style={{ flex: 1, padding: 32, maxWidth: 1280, margin: '0 auto', width: '100%', overflowY: 'auto', height: '100%', position: 'relative', backgroundColor: '#F8FAFC' }}>
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div className="orb-tr" />
        <div className="orb-bl" />
      </div>

      <div style={{ marginBottom: 40, position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
          <div>
            <span style={{
              display: 'inline-block', padding: '4px 14px', backgroundColor: '#EFF6FF',
              color: '#1D4ED8', fontSize: 11, fontWeight: 700, borderRadius: 20,
              border: '1px solid #DBEAFE', marginBottom: 16, letterSpacing: '0.03em',
            }}>
              Admin Institusi
            </span>
            <h2 className="font-aexon" style={{ fontSize: 36, fontWeight: 800, color: '#0C1E35', letterSpacing: '-0.02em', lineHeight: 1.1, marginBottom: 8 }}>
              Enterprise Admin Console
            </h2>
            <p style={{ fontSize: 15, color: '#94A3B8', fontWeight: 500 }}>
              Manajemen akun tenaga medis dan monitoring sistem korporat.
            </p>
          </div>
          <button
            onClick={onAddDoctor}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 24px', backgroundColor: '#0C1E35', color: '#ffffff',
              border: 'none', borderRadius: 12, fontSize: 14, fontWeight: 700,
              cursor: 'pointer', boxShadow: '0 4px 16px rgba(12,30,53,0.2)',
              transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif',
            }}
            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1a3a5c'}
            onMouseLeave={e => e.currentTarget.style.backgroundColor = '#0C1E35'}
          >
            <UserPlus style={{ width: 18, height: 18 }} />
            Tambah Dokter Baru
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 32 }}>
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              style={{
                backgroundColor: '#ffffff', padding: 24, borderRadius: 20,
                border: '1px solid #E2E8F0',
                boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
                position: 'relative', overflow: 'hidden',
                transition: 'box-shadow 200ms, border-color 200ms',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 32px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLElement).style.borderColor = '#CBD5E1'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 24px rgba(0,0,0,0.04)'; (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; }}
            >
              <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: stat.gradient, opacity: 0.06 }} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{stat.label}</p>
                  <h3 style={{ fontSize: 30, fontWeight: 800, color: '#0C1E35', fontFamily: 'Outfit, sans-serif' }}>{stat.value}</h3>
                </div>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  background: stat.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                }}>
                  <stat.icon style={{ width: 22, height: 22, color: '#ffffff' }} />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div style={{
        backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 24,
        overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.04)',
        position: 'relative', zIndex: 10,
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #F1F5F9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
        }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: '#0C1E35', display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck style={{ width: 18, height: 18, color: '#3B82F6' }} />
            Daftar Dokter Terdaftar
          </h3>
          <div style={{ position: 'relative', maxWidth: 320, width: '100%' }}>
            <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 16, height: 16, color: '#94A3B8', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Cari nama, spesialisasi, atau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%', padding: '10px 16px 10px 40px',
                backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0',
                borderRadius: 12, fontSize: 13, color: '#0C1E35',
                outline: 'none', fontFamily: 'Plus Jakarta Sans, sans-serif',
                transition: 'border-color 150ms',
              }}
              onFocus={e => e.currentTarget.style.borderColor = '#0C1E35'}
              onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#FAFBFC' }}>
                {['Dokter', 'Spesialisasi', 'Status', 'Login Terakhir', ''].map((h, hi) => (
                  <th key={hi} style={{
                    padding: '14px 24px', fontSize: 10, fontWeight: 700, color: '#94A3B8',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                    textAlign: hi === 4 ? 'right' : 'left',
                  }}>
                    {h || 'Aksi'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredDoctors.map((doctor, i) => (
                <motion.tr
                  key={doctor.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  style={{ borderTop: '1px solid #F1F5F9', transition: 'background-color 150ms' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFBFC'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'}
                >
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%',
                        backgroundColor: '#0C1E35',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#ffffff', fontWeight: 700, fontSize: 14,
                        fontFamily: 'Outfit, sans-serif', flexShrink: 0,
                      }}>
                        {doctor.name.split(' ').filter(n => !n.startsWith('Dr.'))[0]?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35' }}>{doctor.name}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                          <Mail style={{ width: 11, height: 11 }} /> {doctor.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <span style={{
                      fontSize: 13, fontWeight: 600, color: '#475569',
                      backgroundColor: '#F1F5F9', padding: '4px 12px', borderRadius: 20,
                    }}>
                      {doctor.specialization}
                    </span>
                    <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>STR: {doctor.strNumber || '-'}</span>
                      <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600 }}>SIP: {doctor.sipNumber || '-'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {doctor.status === 'active' ? (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 700, color: '#065F46',
                        backgroundColor: '#ECFDF5', padding: '4px 10px', borderRadius: 8,
                      }}>
                        <CheckCircle2 style={{ width: 12, height: 12 }} /> AKTIF
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 700, color: '#94A3B8',
                        backgroundColor: '#F1F5F9', padding: '4px 10px', borderRadius: 8,
                      }}>
                        <XCircle style={{ width: 12, height: 12 }} /> NONAKTIF
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    <div style={{ fontSize: 12, color: '#64748B', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar style={{ width: 12, height: 12 }} />
                      {doctor.lastLogin?.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right', position: 'relative' }}>
                    <button
                      onClick={() => setSelectedDoctorId(selectedDoctorId === doctor.id ? null : doctor.id)}
                      style={{
                        padding: 8, backgroundColor: 'transparent', border: 'none',
                        color: '#94A3B8', cursor: 'pointer', borderRadius: 8,
                        transition: 'all 150ms', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EFF6FF'; e.currentTarget.style.color = '#3B82F6'; }}
                      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
                    >
                      <MoreVertical style={{ width: 18, height: 18 }} />
                    </button>

                    <AnimatePresence>
                      {selectedDoctorId === doctor.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          style={{
                            position: 'absolute', right: 24, top: 52,
                            width: 200, backgroundColor: '#ffffff',
                            border: '1px solid #E2E8F0', borderRadius: 16,
                            boxShadow: '0 20px 40px rgba(0,0,0,0.12)', zIndex: 50,
                            overflow: 'hidden',
                          }}
                        >
                          <div style={{ padding: 6, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <button
                              onClick={() => { onToggleDoctorStatus(doctor.id); setSelectedDoctorId(null); }}
                              style={{
                                width: '100%', textAlign: 'left', padding: '10px 14px',
                                fontSize: 12, fontWeight: 700, color: '#475569',
                                backgroundColor: 'transparent', border: 'none', borderRadius: 10,
                                cursor: 'pointer', transition: 'background-color 150ms',
                                display: 'flex', alignItems: 'center', gap: 10,
                                fontFamily: 'Plus Jakarta Sans, sans-serif',
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Activity style={{ width: 14, height: 14, color: '#94A3B8' }} />
                              {doctor.status === 'active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                            </button>
                            <button
                              onClick={() => { onEditDoctor(doctor); setSelectedDoctorId(null); }}
                              style={{
                                width: '100%', textAlign: 'left', padding: '10px 14px',
                                fontSize: 12, fontWeight: 700, color: '#475569',
                                backgroundColor: 'transparent', border: 'none', borderRadius: 10,
                                cursor: 'pointer', transition: 'background-color 150ms',
                                display: 'flex', alignItems: 'center', gap: 10,
                                fontFamily: 'Plus Jakarta Sans, sans-serif',
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <Users style={{ width: 14, height: 14, color: '#94A3B8' }} />
                              Edit Profil
                            </button>
                            <div style={{ height: 1, backgroundColor: '#F1F5F9', margin: '2px 0' }} />
                            <button
                              onClick={() => handleDeleteClick(doctor)}
                              style={{
                                width: '100%', textAlign: 'left', padding: '10px 14px',
                                fontSize: 12, fontWeight: 700, color: '#DC2626',
                                backgroundColor: 'transparent', border: 'none', borderRadius: 10,
                                cursor: 'pointer', transition: 'background-color 150ms',
                                display: 'flex', alignItems: 'center', gap: 10,
                                fontFamily: 'Plus Jakarta Sans, sans-serif',
                              }}
                              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#FEF2F2'}
                              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            >
                              <XCircle style={{ width: 14, height: 14, color: '#EF4444' }} />
                              Hapus Akun
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredDoctors.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 500 }}>Tidak ada dokter yang ditemukan.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {doctorToDelete && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDoctorToDelete(null)}
              style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)' }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              style={{
                position: 'relative', width: '100%', maxWidth: 420,
                backgroundColor: '#ffffff', borderRadius: 24, padding: 36,
                boxShadow: '0 25px 50px rgba(0,0,0,0.15)', overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#EF4444' }} />
              <div style={{
                width: 64, height: 64, backgroundColor: '#FEF2F2', borderRadius: 20,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px',
              }}>
                <XCircle style={{ width: 32, height: 32, color: '#EF4444' }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0C1E35', textAlign: 'center', marginBottom: 8 }}>Hapus Akun Dokter?</h3>
              <p style={{ fontSize: 14, color: '#64748B', textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
                Apakah Anda yakin ingin menghapus akun <span style={{ fontWeight: 700, color: '#0C1E35' }}>"{doctorToDelete.name}"</span>? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                  onClick={confirmDelete}
                  style={{
                    width: '100%', padding: '14px 0', backgroundColor: '#EF4444', color: '#ffffff',
                    border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 13,
                    cursor: 'pointer', transition: 'background-color 150ms',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#DC2626'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EF4444'}
                >
                  Ya, Hapus Akun
                </button>
                <button
                  onClick={() => setDoctorToDelete(null)}
                  style={{
                    width: '100%', padding: '14px 0', backgroundColor: '#F1F5F9', color: '#475569',
                    border: 'none', borderRadius: 14, fontWeight: 700, fontSize: 13,
                    cursor: 'pointer', transition: 'background-color 150ms',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E2E8F0'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                >
                  Batalkan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div style={{
        marginTop: 40, padding: 24, backgroundColor: '#0C1E35', borderRadius: 24,
        color: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 24, boxShadow: '0 8px 32px rgba(12,30,53,0.2)',
        position: 'relative', zIndex: 10, overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: '-50%', right: '-10%', width: '40%', height: '200%', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '50%', filter: 'blur(60px)' }} />
        <div style={{ display: 'flex', alignItems: 'center', position: 'relative', zIndex: 1, gap: 16 }}>
          <div style={{
            padding: 12, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Building2 style={{ width: 28, height: 28 }} />
          </div>
          <div>
            <h4 style={{ fontSize: 16, fontWeight: 800 }}>Enterprise Plan: RSUP Jakarta</h4>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
              Lisensi Aktif hingga 12 Des 2026 • {institutionDoctors.length}/50 Akun Terpakai
            </p>
          </div>
        </div>
        <button
          onClick={onManageSubscription}
          style={{
            position: 'relative', zIndex: 1,
            padding: '10px 24px', backgroundColor: '#ffffff', color: '#0C1E35',
            fontWeight: 700, borderRadius: 12, border: 'none',
            cursor: 'pointer', fontSize: 13, transition: 'background-color 150ms',
            fontFamily: 'Outfit, sans-serif',
          }}
          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
          onMouseLeave={e => e.currentTarget.style.backgroundColor = '#ffffff'}
        >
          Kelola Langganan
        </button>
      </div>
    </div>
  );
}
