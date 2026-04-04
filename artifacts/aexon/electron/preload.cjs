const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('aexonStorage', {
  getConfig: () => ipcRenderer.invoke('storage:get-config'),
  changePath: () => ipcRenderer.invoke('storage:change-path'),
  getDiskInfo: () => ipcRenderer.invoke('storage:disk-info'),
  initUser: (userId, password) => ipcRenderer.invoke('storage:init-user', userId, password),
  logout: () => ipcRenderer.invoke('storage:logout'),
  createSessionDir: (sessionId) => ipcRenderer.invoke('storage:create-session-dir', sessionId),
  saveSessionMeta: (sessionId, metaJson) => ipcRenderer.invoke('storage:save-session-meta', sessionId, metaJson),
  loadSessionMeta: (sessionId) => ipcRenderer.invoke('storage:load-session-meta', sessionId),
  loadAllSessions: () => ipcRenderer.invoke('storage:load-all-sessions'),
  deleteSession: (sessionId) => ipcRenderer.invoke('storage:delete-session', sessionId),
  saveCapture: (sessionId, captureId, data, ext) => ipcRenderer.invoke('storage:save-capture', sessionId, captureId, data, ext),
  loadCapture: (sessionId, captureId) => ipcRenderer.invoke('storage:load-capture', sessionId, captureId),
  saveReport: (sessionId, reportId, pdfData, configJson) => ipcRenderer.invoke('storage:save-report', sessionId, reportId, pdfData, configJson),
  loadReport: (sessionId, reportId) => ipcRenderer.invoke('storage:load-report', sessionId, reportId),
  loadReportConfig: (sessionId, reportId) => ipcRenderer.invoke('storage:load-report-config', sessionId, reportId),
  deleteReport: (sessionId, reportId) => ipcRenderer.invoke('storage:delete-report', sessionId, reportId),
  openInExplorer: (folderPath) => ipcRenderer.invoke('storage:open-in-explorer', folderPath),
  exportCaptures: (sessionId, captures) => ipcRenderer.invoke('storage:export-captures', sessionId, captures),
  deleteCapture: (sessionId, captureId) => ipcRenderer.invoke('storage:delete-capture', sessionId, captureId),
});

contextBridge.exposeInMainWorld('aexonPlatform', {
  isElectron: true,
  platform: process.platform,
  arch: process.arch,
  getAppVersion: () => ipcRenderer.invoke('app:get-version'),
});
