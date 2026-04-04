import React, { createContext, useContext, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue>({ showToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const iconMap: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 style={{ width: 20, height: 20, color: '#10B981' }} />,
  error: <XCircle style={{ width: 20, height: 20, color: '#EF4444' }} />,
  warning: <AlertTriangle style={{ width: 20, height: 20, color: '#F59E0B' }} />,
  info: <Info style={{ width: 20, height: 20, color: '#3B82F6' }} />,
};

const bgMap: Record<ToastType, { bg: string; border: string }> = {
  success: { bg: '#ECFDF5', border: '#A7F3D0' },
  error: { bg: '#FEF2F2', border: '#FECACA' },
  warning: { bg: '#FFFBEB', border: '#FDE68A' },
  info: { bg: '#EFF6FF', border: '#BFDBFE' },
};

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div style={{
        position: 'fixed', top: 20, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 12,
        pointerEvents: 'none', maxWidth: 420, zoom: 1,
      }}>
        <AnimatePresence>
          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 80, scale: 0.95 }}
              transition={{ duration: 0.25 }}
              style={{
                pointerEvents: 'auto',
                display: 'flex', alignItems: 'flex-start', gap: 14,
                padding: '16px 20px',
                borderRadius: 14,
                border: `1px solid ${bgMap[toast.type].border}`,
                backgroundColor: bgMap[toast.type].bg,
                boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
                backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ flexShrink: 0, marginTop: 1 }}>{iconMap[toast.type]}</div>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#1E293B', flex: 1, lineHeight: 1.5, margin: 0, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{toast.message}</p>
              <button onClick={() => removeToast(toast.id)} style={{ flexShrink: 0, color: '#94A3B8', background: 'none', border: 'none', cursor: 'pointer', padding: 4, borderRadius: 6, transition: 'color 150ms' }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}