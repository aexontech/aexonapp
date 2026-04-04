/**
 * electronStorage.ts
 *
 * Helper untuk simpan/muat session ke Electron encrypted disk storage.
 * Kalau bukan di Electron (Replit/browser), semua fungsi no-op / return null.
 *
 * === FLOW ===
 * 1. Session dimulai  → initSessionOnDisk()   → buat folder + metadata awal
 * 2. Foto diambil     → saveCaptureRealtime()  → simpan .enc ke disk langsung
 * 3. Video selesai    → saveCaptureRealtime()  → simpan .enc ke disk langsung
 * 4. Session selesai  → finalizeSessionOnDisk() → update status → 'completed'
 * 5. App restart      → loadSessionsFromDisk()  → muat semua (termasuk in_progress)
 */

import { Session, Capture, PatientData } from '../types';

export const isElectron = (): boolean => !!window.aexonStorage;

// ── Helper: konversi Capture ke bytes ─────────────────────────────────────────

async function captureToBytes(capture: Capture): Promise<{ bytes: Uint8Array; ext: string } | null> {
  try {
    if (capture.type === 'image' && capture.url.startsWith('data:')) {
      const base64 = capture.url.split(',')[1];
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return { bytes, ext: 'jpg' };
    }

    if (capture.type === 'video' && capture.url.startsWith('blob:')) {
      const response = await fetch(capture.url);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();
      return { bytes: new Uint8Array(buffer), ext: 'webm' };
    }

    return null;
  } catch (err) {
    console.warn(`[ElectronStorage] captureToBytes gagal (${capture.id}):`, err);
    return null;
  }
}

// ── Helper: buat metadata JSON dari capture list ──────────────────────────────

function buildMetaJson(
  sessionId: string,
  patient: PatientData,
  captures: Capture[],
  status: 'active' | 'completed',
  clinicalNotes?: string,
): string {
  return JSON.stringify({
    id: sessionId,
    date: new Date().toISOString(),
    patient,
    captures: captures.map(c => ({
      id: c.id,
      type: c.type,
      timestamp: c.timestamp instanceof Date ? c.timestamp.toISOString() : c.timestamp,
      caption: c.caption,
      flipped: c.flipped,
      shapes: c.shapes,
    })),
    clinicalNotes,
    status,
  });
}

// ── 1. Init Session On Disk ──────────────────────────────────────────────────

/**
 * Dipanggil saat EndoscopyApp mount (sesi dimulai).
 * Buat folder session + metadata awal dengan status 'active'.
 */
export async function initSessionOnDisk(
  sessionId: string,
  patient: PatientData,
): Promise<void> {
  if (!isElectron()) return;

  try {
    await window.aexonStorage!.createSessionDir(sessionId);

    const metaJson = buildMetaJson(sessionId, patient, [], 'active');
    await window.aexonStorage!.saveSessionMeta(sessionId, metaJson);

    console.log(`[ElectronStorage] Session ${sessionId} initialized on disk`);
  } catch (err) {
    console.error('[ElectronStorage] initSessionOnDisk gagal:', err);
  }
}

// ── 2. Save Single Capture (Real-time) ───────────────────────────────────────

/**
 * Dipanggil setiap kali foto diambil atau video selesai direkam.
 * Non-blocking — fire-and-forget, tidak block UI.
 */
export async function saveCaptureRealtime(
  sessionId: string,
  capture: Capture,
): Promise<void> {
  if (!isElectron()) return;

  try {
    const converted = await captureToBytes(capture);
    if (!converted) return;

    const { bytes, ext } = converted;
    if (bytes.length === 0) return;

    const saveResult = await window.aexonStorage!.saveCapture(sessionId, capture.id, bytes, ext);

    if (saveResult.error) {
      console.warn(`[ElectronStorage] saveCapture error (${capture.id}):`, saveResult.error);
    } else {
      const sizeMB = (bytes.length / 1024 / 1024).toFixed(1);
      console.log(`[ElectronStorage] Capture ${capture.id} saved (${sizeMB} MB)`);
    }
  } catch (err) {
    console.warn(`[ElectronStorage] saveCaptureRealtime gagal (${capture.id}):`, err);
  }
}

// ── 3. Update Session Metadata ───────────────────────────────────────────────

/**
 * Update metadata sesi di disk.
 * Dipanggil setiap kali captures berubah (foto baru, video selesai, caption diubah).
 * TIDAK menyimpan ulang binary — hanya metadata ringan.
 */
export async function updateSessionMeta(
  sessionId: string,
  patient: PatientData,
  captures: Capture[],
  status: 'active' | 'completed' = 'active',
  clinicalNotes?: string,
): Promise<void> {
  if (!isElectron()) return;

  try {
    const metaJson = buildMetaJson(sessionId, patient, captures, status, clinicalNotes);
    await window.aexonStorage!.saveSessionMeta(sessionId, metaJson);
  } catch (err) {
    console.warn('[ElectronStorage] updateSessionMeta gagal:', err);
  }
}

// ── 4. Finalize Session ──────────────────────────────────────────────────────

/**
 * Dipanggil saat sesi selesai — update status ke 'completed'.
 * Binary captures sudah tersimpan secara real-time,
 * jadi ini hanya update metadata (ringan).
 */
export async function finalizeSessionOnDisk(
  sessionId: string,
  patient: PatientData,
  captures: Capture[],
  clinicalNotes?: string,
): Promise<void> {
  if (!isElectron()) return;

  try {
    const metaJson = buildMetaJson(sessionId, patient, captures, 'completed', clinicalNotes);
    await window.aexonStorage!.saveSessionMeta(sessionId, metaJson);
    console.log(`[ElectronStorage] Session ${sessionId} finalized (${captures.length} captures)`);
  } catch (err) {
    console.error('[ElectronStorage] finalizeSessionOnDisk gagal:', err);
  }
}

// ── 5. Save Full Session (legacy — tetap ada untuk kompatibilitas) ────────────

/**
 * Simpan session lengkap ke disk (encrypted).
 * Masih dipakai sebagai fallback / one-shot save.
 */
export async function saveSessionToDisk(session: Session): Promise<void> {
  if (!isElectron()) return;

  try {
    await window.aexonStorage!.createSessionDir(session.id);

    // Simpan setiap capture ke disk
    for (const capture of session.captures) {
      try {
        const converted = await captureToBytes(capture);
        if (converted && converted.bytes.length > 0) {
          await window.aexonStorage!.saveCapture(session.id, capture.id, converted.bytes, converted.ext);
        }
      } catch (err) {
        console.warn(`[ElectronStorage] Skip capture ${capture.id}:`, err);
      }
    }

    // Simpan metadata (tanpa binary data)
    const metaJson = buildMetaJson(
      session.id,
      session.patient,
      session.captures,
      session.status,
      session.clinicalNotes,
    );
    await window.aexonStorage!.saveSessionMeta(session.id, metaJson);

    console.log(`[ElectronStorage] Session ${session.id} saved (${session.captures.length} captures)`);
  } catch (err) {
    console.error('[ElectronStorage] Failed to save session:', err);
  }
}

// ── 6. Load Sessions ─────────────────────────────────────────────────────────

/**
 * Muat semua session dari disk Electron.
 * Return null kalau bukan Electron (supaya fallback ke IndexedDB).
 * Termasuk session 'active' (in-progress) untuk recovery.
 */
export async function loadSessionsFromDisk(): Promise<Session[] | null> {
  if (!isElectron()) return null;

  try {
    const { sessions: metaList, error } = await window.aexonStorage!.loadAllSessions();
    if (error || !metaList || metaList.length === 0) return [];

    const sessions: Session[] = [];

    for (const metaJson of metaList) {
      try {
        const meta = JSON.parse(metaJson);

        // Muat setiap capture dari disk
        const captures: Capture[] = [];
        for (const capMeta of (meta.captures || [])) {
          try {
            const { data, error: loadErr } = await window.aexonStorage!.loadCapture(meta.id, capMeta.id);
            if (data && !loadErr) {
              let url: string;
              if (capMeta.type === 'image') {
                let binary = '';
                for (let i = 0; i < data.length; i++) binary += String.fromCharCode(data[i]);
                url = `data:image/jpeg;base64,${btoa(binary)}`;
              } else {
                const blob = new Blob([new Uint8Array(data)], { type: 'video/webm' });
                url = URL.createObjectURL(blob);
              }
              captures.push({
                id: capMeta.id,
                type: capMeta.type,
                url,
                timestamp: new Date(capMeta.timestamp),
                caption: capMeta.caption,
                flipped: capMeta.flipped,
                shapes: capMeta.shapes,
              });
            }
          } catch {
            console.warn(`[ElectronStorage] Skip capture ${capMeta.id}`);
          }
        }

        sessions.push({
          id: meta.id,
          date: new Date(meta.date),
          patient: meta.patient,
          captures,
          clinicalNotes: meta.clinicalNotes,
          status: meta.status || 'completed',
        });
      } catch {
        // Skip corrupted session
      }
    }

    // Urutkan terbaru dulu
    sessions.sort((a, b) => b.date.getTime() - a.date.getTime());
    return sessions;
  } catch (err) {
    console.error('[ElectronStorage] Failed to load sessions:', err);
    return [];
  }
}

// ── 7. Delete Session ────────────────────────────────────────────────────────

export async function deleteSessionFromDisk(sessionId: string): Promise<void> {
  if (!isElectron()) return;
  try {
    await window.aexonStorage!.deleteSession(sessionId);
  } catch (err) {
    console.error('[ElectronStorage] Failed to delete session:', err);
  }
}

// ── 8. Export Captures (decrypt → save ke folder pilihan user) ────────────────

/**
 * Export selected captures ke folder yang dipilih user.
 * Membuka dialog folder picker, decrypt file .enc, simpan sebagai .jpg/.mp4.
 * Return jumlah file yang berhasil di-export.
 */
export async function exportCapturesFromDisk(
  sessionId: string,
  captures: { id: string; type: string }[],
): Promise<{ success: boolean; exported?: number; error?: string }> {
  if (!isElectron()) return { success: false, error: 'Bukan Electron' };

  try {
    const result = await window.aexonStorage!.exportCaptures(sessionId, captures);
    if (result.success && result.exported !== undefined) {
      console.log(`[ElectronStorage] Exported ${result.exported}/${result.total} captures to ${result.targetDir}`);
    }
    return result;
  } catch (err) {
    console.error('[ElectronStorage] Export failed:', err);
    return { success: false, error: 'Export gagal' };
  }
}

// ── 9. Delete Single Capture ─────────────────────────────────────────────────

/**
 * Hapus satu capture dari disk.
 * Setelah delete, caller harus update session metadata via updateSessionMeta().
 */
export async function deleteCaptureFromDisk(
  sessionId: string,
  captureId: string,
): Promise<boolean> {
  if (!isElectron()) return false;

  try {
    const result = await window.aexonStorage!.deleteCapture(sessionId, captureId);
    if (result.success) {
      console.log(`[ElectronStorage] Capture ${captureId} deleted`);
    }
    return !!result.success;
  } catch (err) {
    console.error('[ElectronStorage] Delete capture failed:', err);
    return false;
  }
}