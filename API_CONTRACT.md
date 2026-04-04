# API_CONTRACT.md — Aexon Connect Endpoint Reference

> Source of truth untuk semua endpoint Aexon Connect.
> Kalau ada perubahan endpoint, UPDATE file ini lalu copy ke semua workspace.
> Terakhir diupdate: April 2026.

---

## Base URL

```
Production:  https://<project-ref>.supabase.co/functions/v1/aexonconnect
Dev proxy:   http://localhost:8080/api
```

Semua response mengikuti envelope format:
```json
{ "success": boolean, "data"?: T, "error"?: string }
```

Auth: Bearer token (JWT) di header `Authorization`, kecuali endpoint yang ditandai [PUBLIC].

---

## Auth Module

| Method | Endpoint | Deskripsi | Dipakai di |
|--------|----------|-----------|------------|
| POST | `/login-session` | Login dokter, return JWT + profile | App, Web |
| POST | `/logout-session` | Logout, invalidate session | App |
| POST | `/register` | Register akun dokter baru | Web |
| POST | `/refresh-token` | Refresh expired JWT | App, Web |
| GET | `/check-session` | Validasi session aktif | App |

**Notes:**
- 401 di App → auto refresh token → kalau gagal, trigger session expiry callback
- `auth_sessions` table (renamed dari `active_sessions`)
- Device session mencegah concurrent login

---

## Profile Module

| Method | Endpoint | Deskripsi | Dipakai di |
|--------|----------|-----------|------------|
| GET | `/getProfile` | Data dokter + subscription status + enterprise info | App, Web |
| PUT | `/updateProfile` | Update data profil dokter | App, Web |

**Notes:**
- `findDoctorByAuthId()` query `doctor_accounts` by `id` first, then `user_id`
- `doctor_accounts` TIDAK punya kolom `email` — email ada di `auth.users`
- Bug fix: silent query failure karena premature column reference sudah diperbaiki

---

## Subscription Module

| Method | Endpoint | Deskripsi | Dipakai di |
|--------|----------|-----------|------------|
| GET | `/subscription/status` | Status langganan aktif | App, Web |
| POST | `/subscription/activate` | Aktivasi subscription setelah payment | Web, Cron |
| GET | `/subscription/plans` | Daftar plan yang tersedia | Web, App |

**Notes:**
- Plans: monthly, yearly, enterprise (multi-seat)
- License check tiap 5 menit di App
- Offline allowed sampai 30 jam sebelum forced re-auth
- Cron: GitHub Actions daily subscription activation

---

## Payment Module (Xendit)

| Method | Endpoint | Deskripsi | Dipakai di |
|--------|----------|-----------|------------|
| POST | `/create-invoice` | Buat invoice Xendit | Web |
| POST | `/xendit/webhook` | [PUBLIC] Webhook callback dari Xendit | Xendit server |
| GET | `/invoice/:id` | [PUBLIC] Detail invoice untuk halaman publik | Web |
| GET | `/receipt/:id` | [PUBLIC] Detail receipt | Web |

**Notes:**
- Semi-manual invoice renewal (BUKAN auto-debit) — sesuai market B2B Indonesia
- Xendit, BUKAN Midtrans (migrasi sudah di-rollback)
- DB columns: `xendit_invoice_id`, dll. (tidak berubah)
- Public invoice page: bypass JWT check (`publicRequest()`)

---

## Hospital Settings Module

| Method | Endpoint | Deskripsi | Dipakai di |
|--------|----------|-----------|------------|
| GET | `/hospital-settings` | Get kop surat RS | App, Hub |
| POST | `/hospital-settings` | Create kop surat RS | App, Hub |
| PUT | `/hospital-settings` | Update kop surat RS | App, Hub |
| DELETE | `/hospital-settings` | Delete kop surat RS | Hub |
| POST | `/hospital-settings/migrate` | Migrasi data kop surat | Hub |
| POST | `/hospital-settings/request-edit` | Request edit kop surat (trigger notification) | App |

**Notes:**
- XOR ownership constraint (1 owner per RS setting)
- PostgreSQL triggers: row limits + 30-day cooldown
- RLS policies per role
- Hub `notification-bell.tsx` menampilkan edit requests

---

## Enterprise Module

| Method | Endpoint | Deskripsi | Dipakai di |
|--------|----------|-----------|------------|
| GET | `/enterprise/doctors` | List dokter dalam enterprise | App (Admin Enterprise) |
| POST | `/enterprise/invite` | Invite dokter ke enterprise | App (Admin Enterprise) |
| PUT | `/enterprise/seat` | Update seat dokter | Hub |

**Notes:**
- Admin Enterprise kelola seat dokter + kop surat RS
- Dokter Enterprise auto-pakai kop RS, no subscription menu
- Variabel kunci di App: `isDokterEnterprise`

---

## Session Module

| Method | Endpoint | Deskripsi | Dipakai di |
|--------|----------|-----------|------------|
| POST | `/session/sync` | Sync session data dari IndexedDB ke server | App |
| GET | `/session/list` | List sessions untuk dokter | App |
| GET | `/session/:id` | Detail session | App |

**Notes:**
- Session = sesi endoskopi (bukan auth session)
- Data offline-first di IndexedDB, sync saat online
- `patient_data` disimpan sebagai JSONB
- `captures` punya `shapes` JSONB untuk annotation data

---

## Hub Module

| Method | Endpoint | Deskripsi | Dipakai di |
|--------|----------|-----------|------------|
| GET | `/hub/stats` | Dashboard statistics | Hub |
| GET | `/hub/doctors` | List semua dokter (admin view) | Hub |
| GET | `/hub/subscriptions` | List semua subscription | Hub |

**Notes:**
- Hub auth: 2-layer (Supabase Auth + `admin_users` table)
- Invite-only access, non-admin auto-signout

---

## System & Misc Module

| Method | Endpoint | Deskripsi | Dipakai di |
|--------|----------|-----------|------------|
| GET | `/health` | Health check | Hub (API Monitor) |
| GET | `/version` | API version info | Hub |

**Notes:**
- Hub API Monitor uses `res.status < 500` for liveness check
- CORS errors handled gracefully

---

## Vercel Rewrites (Web)

```json
// vercel.json
{
  "rewrites": [
    { "source": "/api/download/:path*", "destination": "https://<supabase>/functions/v1/:path*" }
  ]
}
```

SPA fallback: semua route lain → `/index.html`

---

## Changelog

| Tanggal | Perubahan |
|---------|-----------|
| Apr 2026 | Initial version — compiled from 4x `/init` |

> Kalau ada endpoint baru/berubah, update tabel di atas dan catat di Changelog.
> Lalu copy file ini ke semua 4 workspace.
