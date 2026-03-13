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
import EulaModal from './components/EulaModal';
import ConfirmModal from './components/ConfirmModal';
import ToastProvider, { useToast } from './components/ToastProvider';
import { PatientData, Session, UserProfile, HospitalSettings, UserRole } from './types';
import { saveUserData, loadUserData } from './lib/storage';
import { AlertTriangle } from 'lucide-react';

function AppContent() {
  const { showToast } = useToast();
  const [eulaAccepted, setEulaAccepted] = useState(() => {
    try {
      const stored = localStorage.getItem('aexon_eula_accepted');
      return stored ? JSON.parse(stored).accepted === true : false;
    } catch { return false; }
  });

  const [currentView, setCurrentView] = useState<'launcher' | 'pricing' | 'dashboard' | 'admin-dashboard' | 'session-form' | 'active-session' | 'report-generator' | 'settings' | 'gallery' | 'add-doctor' | 'manage-subscription'>('launcher');
  const [selectedPlan, setSelectedPlan] = useState<'subscription' | 'enterprise' | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(7);
  
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [showNavGuard, setShowNavGuard] = useState(false);
  const [pendingNavTarget, setPendingNavTarget] = useState<string | null>(null);
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

  const hasActiveAccess = selectedPlan === 'subscription' || selectedPlan === 'enterprise' || (trialDaysLeft !== null && trialDaysLeft > 0);

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
      setPendingNavTarget(menu);
      setShowNavGuard(true);
      return;
    }
    if ((menu === 'session-form' || menu === 'active-session') && !hasActiveAccess) {
      setCurrentView('pricing');
      return;
    }
    setCurrentView(menu);
  };

  const confirmNavGuard = () => {
    setShowNavGuard(false);
    if (pendingNavTarget) {
      setCurrentView(pendingNavTarget as any);
      setPendingNavTarget(null);
    }
  };

  const cancelNavGuard = () => {
    setShowNavGuard(false);
    setPendingNavTarget(null);
  };

  useEffect(() => {
    if (userProfile) {
      const parsed = loadUserData<any[]>(userProfile.id, 'sessions');
      if (parsed && Array.isArray(parsed)) {
        try {
          const formatted = parsed.map((s: any) => ({
            ...s,
            date: new Date(s.date),
            captures: (s.captures || []).map((c: any) => ({
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
        const legacySessions = localStorage.getItem(`aexon_sessions_${userProfile.id}`);
        if (legacySessions) {
          try {
            const parsed2 = JSON.parse(legacySessions);
            const formatted = parsed2.map((s: any) => ({
              ...s,
              date: new Date(s.date),
              captures: (s.captures || []).map((c: any) => ({
                ...c,
                timestamp: new Date(c.timestamp)
              }))
            }));
            setSessions(formatted);
            saveUserData(userProfile.id, 'sessions', parsed2);
          } catch {
            setSessions([]);
          }
        } else {
          setSessions([]);
        }
      }
    }
  }, [userProfile?.id]);

  const persistSessions = (updatedSessions: Session[]) => {
    if (userProfile) {
      try {
        saveUserData(userProfile.id, 'sessions', updatedSessions);
      } catch (e) {
        showToast('Penyimpanan penuh. Beberapa foto mungkin tidak tersimpan. Pertimbangkan untuk menghapus sesi lama.', 'error', 8000);
      }
    }
  };

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

  const handleSelectPlan = (plan: 'subscription') => {
    setSelectedPlan(plan);
    setCurrentView('dashboard');
  };

  const handleStartSession = (data: PatientData) => {
    setPatientData(data);
    setCurrentView('active-session');
  };

  const handleEndSession = (session: Session) => {
    const updatedSessions = [session, ...sessions];
    setSessions(updatedSessions);
    persistSessions(updatedSessions);
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
    persistSessions(updatedSessions);
  };

  const handleDeleteSession = (sessionId: string) => {
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    setSessions(updatedSessions);
    persistSessions(updatedSessions);
  };

  const handleLogout = () => {
    setCurrentView('launcher');
    setSelectedPlan(null);
    setPatientData(null);
    setSessions([]);
    setViewingSession(null);
    setUserProfile(null);
  };

  const handleCancelSubscription = () => {
    setSelectedPlan(null);
    showToast('Paket berlangganan telah dibatalkan.', 'warning');
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

  if (!eulaAccepted) {
    return (
      <EulaModal
        onAccept={() => setEulaAccepted(true)}
        onDecline={() => {}}
      />
    );
  }

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
        trialDaysLeft={trialDaysLeft}
        userProfile={userProfile!}
      >
      {currentView === 'dashboard' && (
        <Dashboard 
          sessions={sessions} 
          onNewSession={() => {
            if (!hasActiveAccess) {
              setCurrentView('pricing');
            } else {
              setCurrentView('session-form');
            }
          }}
          onViewSession={handleViewSession}
          onViewGallery={handleViewGallery}
          onDeleteSession={handleDeleteSession}
          userProfile={userProfile}
          hasActiveAccess={hasActiveAccess}
          selectedPlan={selectedPlan}
          trialDaysLeft={trialDaysLeft}
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
      
      {currentView === 'active-session' && patientData && (
        <EndoscopyApp 
          plan={selectedPlan || 'subscription'}
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
          userProfile={userProfile}
          allSessions={sessions}
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
          sessions={sessions}
        />
      )}
    </MainLayout>

    <ConfirmModal
      isOpen={showNavGuard}
      onConfirm={confirmNavGuard}
      onCancel={cancelNavGuard}
      title="Keluar dari Sesi?"
      message="Prosedur sedang berjalan. Keluar sekarang akan menghapus data yang belum disimpan. Yakin keluar?"
      confirmText="Keluar"
      cancelText="Batal"
      variant="warning"
      icon={<AlertTriangle className="w-10 h-10 text-amber-500" />}
    />
    </div>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
