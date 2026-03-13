import React, { useState, useRef, useEffect } from 'react';
import { searchICD10, ICD10Entry } from '../data/icd10';

interface ICD10AutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  className?: string;
}

export default function ICD10Autocomplete({
  value, onChange, placeholder = 'Search ICD-10 diagnosis...', label, required, className = ''
}: ICD10AutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<ICD10Entry[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const [selected, setSelected] = useState<ICD10Entry | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length >= 2 && !selected) {
      setResults(searchICD10(query, 10));
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

  const handleSelect = (entry: ICD10Entry) => {
    const val = `${entry.code} - ${entry.display}`;
    setQuery(val);
    onChange(val);
    setSelected(entry);
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
        onChange={e => { setQuery(e.target.value); setSelected(null); onChange(e.target.value); }}
        onKeyDown={handleKeyDown}
        onFocus={() => query.length >= 2 && !selected && setOpen(true)}
        placeholder={placeholder}
        required={required}
        className="block w-full px-5 py-4 border border-slate-200 rounded-2xl bg-white text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500/50 transition-all font-semibold text-sm"
      />
      {selected && (
        <div className="mt-1 ml-1">
          <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-blue-50 border border-blue-100 text-[9px] font-black text-blue-600 uppercase tracking-widest">
            {selected.category}
          </span>
        </div>
      )}
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-2xl shadow-2xl shadow-slate-200/50 overflow-hidden">
          {results.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto">
              {results.map((entry, idx) => (
                <li
                  key={entry.code}
                  onMouseDown={() => handleSelect(entry)}
                  className={`px-4 py-3 cursor-pointer transition-colors border-b border-slate-50 last:border-0 ${idx === highlighted ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className="font-black text-blue-600 text-xs font-mono shrink-0 mt-0.5 min-w-[3rem]">{entry.code}</span>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 leading-tight">{entry.display}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{entry.category}</div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-4 py-3 text-xs text-slate-400 italic">No results. Type diagnosis manually.</div>
          )}
        </div>
      )}
    </div>
  );
}
