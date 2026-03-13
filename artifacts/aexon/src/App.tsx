import React, { useState, useEffect, useMemo } from 'react';
import Launcher from './components/Launcher';
import Pricing from './components/Pricing';
import MainLayout from './components/MainLayout';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import SessionForm from './components/SessionForm';
import EndoscopyApp from './components/EndoscopyApp';
import ReportGenerator from './components/ReportGenerator';
import Settings from './components/Settings';
import Gallery from './components/Gallery';
import AddDoctor from './components/AddDoctor';
import ManageSubscription from './components/ManageSubscription';
import { PatientData, Session, UserProfile, HospitalSettings, UserRole } from './types';

function App() {
  const [currentView, setCurrentView] = useState<'launcher' | 'pricing' | 'dashboard' | 'admin-dashboard' | 'session-form' | 'active-session' | 'report-generator' | 'settings' | 'gallery' | 'add-doctor' | 'manage-subscription'>('launcher');
  const [selectedPlan, setSelectedPlan] = useState<'subscription' | 'token' | 'enterprise' | null>(null);
  const [tokens, setTokens] = useState<number>(0);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(7);
  
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [doctors, setDoctors] = useState<UserProfile[]>([
    {
      id: 'DOC-001',
      name: 'Dr. Budi Santoso, Sp.PD-KGEH',
      specialization: 'Gastroenterohepatologi',
      email: 'budi.santoso@rsup.co.id',
      phone: '081234567890',
      role: 'doctor',
      status: 'active',
      lastLogin: new Date(Date.now() - 1000 * 60 * 30),
      strNumber: '1234567890123456',
      sipNumber: 'SIP/2026/001/RS'
    },
    {
      id: 'DOC-002',
      name: 'Dr. Siti Aminah, Sp.B',
      specialization: 'Bedah Umum',
      email: 'siti.aminah@rsup.co.id',
      phone: '081234567891',
      role: 'doctor',
      status: 'active',
      lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 2),
      strNumber: '2234567890123456',
      sipNumber: 'SIP/2026/002/RS'
    },
    {
      id: 'DOC-003',
      name: 'Dr. Ahmad Fauzi, Sp.A',
      specialization: 'Anak',
      email: 'ahmad.fauzi@rsup.co.id',
      phone: '081234567892',
      role: 'doctor',
      status: 'inactive',
      lastLogin: new Date(Date.now() - 1000 * 60 * 60 * 24),
      strNumber: '3234567890123456',
      sipNumber: 'SIP/2026/003/RS'
    }
  ]);
  const [editingDoctor, setEditingDoctor] = useState<UserProfile | null>(null);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecordingActive) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecordingActive]);

  const handleNavigate = (menu: any) => {
    if (currentView === 'active-session' && isRecordingActive) {
      const confirmLeave = window.confirm('Sesi aktif sedang berjalan. Apakah Anda yakin ingin pindah halaman? Sesi akan tetap berjalan di latar belakang, namun disarankan untuk menyelesaikan sesi terlebih dahulu untuk memastikan semua data tersimpan.');
      if (!confirmLeave) return;
    }
    setCurrentView(menu);
  };

  useEffect(() => {
    if (userProfile) {
      const savedSessions = localStorage.getItem(`aexon_sessions_${userProfile.id}`);
      if (savedSessions) {
        try {
          const parsed = JSON.parse(savedSessions);
          const formatted = parsed.map((s: any) => ({
            ...s,
            date: new Date(s.date),
            captures: s.captures.map((c: any) => ({
              ...c,
              timestamp: new Date(c.timestamp)
            }))
          }));
          setSessions(formatted);
        } catch (e) {
          console.error("Failed to parse sessions", e);
          setSessions([]);
        }
      } else {
        setSessions([]);
      }
    }
  }, [userProfile?.id]);

  const [hospitalSettingsList, setHospitalSettingsList] = useState<HospitalSettings[]>([
    {
      id: 'HOSP-001',
      name: 'Rumah Sakit Umum Pusat',
      address: 'Jl. Kesehatan No. 1, Jakarta Pusat, DKI Jakarta 10110',
      phone: '(021) 1234567',
      fax: '(021) 1234568',
      website: 'www.rsup.co.id',
      email: 'info@rsup.co.id',
      logoUrl: 'https://picsum.photos/seed/hospital/200/200'
    }
  ]);

  const handleLogin = (role: UserRole, username: string, fullName?: string) => {
    if (role === 'admin') {
      setUserProfile({
        id: `ADM-${username.toUpperCase()}`,
        name: fullName || `Admin ${username}`,
        specialization: 'Hospital Administrator',
        email: `${username}@rsup.co.id`,
        phone: '021-1234567',
        role: 'admin',
        status: 'active'
      });
      setSelectedPlan('enterprise');
      setHospitalSettingsList([{
        id: 'ENT-001',
        name: 'RSUP Jakarta',
        address: 'Jl. Diponegoro No. 71, Jakarta Pusat',
        phone: '021-555000',
        email: 'enterprise@rsup.co.id',
        logoUrl: ''
      }]);
      setCurrentView('admin-dashboard');
    } else {
      const isInstitutional = username.toLowerCase().includes('sso');
      setUserProfile({
        id: `DOC-${username.toUpperCase()}`,
        name: fullName || (username.includes('.') ? username : `Dr. ${username}`),
        specialization: 'Spesialis Penyakit Dalam',
        email: `${username}@hospital.com`,
        phone: '08123456789',
        role: 'doctor',
        status: 'active',
        strNumber: '1234567890123456',
        sipNumber: 'SIP/2026/001/RS',
        preferences: {
          fontSize: 'normal'
        }
      });
      
      if (isInstitutional) {
        setSelectedPlan('enterprise');
        setHospitalSettingsList([{
          id: 'ENT-001',
          name: 'RSUP Jakarta',
          address: 'Jl. Diponegoro No. 71, Jakarta Pusat',
          phone: '021-555000',
          email: 'enterprise@rsup.co.id',
          logoUrl: ''
        }]);
        setCurrentView('dashboard');
      } else {
        setCurrentView('dashboard');
      }
    }
  };

  const handleUpdateHospitalList = (list: HospitalSettings[]) => {
    if (selectedPlan !== 'enterprise') {
      setHospitalSettingsList(list.slice(0, 3));
    }
  };

  const handleSelectPlan = (plan: 'subscription' | 'token') => {
    setSelectedPlan(plan);
    if (plan === 'token') {
      setTokens(25);
    }
    setCurrentView('dashboard');
  };

  const handleStartSession = (data: PatientData) => {
    setPatientData(data);
    setCurrentView('active-session');
  };

  const handleEndSession = (session: Session, tokenDeducted: boolean) => {
    const updatedSessions = [session, ...sessions];
    setSessions(updatedSessions);
    
    if (userProfile) {
      try {
        localStorage.setItem(`aexon_sessions_${userProfile.id}`, JSON.stringify(updatedSessions));
      } catch (e) {
        console.warn("Failed to save sessions to localStorage (likely quota exceeded due to many photos)", e);
      }
    }

    if (tokenDeducted) {
      setTokens(prev => Math.max(0, prev - 1));
    }
    setPatientData(null);
    setViewingSession(session);
    setCurrentView('report-generator');
  };

  const handleViewSession = (session: Session) => {
    setViewingSession(session);
    setCurrentView('report-generator');
  };

  const handleViewGallery = (session: Session) => {
    setViewingSession(session);
    setCurrentView('gallery');
  };

  const handleUpdateSession = (updatedSession: Session) => {
    const updatedSessions = sessions.map(s => s.id === updatedSession.id ? updatedSession : s);
    setSessions(updatedSessions);
    if (userProfile) {
      localStorage.setItem(`aexon_sessions_${userProfile.id}`, JSON.stringify(updatedSessions));
    }
  };

  const handleDeleteSession = (sessionId: string) => {
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    if (userProfile) {
      localStorage.setItem(`aexon_sessions_${userProfile.id}`, JSON.stringify(updatedSessions));
    }
  };

  const handleLogout = () => {
    setCurrentView('launcher');
    setSelectedPlan(null);
    setTokens(0);
    setPatientData(null);
    setSessions([]);
    setViewingSession(null);
    setUserProfile(null);
  };

  const handleCancelSubscription = () => {
    setSelectedPlan(null);
    setTokens(0);
    alert('Paket berlangganan telah dibatalkan.');
  };

  const handleAddDoctor = (doctorData: any) => {
    const newDoctor: UserProfile = {
      ...doctorData,
      id: `DOC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
      lastLogin: new Date()
    };
    setDoctors(prev => [...prev, newDoctor]);
  };

  const handleUpdateDoctor = (doctorData: UserProfile) => {
    setDoctors(prev => prev.map(d => d.id === doctorData.id ? doctorData : d));
    setEditingDoctor(null);
  };

  const handleDeleteDoctor = (doctorId: string) => {
    setDoctors(prev => prev.filter(d => d.id !== doctorId));
  };

  const handleToggleDoctorStatus = (doctorId: string) => {
    setDoctors(prev => prev.map(d => 
      d.id === doctorId 
        ? { ...d, status: d.status === 'active' ? 'inactive' : 'active' } 
        : d
    ));
  };

  const getFontSizeClass = () => {
    switch (userProfile?.preferences?.fontSize) {
      case 'large': return 'text-lg';
      case 'extra-large': return 'text-xl';
      default: return 'text-base';
    }
  };

  if (currentView === 'launcher') {
    return <Launcher onLogin={handleLogin} />;
  }

  if (currentView === 'pricing') {
    return <Pricing onSelectPlan={handleSelectPlan} />;
  }

  if (!userProfile) return null;

  return (
    <div className={getFontSizeClass()}>
      <MainLayout 
        activeMenu={currentView} 
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        plan={selectedPlan}
        tokens={tokens}
        trialDaysLeft={trialDaysLeft}
        userProfile={userProfile!}
      >
      {currentView === 'dashboard' && (
        <Dashboard 
          sessions={sessions} 
          onNewSession={() => {
            if (!selectedPlan || (selectedPlan === 'token' && tokens === 0)) {
              setCurrentView('pricing');
            } else {
              setCurrentView('session-form');
            }
          }}
          onViewSession={handleViewSession}
          onViewGallery={handleViewGallery}
          onDeleteSession={handleDeleteSession}
          userProfile={userProfile}
        />
      )}

      {currentView === 'admin-dashboard' && (
        <AdminDashboard 
          doctors={doctors}
          onAddDoctor={() => {
            setEditingDoctor(null);
            setCurrentView('add-doctor');
          }} 
          onEditDoctor={(doctor) => {
            setEditingDoctor(doctor);
            setCurrentView('add-doctor');
          }}
          onDeleteDoctor={handleDeleteDoctor}
          onToggleDoctorStatus={handleToggleDoctorStatus}
          onManageSubscription={() => setCurrentView('manage-subscription')}
        />
      )}

      {currentView === 'add-doctor' && (
        <AddDoctor 
          editingDoctor={editingDoctor}
          onBack={() => {
            setEditingDoctor(null);
            setCurrentView('admin-dashboard');
          }} 
          onSave={(data) => {
            if (editingDoctor) {
              handleUpdateDoctor({ ...editingDoctor, ...data });
            } else {
              handleAddDoctor(data);
            }
            setCurrentView('admin-dashboard');
          }}
        />
      )}

      {currentView === 'manage-subscription' && (
        <ManageSubscription onBack={() => setCurrentView('admin-dashboard')} />
      )}
      
      {currentView === 'session-form' && (
        <SessionForm 
          onSubmit={handleStartSession} 
          onCancel={() => setCurrentView('dashboard')}
          userProfile={userProfile}
        />
      )}
      
      {currentView === 'active-session' && patientData && selectedPlan && (
        <EndoscopyApp 
          plan={selectedPlan}
          tokens={tokens}
          patientData={patientData}
          onEndSession={handleEndSession}
          onLogout={handleLogout}
          onRecordingStatusChange={setIsRecordingActive}
        />
      )}
      
      {currentView === 'report-generator' && viewingSession && (
        <ReportGenerator 
          session={viewingSession} 
          onBack={() => {
            setViewingSession(null);
            setCurrentView('dashboard');
          }}
          hospitalSettingsList={hospitalSettingsList}
          userProfile={userProfile!}
          plan={selectedPlan}
        />
      )}

      {currentView === 'gallery' && viewingSession && (
        <Gallery 
          session={viewingSession}
          onBack={() => {
            setViewingSession(null);
            setCurrentView('dashboard');
          }}
          onUpdateSession={(updatedSession) => {
            setViewingSession(updatedSession);
            handleUpdateSession(updatedSession);
          }}
        />
      )}

      {currentView === 'settings' && (
        <Settings 
          userProfile={userProfile}
          hospitalSettingsList={hospitalSettingsList}
          onUpdateUser={setUserProfile}
          onUpdateHospitalList={handleUpdateHospitalList}
          onCancelSubscription={handleCancelSubscription}
          plan={selectedPlan}
        />
      )}
    </MainLayout>
    </div>
  );
}

export default App;
