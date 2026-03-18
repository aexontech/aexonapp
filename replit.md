# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   └── api-server/         # Express API server
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/aexon` (`@workspace/aexon`)

Aexon Endoscopy — React 19 + Vite + TypeScript desktop app for endoscopy session management. Frontend-only (no backend API), uses localStorage for data persistence.

- Entry: `src/main.tsx`, main component: `src/App.tsx`
- Key components: Launcher (login), Dashboard, SessionForm, EndoscopyApp (active session), ReportGenerator, Gallery, Settings, AdminDashboard, AdminKopSurat
- UI stack: Tailwind CSS v4, Framer Motion (`motion/react`), Lucide icons, Konva (image editor)
- Fonts: Plus Jakarta Sans (body text) + Outfit (brand "Aexon" wordmark only), loaded in index.html. `.font-aexon` utility class uses Outfit bold.
- Auth & Subscription: All backend communication routed through AEXON Connect API (`src/lib/aexonConnect.ts`). Uses `VITE_AEXON_CONNECT_API_URL` env var (set to `https://wukjqyvokoxitklffbja.supabase.co/functions/v1/aexonconnect`). JWT token stored in sessionStorage (or localStorage if remember-me). Automatic token refresh on 401 responses via POST /auth/refresh. Session expiry callback (`onSessionExpired`) auto-redirects to login. 404 responses show "Fitur ini belum tersedia" message. No direct Supabase access — `@supabase/supabase-js` removed. Centralized API client functions: login, register, resetPassword, changePassword, updateProfile, getSubscription (GET /subscription — identity from JWT, no doctor_id param), toggleAutoRenew (POST /subscription/toggle-renew), createInvoice (POST /subscription/checkout), getPlans, validatePromo, createDeviceSession (POST /login-session), checkDeviceSession (POST /check-session), registerDevice, verifyDevice, getBillingHistory, logout. Device session created automatically on login.
- Device ID: Auto-generated UUID stored in both localStorage and sessionStorage (`aexon_device_id`), with cross-storage fallback recovery. Sent with checkout and device verification requests.
- EULA: Per-user, shown after first login on new device. Plain/boring monospace style. Stored as `aexon_eula_accepted_[userId]` in localStorage.
- Brand colors: Primary = navy #0C1E35 (buttons, selected states, accents), hover = #1a3a5c. Teal kept only for success states (CheckCircle). Background: slate-50. Cards: white + border-slate-100 + rounded-2xl + shadow-[0_4px_24px_rgba(0,0,0,0.04)].
- Global UI: Primary buttons bg-[#0C1E35] hover:bg-[#1a3a5c] rounded-xl. Inputs border-slate-200 rounded-xl focus:ring-[#0C1E35]/20. No blue-600 primary usage.
- Visual system: Pure inline styles across all components. Allowed Tailwind classNames: `custom-scrollbar`, `animate-spin`, `font-aexon`, `orb-tr`, `orb-bl`, `print:hidden`. Hover states use `onMouseEnter/Leave` with `e.currentTarget.style.*`. CSS variables in :root for theme tokens.
- Light theme everywhere: Gallery.tsx = single-page layout (no tabs), photos section on top + videos section below, both collapsible with toggle headers, multi-select checkboxes on each card, bottom action bar with "Download Semua"/"Download X Media Terpilih" on left + "Buat Laporan" on right, always visible. EndoscopyApp.tsx = light header, dark camera viewport (#1a1a2e with borderRadius 20), white sidebar with collapsible session info, bottom control bar with capture/record buttons, keyboard shortcuts hint. Drag-select uses `[data-gallery-item]` attribute.
- Sidebar (MainLayout.tsx): White bg, border-r border-slate-100. Active nav = bg-[#0C1E35] text-white rounded-xl, inactive = text-gray-500 hover:bg-slate-50. Profile card at top (expanded): interactive dropdown with avatar initials (gradient navy), name, specialization, role badge, subscription status dot, links to Profil & Pengaturan / Keamanan. Collapsed: initials avatar only. Nav items: Beranda, Mulai Sesi Baru, Langganan (CreditCard icon, pulsing dot when CTA needed, links to plan-selection). Bottom: "Perpanjang Sekarang" gradient amber CTA button (when subscription needed), Settings, Logout, online/offline indicator.
- Login: 2-card selector (Personal / Institusi), Institusi sub-selector (Dokter/Admin), email+password form, forgot password flow, registration flow (Personal form / Institusi info screen). No Google OAuth.
- handleLogin signature: `(role, email, fullName, plan, trialDaysLeft)` — receives plan/trial data from AEXON Connect subscription status
- Dashboard: Hero greeting (name in navy #0C1E35), 3 stat cards (Total Sesi, Sesi Bulan Ini, Total Media) with animated count-up, session list with category-colored borders, single "Mulai Sesi Baru" button. Immersive subscription CTA banner when unsubscribed: dark navy gradient with animated glow, floating crown icon, feature chips (PDF Report, Galeri Media, Backup & Restore, ICD Autocomplete), golden "Perpanjang Sekarang" button with hover lift/glow. Trial warning banner (<=7 days) with amber gradient icon and "Perpanjang" CTA.
- No "Dr." prefix added manually — userProfile.name already includes title from profile
- Encryption: AES-256-GCM via Web Crypto API in `src/lib/storage.ts` (PBKDF2 key derivation, 100k iterations). `saveUserData`/`loadUserData` are async. Legacy XOR cipher data auto-migrated on read (decrypts with old XOR → re-encrypts with AES-GCM). Gallery "Export Case" creates encrypted ZIP (session.enc + manifest.enc + media/ blobs); restored via Settings Backup & Restore (detects manifest.enc → decrypts → rebuilds captures with blob URLs). Case export file: `Aexon_Case_[hash]_[date].zip`.
- Subscription: subscription-only model (no tokens), gating via hasActiveAccess. Full in-app checkout flow connected across entire system. Entry points: Dashboard CTA banner, sidebar "Perpanjang Sekarang" button, Settings Langganan tab, AdminDashboard subscription banner, ManageSubscription "Perpanjang" button. All route to PlanSelection → Checkout. PlanSelection fetches plans from AEXON Connect GET /plans using unified `Plan` interface (with `product_name` field — no wrapper objects). Checkout sends POST /subscription/checkout with plan_id + device_id + optional promo_code. Payment status flow: idle → processing → pending (invoice created, awaiting Xendit payment) → paid (confirmed active) / failed (rejected/cancelled) / expired (timeout). Checkout polls GET /subscription every 5s for up to 30min to detect status changes. Immediate invoice status from createInvoice response is checked first (paid/settled/expired/failed/rejected skip polling). `onSuccess` callback only fires when subscription status confirmed 'active'. Xendit invoice URL opened in new tab. Promo validation via POST /subscription/promo/validate. Components: PlanSelection.tsx, Checkout.tsx (uses `Plan` type from aexonConnect.ts directly — no `ProductPlan`/`CheckoutPlan` wrappers).
- Settings (Settings.tsx): 5-tab layout (Profil / Keamanan / Kop Surat / Langganan / Backup). Profil: avatar initials, name, email(read-only), specialization, STR, SIP, phone — saves via AEXON Connect PUT /auth/profile. Keamanan: change password via AEXON Connect POST /auth/change-password, data cleanup. Kop Surat: Personal=editable up to 3 collapsible cards with anti-abuse protections, Dokter Institusi=read-only card, Admin=no tab. Langganan: Personal shows plan+billing+CTA with plans fetched from AEXON Connect GET /plans, billing history from GET /subscription/billing-history; Dokter Institusi hides tab entirely; Admin shows enterprise plan+seat count. Backup: existing ZIP backup/restore with conflict resolution.
- Kop Surat (Hospital Letterhead): Personal accounts: up to 3 kop surat in Settings→Kop Surat tab. Each has: name, logo file upload (.jpg/.png, max 5MB) with crop/zoom modal (react-easy-crop), address, phone, fax, email, website. Logo stored as base64 data URL in logoUrl field. Anti-abuse protections: (1) 30-day cooldown on name/logo changes stored in model-level timestamps (last_name_changed/last_logo_changed on HospitalSettings, not localStorage), (2) 3-day minimum age before kop surat can be deleted (via createdAt field), (3) 7-day post-delete cooldown before adding new kop surat, (4) type-to-confirm "KONFIRMASI" verification modal for identity (name/logo) changes showing old→new comparison. Contact fields (alamat, telepon, fax, email, website) are freely editable at all times — no cooldown. Name can be left empty on initial save for quick access. No daily operation limit. Dokter Institusi: read-only view of institution kop in same tab. Admin Institusi: manages single institution kop via standalone AdminKopSurat page. ReportGenerator: Personal gets dropdown selector, enterprise users get locked auto-select.
- ReportGenerator: "Simpan" button downloads actual PDF via html2canvas+jsPDF (not window.print). "Cetak" uses window.print. Report paper has navy #0C1E35 accents: top bar, header border, section indicators, patient info styling, footer line decorations, bottom accent bar. @page CSS removes browser URL headers/footers in print.
- Backup/Restore: Settings Backup tab with date-range filter, ZIP export/import, conflict modal for duplicates
- Gallery export: bulk/individual photo download, session report JSON
- Types: `src/types.ts` — PatientData, Session, Capture, UserProfile, HospitalSettings
- ICD data: `src/data/icd9.ts` (790 ICD-9-CM procedures), `src/data/icd10.ts` (494 ICD-10 diagnoses) with search functions
- ICD autocomplete: `src/components/ICD9Autocomplete.tsx` and `src/components/ICD10Autocomplete.tsx` — dropdown search with keyboard navigation, category badges
- PatientData has `diagnosis_icd10` (string) and `procedures_icd9` (string[], up to 5) fields; old `diagnosis`/`procedures` fields kept synced for backward compat
- SessionForm layout: Row 1 patient identity, Row 2 Diagnosis (ICD-10 full-width 2-col: Utama + Banding), Row 3 Prosedur/Tindakan (ICD-9 full-width), Row 4 Administrasi (compact flex row)
- Routing: wouter v3 — URL-based navigation. Unauthenticated: `/` (Launcher), `/pricing`. Authenticated (wrapped in MainLayout): `/dashboard`, `/admin`, `/admin-kop-surat`, `/add-doctor`, `/session/new`, `/session/active`, `/session/report`, `/gallery`, `/settings`, `/subscription`, `/subscription/plans`, `/subscription/checkout`. Navigation via `useLocation()` + `navigate()`. `handleNavigate()` maps legacy menu names to URL paths for MainLayout sidebar compat.
- Navigation guard active during recording sessions
- Session ID: generated once via `useMemo` (not on every render)
- Admin doctors list: starts empty (no hardcoded dummy data), populated via API or manual add

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.
