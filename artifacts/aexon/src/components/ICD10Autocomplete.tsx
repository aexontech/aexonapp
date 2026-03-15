import React, { useState, useRef, useEffect } from 'react';
import { searchICD10, IcdEntry } from '../data/icd10';

interface ICD10AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

function highlightMatch(text: string, query: string) {
  if (!query || query.length < 2) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark style={{ backgroundColor: '#FEF08A', color: '#0F172A', borderRadius: 2, padding: '0 2px' }}>{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function ICD10Autocomplete({
  value, onChange, placeholder = 'Cari diagnosis ICD-10...', label, required, className = ''
}: ICD10AutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<IcdEntry[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [selected, setSelected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length >= 2 && !selected) {
      setResults(searchICD10(query, 20));
      setOpen(true);
      setHighlighted(0);
    } else {
      setResults([]);
      setOpen(false);
    }
  }, [query, selected]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSelect = (entry: IcdEntry) => {
    const val = `${entry.code} - ${entry.display}`;
    setQuery(val);
    onChange(val);
    setSelected(true);
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setHighlighted(h => Math.min(h + 1, results.length - 1)); }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setHighlighted(h => Math.max(h - 1, 0)); }
    if (e.key === 'Enter' && results[highlighted]) { e.preventDefault(); handleSelect(results[highlighted]); }
    if (e.key === 'Escape') setOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', overflow: 'visible' }} className={className}>
      {label && (
        <label style={{ fontSize: 11, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
          {label} {required && <span style={{ color: '#EF4444' }}>*</span>}
        </label>
      )}
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setSelected(false); onChange(e.target.value); }}
        onKeyDown={handleKeyDown}
        onFocus={() => query.length >= 2 && !selected && setOpen(true)}
        placeholder={placeholder}
        required={required}
        className="input-base"
      />
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', zIndex: 9999, width: '100%', marginTop: 4,
          backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxHeight: 240, overflowY: 'auto',
        }}>
          <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
            {results.map((entry, idx) => (
              <li
                key={entry.code}
                onMouseDown={() => handleSelect(entry)}
                style={{
                  padding: '10px 16px', cursor: 'pointer', fontSize: 13,
                  transition: 'background-color 150ms',
                  backgroundColor: idx === highlighted ? '#EFF6FF' : 'transparent',
                }}
                onMouseEnter={e => { if (idx !== highlighted) e.currentTarget.style.backgroundColor = '#F8FAFC'; }}
                onMouseLeave={e => { if (idx !== highlighted) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontWeight: 900, color: '#0C1E35', fontSize: 12, fontFamily: 'monospace', flexShrink: 0, marginTop: 2, minWidth: 56 }}>
                    {highlightMatch(entry.code, query)}
                  </span>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A', lineHeight: 1.4 }}>
                    {highlightMatch(entry.display, query)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && results.length === 0 && query.length >= 2 && (
        <div style={{
          position: 'absolute', zIndex: 9999, width: '100%', marginTop: 4,
          backgroundColor: 'white', border: '1px solid #E2E8F0', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          <div style={{ padding: '10px 16px', fontSize: 12, color: '#64748B', fontStyle: 'italic' }}>Tidak ditemukan. Ketik diagnosis secara manual.</div>
        </div>
      )}
    </div>
  );
}
