import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const apiUrl = import.meta.env.VITE_AEXON_CONNECT_API_URL;
if (!apiUrl && import.meta.env.PROD) {
  document.getElementById('root')!.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui;background:#F8FAFC;">
      <div style="text-align:center;max-width:480px;padding:40px;">
        <div style="font-size:48px;margin-bottom:16px;">⚠️</div>
        <h1 style="color:#0C1E35;font-size:24px;margin-bottom:12px;">Konfigurasi Tidak Lengkap</h1>
        <p style="color:#64748B;line-height:1.6;">
          Environment variable <code style="background:#E2E8F0;padding:2px 6px;border-radius:4px;">VITE_AEXON_CONNECT_API_URL</code> belum diatur.
          Hubungi administrator untuk mengkonfigurasi koneksi ke AEXON Connect API.
        </p>
      </div>
    </div>
  `;
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

