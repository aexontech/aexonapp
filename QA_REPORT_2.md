# QA Report #2 — Bug Tambahan (Logic, UX, Edge Case)
**Tanggal:** 3 April 2026  
**Branch:** `master`  
**Scope:** Seluruh `artifacts/aexon/src/`

---

## Ringkasan

Ditemukan **22 bug baru** di luar 20 fix sebelumnya. Dikategorikan berdasarkan severity.

---

## CRITICAL (5)

### C1. `forceLogout` dan `handleLogout` tidak reset `hospitalSettingsList`

**File:** `src/App.tsx:221-233` (forceLogout), `src/App.tsx:666-683` (handleLogout)

Kedua fungsi logout me-reset semua state user (`userProfile`, `sessions`, `selectedPlan`, dll), tapi **tidak** mereset `hospitalSettingsList` (didefinisikan line 491).

**Impact:** Jika user A force-logout (device session conflict) lalu user B login di browser yang sama, user B bisa melihat kop surat RS milik user A yang masih tersisa di state. **Data confidentiality breach** — kop surat berisi nama, alamat, telepon RS.

**Fix:** Tambahkan `setHospitalSettingsList([])` di kedua fungsi logout.

---

### C2. `hasActiveAccess` punya logic redundan yang memberi akses salah

**File:** `src/App.tsx:72`

```ts
const hasActiveAccess = 
  (selectedPlan === 'subscription') || 
  (selectedPlan === 'enterprise' && subscriptionData?.active !== false) || 
  (selectedPlan === 'trial' && trialDaysLeft !== null && trialDaysLeft > 0) || 
  (trialDaysLeft !== null && trialDaysLeft > 0);  // ← REDUNDAN & BERBAHAYA
```

Kondisi ke-4 tidak memerlukan `selectedPlan` — artinya jika `selectedPlan === null` (selama initial load / setelah expiry) tapi `trialDaysLeft > 0` (stale dari fetch sebelumnya), user tetap dianggap punya akses.

**Impact:** User dengan subscription expired tapi `trialDaysLeft` stale bisa tetap akses fitur endoskopi.

**Fix:** Hapus kondisi ke-4 (sudah tercover oleh kondisi ke-3).

---

### C3. AdminDashboard menghitung `inactiveCount` dari role yang tidak ada di schema

**File:** `src/components/AdminDashboard.tsx:84-85`

```ts
const activeCount = doctors.filter(d => d.role === 'doctor').length;
const inactiveCount = doctors.filter(d => d.role === 'inactive_doctor').length;
```

Schema `profiles.role` hanya bisa `'doctor' | 'admin'` — tidak ada `'inactive_doctor'`. Status aktif/inaktif ada di kolom `profiles.status` (`'active' | 'inactive'`).

**Impact:** `inactiveCount` **selalu 0**. Admin enterprise melihat 0 dokter inaktif meskipun ada yang sudah di-nonaktifkan. Dashboard statistik menyesatkan.

**Fix:** Ganti ke:
```ts
const activeCount = doctors.filter(d => d.status === 'active').length;
const inactiveCount = doctors.filter(d => d.status === 'inactive').length;
```

---

### C4. Blob URL memory leak — tidak pernah di-revoke

**Files:** 
- `src/lib/draftSession.ts:115` — `URL.createObjectURL()` saat load draft video
- `src/lib/electronStorage.ts:250` — `URL.createObjectURL()` saat load session dari disk
- `src/components/EndoscopyApp.tsx:518` — `URL.createObjectURL()` saat stop recording

Seluruh codebase hanya punya 2x `revokeObjectURL` (di `Settings.tsx` dan `Gallery.tsx`). Semua video blob URL dari recording, draft recovery, dan session loading **tidak pernah di-revoke**.

**Impact:** Setiap video rekaman menahan memory (~5-50MB per blob) sampai tab ditutup. Dokter yang rekam 10+ video per sesi bisa kehabisan memory → browser crash → data loss.

**Fix:** Track blob URLs dan revoke saat unmount/session end:
```ts
// Di EndoscopyApp cleanup effect:
captures.forEach(c => {
  if (c.type === 'video' && c.url.startsWith('blob:')) {
    URL.revokeObjectURL(c.url);
  }
});
```

---

### C5. `handleEndSession` tidak menunggu `persistSessions` selesai

**File:** `src/App.tsx:626-639`

```ts
const handleEndSession = (session: Session) => {
  const updatedSessions = [session, ...sessions];
  setSessions(updatedSessions);
  persistSessions(updatedSessions);  // ← async, TIDAK di-await
  ...
  navigate('/session/report');        // ← navigasi langsung
};
```

`persistSessions` (line 482-488) adalah async — bisa gagal jika storage penuh. Tapi navigation sudah terjadi sebelum persist selesai.

**Impact:** Jika IndexedDB penuh atau write gagal, session hilang tapi user sudah di halaman report. Saat refresh → session tidak ada di storage.

**Fix:** Await `persistSessions` dan block navigasi sampai selesai, atau simpan di state dulu sebagai fallback.

---

## HIGH (8)

### H1. Launcher tidak punya opsi "Ingat Saya" — token selalu di `sessionStorage`

**File:** `src/components/Launcher.tsx:244`, `src/lib/aexonConnect.ts:362`

```ts
// Launcher.tsx
const { data: loginData, error: loginError } = await aexonConnect.login(email, password);
// Default: remember = false → token di sessionStorage
```

Tidak ada checkbox "Ingat Saya" di Launcher. `login()` default `remember=false`, sehingga token hanya di `sessionStorage`. **Token hilang saat browser/tab ditutup**.

**Impact:** User harus login ulang setiap kali buka app di browser. Sangat mengganggu UX — terutama untuk dokter yang buka-tutup app seharian.

**Fix:** Tambahkan state `rememberMe` dengan checkbox di form login, pass ke `aexonConnect.login(email, password, rememberMe)`.

---

### H2. Race condition: subscription fetch gagal tapi profile berhasil saat restore

**File:** `src/App.tsx:104-139`

```ts
const { data: profile } = await aexonConnect.getProfile();
// ... profile set berhasil
const { data: subStatus } = await aexonConnect.getSubscription();
// Jika ini gagal (network flaky), subStatus = null
if (subStatus) {
  setSelectedPlan(subStatus.plan_type ?? null);  // TIDAK dijalankan
}
```

Jika `getSubscription()` gagal tapi `getProfile()` berhasil: `userProfile` ada tapi `selectedPlan = null`. User masuk ke dashboard tapi `hasActiveAccess = false` → fitur terkunci.

**Impact:** Dokter dengan subscription aktif tidak bisa mulai sesi endoskopi karena network flaky saat startup. Tidak ada retry mechanism.

**Fix:** Tambahkan retry untuk subscription fetch, atau set flag `subscriptionFetchFailed` untuk trigger retry di background.

---

### H3. `initialCaptures` bisa leak ke session baru

**File:** `src/App.tsx:560-566`

```ts
const handleResumeSession = () => {
  setInitialCaptures(resumeDraft.captures);  // Set captures dari draft lama
  navigate('/session/active');
};
```

`initialCaptures` di-reset di `handleEndSession` (line 636), tapi jika user:
1. Resume draft → `initialCaptures` diisi
2. Navigasi keluar (nav guard) tanpa menyelesaikan sesi
3. Mulai sesi baru via SessionForm

`initialCaptures` masih berisi captures dari draft sebelumnya → sesi baru muncul dengan foto/video lama.

**Fix:** Reset `initialCaptures` di `handleStartSession`:
```ts
const handleStartSession = (data: PatientData) => {
  setInitialCaptures([]);  // ← tambahkan ini
  setPatientData(data);
  navigate('/session/active');
};
```

---

### H4. License check effect bisa re-register interval berlebihan

**File:** `src/App.tsx:252-295`

Dependency array: `[userProfile, forceLogout]`. `forceLogout` di-memoize dengan `[navigate, showToast]`. Setiap kali `navigate` atau `showToast` berubah referensi:
1. `forceLogout` berubah
2. Effect di line 252 re-run
3. Interval lama di-clear, interval baru dibuat
4. `checkLicense()` dipanggil lagi (line 285)

Ini bisa menyebabkan burst API calls saat context provider re-render.

**Impact:** Ratusan request ke `/subscription/status` dan `/check-session` dalam waktu singkat → rate limiting dari server.

**Fix:** Gunakan ref untuk `forceLogout` callback:
```ts
const forceLogoutRef = useRef(forceLogout);
forceLogoutRef.current = forceLogout;
// Dalam effect, panggil forceLogoutRef.current(...)
```

---

### H5. `viewingSession` tidak di-reset saat back dari report

**File:** `src/App.tsx:825-831`

```tsx
<Route path="/session/report">
  {viewingSession ? (
    <ReportGenerator
      onBack={() => { navigate('/patient-profile'); }}  // ← TIDAK reset viewingSession
    />
  ) : <RouteRedirect to="/dashboard" />}
</Route>
```

Saat user tekan Back dari report → navigasi ke `/patient-profile`. `viewingSession` masih terisi. Ini benar untuk flow normal. Tapi jika user kemudian navigasi manual ke `/patient-profile` via URL atau browser history, mereka melihat session lama tanpa konteks.

**Impact:** Rendah untuk flow normal, tapi bisa membingungkan jika navigasi via URL.

---

### H6. Video draft silently hilang jika blob URL sudah expired

**File:** `src/lib/draftSession.ts:79-86`

```ts
const response = await fetch(capture.url);  // capture.url = blob URL
const blob = await response.blob();
if (blob.size === 0) return null;  // ← silent drop
```

Jika blob URL sudah expired (misal setelah tab navigate away lalu kembali), `fetch()` gagal atau return empty blob → video **hilang tanpa notifikasi** ke user.

**Impact:** Dokter kehilangan rekaman video tanpa tahu. Data klinis hilang.

**Fix:** Throw error atau return status yang menandakan kegagalan, lalu tampilkan toast ke user.

---

### H7. `handleCancelSubscription` hanya reset state lokal, tidak panggil API

**File:** `src/App.tsx:685-688`

```ts
const handleCancelSubscription = () => {
  setSelectedPlan(null);
  showToast('Paket berlangganan telah dibatalkan.', 'warning');
};
```

Fungsi ini hanya set `selectedPlan = null` secara lokal. **Tidak ada API call** ke backend. Subscription tetap aktif di server.

**Impact:** User dikira sudah cancel, tapi saat refresh app → subscription masih aktif dari server. Atau lebih buruk: auto-renew masih jalan → user kena charge tanpa sadar.

**Fix:** Panggil `aexonConnect.cancelSubscription()` (sudah ada di client) dan handle response sebelum update state.

---

### H8. Empty session bisa tersimpan tanpa warning

**File:** `src/components/EndoscopyApp.tsx:670-695`

```ts
const handleFinishSession = () => {
  const session: Session = {
    captures: captures,  // Bisa [] (kosong)
    status: 'completed'
  };
  onEndSession(session);  // Langsung simpan
};
```

Tidak ada validasi `captures.length > 0`. Dokter bisa finish session dengan 0 foto/video → session tersimpan tapi tidak ada evidence klinis.

**Impact:** Session kosong memenuhi storage tanpa nilai klinis. Bisa jadi masalah medicolegal jika dokter mengira sudah capture tapi ternyata belum.

**Fix:** Tampilkan ConfirmModal jika `captures.length === 0`:
```
"Sesi ini belum memiliki foto atau video. Yakin ingin menyelesaikan?"
```

---

## MEDIUM (6)

### M1. Checkout countdown bisa reset berulang

**File:** `src/components/Checkout.tsx:83-91`

```ts
useEffect(() => {
  if (!isResultScreen) { setCountdown(AUTO_REDIRECT_SECONDS); return; }
  ...
}, [isResultScreen, countdown, paymentStatus, onSuccess, onDone]);
```

Jika `onSuccess` atau `onDone` berubah referensi (parent re-render), countdown reset ke 10 detik lagi. Auto-redirect bisa tertunda indefinitely.

---

### M2. SessionForm button enabled tapi submit gagal

**File:** `src/components/SessionForm.tsx:195-197`

Button "Mulai sesi" hanya cek `!formData.name.trim()`, tapi validasi submit (line 107) butuh `name && rmNumber && procedures_icd9[0]`. User bisa klik button enabled, tapi form tidak submit → membingungkan.

---

### M3. JSON parse failure di `storage.ts` silently fallback ke data encrypted

**File:** `src/lib/storage.ts:172-177`

Jika decrypt berhasil tapi JSON malformed, catch block coba `JSON.parse(idbRaw)` pada data yang masih encrypted → pasti gagal, tapi error tersembunyi.

---

### M4. `captureToBytes` inconsistent await pattern

**File:** `src/lib/electronStorage.ts:107-110`

```ts
const result = captureToBytes(capture);  // Promise assigned
const converted = await result;          // Then awaited separately
```

Pattern membingungkan, meski fungsional. Seharusnya langsung `const converted = await captureToBytes(capture)`.

---

### M5. Stale closure di `refreshSubscriptionStatus` effect

**File:** `src/App.tsx:385-389`

```ts
useEffect(() => {
  if (userProfile) { refreshSubscriptionStatus(); }
}, [userProfile?.id]);  // ← missing: refreshSubscriptionStatus
```

`refreshSubscriptionStatus` memoized dengan `[userProfile]`, tapi effect hanya depend on `userProfile?.id`. Jika userProfile object berubah (name update) tanpa ID berubah, effect tidak re-run tapi callback sudah stale.

---

### M6. Draft sessions tidak punya TTL — bisa menumpuk

**File:** `src/lib/draftSession.ts`

Drafts disimpan per `userId` sebagai key di IndexedDB, jadi paling 1 per user. Tapi jika user ganti akun di browser yang sama, drafts dari akun lama tetap ada di IndexedDB selamanya (key berbeda).

**Impact:** IndexedDB membengkak seiring waktu. Tidak ada mekanisme cleanup.

---

## LOW (3)

### L1. Enterprise user bisa sekilas lihat plan selection page

**File:** `src/App.tsx:872-884`

Guard `if (selectedPlan === 'enterprise')` bergantung pada async state. Saat initial load, `selectedPlan = null` → page renders sekilas sebelum redirect.

---

### L2. Promo validation loading state reset timing

**File:** `src/components/Checkout.tsx:143`

Early return dari error path tidak explicit reset `promoLoading` — bergantung pada `finally` block. Fungsional tapi fragile.

---

### L3. PlanSelection `showToast` tidak di dependency array

**File:** `src/components/PlanSelection.tsx:34`

`useEffect` panggil `showToast` tapi deps hanya `[]`. Stale closure jika toast provider re-mount.

---

## Prioritas Fix

| # | Bug | Severity | Effort | Impact |
|---|-----|----------|--------|--------|
| 1 | C1: Logout tidak reset hospitalSettingsList | 🔴 Critical | 2 min | Data leak antar user |
| 2 | C2: hasActiveAccess logic redundan | 🔴 Critical | 2 min | Akses salah |
| 3 | C3: AdminDashboard inactive count selalu 0 | 🔴 Critical | 5 min | Dashboard menyesatkan |
| 4 | C4: Blob URL memory leak | 🔴 Critical | 20 min | Browser crash |
| 5 | C5: persistSessions tidak di-await | 🔴 Critical | 10 min | Session hilang |
| 6 | H1: Tidak ada "Ingat Saya" | 🟡 High | 15 min | Login ulang tiap buka |
| 7 | H2: Subscription fetch race condition | 🟡 High | 10 min | Fitur terkunci |
| 8 | H3: initialCaptures leak ke session baru | 🟡 High | 2 min | Data pollution |
| 9 | H4: License check interval re-register | 🟡 High | 10 min | API spam |
| 10 | H6: Video draft silent loss | 🟡 High | 10 min | Data klinis hilang |
| 11 | H7: cancelSubscription tidak panggil API | 🟡 High | 10 min | User tetap kena charge |
| 12 | H8: Empty session tanpa warning | 🟡 High | 10 min | Session tanpa evidence |
