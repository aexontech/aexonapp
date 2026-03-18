import React, { useState, useEffect, useCallback } from 'react';
import { Router, Route, Switch, useLocation } from 'wouter';
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
import PlanSelection from './components/PlanSelection';
import Checkout from './components/Checkout';
import AdminKopSurat from './components/AdminKopSurat';
import EulaModal from './components/EulaModal';
import ConfirmModal from './components/ConfirmModal';
import ToastProvider, { useToast } from './components/ToastProvider';
import { PatientData, Session, UserProfile, HospitalSettings, UserRole } from './types';
import { saveUserData, loadUserData } from './lib/storage';
import { onSessionExpired, Plan } from './lib/aexonConnect';
import { AlertTriangle } from 'lucide-react';

function RouteRedirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => { navigate(to); }, [to, navigate]);
  return null;
}

function AppContent() {
  const { showToast } = useToast();
  const [location, navigate] = useLocation();

  const [selectedPlan, setSelectedPlan] = useState<'subscription' | 'enterprise' | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);

  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [showNavGuard, setShowNavGuard] = useState(false);
  const [pendingNavTarget, setPendingNavTarget] = useState<string | null>(null);
  const [showEula, setShowEula] = useState(false);
  const [doctors, setDoctors] = useState<UserProfile[]>([]);
  const [editingDoctor, setEditingDoctor] = useState<UserProfile | null>(null);

  const hasActiveAccess = selectedPlan === 'subscription' || selectedPlan === 'enterprise' || (trialDaysLeft !== null && trialDaysLeft > 0);

  const activeMenu = (() => {
    if (location.startsWith('/admin-kop-surat')) return 'admin-kop-surat';
    if (location.startsWith('/admin')) return 'admin-dashboard';
    if (location.startsWith('/add-doctor')) return 'add-doctor';
    if (location.startsWith('/session/active')) return 'active-session';
    if (location.startsWith('/session/new')) return 'session-form';
    if (location.startsWith('/session/') && location.includes('/report')) return 'report-generator';
    if (location.startsWith('/gallery')) return 'gallery';
    if (location.startsWith('/settings')) return 'settings';
    if (location.startsWith('/subscription/checkout')) return 'checkout';
    if (location.startsWith('/subscription/plans')) return 'plan-selection';
    if (location.startsWith('/subscription')) return 'manage-subscription';
    if (location.startsWith('/dashboard')) return 'dashboard';
    return 'dashboard';
  })();

  const refreshSubscriptionStatus = useCallback(async () => {
    if (!userProfile) return;
    try {
      const { aexonConnect } = await import('./lib/aexonConnect');
      const { data: subStatus } = await aexonConnect.getSubscription();
      if (!subStatus) return;
      setSelectedPlan(subStatus.plan ?? null);
      setTrialDaysLeft(subStatus.trial_days_left ?? null);
    } catch (err) {
      console.error('Failed to refresh subscription status:', err);
    }
  }, [userProfile]);

  const handleCheckoutSuccess = () => {
    refreshSubscriptionStatus();
  };

  useEffect(() => {
    onSessionExpired(() => {
      setUserProfile(null);
      setSelectedPlan(null);
      setPatientData(null);
      setSessions([]);
      setViewingSession(null);
      setTrialDaysLeft(null);
      navigate('/');
      showToast('Sesi telah berakhir. Silakan login kembali.', 'warning');
    });
  }, [navigate, showToast]);

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

  const handleNavigate = (menu: string) => {
    if (location === '/session/active' && isRecordingActive) {
      setPendingNavTarget(menu);
      setShowNavGuard(true);
      return;
    }

    const routeMap: Record<string, string> = {
      'dashboard': '/dashboard',
      'admin-dashboard': '/admin',
      'admin-kop-surat': '/admin-kop-surat',
      'session-form': '/session/new',
      'active-session': '/session/active',
      'report-generator': '/session/report',
      'settings': '/settings',
      'gallery': '/gallery',
      'manage-subscription': '/subscription',
      'plan-selection': '/subscription/plans',
      'checkout': '/subscription/checkout',
      'add-doctor': '/add-doctor',
    };

    if ((menu === 'session-form' || menu === 'active-session') && !hasActiveAccess) {
      navigate('/subscription/plans');
      return;
    }

    navigate(routeMap[menu] || '/dashboard');
  };

  const confirmNavGuard = () => {
    setShowNavGuard(false);
    if (pendingNavTarget) {
      handleNavigate(pendingNavTarget);
      setPendingNavTarget(null);
    }
  };

  const cancelNavGuard = () => {
    setShowNavGuard(false);
    setPendingNavTarget(null);
  };

  useEffect(() => {
    if (userProfile) {
      (async () => {
        const parsed = await loadUserData<any[]>(userProfile.id, 'sessions');
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
              await saveUserData(userProfile.id, 'sessions', parsed2);
            } catch {
              setSessions([]);
            }
          } else {
            setSessions([]);
          }
        }
      })();
    }
  }, [userProfile?.id]);

  const persistSessions = async (updatedSessions: Session[]) => {
    if (userProfile) {
      try {
        await saveUserData(userProfile.id, 'sessions', updatedSessions);
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
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleEulaAccept = () => {
    if (userProfile) {
      const eulaKey = `aexon_eula_accepted_${userProfile.id}`;
      localStorage.setItem(eulaKey, JSON.stringify({ accepted: true, timestamp: new Date().toISOString() }));
    }
    setShowEula(false);
    if (userProfile?.role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  const handleEulaDecline = () => {
    setShowEula(false);
    setUserProfile(null);
    setSelectedPlan(null);
    setTrialDaysLeft(null);
    navigate('/');
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
    navigate('/dashboard');
  };

  const handleStartSession = (data: PatientData) => {
    setPatientData(data);
    navigate('/session/active');
  };

  const handleEndSession = (session: Session) => {
    const updatedSessions = [session, ...sessions];
    setSessions(updatedSessions);
    persistSessions(updatedSessions);
    setPatientData(null);
    setViewingSession(session);
    navigate('/session/report');
  };

  const handleViewSession = (session: Session) => {
    setViewingSession(session);
    navigate('/session/report');
  };

  const handleViewGallery = (session: Session) => {
    setViewingSession(session);
    navigate('/gallery');
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

  const handleLogout = async () => {
    try {
      const { aexonConnect } = await import('./lib/aexonConnect');
      await aexonConnect.logout();
    } catch {
    }
    navigate('/');
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

  if (!userProfile) {
    return (
      <Switch>
        <Route path="/pricing">
          <Pricing onSelectPlan={handleSelectPlan} />
        </Route>
        <Route>
          <Launcher onLogin={handleLogin} />
        </Route>
      </Switch>
    );
  }

  return (
    <div className={getFontSizeClass()}>
      <MainLayout
        activeMenu={activeMenu}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        plan={selectedPlan}
        trialDaysLeft={trialDaysLeft}
        userProfile={userProfile!}
      >
        <Switch>
          <Route path="/admin-kop-surat">
            <AdminKopSurat
              hospitalSettingsList={hospitalSettingsList}
              onUpdateHospitalList={handleUpdateHospitalList}
              enterprise_id={userProfile?.enterprise_id}
            />
          </Route>

          <Route path="/admin">
            <AdminDashboard
              doctors={doctors}
              enterprise_id={userProfile?.enterprise_id}
              onAddDoctor={() => {
                setEditingDoctor(null);
                navigate('/add-doctor');
              }}
              onEditDoctor={(doctor) => {
                setEditingDoctor(doctor);
                navigate('/add-doctor');
              }}
              onDeleteDoctor={handleDeleteDoctor}
              onToggleDoctorStatus={handleToggleDoctorStatus}
              onManageSubscription={() => navigate('/subscription')}
              onSubscribe={() => navigate('/subscription/plans')}
            />
          </Route>

          <Route path="/add-doctor">
            <AddDoctor
              editingDoctor={editingDoctor}
              onBack={() => {
                setEditingDoctor(null);
                navigate('/admin');
              }}
              onSave={(data) => {
                if (editingDoctor) {
                  handleUpdateDoctor({ ...editingDoctor, ...data });
                } else {
                  handleAddDoctor(data);
                }
                navigate('/admin');
              }}
            />
          </Route>

          <Route path="/session/active">
            {patientData ? (
              <EndoscopyApp
                plan={selectedPlan || 'subscription'}
                patientData={patientData}
                onEndSession={handleEndSession}
                onLogout={handleLogout}
                onRecordingStatusChange={setIsRecordingActive}
              />
            ) : <RouteRedirect to="/dashboard" />}
          </Route>

          <Route path="/session/new">
            <SessionForm
              onSubmit={handleStartSession}
              onCancel={() => navigate('/dashboard')}
              userProfile={userProfile}
            />
          </Route>

          <Route path="/session/report">
            {viewingSession ? (
              <ReportGenerator
                session={viewingSession}
                onBack={() => {
                  setViewingSession(null);
                  navigate('/dashboard');
                }}
                hospitalSettingsList={hospitalSettingsList}
                userProfile={userProfile!}
                plan={selectedPlan}
              />
            ) : <RouteRedirect to="/dashboard" />}
          </Route>

          <Route path="/gallery">
            {viewingSession ? (
              <Gallery
                session={viewingSession}
                userId={userProfile?.id || ''}
                onBack={() => {
                  setViewingSession(null);
                  navigate('/dashboard');
                }}
                onUpdateSession={(updatedSession) => {
                  setViewingSession(updatedSession);
                  handleUpdateSession(updatedSession);
                }}
                onViewReport={(session) => {
                  setViewingSession(session);
                  navigate('/session/report');
                }}
              />
            ) : <RouteRedirect to="/dashboard" />}
          </Route>

          <Route path="/subscription/checkout">
            {checkoutPlan ? (
              <Checkout
                plan={checkoutPlan}
                userEmail={userProfile.email}
                userName={userProfile.name ?? userProfile.email}
                onBack={() => navigate('/subscription/plans')}
                onSuccess={handleCheckoutSuccess}
              />
            ) : <RouteRedirect to="/subscription/plans" />}
          </Route>

          <Route path="/subscription/plans">
            <PlanSelection
              onSelectPlan={(plan) => {
                setCheckoutPlan(plan);
                navigate('/subscription/checkout');
              }}
              onBack={() => navigate(userProfile?.role === 'admin' ? '/admin' : '/dashboard')}
            />
          </Route>

          <Route path="/subscription">
            <ManageSubscription
              onBack={() => navigate('/admin')}
              onSubscribe={() => navigate('/subscription/plans')}
            />
          </Route>

          <Route path="/settings">
            <Settings
              userProfile={userProfile}
              hospitalSettingsList={hospitalSettingsList}
              onUpdateUser={setUserProfile}
              onUpdateHospitalList={handleUpdateHospitalList}
              onUpdateSessions={setSessions}
              onCancelSubscription={handleCancelSubscription}
              onCheckout={(plan) => {
                setCheckoutPlan(plan);
                navigate('/subscription/checkout');
              }}
              plan={selectedPlan}
              sessions={sessions}
            />
          </Route>

          <Route>
            <Dashboard
              sessions={sessions}
              onNewSession={() => {
                if (!hasActiveAccess) {
                  navigate('/subscription/plans');
                } else {
                  navigate('/session/new');
                }
              }}
              onViewSession={handleViewSession}
              onViewGallery={handleViewGallery}
              onDeleteSession={handleDeleteSession}
              onSubscribe={() => navigate('/subscription/plans')}
              userProfile={userProfile}
              hasActiveAccess={hasActiveAccess}
              selectedPlan={selectedPlan}
              trialDaysLeft={trialDaysLeft}
            />
          </Route>
        </Switch>
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
    <Router>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </Router>
  );
}

export default App;
