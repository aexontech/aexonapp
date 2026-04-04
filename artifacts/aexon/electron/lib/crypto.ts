/**
 * Aexon Crypto Module
 * AES-256-GCM encryption/decryption with per-user key derivation
 *
 * File format: [IV 12 bytes] + [Auth Tag 16 bytes] + [Ciphertext]
 * Key: PBKDF2(password, salt, 100000, SHA-512) → 256-bit
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// ── Constants ─────────────────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;        // GCM recommended IV size
const TAG_LENGTH = 16;       // Auth tag size
const SALT_LENGTH = 32;      // Random salt per user
const KEY_LENGTH = 32;       // 256 bits
const ITERATIONS = 100_000;  // PBKDF2 iterations
const DIGEST = 'sha512';
const KEY_CHECK_PLAINTEXT = 'AEXON_KEY_CHECK_V1';

// ── Key Derivation ────────────────────────────────────────────────────────────

/**
 * Derive a 256-bit encryption key from password + salt
 */
export function deriveKey(password: string, salt: Buffer): Buffer {
  return crypto.pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST);
}

/**
 * Generate a random salt for a new user
 */
export function generateSalt(): Buffer {
  return crypto.randomBytes(SALT_LENGTH);
}

// ── Encrypt / Decrypt ─────────────────────────────────────────────────────────

/**
 * Encrypt data with AES-256-GCM
 * Returns: Buffer of [IV (12)] + [Tag (16)] + [Ciphertext]
 */
export function encrypt(data: Buffer, key: Buffer): Buffer {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });

  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  const tag = cipher.getAuthTag();

  // [IV] + [Tag] + [Ciphertext]
  return Buffer.concat([iv, tag, encrypted]);
}

/**
 * Decrypt data encrypted with encrypt()
 * Throws if key is wrong or data is tampered
 */
export function decrypt(encryptedData: Buffer, key: Buffer): Buffer {
  if (encryptedData.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error('Data terlalu pendek untuk didekripsi');
  }

  const iv = encryptedData.subarray(0, IV_LENGTH);
  const tag = encryptedData.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = encryptedData.subarray(IV_LENGTH + TAG_LENGTH);

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]);
}

// ── File Operations ───────────────────────────────────────────────────────────

/**
 * Encrypt and save data to a .enc file
 */
export function encryptToFile(filePath: string, data: Buffer, key: Buffer): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });

  const encrypted = encrypt(data, key);
  fs.writeFileSync(filePath, encrypted);
}

/**
 * Read and decrypt a .enc file
 */
export function decryptFromFile(filePath: string, key: Buffer): Buffer {
  const encrypted = fs.readFileSync(filePath);
  return decrypt(encrypted, key);
}

/**
 * Encrypt and save a string (e.g. JSON metadata)
 */
export function encryptStringToFile(filePath: string, text: string, key: Buffer): void {
  encryptToFile(filePath, Buffer.from(text, 'utf-8'), key);
}

/**
 * Read and decrypt a file as string
 */
export function decryptStringFromFile(filePath: string, key: Buffer): string {
  return decryptFromFile(filePath, key).toString('utf-8');
}

// ── User Setup ────────────────────────────────────────────────────────────────

/**
 * Setup encryption for a new user
 * Creates salt.bin and keycheck.enc in the user directory
 */
export function setupUserEncryption(userDir: string, password: string): Buffer {
  fs.mkdirSync(userDir, { recursive: true });

  // Generate and save salt
  const salt = generateSalt();
  fs.writeFileSync(path.join(userDir, 'salt.bin'), salt);

  // Derive key
  const key = deriveKey(password, salt);

  // Save key check file (to verify password on login)
  const checkData = Buffer.from(KEY_CHECK_PLAINTEXT, 'utf-8');
  encryptToFile(path.join(userDir, 'keycheck.enc'), checkData, key);

  return key;
}

/**
 * Verify password and return encryption key
 * Returns the key if password is correct, null if wrong
 */
export function verifyAndGetKey(userDir: string, password: string): Buffer | null {
  const saltPath = path.join(userDir, 'salt.bin');
  const checkPath = path.join(userDir, 'keycheck.enc');

  if (!fs.existsSync(saltPath) || !fs.existsSync(checkPath)) {
    return null; // User not set up yet
  }

  const salt = fs.readFileSync(saltPath);
  const key = deriveKey(password, salt);

  try {
    const decrypted = decryptFromFile(checkPath, key);
    if (decrypted.toString('utf-8') === KEY_CHECK_PLAINTEXT) {
      return key; // Password correct
    }
    return null;
  } catch {
    return null; // Wrong password — decryption fails
  }
}

/**
 * Check if a user has encryption set up
 */
export function isUserSetUp(userDir: string): boolean {
  return (
    fs.existsSync(path.join(userDir, 'salt.bin')) &&
    fs.existsSync(path.join(userDir, 'keycheck.enc'))
  );
}

// ── Stream Encryption (for large videos) ──────────────────────────────────────

/**
 * Encrypt a large file using streams (for videos)
 * Note: GCM doesn't support true streaming auth, so we process in chunks
 * For files > 100MB, consider chunked encryption with per-chunk auth tags
 */
export async function encryptFileStream(
  inputPath: string,
  outputPath: string,
  key: Buffer
): Promise<void> {
  const data = fs.readFileSync(inputPath); // TODO: For very large files, implement chunked
  const encrypted = encrypt(data, key);
  fs.writeFileSync(outputPath, encrypted);
}

export async function decryptFileStream(
  inputPath: string,
  outputPath: string,
  key: Buffer
): Promise<void> {
  const encrypted = fs.readFileSync(inputPath);
  const decrypted = decrypt(encrypted, key);
  fs.writeFileSync(outputPath, decrypted);
}
