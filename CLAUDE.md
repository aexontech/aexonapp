# CLAUDE.md — Aexon Ecosystem Master Context

> File ini berisi konteks lengkap seluruh ekosistem Aexon (4 project).
> Taruh di bagian PALING ATAS `CLAUDE.md` setiap workspace, DI ATAS konten project-specific dari `/init`.
> Terakhir diupdate: April 2026.

---

## Ekosistem Aexon

Aexon adalah platform dokumentasi endoskopi klinis untuk dokter dan institusi kesehatan di Indonesia. Terdiri dari 4 codebase di 4 Replit workspace terpisah, masing-masing punya repo GitHub sendiri.

---

## 1. Aexon App — Desktop Endoscopy Documentation

**Fungsi:** Aplikasi utama dokter — capture endoskopi, anotasi gambar (Konva.js), generate laporan PDF, encrypted local storage.

| Item | Detail |
|------|--------|
| Tech | React 19 + Vite 7 + TailwindCSS 4 + shadcn/ui + Konva.js + Electron |
| Routing | Wouter (hash-based, Electron-compatible) |
| Storage | IndexedDB (offline-first) + AES-256-GCM encrypted disk (Electron) |
| Auth | JWT via aexonConnect.ts → Supabase Edge Functions |
| Deploy | Electron Builder → `.exe` installer, auto-updater via GitHub Releases (`aexontech/aexonapp`) |
| Monorepo | pnpm workspace. `artifacts/aexon/` = main app |
| Path alias | `@` → `./src` |

**Key directories:**
- `artifacts/aexon/src/components/` — Launcher, Dashboard, SessionForm, EndoscopyApp, ReportGenerator, Settings, AdminDashboard, dll.
- `artifacts/aexon/src/lib/` — `aexonConnect.ts` (API client), `storage.ts` (IndexedDB), `electronStorage.ts`, `draftSession.ts`, `recordingBuffer.ts`
- `artifacts/aexon/src/data/` — ICD-9 & ICD-10 datasets
- `artifacts/aexon/electron/` — `main.ts`, `crypto.ts`, `preload.cjs`, `renderer.d.ts` (JANGAN modify — sudah final)
- `lib/` — Shared packages: Drizzle ORM, OpenAPI spec, Zod schemas, React Query hooks

**State management:** `App.tsx` = central orchestrator, 40+ useState hooks. Semua page component terima state via props.

**Subscription model:** Monthly/yearly + enterprise (multi-seat). License check tiap 5 menit. Device session mencegah concurrent login. Offline allowed sampai 30 jam.

**Build commands:**
```bash
pnpm install
pnpm build              # Full workspace build
pnpm typecheck          # Type check
cd artifacts/aexon
pnpm dev                # Vite dev server
pnpm build              # Production build → dist/public
```

---

## 2. Aexon Connect — Backend API Gateway

**Fungsi:** Backend API untuk semua frontend. Thin proxy pattern: Express server forwards ke Supabase Edge Function yang berisi semua business logic.

| Item | Detail |
|------|--------|
| Tech | Express 5 (Node.js) proxy → Supabase Deno Edge Function |
| Database | Supabase PostgreSQL + RLS policies |
| Payment | Xendit (semi-manual invoice renewal, BUKAN auto-debit. Midtrans sudah di-rollback) |
| Deploy | Manual: `npx supabase functions deploy aexonconnect --no-verify-jwt --project-ref wukjqyvokoxitklffbja` |
| Monorepo | pnpm workspace |

**Architecture:**
- `artifacts/api-server/` — Express 5 proxy. Strips `/functions/v1/aexonconnect` or `/api` prefix, forwards auth headers.
- `supabase/functions/aexonconnect/` — Deno Edge Function. 9 route modules: `auth`, `subscription`, `payment`, `hub`, `enterprise`, `session`, `system`, `misc`, `hospital-settings`.
- `lib/api-spec/` — OpenAPI spec (`openapi.yaml`) + Orval codegen
- `lib/api-zod/` — Generated Zod schemas (JANGAN modify)
- `lib/api-client-react/` — Generated React Query hooks (JANGAN modify)
- `lib/db/` — Drizzle ORM PostgreSQL schema

**Type-safe pipeline:** `openapi.yaml` → Orval codegen → Zod schemas + React Query hooks

**API response format:** `{ success: boolean, data?: T, error?: string }`

**Key env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `XENDIT_SECRET_KEY`, `XENDIT_CALLBACK_TOKEN`, `ALLOWED_ORIGIN`

**Build commands:**
```bash
pnpm install
pnpm build
pnpm --filter @workspace/api-server dev          # Express dev
pnpm --filter @workspace/api-spec codegen        # Regenerate API client
pnpm --filter db push                            # Push DB schema
```

---

## 3. Aexon Hub — Internal Admin & Finance Dashboard

**Fungsi:** Dashboard internal — API monitor, kelola dokter, billing, marketing, HR, finance. Berfungsi juga sebagai CMS utama (harga, produk, promo, affiliate, beta pricing toggle).

| Item | Detail |
|------|--------|
| Tech | React + Vite + TailwindCSS 4 + Radix UI + TanStack React Query |
| Auth | 2-layer: Supabase Auth + `admin_users` table. Invite-only. Non-admin auto-signout. |
| RBAC | `useRole()` + `can(role, permission)` matrix. 20+ roles across 4 divisi (Finance, HR, Marketing, Developer) |
| Deploy | Vercel (auto-deploy via GitHub push) |
| URL | `adminhub.aexon.id` |
| Monorepo | pnpm workspace. `artifacts/aexon-finance/` = main app |

**Key patterns:**
- Data fetching via generated React Query hooks dari `@workspace/api-client-react`
- Custom fetch wrapper adds `x-user-id`/`x-user-email` headers
- Indonesian Rupiah helpers: `formatRupiah`, `terbilangRupiah`
- Document generation: PDF (jspdf), Excel (xlsx), ZIP (jszip) — auto-register via `registerDoc()`
- Each module has distinct color theme (amber=tax, green=HR, sky blue=Connect, teal=Finance)

**Modul:** API Monitor, Financial Dashboard, Affiliate Program, Institution Seat Management, HR Tools, RBAC Roles, Pricing & Promo, Invoice Admin View, Notification Bell (kop surat edit requests)

**Build commands:**
```bash
pnpm install
pnpm build
pnpm --filter @workspace/aexon-finance dev       # Frontend dev
pnpm --filter @workspace/api-server dev           # Backend dev
pnpm --filter @workspace/api-zod codegen          # Regenerate from OpenAPI
pnpm --filter @workspace/db push                  # Push DB schema
```

---

## 4. Aexon Web — Public Website & Checkout

**Fungsi:** Landing page publik, halaman harga, checkout Xendit, invoice publik, receipt. Punya CMS Web terpisah (`aexon.id/admin/masuk`) untuk edit konten/copy/section visibility.

| Item | Detail |
|------|--------|
| Tech | React 18 + Vite + TailwindCSS 4 + React Router v6 |
| Auth | Token-based (Express API → Supabase Auth). Admin auth terpisah via `admin_users` table. |
| CMS | `site_content` table (JSONB) di Supabase. Hook `useSiteContent()` merge default content + DB overrides. Section visibility toggle via admin panel. |
| Payment | Xendit invoice creation (`POST /api/create-invoice`), webhook (`POST /api/xendit/webhook`) |
| Deploy | Vercel (auto-deploy via GitHub push). `vercel.json` rewrites `/api/download/*` ke Supabase Edge Functions. |
| URL | `aexon.id` |
| Monorepo | pnpm workspace. `artifacts/web/` = main app |

**CMS Web issue (known bug):** Hardcoded content dan CMS data bisa mismatch → flashing. Fix: `useSiteContent.ts` return `null` saat loading, guard `if (!data) return null` di semua section components. CMS Web pernah error dan bikin web down.

**Key patterns:**
- `AuthContext` + `ProtectedRoute` untuk protected pages
- `findDoctorByAuthId()` query `doctor_accounts` by `id` first, then `user_id`
- Cron: GitHub Actions daily subscription activation
- `pnpm-workspace.yaml` enforces 1440-min minimum release age (supply-chain security)

**Generated code — JANGAN modify:** `lib/api-client-react/`, `lib/api-zod/`

**Build commands:**
```bash
pnpm install
pnpm build
pnpm --filter web dev                             # Vite dev server
pnpm --filter api-server dev                      # Express API dev
pnpm --filter @workspace/api-spec codegen         # Regenerate API client
pnpm --filter @workspace/db push                  # Push DB schema
```

---

## Alur Data Antar Project

```
[Dokter] → Aexon App (desktop)
              → aexonConnect.ts
                  → Aexon Connect (Express proxy → Supabase Edge Function)
                      → PostgreSQL (RLS)
                      → Xendit (payment)
                      → Supabase Storage (media)

[Admin Aexon] → Aexon Hub (adminhub.aexon.id)
                  → API server + Supabase direct
                      → PostgreSQL (manage doctors, billing, pricing, promo)

[Public/Dokter] → Aexon Web (aexon.id)
                    → Express API → Supabase Edge Function
                        → Checkout (Xendit)
                        → Invoice publik
                        → CMS content dari `site_content` table

[CMS Web Admin] → aexon.id/admin/masuk
                    → Edit konten/copy/section visibility
                    → Simpan ke `site_content` table
```

---

## Tipe Login & Peran (App)

| Tipe | Deskripsi | Kop Surat | Menu Subscription |
|------|-----------|-----------|-------------------|
| Personal | Dokter individual, klinik pribadi | Kop surat personal | Ada |
| Admin Enterprise | Admin RS, kelola seat dokter | Kop surat RS | Ada |
| Dokter Enterprise | Dokter di RS, di-invite admin | Auto pakai kop RS | Tidak ada |

Variabel kunci: `isDokterEnterprise`

---

## 2 CMS — Terpisah, Fungsi Beda

**CMS Hub (adminhub.aexon.id)** — CMS utama untuk konfigurasi bisnis:
- Kelola jenis produk, struktur harga, promo code, affiliate, toggle beta pricing
- Perubahan mempengaruhi Web (halaman harga, checkout) dan App (harga & promo)
- Status: dalam development

**CMS Web (aexon.id/admin/masuk)** — Khusus konten/copy:
- Edit teks, gambar per section halaman publik
- Toggle section on/off
- Data di `site_content` table (JSONB), diakses via `useSiteContent()` hook
- TIDAK mengatur harga/produk/promo
- Status: ada tapi pernah error (flashing + web down)

---

## Shared Conventions

| Item | Standard |
|------|----------|
| Design colors | Navy `#0C1E35`, Teal `#0D9488` |
| Font | Plus Jakarta Sans (body), Outfit (headings — App only) |
| UI language | Bahasa Indonesia |
| Package manager | pnpm ONLY (npm/yarn diblokir preinstall hook) |
| API response | `{ success: boolean, data?: T, error?: string }` |
| Auth token | JWT dari Supabase Edge Functions |
| Generated code | `lib/api-client-react/` dan `lib/api-zod/` — JANGAN modify, auto-generated dari OpenAPI |
| Type-safe pipeline | `openapi.yaml` → Orval → Zod + React Query hooks |

---

## Database Tables Penting (Supabase PostgreSQL + RLS)

- `doctor_accounts` — Data dokter (no `email` column — email di `auth.users`)
- `subscriptions` — Status langganan (monthly/yearly/enterprise)
- `auth_sessions` — Session tracking (renamed dari `active_sessions`)
- `hospital_settings` — Kop surat RS (XOR ownership constraint, 30-day cooldown, row limit trigger)
- `admin_users` — Hub & Web admin access
- `site_content` — CMS Web content (JSONB)
- `profiles` — User profiles
- `enterprises` — Enterprise/RS data
- `sessions` — Endoscopy session data (`patient_data` as JSONB)
- `captures` — Session captures (`shapes` as JSONB for annotations)

---

## Deployment Map

| Project | Platform | URL/Method | Auto-deploy? |
|---------|----------|------------|-------------|
| App | Electron (.exe) | Desktop, GitHub Releases `aexontech/aexonapp` | Manual build |
| Connect | Supabase Edge Functions | `npx supabase functions deploy ...` | Manual CLI |
| Hub | Vercel | `adminhub.aexon.id` | ✅ GitHub push |
| Web | Vercel | `aexon.id` | ✅ GitHub push |

Download proxy: Vercel proxy menyembunyikan Supabase/GitHub URLs.

---

## Catatan Penting untuk Claude Code

1. **JANGAN modify file Electron** — `main.ts`, `crypto.ts`, `preload.cjs`, `renderer.d.ts` sudah final
2. **JANGAN modify generated code** — `lib/api-client-react/`, `lib/api-zod/` di-generate dari OpenAPI
3. **Selalu pakai `pnpm`** — npm/yarn diblokir
4. **Xendit, BUKAN Midtrans** — migrasi Midtrans sudah di-rollback 100%
5. **Hub, Web, App punya auth terpisah** — account isolation antar platform
6. **CMS Web ≠ CMS Hub** — Web CMS hanya konten/copy, Hub CMS untuk bisnis/harga
7. **API contract antar project** — lihat file `API_CONTRACT.md` untuk daftar endpoint lengkap

---

> Di bawah baris ini, taruh hasil `/init` yang project-specific.

---

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Dev Commands

This is a pnpm monorepo. Use `pnpm` exclusively (npm/yarn are blocked by preinstall hook).

```bash
# Root workspace
pnpm install          # Install all dependencies
pnpm build            # Full workspace build with typecheck
pnpm typecheck        # Type check libs + artifacts
pnpm typecheck:libs   # Type check shared libs only

# Aexon app (artifacts/aexon)
cd artifacts/aexon
pnpm dev              # Vite dev server (0.0.0.0)
pnpm build            # Production build → dist/public
pnpm serve            # Preview production build
pnpm typecheck        # Type check aexon only
```

No test runner is configured. No linter config exists.

## Architecture

**Aexon** is a medical endoscopy documentation platform (Indonesian-localized) that runs in browser and Electron desktop.

### Tech Stack
- **React 19** + TypeScript, built with **Vite 7**
- **Wouter** for hash-based routing (Electron-compatible)
- **Supabase** for auth, PostgreSQL database, and media storage
- **TailwindCSS 4** + **shadcn/ui** (Radix primitives)
- **Konva.js** for canvas-based image/video annotation
- **jsPDF + jszip** for report generation
- **Electron** (optional) for desktop builds with encrypted local storage

### Path Alias
`@` → `./src` (configured in vite.config.ts and tsconfig.json)

### Key Directories
- `artifacts/aexon/src/components/` — Page-level components (Launcher, Dashboard, EndoscopyApp, ReportGenerator, Settings, etc.)
- `artifacts/aexon/src/lib/` — API client (`aexonConnect.ts`), storage layers (`storage.ts`, `electronStorage.ts`), draft recovery, recording buffer
- `artifacts/aexon/src/data/` — ICD-9/ICD-10 medical code datasets
- `artifacts/aexon/electron/` — Electron main process, preload, encryption
- `lib/` — Shared packages: Drizzle ORM schema (`db/`), OpenAPI spec (`api-spec/`), Zod schemas (`api-zod/`), React API client hooks (`api-client-react/`)

### Data Flow
1. Auth via `aexonConnect.ts` → Supabase Edge Functions (`VITE_AEXON_CONNECT_API_URL`)
2. JWT tokens in sessionStorage (or localStorage with "remember me")
3. Sessions/captures stored in **IndexedDB** (offline-first) with Supabase sync
4. Electron uses encrypted disk storage per device via AES-GCM + PBKDF2
5. Media: camera capture → Konva canvas annotations → Blob URLs → IndexedDB → Supabase Storage

### App.tsx State
`App.tsx` is the central orchestrator with 40+ useState hooks managing: patient data, active session, user profile, subscription/plan status, recording state, draft recovery, and navigation guards. All page components receive state via props.

### API Envelope
All aexonConnect responses follow `{ success, data, error }` format. 401 triggers automatic token refresh, then session expiry callback.

### Database Schema
Defined in `supabase_schema.sql`. Key tables: `profiles`, `enterprises`, `hospital_settings`, `sessions` (patient_data as JSONB), `captures` (shapes as JSONB for annotations), `subscriptions`. All tables use RLS — users see only their own data; enterprise admins see team data.

### Environment Variables
```
VITE_AEXON_CONNECT_API_URL  # Supabase Edge Functions base URL
PORT                         # Dev server port (default 5000)
BASE_PATH                   # Vite base path (default /)
```

### Subscription & Auth
- Plans: subscription (monthly/yearly with trial) and enterprise (multi-seat)
- License check every 5 minutes; device session prevents concurrent logins
- Offline allowed up to 30 hours before forced re-auth

### UI Conventions
- Custom CSS variables: navy, teal, border, muted, hint, bg-light
- Fonts: Plus Jakarta Sans (body), Outfit (headings)
- UI text is in **Bahasa Indonesia**
