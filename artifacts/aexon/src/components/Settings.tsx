import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  User, 
  Building2, 
  CreditCard, 
  Shield, 
  Save, 
  Upload, 
  AlertCircle, 
  Bell, 
  Globe, 
  Database, 
  Key, 
  Smartphone, 
  CheckCircle2, 
  Lock,
  Plus,
  Trash2,
  ExternalLink,
  Type,
  Image as ImageIcon
} from 'lucide-react';
import { UserProfile, HospitalSettings } from '../types';

interface SettingsProps {
  userProfile: UserProfile;
  hospitalSettingsList: HospitalSettings[];
  onUpdateUser: (profile: UserProfile) => void;
  onUpdateHospitalList: (settings: HospitalSettings[]) => void;
  onCancelSubscription: () => void;
  plan: 'subscription' | 'token' | 'enterprise' | null;
}

export default function Settings({ userProfile, hospitalSettingsList, onUpdateUser, onUpdateHospitalList, onCancelSubscription, plan }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'hospital' | 'billing' | 'security' | 'notifications' | 'enterprise' | 'accessibility' | 'storage'>('profile');
  
  const [profileForm, setProfileForm] = useState<UserProfile>(userProfile);
  const [hospitalFormList, setHospitalFormList] = useState<HospitalSettings[]>(hospitalSettingsList);
  const [isSaved, setIsSaved] = useState(false);

  // Storage simulation state
  const [storageSettings, setStorageSettings] = useState({
    photoDir: 'C:/Aexon/Captures/Photos',
    videoDir: 'C:/Aexon/Captures/Videos',
    usedSpace: 45.5, // GB
    totalSpace: 256, // GB
  });

  const isAdmin = userProfile.role === 'admin';
  const isEnterprise = plan === 'enterprise';

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm({ ...profileForm, [e.target.name]: e.target.value });
  };

  const handleFontSizeChange = (size: 'normal' | 'large' | 'extra-large') => {
    const updatedProfile = {
      ...profileForm,
      preferences: { ...profileForm.preferences, fontSize: size }
    };
    setProfileForm(updatedProfile);
    onUpdateUser(updatedProfile);
  };

  const handleHospitalChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const newList = [...hospitalFormList];
    newList[index] = { ...newList[index], [e.target.name]: e.target.value };
    setHospitalFormList(newList);
  };

  const handleLogoUpload = (index: number) => {
    // Simulate logo upload
    const newList = [...hospitalFormList];
    newList[index] = { ...newList[index], logoUrl: `https://picsum.photos/seed/${Date.now()}/200/200` };
    setHospitalFormList(newList);
    alert('Logo berhasil diunggah (Simulasi)');
  };

  const handleAddHospital = () => {
    if (hospitalFormList.length < 3) {
      setHospitalFormList([
        ...hospitalFormList,
        { id: `HOSP-${Date.now()}`, name: '', address: '', phone: '', email: '', logoUrl: '' }
      ]);
    }
  };

  const handleRemoveHospital = (index: number) => {
    if (hospitalFormList.length > 1) {
      setHospitalFormList(hospitalFormList.filter((_, i) => i !== index));
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if name has changed
    if (profileForm.name !== userProfile.name) {
      const now = new Date();
      if (userProfile.lastNameChangeDate) {
        const lastChange = new Date(userProfile.lastNameChangeDate);
        const diffTime = Math.abs(now.getTime() - lastChange.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 7) {
          alert(`Anda baru saja mengubah nama. Perubahan nama hanya dapat dilakukan sekali setiap 7 hari. Sisa waktu: ${7 - diffDays} hari.`);
          return;
        }
      }
      
      // Update last change date
      const updatedProfile = {
        ...profileForm,
        lastNameChangeDate: now.toISOString()
      };
      setProfileForm(updatedProfile);
      onUpdateUser(updatedProfile);
    } else {
      onUpdateUser(profileForm);
    }
    
    showSavedMessage();
  };

  const handleSaveHospital = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateHospitalList(hospitalFormList);
    showSavedMessage();
  };

  const showSavedMessage = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const tabs = [
    { id: 'profile', label: 'Profil Saya', icon: User },
    { id: 'hospital', label: isEnterprise ? 'Informasi Institusi' : 'Kop Surat RS (Maks 3)', icon: Building2 },
    { id: 'accessibility', label: 'Tampilan & Aksesibilitas', icon: Type },
    { id: 'storage', label: 'Penyimpanan & Media', icon: Database },
    { id: 'security', label: 'Keamanan', icon: Shield },
    { id: 'notifications', label: 'Notifikasi', icon: Bell },
    { id: 'billing', label: 'Langganan', icon: CreditCard },
  ];

  if (isAdmin) {
    tabs.push({ id: 'enterprise', label: 'Enterprise Admin', icon: Globe });
  }

  return (
    <div className="flex-1 p-8 max-w-6xl mx-auto w-full font-sans text-slate-900 overflow-y-auto h-full custom-scrollbar">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-slate-900 tracking-tight mb-2">Pengaturan Sistem</h2>
        <p className="text-slate-500 text-sm">Konfigurasi profil personal, identitas rumah sakit, dan preferensi sistem Aexon.</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Sidebar Tabs */}
        <div className="w-full lg:w-72 shrink-0 space-y-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center px-5 py-4 rounded-2xl text-sm font-bold transition-all border ${
                activeTab === tab.id 
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-600/20 border-blue-600' 
                : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
              }`}
            >
              <tab.icon className={`w-5 h-5 mr-4 ${activeTab === tab.id ? 'text-white' : 'text-slate-400'}`} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 bg-white border border-slate-200 rounded-[2.5rem] p-8 md:p-10 shadow-sm relative overflow-hidden">
          {isSaved && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute top-6 right-6 bg-emerald-500 text-white px-5 py-2.5 rounded-2xl text-sm font-bold flex items-center shadow-lg shadow-emerald-500/20 z-20"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Perubahan Berhasil Disimpan
            </motion.div>
          )}

          {activeTab === 'profile' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-4 mb-8">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Informasi Profil</h3>
                  <p className="text-slate-500 text-sm">Data personal Anda yang akan muncul pada laporan.</p>
                </div>
              </div>

              <form onSubmit={handleSaveProfile} className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nama Lengkap & Gelar</label>
                    <div className="relative">
                      <input
                        type="text"
                        name="name"
                        value={profileForm.name}
                        onChange={handleProfileChange}
                        className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 ml-1 italic">Dapat diubah sekali setiap 7 hari untuk validasi STR/SIP.</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Spesialisasi</label>
                    <input
                      type="text"
                      name="specialization"
                      value={profileForm.specialization}
                      onChange={handleProfileChange}
                      className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">No. STR (Surat Tanda Registrasi)</label>
                    <input
                      type="text"
                      name="strNumber"
                      value={profileForm.strNumber || ''}
                      onChange={handleProfileChange}
                      placeholder="16 digit nomor STR"
                      className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">No. SIP (Surat Izin Praktik)</label>
                    <input
                      type="text"
                      name="sipNumber"
                      value={profileForm.sipNumber || ''}
                      onChange={handleProfileChange}
                      placeholder="Nomor SIP aktif"
                      className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Kerja</label>
                    <input
                      type="email"
                      name="email"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                      className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nomor WhatsApp</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profileForm.phone}
                      onChange={handleProfileChange}
                      className="w-full px-5 py-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                    />
                  </div>
                </div>
                <div className="pt-4 flex justify-end">
                  <button type="submit" className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-xl shadow-slate-900/10 active:scale-95">
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {activeTab === 'hospital' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900">
                      {isEnterprise ? 'Informasi Institusi' : 'Kop Surat Rumah Sakit'}
                    </h3>
                    <p className="text-slate-500 text-sm">
                      {isEnterprise 
                        ? 'Informasi institusi yang mendaftarkan akun Anda.' 
                        : 'Kelola hingga 3 kop surat untuk tempat praktik Anda.'}
                    </p>
                  </div>
                </div>
                {!isEnterprise && hospitalFormList.length < 3 && (
                  <button 
                    onClick={handleAddHospital}
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all"
                  >
                    <Plus className="w-4 h-4 mr-1" /> Tambah Tempat Praktik
                  </button>
                )}
              </div>

              {isEnterprise && (
                <div className="mb-8 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start">
                  <AlertCircle className="w-5 h-5 text-amber-600 mr-3 shrink-0" />
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Sebagai pengguna <strong>Enterprise</strong>, Anda hanya dapat menggunakan kop surat dari institusi yang mendaftarkan Anda. Anda tidak dapat menambah atau mengubah informasi ini secara mandiri.
                  </p>
                </div>
              )}

              <form onSubmit={handleSaveHospital} className="space-y-10">
                {hospitalFormList.map((hospital, index) => (
                  <div key={hospital.id} className="p-6 border border-slate-100 rounded-[2rem] bg-slate-50/30 relative">
                    {!isEnterprise && hospitalFormList.length > 1 && (
                      <button 
                        type="button"
                        onClick={() => handleRemoveHospital(index)}
                        className="absolute top-4 right-4 p-2 text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center">
                      <span className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mr-2 text-[10px]">
                        {index + 1}
                      </span>
                      Institusi {index + 1}
                    </h4>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="md:col-span-2 flex items-center gap-6 mb-4">
                        <div className="w-24 h-24 rounded-2xl bg-slate-100 border-2 border-dashed border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                          {hospital.logoUrl ? (
                            <img src={hospital.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-slate-300" />
                          )}
                        </div>
                        <div className="space-y-2">
                          <h5 className="text-xs font-bold text-slate-700">Logo Institusi</h5>
                          <p className="text-[10px] text-slate-500">Format PNG/JPG, maks 2MB. Akan muncul di kop surat.</p>
                          {!isEnterprise && (
                            <button 
                              type="button"
                              onClick={() => handleLogoUpload(index)}
                              className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 hover:bg-slate-50 transition-all"
                            >
                              <Upload className="w-3 h-3 mr-2 text-blue-600" /> Unggah Logo Baru
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nama Rumah Sakit / Klinik</label>
                        <input
                          type="text"
                          name="name"
                          value={hospital.name}
                          onChange={(e) => handleHospitalChange(index, e)}
                          readOnly={isEnterprise && !isAdmin}
                          className={`w-full px-5 py-3.5 border border-slate-200 rounded-2xl text-sm font-medium ${
                            isEnterprise && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
                          }`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Email Institusi</label>
                        <input
                          type="email"
                          name="email"
                          value={hospital.email}
                          onChange={(e) => handleHospitalChange(index, e)}
                          readOnly={isEnterprise && !isAdmin}
                          className={`w-full px-5 py-3.5 border border-slate-200 rounded-2xl text-sm font-medium ${
                            isEnterprise && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
                          }`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nomor Telepon</label>
                        <input
                          type="text"
                          name="phone"
                          value={hospital.phone}
                          onChange={(e) => handleHospitalChange(index, e)}
                          readOnly={isEnterprise && !isAdmin}
                          className={`w-full px-5 py-3.5 border border-slate-200 rounded-2xl text-sm font-medium ${
                            isEnterprise && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
                          }`}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nomor Fax</label>
                        <input
                          type="text"
                          name="fax"
                          value={hospital.fax || ''}
                          onChange={(e) => handleHospitalChange(index, e)}
                          readOnly={isEnterprise && !isAdmin}
                          className={`w-full px-5 py-3.5 border border-slate-200 rounded-2xl text-sm font-medium ${
                            isEnterprise && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
                          }`}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Website</label>
                        <input
                          type="text"
                          name="website"
                          value={hospital.website || ''}
                          onChange={(e) => handleHospitalChange(index, e)}
                          readOnly={isEnterprise && !isAdmin}
                          className={`w-full px-5 py-3.5 border border-slate-200 rounded-2xl text-sm font-medium ${
                            isEnterprise && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
                          }`}
                        />
                      </div>
                      <div className="space-y-2 md:col-span-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Alamat Lengkap</label>
                        <textarea
                          name="address"
                          value={hospital.address}
                          onChange={(e) => handleHospitalChange(index, e)}
                          readOnly={isEnterprise && !isAdmin}
                          rows={2}
                          className={`w-full px-5 py-3.5 border border-slate-200 rounded-2xl text-sm font-medium resize-none ${
                            isEnterprise && !isAdmin ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500'
                          }`}
                        />
                      </div>
                    </div>
                  </div>
                ))}

                {(!isEnterprise || isAdmin) && (
                  <div className="pt-4 flex justify-end">
                    <button type="submit" className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-xl shadow-slate-900/10 active:scale-95">
                      {isEnterprise ? 'Simpan Informasi Institusi' : 'Simpan Semua Kop Surat'}
                    </button>
                  </div>
                )}
              </form>
            </motion.div>
          )}

          {activeTab === 'accessibility' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-4 mb-10">
                <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-600">
                  <Type className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Tampilan & Aksesibilitas</h3>
                  <p className="text-slate-500 text-sm">Sesuaikan kenyamanan visual sistem Aexon.</p>
                </div>
              </div>

              <div className="space-y-10">
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-slate-900">Ukuran Font Sistem</h4>
                  <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                    Pilih ukuran font yang paling nyaman untuk Anda. Ukuran font yang lebih besar direkomendasikan untuk memudahkan pembacaan data klinis yang padat.
                  </p>
                  
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { id: 'normal', label: 'Normal', desc: 'Default sistem' },
                      { id: 'large', label: 'Besar', desc: 'Lebih mudah dibaca' },
                      { id: 'extra-large', label: 'Sangat Besar', desc: 'Maksimum visibilitas' }
                    ].map((size) => (
                      <button
                        key={size.id}
                        onClick={() => handleFontSizeChange(size.id as any)}
                        className={`p-6 rounded-3xl border-2 transition-all text-left ${
                          profileForm.preferences?.fontSize === size.id
                          ? 'border-blue-600 bg-blue-50/50 ring-4 ring-blue-500/10'
                          : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        <span className={`block font-black mb-1 ${
                          size.id === 'normal' ? 'text-base' : size.id === 'large' ? 'text-lg' : 'text-xl'
                        }`}>
                          {size.label}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">{size.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100">
                  <h4 className="text-sm font-bold text-slate-900 mb-4">Mode Kontras Tinggi</h4>
                  <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                    <div>
                      <h5 className="text-xs font-bold text-slate-900">Optimalkan Kontras</h5>
                      <p className="text-[10px] text-slate-500">Meningkatkan ketajaman teks dan elemen UI.</p>
                    </div>
                    <div className="w-12 h-6 bg-slate-200 rounded-full relative cursor-pointer">
                      <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'storage' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-4 mb-10">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Database className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Penyimpanan & Media</h3>
                  <p className="text-slate-500 text-sm">Kelola lokasi penyimpanan hasil tangkapan medis.</p>
                </div>
              </div>

              <div className="space-y-10">
                {/* Storage Info */}
                <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                  <div className="flex justify-between items-end mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 mb-1">Status Kapasitas Disk</h4>
                      <p className="text-xs text-slate-500">Penyimpanan lokal pada perangkat ini.</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-blue-600">{storageSettings.totalSpace - storageSettings.usedSpace} GB</span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Tersedia</span>
                    </div>
                  </div>
                  
                  <div className="h-4 bg-slate-200 rounded-full overflow-hidden mb-4">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(storageSettings.usedSpace / storageSettings.totalSpace) * 100}%` }}
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                    />
                  </div>
                  
                  <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <span>Terpakai: {storageSettings.usedSpace} GB</span>
                    <span>Total: {storageSettings.totalSpace} GB</span>
                  </div>
                </div>

                {/* Directory Settings */}
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Direktori Foto</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={storageSettings.photoDir}
                          onChange={(e) => setStorageSettings({...storageSettings, photoDir: e.target.value})}
                          className="flex-1 px-5 py-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                        />
                        <button 
                          onClick={() => alert('Dialog pemilihan folder sistem dibuka...')}
                          className="px-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 text-blue-600 transition-all"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Direktori Video</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={storageSettings.videoDir}
                          onChange={(e) => setStorageSettings({...storageSettings, videoDir: e.target.value})}
                          className="flex-1 px-5 py-4 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm font-medium"
                        />
                        <button 
                          onClick={() => alert('Dialog pemilihan folder sistem dibuka...')}
                          className="px-4 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 text-blue-600 transition-all"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-blue-50 border border-blue-100 rounded-[2rem] flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 mr-3 shrink-0" />
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Pastikan direktori yang dipilih memiliki izin tulis (write permission). Aexon akan membuat sub-folder otomatis berdasarkan ID Pasien dan Tanggal Pemeriksaan.
                    </p>
                  </div>
                </div>

                <div className="pt-4 flex justify-end">
                  <button 
                    onClick={() => showSavedMessage()}
                    className="px-8 py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-xl shadow-slate-900/10 active:scale-95"
                  >
                    Simpan Konfigurasi Media
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-4 mb-10">
                <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Shield className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Keamanan & Akses</h3>
                  <p className="text-slate-500 text-sm">Kelola kata sandi dan autentikasi dua faktor.</p>
                </div>
              </div>

              <div className="space-y-10">
                <div className="grid md:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center">
                      <Key className="w-4 h-4 mr-2 text-blue-600" /> Ganti Kata Sandi
                    </h4>
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password Lama</label>
                        <input type="password" placeholder="••••••••" className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Password Baru</label>
                        <input type="password" placeholder="••••••••" className="w-full px-5 py-3.5 border border-slate-200 rounded-2xl bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-sm" />
                      </div>
                      <button className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
                        Update Password
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <h4 className="text-sm font-bold text-slate-900 flex items-center">
                      <Smartphone className="w-4 h-4 mr-2 text-emerald-600" /> Two-Factor Auth
                    </h4>
                    <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <p className="text-xs text-slate-500 leading-relaxed mb-6">
                        Tambahkan lapisan keamanan ekstra dengan mewajibkan kode verifikasi dari ponsel Anda saat login.
                      </p>
                      <button className="w-full py-3.5 bg-white border border-slate-200 text-slate-900 font-bold rounded-2xl hover:bg-slate-50 transition-all">
                        Aktifkan 2FA
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-8 border-t border-slate-100 space-y-4">
                  <div className="flex items-center justify-between p-6 bg-amber-50 rounded-[2rem] border border-amber-100">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-xl text-amber-600">
                        <Database className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-amber-900">Pembersihan Data Lokal</h4>
                        <p className="text-xs text-amber-700 opacity-80">Hapus semua riwayat sesi Anda di komputer ini.</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        if (confirm('Apakah Anda yakin ingin menghapus semua riwayat sesi lokal Anda? Tindakan ini tidak dapat dibatalkan.')) {
                          localStorage.removeItem(`aexon_sessions_${userProfile.id}`);
                          window.location.reload();
                        }
                      }}
                      className="px-6 py-2.5 bg-white text-amber-600 font-bold rounded-xl hover:bg-amber-100 transition-colors border border-amber-200"
                    >
                      Hapus Riwayat Sesi
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-6 bg-red-50 rounded-[2rem] border border-red-100">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-white rounded-xl text-red-600">
                        <Lock className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-red-900">Sesi Aktif</h4>
                        <p className="text-xs text-red-700 opacity-80">Keluar dari semua perangkat lain yang sedang login.</p>
                      </div>
                    </div>
                    <button className="px-6 py-2.5 bg-white text-red-600 font-bold rounded-xl hover:bg-red-100 transition-colors border border-red-200">
                      Log Out All
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'enterprise' && isAdmin && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-4 mb-10">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                  <Globe className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Enterprise Administration</h3>
                  <p className="text-slate-500 text-sm">Konfigurasi tingkat korporat dan integrasi sistem rumah sakit.</p>
                </div>
              </div>

              <div className="space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                  <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center">
                      <Database className="w-4 h-4 mr-2 text-indigo-600" /> Integrasi PACS/HIS
                    </h4>
                    <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                      Hubungkan Aexon dengan sistem informasi rumah sakit (HIS) atau server PACS untuk sinkronisasi data pasien otomatis.
                    </p>
                    <button className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition-all text-xs">
                      Konfigurasi API
                    </button>
                  </div>

                  <div className="p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100">
                    <h4 className="text-sm font-bold text-slate-900 mb-4 flex items-center">
                      <Shield className="w-4 h-4 mr-2 text-blue-600" /> Kebijakan Keamanan
                    </h4>
                    <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                      Atur kebijakan kompleksitas kata sandi, durasi sesi, dan pembatasan IP untuk seluruh dokter di bawah korporat Anda.
                    </p>
                    <button className="px-6 py-2.5 bg-white border border-slate-200 text-slate-900 font-bold rounded-xl hover:bg-slate-50 transition-all text-xs">
                      Atur Kebijakan
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {(activeTab === 'notifications') && (
            <div className="py-20 text-center">
              <p className="text-slate-400 font-medium">Bagian ini sedang dalam pengembangan.</p>
            </div>
          )}

          {activeTab === 'billing' && (
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
              <div className="flex items-center gap-4 mb-10">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                  <CreditCard className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">Langganan & Pembayaran</h3>
                  <p className="text-slate-500 text-sm">Kelola paket aktif dan riwayat transaksi Anda.</p>
                </div>
              </div>

              <div className="space-y-8">
                {/* Current Plan Card */}
                <div className="p-8 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2.5rem] text-white relative overflow-hidden shadow-xl">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -mr-32 -mt-32" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-10">
                      <div>
                        <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2 block">Paket Saat Ini</span>
                        <h4 className="text-3xl font-black tracking-tight">
                          {plan === 'subscription' ? 'Annual Subscription' : 
                           plan === 'token' ? 'Token Pack' : 
                           plan === 'enterprise' ? 'Enterprise Access' : 'Trial Period'}
                        </h4>
                      </div>
                      <div className="px-4 py-2 bg-white/10 backdrop-blur-md rounded-xl border border-white/10 text-xs font-bold">
                        Aktif
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Terdaftar Sejak</p>
                        <p className="text-sm font-bold">12 Des 2025</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Metode Bayar</p>
                        <p className="text-sm font-bold">•••• 4242 (Visa)</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Tagihan Berikutnya</p>
                        <p className="text-sm font-bold">12 Des 2026</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Tagihan</p>
                        <p className="text-sm font-bold">Rp 5.999.000</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-4">
                      <button 
                        onClick={() => alert('Redirecting to payment gateway...')}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-blue-600/20"
                      >
                        Update Metode Pembayaran
                      </button>
                      <button 
                        onClick={onCancelSubscription}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-black rounded-xl transition-all border border-white/10"
                      >
                        Batalkan Langganan
                      </button>
                    </div>
                  </div>
                </div>

                {/* Transaction History */}
                <div className="space-y-6">
                  <h4 className="text-sm font-bold text-slate-900 ml-1">Riwayat Transaksi</h4>
                  <div className="bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-100/50">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deskripsi</th>
                          <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Jumlah</th>
                          <th className="px-6 py-4 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {[
                          { date: '12 Des 2025', desc: 'Annual Subscription Renewal', amount: 'Rp 5.999.000', status: 'Selesai' },
                          { date: '12 Des 2024', desc: 'Annual Subscription Renewal', amount: 'Rp 5.999.000', status: 'Selesai' },
                          { date: '15 Nov 2024', desc: 'Token Pack (25 Tokens)', amount: 'Rp 1.249.999', status: 'Selesai' },
                        ].map((t, i) => (
                          <tr key={i} className="hover:bg-white transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-600">{t.date}</td>
                            <td className="px-6 py-4 font-bold text-slate-900">{t.desc}</td>
                            <td className="px-6 py-4 font-bold text-slate-900">{t.amount}</td>
                            <td className="px-6 py-4 text-right">
                              <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full uppercase tracking-wider">
                                {t.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
