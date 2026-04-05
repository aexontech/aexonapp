import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { autoUpdater } from 'electron-updater';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import * as crypto from 'crypto';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

import {
  setupUserEncryption,
  verifyAndGetKey,
  isUserSetUp,
  encryptToFile,
  decryptFromFile,
  encryptStringToFile,
  decryptStringFromFile,
} from './lib/crypto';

// ── Config ────────────────────────────────────────────────────────────────────

const CONFIG_DIR = path.join(app.getPath('userData'), 'aexon');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

interface AexonConfig {
  storagePath: string;
  setupComplete: boolean;
  version: string;
}

function loadConfig(): AexonConfig | null {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch {}
  return null;
}

function saveConfig(config: AexonConfig): void {
  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

// ── In-memory key store (cleared on logout/quit) ──────────────────────────────

let activeUserId: string | null = null;
let activeKey: Buffer | null = null;

function clearKey(): void {
  activeUserId = null;
  activeKey = null;
}

// ── User directory: hashed folder names ───────────────────────────────────────

/**
 * Hash userId (email-based) ke string pendek agar folder tidak expose email.
 * Contoh: "juraganfoto62_gmail_com" → "a3f8c1d9e7b24f01"
 */
function hashUserId(userId: string): string {
  return crypto.createHash('sha256').update(userId).digest('hex').slice(0, 16);
}

function getUserDir(config: AexonConfig, userId: string): string {
  return path.join(config.storagePath, 'users', hashUserId(userId));
}

/**
 * Migrasi: kalau folder lama (nama email) masih ada, rename ke folder hash baru.
 * Jalan sekali saat initUser — data lama otomatis pindah.
 */
function migrateOldUserDir(config: AexonConfig, userId: string): void {
  const oldDir = path.join(config.storagePath, 'users', userId);
  const newDir = getUserDir(config, userId);

  // Kalau folder lama ada DAN folder baru belum ada → rename
  if (fs.existsSync(oldDir) && !fs.existsSync(newDir)) {
    try {
      fs.renameSync(oldDir, newDir);
      console.log(`[Aexon] Migrated user folder: ${userId} → ${hashUserId(userId)}`);
    } catch (err) {
      console.error('[Aexon] Migration failed:', err);
    }
  }
}

/**
 * Set folder sebagai hidden di Windows (attrib +h).
 * Supaya folder 'users' tidak gampang ditemukan di Explorer.
 */
function hideFolder(folderPath: string): void {
  if (os.platform() !== 'win32') return;
  try {
    execSync(`attrib +h "${folderPath}"`, { stdio: 'ignore' });
  } catch {}
}

// ── Window ────────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    title: 'Aexon',
    icon: path.join(__dirname, '../public/icon.png'),
    backgroundColor: '#0C1E35',
    show: false,
    webPreferences: {
      preload: app.isPackaged
        ? path.join(process.resourcesPath, 'preload.cjs')
        : path.join(__dirname, '../../electron/preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../public/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ── First Launch: Storage Path Selection ──────────────────────────────────────

async function firstLaunchSetup(): Promise<AexonConfig> {
  const existing = loadConfig();
  if (existing?.setupComplete) return existing;

  const result = await dialog.showOpenDialog({
    title: 'Pilih Lokasi Penyimpanan Data Aexon',
    message: 'Pilih folder untuk menyimpan data sesi, media, dan laporan.\nDisarankan drive dengan ruang kosong minimal 50 GB.',
    buttonLabel: 'Pilih Folder Ini',
    properties: ['openDirectory', 'createDirectory'],
    defaultPath: getDefaultStoragePath(),
  });

  let storagePath: string;
  if (result.canceled || !result.filePaths[0]) {
    storagePath = getDefaultStoragePath();
  } else {
    storagePath = path.join(result.filePaths[0], 'Aexon');
  }

  const usersDir = path.join(storagePath, 'users');
  fs.mkdirSync(usersDir, { recursive: true });
  hideFolder(usersDir);

  const config: AexonConfig = {
    storagePath,
    setupComplete: true,
    version: app.getVersion(),
  };

  saveConfig(config);
  return config;
}

function getDefaultStoragePath(): string {
  if (os.platform() === 'win32') {
    const dDrive = 'D:\\';
    if (fs.existsSync(dDrive)) return path.join(dDrive, 'Aexon');
    return path.join(app.getPath('documents'), 'Aexon');
  }
  return path.join(app.getPath('documents'), 'Aexon');
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────

function registerIpcHandlers(config: AexonConfig): void {

  // ── Config ──

  ipcMain.handle('storage:get-config', () => ({
    storagePath: config.storagePath,
  }));

  ipcMain.handle('app:get-version', () => app.getVersion());

  ipcMain.handle('storage:change-path', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Pindahkan Lokasi Penyimpanan',
      buttonLabel: 'Pilih Folder Baru',
      properties: ['openDirectory', 'createDirectory'],
      defaultPath: config.storagePath,
    });
    if (result.canceled || !result.filePaths[0]) return { changed: false };

    const newPath = path.join(result.filePaths[0], 'Aexon');
    const newUsersDir = path.join(newPath, 'users');
    fs.mkdirSync(newUsersDir, { recursive: true });
    hideFolder(newUsersDir);
    config.storagePath = newPath;
    saveConfig(config);
    return { changed: true, newPath };
  });

  // ── Disk Info ──

  ipcMain.handle('storage:disk-info', async () => {
    try {
      const checkDiskSpace = (await import('check-disk-space')).default;
      const info = await checkDiskSpace(config.storagePath);
      return { total: info.size, free: info.free, used: info.size - info.free, path: config.storagePath };
    } catch {
      return { total: 0, free: 0, used: 0, path: config.storagePath, error: 'Gagal membaca info disk' };
    }
  });

  // ── Auth & Encryption ──

  ipcMain.handle('storage:init-user', (_event, userId: string, password: string) => {
    // Migrasi folder lama (nama email → hash) kalau ada
    migrateOldUserDir(config, userId);

    const userDir = getUserDir(config, userId);
    fs.mkdirSync(path.join(userDir, 'sessions'), { recursive: true });

    if (!isUserSetUp(userDir)) {
      // First time: setup encryption
      activeKey = setupUserEncryption(userDir, password);
      activeUserId = userId;
      return { success: true, firstTime: true };
    }

    // Returning user: verify password
    const key = verifyAndGetKey(userDir, password);
    if (!key) {
      return { success: false, error: 'Password salah' };
    }
    activeKey = key;
    activeUserId = userId;
    return { success: true, firstTime: false };
  });

  ipcMain.handle('storage:logout', () => {
    clearKey();
    return { success: true };
  });

  // ── Session Directory ──

  ipcMain.handle('storage:create-session-dir', (_event, sessionId: string) => {
    if (!activeUserId || !activeKey) return { error: 'Belum login' };
    const sessionDir = path.join(getUserDir(config, activeUserId), 'sessions', sessionId);
    fs.mkdirSync(path.join(sessionDir, 'media'), { recursive: true });
    fs.mkdirSync(path.join(sessionDir, 'reports'), { recursive: true });
    return { sessionDir };
  });

  // ── Encrypted File Operations ──

  ipcMain.handle('storage:save-capture', (_event, sessionId: string, captureId: string, data: Uint8Array, ext: string) => {
    if (!activeUserId || !activeKey) return { error: 'Belum login' };
    const filePath = path.join(
      getUserDir(config, activeUserId), 'sessions', sessionId, 'media', `${captureId}.enc`
    );
    encryptToFile(filePath, Buffer.from(data), activeKey);
    return { success: true, filePath, size: data.length };
  });

  ipcMain.handle('storage:load-capture', (_event, sessionId: string, captureId: string) => {
    if (!activeUserId || !activeKey) return { data: null, error: 'Belum login' };
    const filePath = path.join(
      getUserDir(config, activeUserId), 'sessions', sessionId, 'media', `${captureId}.enc`
    );
    if (!fs.existsSync(filePath)) return { data: null, error: 'File not found' };
    try {
      const data = decryptFromFile(filePath, activeKey);
      return { data: new Uint8Array(data) };
    } catch {
      return { data: null, error: 'Gagal mendekripsi file' };
    }
  });

  ipcMain.handle('storage:save-session-meta', (_event, sessionId: string, metaJson: string) => {
    if (!activeUserId || !activeKey) return { error: 'Belum login' };
    const filePath = path.join(
      getUserDir(config, activeUserId), 'sessions', sessionId, 'meta.enc'
    );
    encryptStringToFile(filePath, metaJson, activeKey);
    return { success: true };
  });

  ipcMain.handle('storage:load-session-meta', (_event, sessionId: string) => {
    if (!activeUserId || !activeKey) return { data: null, error: 'Belum login' };
    const filePath = path.join(
      getUserDir(config, activeUserId), 'sessions', sessionId, 'meta.enc'
    );
    if (!fs.existsSync(filePath)) return { data: null, error: 'File not found' };
    try {
      const json = decryptStringFromFile(filePath, activeKey);
      return { data: json };
    } catch {
      return { data: null, error: 'Gagal mendekripsi metadata' };
    }
  });

  ipcMain.handle('storage:load-all-sessions', () => {
    if (!activeUserId || !activeKey) return { sessions: [], error: 'Belum login' };
    const sessionsDir = path.join(getUserDir(config, activeUserId), 'sessions');
    if (!fs.existsSync(sessionsDir)) return { sessions: [] };

    const sessions: string[] = [];
    const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const metaPath = path.join(sessionsDir, entry.name, 'meta.enc');
      if (!fs.existsSync(metaPath)) continue;
      try {
        const json = decryptStringFromFile(metaPath, activeKey);
        sessions.push(json);
      } catch {
        // Skip corrupted sessions
      }
    }

    return { sessions };
  });

  // ── Report Operations ──

  ipcMain.handle('storage:save-report', (_event, sessionId: string, reportId: string, pdfData: Uint8Array, configJson: string) => {
    if (!activeUserId || !activeKey) return { error: 'Belum login' };
    const reportDir = path.join(getUserDir(config, activeUserId), 'sessions', sessionId, 'reports');
    fs.mkdirSync(reportDir, { recursive: true });

    // Save encrypted PDF
    encryptToFile(path.join(reportDir, `${reportId}.enc`), Buffer.from(pdfData), activeKey);
    // Save encrypted report config (for re-editing)
    encryptStringToFile(path.join(reportDir, `${reportId}.meta.enc`), configJson, activeKey);

    return { success: true };
  });

  ipcMain.handle('storage:load-report', (_event, sessionId: string, reportId: string) => {
    if (!activeUserId || !activeKey) return { data: null, error: 'Belum login' };
    const filePath = path.join(
      getUserDir(config, activeUserId), 'sessions', sessionId, 'reports', `${reportId}.enc`
    );
    if (!fs.existsSync(filePath)) return { data: null, error: 'File not found' };
    try {
      const data = decryptFromFile(filePath, activeKey);
      return { data: new Uint8Array(data) };
    } catch {
      return { data: null, error: 'Gagal mendekripsi laporan' };
    }
  });

  ipcMain.handle('storage:load-report-config', (_event, sessionId: string, reportId: string) => {
    if (!activeUserId || !activeKey) return { data: null, error: 'Belum login' };
    const filePath = path.join(
      getUserDir(config, activeUserId), 'sessions', sessionId, 'reports', `${reportId}.meta.enc`
    );
    if (!fs.existsSync(filePath)) return { data: null, error: 'File not found' };
    try {
      const json = decryptStringFromFile(filePath, activeKey);
      return { data: json };
    } catch {
      return { data: null, error: 'Gagal mendekripsi config' };
    }
  });

  // ── Delete ──

  ipcMain.handle('storage:delete-session', (_event, sessionId: string) => {
    if (!activeUserId) return { error: 'Belum login' };
    const sessionDir = path.join(getUserDir(config, activeUserId), 'sessions', sessionId);
    if (fs.existsSync(sessionDir)) {
      fs.rmSync(sessionDir, { recursive: true, force: true });
    }
    return { success: true };
  });

  ipcMain.handle('storage:delete-report', (_event, sessionId: string, reportId: string) => {
    if (!activeUserId) return { error: 'Belum login' };
    const reportDir = path.join(getUserDir(config, activeUserId), 'sessions', sessionId, 'reports');
    const files = [`${reportId}.enc`, `${reportId}.meta.enc`];
    for (const f of files) {
      const fp = path.join(reportDir, f);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    return { success: true };
  });

  // ── Export Captures (decrypt → save sebagai .jpg/.mp4 ke folder pilihan user) ──

  ipcMain.handle('storage:export-captures', async (_event, sessionId: string, captures: { id: string; type: string }[]) => {
    if (!activeUserId || !activeKey) return { success: false, error: 'Belum login' };

    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Pilih Folder Tujuan Export',
      buttonLabel: 'Export ke Folder Ini',
      properties: ['openDirectory', 'createDirectory'],
    });

    if (result.canceled || !result.filePaths[0]) return { success: false, error: 'Dibatalkan' };
    const targetDir = result.filePaths[0];

    let exported = 0;
    const errors: string[] = [];

    for (const cap of captures) {
      const encPath = path.join(
        getUserDir(config, activeUserId), 'sessions', sessionId, 'media', `${cap.id}.enc`
      );
      if (!fs.existsSync(encPath)) {
        errors.push(`${cap.id}: file not found`);
        continue;
      }
      try {
        const data = decryptFromFile(encPath, activeKey);
        const ext = cap.type === 'video' ? 'mp4' : 'jpg';
        const outPath = path.join(targetDir, `${cap.id}.${ext}`);
        fs.writeFileSync(outPath, data);
        exported++;
      } catch (err) {
        errors.push(`${cap.id}: decrypt failed`);
      }
    }

    return { success: true, exported, total: captures.length, errors, targetDir };
  });

  // ── Delete Single Capture ──

  ipcMain.handle('storage:delete-capture', (_event, sessionId: string, captureId: string) => {
    if (!activeUserId) return { success: false, error: 'Belum login' };
    const filePath = path.join(
      getUserDir(config, activeUserId), 'sessions', sessionId, 'media', `${captureId}.enc`
    );
    try {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      return { success: true };
    } catch {
      return { success: false, error: 'Gagal menghapus file' };
    }
  });

  // ── Explorer ──

  ipcMain.handle('storage:open-in-explorer', (_event, folderPath: string) => {
    shell.openPath(folderPath);
    return { success: true };
  });
}

// ── App Lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  const config = await firstLaunchSetup();

  // Pastikan folder users hidden (untuk instalasi lama yang sudah ada)
  const usersDir = path.join(config.storagePath, 'users');
  if (fs.existsSync(usersDir)) {
    hideFolder(usersDir);
  }

  // Tulis storage path ke Registry — dibaca oleh uninstaller untuk hapus data
  if (os.platform() === 'win32') {
    try {
      execSync(`reg add "HKCU\\Software\\Aexon" /v StoragePath /t REG_SZ /d "${config.storagePath}" /f`, { stdio: 'ignore' });
    } catch {}
  }

  registerIpcHandlers(config);
  createWindow();

  // Auto-updater: user-controlled download, auto-install on quit after download
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;

  const sendUpdateStatus = (channel: string, data?: any) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  };

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for update...');
    sendUpdateStatus('updater:checking');
  });
  autoUpdater.on('update-available', (info) => {
    console.log('[AutoUpdater] Update available:', info.version);
    sendUpdateStatus('updater:available', {
      version: info.version,
      releaseNotes: info.releaseNotes,
      releaseDate: info.releaseDate,
      files: info.files?.map(f => ({ name: f.url, size: f.size })),
    });
  });
  autoUpdater.on('update-not-available', (info) => {
    console.log('[AutoUpdater] Already on latest version');
    sendUpdateStatus('updater:not-available', { version: info.version });
  });
  autoUpdater.on('download-progress', (progress) => {
    console.log(`[AutoUpdater] Download: ${Math.round(progress.percent)}%`);
    sendUpdateStatus('updater:download-progress', {
      percent: progress.percent,
      bytesPerSecond: progress.bytesPerSecond,
      transferred: progress.transferred,
      total: progress.total,
    });
  });
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[AutoUpdater] Update downloaded:', info.version, '— will install on quit');
    sendUpdateStatus('updater:downloaded', { version: info.version });
  });
  autoUpdater.on('error', (err) => {
    console.error('[AutoUpdater] Error:', err.message);
    sendUpdateStatus('updater:error', { message: err.message });
  });

  // IPC handlers for renderer-controlled updates
  ipcMain.handle('updater:check', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, version: result?.updateInfo?.version };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('updater:download', async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('updater:install', () => {
    autoUpdater.quitAndInstall(false, true);
  });

  // Background check on startup (non-blocking, no download)
  autoUpdater.checkForUpdates().catch((err) => {
    console.error('[AutoUpdater] checkForUpdates failed:', err.message);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  clearKey(); // Hapus key dari memory saat quit
  if (process.platform !== 'darwin') app.quit();
});