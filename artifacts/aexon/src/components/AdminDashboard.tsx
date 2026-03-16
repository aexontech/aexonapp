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
  XCircle,
  Crown,
  Sparkles,
  ArrowRight,
  CreditCard,
  Stethoscope,
  Phone,
  BadgeCheck,
  ChevronDown,
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
  onSubscribe: () => void;
}

export default function AdminDashboard({ 
  doctors, 
  enterprise_id,
  onAddDoctor, 
  onEditDoctor, 
  onDeleteDoctor, 
  onToggleDoctorStatus, 
  onManageSubscription,
  onSubscribe
}: AdminDashboardProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [doctorToDelete, setDoctorToDelete] = useState<UserProfile | null>(null);
  const [expandedDoctorId, setExpandedDoctorId] = useState<string | null>(null);

  const institutionDoctors = enterprise_id 
    ? doctors.filter(d => d.enterprise_id === enterprise_id)
    : doctors;

  const filteredDoctors = institutionDoctors.filter(d => 
    d.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeDoctors = institutionDoctors.filter(d => d.status === 'active');
  const inactiveDoctors = institutionDoctors.filter(d => d.status !== 'active');

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

  const getInitials = (name: string) => {
    const parts = name.split(' ').filter(n => !n.match(/^(Dr\.|dr\.|Prof\.)/i));
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (parts[0]?.[0] || 'D').toUpperCase();
  };

  const avatarGradients = [
    'linear-gradient(135deg, #3B82F6, #1D4ED8)',
    'linear-gradient(135deg, #8B5CF6, #6D28D9)',
    'linear-gradient(135deg, #059669, #047857)',
    'linear-gradient(135deg, #E11D48, #BE123C)',
    'linear-gradient(135deg, #F59E0B, #D97706)',
    'linear-gradient(135deg, #0891B2, #0E7490)',
  ];

  return (
    <div className="custom-scrollbar" style={{ flex: 1, overflowY: 'auto', height: '100%', backgroundColor: '#F8FAFC' }}>
      <div style={{ position: 'relative', overflow: 'hidden' }}>
        <div className="orb-tr" />
        <div className="orb-bl" />

        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '36px 32px 48px', position: 'relative', zIndex: 10 }}>

          {/* Hero Header */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{
                    padding: '5px 14px', backgroundColor: 'rgba(12,30,53,0.06)',
                    color: '#0C1E35', fontSize: 11, fontWeight: 700, borderRadius: 20,
                    letterSpacing: '0.05em', textTransform: 'uppercase',
                  }}>
                    Admin Panel
                  </span>
                  <span style={{
                    padding: '5px 14px', backgroundColor: '#ECFDF5',
                    color: '#065F46', fontSize: 11, fontWeight: 700, borderRadius: 20,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                  }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                    Sistem Aktif
                  </span>
                </div>
                <h2 className="font-aexon" style={{
                  fontSize: 32, fontWeight: 800, color: '#0C1E35',
                  letterSpacing: '-0.02em', lineHeight: 1.15, marginBottom: 6,
                }}>
                  Manajemen Institusi
                </h2>
                <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 500, maxWidth: 460 }}>
                  Kelola akun dokter, pantau aktivitas, dan atur langganan enterprise.
                </p>
              </div>
              <button
                onClick={onAddDoctor}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '13px 26px', backgroundColor: '#0C1E35', color: '#ffffff',
                  border: 'none', borderRadius: 14, fontSize: 14, fontWeight: 700,
                  cursor: 'pointer', boxShadow: '0 4px 20px rgba(12,30,53,0.25)',
                  transition: 'all 150ms', fontFamily: 'Outfit, sans-serif',
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <UserPlus style={{ width: 18, height: 18 }} />
                Tambah Dokter
              </button>
            </div>
          </div>

          {/* Stats Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'Total Dokter', value: institutionDoctors.length, icon: Users, color: '#3B82F6', bg: '#EFF6FF' },
              { label: 'Dokter Aktif', value: activeDoctors.length, icon: Activity, color: '#10B981', bg: '#ECFDF5' },
              { label: 'Dokter Nonaktif', value: inactiveDoctors.length, icon: XCircle, color: '#F59E0B', bg: '#FFFBEB' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                style={{
                  backgroundColor: '#ffffff', padding: '22px 24px', borderRadius: 18,
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  transition: 'box-shadow 200ms, border-color 200ms',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.06)'; (e.currentTarget as HTMLElement).style.borderColor = '#CBD5E1'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.03)'; (e.currentTarget as HTMLElement).style.borderColor = '#E2E8F0'; }}
              >
                <div>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{stat.label}</p>
                  <h3 style={{ fontSize: 28, fontWeight: 800, color: '#0C1E35', fontFamily: 'Outfit, sans-serif', lineHeight: 1 }}>{stat.value}</h3>
                </div>
                <div style={{
                  width: 44, height: 44, borderRadius: 14,
                  backgroundColor: stat.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <stat.icon style={{ width: 22, height: 22, color: stat.color }} />
                </div>
              </motion.div>
            ))}
          </div>

          {/* Subscription Banner */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            style={{
              marginBottom: 24, borderRadius: 18, overflow: 'hidden',
              background: 'linear-gradient(135deg, #0C1E35 0%, #1a3a5c 60%, #0C1E35 100%)',
              padding: '22px 28px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20,
              position: 'relative',
            }}
          >
            <div style={{
              position: 'absolute', top: -30, right: -30, width: 120, height: 120,
              borderRadius: '50%', background: 'radial-gradient(circle, rgba(245,158,11,0.15) 0%, transparent 70%)',
            }} />
            <div style={{
              position: 'absolute', bottom: -20, left: '30%', width: 100, height: 100,
              borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',
            }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, position: 'relative', zIndex: 1 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12,
                background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(245,158,11,0.35)',
                flexShrink: 0,
              }}>
                <Crown style={{ width: 20, height: 20, color: '#fff' }} />
              </div>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 800, color: '#ffffff', fontFamily: 'Outfit, sans-serif', marginBottom: 3 }}>
                  Enterprise Plan
                </h4>
                <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', margin: 0 }}>
                  Kelola paket langganan dan kuota seat institusi Anda
                </p>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, position: 'relative', zIndex: 1, flexShrink: 0 }}>
              <button
                onClick={onManageSubscription}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px', backgroundColor: 'rgba(255,255,255,0.08)',
                  color: '#ffffff', borderRadius: 12, fontSize: 13, fontWeight: 700,
                  border: '1px solid rgba(255,255,255,0.12)', cursor: 'pointer',
                  fontFamily: 'Outfit, sans-serif', transition: 'all 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.14)'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.08)'; }}
              >
                <CreditCard style={{ width: 14, height: 14 }} />
                Kelola
              </button>
              <button
                onClick={onSubscribe}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '10px 20px',
                  background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                  color: '#0C1E35', borderRadius: 12, fontSize: 13, fontWeight: 800,
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'Outfit, sans-serif', transition: 'all 150ms',
                  boxShadow: '0 2px 12px rgba(245,158,11,0.3)',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(245,158,11,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 12px rgba(245,158,11,0.3)'; }}
              >
                <Sparkles style={{ width: 14, height: 14 }} />
                Perpanjang
                <ArrowRight style={{ width: 14, height: 14 }} />
              </button>
            </div>
          </motion.div>

          {/* Doctor List Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            style={{
              backgroundColor: '#ffffff', border: '1px solid #E2E8F0', borderRadius: 20,
              overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.03)',
            }}
          >
            {/* Table Header */}
            <div style={{
              padding: '18px 24px', borderBottom: '1px solid #F1F5F9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 10, backgroundColor: '#EFF6FF',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <ShieldCheck style={{ width: 16, height: 16, color: '#3B82F6' }} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0C1E35', lineHeight: 1.2 }}>
                    Daftar Dokter
                  </h3>
                  <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, marginTop: 1 }}>
                    {institutionDoctors.length} dokter terdaftar
                  </p>
                </div>
              </div>
              <div style={{ position: 'relative', width: 280 }}>
                <Search style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 15, height: 15, color: '#94A3B8', pointerEvents: 'none' }} />
                <input
                  type="text"
                  placeholder="Cari dokter..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '100%', padding: '9px 14px 9px 38px',
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

            {/* Doctor Cards */}
            <div style={{ padding: '8px 12px' }}>
              {filteredDoctors.length === 0 ? (
                <div style={{ padding: '56px 24px', textAlign: 'center' }}>
                  <div style={{
                    width: 56, height: 56, borderRadius: 16, backgroundColor: '#F8FAFC',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 16px',
                  }}>
                    <Users style={{ width: 24, height: 24, color: '#CBD5E1' }} />
                  </div>
                  <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600, marginBottom: 4 }}>
                    {searchTerm ? 'Tidak ada hasil pencarian' : 'Belum ada dokter terdaftar'}
                  </p>
                  <p style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 500 }}>
                    {searchTerm ? 'Coba kata kunci lain' : 'Tambahkan dokter pertama untuk memulai'}
                  </p>
                </div>
              ) : (
                filteredDoctors.map((doctor, i) => {
                  const isExpanded = expandedDoctorId === doctor.id;
                  const gradientIdx = i % avatarGradients.length;

                  return (
                    <motion.div
                      key={doctor.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        margin: '4px 0',
                        borderRadius: 14,
                        border: '1px solid transparent',
                        backgroundColor: isExpanded ? '#FAFBFC' : 'transparent',
                        transition: 'all 150ms',
                        overflow: 'hidden',
                      }}
                      onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.backgroundColor = '#FAFBFC'; }}
                      onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
                    >
                      {/* Main Row */}
                      <div
                        style={{
                          display: 'flex', alignItems: 'center', padding: '14px 16px',
                          gap: 14, cursor: 'pointer',
                        }}
                        onClick={() => setExpandedDoctorId(isExpanded ? null : doctor.id)}
                      >
                        {/* Avatar */}
                        <div style={{
                          width: 44, height: 44, borderRadius: 14, flexShrink: 0,
                          background: avatarGradients[gradientIdx],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#ffffff', fontWeight: 700, fontSize: 15,
                          fontFamily: 'Outfit, sans-serif',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                        }}>
                          {getInitials(doctor.name)}
                        </div>

                        {/* Name & Email */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: '#0C1E35', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {doctor.name}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: '#94A3B8', fontWeight: 500, marginTop: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, overflow: 'hidden' }}>
                              <Mail style={{ width: 11, height: 11, flexShrink: 0 }} />
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doctor.email}</span>
                            </span>
                            {doctor.lastLogin && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#CBD5E1', flexShrink: 0 }}>
                                <Calendar style={{ width: 10, height: 10 }} />
                                {doctor.lastLogin.toLocaleString('id-ID', { day: 'numeric', month: 'short' })}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Specialization */}
                        <span style={{
                          fontSize: 12, fontWeight: 600, color: '#475569',
                          backgroundColor: '#F1F5F9', padding: '5px 12px', borderRadius: 10,
                          whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          {doctor.specialization || '-'}
                        </span>

                        {/* Status Badge */}
                        {doctor.status === 'active' ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 700, color: '#065F46',
                            backgroundColor: '#ECFDF5', padding: '5px 10px', borderRadius: 8,
                            flexShrink: 0,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#10B981', display: 'inline-block' }} />
                            Aktif
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            fontSize: 11, fontWeight: 700, color: '#94A3B8',
                            backgroundColor: '#F1F5F9', padding: '5px 10px', borderRadius: 8,
                            flexShrink: 0,
                          }}>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#CBD5E1', display: 'inline-block' }} />
                            Nonaktif
                          </span>
                        )}

                        {/* Expand Chevron */}
                        <ChevronDown style={{
                          width: 16, height: 16, color: '#94A3B8', flexShrink: 0,
                          transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 200ms',
                        }} />

                        {/* Action Menu */}
                        <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedDoctorId(selectedDoctorId === doctor.id ? null : doctor.id)}
                            style={{
                              padding: 6, backgroundColor: 'transparent', border: 'none',
                              color: '#94A3B8', cursor: 'pointer', borderRadius: 8,
                              transition: 'all 150ms', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#EFF6FF'; e.currentTarget.style.color = '#3B82F6'; }}
                            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#94A3B8'; }}
                          >
                            <MoreVertical style={{ width: 16, height: 16 }} />
                          </button>

                          <AnimatePresence>
                            {selectedDoctorId === doctor.id && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 6 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 6 }}
                                style={{
                                  position: 'absolute', right: 0, top: 36,
                                  width: 190, backgroundColor: '#ffffff',
                                  border: '1px solid #E2E8F0', borderRadius: 14,
                                  boxShadow: '0 16px 40px rgba(0,0,0,0.12)', zIndex: 50,
                                  overflow: 'hidden',
                                }}
                              >
                                <div style={{ padding: 5, display: 'flex', flexDirection: 'column', gap: 2 }}>
                                  <button
                                    onClick={() => { onToggleDoctorStatus(doctor.id); setSelectedDoctorId(null); }}
                                    style={{
                                      width: '100%', textAlign: 'left', padding: '9px 12px',
                                      fontSize: 12, fontWeight: 600, color: '#475569',
                                      backgroundColor: 'transparent', border: 'none', borderRadius: 9,
                                      cursor: 'pointer', transition: 'background-color 150ms',
                                      display: 'flex', alignItems: 'center', gap: 8,
                                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    <Activity style={{ width: 14, height: 14, color: '#94A3B8' }} />
                                    {doctor.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                                  </button>
                                  <button
                                    onClick={() => { onEditDoctor(doctor); setSelectedDoctorId(null); }}
                                    style={{
                                      width: '100%', textAlign: 'left', padding: '9px 12px',
                                      fontSize: 12, fontWeight: 600, color: '#475569',
                                      backgroundColor: 'transparent', border: 'none', borderRadius: 9,
                                      cursor: 'pointer', transition: 'background-color 150ms',
                                      display: 'flex', alignItems: 'center', gap: 8,
                                      fontFamily: 'Plus Jakarta Sans, sans-serif',
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8FAFC'}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                                  >
                                    <Users style={{ width: 14, height: 14, color: '#94A3B8' }} />
                                    Edit Profil
                                  </button>
                                  <div style={{ height: 1, backgroundColor: '#F1F5F9', margin: '2px 6px' }} />
                                  <button
                                    onClick={() => handleDeleteClick(doctor)}
                                    style={{
                                      width: '100%', textAlign: 'left', padding: '9px 12px',
                                      fontSize: 12, fontWeight: 600, color: '#DC2626',
                                      backgroundColor: 'transparent', border: 'none', borderRadius: 9,
                                      cursor: 'pointer', transition: 'background-color 150ms',
                                      display: 'flex', alignItems: 'center', gap: 8,
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
                        </div>
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            style={{ overflow: 'hidden' }}
                          >
                            <div style={{
                              padding: '0 16px 16px',
                              marginLeft: 58,
                              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
                            }}>
                              <div style={{
                                padding: '12px 14px', backgroundColor: '#ffffff', borderRadius: 12,
                                border: '1px solid #E2E8F0',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                  <BadgeCheck style={{ width: 12, height: 12, color: '#3B82F6' }} />
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>STR</span>
                                </div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#0C1E35', margin: 0 }}>{doctor.strNumber || '-'}</p>
                              </div>
                              <div style={{
                                padding: '12px 14px', backgroundColor: '#ffffff', borderRadius: 12,
                                border: '1px solid #E2E8F0',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                  <Stethoscope style={{ width: 12, height: 12, color: '#8B5CF6' }} />
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>SIP</span>
                                </div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#0C1E35', margin: 0 }}>{doctor.sipNumber || '-'}</p>
                              </div>
                              <div style={{
                                padding: '12px 14px', backgroundColor: '#ffffff', borderRadius: 12,
                                border: '1px solid #E2E8F0',
                              }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                  <Phone style={{ width: 12, height: 12, color: '#10B981' }} />
                                  <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Telepon</span>
                                </div>
                                <p style={{ fontSize: 13, fontWeight: 600, color: '#0C1E35', margin: 0 }}>{doctor.phone || '-'}</p>
                              </div>
                              {doctor.lastLogin && (
                                <div style={{
                                  padding: '12px 14px', backgroundColor: '#ffffff', borderRadius: 12,
                                  border: '1px solid #E2E8F0',
                                }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                                    <Calendar style={{ width: 12, height: 12, color: '#F59E0B' }} />
                                    <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Login Terakhir</span>
                                  </div>
                                  <p style={{ fontSize: 13, fontWeight: 600, color: '#0C1E35', margin: 0 }}>
                                    {doctor.lastLogin.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>

        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
                position: 'relative', width: '100%', maxWidth: 400,
                backgroundColor: '#ffffff', borderRadius: 24, padding: 32,
                boxShadow: '0 25px 50px rgba(0,0,0,0.15)', overflow: 'hidden',
              }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: '#EF4444' }} />
              <div style={{
                width: 56, height: 56, backgroundColor: '#FEF2F2', borderRadius: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 20px',
              }}>
                <XCircle style={{ width: 28, height: 28, color: '#EF4444' }} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0C1E35', textAlign: 'center', marginBottom: 8 }}>Hapus Akun Dokter?</h3>
              <p style={{ fontSize: 13, color: '#64748B', textAlign: 'center', marginBottom: 24, lineHeight: 1.6 }}>
                Apakah Anda yakin ingin menghapus akun <span style={{ fontWeight: 700, color: '#0C1E35' }}>"{doctorToDelete.name}"</span>? Tindakan ini tidak dapat dibatalkan.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={() => setDoctorToDelete(null)}
                  style={{
                    flex: 1, padding: '12px 0', backgroundColor: '#F1F5F9', color: '#475569',
                    border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13,
                    cursor: 'pointer', transition: 'background-color 150ms',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#E2E8F0'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F1F5F9'}
                >
                  Batalkan
                </button>
                <button
                  onClick={confirmDelete}
                  style={{
                    flex: 1, padding: '12px 0', backgroundColor: '#EF4444', color: '#ffffff',
                    border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 13,
                    cursor: 'pointer', transition: 'background-color 150ms',
                    fontFamily: 'Outfit, sans-serif',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = '#DC2626'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = '#EF4444'}
                >
                  Ya, Hapus
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
