import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Video, Square, Download, Settings, AlertCircle, Maximize, Minimize, FileImage, FileVideo, CheckCircle2, ChevronDown, Sliders, HardDrive, Info, X, Trash2, Edit3, MousePointer2, FlipHorizontal2 } from 'lucide-react';
import { PatientData, Capture, Session } from '../types';
import ImageEditor from './ImageEditor';
import ConfirmModal from './ConfirmModal';
import { Pattern } from './Logo';
import { saveDraftSession, clearDraftSession } from '../lib/draftSession';
import {
  isElectron,
  initSessionOnDisk,
  saveCaptureRealtime,
  updateSessionMeta,
  finalizeSessionOnDisk,
} from '../lib/electronStorage';
import DiskSpaceIndicator from './DiskSpaceIndicator';
import {
  startRecordingBuffer,
  appendChunk,
  reconstructVideo,
  clearBuffer,
  getPendingRecordings,
} from '../lib/recordingBuffer';

const FONT = "'Plus Jakarta Sans', sans-serif";
const CHUNK_INTERVAL_MS = 5000;

interface EndoscopyAppProps {
  plan: 'subscription' | 'enterprise' | 'trial';
  patientData: PatientData;
  onEndSession: (session: Session) => void;
  onLogout: () => void;
  onRecordingStatusChange?: (isRecording: boolean) => void;
  onRegisterForceEnd?: (fn: () => void) => void;
  userId: string;
  initialCaptures?: Capture[];
}

export default function EndoscopyApp({ plan, patientData, onEndSession, onLogout, onRecordingStatusChange, onRegisterForceEnd, userId, initialCaptures }: EndoscopyAppProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  // Ref stream untuk menghindari stale closure di useEffect cleanup
  // (state tidak bisa diakses dari cleanup [] karena closure lama)
  const streamRef = useRef<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);

  // Inisialisasi dari draft jika ada (resume sesi)
  const [captures, setCaptures] = useState<Capture[]>(initialCaptures ?? []);
  const [error, setError] = useState<string | null>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedResolution, setSelectedResolution] = useState<'480p' | '720p' | '1080p' | '4K'>('1080p');

  const [selectedDrive, setSelectedDrive] = useState('');
  const [availableDrives, setAvailableDrives] = useState<{ letter: string; label: string }[]>([]);
  const [activeGalleryTab, setActiveGalleryTab] = useState<'photos' | 'videos' | 'settings'>('photos');
  const [imageSettings, setImageSettings] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    whiteBalance: 0,
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showCaptureNotification, setShowCaptureNotification] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [selectedCaptureForReview, setSelectedCaptureForReview] = useState<Capture | null>(null);
  const [editingCapture, setEditingCapture] = useState<Capture | null>(null);
  const [selectedCaptureIds, setSelectedCaptureIds] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSessionInfoCollapsed, setIsSessionInfoCollapsed] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Ref untuk force exit (nav guard)
  const pendingForceEndRef = useRef(false);

  // Ref untuk stable session ID (dibuat saat mount, dipakai sampai session selesai)
  const activeSessionIdRef = useRef<string>(
    `session_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  );

  // Ref untuk recording buffer
  const currentRecordingIdRef = useRef<string | null>(null);
  const chunkIndexRef = useRef(0);
  const recordingFrameRef = useRef<number | null>(null);

  // Ref untuk blob URL cleanup saat unmount
  const capturesRef = useRef<Capture[]>(captures);
  useEffect(() => { capturesRef.current = captures; }, [captures]);

  // ── Keyboard delete handler ─────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedCaptureIds.length > 0 && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
          handleDeleteSelected();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedCaptureIds]);

  const handleDeleteSelected = () => {
    setShowDeleteModal(true);
  };

  const confirmDeleteSelected = () => {
    setCaptures(prev => prev.filter(c => !selectedCaptureIds.includes(c.id)));
    setSelectedCaptureIds([]);
    setShowDeleteModal(false);
  };

  const toggleCaptureSelection = (id: string) => {
    setSelectedCaptureIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  // ── Selection box (drag to select) ─────────────────────────────────────────
  const handleGalleryMouseDown = (e: React.MouseEvent) => {
    if (activeGalleryTab === 'settings') return;
    const rect = e.currentTarget.getBoundingClientRect();
    setIsSelecting(true);
    setSelectionBox({
      x1: e.clientX - rect.left,
      y1: e.clientY - rect.top,
      x2: e.clientX - rect.left,
      y2: e.clientY - rect.top
    });
  };

  const handleGalleryMouseMove = (e: React.MouseEvent) => {
    if (!isSelecting || !selectionBox) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setSelectionBox(prev => prev ? ({
      ...prev,
      x2: e.clientX - rect.left,
      y2: e.clientY - rect.top
    }) : null);
  };

  const handleGalleryMouseUp = () => {
    if (!isSelecting || !selectionBox) {
      setIsSelecting(false);
      setSelectionBox(null);
      return;
    }

    const galleryItems = document.querySelectorAll('[data-gallery-item]');
    const newSelectedIds = [...selectedCaptureIds];

    galleryItems.forEach(item => {
      const id = item.getAttribute('data-id');
      if (!id) return;

      const rect = item.getBoundingClientRect();
      const parentRect = item.parentElement?.parentElement?.getBoundingClientRect();
      if (!parentRect) return;

      const itemLeft = rect.left - parentRect.left;
      const itemTop = rect.top - parentRect.top;
      const itemRight = itemLeft + rect.width;
      const itemBottom = itemTop + rect.height;

      const boxLeft = Math.min(selectionBox.x1, selectionBox.x2);
      const boxRight = Math.max(selectionBox.x1, selectionBox.x2);
      const boxTop = Math.min(selectionBox.y1, selectionBox.y2);
      const boxBottom = Math.max(selectionBox.y1, selectionBox.y2);

      const isInside = (
        itemLeft < boxRight &&
        itemRight > boxLeft &&
        itemTop < boxBottom &&
        itemBottom > boxTop
      );

      if (isInside) {
        if (!newSelectedIds.includes(id)) {
          newSelectedIds.push(id);
        }
      }
    });

    setSelectedCaptureIds(newSelectedIds);
    setIsSelecting(false);
    setSelectionBox(null);
  };

  // ── Recording timer ─────────────────────────────────────────────────────────
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      onRecordingStatusChange?.(true);
    } else {
      setRecordingTime(0);
      onRecordingStatusChange?.(false);
    }
    return () => clearInterval(interval);
  }, [isRecording, onRecordingStatusChange]);

  // ── Fullscreen ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── Inisialisasi kamera (mount saja, stop hanya saat unmount) ───────────────
  // Dipisah dari keyboard handler supaya stopCamera() TIDAK dipanggil
  // setiap isRecording berubah — penyebab layar blank setelah stop recording.
  useEffect(() => {
    getDevices();
    return () => {
      // Langsung akses streamRef — selalu nilai terkini, bebas stale closure
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      // Cleanup recording buffer ref agar next session tidak append ke stale ID
      currentRecordingIdRef.current = null;
      chunkIndexRef.current = 0;
      // Revoke semua blob URL video untuk mencegah memory leak
      capturesRef.current.forEach(c => {
        if (c.type === 'video' && c.url.startsWith('blob:')) {
          URL.revokeObjectURL(c.url);
        }
      });
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Keyboard shortcuts (Space = foto, R = rekam) ────────────────────────────
  // Dipisah agar bisa re-register closure isRecording tanpa menyentuh kamera.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleCapturePhoto();
      } else if (e.code === 'KeyR') {
        e.preventDefault();
        if (isRecording) {
          handleStopRecording();
        } else {
          handleStartRecording();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording]);

  useEffect(() => {
    if (selectedDeviceId) {
      startCamera(selectedDeviceId, selectedResolution);
    }
  }, [selectedDeviceId, selectedResolution]);

  // ── Recovery: pulihkan video yang tidak selesai direkam saat force exit ─────
  useEffect(() => {
    const recoverPendingVideos = async () => {
      const pending = await getPendingRecordings(userId);
      if (pending.length === 0) return;

      const recoveredCaptures: Capture[] = pending.map((rv) => ({
        id: `vid_recovered_${rv.recordingId}`,
        type: 'video' as const,
        url: URL.createObjectURL(rv.blob),
        timestamp: new Date(rv.startedAt),
        caption: '(dipulihkan setelah restart)',
      }));

      setCaptures((prev) => [...recoveredCaptures, ...prev]);

      for (const rv of pending) {
        await clearBuffer(rv.recordingId);
      }

      console.log(`[EndoscopyApp] ${pending.length} video dipulihkan dari buffer`);
    };

    recoverPendingVideos();
  }, [userId]);

  // ── Electron: init session folder di disk saat masuk live view ──────────────
  useEffect(() => {
    if (isElectron()) {
      initSessionOnDisk(activeSessionIdRef.current, patientData);
    }
  }, []); // Hanya sekali saat mount

  // ── Auto-save draft ke IndexedDB setiap ada media baru ─────────────────────
  // Foto langsung tersimpan saat diambil.
  // Video tersimpan setelah recording di-stop (bukan saat masih berjalan).
  useEffect(() => {
    if (captures.length === 0) return;
    saveDraftSession(userId, patientData, captures);

    // Electron: update metadata di disk juga (capture list tanpa binary)
    if (isElectron()) {
      updateSessionMeta(activeSessionIdRef.current, patientData, captures, 'active');
    }
  }, [captures]);

  // ── Detect available drives (Electron/Node) ────────────────────────────────
  useEffect(() => {
    const detectDrives = async () => {
      try {
        // Electron: gunakan Node.js child_process untuk deteksi drive
        const { execSync } = (window as any).require?.('child_process') || {};
        if (execSync) {
          // Windows: wmic
          const output = execSync('wmic logicaldisk get name,volumename', { encoding: 'utf-8' });
          const lines = output.split('\n').filter((l: string) => l.trim() && !l.includes('Name'));
          const drives = lines.map((l: string) => {
            const parts = l.trim().split(/\s+/);
            const letter = parts[0] || '';
            const label = parts.slice(1).join(' ') || 'Local Disk';
            return { letter, label: `${label} (${letter})` };
          }).filter((d: any) => d.letter);
          if (drives.length > 0) {
            setAvailableDrives(drives);
            setSelectedDrive(drives.length > 1 ? drives[1].letter : drives[0].letter);
            return;
          }
        }
      } catch {}
      // Fallback: default drives
      setAvailableDrives([
        { letter: 'C:', label: 'Local Disk (C:)' },
        { letter: 'D:', label: 'Data Storage (D:)' },
      ]);
      setSelectedDrive('D:');
    };
    detectDrives();
  }, []);

  // ── Camera ──────────────────────────────────────────────────────────────────
  const getDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true });
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
      if (videoDevices.length > 0 && !selectedDeviceId) {
        setSelectedDeviceId(videoDevices[0].deviceId);
      }
    } catch (err) {
      console.error("Error getting devices:", err);
      setError("Tidak dapat mengakses daftar kamera.");
    }
  };

  const startCamera = async (deviceId: string, resolution: '480p' | '720p' | '1080p' | '4K' = '1080p') => {
    stopCamera();

    // 16:10 aspect ratio
    const resolutionMap = {
      '480p': { width: 768, height: 480 },
      '720p': { width: 1152, height: 720 },
      '1080p': { width: 1728, height: 1080 },
      '4K': { width: 3456, height: 2160 }
    };

    const targetRes = resolutionMap[resolution];

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: targetRes.width },
          height: { ideal: targetRes.height },
          frameRate: { ideal: 30 }
        },
        audio: false, // Microphone tidak diperlukan untuk dokumentasi endoskopi
      });

      streamRef.current = mediaStream;
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err: any) {
      console.error("Error accessing camera:", err);
      setError("Tidak dapat mengakses kamera yang dipilih.");
    }
  };

  const stopCamera = () => {
    // Pakai streamRef (bukan stream state) agar selalu dapat nilai terkini
    // bahkan dari dalam useEffect cleanup yang punya closure lama
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
  };

  // ── Capture foto ────────────────────────────────────────────────────────────
  const handleCapturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (isFlipped) {
          ctx.save();
          ctx.scale(-1, 1);
          ctx.translate(-canvas.width, 0);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          ctx.restore();
        } else {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        const imageUrl = canvas.toDataURL('image/jpeg', 0.92);

        const newCapture: Capture = {
          id: `img_${Date.now()}`,
          type: 'image',
          url: imageUrl,
          timestamp: new Date()
        };

        setCaptures(prev => [newCapture, ...prev]);

        // Electron: simpan foto ke disk encrypted (non-blocking)
        if (isElectron()) {
          saveCaptureRealtime(activeSessionIdRef.current, newCapture);
        }

        setIsFlashActive(true);
        setTimeout(() => setIsFlashActive(false), 150);

        setShowCaptureNotification(true);
        setTimeout(() => setShowCaptureNotification(false), 2000);
      }
    }
  }, [stream, isFullscreen, isFlipped]);

  // ── Recording ────────────────────────────────────────────────────────────────
  // Menggunakan IndexedDB sebagai buffer real-time.
  // Setiap 5 detik (CHUNK_INTERVAL_MS), chunk ditulis ke disk.
  // Jika force exit terjadi, video dapat dipulihkan saat app dibuka kembali.
  const handleStartRecording = useCallback(() => {
    if (stream) {
      const mimeTypes = [
        'video/mp4;codecs=hvc1',
        'video/mp4;codecs=avc1',
        'video/mp4',
        'video/webm;codecs=hvc1',
        'video/webm;codecs=vp9',
        'video/webm'
      ];

      const selectedMimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || 'video/webm';

      // Bitrate dinamis berdasarkan resolusi
      const bitrateMap: Record<string, number> = {
        '480p': 1500000,
        '720p': 2500000,
        '1080p': 4000000,
        '4K': 8000000,
      };
      const currentBitrate = bitrateMap[selectedResolution] || 4000000;

      const recorder = new MediaRecorder(stream, { 
        mimeType: selectedMimeType,
        videoBitsPerSecond: currentBitrate
      });

      const recordingId =
        crypto.randomUUID?.() ||
        `rec_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      currentRecordingIdRef.current = recordingId;
      chunkIndexRef.current = 0;

      // Inisialisasi slot buffer di IndexedDB
      startRecordingBuffer(recordingId, userId, selectedMimeType);

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          // Simpan ke IndexedDB saja (tidak ke RAM) untuk efisiensi memori
          appendChunk(recordingId, chunkIndexRef.current, e.data);
          chunkIndexRef.current += 1;
        }
      };

      recorder.onstop = async () => {
        // Reconstruct video dari IndexedDB
        const blob = await reconstructVideo(recordingId);

        if (blob && blob.size > 0) {
          const videoUrl = URL.createObjectURL(blob);

          // Generate thumbnail dari frame pertama video
          let thumbnail: string | undefined;
          try {
            thumbnail = await new Promise<string | undefined>((resolve) => {
              const tempVid = document.createElement('video');
              tempVid.muted = true;
              tempVid.playsInline = true;
              tempVid.preload = 'auto';

              const timeout = setTimeout(() => resolve(undefined), 5000);

              tempVid.addEventListener('loadeddata', () => {
                tempVid.currentTime = 0.1;
              }, { once: true });

              tempVid.addEventListener('seeked', () => {
                clearTimeout(timeout);
                try {
                  const tw = 320;
                  const th = Math.round(tw * (tempVid.videoHeight / (tempVid.videoWidth || 1)));
                  const tCanvas = document.createElement('canvas');
                  tCanvas.width = tw;
                  tCanvas.height = th || 200;
                  const tCtx = tCanvas.getContext('2d');
                  if (tCtx) {
                    tCtx.drawImage(tempVid, 0, 0, tCanvas.width, tCanvas.height);
                    resolve(tCanvas.toDataURL('image/jpeg', 0.7));
                  } else {
                    resolve(undefined);
                  }
                } catch { resolve(undefined); }
              }, { once: true });

              tempVid.addEventListener('error', () => {
                clearTimeout(timeout);
                resolve(undefined);
              }, { once: true });

              tempVid.src = videoUrl;
              tempVid.load();
            });
          } catch {
            // Thumbnail gagal — tidak critical
          }

          const newCapture: Capture = {
            id: `vid_${Date.now()}`,
            type: 'video',
            url: videoUrl,
            thumbnail,
            timestamp: new Date(),
            flipped: isFlipped,
          };

          // Electron: simpan video ke disk encrypted (non-blocking)
          if (isElectron()) {
            saveCaptureRealtime(activeSessionIdRef.current, newCapture);
          }

          setCaptures(prev => {
            const updated = [newCapture, ...prev];

            // Jika ini dipicu oleh force exit (pendingForceEndRef = true)
            if (pendingForceEndRef.current) {
              pendingForceEndRef.current = false;
              const sessionId = activeSessionIdRef.current;
              const session: Session = {
                id: sessionId,
                date: new Date(),
                patient: patientData,
                captures: updated,
                status: 'completed',
              };
              clearDraftSession(userId);
              // Electron: finalize metadata (binary sudah di disk)
              finalizeSessionOnDisk(sessionId, patientData, updated);
              onEndSession(session);
            }

            return updated;
          });
        }

        // Hapus buffer dari disk — tidak perlu lagi
        clearBuffer(recordingId);
        currentRecordingIdRef.current = null;
        chunkIndexRef.current = 0;
      };

      // KUNCI: timeslice 5000ms → ondataavailable dipanggil setiap 5 detik
      recorder.start(CHUNK_INTERVAL_MS);
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordedChunks([]);
    }
  }, [stream, userId, patientData, onEndSession, isFlipped, selectedResolution]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }, [mediaRecorder, isRecording]);

  // ── Download ────────────────────────────────────────────────────────────────
  const downloadMedia = (url: string, type: 'image' | 'video', customName?: string) => {
    const a = document.createElement('a');
    a.href = url;
    let extension = type === 'image' ? 'jpg' : 'mp4';
    a.download = customName || `endo_capture_${new Date().getTime()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllMedia = () => {
    if (captures.length === 0) return;
    captures.forEach((capture, index) => {
      setTimeout(() => {
        downloadMedia(capture.url, capture.type, `endo_${patientData.rmNumber}_${index + 1}.${capture.type === 'image' ? 'jpg' : 'mp4'}`);
      }, index * 300);
    });
  };

  // ── Finish session ──────────────────────────────────────────────────────────
  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);

  const calculateEstimatedSize = (seconds: number) => {
    // Bitrate dinamis berdasarkan resolusi aktual
    const bitrateMap: Record<string, number> = {
      '480p': 1.5,
      '720p': 2.5,
      '1080p': 4.0,
      '4K': 8.0,
    };
    const bitrateMbps = bitrateMap[selectedResolution] || 4.0;
    const sizeMB = (bitrateMbps * seconds) / 8;
    if (sizeMB < 1) return `${(sizeMB * 1024).toFixed(1)} KB`;
    if (sizeMB >= 1024) return `${(sizeMB / 1024).toFixed(1)} GB`;
    return `${sizeMB.toFixed(1)} MB`;
  };

  const [showEmptySessionWarning, setShowEmptySessionWarning] = useState(false);

  const handleFinishSession = () => {
    if (captures.length === 0) {
      setShowEmptySessionWarning(true);
      return;
    }
    setShowFinishConfirmation(true);
  };

  const confirmFinishSession = () => {
    try {
      if (isRecording && mediaRecorder) {
        // Recording aktif → tunggu video selesai diproses dulu
        pendingForceEndRef.current = true;
        mediaRecorder.stop();
        setIsRecording(false);
        setRecordingTime(0);
        setShowFinishConfirmation(false);
        return;
      }

      const sessionId = activeSessionIdRef.current;
      const session: Session = {
        id: sessionId,
        date: new Date(),
        patient: patientData,
        captures: captures,
        status: 'completed'
      };

      // Hapus draft — sesi selesai secara normal
      clearDraftSession(userId);

      // Electron: finalize metadata (binary sudah di disk dari real-time save)
      finalizeSessionOnDisk(sessionId, patientData, captures);

      onEndSession(session);
      setShowFinishConfirmation(false);
    } catch (err) {
      console.error("Error finishing session:", err);
      setShowFinishConfirmation(false);
    }
  };

  // ── Force end (dipanggil saat user keluar via nav guard) ────────────────────
  // Stop recording jika aktif + simpan semua captures ke session
  useEffect(() => {
    const forceEnd = () => {
      if (isRecording && mediaRecorder) {
        // Recording aktif → tandai pending, stop recording
        // Session akan disave di recorder.onstop setelah video selesai diproses
        pendingForceEndRef.current = true;
        mediaRecorder.stop();
        setIsRecording(false);
        setRecordingTime(0);
      } else {
        // Tidak recording → langsung buat session dari captures yang ada
        const sessionId = activeSessionIdRef.current;
        const session: Session = {
          id: sessionId,
          date: new Date(),
          patient: patientData,
          captures: captures,
          status: 'completed',
        };
        clearDraftSession(userId);
        // Electron: finalize metadata (binary sudah di disk)
        finalizeSessionOnDisk(sessionId, patientData, captures);
        onEndSession(session);
      }
    };
    onRegisterForceEnd?.(forceEnd);
  }, [isRecording, mediaRecorder, captures, patientData, onEndSession, onRegisterForceEnd, userId]);

  const galleryPhotos = captures.filter(c => c.type === 'image');
  const galleryVideos = captures.filter(c => c.type === 'video');

  const selectStyle: React.CSSProperties = {
    backgroundColor: 'transparent', fontSize: 11, color: '#475569', fontWeight: 700,
    border: 'none', outline: 'none', appearance: 'none' as const, cursor: 'pointer',
    paddingRight: 24, fontFamily: FONT, width: '100%',
  };

  const tabLabels: Record<string, string> = { photos: 'Foto', videos: 'Video', settings: 'Settings' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F4F6F8', overflow: 'hidden', position: 'relative', fontFamily: FONT }}>
      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #E8ECF1', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, zIndex: 100, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #0C1E35 0%, #152d4f 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#fff', fontSize: 13, fontWeight: 800, fontFamily: FONT }}>{patientData.name?.charAt(0)?.toUpperCase() || 'P'}</span>
          </div>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 800, color: '#0C1E35', letterSpacing: '-0.02em', margin: 0, fontFamily: FONT }}>{patientData.name}</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: '#64748B', fontWeight: 600 }}>{patientData.procedures[0] || 'Prosedur'}</span>
              <span style={{ width: 3, height: 3, borderRadius: '50%', backgroundColor: '#CBD5E1' }} />
              <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>RM: {patientData.rmNumber}</span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #E8ECF1', borderRadius: 10, padding: '6px 12px', position: 'relative', backgroundColor: '#F8FAFC' }}>
            <Maximize style={{ width: 13, height: 13, color: '#94A3B8' }} />
            <select
              value={selectedResolution}
              onChange={(e) => setSelectedResolution(e.target.value as any)}
              style={{ ...selectStyle, maxWidth: 80 }}
            >
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
              <option value="4K">4K</option>
            </select>
            <ChevronDown style={{ width: 12, height: 12, color: '#94A3B8', position: 'absolute', right: 8, pointerEvents: 'none' }} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #E8ECF1', borderRadius: 10, padding: '6px 12px', position: 'relative', maxWidth: 200, backgroundColor: '#F8FAFC' }}>
            <Camera style={{ width: 13, height: 13, color: '#94A3B8', flexShrink: 0 }} />
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              style={{ ...selectStyle, maxWidth: 140 }}
            >
              {devices.length === 0 ? (
                <option value="" disabled>Tidak ada kamera</option>
              ) : devices.map(device => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${device.deviceId.substring(0, 5)}...`}
                </option>
              ))}
            </select>
            <ChevronDown style={{ width: 12, height: 12, color: '#94A3B8', position: 'absolute', right: 8, pointerEvents: 'none' }} />
          </div>

          <button
            onClick={handleFinishSession}
            style={{
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 18px',
              backgroundColor: '#fff', color: '#DC2626', border: '1.5px solid #FECACA',
              borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              transition: 'all 150ms', fontFamily: FONT,
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
          >
            <CheckCircle2 style={{ width: 15, height: 15 }} />
            Selesaikan Sesi
          </button>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 10 }}>
        <div ref={containerRef} style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', backgroundColor: '#0f1623', margin: isFullscreen ? 0 : '12px 0 12px 16px', borderRadius: isFullscreen ? 0 : 16, overflow: 'hidden', boxShadow: isFullscreen ? 'none' : '0 4px 24px rgba(0,0,0,0.15)', ...(isFullscreen ? { width: '100vw', height: '100vh' } : {}) }}>
          {error && (
            <div style={{
              position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)', zIndex: 20,
              backgroundColor: '#DC2626', color: '#fff', padding: '10px 20px', borderRadius: 12,
              boxShadow: '0 8px 24px rgba(220,38,38,0.3)', display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 12, fontWeight: 700,
            }}>
              <AlertCircle style={{ width: 16, height: 16 }} />
              {error}
            </div>
          )}

          <div style={{ flex: 1, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%', height: '100%', objectFit: 'contain',
                transition: 'all 300ms',
                filter: `brightness(${imageSettings.brightness}%) contrast(${imageSettings.contrast}%) saturate(${imageSettings.saturation}%) hue-rotate(${imageSettings.whiteBalance}deg)`,
                transform: isFlipped ? 'scaleX(-1)' : 'none',
              }}
            />

            <AnimatePresence>
              {isFlashActive && (
                <motion.div
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  style={{ position: 'absolute', inset: 0, backgroundColor: '#fff', zIndex: 60, pointerEvents: 'none' }}
                />
              )}
            </AnimatePresence>

            <div style={{ position: 'absolute', top: 12, left: 12, padding: '4px 10px', backgroundColor: 'rgba(0,0,0,0.5)', color: '#fff', borderRadius: 8, fontSize: 11, fontWeight: 700, zIndex: 10 }}>
              {selectedResolution}
            </div>

            {isRecording && (
              <div style={{
                position: 'absolute', top: 12, right: 12,
                backgroundColor: '#fff', borderRadius: 20, padding: '10px 20px',
                display: 'flex', alignItems: 'center', gap: 10, zIndex: 50,
                boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#DC2626', display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>REC</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#0C1E35', fontFamily: 'monospace' }}>{formatTime(recordingTime)}</span>
              </div>
            )}

            <AnimatePresence>
              {showCaptureNotification && (
                <motion.div
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  style={{
                    position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                    backgroundColor: '#059669', color: '#fff', padding: '10px 20px', borderRadius: 16,
                    display: 'flex', alignItems: 'center', gap: 10, zIndex: 70,
                    boxShadow: '0 8px 24px rgba(5,150,105,0.3)',
                  }}
                >
                  <Camera style={{ width: 16, height: 16 }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>Foto berhasil disimpan</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div style={{ position: 'absolute', bottom: isFullscreen ? 80 : 12, left: 16, display: 'flex', gap: 8, opacity: 0.5, pointerEvents: 'none', transition: 'bottom 200ms' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <kbd style={{ fontFamily: 'monospace', backgroundColor: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>Space</kbd> Foto
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <kbd style={{ fontFamily: 'monospace', backgroundColor: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>R</kbd> Rekam
              </div>
            </div>

            {/* Fullscreen: overlay controls */}
            {isFullscreen && (
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 80,
                background: 'linear-gradient(transparent, rgba(0,0,0,0.7))',
                padding: '40px 24px 16px',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20,
              }}>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={() => setIsFlipped(!isFlipped)}
                  style={{ padding: 10, borderRadius: 10, backgroundColor: isFlipped ? 'rgba(13,148,136,0.3)' : 'rgba(255,255,255,0.15)', border: isFlipped ? '1px solid rgba(13,148,136,0.5)' : '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FlipHorizontal2 style={{ width: 18, height: 18 }} />
                </motion.button>
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={handleCapturePhoto}
                  style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, #0C1E35 0%, #152d4f 100%)', border: '3px solid rgba(255,255,255,0.3)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 20px rgba(0,0,0,0.4)' }}>
                  <Camera style={{ width: 24, height: 24 }} />
                </motion.button>
                <motion.button whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.92 }}
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#DC2626', border: isRecording ? '3px solid #991B1B' : '3px solid rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: isRecording ? '0 0 20px rgba(220,38,38,0.5)' : '0 4px 16px rgba(220,38,38,0.3)' }}>
                  {isRecording ? <Square style={{ width: 16, height: 16, color: '#fff', fill: '#fff' }} /> : <div style={{ width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff' }} />}
                </motion.button>
                <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                  onClick={toggleFullscreen}
                  style={{ padding: 10, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Minimize style={{ width: 18, height: 18 }} />
                </motion.button>
              </div>
            )}
          </div>
        </div>

        <div style={{ width: 380, backgroundColor: '#fff', borderLeft: '1px solid #E8ECF1', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
          <div style={{ padding: 14, margin: '12px 14px', backgroundColor: '#F8FAFC', border: '1px solid #E8ECF1', borderRadius: 14, flexShrink: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: isSessionInfoCollapsed ? 0 : 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, backgroundColor: '#EFF6FF', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Info style={{ width: 18, height: 18, color: '#3B82F6' }} />
                </div>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Informasi Sesi</p>
                  <p style={{ fontSize: 14, fontWeight: 800, color: '#0C1E35' }}>Detail Klinis</p>
                </div>
              </div>
              <button
                onClick={() => setIsSessionInfoCollapsed(!isSessionInfoCollapsed)}
                style={{ width: 28, height: 28, backgroundColor: '#fff', border: '1px solid #E8ECF1', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background-color 150ms' }}
              >
                <ChevronDown style={{ width: 14, height: 14, color: '#94A3B8', transition: 'transform 300ms', transform: isSessionInfoCollapsed ? 'rotate(180deg)' : 'none' }} />
              </button>
            </div>

            <AnimatePresence initial={false}>
              {!isSessionInfoCollapsed && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '12px 0 4px' }}>
                    {[
                      { label: 'Waktu', value: `${new Date().toLocaleDateString('id-ID')} • ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}` },
                      { label: 'Prosedur', value: patientData.procedures[0] || '-' },
                      { label: 'Diagnosis', value: patientData.diagnosis || '-' },
                    ].map((row, ri) => (
                      <div key={ri}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>{row.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0C1E35', textAlign: 'right', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.value}</span>
                        </div>
                        {ri < 2 && <div style={{ height: 1, backgroundColor: '#E8ECF1', margin: '8px 0' }} />}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ display: 'flex', borderBottom: '1.5px solid #E8ECF1', marginLeft: 14, marginRight: 14, flexShrink: 0 }}>
            {(['photos', 'videos', 'settings'] as const).map(tab => {
              const count = tab === 'photos' ? galleryPhotos.length : tab === 'videos' ? galleryVideos.length : 0;
              const isActive = activeGalleryTab === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveGalleryTab(tab)}
                  style={{
                    flex: 1, padding: '10px 0 8px', fontSize: 12, fontWeight: isActive ? 700 : 500,
                    border: 'none', borderBottom: isActive ? '2px solid #0D9488' : '2px solid transparent',
                    cursor: 'pointer', backgroundColor: 'transparent',
                    color: isActive ? '#0C1E35' : '#94A3B8',
                    transition: 'all 150ms', fontFamily: FONT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
                    marginBottom: '-1.5px',
                  }}
                >
                  {tabLabels[tab]}
                  {tab !== 'settings' && (
                    <span style={{ fontSize: 9, fontWeight: 700, backgroundColor: isActive ? '#E6F7F5' : '#F1F5F9', color: isActive ? '#0D9488' : '#94A3B8', padding: '1px 6px', borderRadius: 8 }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ padding: '0 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                {activeGalleryTab === 'settings' ? 'Pengaturan' : `Galeri ${tabLabels[activeGalleryTab]}`}
              </p>
              {activeGalleryTab !== 'settings' && (
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                  {captures.filter(c => activeGalleryTab === 'photos' ? c.type === 'image' : c.type === 'video').length} item
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {activeGalleryTab !== 'settings' && captures.length > 0 && (
                <button
                  onClick={downloadAllMedia}
                  title="Simpan Semua"
                  style={{ padding: 8, backgroundColor: '#F8FAFC', color: '#94A3B8', border: '1px solid #E8ECF1', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 150ms' }}
                  onMouseEnter={e => { e.currentTarget.style.color = '#0C1E35'; }}
                  onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; }}
                >
                  <Download style={{ width: 16, height: 16 }} />
                </button>
              )}
            </div>
          </div>

          <div
            className="custom-scrollbar"
            style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', position: 'relative', userSelect: 'none' }}
>

            {activeGalleryTab === 'settings' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Info style={{ width: 14, height: 14, color: '#3B82F6' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spesifikasi Video</span>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, border: '1px solid #E8ECF1', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Format', value: 'MP4 (H.265 HEVC)' },
                      { label: 'Bitrate', value: ({ '480p': '1.5', '720p': '2.5', '1080p': '4.0', '4K': '8.0' } as Record<string, string>)[selectedResolution] + ' Mbps' },
                      { label: 'Resolusi', value: selectedResolution, accent: true },
                    ].map((row, ri) => (
                      <div key={ri}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>{row.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: row.accent ? '#3B82F6' : '#0C1E35' }}>{row.value}</span>
                        </div>
                        {ri < 2 && <div style={{ height: 1, backgroundColor: '#E8ECF1', marginTop: 10 }} />}
                      </div>
                    ))}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>Estimasi Ukuran</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6' }}>~{calculateEstimatedSize(60)}/menit</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        {[15, 30, 60].map(m => (
                          <div key={m} style={{ padding: 8, backgroundColor: '#fff', borderRadius: 10, border: '1px solid #E8ECF1', textAlign: 'center' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', marginBottom: 2 }}>{m}m</div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#0C1E35' }}>{calculateEstimatedSize(m * 60)}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <HardDrive style={{ width: 14, height: 14, color: '#6366F1' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Lokasi Penyimpanan</span>
                  </div>
                  <div style={{ position: 'relative', backgroundColor: '#F8FAFC', borderRadius: 12, border: '1px solid #E8ECF1', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <HardDrive style={{ width: 14, height: 14, color: '#94A3B8', flexShrink: 0 }} />
                    <select
                      value={selectedDrive}
                      onChange={(e) => setSelectedDrive(e.target.value)}
                      style={{ ...selectStyle, fontSize: 13 }}
                    >
                      {availableDrives.map(d => (
                        <option key={d.letter} value={d.letter}>{d.label}</option>
                      ))}
                    </select>
                    <ChevronDown style={{ width: 12, height: 12, color: '#94A3B8', position: 'absolute', right: 12, pointerEvents: 'none' }} />
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, border: '1px solid #E8ECF1' }}>
                    <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#94A3B8', wordBreak: 'break-all', lineHeight: 1.5 }}>
                      {selectedDrive}/Aexon/Exports/{new Date().getFullYear()}/{patientData.rmNumber}/
                    </p>
                  </div>
                </div>

                <DiskSpaceIndicator />

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                    <Sliders style={{ width: 14, height: 14, color: '#059669' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Penyesuaian Gambar</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {[
                      { label: 'Brightness', key: 'brightness', min: 50, max: 150 },
                      { label: 'Contrast', key: 'contrast', min: 50, max: 150 },
                      { label: 'Saturation', key: 'saturation', min: 50, max: 150 },
                      { label: 'White Balance', key: 'whiteBalance', min: -180, max: 180 },
                    ].map((adj) => (
                      <div key={adj.key}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <label style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>{adj.label}</label>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0C1E35' }}>{(imageSettings as any)[adj.key]}{adj.key !== 'whiteBalance' ? '%' : '°'}</span>
                        </div>
                        <input
                          type="range" min={adj.min} max={adj.max} value={(imageSettings as any)[adj.key]}
                          onChange={(e) => setImageSettings(prev => ({ ...prev, [adj.key]: parseInt(e.target.value) }))}
                          style={{ width: '100%', height: 4, borderRadius: 4, cursor: 'pointer', accentColor: '#0C1E35' }}
                        />
                      </div>
                    ))}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                      <button
                        onClick={() => setImageSettings({ brightness: 100, contrast: 100, saturation: 100, whiteBalance: 0 })}
                        style={{ width: '100%', padding: '10px 0', backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E8ECF1', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 150ms', fontFamily: FONT }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0C1E35'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.color = '#64748B'; }}
                      >
                        Reset Adjustments
                      </button>
                      <button
                        onClick={() => setImageSettings(prev => ({ ...prev, whiteBalance: 0 }))}
                        style={{ width: '100%', padding: '10px 0', backgroundColor: '#0C1E35', color: '#fff', border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'background-color 150ms', fontFamily: FONT }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
                      >
                        Auto White Balance
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                {captures.filter(c => activeGalleryTab === 'photos' ? c.type === 'image' : c.type === 'video').length === 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, backgroundColor: '#EFF6FF', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                      {activeGalleryTab === 'photos' ? <FileImage style={{ width: 24, height: 24, color: '#94A3B8' }} /> : <FileVideo style={{ width: 24, height: 24, color: '#94A3B8' }} />}
                    </div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8' }}>Belum ada {tabLabels[activeGalleryTab].toLowerCase()}</p>
                  </div>
                ) : (
                  captures
                    .filter(c => activeGalleryTab === 'photos' ? c.type === 'image' : c.type === 'video')
                    .map((capture) => {
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={capture.id}
                          style={{
                            backgroundColor: '#fff',
                            borderRadius: 14, overflow: 'hidden',
                            border: '2px solid #E8ECF1',
                            transition: 'all 150ms', cursor: 'pointer',
                          }}
                          onMouseEnter={e => { e.currentTarget.style.borderColor = '#0C1E35'; }}
                          onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8ECF1'; }}
                          onClick={() => setSelectedCaptureForReview(capture)}
                        >
                          <div style={{ aspectRatio: '16/10', backgroundColor: '#F1F5F9', position: 'relative' }}>
                            {capture.type === 'image' ? (
                              <img src={capture.url} alt="Capture" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            ) : (
                              <video src={capture.url} preload="metadata" muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' }} />
                            )}

                            <div
                              style={{
                                position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)',
                                opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                transition: 'opacity 150ms', backdropFilter: 'blur(2px)',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
                            >
                              {capture.type === 'image' && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setEditingCapture(capture); }}
                                  style={{ width: 36, height: 36, backgroundColor: '#0C1E35', border: 'none', borderRadius: 10, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}
                                >
                                  <Edit3 style={{ width: 16, height: 16 }} />
                                </button>
                              )}
                              <button
                                onClick={(e) => { e.stopPropagation(); downloadMedia(capture.url, capture.type); }}
                                title="Simpan"
                                style={{ width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Download style={{ width: 16, height: 16 }} />
                              </button>
                            </div>

                            <div style={{ position: 'absolute', top: 8, left: 8, padding: '3px 8px', borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', gap: 4, backdropFilter: 'blur(4px)' }}>
                              {capture.type === 'image' ? <Camera style={{ width: 12, height: 12, color: '#93C5FD' }} /> : <Video style={{ width: 12, height: 12, color: '#FCA5A5' }} />}
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#fff', textTransform: 'uppercase' }}>{capture.type}</span>
                            </div>
                          </div>

                          <div style={{ padding: '10px 14px', borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                              <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
                                {capture.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </p>
                              {capture.caption && (
                                <p style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600, marginTop: 2 }}>{capture.caption}</p>
                              )}
                            </div>
                            <span style={{ padding: '2px 8px', backgroundColor: '#F8FAFC', color: '#64748B', fontSize: 10, fontWeight: 700, borderRadius: 6, border: '1px solid #E8ECF1' }}>
                              {capture.type === 'image' ? 'JPG' : 'MP4'}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <div style={{ backgroundColor: '#fff', borderTop: '1px solid #E8ECF1', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexShrink: 0 }}>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => setIsFlipped(!isFlipped)}
          title={isFlipped ? 'Flip: Aktif' : 'Flip: Normal'}
          style={{
            padding: 12, borderRadius: 12,
            backgroundColor: isFlipped ? '#E6F7F5' : '#F8FAFC',
            border: isFlipped ? '1.5px solid #0D9488' : '1px solid #E8ECF1',
            color: isFlipped ? '#0D9488' : '#94A3B8',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 150ms',
          }}
        >
          <FlipHorizontal2 style={{ width: 20, height: 20 }} />
        </motion.button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCapturePhoto}
            style={{
              width: 60, height: 60, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0C1E35 0%, #152d4f 100%)', border: 'none', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(12,30,53,0.35)',
              transition: 'all 150ms',
            }}
          >
            <Camera style={{ width: 26, height: 26 }} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            title={isRecording ? 'Stop Recording (R)' : 'Start Recording (R)'}
            style={{
              width: 48, height: 48, borderRadius: '50%',
              backgroundColor: '#DC2626', border: isRecording ? '3px solid #991B1B' : '3px solid #FECACA',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'all 150ms',
              boxShadow: isRecording ? '0 0 20px rgba(220,38,38,0.4)' : '0 4px 16px rgba(220,38,38,0.25)',
            }}
          >
            {isRecording ? (
              <Square style={{ width: 18, height: 18, color: '#fff', fill: '#fff' }} />
            ) : (
              <div style={{ width: 20, height: 20, borderRadius: '50%', backgroundColor: '#fff' }} />
            )}
          </motion.button>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleFullscreen}
          style={{ padding: 12, borderRadius: 12, backgroundColor: '#F8FAFC', border: '1px solid #E8ECF1', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 150ms' }}
        >
          {isFullscreen ? <Minimize style={{ width: 20, height: 20 }} /> : <Maximize style={{ width: 20, height: 20 }} />}
        </motion.button>
      </div>

      <div style={{ textAlign: 'center', padding: '3px 0 6px', backgroundColor: '#fff' }}>
        <p style={{ fontSize: 10, color: '#B0B8C4', fontFamily: FONT }}>
          <kbd style={{ fontFamily: 'monospace', backgroundColor: '#F4F6F8', padding: '1px 6px', borderRadius: 4, fontSize: 10, border: '1px solid #E8ECF1' }}>Space</kbd> Foto &nbsp;&middot;&nbsp;
          <kbd style={{ fontFamily: 'monospace', backgroundColor: '#F4F6F8', padding: '1px 6px', borderRadius: 4, fontSize: 10, border: '1px solid #E8ECF1' }}>R</kbd> Rekam
        </p>
      </div>

      {editingCapture && (
        <ImageEditor
          imageUrl={editingCapture.originalUrl || editingCapture.url}
          initialShapes={editingCapture.shapes}
          onClose={() => setEditingCapture(null)}
          onSave={(editedUrl, shapes) => {
            setCaptures(prev => prev.map(c =>
              c.id === editingCapture.id ? {
                ...c,
                url: editedUrl,
                originalUrl: c.originalUrl || editingCapture.url,
                shapes: shapes
              } : c
            ));
            setEditingCapture(null);
          }}
        />
      )}

      <AnimatePresence>
        {showFinishConfirmation && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)', padding: 24 }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{ backgroundColor: '#fff', borderRadius: 20, padding: 36, maxWidth: 440, width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.15)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(135deg, #0C1E35 0%, #152d4f 60%, #1a3a5f 100%)' }} />
              <div style={{ width: 56, height: 56, backgroundColor: '#EFF6FF', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid #DBEAFE' }}>
                <CheckCircle2 style={{ width: 28, height: 28, color: '#3B82F6' }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0C1E35', marginBottom: 8, fontFamily: FONT }}>Selesaikan Sesi?</h3>
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 28, fontFamily: FONT }}>
                Semua media akan diproses ke dalam laporan medis secara otomatis.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  onClick={() => setShowFinishConfirmation(false)}
                  style={{ padding: '13px 0', backgroundColor: '#F4F6F8', color: '#475569', fontWeight: 700, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'background-color 150ms', fontFamily: FONT }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#E8ECF1'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F4F6F8'; }}
                >
                  Batal
                </button>
                <button
                  onClick={confirmFinishSession}
                  style={{ padding: '13px 0', background: 'linear-gradient(135deg, #0C1E35 0%, #152d4f 100%)', color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', transition: 'opacity 150ms', fontFamily: FONT, boxShadow: '0 4px 16px rgba(12,30,53,0.2)' }}
                >
                  Ya, Selesaikan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEmptySessionWarning && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.4)', backdropFilter: 'blur(8px)', padding: 24 }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              style={{ backgroundColor: '#fff', borderRadius: 20, padding: 36, maxWidth: 440, width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.15)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' }} />
              <div style={{ width: 56, height: 56, backgroundColor: '#FEF3C7', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', border: '1px solid #FDE68A' }}>
                <AlertCircle style={{ width: 28, height: 28, color: '#D97706' }} />
              </div>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: '#0C1E35', marginBottom: 8, fontFamily: FONT }}>Sesi Tanpa Media</h3>
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: 28, fontFamily: FONT }}>
                Sesi ini belum memiliki foto atau video. Yakin ingin menyelesaikan tanpa dokumentasi?
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <button
                  onClick={() => setShowEmptySessionWarning(false)}
                  style={{ padding: '13px 0', backgroundColor: '#F4F6F8', color: '#475569', fontWeight: 700, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: FONT }}
                >
                  Kembali
                </button>
                <button
                  onClick={() => { setShowEmptySessionWarning(false); setShowFinishConfirmation(true); }}
                  style={{ padding: '13px 0', background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)', color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 12, border: 'none', cursor: 'pointer', fontFamily: FONT }}
                >
                  Ya, Selesaikan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <canvas ref={canvasRef} style={{ display: 'none' }} />

      <AnimatePresence>
        {selectedCaptureForReview && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.7)', backdropFilter: 'blur(10px)', padding: 40 }}
            onClick={() => setSelectedCaptureForReview(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              style={{ position: 'relative', maxWidth: 960, width: '100%', backgroundColor: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ aspectRatio: '16/9', backgroundColor: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                {selectedCaptureForReview.type === 'image' ? (
                  <img src={selectedCaptureForReview.url} alt="Review" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                ) : (
                  <video src={selectedCaptureForReview.url} controls autoPlay style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                )}

                <button
                  onClick={() => setSelectedCaptureForReview(null)}
                  style={{ position: 'absolute', top: 16, right: 16, width: 40, height: 40, backgroundColor: 'rgba(0,0,0,0.4)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 12, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', backdropFilter: 'blur(4px)', zIndex: 50 }}
                >
                  <X style={{ width: 20, height: 20 }} />
                </button>
              </div>

              <div style={{ padding: '18px 24px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E8ECF1' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: selectedCaptureForReview.type === 'image' ? '#EFF6FF' : '#FEF2F2',
                    color: selectedCaptureForReview.type === 'image' ? '#3B82F6' : '#DC2626',
                    border: `1px solid ${selectedCaptureForReview.type === 'image' ? '#DBEAFE' : '#FECACA'}`,
                  }}>
                    {selectedCaptureForReview.type === 'image' ? <Camera style={{ width: 20, height: 20 }} /> : <Video style={{ width: 20, height: 20 }} />}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14, fontWeight: 800, color: '#0C1E35', fontFamily: FONT }}>Pratinjau {selectedCaptureForReview.type === 'image' ? 'Foto' : 'Video'}</h4>
                    <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{selectedCaptureForReview.timestamp.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'medium' })}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => downloadMedia(selectedCaptureForReview.url, selectedCaptureForReview.type)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', backgroundColor: '#fff', border: '1px solid #E8ECF1', borderRadius: 10, color: '#475569', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'background-color 150ms', fontFamily: FONT }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
                  >
                    <Download style={{ width: 15, height: 15 }} />
                    Simpan
                  </button>
                  <button
                    onClick={() => setSelectedCaptureForReview(null)}
                    style={{ padding: '10px 22px', background: 'linear-gradient(135deg, #0C1E35 0%, #152d4f 100%)', color: '#fff', border: 'none', borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: FONT }}
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmModal
        isOpen={showDeleteModal}
        onConfirm={confirmDeleteSelected}
        onCancel={() => setShowDeleteModal(false)}
        title="Hapus Item Terpilih?"
        message={`Apakah Anda yakin ingin menghapus ${selectedCaptureIds.length} item terpilih? Tindakan ini tidak dapat dibatalkan.`}
        confirmText="Ya, Hapus"
        cancelText="Batalkan"
        variant="danger"
      />
    </div>
  );
}