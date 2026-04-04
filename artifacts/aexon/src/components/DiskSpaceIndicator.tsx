import React, { useState, useEffect } from 'react';
import { HardDrive } from 'lucide-react';
import { getStorageUsage } from '../lib/storage';

const FONT = "'Plus Jakarta Sans', sans-serif";

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  const kb = bytes / 1024;
  return `${kb.toFixed(0)} KB`;
}

export default function DiskSpaceIndicator() {
  const [diskInfo, setDiskInfo] = useState<{
    used: number; free: number; total: number; path?: string; label: string;
  } | null>(null);

  useEffect(() => {
    const load = async () => {
      if (window.aexonStorage) {
        // Electron: info disk asli
        try {
          const info = await window.aexonStorage.getDiskInfo();
          if (info && info.total > 0) {
            setDiskInfo({
              used: info.used,
              free: info.free,
              total: info.total,
              path: info.path,
              label: 'Disk Penyimpanan',
            });
            return;
          }
        } catch {}
      }

      // Browser: estimasi IndexedDB
      try {
        const usage = await getStorageUsage();
        setDiskInfo({
          used: usage.usedMB * 1024 * 1024,
          free: 0,
          total: 0,
          label: 'Penyimpanan Browser',
        });
      } catch {}
    };
    load();
  }, []);

  if (!diskInfo) return (
    <div style={{
      backgroundColor: '#F8FAFC',
      borderRadius: 14,
      border: '1.5px solid #E8ECF1',
      padding: '18px 20px',
      fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <HardDrive style={{ width: 15, height: 15, color: '#94A3B8' }} />
        <span style={{ fontSize: 12, color: '#94A3B8' }}>Memuat info penyimpanan…</span>
      </div>
    </div>
  );

  const usedPercent = diskInfo.total > 0
    ? Math.round((diskInfo.used / diskInfo.total) * 100)
    : 0;

  const isLow = diskInfo.total > 0 && diskInfo.free < 10 * 1024 * 1024 * 1024; // < 10 GB
  const barColor = isLow ? '#EF4444' : '#0D9488';

  return (
    <div style={{
      backgroundColor: '#F8FAFC',
      borderRadius: 14,
      border: '1.5px solid #E8ECF1',
      padding: '18px 20px',
      fontFamily: FONT,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <HardDrive style={{ width: 15, height: 15, color: '#64748B' }} />
        <span style={{ fontSize: 12, fontWeight: 700, color: '#475569' }}>
          {diskInfo.label}
        </span>
      </div>

      {/* Progress bar */}
      {diskInfo.total > 0 && (
        <>
          <div style={{
            width: '100%', height: 8, backgroundColor: '#E8ECF1',
            borderRadius: 4, overflow: 'hidden', marginBottom: 10,
          }}>
            <div style={{
              height: '100%', width: `${Math.min(usedPercent, 100)}%`,
              backgroundColor: barColor, borderRadius: 4,
              transition: 'width 500ms ease',
            }} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#94A3B8' }}>
            <span>Terpakai: <strong style={{ color: '#475569' }}>{formatBytes(diskInfo.used)}</strong></span>
            <span>Tersedia: <strong style={{ color: isLow ? '#EF4444' : '#475569' }}>{formatBytes(diskInfo.free)}</strong></span>
          </div>
        </>
      )}

      {/* Browser: hanya tampil used */}
      {diskInfo.total === 0 && (
        <div style={{ fontSize: 12, color: '#64748B' }}>
          Terpakai: <strong style={{ color: '#0C1E35' }}>{formatBytes(diskInfo.used)}</strong>
        </div>
      )}

      {/* Path (Electron only) */}
      {diskInfo.path && (
        <div style={{
          marginTop: 10, fontSize: 11, color: '#94A3B8',
          fontFamily: 'monospace', wordBreak: 'break-all',
        }}>
          {diskInfo.path}
        </div>
      )}

      {/* Warning */}
      {isLow && (
        <div style={{
          marginTop: 10, padding: '8px 12px', borderRadius: 8,
          backgroundColor: '#FEF2F2', border: '1px solid #FECACA',
          fontSize: 11, color: '#DC2626', fontWeight: 600,
        }}>
          Ruang disk hampir penuh. Pertimbangkan untuk memindahkan data atau menghapus sesi lama.
        </div>
      )}
    </div>
  );
}