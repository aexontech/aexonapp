import React, { useState, useRef, useCallback } from 'react';
import { LEGAL_FULL_TEXT } from '../data/legalText';

interface EulaModalProps {
  onAccept: () => void;
  onDecline: () => void;
}

const FONT = "'Plus Jakarta Sans', sans-serif";

/**
 * Parse the legal text into structured sections for rendering.
 * Detects: part headers (═══), numbered headings (e.g. "1. DEFINISI"),
 * sub-items (e.g. "1.1.", "(a)"), and body paragraphs.
 */
function parseLegalSections(text: string) {
  const lines = text.split('\n');
  const elements: { type: 'title' | 'version' | 'part' | 'heading' | 'subheading' | 'item' | 'paragraph' | 'gap'; text: string }[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trimEnd();

    // Skip separator lines
    if (/^[═]{4,}$/.test(line)) {
      i++;
      continue;
    }

    // Empty line → gap
    if (line.trim() === '') {
      // Don't add consecutive gaps
      if (elements.length > 0 && elements[elements.length - 1].type !== 'gap') {
        elements.push({ type: 'gap', text: '' });
      }
      i++;
      continue;
    }

    // First line = title
    if (i <= 1 && line.startsWith('SYARAT DAN KETENTUAN')) {
      elements.push({ type: 'title', text: line });
      i++;
      continue;
    }

    // Version line
    if (line.startsWith('Versi ')) {
      elements.push({ type: 'version', text: line });
      i++;
      continue;
    }

    // Part headers (BAGIAN I, II, III, IV, V)
    if (/^BAGIAN\s+[IVX]+\s+—/.test(line)) {
      elements.push({ type: 'part', text: line });
      i++;
      continue;
    }

    // Main section headings: "1. TITLE", "12. TITLE" etc (all caps after number)
    if (/^\d{1,2}\.\s+[A-Z]/.test(line) && line === line.toUpperCase().replace(/[a-z]/g, c => c.toUpperCase()) && !/^\d+\.\d+/.test(line)) {
      // Check: is it truly a heading (no lowercase except after specific patterns)?
      const headingMatch = line.match(/^(\d{1,2})\.\s+(.+)/);
      if (headingMatch && headingMatch[2] === headingMatch[2].toUpperCase()) {
        elements.push({ type: 'heading', text: line });
        i++;
        continue;
      }
    }

    // Numbered headings with mixed case: "9. BATASAN TANGGUNG JAWAB..."
    if (/^\d{1,2}\.\s+[A-Z]{2,}/.test(line)) {
      elements.push({ type: 'heading', text: line });
      i++;
      continue;
    }

    // Sub-section headings: "1.1.", "12.3.", "7.1a."
    if (/^\d{1,2}\.\d{1,2}[a-z]?\.\s+/.test(line)) {
      elements.push({ type: 'subheading', text: line });
      i++;
      continue;
    }

    // Lettered items: "(a)", "(b)", etc.
    if (/^\([a-z]\)\s+/.test(line) || /^\([ivx]+\)\s+/.test(line)) {
      elements.push({ type: 'item', text: line });
      i++;
      continue;
    }

    // Copyright line at end
    if (line.startsWith('\u00A9') || line.startsWith('©')) {
      elements.push({ type: 'version', text: line });
      i++;
      continue;
    }

    // Everything else is a paragraph
    elements.push({ type: 'paragraph', text: line });
    i++;
  }

  return elements;
}

const sections = parseLegalSections(LEGAL_FULL_TEXT);

function LegalContent({ style }: { style?: React.CSSProperties }) {
  return (
    <div style={{ fontFamily: FONT, ...style }}>
      {sections.map((el, idx) => {
        switch (el.type) {
          case 'title':
            return (
              <h1 key={idx} style={{
                fontSize: 18, fontWeight: 800, color: '#0C1E35',
                marginBottom: 4, lineHeight: 1.3, fontFamily: FONT,
              }}>
                {el.text}
              </h1>
            );
          case 'version':
            return (
              <p key={idx} style={{
                fontSize: 12, color: '#64748B', marginBottom: 16, fontFamily: FONT,
              }}>
                {el.text}
              </p>
            );
          case 'part':
            return (
              <div key={idx} style={{
                marginTop: 28, marginBottom: 12, paddingBottom: 8,
                borderBottom: '2px solid #0C1E35',
              }}>
                <h2 style={{
                  fontSize: 15, fontWeight: 800, color: '#0C1E35',
                  letterSpacing: '0.02em', fontFamily: FONT, margin: 0,
                }}>
                  {el.text}
                </h2>
              </div>
            );
          case 'heading':
            return (
              <h3 key={idx} style={{
                fontSize: 14, fontWeight: 700, color: '#0C1E35',
                marginTop: 20, marginBottom: 8, fontFamily: FONT,
                lineHeight: 1.4,
              }}>
                {el.text}
              </h3>
            );
          case 'subheading':
            return (
              <h4 key={idx} style={{
                fontSize: 13, fontWeight: 600, color: '#1E293B',
                marginTop: 14, marginBottom: 6, fontFamily: FONT,
                lineHeight: 1.5,
              }}>
                {el.text}
              </h4>
            );
          case 'item':
            return (
              <p key={idx} style={{
                fontSize: 12.5, color: '#334155', lineHeight: 1.7,
                marginBottom: 3, paddingLeft: 20, fontFamily: FONT,
              }}>
                {el.text}
              </p>
            );
          case 'gap':
            return <div key={idx} style={{ height: 8 }} />;
          case 'paragraph':
          default:
            return (
              <p key={idx} style={{
                fontSize: 12.5, color: '#334155', lineHeight: 1.7,
                marginBottom: 6, fontFamily: FONT,
              }}>
                {el.text}
              </p>
            );
        }
      })}
    </div>
  );
}

export { LegalContent };

export default function EulaModal({ onAccept, onDecline }: EulaModalProps) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [declined, setDeclined] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(() => {
    if (scrollRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      if (scrollTop + clientHeight >= scrollHeight - 40) {
        setHasScrolledToBottom(true);
      }
    }
  }, []);

  if (declined) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 32, fontFamily: FONT,
      }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <p style={{ fontSize: 13, color: '#64748B' }}>
            Anda tidak menyetujui Syarat & Ketentuan. Tutup aplikasi untuk keluar.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#F8FAFC',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20, fontFamily: FONT,
    }}>
      <div style={{
        width: '100%', maxWidth: 720,
        backgroundColor: '#fff',
        borderRadius: 16,
        border: '1px solid #E2E8F0',
        boxShadow: '0 8px 40px rgba(12,30,53,0.08)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '92vh',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 28px',
          borderBottom: '1px solid #E8ECF1',
          flexShrink: 0,
        }}>
          <h1 style={{
            fontSize: 18, fontWeight: 800, color: '#0C1E35',
            margin: '0 0 4px', fontFamily: FONT,
          }}>
            Syarat & Ketentuan Penggunaan
          </h1>
          <p style={{
            fontSize: 12, color: '#94A3B8', margin: 0, fontFamily: FONT,
          }}>
            Versi 2.0 | April 2026 — Harap baca seluruh dokumen sebelum melanjutkan
          </p>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          style={{
            flex: 1, overflowY: 'auto',
            padding: '24px 28px',
            minHeight: 0,
          }}
        >
          <LegalContent />
        </div>

        {/* Footer */}
        <div style={{
          padding: '16px 28px 20px',
          borderTop: '1px solid #E8ECF1',
          backgroundColor: '#FAFBFC',
          flexShrink: 0,
        }}>
          {!hasScrolledToBottom && (
            <p style={{
              fontSize: 12, color: '#94A3B8', textAlign: 'center',
              margin: '0 0 12px', fontFamily: FONT,
            }}>
              Scroll sampai akhir dokumen untuk melanjutkan
            </p>
          )}

          {hasScrolledToBottom && (
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              cursor: 'pointer', marginBottom: 14,
            }}>
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                style={{
                  width: 18, height: 18, marginTop: 2,
                  accentColor: '#0D9488', cursor: 'pointer',
                  flexShrink: 0,
                }}
              />
              <span style={{
                fontSize: 12.5, color: '#334155', lineHeight: 1.5,
                fontFamily: FONT,
              }}>
                Saya telah membaca dan menyetujui Syarat & Ketentuan, Kebijakan Privasi, Kebijakan Akun, dan EULA Aexon
              </span>
            </label>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button
              onClick={onAccept}
              disabled={!hasScrolledToBottom || !agreed}
              style={{
                width: '100%', padding: '13px 0',
                fontSize: 14, fontWeight: 700, fontFamily: FONT,
                border: 'none', borderRadius: 10, cursor: (hasScrolledToBottom && agreed) ? 'pointer' : 'not-allowed',
                backgroundColor: (hasScrolledToBottom && agreed) ? '#0C1E35' : '#E2E8F0',
                color: (hasScrolledToBottom && agreed) ? '#fff' : '#94A3B8',
                transition: 'background-color 150ms',
              }}
              onMouseEnter={(e) => {
                if (hasScrolledToBottom && agreed) e.currentTarget.style.backgroundColor = '#1a3a5c';
              }}
              onMouseLeave={(e) => {
                if (hasScrolledToBottom && agreed) e.currentTarget.style.backgroundColor = '#0C1E35';
              }}
            >
              Setuju & Lanjutkan
            </button>
            <button
              onClick={() => { setDeclined(true); onDecline(); }}
              style={{
                width: '100%', padding: '10px 0',
                fontSize: 13, fontWeight: 500, fontFamily: FONT,
                border: 'none', borderRadius: 8,
                backgroundColor: 'transparent', color: '#94A3B8',
                cursor: 'pointer', transition: 'color 150ms',
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#64748B'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#94A3B8'}
            >
              Tidak Setuju
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
