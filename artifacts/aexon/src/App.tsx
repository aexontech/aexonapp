import React, { useState, useEffect } from 'react';
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
import Checkout from './components/Checkout';
import AdminKopSurat from './components/AdminKopSurat';
import EulaModal from './components/EulaModal';
import ConfirmModal from './components/ConfirmModal';
import ToastProvider, { useToast } from './components/ToastProvider';
import { PatientData, Session, UserProfile, HospitalSettings, UserRole } from './types';
import { saveUserData, loadUserData } from './lib/storage';
import { AlertTriangle } from 'lucide-react';

function AppContent() {
  const { showToast } = useToast();

  const [currentView, setCurrentView] = useState<'launcher' | 'pricing' | 'dashboard' | 'admin-dashboard' | 'admin-kop-surat' | 'session-form' | 'active-session' | 'report-generator' | 'settings' | 'gallery' | 'add-doctor' | 'manage-subscription' | 'checkout'>('launcher');
  const [checkoutPlan, setCheckoutPlan] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<'subscription' | 'enterprise' | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  
  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [showNavGuard, setShowNavGuard] = useState(false);
  const [pendingNavTarget, setPendingNavTarget] = useState<string | null>(null);
  const [showEula, setShowEula] = useState(false);
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

  const [hospitalSettingsList, setHospitalSettingsList] = useState<HospitalSettings[]>([]);

  const handleLogin = (
    role: UserRole, 
    email: string, 
    fullName: string, 
    plan: 'subscription' | 'enterprise' | null, 
    trialDaysLeft: number | null,
    enterpriseId?: string
  ) => {
    const userId = email.replace(/[^a-zA-Z0-9]/g, '_');
    
    setUserProfile({
      id: userId,
      name: fullName || email,
      specialization: 'Spesialis',
      email: email,
      phone: '',
      role: role,
      status: 'active',
      enterprise_id: enterpriseId ?? null
    });
    
    setSelectedPlan(plan);
    
    if (trialDaysLeft !== null) {
      setTrialDaysLeft(trialDaysLeft);
    }

    const isEnterpriseUser = plan === 'enterprise';
    const storageKey = isEnterpriseUser && enterpriseId
      ? `aexon_hospital_settings_${enterpriseId}`
      : `aexon_hospital_settings_${userId}`;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        setHospitalSettingsList(JSON.parse(stored));
      } else {
        setHospitalSettingsList([]);
      }
    } catch {
      setHospitalSettingsList([]);
    }

    if (role === 'admin') {
      setCurrentView('admin-dashboard');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleEulaAccept = () => {
    if (userProfile) {
      const eulaKey = `aexon_eula_accepted_${userProfile.id}`;
      localStorage.setItem(eulaKey, JSON.stringify({ accepted: true, timestamp: new Date().toISOString() }));
    }
    setShowEula(false);
    if (userProfile?.role === 'admin') {
      setCurrentView('admin-dashboard');
    } else {
      setCurrentView('dashboard');
    }
  };

  const handleEulaDecline = () => {
    setShowEula(false);
    setUserProfile(null);
    setSelectedPlan(null);
    setTrialDaysLeft(null);
    setCurrentView('launcher');
  };

  const handleUpdateHospitalList = (list: HospitalSettings[]) => {
    const isEnterpriseUser = selectedPlan === 'enterprise';
    const storageKey = isEnterpriseUser && userProfile?.enterprise_id
      ? `aexon_hospital_settings_${userProfile.enterprise_id}`
      : `aexon_hospital_settings_${userProfile?.id}`;

    if (isEnterpriseUser) {
      const capped = list.slice(0, 1);
      setHospitalSettingsList(capped);
      try { localStorage.setItem(storageKey, JSON.stringify(capped)); } catch {}
    } else {
      const capped = list.slice(0, 3);
      setHospitalSettingsList(capped);
      try { localStorage.setItem(storageKey, JSON.stringify(capped)); } catch {}
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
    setTrialDaysLeft(null);
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

  if (showEula) {
    return (
      <EulaModal
        onAccept={handleEulaAccept}
        onDecline={handleEulaDecline}
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
          enterprise_id={userProfile?.enterprise_id}
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

      {currentView === 'admin-kop-surat' && (
        <AdminKopSurat
          hospitalSettingsList={hospitalSettingsList}
          onUpdateHospitalList={handleUpdateHospitalList}
          enterprise_id={userProfile?.enterprise_id}
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
          onViewReport={(session) => {
            setViewingSession(session);
            setCurrentView('report-generator');
          }}
        />
      )}

      {currentView === 'settings' && (
        <Settings 
          userProfile={userProfile}
          hospitalSettingsList={hospitalSettingsList}
          onUpdateUser={setUserProfile}
          onUpdateHospitalList={handleUpdateHospitalList}
          onUpdateSessions={setSessions}
          onCancelSubscription={handleCancelSubscription}
          onCheckout={(plan) => {
            setCheckoutPlan(plan);
            setCurrentView('checkout');
          }}
          plan={selectedPlan}
          sessions={sessions}
        />
      )}

      {currentView === 'checkout' && checkoutPlan && (
        <Checkout
          plan={checkoutPlan}
          userEmail={userProfile.email}
          userName={userProfile.full_name || userProfile.email}
          onBack={() => setCurrentView('settings')}
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
