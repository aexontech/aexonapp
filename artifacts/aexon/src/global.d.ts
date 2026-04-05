interface AexonStorageBridge {
  initUser(userId: string, password: string): Promise<{ success: boolean; error?: string }>;
  createSessionDir(sessionId: string): Promise<void>;
  saveSessionMeta(sessionId: string, metaJson: string): Promise<void>;
  saveCapture(sessionId: string, captureId: string, data: Uint8Array, ext: string): Promise<{ error?: string }>;
  loadCapture(sessionId: string, captureId: string): Promise<{ data: Uint8Array | null; error?: string }>;
  loadAllSessions(): Promise<{ sessions: string[] | null; error?: string }>;
  deleteSession(sessionId: string): Promise<void>;
  deleteCapture(sessionId: string, captureId: string): Promise<{ success: boolean }>;
  exportCaptures(sessionId: string, captures: { id: string; type: string }[]): Promise<{ success: boolean; exported?: number; total?: number; targetDir?: string }>;
  getDiskInfo(): Promise<{ used: number; free: number; total: number; path?: string }>;
  saveReport(sessionId: string, reportId: string, pdfData: Uint8Array, configJson: string): Promise<void>;
  deleteReport(sessionId: string, reportId: string): Promise<void>;
  logout(): Promise<void>;
}

interface AexonPlatformBridge {
  isElectron: boolean;
  platform: string;
  arch: string;
  getAppVersion(): Promise<string>;
}

interface UpdateInfoBridge {
  version: string;
  releaseNotes?: string | { version: string; note: string }[];
  releaseDate?: string;
  files?: { name: string; size?: number }[];
}

interface DownloadProgressBridge {
  percent: number;
  bytesPerSecond: number;
  transferred: number;
  total: number;
}

interface AexonUpdaterBridge {
  check(): Promise<{ success: boolean; version?: string; error?: string }>;
  download(): Promise<{ success: boolean; error?: string }>;
  install(): Promise<void>;
  onChecking(cb: () => void): () => void;
  onAvailable(cb: (info: UpdateInfoBridge) => void): () => void;
  onNotAvailable(cb: (info: { version: string }) => void): () => void;
  onDownloadProgress(cb: (progress: DownloadProgressBridge) => void): () => void;
  onDownloaded(cb: (info: { version: string }) => void): () => void;
  onError(cb: (err: { message: string }) => void): () => void;
}

declare global {
  const __APP_VERSION__: string;
  interface Window {
    aexonStorage?: AexonStorageBridge;
    aexonPlatform?: AexonPlatformBridge;
    aexonUpdater?: AexonUpdaterBridge;
  }
}

export {};
