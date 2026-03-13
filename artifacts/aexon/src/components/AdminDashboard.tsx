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
  Phone,
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
    { label: 'Total Dokter', value: institutionDoctors.length.toString(), icon: Users, color: 'blue' },
    { label: 'Aktif Hari Ini', value: institutionDoctors.filter(d => d.status === 'active').length.toString(), icon: Activity, color: 'emerald' },
    { label: 'Sesi Selesai', value: '142', icon: CheckCircle2, color: 'indigo' },
  ];

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full font-sans text-slate-900 overflow-y-auto h-full custom-scrollbar">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight mb-1">Enterprise Admin Console</h2>
          <p className="text-slate-500 text-sm">Manajemen akun tenaga medis dan monitoring sistem korporat.</p>
        </div>
        
        <button 
          onClick={onAddDoctor}
          className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
        >
          <UserPlus className="w-5 h-5 mr-2" />
          Tambah Dokter Baru
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group"
          >
            <div className={`absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 bg-${stat.color}-500/5 rounded-full blur-2xl group-hover:bg-${stat.color}-500/10 transition-colors`} />
            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-1">{stat.label}</p>
                <h3 className="text-3xl font-black text-slate-900">{stat.value}</h3>
              </div>
              <div className={`p-3 bg-${stat.color}-50 rounded-xl text-${stat.color}-600`}>
                <stat.icon className="w-6 h-6" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Doctor Management Table */}
      <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900 flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-blue-600" />
            Daftar Dokter Terdaftar
          </h3>
          
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, spesialisasi, atau email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dokter</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Spesialisasi</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Login Terakhir</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredDoctors.map((doctor, i) => (
                <motion.tr 
                  key={doctor.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="hover:bg-slate-50/50 transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-md mr-3">
                        {doctor.name.split(' ').filter(n => n.startsWith('Dr.') ? false : true)[0]?.charAt(0) || 'D'}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{doctor.name}</div>
                        <div className="text-[11px] text-slate-400 font-medium flex items-center">
                          <Mail className="w-3 h-3 mr-1" /> {doctor.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1 rounded-full">
                      {doctor.specialization}
                    </span>
                    <div className="mt-2 space-y-1">
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">STR: {doctor.strNumber || '-'}</div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">SIP: {doctor.sipNumber || '-'}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {doctor.status === 'active' ? (
                        <span className="flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> AKTIF
                        </span>
                      ) : (
                        <span className="flex items-center text-[11px] font-bold text-slate-400 bg-slate-50 px-2 py-1 rounded-lg">
                          <XCircle className="w-3 h-3 mr-1" /> NONAKTIF
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-500 font-medium flex items-center">
                      <Calendar className="w-3 h-3 mr-1.5" />
                      {doctor.lastLogin?.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right relative">
                    <button 
                      onClick={() => setSelectedDoctorId(selectedDoctorId === doctor.id ? null : doctor.id)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                    
                    <AnimatePresence>
                      {selectedDoctorId === doctor.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.95, y: 10 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: 10 }}
                          className="absolute right-6 top-14 w-48 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden"
                        >
                          <div className="p-2 space-y-1">
                            <button 
                              onClick={() => {
                                onToggleDoctorStatus(doctor.id);
                                setSelectedDoctorId(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-3"
                            >
                              <Activity className="w-4 h-4 text-slate-400" />
                              {doctor.status === 'active' ? 'Nonaktifkan Akun' : 'Aktifkan Akun'}
                            </button>
                            <button 
                              onClick={() => {
                                onEditDoctor(doctor);
                                setSelectedDoctorId(null);
                              }}
                              className="w-full text-left px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-xl transition-colors flex items-center gap-3"
                            >
                              <Users className="w-4 h-4 text-slate-400" />
                              Edit Profil
                            </button>
                            <div className="h-px bg-slate-100 my-1" />
                            <button 
                              onClick={() => handleDeleteClick(doctor)}
                              className="w-full text-left px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl transition-colors flex items-center gap-3"
                            >
                              <XCircle className="w-4 h-4 text-red-400" />
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
          <div className="p-12 text-center">
            <p className="text-slate-400 font-medium">Tidak ada dokter yang ditemukan.</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {doctorToDelete && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDoctorToDelete(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[2.5rem] p-10 shadow-2xl border border-slate-100 overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-red-500" />
              <div className="w-20 h-20 bg-red-50 rounded-3xl flex items-center justify-center mb-8 mx-auto">
                <XCircle className="w-10 h-10 text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-slate-900 text-center mb-4 tracking-tight">Hapus Akun Dokter?</h3>
              <p className="text-slate-500 text-center mb-10 text-sm font-medium leading-relaxed">
                Apakah Anda yakin ingin menghapus akun <span className="text-slate-900 font-bold">"{doctorToDelete.name}"</span>? Tindakan ini tidak dapat dibatalkan dan dokter tersebut tidak akan bisa mengakses sistem lagi.
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={confirmDelete}
                  className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-red-600/20"
                >
                  YA, HAPUS AKUN
                </button>
                <button
                  onClick={() => setDoctorToDelete(null)}
                  className="w-full py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
                >
                  BATALKAN
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Enterprise Info Footer */}
      <div className="mt-10 p-6 bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl text-white flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl shadow-blue-500/20">
        <div className="flex items-center">
          <div className="p-3 bg-white/10 rounded-2xl mr-4">
            <Building2 className="w-8 h-8" />
          </div>
          <div>
            <h4 className="text-lg font-bold">Enterprise Plan: RSUP Jakarta</h4>
            <p className="text-blue-100 text-sm opacity-80">Lisensi Aktif hingga 12 Des 2026 • {institutionDoctors.length}/50 Akun Terpakai</p>
          </div>
        </div>
        <button 
          onClick={onManageSubscription}
          className="px-6 py-2.5 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors shadow-lg"
        >
          Kelola Langganan
        </button>
      </div>
    </div>
  );
}
