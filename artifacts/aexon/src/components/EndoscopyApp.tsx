import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Video, Square, Download, Settings, RefreshCw, AlertCircle, Maximize, Minimize, FileImage, FileVideo, CheckCircle2, ChevronDown, Sliders, HardDrive, Info, X, Trash2, Edit3, MousePointer2 } from 'lucide-react';
import { PatientData, Capture, Session } from '../types';
import ImageEditor from './ImageEditor';
import ConfirmModal from './ConfirmModal';
import { Pattern } from './Logo';

interface EndoscopyAppProps {
  plan: 'subscription' | 'enterprise';
  patientData: PatientData;
  onEndSession: (session: Session) => void;
  onLogout: () => void;
  onRecordingStatusChange?: (isRecording: boolean) => void;
}

export default function EndoscopyApp({ plan, patientData, onEndSession, onLogout, onRecordingStatusChange }: EndoscopyAppProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  
  const [captures, setCaptures] = useState<Capture[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [selectedResolution, setSelectedResolution] = useState<'480p' | '720p' | '1080p' | '4K'>('1080p');
  
  const [selectedDrive, setSelectedDrive] = useState('D:');
  const [activeGalleryTab, setActiveGalleryTab] = useState<'photos' | 'videos' | 'utility'>('photos');
  const [utilitySettings, setUtilitySettings] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    whiteBalance: 0,
  });

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showCaptureNotification, setShowCaptureNotification] = useState(false);
  const [isFlashActive, setIsFlashActive] = useState(false);
  const [selectedCaptureForReview, setSelectedCaptureForReview] = useState<Capture | null>(null);
  const [editingCapture, setEditingCapture] = useState<Capture | null>(null);
  const [selectedCaptureIds, setSelectedCaptureIds] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [isSessionInfoCollapsed, setIsSessionInfoCollapsed] = useState(false);
  const [selectionBox, setSelectionBox] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);

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

  const [showDeleteModal, setShowDeleteModal] = useState(false);

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

  const handleGalleryMouseDown = (e: React.MouseEvent) => {
    if (activeGalleryTab === 'utility') return;
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

  useEffect(() => {
    getDevices();
    
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
      stopCamera();
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isRecording]);

  useEffect(() => {
    if (selectedDeviceId) {
      startCamera(selectedDeviceId, selectedResolution);
    }
  }, [selectedDeviceId, selectedResolution]);

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
    
    const resolutionMap = {
      '480p': { width: 854, height: 480 },
      '720p': { width: 1280, height: 720 },
      '1080p': { width: 1920, height: 1080 },
      '4K': { width: 3840, height: 2160 }
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
        audio: true
      });
      
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
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleCapturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-canvas.width, 0);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        ctx.restore();
        
        const imageUrl = canvas.toDataURL('image/png');
        
        const newCapture: Capture = {
          id: `img_${Date.now()}`,
          type: 'image',
          url: imageUrl,
          timestamp: new Date()
        };
        
        setCaptures(prev => [newCapture, ...prev]);
        
        setIsFlashActive(true);
        setTimeout(() => setIsFlashActive(false), 150);
        
        setShowCaptureNotification(true);
        setTimeout(() => setShowCaptureNotification(false), 2000);
      }
    }
  }, [stream, isFullscreen]);

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
      
      const recorder = new MediaRecorder(stream, { 
        mimeType: selectedMimeType,
        videoBitsPerSecond: 3500000
      });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: selectedMimeType });
        const videoUrl = URL.createObjectURL(blob);
        
        const newCapture: Capture = {
          id: `vid_${Date.now()}`,
          type: 'video',
          url: videoUrl,
          timestamp: new Date()
        };
        
        setCaptures(prev => [newCapture, ...prev]);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordedChunks([]);
    }
  }, [stream]);

  const handleStopRecording = useCallback(() => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  }, [mediaRecorder, isRecording]);

  const downloadMedia = (url: string, type: 'image' | 'video', customName?: string) => {
    const a = document.createElement('a');
    a.href = url;
    
    let extension = type === 'image' ? 'png' : 'mp4';
    if (type === 'video' && url.startsWith('blob:')) {
    }
    
    a.download = customName || `endo_capture_${new Date().getTime()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllMedia = () => {
    if (captures.length === 0) return;
    
    captures.forEach((capture, index) => {
      setTimeout(() => {
        downloadMedia(capture.url, capture.type, `endo_${patientData.rmNumber}_${index + 1}.${capture.type === 'image' ? 'png' : 'webm'}`);
      }, index * 300);
    });
  };

  const [showFinishConfirmation, setShowFinishConfirmation] = useState(false);

  const calculateEstimatedSize = (seconds: number) => {
    const bitrateMbps = 3.5;
    const sizeMB = (bitrateMbps * seconds) / 8;
    if (sizeMB < 1) return `${(sizeMB * 1024).toFixed(1)} KB`;
    return `${sizeMB.toFixed(1)} MB`;
  };

  const handleFinishSession = () => {
    setShowFinishConfirmation(true);
  };

  const confirmFinishSession = () => {
    try {
      if (isRecording) {
        handleStopRecording();
      }
      
      const session: Session = {
        id: `session_${Date.now()}`,
        date: new Date(),
        patient: patientData,
        captures: captures,
        status: 'completed'
      };
      
      onEndSession(session);
      setShowFinishConfirmation(false);
    } catch (err) {
      console.error("Error finishing session:", err);
      setShowFinishConfirmation(false);
    }
  };

  const galleryPhotos = captures.filter(c => c.type === 'image');
  const galleryVideos = captures.filter(c => c.type === 'video');

  const selectStyle: React.CSSProperties = {
    backgroundColor: 'transparent', fontSize: 11, color: '#475569', fontWeight: 700,
    border: 'none', outline: 'none', appearance: 'none' as const, cursor: 'pointer',
    paddingRight: 24, fontFamily: 'Outfit, sans-serif', width: '100%',
  };

  const tabLabels: Record<string, string> = { photos: 'Foto', videos: 'Video', utility: 'Utility' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', backgroundColor: '#F8FAFC', overflow: 'hidden', position: 'relative', fontFamily: 'Outfit, sans-serif' }}>
      <header style={{ backgroundColor: '#fff', borderBottom: '1px solid #E2E8F0', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, zIndex: 100, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h1 style={{ fontSize: 18, fontWeight: 800, color: '#0C1E35', letterSpacing: '-0.02em' }}>{patientData.name}</h1>
          <span style={{ padding: '4px 12px', backgroundColor: '#EFF6FF', color: '#0C1E35', fontSize: 11, fontWeight: 700, borderRadius: 8, border: '1px solid #DBEAFE' }}>
            {patientData.procedures[0] || 'Prosedur'}
          </span>
          <span style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600 }}>RM: {patientData.rmNumber}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #E2E8F0', borderRadius: 10, padding: '4px 12px', position: 'relative' }}>
            <Maximize style={{ width: 14, height: 14, color: '#94A3B8' }} />
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

          <div style={{ display: 'flex', alignItems: 'center', gap: 4, border: '1px solid #E2E8F0', borderRadius: 10, padding: '4px 12px', position: 'relative', maxWidth: 200 }}>
            <Camera style={{ width: 14, height: 14, color: '#94A3B8', flexShrink: 0 }} />
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              style={{ ...selectStyle, maxWidth: 140 }}
            >
              {devices.map(device => (
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
              display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px',
              backgroundColor: '#fff', color: '#DC2626', border: '1px solid #FECACA',
              borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer',
              transition: 'all 150ms', fontFamily: 'Outfit, sans-serif',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#FEF2F2'; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
          >
            <CheckCircle2 style={{ width: 16, height: 16 }} />
            Selesaikan Sesi
          </button>
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative', zIndex: 10 }}>
        <div ref={containerRef} style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', backgroundColor: '#1a1a2e', margin: '16px 0 16px 24px', borderRadius: 20, overflow: 'hidden' }}>
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
                filter: `brightness(${utilitySettings.brightness}%) contrast(${utilitySettings.contrast}%) saturate(${utilitySettings.saturation}%) hue-rotate(${utilitySettings.whiteBalance}deg)`,
                transform: 'scaleX(-1)',
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

            <div style={{ position: 'absolute', bottom: 12, left: 16, display: 'flex', gap: 8, opacity: 0.5, pointerEvents: 'none' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <kbd style={{ fontFamily: 'monospace', backgroundColor: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>Space</kbd> Foto
              </div>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#fff', backgroundColor: 'rgba(255,255,255,0.1)', padding: '4px 10px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                <kbd style={{ fontFamily: 'monospace', backgroundColor: 'rgba(255,255,255,0.2)', padding: '1px 6px', borderRadius: 4, fontSize: 10 }}>R</kbd> Rekam
              </div>
            </div>
          </div>
        </div>

        <div style={{ width: 384, backgroundColor: '#fff', borderLeft: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
          <div style={{ padding: 16, margin: 16, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, flexShrink: 0 }}>
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
                style={{ width: 28, height: 28, backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'background-color 150ms' }}
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
                        {ri < 2 && <div style={{ height: 1, backgroundColor: '#E2E8F0', margin: '8px 0' }} />}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexShrink: 0, backgroundColor: '#F1F5F9', borderRadius: 12, marginLeft: 16, marginRight: 16, padding: 4 }}>
            {(['photos', 'videos', 'utility'] as const).map(tab => {
              const count = tab === 'photos' ? galleryPhotos.length : tab === 'videos' ? galleryVideos.length : 0;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveGalleryTab(tab)}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: 12, fontWeight: activeGalleryTab === tab ? 700 : 500,
                    borderRadius: 8, border: 'none', cursor: 'pointer',
                    backgroundColor: activeGalleryTab === tab ? '#fff' : 'transparent',
                    color: activeGalleryTab === tab ? '#0C1E35' : '#94A3B8',
                    boxShadow: activeGalleryTab === tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                    transition: 'all 150ms', fontFamily: 'Outfit, sans-serif',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  {tabLabels[tab]}
                  {tab !== 'utility' && (
                    <span style={{ fontSize: 9, fontWeight: 700, backgroundColor: activeGalleryTab === tab ? '#EFF6FF' : '#E2E8F0', color: activeGalleryTab === tab ? '#0C1E35' : '#94A3B8', padding: '1px 6px', borderRadius: 8 }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ padding: '0 16px 8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
                {activeGalleryTab === 'utility' ? 'Pengaturan' : `Galeri ${tabLabels[activeGalleryTab]}`}
              </p>
              {activeGalleryTab !== 'utility' && (
                <p style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
                  {captures.filter(c => activeGalleryTab === 'photos' ? c.type === 'image' : c.type === 'video').length} item
                  {selectedCaptureIds.length > 0 && ` • ${selectedCaptureIds.length} dipilih`}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {selectedCaptureIds.length > 0 ? (
                <button
                  onClick={handleDeleteSelected}
                  style={{ padding: 8, backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Trash2 style={{ width: 16, height: 16 }} />
                </button>
              ) : (
                activeGalleryTab !== 'utility' && captures.length > 0 && (
                  <button
                    onClick={downloadAllMedia}
                    style={{ padding: 8, backgroundColor: '#F8FAFC', color: '#94A3B8', border: '1px solid #E2E8F0', borderRadius: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 150ms' }}
                    onMouseEnter={e => { e.currentTarget.style.color = '#0C1E35'; }}
                    onMouseLeave={e => { e.currentTarget.style.color = '#94A3B8'; }}
                  >
                    <Download style={{ width: 16, height: 16 }} />
                  </button>
                )
              )}
            </div>
          </div>

          <div
            className="custom-scrollbar"
            style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', position: 'relative', userSelect: 'none' }}
            onMouseDown={handleGalleryMouseDown}
            onMouseMove={handleGalleryMouseMove}
            onMouseUp={handleGalleryMouseUp}
          >
            {selectionBox && (
              <div
                style={{
                  position: 'absolute', border: '2px solid #3B82F6', backgroundColor: 'rgba(59,130,246,0.1)',
                  zIndex: 50, pointerEvents: 'none',
                  left: Math.min(selectionBox.x1, selectionBox.x2),
                  top: Math.min(selectionBox.y1, selectionBox.y2),
                  width: Math.abs(selectionBox.x2 - selectionBox.x1),
                  height: Math.abs(selectionBox.y2 - selectionBox.y1),
                }}
              />
            )}

            {activeGalleryTab === 'utility' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 8 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <Info style={{ width: 14, height: 14, color: '#3B82F6' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Spesifikasi Video</span>
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', borderRadius: 14, padding: 16, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Format', value: 'MP4 (H.265 HEVC)' },
                      { label: 'Bitrate', value: '3.5 Mbps' },
                      { label: 'Resolusi', value: selectedResolution, accent: true },
                    ].map((row, ri) => (
                      <div key={ri}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>{row.label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: row.accent ? '#3B82F6' : '#0C1E35' }}>{row.value}</span>
                        </div>
                        {ri < 2 && <div style={{ height: 1, backgroundColor: '#E2E8F0', marginTop: 10 }} />}
                      </div>
                    ))}
                    <div style={{ marginTop: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>Estimasi Ukuran</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#3B82F6' }}>~{calculateEstimatedSize(60)}/menit</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                        {[15, 30, 60].map(m => (
                          <div key={m} style={{ padding: 8, backgroundColor: '#fff', borderRadius: 10, border: '1px solid #E2E8F0', textAlign: 'center' }}>
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
                  <div style={{ position: 'relative', backgroundColor: '#F8FAFC', borderRadius: 12, border: '1px solid #E2E8F0', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <HardDrive style={{ width: 14, height: 14, color: '#94A3B8', flexShrink: 0 }} />
                    <select
                      value={selectedDrive}
                      onChange={(e) => setSelectedDrive(e.target.value)}
                      style={{ ...selectStyle, fontSize: 13 }}
                    >
                      <option value="C:">Local Disk (C:)</option>
                      <option value="D:">Data Storage (D:)</option>
                      <option value="E:">External Drive (E:)</option>
                      <option value="F:">Network Drive (F:)</option>
                    </select>
                    <ChevronDown style={{ width: 12, height: 12, color: '#94A3B8', position: 'absolute', right: 12, pointerEvents: 'none' }} />
                  </div>
                  <div style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 12, border: '1px solid #E2E8F0' }}>
                    <p style={{ fontSize: 11, fontFamily: 'monospace', color: '#94A3B8', wordBreak: 'break-all', lineHeight: 1.5 }}>
                      {selectedDrive}/Aexon/Exports/{new Date().getFullYear()}/{patientData.rmNumber}/
                    </p>
                  </div>
                </div>

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
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0C1E35' }}>{(utilitySettings as any)[adj.key]}{adj.key !== 'whiteBalance' ? '%' : '°'}</span>
                        </div>
                        <input
                          type="range" min={adj.min} max={adj.max} value={(utilitySettings as any)[adj.key]}
                          onChange={(e) => setUtilitySettings(prev => ({ ...prev, [adj.key]: parseInt(e.target.value) }))}
                          style={{ width: '100%', height: 4, borderRadius: 4, cursor: 'pointer', accentColor: '#0C1E35' }}
                        />
                      </div>
                    ))}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 4 }}>
                      <button
                        onClick={() => setUtilitySettings({ brightness: 100, contrast: 100, saturation: 100, whiteBalance: 0 })}
                        style={{ width: '100%', padding: '10px 0', backgroundColor: '#F8FAFC', color: '#64748B', border: '1px solid #E2E8F0', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'all 150ms', fontFamily: 'Outfit, sans-serif' }}
                        onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; e.currentTarget.style.color = '#0C1E35'; }}
                        onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; e.currentTarget.style.color = '#64748B'; }}
                      >
                        Reset Adjustments
                      </button>
                      <button
                        onClick={() => setUtilitySettings(prev => ({ ...prev, whiteBalance: 0 }))}
                        style={{ width: '100%', padding: '10px 0', backgroundColor: '#0C1E35', color: '#fff', border: 'none', borderRadius: 12, fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif' }}
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
                      const isSelected = selectedCaptureIds.includes(capture.id);
                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 16 }}
                          animate={{ opacity: 1, y: 0 }}
                          key={capture.id}
                          data-id={capture.id}
                          data-gallery-item
                          style={{
                            backgroundColor: isSelected ? '#EFF6FF' : '#fff',
                            borderRadius: 14, overflow: 'hidden',
                            border: isSelected ? '2px solid #0C1E35' : '2px solid #E2E8F0',
                            transition: 'all 150ms', cursor: 'pointer',
                          }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.borderColor = '#0C1E35'; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.borderColor = '#E2E8F0'; }}
                          onClick={(e) => {
                            if (e.ctrlKey || e.metaKey) {
                              toggleCaptureSelection(capture.id);
                            } else {
                              setSelectedCaptureForReview(capture);
                            }
                          }}
                        >
                          <div style={{ aspectRatio: '16/10', backgroundColor: '#F1F5F9', position: 'relative' }}>
                            {capture.type === 'image' ? (
                              <img src={capture.url} alt="Capture" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            ) : (
                              <video src={capture.url} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                            )}

                            <div
                              style={{
                                position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: 8,
                                border: isSelected ? 'none' : '2px solid rgba(255,255,255,0.6)',
                                backgroundColor: isSelected ? '#0C1E35' : 'rgba(0,0,0,0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: 'pointer', zIndex: 20,
                              }}
                              onClick={(e) => { e.stopPropagation(); toggleCaptureSelection(capture.id); }}
                            >
                              {isSelected && <CheckCircle2 style={{ width: 14, height: 14, color: '#fff' }} />}
                            </div>

                            <div
                              style={{
                                position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.4)',
                                opacity: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                transition: 'opacity 150ms', backdropFilter: 'blur(2px)',
                              }}
                              onMouseEnter={e => { e.currentTarget.style.opacity = '1'; }}
                              onMouseLeave={e => { e.currentTarget.style.opacity = '0'; }}
                            >
                              <button
                                onClick={(e) => { e.stopPropagation(); setSelectedCaptureForReview(capture); }}
                                style={{ width: 36, height: 36, backgroundColor: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 10, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                              >
                                <Maximize style={{ width: 16, height: 16 }} />
                              </button>
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
                            <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>
                              {capture.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </p>
                            <span style={{ padding: '2px 8px', backgroundColor: '#F8FAFC', color: '#64748B', fontSize: 10, fontWeight: 700, borderRadius: 6, border: '1px solid #E2E8F0' }}>
                              {capture.type === 'image' ? 'PNG' : 'MP4'}
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

      <div style={{ backgroundColor: '#fff', borderTop: '1px solid #E2E8F0', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24, flexShrink: 0 }}>
        <motion.button
          whileHover={{ scale: 1.1, rotate: 180 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => startCamera(selectedDeviceId)}
          style={{ padding: 14, borderRadius: 14, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 150ms' }}
        >
          <RefreshCw style={{ width: 22, height: 22 }} />
        </motion.button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCapturePhoto}
            style={{
              width: 64, height: 64, borderRadius: '50%',
              backgroundColor: '#0C1E35', border: 'none', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(12,30,53,0.35)',
              transition: 'all 150ms',
            }}
          >
            <Camera style={{ width: 28, height: 28 }} />
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            title={isRecording ? 'Stop Recording (R)' : 'Start Recording (R)'}
            style={{
              width: 52, height: 52, borderRadius: '50%',
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
          style={{ padding: 14, borderRadius: 14, backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0', color: '#94A3B8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 150ms' }}
        >
          {isFullscreen ? <Minimize style={{ width: 22, height: 22 }} /> : <Maximize style={{ width: 22, height: 22 }} />}
        </motion.button>
      </div>

      <div style={{ textAlign: 'center', padding: '4px 0 8px', backgroundColor: '#fff' }}>
        <p style={{ fontSize: 11, color: '#94A3B8' }}>
          <kbd style={{ fontFamily: 'monospace', backgroundColor: '#F1F5F9', padding: '1px 6px', borderRadius: 4, fontSize: 10, border: '1px solid #E2E8F0' }}>Space</kbd> Foto &nbsp;&middot;&nbsp;
          <kbd style={{ fontFamily: 'monospace', backgroundColor: '#F1F5F9', padding: '1px 6px', borderRadius: 4, fontSize: 10, border: '1px solid #E2E8F0' }}>R</kbd> Rekam
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
              style={{ backgroundColor: '#fff', borderRadius: 24, padding: 40, maxWidth: 480, width: '100%', boxShadow: '0 25px 50px rgba(0,0,0,0.15)', textAlign: 'center', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: 'linear-gradient(to right, #3B82F6, #6366F1)' }} />
              <div style={{ width: 64, height: 64, backgroundColor: '#EFF6FF', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', border: '1px solid #DBEAFE' }}>
                <CheckCircle2 style={{ width: 32, height: 32, color: '#3B82F6' }} />
              </div>
              <h3 style={{ fontSize: 22, fontWeight: 800, color: '#0C1E35', marginBottom: 8 }}>Selesaikan Sesi?</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6, marginBottom: 32 }}>
                Semua media akan diproses ke dalam laporan medis secara otomatis.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <button
                  onClick={() => setShowFinishConfirmation(false)}
                  style={{ padding: '14px 0', backgroundColor: '#F1F5F9', color: '#475569', fontWeight: 700, fontSize: 13, borderRadius: 14, border: 'none', cursor: 'pointer', transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#E2E8F0'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F1F5F9'; }}
                >
                  Batal
                </button>
                <button
                  onClick={confirmFinishSession}
                  style={{ padding: '14px 0', backgroundColor: '#0C1E35', color: '#fff', fontWeight: 700, fontSize: 13, borderRadius: 14, border: 'none', cursor: 'pointer', transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif', boxShadow: '0 4px 16px rgba(12,30,53,0.2)' }}
                  onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
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
            style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(8px)', padding: 40 }}
            onClick={() => setSelectedCaptureForReview(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 30 }}
              style={{ position: 'relative', maxWidth: 960, width: '100%', backgroundColor: '#fff', borderRadius: 24, overflow: 'hidden', boxShadow: '0 25px 50px rgba(0,0,0,0.2)' }}
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

              <div style={{ padding: '20px 28px', backgroundColor: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    backgroundColor: selectedCaptureForReview.type === 'image' ? '#EFF6FF' : '#FEF2F2',
                    color: selectedCaptureForReview.type === 'image' ? '#3B82F6' : '#DC2626',
                    border: `1px solid ${selectedCaptureForReview.type === 'image' ? '#DBEAFE' : '#FECACA'}`,
                  }}>
                    {selectedCaptureForReview.type === 'image' ? <Camera style={{ width: 22, height: 22 }} /> : <Video style={{ width: 22, height: 22 }} />}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0C1E35' }}>Pratinjau {selectedCaptureForReview.type === 'image' ? 'Foto' : 'Video'}</h4>
                    <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>{selectedCaptureForReview.timestamp.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'medium' })}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button
                    onClick={() => downloadMedia(selectedCaptureForReview.url, selectedCaptureForReview.type)}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 20px', backgroundColor: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, color: '#475569', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
                  >
                    <Download style={{ width: 16, height: 16 }} />
                    Download
                  </button>
                  <button
                    onClick={() => setSelectedCaptureForReview(null)}
                    style={{ padding: '10px 24px', backgroundColor: '#0C1E35', color: '#fff', border: 'none', borderRadius: 12, fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'background-color 150ms', fontFamily: 'Outfit, sans-serif' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#1a3a5c'; }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#0C1E35'; }}
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
