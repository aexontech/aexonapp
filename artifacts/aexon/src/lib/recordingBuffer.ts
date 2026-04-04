/**
 * recordingBuffer.ts
 *
 * Menyimpan chunk video ke IndexedDB secara real-time selama recording.
 * Setiap chunk ditulis ke disk setiap N detik (timeslice),
 * sehingga kalau terjadi force exit / crash, video dapat dipulihkan
 * sampai chunk terakhir yang berhasil tersimpan.
 *
 * Alur:
 *   startRecordingBuffer(recordingId, mimeType)
 *   → tiap 5 detik: appendChunk(recordingId, chunk)
 *   → stop normal: reconstructVideo(recordingId) → Blob, lalu clearBuffer(recordingId)
 *   → force exit: chunks aman di disk, dipulihkan saat resume
 */

const DB_NAME = 'aexon_recording_buffer';
const DB_VERSION = 1;
const CHUNKS_STORE = 'chunks';
const META_STORE = 'meta';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChunkRecord {
  id?: number;           // auto-increment primary key
  recordingId: string;   // pengikat semua chunk satu recording
  chunkIndex: number;    // urutan chunk (untuk reconstruct yang benar)
  data: Blob;
}

interface RecordingMeta {
  recordingId: string;   // primary key
  userId: string;
  mimeType: string;
  startedAt: string;
}

export interface RecoveredVideo {
  recordingId: string;
  blob: Blob;
  mimeType: string;
  startedAt: string;
}

// ─── IndexedDB setup ──────────────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;

      // Store chunks dengan auto-increment + index recordingId
      if (!db.objectStoreNames.contains(CHUNKS_STORE)) {
        const store = db.createObjectStore(CHUNKS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        store.createIndex('byRecordingId', 'recordingId', { unique: false });
      }

      // Store metadata recording (mimeType, userId, dll)
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE, { keyPath: 'recordingId' });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Inisialisasi buffer untuk recording baru.
 * Dipanggil sebelum recorder.start().
 */
export async function startRecordingBuffer(
  recordingId: string,
  userId: string,
  mimeType: string,
): Promise<void> {
  try {
    const db = await openDB();
    const meta: RecordingMeta = {
      recordingId,
      userId,
      mimeType,
      startedAt: new Date().toISOString(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      const store = tx.objectStore(META_STORE);
      const req = store.put(meta);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    console.log(`[RecordingBuffer] Buffer dimulai: ${recordingId}`);
  } catch (err) {
    console.error('[RecordingBuffer] Gagal inisialisasi buffer:', err);
  }
}

/**
 * Simpan satu chunk video ke IndexedDB.
 * Dipanggil di ondataavailable setiap timeslice.
 */
export async function appendChunk(
  recordingId: string,
  chunkIndex: number,
  data: Blob,
): Promise<void> {
  try {
    if (data.size === 0) return;
    const db = await openDB();
    const chunk: ChunkRecord = { recordingId, chunkIndex, data };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CHUNKS_STORE, 'readwrite');
      const store = tx.objectStore(CHUNKS_STORE);
      const req = store.add(chunk);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.error('[RecordingBuffer] Gagal menyimpan chunk:', err);
  }
}

/**
 * Gabungkan semua chunk menjadi satu Blob video.
 * Dipanggil setelah recording stop (baik normal maupun recovery).
 * Mengembalikan null kalau tidak ada chunks.
 */
export async function reconstructVideo(
  recordingId: string,
): Promise<Blob | null> {
  try {
    const db = await openDB();

    // Ambil semua chunk untuk recordingId ini
    const chunks = await new Promise<ChunkRecord[]>((resolve, reject) => {
      const tx = db.transaction(CHUNKS_STORE, 'readonly');
      const store = tx.objectStore(CHUNKS_STORE);
      const index = store.index('byRecordingId');
      const req = index.getAll(recordingId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    if (chunks.length === 0) return null;

    // Urutkan berdasarkan chunkIndex sebelum digabung
    chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

    // Ambil mimeType dari meta
    const meta = await new Promise<RecordingMeta | undefined>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const req = store.get(recordingId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    const mimeType = meta?.mimeType || 'video/mp4';
    const blob = new Blob(chunks.map((c) => c.data), { type: mimeType });

    console.log(
      `[RecordingBuffer] Video dipulihkan: ${chunks.length} chunks, ${(blob.size / 1024 / 1024).toFixed(1)} MB`,
    );

    return blob;
  } catch (err) {
    console.error('[RecordingBuffer] Gagal reconstruct video:', err);
    return null;
  }
}

/**
 * Hapus semua data buffer untuk recording tertentu.
 * Dipanggil setelah recording selesai (normal) atau setelah recovery.
 */
export async function clearBuffer(recordingId: string): Promise<void> {
  try {
    const db = await openDB();

    // Hapus semua chunks
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(CHUNKS_STORE, 'readwrite');
      const store = tx.objectStore(CHUNKS_STORE);
      const index = store.index('byRecordingId');
      const req = index.getAllKeys(recordingId);
      req.onsuccess = () => {
        const keys = req.result;
        let remaining = keys.length;
        if (remaining === 0) { resolve(); return; }
        for (const key of keys) {
          const delReq = store.delete(key);
          delReq.onsuccess = () => {
            remaining--;
            if (remaining === 0) resolve();
          };
          delReq.onerror = () => reject(delReq.error);
        }
      };
      req.onerror = () => reject(req.error);
    });

    // Hapus metadata
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readwrite');
      const store = tx.objectStore(META_STORE);
      const req = store.delete(recordingId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });

    console.log(`[RecordingBuffer] Buffer dihapus: ${recordingId}`);
  } catch (err) {
    console.error('[RecordingBuffer] Gagal hapus buffer:', err);
  }
}

/**
 * Cek apakah ada recording yang tidak selesai untuk user tertentu.
 * Digunakan saat resume untuk mendeteksi video yang perlu dipulihkan.
 * Mengembalikan array recordingId yang belum bersih.
 */
export async function getPendingRecordings(
  userId: string,
): Promise<RecoveredVideo[]> {
  try {
    const db = await openDB();

    // Ambil semua meta recordings
    const allMeta = await new Promise<RecordingMeta[]>((resolve, reject) => {
      const tx = db.transaction(META_STORE, 'readonly');
      const store = tx.objectStore(META_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    // Filter yang punya userId ini
    const userMeta = allMeta.filter((m) => m.userId === userId);
    if (userMeta.length === 0) return [];

    // Reconstruct setiap recording
    const recovered: RecoveredVideo[] = [];
    for (const meta of userMeta) {
      const blob = await reconstructVideo(meta.recordingId);
      if (blob && blob.size > 0) {
        recovered.push({
          recordingId: meta.recordingId,
          blob,
          mimeType: meta.mimeType,
          startedAt: meta.startedAt,
        });
      }
    }

    return recovered;
  } catch (err) {
    console.error('[RecordingBuffer] Gagal cek pending recordings:', err);
    return [];
  }
}