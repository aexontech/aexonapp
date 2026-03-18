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

export async function saveUserData(userId: string, dataKey: string, data: any): Promise<void> {
  const json = JSON.stringify(data);
  const encrypted = await encryptData(json, userId);
  localStorage.setItem(`aexon_${dataKey}_${userId}`, encrypted);
}

export async function loadUserData<T = any>(userId: string, dataKey: string): Promise<T | null> {
  const raw = localStorage.getItem(`aexon_${dataKey}_${userId}`);
  if (!raw) {
    if (dataKey === 'sessions') {
      const legacyRaw = localStorage.getItem(`aexon_sessions_${userId}`);
      if (legacyRaw) {
        try {
          return JSON.parse(legacyRaw) as T;
        } catch {
          return null;
        }
      }
    }
    return null;
  }
  try {
    const decrypted = await decryptData(raw, userId);
    const result = JSON.parse(decrypted) as T;
    let isV2 = false;
    try {
      const parsed = JSON.parse(raw);
      isV2 = parsed?.v === 2;
    } catch { /* raw is not JSON (legacy base64) */ }
    if (!isV2) {
      try { await saveUserData(userId, dataKey, result); } catch { /* migration failed, non-critical */ }
    }
    return result;
  } catch {
    try {
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  }
}

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

export function getEncryptionKey(userId: string): string {
  return userId;
}
