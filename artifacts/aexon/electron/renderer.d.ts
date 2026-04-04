// Type declarations for APIs exposed by electron/preload.ts

interface AexonStorage {
  // Config
  getConfig(): Promise<{ storagePath: string }>;
  changePath(): Promise<{ changed: boolean; newPath?: string }>;

  // Disk
  getDiskInfo(): Promise<{ total: number; free: number; used: number; path: string; error?: string }>;

  // Auth
  initUser(userId: string, password: string): Promise<{ success: boolean; firstTime?: boolean; error?: string }>;
  logout(): Promise<{ success: boolean }>;

  // Session
  createSessionDir(sessionId: string): Promise<{ sessionDir?: string; error?: string }>;
  saveSessionMeta(sessionId: string, metaJson: string): Promise<{ success?: boolean; error?: string }>;
  loadSessionMeta(sessionId: string): Promise<{ data: string | null; error?: string }>;
  loadAllSessions(): Promise<{ sessions: string[]; error?: string }>;
  deleteSession(sessionId: string): Promise<{ success?: boolean; error?: string }>;

  // Media (auto-encrypted)
  saveCapture(sessionId: string, captureId: string, data: Uint8Array, ext: string): Promise<{ success?: boolean; filePath?: string; size?: number; error?: string }>;
  loadCapture(sessionId: string, captureId: string): Promise<{ data: Uint8Array | null; error?: string }>;

  // Reports (auto-encrypted)
  saveReport(sessionId: string, reportId: string, pdfData: Uint8Array, configJson: string): Promise<{ success?: boolean; error?: string }>;
  loadReport(sessionId: string, reportId: string): Promise<{ data: Uint8Array | null; error?: string }>;
  loadReportConfig(sessionId: string, reportId: string): Promise<{ data: string | null; error?: string }>;
  deleteReport(sessionId: string, reportId: string): Promise<{ success?: boolean; error?: string }>;

  // Explorer
  openInExplorer(folderPath: string): Promise<{ success: boolean }>;

  // Export (decrypt → save ke folder pilihan user)
  exportCaptures(sessionId: string, captures: { id: string; type: string }[]): Promise<{ success: boolean; exported?: number; total?: number; errors?: string[]; targetDir?: string; error?: string }>;

  // Delete single capture
  deleteCapture(sessionId: string, captureId: string): Promise<{ success: boolean; error?: string }>;
}

interface AexonPlatform {
  isElectron: boolean;
  platform: string;
  arch: string;
  getAppVersion(): Promise<string>;
}

declare global {
  interface Window {
    aexonStorage?: AexonStorage;
    aexonPlatform?: AexonPlatform;
  }
}

export {};