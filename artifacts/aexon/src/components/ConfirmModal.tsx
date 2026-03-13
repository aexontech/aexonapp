import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2, LogOut, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  icon?: React.ReactNode;
}

const variantStyles = {
  danger: {
    accent: 'bg-red-500',
    iconBg: 'bg-red-50',
    confirmBtn: 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20',
    cancelBtn: 'bg-slate-100 hover:bg-slate-200 text-slate-600',
    defaultIcon: <Trash2 className="w-10 h-10 text-red-500" />,
  },
  warning: {
    accent: 'bg-amber-500',
    iconBg: 'bg-amber-50',
    confirmBtn: 'bg-red-600 hover:bg-red-700 text-white shadow-red-600/20',
    cancelBtn: 'border-2 border-[#0C1E35] text-[#0C1E35] hover:bg-slate-50',
    defaultIcon: <AlertTriangle className="w-10 h-10 text-amber-500" />,
  },
  info: {
    accent: 'bg-blue-500',
    iconBg: 'bg-blue-50',
    confirmBtn: 'bg-[#0C1E35] hover:bg-[#1a3a5c] text-white shadow-slate-900/10',
    cancelBtn: 'bg-slate-100 hover:bg-slate-200 text-slate-600',
    defaultIcon: <AlertTriangle className="w-10 h-10 text-blue-500" />,
  },
};

export default function ConfirmModal({
  isOpen,
  onConfirm,
  onCancel,
  title,
  message,
  confirmText = 'Konfirmasi',
  cancelText = 'Batal',
  variant = 'danger',
  icon,
}: ConfirmModalProps) {
  const styles = variantStyles[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white rounded-3xl p-10 shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className={`absolute top-0 left-0 w-full h-2 ${styles.accent}`} />
            <div className={`w-20 h-20 ${styles.iconBg} rounded-3xl flex items-center justify-center mb-8 mx-auto`}>
              {icon || styles.defaultIcon}
            </div>
            <h3 className="text-2xl font-black text-slate-900 text-center mb-4 tracking-tight">{title}</h3>
            <p className="text-slate-500 text-center mb-10 text-sm font-medium leading-relaxed">{message}</p>
            <div className="flex flex-col gap-3">
              <button
                onClick={onConfirm}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-lg ${styles.confirmBtn}`}
              >
                {confirmText}
              </button>
              <button
                onClick={onCancel}
                className={`w-full py-4 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${styles.cancelBtn}`}
              >
                {cancelText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
