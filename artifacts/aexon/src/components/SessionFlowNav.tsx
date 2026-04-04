import React from 'react';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

const STEPS = [
  { id: 'session-form', label: 'Data pasien' },
  { id: 'endoscopy', label: 'Endoskopi' },
  { id: 'patient-profile', label: 'Profil pasien' },
  { id: 'report-generator', label: 'Laporan' },
] as const;

type StepId = typeof STEPS[number]['id'];

interface SessionFlowNavProps {
  currentStep: StepId;
  onBack?: () => void;
  onNext?: () => void;
  backLabel?: string;
  nextLabel?: string;
  nextDisabled?: boolean;
}

export default function SessionFlowNav({
  currentStep,
  onBack,
  onNext,
  backLabel = 'Kembali',
  nextLabel = 'Lanjut',
  nextDisabled = false,
}: SessionFlowNavProps) {
  const currentIndex = STEPS.findIndex(s => s.id === currentStep);

  const btnBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 4,
    padding: '6px 14px',
    borderRadius: 8,
    fontSize: 12,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 150ms',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    flexShrink: 0,
  };

  return (
    <div
      className="print:hidden print-hide"
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 20px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #E8ECF1',
        gap: 8,
        flexShrink: 0,
      }}
    >
      {/* Back button */}
      {onBack ? (
        <button
          onClick={onBack}
          style={{
            ...btnBase,
            border: '1px solid #E8ECF1',
            backgroundColor: '#ffffff',
            color: '#64748B',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.backgroundColor = '#F8FAFC';
            e.currentTarget.style.borderColor = '#0C1E35';
            e.currentTarget.style.color = '#0C1E35';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.backgroundColor = '#ffffff';
            e.currentTarget.style.borderColor = '#E8ECF1';
            e.currentTarget.style.color = '#64748B';
          }}
        >
          <ChevronLeft style={{ width: 14, height: 14 }} />
          {backLabel}
        </button>
      ) : (
        <div style={{ width: 90 }} />
      )}

      {/* Step indicators */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        {STEPS.map((step, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;

          return (
            <React.Fragment key={step.id}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '4px 10px',
                  borderRadius: 6,
                  backgroundColor: isActive ? '#0C1E35' : 'transparent',
                  color: isActive ? '#ffffff' : isDone ? '#64748B' : '#CBD5E1',
                  fontSize: 11,
                  fontWeight: isActive ? 700 : 500,
                  whiteSpace: 'nowrap',
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                  transition: 'all 150ms',
                }}
              >
                <span
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    fontWeight: 700,
                    flexShrink: 0,
                    border: isActive
                      ? '1px solid rgba(255,255,255,0.3)'
                      : isDone
                      ? '1px solid transparent'
                      : '1px solid #E8ECF1',
                    backgroundColor: isActive
                      ? 'rgba(255,255,255,0.15)'
                      : isDone
                      ? '#E1F5EE'
                      : 'transparent',
                    color: isActive ? '#ffffff' : isDone ? '#0F6E56' : '#CBD5E1',
                  }}
                >
                  {isDone ? <Check style={{ width: 10, height: 10 }} /> : i + 1}
                </span>
                {step.label}
              </div>
              {i < STEPS.length - 1 && (
                <ChevronRight
                  style={{
                    width: 12,
                    height: 12,
                    color: '#CBD5E1',
                    flexShrink: 0,
                    opacity: 0.5,
                  }}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Next button */}
      {onNext ? (
        <button
          onClick={onNext}
          disabled={nextDisabled}
          style={{
            ...btnBase,
            border: 'none',
            backgroundColor: nextDisabled ? '#E8ECF1' : '#0C1E35',
            color: nextDisabled ? '#94A3B8' : '#ffffff',
            cursor: nextDisabled ? 'not-allowed' : 'pointer',
            opacity: nextDisabled ? 0.5 : 1,
          }}
          onMouseEnter={e => {
            if (!nextDisabled) e.currentTarget.style.backgroundColor = '#1a3a5c';
          }}
          onMouseLeave={e => {
            if (!nextDisabled) e.currentTarget.style.backgroundColor = '#0C1E35';
          }}
        >
          {nextLabel}
          <ChevronRight style={{ width: 14, height: 14 }} />
        </button>
      ) : (
        <div style={{ width: 90 }} />
      )}
    </div>
  );
}