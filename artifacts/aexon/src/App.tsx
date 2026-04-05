import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Router, Route, Switch, useLocation } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import Launcher from './components/Launcher';
import MainLayout from './components/MainLayout';
import Dashboard from './components/Dashboard';
import SessionHistory from './components/SessionHistory';
import AdminDashboard from './components/AdminDashboard';
import SessionForm from './components/SessionForm';
import EndoscopyApp from './components/EndoscopyApp';
import ReportGenerator from './components/ReportGenerator';
import Settings from './components/Settings';
import Gallery from './components/Gallery';
import AddDoctor from './components/AddDoctor';
import PlanSelection from './components/PlanSelection';
import Checkout from './components/Checkout';
import ProfilePage from './components/ProfilePage';
import SubscriptionPage from './components/SubscriptionPage';
import PatientProfile from './components/PatientProfile';
import EulaModal from './components/EulaModal';
import ConfirmModal from './components/ConfirmModal';
import ToastProvider, { useToast } from './components/ToastProvider';
import { PatientData, Session, UserProfile, HospitalSettings, UserRole, Capture } from './types';
import { saveUserData, loadUserData } from './lib/storage';
import { onSessionExpired, isOfflineTooLong, clearLastOnline, Plan, SubscriptionStatus } from './lib/aexonConnect';
import { loadDraftSession, clearDraftSession, hasDraftSession } from './lib/draftSession';
import { AlertTriangle } from 'lucide-react';
import { isElectron, saveSessionToDisk, loadSessionsFromDisk, deleteSessionFromDisk } from './lib/electronStorage';

function RouteRedirect({ to }: { to: string }) {
  const [, navigate] = useLocation();
  useEffect(() => { navigate(to); }, [to, navigate]);
  return null;
}

function AppContent() {
  const { showToast } = useToast();
  const [location, navigate] = useLocation();

  const [selectedPlan, setSelectedPlan] = useState<'subscription' | 'enterprise' | 'trial' | null>(null);
  const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<Plan | null>(null);
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionStatus | null>(null);
  const [restoringSession, setRestoringSession] = useState(true);

  const [patientData, setPatientData] = useState<PatientData | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [viewingSession, setViewingSession] = useState<Session | null>(null);

  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isRecordingActive, setIsRecordingActive] = useState(false);
  const [showNavGuard, setShowNavGuard] = useState(false);
  const [pendingNavTarget, setPendingNavTarget] = useState<string | null>(null);
  const [showEula, setShowEula] = useState(false);

  // Resume sesi draft
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumeDraft, setResumeDraft] = useState<{
    patientData: PatientData;
    captures: Capture[];
    savedAt: string;
  } | null>(null);
  const [initialCaptures, setInitialCaptures] = useState<Capture[]>([]);

  // Ref untuk pesan kick-out setelah spinner selesai
  const kickOutMessageRef = useRef<string | null>(null);

  // Ref untuk force-end sesi aktif (nav guard → stop recording + save)
  const forceEndSessionRef = useRef<(() => void) | null>(null);
  const profileRefreshedRef = useRef(false);

  // Ref untuk forceLogout — mencegah license check effect re-register interval
  const forceLogoutRef = useRef<(message: string) => void>(() => {});

  const hasActiveAccess = (selectedPlan === 'subscription') || (selectedPlan === 'enterprise' && subscriptionData?.active !== false) || (selectedPlan === 'trial' && trialDaysLeft !== null && trialDaysLeft > 0);

  // ── Session Restore ───────────────────────────────────────────────────────────

  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Electron: selalu mulai dari login (auto-logout saat tutup app)
        if (window.aexonStorage) {
          setRestoringSession(false);
          return;
        }

        const { aexonConnect } = await import('./lib/aexonConnect');
        const token = aexonConnect.getToken();
        if (!token) {
          setRestoringSession(false);
          return;
        }

        if (isOfflineTooLong()) {
          aexonConnect.clearSession();
          clearLastOnline();
          setRestoringSession(false);
          return;
        }

        const { data: profile } = await aexonConnect.getProfile();
        if (!profile) {
          setRestoringSession(false);
          return;
        }

        let subStatus = (await aexonConnect.getSubscription()).data;
        // Retry sekali jika subscription fetch gagal (network flaky saat startup)
        if (!subStatus) {
          await new Promise(r => setTimeout(r, 1500));
          subStatus = (await aexonConnect.getSubscription()).data;
        }

        // Cek device session — kalau login di device lain → kick out
        if (navigator.onLine) {
          const { data: sessionCheck } = await aexonConnect.checkDeviceSession();
          if (sessionCheck && !sessionCheck.valid) {
            aexonConnect.clearSession();
            clearLastOnline();
            kickOutMessageRef.current = 'Akun Anda telah masuk dari perangkat lain.';
            setRestoringSession(false);
            return;
          }
        }

        const userId = profile.email.replace(/[^a-zA-Z0-9]/g, '_');
        setUserProfile({
          id: userId,
          name: profile.full_name || profile.email,
          specialization: profile.specialization || 'Spesialis',
          email: profile.email,
          phone: profile.phone || '',
          role: profile.role as UserRole,
          status: 'active',
          enterprise_id: profile.enterprise_id ?? null,
          strNumber: profile.str_number || '',
          sipNumber: profile.sip_number || '',
          lastNameChangeDate: profile.last_name_change_date || undefined,
          preferences: profile.preferences || { fontSize: 17 },
        });

        if (subStatus) {
          setSubscriptionData(subStatus);
          setSelectedPlan(subStatus.plan_type ?? null);
          setTrialDaysLeft(subStatus.trial_days_left ?? null);
        }

        const isEnterpriseUser = subStatus?.plan_type === 'enterprise';
        const storageKey = isEnterpriseUser && profile.enterprise_id
          ? `aexon_hospital_settings_${profile.enterprise_id}`
          : `aexon_hospital_settings_${userId}`;
        try {
          const stored = localStorage.getItem(storageKey);
          if (stored) setHospitalSettingsList(JSON.parse(stored));
        } catch {}

        // Cek draft sesi yang belum selesai (force quit / crash recovery)
        try {
          const hasDraft = await hasDraftSession(userId);
          if (hasDraft) {
            const draft = await loadDraftSession(userId);
            if (draft) {
              setResumeDraft(draft);
              setShowResumeModal(true);
            }
          }
        } catch {
          // Draft recovery non-critical — silently continue
        }

      } catch {
      } finally {
        setRestoringSession(false);
      }
    };
    restoreSession();
  }, []);

  // Tampilkan pesan kick-out setelah spinner selesai
  useEffect(() => {
    if (!restoringSession && kickOutMessageRef.current) {
      showToast(kickOutMessageRef.current, 'warning');
      kickOutMessageRef.current = null;
    }
  }, [restoringSession]);

  // ── Route helpers ─────────────────────────────────────────────────────────────

  const activeMenu = (() => {
    if (location.startsWith('/admin')) return 'admin-dashboard';
    if (location.startsWith('/add-doctor')) return 'add-doctor';
    if (location.startsWith('/patient-profile')) return 'patient-profile';
    if (location.startsWith('/session/active')) return 'active-session';
    if (location.startsWith('/session/new')) return 'session-form';
    if (location.startsWith('/session/') && location.includes('/report')) return 'report-generator';
    if (location.startsWith('/history')) return 'session-history';
    if (location.startsWith('/gallery')) return 'gallery';
    if (location.startsWith('/settings')) return 'settings';
    if (location.startsWith('/subscription/checkout')) return 'checkout';
    if (location.startsWith('/subscription/plans')) return 'plan-selection';
    if (location.startsWith('/subscription')) return 'manage-subscription';
    if (location.startsWith('/dashboard')) return 'dashboard';
    return 'dashboard';
  })();

  // ── Subscription refresh ──────────────────────────────────────────────────────

  const refreshSubscriptionStatus = useCallback(async () => {
    if (!userProfile) return;
    try {
      const { aexonConnect } = await import('./lib/aexonConnect');
      const { data: subStatus } = await aexonConnect.getSubscription();
      if (!subStatus) return;
      setSubscriptionData(subStatus);
      setSelectedPlan(subStatus.plan_type ?? null);
      setTrialDaysLeft(subStatus.trial_days_left ?? null);
    } catch (err) {
      console.error('Failed to refresh subscription status:', err);
    }
  }, [userProfile]);

  const handleCheckoutSuccess = () => {
    refreshSubscriptionStatus();
  };

  // ── Force logout ──────────────────────────────────────────────────────────────

  const forceLogout = useCallback((message: string) => {
    setUserProfile(null);
    setSelectedPlan(null);
    setSubscriptionData(null);
    setPatientData(null);
    setSessions([]);
    setViewingSession(null);
    setTrialDaysLeft(null);
    setInitialCaptures([]);
    setHospitalSettingsList([]);
    clearLastOnline();
    profileRefreshedRef.current = false;
    navigate('/');
    showToast(message, 'warning');
  }, [navigate, showToast]);

  // Sync forceLogout ref agar license check effect tidak perlu depend on forceLogout
  useEffect(() => { forceLogoutRef.current = forceLogout; }, [forceLogout]);

  useEffect(() => {
    onSessionExpired(() => {
      forceLogoutRef.current('Sesi telah berakhir. Silakan login kembali.');
    });
  }, []);

  useEffect(() => {
    if (!userProfile) return;
    if (isOfflineTooLong()) {
      forceLogoutRef.current('Anda telah offline lebih dari 24 jam. Silakan login kembali.');
      return;
    }
  }, [userProfile]);

  // ── Periodic license + device session check (setiap 5 menit) ─────────────────

  useEffect(() => {
    if (!userProfile) return;

    const LICENSE_CHECK_INTERVAL = 5 * 60 * 1000;

    const checkLicense = async () => {
      if (!navigator.onLine) return;
      try {
        const { aexonConnect } = await import('./lib/aexonConnect');

        // 1. Cek device session — kalau login di device lain → kick out
        const { data: sessionCheck } = await aexonConnect.checkDeviceSession();
        if (sessionCheck && !sessionCheck.valid) {
          forceLogoutRef.current('Akun Anda telah masuk dari perangkat lain.');
          return;
        }

        // 2. Cek status subscription
        const { data: subStatus, status } = await aexonConnect.getSubscription();
        if (status === 401) {
          if (isOfflineTooLong()) {
            forceLogoutRef.current('Sesi tidak dapat diperbarui. Silakan login kembali.');
          }
          return;
        }
        if (subStatus) {
          setSubscriptionData(subStatus);
          setSelectedPlan(subStatus.plan_type ?? null);
          setTrialDaysLeft(subStatus.trial_days_left ?? null);
        }
      } catch {}
    };

    checkLicense();
    const interval = setInterval(checkLicense, LICENSE_CHECK_INTERVAL);

    const handleOnline = () => checkLicense();
    window.addEventListener('online', handleOnline);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
    };
  }, [userProfile]);

  // ── Recording guard (cegah close saat recording) ─────────────────────────────

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRecordingActive) {
        e.preventDefault();
        e.returnValue = '';
        return;
      }
      // Electron: clear JWT tokens saat window ditutup (auto-logout)
      if (window.aexonStorage) {
        try {
          sessionStorage.removeItem('aexon_jwt_token');
          sessionStorage.removeItem('aexon_refresh_token');
          localStorage.removeItem('aexon_jwt_token');
          localStorage.removeItem('aexon_refresh_token');
        } catch {}
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isRecordingActive]);

  // ── Navigation ────────────────────────────────────────────────────────────────

  const handleNavigate = (menu: string) => {
    // Selalu tanya konfirmasi saat di live view, mau record atau tidak
    if (location === '/session/active') {
      setPendingNavTarget(menu);
      setShowNavGuard(true);
      return;
    }

    const routeMap: Record<string, string> = {
      'dashboard': '/dashboard',
      'admin-dashboard': '/admin',
      'session-history': '/history',
      'session-form': '/session/new',
      'active-session': '/session/active',
      'report-generator': '/session/report',
      'settings': '/settings',
      'gallery': '/gallery',
      'manage-subscription': '/subscription',
      'plan-selection': '/subscription/plans',
      'checkout': '/subscription/checkout',
      'add-doctor': '/add-doctor',
      'profile': '/profile',
      'patient-profile': '/patient-profile',
    };

    if ((menu === 'session-form' || menu === 'active-session') && !hasActiveAccess) {
      if (selectedPlan === 'enterprise') {
        showToast(
          userProfile?.role === 'admin'
            ? 'Langganan enterprise tidak aktif. Hubungi tim Aexon untuk memperpanjang.'
            : 'Langganan enterprise tidak aktif. Hubungi Admin RS Anda.',
          'warning'
        );
        return;
      }
      navigate('/subscription/plans');
      return;
    }

    if (menu === 'settings') setSettingsTab('keamanan');
    navigate(routeMap[menu] || '/dashboard');
  };

  // Keluar dari sesi aktif → stop recording + auto-save semua captures
  const confirmNavGuard = () => {
    setShowNavGuard(false);
    if (pendingNavTarget) {
      if (location === '/session/active' && forceEndSessionRef.current) {
        // Trigger EndoscopyApp: stop recording + buat session + navigate ke report
        forceEndSessionRef.current();
      } else {
        handleNavigate(pendingNavTarget);
      }
      setPendingNavTarget(null);
    }
  };

  const cancelNavGuard = () => {
    setShowNavGuard(false);
    setPendingNavTarget(null);
  };

  // ── Session data ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (userProfile?.id) {
      refreshSubscriptionStatus();
    }
  }, [userProfile?.id]);

  // ── Profile refresh: jika nama masih email, ambil dari backend ──────────────
  useEffect(() => {
    if (!userProfile) return;
    if (profileRefreshedRef.current) return;
    const needsRefresh = userProfile.name === userProfile.email || userProfile.specialization === 'Spesialis';
    if (needsRefresh) {
      profileRefreshedRef.current = true;
      (async () => {
        try {
          const { aexonConnect } = await import('./lib/aexonConnect');
          const token = aexonConnect.getToken();
          if (!token) return;
          const { data: p } = await aexonConnect.getProfile();
          if (p?.full_name) {
            setUserProfile(prev => {
              if (!prev) return prev;
              return {
                ...prev,
                name: p.full_name || prev.name,
                specialization: p.specialization || prev.specialization,
                phone: p.phone || prev.phone,
                strNumber: p.str_number || prev.strNumber,
                sipNumber: p.sip_number || prev.sipNumber,
                lastNameChangeDate: p.last_name_change_date || prev.lastNameChangeDate,
              };
            });
          }
        } catch {
          // Profile refresh failed — non-critical, will retry next cycle
        }
      })();
    }
  }, [userProfile?.id, userProfile?.name]);

        useEffect(() => {
          if (userProfile) {
            (async () => {
              // Electron: load dari encrypted disk storage
              const diskSessions = await loadSessionsFromDisk();
              if (diskSessions !== null) {
                setSessions(diskSessions);
                return;
              }

              const parsed = await loadUserData<Session[]>(userProfile.id, 'sessions');
        if (parsed && Array.isArray(parsed)) {
          try {
            const formatted: Session[] = parsed.map((s) => ({
              ...s,
              date: new Date(s.date),
              captures: (s.captures || []).map((c) => ({
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
              const parsed2: Session[] = JSON.parse(legacySessions);
              const formatted: Session[] = parsed2.map((s) => ({
                ...s,
                date: new Date(s.date),
                captures: (s.captures || []).map((c) => ({
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
    if (!userProfile) return;
    // Electron: disk encrypted adalah source-of-truth, skip IndexedDB
    if (isElectron()) return;
    try {
      await saveUserData(userProfile.id, 'sessions', updatedSessions);
    } catch {
      showToast('Penyimpanan penuh. Beberapa foto mungkin tidak tersimpan. Pertimbangkan untuk menghapus sesi lama.', 'error', 8000);
    }
  };

  const [hospitalSettingsList, setHospitalSettingsList] = useState<HospitalSettings[]>([]);
  const [settingsTab, setSettingsTab] = useState<string>('keamanan');
  const [editReportPageConfig, setEditReportPageConfig] = useState<any[] | undefined>(undefined);

  // ── Login ─────────────────────────────────────────────────────────────────────

  const handleLogin = (
    role: UserRole,
    email: string,
    fullName: string,
    plan: 'subscription' | 'enterprise' | 'trial' | null,
    trialDaysLeft: number | null,
    enterpriseId?: string,
    lastNameChangeDate?: string,
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
      enterprise_id: enterpriseId ?? null,
      preferences: { fontSize: 17 },
      lastNameChangeDate: lastNameChangeDate || undefined,
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

    // Cek apakah ada draft sesi yang belum selesai
    hasDraftSession(userId).then((hasDraft) => {
      if (hasDraft) {
        loadDraftSession(userId).then((draft) => {
          if (draft) {
            setResumeDraft(draft);
            setShowResumeModal(true);
          }
        });
      }
    });

    if (role === 'admin') {
      navigate('/admin');
    } else {
      navigate('/dashboard');
    }
  };

  // ── Resume / Buang draft ──────────────────────────────────────────────────────

  const handleResumeSession = () => {
    if (!resumeDraft || !userProfile) return;
    setShowResumeModal(false);
    setPatientData(resumeDraft.patientData);
    setInitialCaptures(resumeDraft.captures);
    setResumeDraft(null);
    navigate('/session/active');
  };

  const handleDiscardDraft = () => {
    if (userProfile) {
      clearDraftSession(userProfile.id);
    }
    setShowResumeModal(false);
    setResumeDraft(null);
    setInitialCaptures([]);
  };

  // ── EULA ──────────────────────────────────────────────────────────────────────

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
    setSubscriptionData(null);
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

  // ── Session handlers ──────────────────────────────────────────────────────────

  const handleStartSession = (data: PatientData) => {
    setInitialCaptures([]);
    setPatientData(data);
    navigate('/session/active');

    // Upsert patient to IndexedDB (and Supabase if online) — fire & forget
    if (userProfile?.id && data.rmNumber) {
      import('./lib/storage').then(({ upsertPatientLocal }) => {
        upsertPatientLocal(userProfile!.id, {
          rmNumber: data.rmNumber,
          fullName: data.name,
          gender: data.gender,
          dateOfBirth: data.dob,
          diagnosis: data.diagnosis,
          diagnosisIcd10: data.diagnosis_icd10,
          differentialDiagnosis: data.differentialDiagnosis,
          differentialDiagnosisIcd10: data.differentialDiagnosis_icd10,
          icd9Codes: data.procedures_icd9.filter(p => p.trim()),
          notes: '',
          updatedAt: new Date().toISOString(),
        }).catch(() => {});
      });
      import('./lib/aexonConnect').then(({ aexonConnect: ac }) => {
        ac.upsertPatient({
          rm_number: data.rmNumber,
          full_name: data.name,
          gender: data.gender,
          date_of_birth: data.dob,
          diagnosis: data.diagnosis,
          icd10_code: data.diagnosis_icd10,
          icd9_codes: data.procedures_icd9.filter(p => p.trim()),
          notes: '',
        }).catch(() => {});
      });
    }
  };

  const handleEndSession = async (session: Session) => {
    const updatedSessions = [session, ...sessions];
    setSessions(updatedSessions);
    // Persist ke storage sebelum navigasi — pastikan data tersimpan
    await persistSessions(updatedSessions);
    // Electron: captures + metadata sudah tersimpan secara real-time di EndoscopyApp.
    // saveSessionToDisk hanya dipanggil di Replit/browser sebagai fallback.
    if (!isElectron()) {
      saveSessionToDisk(session);
    }
    setPatientData(null);
    setInitialCaptures([]); // Reset setelah sesi selesai
    setViewingSession(session);
    navigate('/session/report');
  };

  const [viewingPatientSessions, setViewingPatientSessions] = useState<Session[]>([]);

  const handleViewSession = (session: Session) => {
    // Find all sessions for this patient by RM number
    const rm = session.patient.rmNumber;
    const patientSessions = rm ? sessions.filter(s => s.patient.rmNumber === rm) : [session];
    setViewingPatientSessions(patientSessions);
    setViewingSession(session);
    navigate('/patient-profile');
  };

  const handleViewPatient = (rmNumber: string) => {
    const patientSessions = sessions.filter(s => s.patient.rmNumber === rmNumber);
    if (patientSessions.length === 0) return;
    // Sort newest first, set the latest as the active session
    const sorted = [...patientSessions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setViewingPatientSessions(sorted);
    setViewingSession(sorted[0]);
    navigate('/patient-profile');
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
    deleteSessionFromDisk(sessionId);
  };

  // ── Logout ────────────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    try {
      const { aexonConnect } = await import('./lib/aexonConnect');
      await aexonConnect.logout();
    } catch {}
    // Electron: hapus crypto key dari memory
    try { await window.aexonStorage?.logout(); } catch {}
    navigate('/');
    setSelectedPlan(null);
    setSubscriptionData(null);
    setPatientData(null);
    setSessions([]);
    setViewingSession(null);
    setViewingPatientSessions([]);
    setUserProfile(null);
    setTrialDaysLeft(null);
    setInitialCaptures([]);
    setHospitalSettingsList([]);
    profileRefreshedRef.current = false;
  };

  const handleCancelSubscription = async () => {
    try {
      const { aexonConnect } = await import('./lib/aexonConnect');
      const { data, error } = await aexonConnect.cancelSubscription();
      if (error) {
        showToast(error, 'error');
        return;
      }
      if (data && data.auto_renew === false) {
        showToast('Perpanjangan otomatis telah dinonaktifkan.', 'warning');
      }
      // Refresh subscription status dari server
      await refreshSubscriptionStatus();
    } catch {
      showToast('Gagal membatalkan langganan. Coba lagi.', 'error');
    }
  };

  // ── Font size ─────────────────────────────────────────────────────────────────

  const getAppZoom = (): number => {
    const fs = userProfile?.preferences?.fontSize;
    if (typeof fs === 'number' && fs !== 14) return fs / 14;
    return 1;
  };

  // Apply zoom at document level — MUST be before any early returns (React hooks rule)
  const appZoom = getAppZoom();
  React.useEffect(() => {
    document.documentElement.style.zoom = `${appZoom}`;
    return () => { document.documentElement.style.zoom = '1'; };
  }, [appZoom]);

  // ── Render ────────────────────────────────────────────────────────────────────

  if (showEula) {
    return (
      <EulaModal
        onAccept={handleEulaAccept}
        onDecline={handleEulaDecline}
      />
    );
  }

  if (restoringSession) {
    return (
      <div style={{
        height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        backgroundColor: '#F4F6F8', fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, #0C1E35 0%, #152d4f 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
            boxShadow: '0 4px 20px rgba(12,30,53,0.2)',
          }}>
            <div className="animate-spin" style={{
              width: 24, height: 24, border: '2.5px solid rgba(255,255,255,0.2)', borderTopColor: '#fff',
              borderRadius: '50%',
            }} />
          </div>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#0C1E35', marginBottom: 4 }}>Memulihkan sesi...</p>
          <p style={{ fontSize: 12, color: '#94A3B8' }}>Mengembalikan data pasien dan media</p>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <Launcher onLogin={handleLogin} />
    );
  }

  return (
    <div>
      <MainLayout
        activeMenu={activeMenu}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
        plan={selectedPlan}
        trialDaysLeft={trialDaysLeft}
        userProfile={userProfile!}
        subscriptionData={subscriptionData}
      >
        <Switch>
          <Route path="/admin">
            <AdminDashboard
              enterprise_id={userProfile?.enterprise_id}
              onAddDoctor={() => navigate('/add-doctor')}
              onManageSubscription={() => navigate('/subscription')}
              onSubscribe={() => navigate('/subscription/plans')}
              onShowToast={showToast}
            />
          </Route>

          <Route path="/add-doctor">
            <AddDoctor
              onBack={() => navigate('/admin')}
              onSuccess={(msg) => showToast(msg, 'success')}
              onError={(msg) => showToast(msg, 'error')}
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
                onRegisterForceEnd={(fn) => { forceEndSessionRef.current = fn; }}
                userId={userProfile!.id}
                initialCaptures={initialCaptures.length > 0 ? initialCaptures : undefined}
              />
            ) : <RouteRedirect to="/dashboard" />}
          </Route>

          <Route path="/session/new">
            <SessionForm
              onSubmit={handleStartSession}
              onCancel={() => navigate('/dashboard')}
              userProfile={userProfile}
              sessions={sessions}
            />
          </Route>

          <Route path="/patient-profile">
            {viewingSession ? (
              <PatientProfile
                session={viewingSession}
                allSessions={viewingPatientSessions.length > 0 ? viewingPatientSessions : undefined}
                onBack={() => {
                  setViewingSession(null);
                  setViewingPatientSessions([]);
                  navigate('/dashboard');
                }}
                onEditReport={(session, pageConfig) => {
                  setViewingSession(session);
                  setEditReportPageConfig(pageConfig);
                  navigate('/session/report');
                }}
                onViewGallery={(session) => {
                  setViewingSession(session);
                  navigate('/gallery');
                }}
                onUpdateSession={(updatedSession) => {
                  setViewingSession(updatedSession);
                  handleUpdateSession(updatedSession);
                  // Also update in viewingPatientSessions
                  setViewingPatientSessions(prev =>
                    prev.map(s => s.id === updatedSession.id ? updatedSession : s)
                  );
                }}
              />
            ) : <RouteRedirect to="/dashboard" />}
          </Route>

          <Route path="/session/report">
            {viewingSession ? (
              <ReportGenerator
                session={viewingSession}
                onBack={() => {
                  setEditReportPageConfig(undefined);
                  navigate('/patient-profile');
                }}
                hospitalSettingsList={hospitalSettingsList}
                userProfile={userProfile!}
                plan={selectedPlan}
                onUpdateSession={(updatedSession) => {
                  setViewingSession(updatedSession);
                  handleUpdateSession(updatedSession);
                }}
                initialPageConfig={editReportPageConfig}
              />
            ) : <RouteRedirect to="/dashboard" />}
          </Route>

          <Route path="/gallery">
            {viewingSession ? (
              <Gallery
                session={viewingSession}
                userId={userProfile?.id || ''}
                onBack={() => {
                  navigate('/patient-profile');
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
                onDone={() => navigate('/dashboard')}
              />
            ) : <RouteRedirect to="/subscription/plans" />}
          </Route>

            <Route path="/subscription/plans">
              {selectedPlan === 'enterprise' ? (
                <RouteRedirect to={userProfile?.role === 'admin' ? '/admin' : '/dashboard'} />
              ) : (
            <PlanSelection
              onSelectPlan={(plan) => {
                setCheckoutPlan(plan);
                navigate('/subscription/checkout');
              }}
              onBack={() => navigate(userProfile?.role === 'admin' ? '/admin' : '/dashboard')}
            />
           )}
          </Route>

          <Route path="/subscription">
            <SubscriptionPage
              onBack={() => navigate(userProfile?.role === 'admin' ? '/admin' : '/dashboard')}
              onSubscribe={() => navigate('/subscription/plans')}
              isEnterprise={selectedPlan === 'enterprise'}
              isAdmin={userProfile?.role === 'admin'}
              subscriptionData={subscriptionData}
            />
          </Route>

          <Route path="/profile">
            <ProfilePage
              userProfile={userProfile}
              plan={selectedPlan}
              onBack={() => navigate(userProfile?.role === 'admin' ? '/admin' : '/dashboard')}
              onUpdateUser={setUserProfile}
              subscriptionData={subscriptionData}
              trialDaysLeft={trialDaysLeft}
              hospitalSettingsList={hospitalSettingsList}
              onNavigateToSubscription={selectedPlan !== 'enterprise' ? () => navigate('/subscription') : undefined}
              onNavigateToSettings={() => { setSettingsTab('kop-surat'); navigate('/settings'); }}
              onNavigateToBantuan={() => { setSettingsTab('bantuan'); navigate('/settings'); }}
            />
          </Route>

          <Route path="/settings">
            <Settings
              initialTab={settingsTab}
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
              onNavigateToProfile={() => navigate('/profile')}
              onNavigateToSubscription={selectedPlan !== 'enterprise' ? () => navigate('/subscription') : undefined}
              plan={selectedPlan}
              sessions={sessions}
              subscriptionData={subscriptionData}
            />
          </Route>

          <Route path="/history">
            <SessionHistory
              sessions={sessions}
              onViewSession={handleViewSession}
              onDeleteSession={handleDeleteSession}
              onBack={() => navigate('/dashboard')}
            />
          </Route>

          <Route>
            <Dashboard
              sessions={sessions}
              onNewSession={() => {
                if (!hasActiveAccess) {
                  if (selectedPlan === 'enterprise') {
                    showToast(
                      userProfile?.role === 'admin'
                        ? 'Langganan enterprise tidak aktif. Hubungi tim Aexon.'
                        : 'Langganan enterprise tidak aktif. Hubungi Admin RS.',
                      'warning'
                    );
                  } else {
                    navigate('/subscription/plans');
                  }
                } else {
                  navigate('/session/new');
                }
              }}
              onViewSession={handleViewSession}
              onViewPatient={handleViewPatient}
              onViewGallery={handleViewGallery}
              onDeleteSession={handleDeleteSession}
              onSubscribe={() => navigate('/subscription/plans')}
              onNavigateHistory={() => navigate('/history')}
              userProfile={userProfile}
              hasActiveAccess={hasActiveAccess}
              selectedPlan={selectedPlan}
              trialDaysLeft={trialDaysLeft}
              subscriptionData={subscriptionData}
            />
          </Route>
        </Switch>
      </MainLayout>

      {/* Nav Guard — keluar di tengah sesi aktif */}
      <ConfirmModal
        isOpen={showNavGuard}
        onConfirm={confirmNavGuard}
        onCancel={cancelNavGuard}
        title="Keluar dari Sesi?"
        message={isRecordingActive
          ? "Rekaman akan dihentikan dan semua foto serta video yang sudah diambil akan otomatis tersimpan. Yakin keluar?"
          : "Semua foto dan video yang sudah diambil akan otomatis tersimpan. Yakin keluar dari sesi ini?"}
        confirmText="Keluar & Simpan"
        cancelText="Lanjutkan Sesi"
        variant="warning"
        icon={<AlertTriangle className="w-10 h-10 text-amber-500" />}
      />

      {/* Resume Modal — muncul saat login kalau ada draft sesi yang belum selesai */}
      {showResumeModal && resumeDraft && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          backgroundColor: 'rgba(15,23,42,0.6)',
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          <div style={{
            backgroundColor: '#fff', borderRadius: 20, padding: 36,
            maxWidth: 440, width: '100%',
            boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
            textAlign: 'center',
            position: 'relative', overflow: 'hidden',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              background: 'linear-gradient(135deg, #F97316, #EAB308)',
            }} />

            <div style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: '#FFF7ED',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
              border: '1px solid #FED7AA',
            }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path d="M12 8v4l3 3" stroke="#F97316" strokeWidth="2"
                  strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="12" cy="12" r="9" stroke="#F97316" strokeWidth="2" />
              </svg>
            </div>

            <h3 style={{
              fontSize: 20, fontWeight: 900, color: '#0C1E35',
              marginBottom: 8,
            }}>
              Ada Sesi yang Belum Selesai
            </h3>

            <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 6 }}>
              Pasien: <strong style={{ color: '#0C1E35' }}>
                {resumeDraft.patientData.name}
              </strong>
            </p>
            <p style={{ fontSize: 13, color: '#94A3B8', marginBottom: 6 }}>
              {resumeDraft.captures.length} media tersimpan
            </p>
            <p style={{ fontSize: 12, color: '#CBD5E1', marginBottom: 28 }}>
              Disimpan {new Date(resumeDraft.savedAt).toLocaleString('id-ID', {
                day: 'numeric', month: 'short', year: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })}
            </p>

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={handleDiscardDraft}
                style={{
                  flex: 1, padding: '13px 0',
                  backgroundColor: '#F4F6F8', color: '#475569',
                  fontWeight: 700, fontSize: 13, borderRadius: 12,
                  border: 'none', cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'background-color 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#E8ECF1'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F4F6F8'; }}
              >
                Buang
              </button>
              <button
                onClick={handleResumeSession}
                style={{
                  flex: 1, padding: '13px 0',
                  background: 'linear-gradient(135deg, #0C1E35 0%, #152d4f 100%)', color: '#fff',
                  fontWeight: 700, fontSize: 13, borderRadius: 12,
                  border: 'none', cursor: 'pointer',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  boxShadow: '0 4px 20px rgba(12,30,53,0.25)',
                }}
              >
                Lanjutkan Sesi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <Router hook={window.aexonStorage ? useHashLocation : undefined}>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </Router>
  );
}

export default App;