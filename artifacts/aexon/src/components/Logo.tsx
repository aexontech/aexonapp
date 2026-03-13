import React from 'react';

const C = {
  ink:   "#0C1E35",
  blue:  "#1A52A8",
  white: "#FFFFFF",
  frost: "#EBF4F8",
  muted: "#7A94A8",
};

interface LogoProps {
  bg?: string;
  fg?: string;
  dot?: string;
  mSize?: number;
  wSize?: number;
  className?: string;
}

export const Monogram = ({ bg = C.white, fg = C.ink, dot = C.blue, size = 100 }) => {
  const cx = 50, cy = 50;
  const r = 28; // radius orbit modul
  const count = 6;
  const step = (2 * Math.PI) / count;
  const moduleH = 18;
  const hw = 6;

  const modules = Array.from({ length: count }, (_, i) => {
    const angle = i * step - Math.PI / 2; // mulai dari atas
    const mx = cx + r * Math.cos(angle);
    const my = cy + r * Math.sin(angle);
    const rot = (angle * 180) / Math.PI + 90;

    return { mx, my, rot, i };
  });

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {modules.map(({ mx, my, rot, i }) => (
        <g key={i} transform={`translate(${mx},${my}) rotate(${rot})`}>
          {/* Batang utama */}
          <rect x={-hw/2} y={-moduleH/2} width={hw} height={moduleH} rx="2" fill={fg}/>
          {/* Hook ke kanan — crossbar A sekaligus pengunci ke modul sebelah */}
          <rect x={-hw/2} y={-2} width={hw + 8} height={hw - 1} rx="1.5" fill={fg}/>
        </g>
      ))}
      <circle cx={cx} cy={cy} r="9"  fill={bg}/>
      <circle cx={cx} cy={cy} r="4"  fill={dot}/>
    </svg>
  );
};

export const Word = ({ color = C.ink, size = 28 }) => (
  <svg height={size} viewBox="0 0 130 32" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ height: size, width: 'auto', overflow: 'visible' }}>
    <text x="0" y="26" fontFamily="'Outfit', sans-serif" fontWeight="600" fontSize="28" fill={color} letterSpacing="-0.3">Aexon</text>
  </svg>
);

export const Pattern = ({ className = "" }) => (
  <svg className={`absolute inset-0 w-full h-full opacity-[0.03] pointer-events-none ${className}`} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
      <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.5"/>
    </pattern>
    <rect width="100" height="100" fill="url(#grid)" />
    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="0.1" />
    <circle cx="50" cy="50" r="30" stroke="currentColor" strokeWidth="0.1" />
    <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="0.1" />
  </svg>
);

export const Logo = ({ bg = C.white, fg = C.ink, dot = C.blue, mSize = 52, wSize = 26, className = "", showPattern = false }: LogoProps & { showPattern?: boolean }) => (
  <div className={`flex items-center ${wSize > 0 ? 'gap-3' : ''} relative ${className}`}>
    {showPattern && <Pattern className="text-blue-600 scale-150" />}
    <Monogram bg={bg} fg={fg} dot={dot} size={mSize} />
    {wSize > 0 && <Word color={fg} size={wSize} />}
  </div>
);
