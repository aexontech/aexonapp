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
- Key components: Launcher (login), Dashboard, SessionForm, EndoscopyApp (active session), ReportGenerator, Gallery, Settings, AdminDashboard
- UI stack: Tailwind CSS v4, Framer Motion (`motion/react`), Lucide icons, Konva (image editor)
- Fonts: Plus Jakarta Sans (body text) + Outfit (brand "Aexon" wordmark only), loaded in index.html. `.font-aexon` utility class uses Outfit bold.
- Auth: Supabase email+password via `src/lib/supabase.ts`. Requires VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY env vars. Falls back gracefully when not configured.
- EULA: Per-user, shown after first login on new device. Plain/boring monospace style. Stored as `aexon_eula_accepted_[userId]` in localStorage.
- Brand colors: Primary = navy #0C1E35 (buttons, selected states, accents), hover = #1a3a5c. Teal kept only for success states (CheckCircle). Background: slate-50. Cards: white + border-slate-100 + rounded-2xl + shadow-sm.
- Global UI: Primary buttons bg-[#0C1E35] hover:bg-[#1a3a5c] rounded-xl. Inputs border-slate-200 rounded-xl focus:ring-[#0C1E35]/20. No blue-600 primary usage.
- Sidebar (MainLayout.tsx): White bg, border-r border-slate-100. Active nav = bg-[#0C1E35] text-white rounded-xl, inactive = text-gray-500 hover:bg-slate-50. Bottom section: user initials circle (navy), name, role badge (Personal=blue, Dokter Institusi=teal, Admin Institusi=purple), subscription chip (Aktif=green, Trial X hari=yellow, Tidak Aktif=red), logout.
- Login: 2-card selector (Personal / Institusi), Institusi sub-selector (Dokter/Admin), email+password form, forgot password flow, registration flow (Personal form / Institusi info screen). No Google OAuth.
- handleLogin signature: `(role, email, fullName, plan, trialDaysLeft)` — receives plan/trial data from Supabase subscription query
- Dashboard: Hero greeting (name in navy #0C1E35), 3 stat cards (Total Sesi, Sesi Bulan Ini, Total Media) with animated count-up, session list with category-colored borders, single "Mulai Sesi Baru" button
- No "Dr." prefix added manually — userProfile.name already includes title from Supabase profile
- Encryption: XOR cipher in `src/lib/storage.ts` (saveUserData/loadUserData)
- Subscription: subscription-only model (no tokens), gating via hasActiveAccess
- Settings (Settings.tsx): 4-tab layout (Profil / Keamanan / Langganan / Backup). Profil: avatar initials, name, email(read-only), specialization, STR, SIP, phone — saves to Supabase doctor_accounts via auth.getUser() UUID. Keamanan: change password via supabase.auth.updateUser({ password }), data cleanup. Langganan: Personal shows plan+billing+CTA; Dokter Institusi hides tab entirely; Admin shows enterprise plan+seat count. Backup: existing ZIP backup/restore with conflict resolution.
- Backup/Restore: Settings Backup tab with date-range filter, ZIP export/import, conflict modal for duplicates
- Gallery export: bulk/individual photo download, session report JSON
- Types: `src/types.ts` — PatientData, Session, Capture, UserProfile, HospitalSettings
- ICD data: `src/data/icd9.ts` (790 ICD-9-CM procedures), `src/data/icd10.ts` (494 ICD-10 diagnoses) with search functions
- ICD autocomplete: `src/components/ICD9Autocomplete.tsx` and `src/components/ICD10Autocomplete.tsx` — dropdown search with keyboard navigation, category badges
- PatientData has `diagnosis_icd10` (string) and `procedures_icd9` (string[], up to 5) fields; old `diagnosis`/`procedures` fields kept synced for backward compat
- SessionForm layout: Row 1 patient identity, Row 2 procedures (ICD-9 autocomplete, dynamic add/remove) + diagnosis (ICD-10 autocomplete), Row 3 administration
- Navigation guard active during recording sessions
- Session ID: generated once via `useMemo` (not on every render)

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
