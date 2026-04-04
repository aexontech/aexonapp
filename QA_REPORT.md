# QA Report — Aexon App
**Tanggal:** 3 April 2026  
**Branch:** `master`  
**Scope:** `artifacts/aexon/` (changed files)

---

## Ringkasan

| Check | Status | Detail |
|-------|--------|--------|
| **Production Build** | ✅ PASS | 6.90s, output di `dist/public` |
| **TypeScript Typecheck** | ❌ FAIL | 43 errors |
| **Bundle Size** | ⚠️ WARNING | Main chunk 3,078 KB (698 KB gzip) — melebihi batas 500 KB |
| **Lib Typecheck** | ❌ FAIL | `lib/api-client-react/tsconfig.json` — no inputs found |

---

## 1. TypeScript Errors (43 total)

### 🔴 CRITICAL — Type Mismatch di Profile Data

**File:** `src/App.tsx` (lines 120, 124, 132, 133, 408, 416, 420)

Code mengakses `profile.specialty`, `profile.last_name_change_at`, dan `profile.preferences` dari response API, tapi type definition di `aexonConnect.ts` hanya punya `specialization`, bukan `specialty`.

```
TS2339: Property 'specialty' does not exist on type ProfileData
TS2339: Property 'last_name_change_at' does not exist on type ProfileData
TS2339: Property 'preferences' does not exist on type ProfileData
```

**Impact:** Data profil dokter bisa silent-fail — specialization tampil "Spesialis" (fallback) padahal API sebenarnya return data yang benar via field name berbeda.

**Fix:** Update `ProfileData` type di `aexonConnect.ts` untuk menambahkan field `specialty`, `last_name_change_at`, dan `preferences`. Atau sesuaikan akses ke `profile.specialization`.

---

### 🔴 CRITICAL — `"trial"` Tidak Ada di Plan Type Union

**File:** `src/App.tsx` (lines 138, 207, 278), `src/components/Launcher.tsx` (line 337)

```
TS2345: Type '"trial"' is not assignable to type '"subscription" | "enterprise" | null'
```

State `selectedPlan` didefinisikan sebagai `"subscription" | "enterprise" | null`, tapi API bisa return `"trial"`. Artinya trial plan **tidak pernah ter-set** di state, dan UI subscription bisa menampilkan status yang salah.

**Impact:** Dokter dengan trial subscription mungkin melihat UI yang incorrect — bisa dikira belum berlangganan.

**Fix:** Tambahkan `"trial"` ke plan type union:
```ts
const [selectedPlan, setSelectedPlan] = useState<"subscription" | "enterprise" | "trial" | null>(null);
```

---

### 🟡 HIGH — `window.aexonStorage` Tidak Typed (20 occurrences)

**Files:** `src/App.tsx`, `src/components/Launcher.tsx`, `src/components/ReportGenerator.tsx`, `src/components/PatientProfile.tsx`, `src/components/DiskSpaceIndicator.tsx`, `src/lib/electronStorage.ts`

```
TS2551: Property 'aexonStorage' does not exist on type 'Window & typeof globalThis'
```

**Impact:** Tidak ada autocomplete/type-safety untuk Electron bridge API. Runtime tetap berjalan karena Vite skip typecheck saat build, tapi rentan typo.

**Fix:** Tambahkan Window augmentation:
```ts
// src/types/global.d.ts
declare global {
  interface Window {
    aexonStorage?: AexonStorageBridge;
    aexonPlatform?: string;
  }
}
```

---

### 🟡 HIGH — Impossible Type Comparison di PatientProfile

**File:** `src/components/PatientProfile.tsx` (lines 114, 150)

```
TS2367: This comparison appears to be unintentional because the types '"video"' and '"photo"' have no overlap.
```

Code: `c.type === 'photo'` — tapi `Capture.type` hanya bisa `'image' | 'video'`. Jadi filter `c.type === 'photo'` **selalu false** dan foto yang type-nya bukan `'image'` tidak pernah tercakup.

**Impact:** Jika ada capture lama dengan `type: 'photo'` (misal dari migrasi data), mereka tidak akan muncul di photo count/filter.

**Fix:** Hapus `|| c.type === 'photo'` jika memang sudah tidak ada data lama, atau tambahkan `'photo'` ke `Capture.type` union di `types.ts`.

---

### 🟠 MEDIUM — SubscriptionPage Nullable Destructure

**File:** `src/components/SubscriptionPage.tsx` (line 420)

```
TS2488: Type '[string, string] | null' must have a '[Symbol.iterator]()' method
```

Array items bisa `null` setelah ternary, lalu di-destructure `([label, value])` setelah `.filter(Boolean)`. TypeScript tidak bisa narrow type setelah `filter(Boolean)`.

**Fix:** Cast filter result:
```ts
.filter((item): item is [string, string] => item !== null)
```

---

### 🟠 MEDIUM — SubscriptionPage Menerima Prop yang Tidak Ada di Interface

**File:** `src/App.tsx` (line 897)

```
TS2322: Property 'subscriptionData' does not exist on type 'SubscriptionPageProps'
```

**Fix:** Tambahkan `subscriptionData` ke `SubscriptionPageProps` interface.

---

### 🔵 LOW — Launcher Optional String

**File:** `src/components/Launcher.tsx` (line 393)

```
TS2322: Type 'string | undefined' is not assignable to type 'string'
```

**Fix:** Default value atau null assertion.

---

## 2. Build Warnings

### ⚠️ Bundle Size — Main Chunk 3,078 KB

```
dist/public/assets/index-B3AwN1Y9.js  3,078.10 kB │ gzip: 697.90 kB
```

**Rekomendasi:**
- **Code split** heavy components (ReportGenerator, ImageEditor, EndoscopyApp) via `React.lazy()`
- **Manual chunks** untuk Konva.js, jsPDF — split via `build.rollupOptions.output.manualChunks`
- Target < 500 KB per chunk

### ⚠️ Mixed Import — `aexonConnect.ts`

`aexonConnect.ts` di-import baik secara dynamic (`import()`) maupun static (`import ... from`) oleh berbagai component. Vite warning: dynamic import tidak bisa dipindah ke chunk terpisah.

**Fix:** Konsistenkan ke satu pattern — static import saja (karena sudah bundled bersama anyway).

---

## 3. Lib Typecheck Failure

```
error TS18003: No inputs were found in config file 'lib/api-client-react/tsconfig.json'
```

`lib/api-client-react/` kosong (belum di-codegen). Root `pnpm typecheck` gagal.

**Fix:** Tambahkan `"skipLibCheck": true` atau exclude package ini dari typecheck saat codegen belum dijalankan.

---

## 4. Logic & Code Quality Issues

### 🔴 `specialty` vs `specialization` Naming Inconsistency

- `types.ts` → `UserProfile.specialization`
- `aexonConnect.ts` ProfileData → `specialization`
- `App.tsx` runtime → `profile.specialty`
- API response (Supabase) → kemungkinan `specialty`

Ada disconnect antara type definition dan actual API response. Code tetap jalan karena Vite tidak typecheck saat build, tapi ini silent bug.

### 🟡 Debug Console Logs Left in Production

**File:** `src/App.tsx:120`
```ts
console.log('[AEXON DEBUG] getProfile response:', JSON.stringify({...}));
```

Debug log yang menampilkan data profil dokter (nama, specialty, email) di console. **Harus dihapus sebelum production** — ini data medis yang sensitif.

### 🟡 Deleted Files Perlu Diperiksa

Files yang dihapus dari git:
- `src/components/AdminKopSurat.tsx` — pastikan tidak ada import/reference tersisa
- `src/components/ManageSubscription.tsx` — pastikan routing tidak mengarah ke sini
- `artifacts/mockup-sandbox/` — seluruh directory dihapus

---

## 5. Code Review — Additional Findings

### 🔴 CRITICAL — Untyped `any[]` di Session Loading

**File:** `src/App.tsx` (lines 443-467)

`loadUserData<any[]>` dan `.map((s: any) => ...)` bypass semua type checking untuk data session pasien. Jika struktur data berubah, error hanya muncul di runtime.

**Fix:** Gunakan `loadUserData<Session[]>` dan type setiap mapper.

---

### 🟡 HIGH — Race Condition: Device Session Check

**File:** `src/App.tsx` (lines 107-118)

Saat session restore, device session dicek tapi `kickOutMessageRef` (ref, bukan state) bisa hilang jika multiple state updates terjadi bersamaan sebelum `restoringSession` = false.

**Fix:** Gunakan state alih-alih ref untuk kick-out message.

---

### 🟡 HIGH — Unhandled Promise: Draft Session Recovery

**File:** `src/App.tsx` (lines 160-167)

```ts
hasDraftSession(userId).then((hasDraft) => {
  loadDraftSession(userId).then((draft) => {
    // No error handling
  });
});
```

Nested `.then()` tanpa `.catch()`. Jika IndexedDB corrupt atau unavailable, error silent.

**Fix:** Wrap dalam `try/catch` dengan async-await.

---

### 🟡 HIGH — Recording Buffer Cleanup Missing

**File:** `src/components/EndoscopyApp.tsx` (lines 520-625)

`currentRecordingIdRef.current` hanya di-clear di `recorder.onstop`. Jika component unmount saat recording, ref tetap stale → recording berikutnya append ke ID lama.

**Fix:** Tambahkan cleanup di `useEffect` return.

---

### 🟡 HIGH — Global Zoom Side Effect

**File:** `src/components/Settings.tsx` (lines 363-398)

`document.documentElement.style.zoom = "1"` diset sebelum crop modal, tapi tidak di-reset di semua error paths. Bisa merusak layout seluruh app.

**Fix:** Gunakan CSS transform pada element spesifik, bukan global zoom.

---

### 🟠 MEDIUM — Promo Discount > Subtotal

**File:** `src/components/Checkout.tsx` (lines 80-92)

`Math.max(0, subtotal - promoDiscount)` mencegah harga negatif, tapi user tidak dapat feedback jika diskon melebihi subtotal.

---

### 🟠 MEDIUM — Empty Device List tanpa Feedback

**File:** `src/components/EndoscopyApp.tsx` (lines 776-789)

Jika tidak ada kamera terdeteksi, dropdown kosong tanpa pesan error.

---

### 🔵 LOW — Missing Loading/Error State di DiskSpaceIndicator

**File:** `src/components/DiskSpaceIndicator.tsx`

Component return nothing saat loading, tidak ada spinner atau error state.

---

## 6. Security Notes

| Item | Status |
|------|--------|
| JWT storage | ✅ sessionStorage (default), localStorage hanya dengan "remember me" |
| Debug logs di production | ⚠️ `console.log` menampilkan data profil dokter |
| Electron encryption | ✅ AES-256-GCM + PBKDF2 |
| API auth | ✅ Bearer token, 401 auto-refresh |

---

## 6. Prioritas Fix

| # | Issue | Severity | Effort |
|---|-------|----------|--------|
| 1 | Tambah `"trial"` ke plan type union | 🔴 Critical | 5 min |
| 2 | Fix `specialty` → sync dengan API response | 🔴 Critical | 15 min |
| 3 | Tambah `last_name_change_at`, `preferences` ke ProfileData | 🔴 Critical | 10 min |
| 4 | Hapus debug console.log | 🟡 High | 2 min |
| 5 | Tambah Window type augmentation untuk Electron bridge | 🟡 High | 10 min |
| 6 | Fix PatientProfile `'photo'` comparison | 🟡 High | 5 min |
| 7 | Fix SubscriptionPage nullable destructure | 🟠 Medium | 5 min |
| 8 | Tambah `subscriptionData` ke SubscriptionPageProps | 🟠 Medium | 5 min |
| 9 | Fix untyped `any[]` di session loading | 🔴 Critical | 15 min |
| 10 | Fix draft session unhandled promise | 🟡 High | 10 min |
| 11 | Fix recording buffer cleanup on unmount | 🟡 High | 10 min |
| 12 | Fix global zoom side effect di Settings | 🟡 High | 15 min |
| 13 | Fix race condition device session ref → state | 🟡 High | 10 min |
| 14 | Code splitting untuk bundle size | 🔵 Low | 30 min |
| 15 | Fix lib typecheck config | 🔵 Low | 5 min |

---

## Total Issues

| Severity | Count |
|----------|-------|
| 🔴 Critical | 4 |
| 🟡 High | 9 |
| 🟠 Medium | 4 |
| 🔵 Low | 3 |
| **Total** | **20** |
