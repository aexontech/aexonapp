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
      <mark className="bg-yellow-200 text-slate-900 rounded px-0.5">{text.slice(idx, idx + query.length)}</mark>
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
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em] ml-1 block mb-2">
          {label} {required && <span className="text-red-500">*</span>}
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
        className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-white text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0C1E35]/20 focus:border-[#0C1E35] transition-colors duration-150"
      />
      {open && results.length > 0 && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto">
          <ul>
            {results.map((entry, idx) => (
              <li
                key={entry.code}
                onMouseDown={() => handleSelect(entry)}
                className={`px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${idx === highlighted ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
              >
                <div className="flex items-start gap-3">
                  <span className="font-black text-[#0C1E35] text-xs font-mono shrink-0 mt-0.5 min-w-[3.5rem]">
                    {highlightMatch(entry.code, query)}
                  </span>
                  <div className="text-sm font-semibold text-slate-900 leading-tight">
                    {highlightMatch(entry.display, query)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {open && results.length === 0 && query.length >= 2 && (
        <div className="absolute z-[9999] w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl">
          <div className="px-4 py-3 text-xs text-slate-400 italic">Tidak ditemukan. Ketik diagnosis secara manual.</div>
        </div>
      )}
    </div>
  );
}
