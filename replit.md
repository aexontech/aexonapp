# Overview

This project is a pnpm workspace monorepo utilizing TypeScript for a suite of applications. The primary focus is on an Express 5 API server, a Drizzle ORM-based database layer, and a React 19 desktop application (Aexon Endoscopy) for managing endoscopy sessions. The Aexon Endoscopy application is a frontend-only desktop app for endoscopy session management, utilizing `localStorage` for data persistence and interacting with the AEXON Connect API for authentication, subscription management, and billing.

The project's vision is to provide a robust and scalable platform for medical professionals, enabling efficient management of endoscopy sessions, patient data, and reporting, with a strong emphasis on user experience and data security.

# User Preferences

I prefer concise and direct communication. When suggesting changes, please outline the high-level approach first. For code modifications, focus on adhering to the existing architectural patterns and technology choices. Do not make changes to folder `lib/api-spec`.

# System Architecture

## Monorepo Structure

The project is organized as a pnpm workspace monorepo:
- `artifacts/`: Contains deployable applications like `api-server` and `aexon` (a React desktop app).
- `lib/`: Houses shared libraries such as `api-spec` (OpenAPI), `api-client-react` (generated React Query hooks), `api-zod` (generated Zod schemas), and `db` (Drizzle ORM).
- `scripts/`: Holds utility scripts.

## Core Technologies

- **Monorepo Tool**: pnpm workspaces
- **Node.js**: v24
- **TypeScript**: v5.9
- **API Framework**: Express 5
- **Database**: PostgreSQL with Drizzle ORM
- **Validation**: Zod (v4) and `drizzle-zod`
- **API Codegen**: Orval (from OpenAPI spec)
- **Build Tool**: esbuild

## TypeScript & Composite Projects

All packages extend `tsconfig.base.json` with `composite: true`. The root `tsconfig.json` defines project references for all packages, enabling cross-package type checking via `tsc --build --emitDeclarationOnly`.

## API Server (`artifacts/api-server`)

An Express 5 server using `@workspace/api-zod` for request/response validation and `@workspace/db` for data persistence. Routes are defined in `src/routes/`.

## Database Layer (`lib/db`)

Utilizes Drizzle ORM with PostgreSQL. It exports a Drizzle client instance and schema models. Migrations are handled by Replit in production, and `drizzle-kit push` is used for development.

## Aexon Endoscopy Application (`artifacts/aexon`)

A React 19 + Vite + TypeScript desktop application with the following key features:
- **UI Stack**: Tailwind CSS v4, Framer Motion, Lucide icons, Konva (image editor).
- **Branding**: Primary color is navy `#0C1E35`, with teal for success states. Fonts are Plus Jakarta Sans and Outfit.
- **Authentication & Subscription**: All backend communication is routed through the AEXON Connect API (`src/lib/aexonConnect.ts`). The API wraps all responses in `{success, data, error}` envelope — the `request()` function auto-unwraps this (including `attemptTokenRefresh`). Auth endpoints (`/auth/*`) skip the 401 auto-refresh/session-expiry handler (login API returns HTTP 401 for invalid credentials). Non-auth 401 responses trigger token refresh via POST /auth/refresh. JWT stored in `sessionStorage` (or `localStorage` if remember-me). Plans fetched from `/pricing` endpoint (returns plans with nested `products: { name }` structure, `is_popular`, `product_id`; normalized to flat `product_name` in `getPlans()`). `getSubscription()` normalizes `plan_type`/`plan` fields and derives active plan from status. Full `SubscriptionStatus` stored in App.tsx state and passed to Settings for live display (dates, status, billing cycle). Pricing.tsx (public pre-login page) also fetches from API. Features include login, registration, password management, profile updates, subscription management (with Xendit checkout polling), and device session handling.
- **Data Persistence**: Uses `localStorage` for data persistence.
- **Encryption**: AES-256-GCM via Web Crypto API for secure data storage. Legacy XOR cipher data is automatically migrated.
- **User Interface**: Features a light theme across the application. Components include a Launcher, Dashboard, SessionForm, EndoscopyApp, ReportGenerator, Gallery, Settings, and AdminDashboard.
- **Reporting**: Generates PDF reports using `html2canvas` and `jsPDF`, with custom styling.
- **Settings**: Provides tabs for Profile, Security, Letterhead (Kop Surat), Subscription, and Backup. Letterhead management includes anti-abuse protections for changes.
- **ICD Data**: Integrates ICD-9-CM and ICD-10 diagnoses with autocomplete functionality.
- **Routing**: Uses `wouter` for URL-based navigation, including navigation guards for active recording sessions.

## API Specification and Code Generation (`lib/api-spec`)

Manages the OpenAPI 3.1 specification (`openapi.yaml`) and Orval configuration (`orval.config.ts`). It generates:
- React Query hooks and a fetch client into `lib/api-client-react/src/generated/`.
- Zod schemas into `lib/api-zod/src/generated/`.

## Generated Zod Schemas (`lib/api-zod`)

Contains Zod schemas automatically generated from the OpenAPI specification, used for validation in the API server.

## Generated React Query Hooks (`lib/api-client-react`)

Contains React Query hooks and a fetch client automatically generated from the OpenAPI specification, used for API interaction in frontend applications.

# External Dependencies

- **PostgreSQL**: Primary database.
- **AEXON Connect API**: Used by the Aexon Endoscopy application for authentication, user management, subscription services, and billing.
- **Xendit**: Payment gateway integrated into the subscription checkout flow.
- **Orval**: API code generation tool.
- **Drizzle ORM**: Object-relational mapper for database interactions.
- **Zod**: Schema declaration and validation library.
- **Tailwind CSS**: Utility-first CSS framework.
- **Framer Motion**: Animation library for React.
- **Lucide icons**: Icon library.
- **Konva**: JavaScript 2D canvas library for image editing.
- **html2canvas**: JavaScript library to take screenshots of webpages.
- **jsPDF**: JavaScript library to generate PDFs.
- **wouter**: A tiny routing library for React.