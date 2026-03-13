export function xorCipher(data: string, key: string): string {
  let result = '';
  for (let i = 0; i < data.length; i++) {
    result += String.fromCharCode(data.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return result;
}

export function getEncryptionKey(userId: string): string {
  let hash = 0;
  const str = `aexon_${userId}_key_v1`;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return `AXN${Math.abs(hash).toString(36)}`;
}

export function encryptData(data: string, key: string): string {
  return btoa(xorCipher(data, key));
}

export function decryptData(data: string, key: string): string {
  try {
    return xorCipher(atob(data), key);
  } catch {
    return data;
  }
}

export function saveUserData(userId: string, dataKey: string, data: any): void {
  const key = getEncryptionKey(userId);
  const json = JSON.stringify(data);
  const encrypted = encryptData(json, key);
  localStorage.setItem(`aexon_${dataKey}_${userId}`, encrypted);
}

export function loadUserData<T = any>(userId: string, dataKey: string): T | null {
  const raw = localStorage.getItem(`aexon_${dataKey}_${userId}`);
  if (!raw) {
    const legacyRaw = localStorage.getItem(`aexon_sessions_${userId}`);
    if (dataKey === 'sessions' && legacyRaw) {
      try {
        return JSON.parse(legacyRaw) as T;
      } catch {
        return null;
      }
    }
    return null;
  }
  try {
    const key = getEncryptionKey(userId);
    const decrypted = decryptData(raw, key);
    return JSON.parse(decrypted) as T;
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
