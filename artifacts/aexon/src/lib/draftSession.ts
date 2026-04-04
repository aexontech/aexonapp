/**
 * draftSession.ts
 * 
 * Menyimpan sesi aktif yang belum diselesaikan ke IndexedDB.
 * Digunakan untuk resume setelah force exit / crash / logout paksa.
 * 
 * Menggunakan IndexedDB (bukan localStorage) karena:
 * - Bisa menyimpan binary Blob untuk video
 * - Tidak ada batasan ukuran ketat
 * - Tersedia di Electron renderer process
 */

import { PatientData, Capture } from '../types';

const DB_NAME = 'aexon_draft_db';
const DB_VERSION = 1;
const STORE_NAME = 'draft_sessions';

// ─── Internal types ───────────────────────────────────────────────────────────

interface StoredCapture {
  id: string;
  type: 'image' | 'video';
  /** Untuk image: base64 data URL string. Untuk video: Blob binary. */
  data: string | Blob;
  timestamp: string;
  caption?: string;
  originalUrl?: string;
  shapes?: any[];
}

interface DraftSessionData {
  userId: string;
  patientData: PatientData;
  captures: StoredCapture[];
  savedAt: string;
}

// ─── IndexedDB helpers ────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'userId' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Capture conversion ───────────────────────────────────────────────────────

/**
 * Konversi Capture dari React state ke format yang bisa disimpan di IndexedDB.
 * - Image (base64 data URL) → disimpan langsung sebagai string
 * - Video (blob URL) → fetch blob, simpan sebagai binary Blob
 */
async function captureToStorable(capture: Capture): Promise<StoredCapture | null> {
  try {
    if (capture.type === 'image') {
      return {
        id: capture.id,
        type: 'image',
        data: capture.url,
        timestamp: capture.timestamp instanceof Date
          ? capture.timestamp.toISOString()
          : capture.timestamp,
        caption: capture.caption,
        originalUrl: capture.originalUrl,
        shapes: capture.shapes,
      };
    } else {
      // Video: blob URL harus diambil datanya sekarang
      // karena blob URL mati setelah app restart
      let blob: Blob;
      try {
        const response = await fetch(capture.url);
        if (!response.ok) {
          console.warn(`[DraftSession] Blob fetch gagal (${response.status}) untuk capture ${capture.id} — video mungkin sudah expired`);
          return null;
        }
        blob = await response.blob();
      } catch (fetchErr) {
        console.warn(`[DraftSession] Blob URL expired/invalid untuk capture ${capture.id}:`, fetchErr);
        return null;
      }

      // Abaikan video kosong (bisa terjadi kalau force-stop recording terlalu cepat)
      if (blob.size === 0) return null;

      return {
        id: capture.id,
        type: 'video',
        data: blob,
        timestamp: capture.timestamp instanceof Date
          ? capture.timestamp.toISOString()
          : capture.timestamp,
        caption: capture.caption,
      };
    }
  } catch (err) {
    console.warn('[DraftSession] Gagal konversi capture:', capture.id, err);
    return null;
  }
}

/**
 * Konversi StoredCapture dari IndexedDB kembali ke Capture untuk React state.
 * - Image → gunakan data URL langsung
 * - Video → buat blob URL baru dari Blob yang tersimpan
 */
function storableToCapture(stored: StoredCapture): Capture {
  let url: string;

  if (stored.type === 'image') {
    url = stored.data as string;
  } else {
    // Buat blob URL baru — akan valid sampai app ditutup lagi
    url = URL.createObjectURL(stored.data as Blob);
  }

  return {
    id: stored.id,
    type: stored.type,
    url,
    timestamp: new Date(stored.timestamp),
    caption: stored.caption,
    originalUrl: stored.originalUrl,
    shapes: stored.shapes,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Simpan draft sesi aktif ke IndexedDB.
 * Dipanggil setiap kali captures berubah (foto diambil / video selesai direkam).
 */
export async function saveDraftSession(
  userId: string,
  patientData: PatientData,
  captures: Capture[],
): Promise<void> {
  try {
    if (captures.length === 0) return; // Tidak perlu simpan kalau belum ada media

    const storableResults = await Promise.all(captures.map(captureToStorable));
    const storableCaptures = storableResults.filter((c): c is StoredCapture => c !== null);
    const lostCount = storableResults.length - storableCaptures.length;
    if (lostCount > 0) {
      console.warn(`[DraftSession] ${lostCount} media gagal disimpan ke draft (blob URL expired)`);
    }

    const draft: DraftSessionData = {
      userId,
      patientData,
      captures: storableCaptures,
      savedAt: new Date().toISOString(),
    };

    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(draft);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    console.log(
      `[DraftSession] Draft tersimpan: ${storableCaptures.length} media`,
    );
  } catch (err) {
    console.error('[DraftSession] Gagal menyimpan draft:', err);
  }
}

/**
 * Muat draft sesi dari IndexedDB untuk user tertentu.
 * Kembalikan null jika tidak ada draft.
 */
export async function loadDraftSession(
  userId: string,
): Promise<{ patientData: PatientData; captures: Capture[]; savedAt: string } | null> {
  try {
    const db = await openDB();
    const draft = await new Promise<DraftSessionData | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(userId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      },
    );

    if (!draft) return null;

    // Discard drafts lebih tua dari 48 jam — kemungkinan sudah tidak relevan
    const draftAge = Date.now() - new Date(draft.savedAt).getTime();
    const MAX_DRAFT_AGE_MS = 48 * 60 * 60 * 1000;
    if (draftAge > MAX_DRAFT_AGE_MS) {
      console.warn(`[DraftSession] Draft expired (${Math.round(draftAge / 3600000)}h old) — discarding`);
      await clearDraftSession(userId);
      return null;
    }

    const captures = draft.captures.map(storableToCapture);
    return {
      patientData: draft.patientData,
      captures,
      savedAt: draft.savedAt,
    };
  } catch (err) {
    console.error('[DraftSession] Gagal memuat draft:', err);
    return null;
  }
}

/**
 * Hapus draft sesi dari IndexedDB.
 * Dipanggil saat sesi diselesaikan secara normal atau user memilih buang draft.
 */
export async function clearDraftSession(userId: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(userId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    console.log('[DraftSession] Draft dihapus');
  } catch (err) {
    console.error('[DraftSession] Gagal menghapus draft:', err);
  }
}

/**
 * Cek apakah ada draft sesi untuk user tertentu.
 */
export async function hasDraftSession(userId: string): Promise<boolean> {
  try {
    const db = await openDB();
    const draft = await new Promise<DraftSessionData | undefined>(
      (resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(userId);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      },
    );
    return !!draft;
  } catch {
    return false;
  }
}