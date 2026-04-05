// ═══════════════════════════════════════════════════════════════════
// STORAGE SERVICE — IndexedDB (menggantikan localStorage)
// Kapasitas: puluhan GB vs localStorage yang hanya 5-10MB
// ═══════════════════════════════════════════════════════════════════

const DB_NAME = 'aexon_storage';
const DB_VERSION = 1;
const STORE_NAME = 'user_data';

// ── IndexedDB helpers ───────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key: string): Promise<string | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(key);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}

async function idbSet(key: string, value: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(value, key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function idbGetAllKeys(): Promise<string[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAllKeys();
    request.onsuccess = () => resolve(request.result as string[]);
    request.onerror = () => reject(request.error);
  });
}

// ── Encryption (tetap sama) ─────────────────────────────────────────

function xorCipherLegacy(data: string, key: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

function getEncryptionKeyLegacy(userId: string): string {
  let hash = 0;
  const str = `aexon_${userId}_key_v1`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `AXN${Math.abs(hash).toString(36)}`;
}

function decryptLegacyXor(raw: string, userId: string): string | null {
  try {
    const key = getEncryptionKeyLegacy(userId);
    return xorCipherLegacy(atob(raw), key);
  } catch {
    return null;
  }
}

async function deriveKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`aexon_${userId}`),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: encoder.encode('aexon_salt_v2'), iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(data: string, userId: string): Promise<string> {
  const key = await deriveKey(userId);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(data);
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const stored = { v: 2, iv: Array.from(iv), data: Array.from(new Uint8Array(encrypted)) };
  return JSON.stringify(stored);
}

export async function decryptData(data: string, userId: string): Promise<string> {
  try {
    const parsed = JSON.parse(data);
    if (parsed.v === 2 && parsed.iv && parsed.data) {
      const key = await deriveKey(userId);
      const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: new Uint8Array(parsed.iv) },
        key,
        new Uint8Array(parsed.data)
      );
      return new TextDecoder().decode(decrypted);
    }
    return data;
  } catch {
    const legacy = decryptLegacyXor(data, userId);
    if (legacy) {
      try {
        JSON.parse(legacy);
        return legacy;
      } catch { /* not valid legacy */ }
    }
    return data;
  }
}

// ── Public API (interface tetap sama, backend pindah ke IndexedDB) ──

export async function saveUserData(userId: string, dataKey: string, data: any): Promise<void> {
  const json = JSON.stringify(data);
  const encrypted = await encryptData(json, userId);
  const storageKey = `aexon_${dataKey}_${userId}`;

  // Simpan ke IndexedDB (kapasitas besar)
  await idbSet(storageKey, encrypted);

  // Hapus dari localStorage kalau masih ada (migrasi)
  try { localStorage.removeItem(storageKey); } catch {}
}

export async function loadUserData<T = any>(userId: string, dataKey: string): Promise<T | null> {
  const storageKey = `aexon_${dataKey}_${userId}`;

  // 1. Coba dari IndexedDB dulu
  const idbRaw = await idbGet(storageKey);
  if (idbRaw) {
    try {
      const decrypted = await decryptData(idbRaw, userId);
      return JSON.parse(decrypted) as T;
    } catch (decryptErr) {
      // Decryption failed — try as unencrypted data (legacy migration)
      try { return JSON.parse(idbRaw) as T; } catch {
        console.warn(`[Storage] Data corrupt untuk key ${storageKey} — decrypt & parse gagal`);
      }
    }
  }

  // 2. Fallback ke localStorage (data lama sebelum migrasi)
  const lsRaw = localStorage.getItem(storageKey);
  if (lsRaw) {
    try {
      const decrypted = await decryptData(lsRaw, userId);
      const result = JSON.parse(decrypted) as T;
      // Migrasi: pindahkan ke IndexedDB, hapus dari localStorage
      try {
        await saveUserData(userId, dataKey, result);
      } catch { /* migrasi gagal, non-critical */ }
      return result;
    } catch {
      try { return JSON.parse(lsRaw) as T; } catch { return null; }
    }
  }

  // 3. Legacy key format (aexon_sessions_userId tanpa prefix)
  if (dataKey === 'sessions') {
    const legacyRaw = localStorage.getItem(`aexon_sessions_${userId}`);
    if (legacyRaw) {
      try {
        const result = JSON.parse(legacyRaw) as T;
        // Migrasi ke IndexedDB
        try { await saveUserData(userId, dataKey, result); } catch {}
        return result;
      } catch { return null; }
    }
  }

  return null;
}

export async function deleteUserData(userId: string, dataKey: string): Promise<void> {
  const storageKey = `aexon_${dataKey}_${userId}`;
  await idbDelete(storageKey);
  try { localStorage.removeItem(storageKey); } catch {}
}

// ── Storage usage info ──────────────────────────────────────────────

export function getLocalStorageUsage(): { usedMB: number; usedFormatted: string } {
  let total = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      total += (localStorage.getItem(key) || '').length;
      total += key.length;
    }
  }
  const usedMB = total / (1024 * 1024);
  return {
    usedMB,
    usedFormatted: usedMB < 1 ? `${(usedMB * 1024).toFixed(0)} KB` : `${usedMB.toFixed(1)} MB`
  };
}

export async function getStorageUsage(): Promise<{ usedMB: number; usedFormatted: string }> {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      const usedMB = (estimate.usage || 0) / (1024 * 1024);
      return {
        usedMB,
        usedFormatted: usedMB < 1 ? `${(usedMB * 1024).toFixed(0)} KB`
          : usedMB >= 1024 ? `${(usedMB / 1024).toFixed(1)} GB`
          : `${usedMB.toFixed(1)} MB`
      };
    }
  } catch {}
  return getLocalStorageUsage();
}

export function getEncryptionKey(userId: string): string {
  return userId;
}

// ── Patient Registry (IndexedDB, offline-first) ───────────────────��

export interface StoredPatient {
  rmNumber: string;
  fullName: string;
  gender: 'Laki-laki' | 'Perempuan';
  dateOfBirth: string;
  diagnosis: string;
  diagnosisIcd10: string;
  differentialDiagnosis: string;
  differentialDiagnosisIcd10: string;
  icd9Codes: string[];
  notes: string;
  updatedAt: string;
}

function patientStorageKey(userId: string): string {
  return `aexon_patients_${userId}`;
}

async function loadPatientMap(userId: string): Promise<Record<string, StoredPatient>> {
  const raw = await idbGet(patientStorageKey(userId));
  if (!raw) return {};
  try {
    const decrypted = await decryptData(raw, userId);
    return JSON.parse(decrypted) as Record<string, StoredPatient>;
  } catch {
    try { return JSON.parse(raw) as Record<string, StoredPatient>; } catch { return {}; }
  }
}

async function savePatientMap(userId: string, map: Record<string, StoredPatient>): Promise<void> {
  const json = JSON.stringify(map);
  const encrypted = await encryptData(json, userId);
  await idbSet(patientStorageKey(userId), encrypted);
}

export async function upsertPatientLocal(userId: string, patient: StoredPatient): Promise<void> {
  const map = await loadPatientMap(userId);
  map[patient.rmNumber] = { ...patient, updatedAt: new Date().toISOString() };
  await savePatientMap(userId, map);
}

export async function lookupPatientByRM(userId: string, rmNumber: string): Promise<StoredPatient | null> {
  const map = await loadPatientMap(userId);
  return map[rmNumber] || null;
}

export async function getAllPatients(userId: string): Promise<StoredPatient[]> {
  const map = await loadPatientMap(userId);
  return Object.values(map);
}