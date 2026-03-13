import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, Video, Square, Download, Settings, RefreshCw, AlertCircle, Maximize, Minimize, FileImage, FileVideo, CheckCircle2, ChevronDown, Sliders, HardDrive, Info, X } from 'lucide-react';
import { PatientData, Capture, Session } from '../types';
import ImageEditor from './ImageEditor';
import { Trash2, Edit3, MousePointer2 } from 'lucide-react';
import { Pattern } from './Logo';

interface EndoscopyAppProps {
  plan: 'subscription' | 'token' | 'enterprise';
  tokens: number;
  patientData: PatientData;
  onEndSession: (session: Session, tokenDeducted: boolean) => void;
  onLogout: () => void;
  onRecordingStatusChange?: (isRecording: boolean) => void;
}

export default function EndoscopyApp({ plan, tokens, patientData, onEndSession, onLogout, onRecordingStatusChange }: EndoscopyAppProps) {
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
    whiteBalance: 0, // Simulated as a hue-rotate or sepia/blue tint
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

  const handleDeleteSelected = () => {
    if (window.confirm(`Hapus ${selectedCaptureIds.length} item terpilih?`)) {
      setCaptures(prev => prev.filter(c => !selectedCaptureIds.includes(c.id)));
      setSelectedCaptureIds([]);
    }
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

    // Logic to select items within the box
    const galleryItems = document.querySelectorAll('.gallery-item');
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
    
    // Add keyboard shortcuts
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
  }, [isRecording]); // Re-bind when isRecording changes

  useEffect(() => {
    if (selectedDeviceId) {
      startCamera(selectedDeviceId, selectedResolution);
    }
  }, [selectedDeviceId, selectedResolution]);

  const getDevices = async () => {
    try {
      await navigator.mediaDevices.getUserMedia({ video: true }); // Request permission first
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
        // Apply mirroring fix to capture as well
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
        
        // Trigger visual flash
        setIsFlashActive(true);
        setTimeout(() => setIsFlashActive(false), 150);
        
        // Always show notification
        setShowCaptureNotification(true);
        setTimeout(() => setShowCaptureNotification(false), 2000);
      }
    }
  }, [stream, isFullscreen]);

  const handleStartRecording = useCallback(() => {
    if (stream) {
      // Try to use MP4 if supported, fallback to HEVC/VP9 or default
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
        videoBitsPerSecond: 3500000 // 3.5 Mbps
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
    
    // Determine extension based on blob type if possible, or default to MP4 for video as requested
    let extension = type === 'image' ? 'png' : 'mp4';
    if (type === 'video' && url.startsWith('blob:')) {
      // We can't easily get the type from the URL, but we know we preferred H.265
    }
    
    a.download = customName || `endo_capture_${new Date().getTime()}.${extension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const downloadAllMedia = () => {
    if (captures.length === 0) return;
    
    // Simple sequential download to avoid browser blocking multiple popups
    captures.forEach((capture, index) => {
      setTimeout(() => {
        downloadMedia(capture.url, capture.type, `endo_${patientData.rmNumber}_${index + 1}.${capture.type === 'image' ? 'png' : 'webm'}`);
      }, index * 300); // 300ms delay between each download
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
      
      // Create session object
      const session: Session = {
        id: `session_${Date.now()}`,
        date: new Date(),
        patient: patientData,
        captures: captures,
        status: 'completed'
      };
      
      // Deduct token if plan is token
      const tokenDeducted = plan === 'token';
      
      onEndSession(session, tokenDeducted);
      setShowFinishConfirmation(false);
    } catch (err) {
      console.error("Error finishing session:", err);
      // Ensure we close the modal even if something fails
      setShowFinishConfirmation(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col font-sans text-slate-900 bg-slate-50 h-full overflow-hidden relative">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <Pattern className="text-blue-500 opacity-[0.03]" />
      </div>

      {/* Header / Top Bar */}
      <header className="h-24 border-b border-slate-200 bg-white/80 backdrop-blur-3xl flex items-center justify-between px-10 shrink-0 z-[100] relative">
        <div className="flex items-center space-x-8">
          <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20">
            <Camera className="w-7 h-7 text-white" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="px-3 py-1 bg-blue-600/10 border border-blue-500/20 rounded-full">
                <span className="text-[9px] font-black text-blue-600 uppercase tracking-[0.2em]">Sesi Aktif</span>
              </div>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">RM: {patientData.rmNumber}</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">{patientData.name}</h1>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          {/* Settings Group */}
          <div className="flex items-center bg-slate-100 rounded-2xl border border-slate-200 p-1.5">
            <div className="relative flex items-center px-4 py-2.5">
              <Maximize className="w-4 h-4 text-slate-400 mr-3" />
              <select 
                value={selectedResolution}
                onChange={(e) => setSelectedResolution(e.target.value as any)}
                className="bg-transparent text-[10px] text-slate-600 font-black uppercase tracking-widest focus:outline-none appearance-none pr-8 cursor-pointer"
              >
                <option value="480p" className="bg-white">480p SD</option>
                <option value="720p" className="bg-white">720p HD</option>
                <option value="1080p" className="bg-white">1080p FHD</option>
                <option value="4K" className="bg-white">4K UHD</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
            <div className="w-px h-6 bg-slate-200" />
            <div className="relative flex items-center px-4 py-2.5">
              <Camera className="w-4 h-4 text-slate-400 mr-3" />
              <select 
                value={selectedDeviceId}
                onChange={(e) => setSelectedDeviceId(e.target.value)}
                className="bg-transparent text-[10px] text-slate-600 font-black uppercase tracking-widest focus:outline-none appearance-none pr-8 cursor-pointer max-w-[160px]"
              >
                {devices.map(device => (
                  <option key={device.deviceId} value={device.deviceId} className="bg-white">
                    {device.label || `Camera ${device.deviceId.substring(0, 5)}...`}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 pointer-events-none" />
            </div>
          </div>
          
          <motion.button 
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleFinishSession}
            className="flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl shadow-blue-600/30 cursor-pointer"
          >
            <CheckCircle2 className="w-5 h-5 mr-3" />
            SELESAIKAN SESI
          </motion.button>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden relative z-10">
        {/* Main Viewfinder Area */}
        <div ref={containerRef} className="flex-1 relative flex flex-col bg-black">
          {error && (
            <div className="absolute top-6 left-1/2 -translate-x-1/2 z-20 bg-red-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center text-xs font-black uppercase tracking-widest border border-red-400/50">
              <AlertCircle className="w-4 h-4 mr-3" />
              {error}
            </div>
          )}

          <div className="flex-1 relative overflow-hidden flex items-center justify-center">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-contain transition-all duration-300"
              style={{
                filter: `brightness(${utilitySettings.brightness}%) contrast(${utilitySettings.contrast}%) saturate(${utilitySettings.saturation}%) hue-rotate(${utilitySettings.whiteBalance}deg)`,
                transform: 'scaleX(-1)'
              }}
            />
            
            {/* Flash Effect Overlay */}
            <AnimatePresence>
              {isFlashActive && (
                <motion.div 
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 0 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-white z-[60] pointer-events-none"
                />
              )}
            </AnimatePresence>
            
            {/* Recording Indicator */}
            {isRecording && (
              <div className="absolute top-8 right-8 flex items-center space-x-4 bg-red-500/20 backdrop-blur-xl px-6 py-3 rounded-2xl border border-red-500/30 z-50 shadow-2xl">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
                <span className="text-red-100 font-mono text-sm tracking-[0.2em] font-black">REC {formatTime(recordingTime)}</span>
              </div>
            )}

            {/* Capture Notification */}
            <AnimatePresence>
              {showCaptureNotification && (
                <motion.div 
                  initial={{ opacity: 0, y: -20, x: '-50%' }}
                  animate={{ opacity: 1, y: 0, x: '-50%' }}
                  exit={{ opacity: 0, y: -20, x: '-50%' }}
                  className="absolute top-8 left-1/2 flex items-center space-x-4 bg-emerald-600 backdrop-blur-xl px-8 py-4 rounded-3xl border border-emerald-400/30 z-[70] shadow-2xl"
                >
                  <div className="w-10 h-10 bg-white/20 rounded-2xl flex items-center justify-center">
                    <Camera className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-white font-black text-[10px] uppercase tracking-[0.2em] leading-none mb-1">Capture Success</span>
                    <span className="text-emerald-50 text-xs font-bold">Foto berhasil disimpan ke galeri</span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Crosshair / Center Mark */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
              <div className="w-20 h-20 border border-white/50 rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-white rounded-full shadow-[0_0_10px_white]" />
              </div>
            </div>
            
            {/* Keyboard Shortcuts Hint */}
            <div className="absolute bottom-6 left-8 flex space-x-6 opacity-40 pointer-events-none">
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-white bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5">
                <kbd className="font-mono bg-white/20 px-2 py-0.5 rounded-lg mr-2">Space</kbd> Foto
              </div>
              <div className="flex items-center text-[10px] font-black uppercase tracking-widest text-white bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/5">
                <kbd className="font-mono bg-white/20 px-2 py-0.5 rounded-lg mr-2">R</kbd> Rekam
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div className="h-32 bg-white/80 backdrop-blur-3xl border-t border-slate-200 flex items-center justify-center space-x-16 px-16 shrink-0 relative z-10">
            <motion.button 
              whileHover={{ scale: 1.1, rotate: 180 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => startCamera(selectedDeviceId)}
              className="p-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-all border border-slate-200"
              title="Refresh Camera"
            >
              <RefreshCw className="w-7 h-7" />
            </motion.button>

            <div className="flex items-center space-x-12">
              <motion.button 
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCapturePhoto}
                className="w-24 h-24 rounded-[2.5rem] bg-white hover:bg-slate-50 flex items-center justify-center shadow-xl border border-slate-200 transition-all relative group"
                title="Capture Photo (Space)"
              >
                <div className="absolute inset-0 bg-blue-500 blur-3xl opacity-0 group-hover:opacity-10 transition-opacity" />
                <div className="w-20 h-20 rounded-[2rem] border-2 border-slate-900 flex items-center justify-center relative z-10">
                  <Camera className="w-10 h-10 text-slate-900" />
                </div>
              </motion.button>

              <motion.button 
                whileHover={{ scale: 1.05, y: -4 }}
                whileTap={{ scale: 0.95 }}
                onClick={isRecording ? handleStopRecording : handleStartRecording}
                className={`w-24 h-24 rounded-[2.5rem] flex items-center justify-center transition-all shadow-2xl relative group ${
                  isRecording 
                    ? 'bg-slate-900 border-2 border-red-500 shadow-red-500/20' 
                    : 'bg-red-600 hover:bg-red-500 shadow-red-600/30'
                }`}
                title={isRecording ? "Stop Recording (R)" : "Start Recording (R)"}
              >
                <div className={`absolute inset-0 bg-red-500 blur-3xl opacity-0 ${isRecording ? 'opacity-30 animate-pulse' : 'group-hover:opacity-20'} transition-opacity`} />
                {isRecording ? (
                  <Square className="w-10 h-10 text-red-500 fill-current relative z-10" />
                ) : (
                  <div className="w-20 h-20 rounded-[2rem] border-2 border-white/40 flex items-center justify-center relative z-10">
                    <Video className="w-10 h-10 text-white" />
                  </div>
                )}
              </motion.button>
            </div>

            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={toggleFullscreen}
              className="p-5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-400 hover:text-slate-900 transition-all border border-slate-200"
              title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-7 h-7" /> : <Maximize className="w-7 h-7" />}
            </motion.button>
          </div>
        </div>

        {/* Sidebar Gallery */}
        <div className="w-96 bg-white border-l border-slate-200 flex flex-col h-full overflow-hidden relative">
          {/* Patient Info Box */}
          <div className="p-6 bg-gradient-to-br from-blue-600 to-indigo-800 text-white shrink-0 shadow-2xl relative z-30 m-5 rounded-[2.5rem] border border-blue-400/20 overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-white/20 transition-colors" />
            <div className="flex items-center justify-between mb-6 relative z-10">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/20 shadow-inner">
                  <Info className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-[10px] font-black uppercase tracking-[0.3em] leading-none mb-2 text-blue-200">Informasi Sesi</h3>
                  <p className="text-xl font-black tracking-tight">Detail Klinis</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => setIsSessionInfoCollapsed(!isSessionInfoCollapsed)}
                className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center border border-white/10 transition-colors"
              >
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isSessionInfoCollapsed ? 'rotate-180' : ''}`} />
              </motion.button>
            </div>
            
            <AnimatePresence initial={false}>
              {!isSessionInfoCollapsed && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                  className="overflow-hidden relative z-10"
                >
                  <div className="space-y-4 bg-black/10 p-6 rounded-[1.5rem] backdrop-blur-md border border-white/5">
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black text-blue-200 uppercase tracking-widest">Waktu</span>
                      <span className="text-[11px] font-black text-right">{new Date().toLocaleDateString('id-ID')} • {new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="w-full h-px bg-white/5" />
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black text-blue-200 uppercase tracking-widest">Prosedur</span>
                      <span className="text-[11px] font-black text-right max-w-[160px] truncate">{patientData.procedures[0] || '-'}</span>
                    </div>
                    <div className="w-full h-px bg-white/5" />
                    <div className="flex justify-between items-start">
                      <span className="text-[9px] font-black text-blue-200 uppercase tracking-widest">Diagnosis</span>
                      <span className="text-[11px] font-black text-right max-w-[160px] truncate">{patientData.diagnosis || '-'}</span>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Gallery Tabs */}
          <div className="flex px-5 gap-3 mb-6 shrink-0">
            {['photos', 'videos', 'utility'].map((tab) => (
              <button 
                key={tab}
                onClick={() => setActiveGalleryTab(tab as any)}
                className={`flex-1 py-4 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all border ${
                  activeGalleryTab === tab 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' 
                    : 'bg-slate-50 text-slate-400 border-slate-200 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="px-8 py-4 flex items-center justify-between shrink-0 relative z-20">
            <div>
              <h2 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">
                {activeGalleryTab === 'utility' ? 'System Settings' : `Galeri ${activeGalleryTab}`}
              </h2>
              {activeGalleryTab !== 'utility' && (
                <span className="text-[10px] text-blue-600 font-black uppercase tracking-widest mt-2 block">
                  {captures.filter(c => activeGalleryTab === 'photos' ? c.type === 'image' : c.type === 'video').length} items {selectedCaptureIds.length > 0 && `• ${selectedCaptureIds.length} selected`}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {selectedCaptureIds.length > 0 ? (
                <>
                  <button 
                    onClick={handleDeleteSelected}
                    className="p-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl transition-all border border-red-100 shadow-sm"
                    title="Hapus Terpilih"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </>
              ) : (
                activeGalleryTab !== 'utility' && captures.length > 0 && (
                  <button 
                    onClick={downloadAllMedia}
                    className="p-3 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all border border-slate-200"
                    title="Download All"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                )
              )}
            </div>
          </div>
          
          <div 
            className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar relative select-none"
            onMouseDown={handleGalleryMouseDown}
            onMouseMove={handleGalleryMouseMove}
            onMouseUp={handleGalleryMouseUp}
          >
            {/* Selection Box Visual */}
            {selectionBox && (
              <div 
                className="absolute border-2 border-blue-500 bg-blue-500/10 z-50 pointer-events-none"
                style={{
                  left: Math.min(selectionBox.x1, selectionBox.x2),
                  top: Math.min(selectionBox.y1, selectionBox.y2),
                  width: Math.abs(selectionBox.x2 - selectionBox.x1),
                  height: Math.abs(selectionBox.y2 - selectionBox.y1)
                }}
              />
            )}
            {activeGalleryTab === 'utility' ? (
              <div className="space-y-10 py-4">
                {/* Video Specs */}
                <div className="space-y-5">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center">
                    <Info className="w-4 h-4 mr-3 text-blue-600" />
                    Spesifikasi Video
                  </h3>
                  <div className="bg-slate-50 rounded-3xl p-6 space-y-4 border border-slate-200 backdrop-blur-md">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Format</span>
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">MP4 (H.265 HEVC)</span>
                    </div>
                    <div className="w-full h-px bg-slate-200" />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bitrate</span>
                      <span className="text-[11px] font-black text-slate-900 uppercase tracking-wider">3.5 Mbps</span>
                    </div>
                    <div className="w-full h-px bg-slate-200" />
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resolusi</span>
                      <span className="text-[11px] font-black text-blue-600 uppercase tracking-wider">{selectedResolution}</span>
                    </div>
                    <div className="w-full h-px bg-slate-200" />
                    <div className="space-y-4 pt-2">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estimasi Ukuran File</span>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">~{calculateEstimatedSize(60)}/menit</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">15m</div>
                          <div className="text-[10px] font-black text-slate-900">{calculateEstimatedSize(15 * 60)}</div>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">30m</div>
                          <div className="text-[10px] font-black text-slate-900">{calculateEstimatedSize(30 * 60)}</div>
                        </div>
                        <div className="p-2 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">60m</div>
                          <div className="text-[10px] font-black text-slate-900">{calculateEstimatedSize(60 * 60)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Storage Info */}
                <div className="space-y-5">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center">
                    <HardDrive className="w-4 h-4 mr-3 text-indigo-600" />
                    Lokasi Penyimpanan
                  </h3>
                  <div className="space-y-4">
                    <div className="relative flex items-center bg-slate-50 rounded-2xl border border-slate-200 px-5 py-3.5 backdrop-blur-md">
                      <HardDrive className="w-4 h-4 text-slate-400 mr-3" />
                      <select 
                        value={selectedDrive}
                        onChange={(e) => setSelectedDrive(e.target.value)}
                        className="bg-transparent text-sm text-slate-600 font-bold focus:outline-none appearance-none pr-8 cursor-pointer w-full"
                      >
                        <option value="C:" className="bg-white">Local Disk (C:)</option>
                        <option value="D:" className="bg-white">Data Storage (D:)</option>
                        <option value="E:" className="bg-white">External Drive (E:)</option>
                        <option value="F:" className="bg-white">Network Drive (F:)</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-5 pointer-events-none" />
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                      <p className="text-[10px] font-mono text-slate-400 break-all leading-relaxed">{selectedDrive}/Aexon/Exports/{new Date().getFullYear()}/{patientData.rmNumber}/</p>
                    </div>
                  </div>
                </div>

                {/* Image Adjustments */}
                <div className="space-y-8">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] flex items-center">
                    <Sliders className="w-4 h-4 mr-3 text-emerald-600" />
                    Penyesuaian Gambar
                  </h3>
                  
                  <div className="space-y-6">
                    {[
                      { label: 'Brightness', key: 'brightness', min: 50, max: 150 },
                      { label: 'Contrast', key: 'contrast', min: 50, max: 150 },
                      { label: 'Saturation', key: 'saturation', min: 50, max: 150 },
                      { label: 'White Balance', key: 'whiteBalance', min: -180, max: 180 }
                    ].map((adj) => (
                      <div key={adj.key} className="space-y-3">
                        <div className="flex justify-between items-center">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{adj.label}</label>
                          <span className="text-[11px] font-black text-blue-600">{(utilitySettings as any)[adj.key]}{adj.key !== 'whiteBalance' ? '%' : ''}</span>
                        </div>
                        <input 
                          type="range" min={adj.min} max={adj.max} value={(utilitySettings as any)[adj.key]}
                          onChange={(e) => setUtilitySettings(prev => ({ ...prev, [adj.key]: parseInt(e.target.value) }))}
                          className="w-full h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-blue-600"
                        />
                      </div>
                    ))}

                    <div className="pt-4 space-y-3">
                      <button 
                        onClick={() => setUtilitySettings({ brightness: 100, contrast: 100, saturation: 100, whiteBalance: 0 })}
                        className="w-full py-3.5 bg-slate-50 hover:bg-slate-100 text-slate-400 hover:text-slate-900 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all border border-slate-200"
                      >
                        Reset Adjustments
                      </button>

                      <button 
                        onClick={() => setUtilitySettings(prev => ({ ...prev, whiteBalance: 0 }))}
                        className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-2xl shadow-blue-600/20"
                      >
                        Auto White Balance
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5 py-4">
                {captures.filter(c => activeGalleryTab === 'photos' ? c.type === 'image' : c.type === 'video').length === 0 ? (
                  <div className="h-80 flex flex-col items-center justify-center text-slate-600 space-y-5">
                    <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center border border-white/5">
                      {activeGalleryTab === 'photos' ? <FileImage className="w-10 h-10 opacity-30" /> : <FileVideo className="w-10 h-10 opacity-30" />}
                    </div>
                    <p className="text-sm font-black uppercase tracking-[0.2em] opacity-40">Belum ada {activeGalleryTab}</p>
                  </div>
                ) : (
                  captures
                    .filter(c => activeGalleryTab === 'photos' ? c.type === 'image' : c.type === 'video')
                    .map((capture) => (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        key={capture.id} 
                        data-id={capture.id}
                        className={`gallery-item group relative bg-slate-50 rounded-3xl overflow-hidden border-2 transition-all shadow-sm ${
                          selectedCaptureIds.includes(capture.id) ? 'border-blue-600 ring-4 ring-blue-600/10' : 'border-slate-100 hover:border-blue-200'
                        }`}
                        onClick={(e) => {
                          if (e.ctrlKey || e.metaKey) {
                            toggleCaptureSelection(capture.id);
                          } else {
                            setSelectedCaptureForReview(capture);
                          }
                        }}
                      >
                        <div className="aspect-video bg-slate-200 relative">
                          {capture.type === 'image' ? (
                            <img src={capture.url} alt="Capture" className="w-full h-full object-cover" />
                          ) : (
                            <video src={capture.url} className="w-full h-full object-cover" />
                          )}
                          
                          {/* Selection Checkbox */}
                          <div 
                            className={`absolute top-3 right-3 w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all z-20 ${
                              selectedCaptureIds.includes(capture.id) 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                                : 'bg-black/20 border-white/20 opacity-0 group-hover:opacity-100 backdrop-blur-md'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCaptureSelection(capture.id);
                            }}
                          >
                            {selectedCaptureIds.includes(capture.id) && <CheckCircle2 className="w-4 h-4" />}
                          </div>

                          {/* Overlay Controls */}
                          <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-3 backdrop-blur-sm">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedCaptureForReview(capture);
                              }}
                              className="w-10 h-10 bg-white/20 hover:bg-white/40 rounded-2xl text-white transition-all flex items-center justify-center border border-white/20"
                              title="Review Capture"
                            >
                              <Maximize className="w-5 h-5" />
                            </button>
                            {capture.type === 'image' && (
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingCapture(capture);
                                }}
                                className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-2xl text-white transition-all flex items-center justify-center shadow-lg shadow-blue-600/20"
                                title="Edit Marker"
                              >
                                <Edit3 className="w-5 h-5" />
                              </button>
                            )}
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                downloadMedia(capture.url, capture.type);
                              }}
                              className="w-10 h-10 bg-white/20 hover:bg-white/40 rounded-2xl text-white transition-all flex items-center justify-center border border-white/20"
                              title="Download"
                            >
                              <Download className="w-5 h-5" />
                            </button>
                          </div>

                          {/* Type Badge */}
                          <div className="absolute top-3 left-3 px-3 py-1.5 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex items-center">
                            {capture.type === 'image' ? (
                              <Camera className="w-3.5 h-3.5 text-blue-400 mr-2" />
                            ) : (
                              <Video className="w-3.5 h-3.5 text-red-500 mr-2" />
                            )}
                            <span className="text-[10px] font-black text-white uppercase tracking-widest">
                              {capture.type}
                            </span>
                          </div>
                        </div>
                        
                        <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                            {capture.timestamp.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest rounded-lg border border-slate-200">{capture.type === 'image' ? 'PNG' : 'MP4'}</span>
                          </div>
                        </div>
                      </motion.div>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Image Editor Modal */}
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

      {/* Finish Session Confirmation Modal */}
      <AnimatePresence>
        {showFinishConfirmation && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 backdrop-blur-xl p-6">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 40 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-[3rem] p-12 max-w-xl w-full shadow-2xl border border-slate-200 relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600" />
              <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center mb-10 mx-auto border border-blue-100 shadow-sm">
                <div className="w-16 h-16 bg-blue-100 rounded-[1.5rem] flex items-center justify-center border border-blue-200">
                  <CheckCircle2 className="w-8 h-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-3xl font-black text-slate-900 text-center mb-4 tracking-tighter uppercase">Selesaikan Sesi?</h3>
              <p className="text-slate-500 text-center mb-12 text-lg font-medium leading-relaxed px-4">
                Apakah Anda yakin ingin mengakhiri sesi ini? Semua media akan diproses ke dalam laporan medis profesional secara otomatis.
              </p>
              <div className="grid grid-cols-2 gap-6">
                <button 
                  onClick={() => setShowFinishConfirmation(false)}
                  className="py-5 px-8 bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-900 font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-all border border-slate-200 cursor-pointer"
                >
                  Batal
                </button>
                <button 
                  onClick={confirmFinishSession}
                  className="py-5 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-[10px] rounded-2xl transition-all shadow-xl shadow-blue-500/20 cursor-pointer"
                >
                  Ya, Selesaikan
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Hidden canvas for photo capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Review Modal */}
      <AnimatePresence>
        {selectedCaptureForReview && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-xl p-10"
            onClick={() => setSelectedCaptureForReview(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 60 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 60 }}
              className="relative max-w-7xl w-full bg-white rounded-[3rem] overflow-hidden shadow-2xl border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="aspect-video bg-black flex items-center justify-center relative group">
                {selectedCaptureForReview.type === 'image' ? (
                  <img src={selectedCaptureForReview.url} alt="Review" className="max-w-full max-h-full object-contain" />
                ) : (
                  <video src={selectedCaptureForReview.url} controls autoPlay className="max-w-full max-h-full object-contain" />
                )}
                
                <button 
                  onClick={() => setSelectedCaptureForReview(null)}
                  className="absolute top-8 right-8 w-12 h-12 bg-black/40 hover:bg-black/60 text-white rounded-2xl flex items-center justify-center backdrop-blur-xl border border-white/10 transition-all z-50 shadow-xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <div className="p-10 bg-slate-50 flex items-center justify-between border-t border-slate-200">
                <div className="flex items-center space-x-6">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${selectedCaptureForReview.type === 'image' ? 'bg-blue-100 text-blue-600 border border-blue-200' : 'bg-red-100 text-red-600 border border-red-200'}`}>
                    {selectedCaptureForReview.type === 'image' ? <Camera className="w-8 h-8" /> : <Video className="w-8 h-8" />}
                  </div>
                  <div>
                    <h4 className="text-slate-900 font-black tracking-tighter uppercase text-2xl mb-1">Pratinjau {selectedCaptureForReview.type === 'image' ? 'Foto' : 'Video'}</h4>
                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{selectedCaptureForReview.timestamp.toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'medium' })}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button 
                    onClick={() => downloadMedia(selectedCaptureForReview.url, selectedCaptureForReview.type)}
                    className="flex items-center px-8 py-4 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all"
                  >
                    <Download className="w-5 h-5 mr-3" />
                    Download
                  </button>
                  <button 
                    onClick={() => setSelectedCaptureForReview(null)}
                    className="px-10 py-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-2xl transition-all shadow-xl shadow-blue-500/20"
                  >
                    Tutup
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
