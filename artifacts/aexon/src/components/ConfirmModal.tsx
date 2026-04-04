import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Trash2 } from 'lucide-react';

const FONT = "'Plus Jakarta Sans', sans-serif";

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

const variantConfig = {
  danger: {
    accent: '#EF4444',
    iconBg: '#FEF2F2',
    iconBorder: '#FECACA',
    confirmBg: '#DC2626',
    confirmHover: '#B91C1C',
    defaultIcon: <Trash2 style={{ width: 28, height: 28, color: '#EF4444' }} />,
  },
  warning: {
    accent: '#F59E0B',
    iconBg: '#FFFBEB',
    iconBorder: '#FDE68A',
    confirmBg: '#DC2626',
    confirmHover: '#B91C1C',
    defaultIcon: <AlertTriangle style={{ width: 28, height: 28, color: '#F59E0B' }} />,
  },
  info: {
    accent: '#3B82F6',
    iconBg: '#EFF6FF',
    iconBorder: '#BFDBFE',
    confirmBg: '#0C1E35',
    confirmHover: '#152d4f',
    defaultIcon: <AlertTriangle style={{ width: 28, height: 28, color: '#3B82F6' }} />,
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
  const config = variantConfig[variant];

  return (
    <AnimatePresence>
      {isOpen && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 24,
        }}>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            style={{
              position: 'absolute', inset: 0,
              backgroundColor: 'rgba(15,23,42,0.6)',
              backdropFilter: 'blur(8px)',
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'relative', width: '100%', maxWidth: 400,
              backgroundColor: '#fff', borderRadius: 20, padding: 36,
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
              overflow: 'hidden', textAlign: 'center',
              fontFamily: FONT,
            }}
          >
            {/* Accent bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 3,
              backgroundColor: config.accent,
            }} />

            {/* Icon */}
            <div style={{
              width: 56, height: 56, borderRadius: 16,
              backgroundColor: config.iconBg,
              border: `1px solid ${config.iconBorder}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 20px',
            }}>
              {icon || config.defaultIcon}
            </div>

            {/* Title */}
            <h3 style={{
              fontSize: 20, fontWeight: 900, color: '#0C1E35',
              margin: '0 0 8px', fontFamily: FONT,
            }}>
              {title}
            </h3>

            {/* Message */}
            <p style={{
              fontSize: 13, color: '#64748B', lineHeight: 1.6,
              margin: '0 0 28px', fontFamily: FONT,
            }}>
              {message}
            </p>

            {/* Buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <button
                onClick={onCancel}
                style={{
                  padding: '13px 0', borderRadius: 12,
                  backgroundColor: '#F4F6F8', color: '#475569',
                  border: 'none', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: FONT,
                  transition: 'background-color 150ms',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#E8ECF1'; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#F4F6F8'; }}
              >
                {cancelText}
              </button>
              <button
                onClick={onConfirm}
                style={{
                  padding: '13px 0', borderRadius: 12,
                  backgroundColor: config.confirmBg, color: '#fff',
                  border: 'none', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: FONT,
                  transition: 'background-color 150ms',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = config.confirmHover; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = config.confirmBg; }}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}