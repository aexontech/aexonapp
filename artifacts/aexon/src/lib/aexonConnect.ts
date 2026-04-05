const AEXON_CONNECT_API_URL = (
  import.meta.env.VITE_AEXON_CONNECT_API_URL || ""
).replace(/\/+$/, "");

const TOKEN_KEY = "aexon_jwt_token";
const REFRESH_TOKEN_KEY = "aexon_refresh_token";
const SESSION_TOKEN_KEY = "aexon_session_token";
const LAST_ONLINE_KEY = "aexon_last_online";
const OFFLINE_EXPIRY_MS = 30 * 60 * 60 * 1000; // 30 jam — operasi bisa memakan waktu hingga 12 jam

if (!AEXON_CONNECT_API_URL) {
  console.warn(
    "[AexonConnect] VITE_AEXON_CONNECT_API_URL is not set. API calls will fail.",
  );
}

// ─── Token (JWT) ─────────────────────────────────────────────────────────────

function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getStoredRefreshToken(): string | null {
  try {
    return (
      sessionStorage.getItem(REFRESH_TOKEN_KEY) ||
      localStorage.getItem(REFRESH_TOKEN_KEY)
    );
  } catch {
    return null;
  }
}

function storeToken(token: string, refreshToken?: string, remember = false) {
  try {
    const storage = remember ? localStorage : sessionStorage;
    storage.setItem(TOKEN_KEY, token);
    if (refreshToken) storage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    if (!remember) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    }
  } catch {}
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {}
}

// ─── Session Token (device session) ─────────────────────────────────────────

function getStoredSessionToken(): string | null {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

function storeSessionToken(token: string) {
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {}
}

function clearSessionToken() {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {}
}

// ─── Offline tracking ────────────────────────────────────────────────────────

function updateLastOnline() {
  try {
    localStorage.setItem(LAST_ONLINE_KEY, Date.now().toString());
  } catch {}
}

export function isOfflineTooLong(): boolean {
  try {
    const last = localStorage.getItem(LAST_ONLINE_KEY);
    if (!last) return false;
    return Date.now() - parseInt(last, 10) > OFFLINE_EXPIRY_MS;
  } catch {
    return false;
  }
}

export function clearLastOnline() {
  try {
    localStorage.removeItem(LAST_ONLINE_KEY);
  } catch {}
}

// ─── Session expired callback ────────────────────────────────────────────────

let _onSessionExpired: (() => void) | null = null;

export function onSessionExpired(callback: () => void) {
  _onSessionExpired = callback;
}

// ─── Token refresh ───────────────────────────────────────────────────────────

async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${AEXON_CONNECT_API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (res.ok) {
      const body = await res.json();
      const payload =
        body && typeof body === "object" && "success" in body
          ? body.data
          : body;
      if (payload?.token) {
        const isRemember = !!localStorage.getItem(TOKEN_KEY);
        storeToken(payload.token, payload.refresh_token, isRemember);
        return payload.token;
      }
    }
  } catch {}
  return null;
}

// ─── Core request ────────────────────────────────────────────────────────────

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
  _isRetry = false,
): Promise<{ data: T | null; error: string | null; status: number }> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!AEXON_CONNECT_API_URL) {
    console.error(
      "[AexonConnect] API URL not configured. Set VITE_AEXON_CONNECT_API_URL.",
    );
    return {
      data: null,
      error: "AEXON Connect API belum dikonfigurasi. Hubungi administrator.",
      status: 0,
    };
  }

  const fullUrl = `${AEXON_CONNECT_API_URL}${endpoint}`;
  console.log(`[AexonConnect] ${options.method || "GET"} ${fullUrl}`);

  try {
    const res = await fetch(fullUrl, { ...options, headers });

    let body: any = null;
    const contentType = res.headers.get("content-type");
    if (contentType?.includes("application/json")) {
      body = await res.json();
    }

    const isEnvelope = body && typeof body === "object" && "success" in body;
    const envelopeData = isEnvelope ? body.data : body;
    const envelopeError = isEnvelope
      ? body.error
      : body?.message || body?.error;
    const envelopeSuccess = isEnvelope ? body.success : res.ok;

    const isAuthEndpoint = endpoint.startsWith("/auth/");
    if (res.status === 401 && !_isRetry && !isAuthEndpoint) {
      const newToken = await attemptTokenRefresh();
      if (newToken) {
        return request<T>(endpoint, options, true);
      }
      return {
        data: null,
        error: "Token tidak valid. Silakan cek koneksi internet.",
        status: 401,
      };
    }

    if (res.ok) {
      updateLastOnline();
    }

    if (res.status === 404) {
      return {
        data: null,
        error: envelopeError || "Fitur ini belum tersedia.",
        status: 404,
      };
    }

    if (!res.ok || envelopeSuccess === false) {
      return {
        data: null,
        error: envelopeError || `Request failed (${res.status})`,
        status: res.status,
      };
    }

    return { data: envelopeData as T, error: null, status: res.status };
  } catch (err: any) {
    return {
      data: null,
      error: err.message || "Koneksi gagal. Periksa internet dan coba lagi.",
      status: 0,
    };
  }
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface LoginResponse {
  token: string;
  refresh_token?: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: "doctor" | "admin";
    enterprise_id?: string | null;
    specialization?: string;
    str_number?: string;
    sip_number?: string;
    phone?: string;
    last_name_change_date?: string | null;
    preferences?: { fontSize: number } | null;
  };
}

export interface SubscriptionStatus {
  status: string;
  active?: boolean;
  plan_type: "subscription" | "enterprise" | "trial" | null;
  plan: { billing_cycle?: string; price?: number; original_price?: number | null; is_beta?: boolean; products?: { name?: string } } | null;
  trial_days_left: number | null;
  plan_name?: string;
  billing_cycle?: string;
  created_at?: string;
  current_period_start?: string;
  starts_at?: string;
  expires_at?: string;
  auto_renew?: boolean;
  is_grace?: boolean;
  plan_id?: string;
  grace_until?: string;
  trial_ends_at?: string;
  // Enterprise-specific
  institution_id?: string;
  institution_name?: string;
  institution_expired?: boolean;
  institution_days_left?: number;
  institution_total_seats?: number;
  institution_used_seats?: number;
  is_admin?: boolean;
}

export interface ToggleAutoRenewResponse {
  auto_renew: boolean;
}

export interface InvoiceResponse {
  invoice_id: string;
  order_id?: string;
  invoice_url: string;
  amount: number;
  status: string;
}

/** Response dari /login-session */
export interface CreateSessionResponse {
  session_token: string;
}

/** Response dari /check-session */
export interface CheckSessionResponse {
  valid: boolean;
}

export interface Plan {
  id: string;
  billing_cycle: "monthly" | "annual";
  price: number;
  original_price: number | null;
  features: string[];
  is_popular?: boolean;
  product_id?: string;
  products?: {
    name: string;
    slug?: string | null;
    description?: string;
  };
  product_name: string;
}

// ─── Support Ticket Interfaces ──────────────────────────────────────────────

export type SupportCategory = "bug" | "fitur" | "akun" | "pembayaran" | "lainnya";
export type SupportPriority = "low" | "normal" | "high";
export type TicketStatus = "new" | "in_progress" | "resolved";

export interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: TicketStatus;
  attachment_url?: string | null;
  created_at: string;
  updated_at: string;
  unread?: boolean;
  last_reply_at?: string | null;
}

export interface SupportMessage {
  id: string;
  ticket_id: string;
  message: string;
  sender: "user" | "admin";
  created_at: string;
}

export interface SupportTicketDetail extends SupportTicket {
  messages: SupportMessage[];
}

export interface SupportUnreadCount {
  unread_count: number;
}

export interface PromoValidation {
  code: string;
  discount_type: "percentage" | "fixed";
  discount_value: number;
  label: string;
}

export interface BillingHistoryItem {
  id: string;
  order_id?: string;
  invoice_number?: string;
  access_key?: string;
  plan_name?: string;
  billing_cycle?: string;
  is_beta?: boolean;
  original_price?: number | null;
  amount: number;
  status: string;
  created_at: string;
  invoice_url?: string;
  subscriptions?: {
    billing_cycle?: string;
    product_plans?: {
      is_beta?: boolean;
      price?: number;
      original_price?: number | null;
      products?: { name?: string };
    };
  };
}

// ─── API Client ───────────────────────────────────────────────────────────────

export const aexonConnect = {
  getToken: getStoredToken,

  clearSession() {
    clearToken();
    clearSessionToken();
  },

  // ── Auth ──────────────────────────────────────────────────────────────────

  async login(
    email: string,
    password: string,
    remember = false,
  ): Promise<{ data: LoginResponse | null; error: string | null }> {
    const { data, error } = await request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (data?.token) {
      storeToken(data.token, data.refresh_token, remember);
    }
    return { data, error };
  },

  async register(payload: {
    email: string;
    password: string;
    full_name: string;
    str_number?: string;
    sip_number?: string;
    specialization?: string;
  }): Promise<{ data: any; error: string | null }> {
    return request("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async resetPassword(
    email: string,
  ): Promise<{ data: any; error: string | null }> {
    return request("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });
  },

  async getProfile(): Promise<{
    data: LoginResponse["user"] | null;
    error: string | null;
  }> {
    return request<LoginResponse["user"]>("/auth/profile");
  },

  async changePassword(
    current_password: string,
    new_password: string,
  ): Promise<{ data: any; error: string | null }> {
    return request("/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ current_password, new_password }),
    });
  },

  async updateProfile(
    payload: Record<string, any>,
  ): Promise<{ data: any; error: string | null }> {
    return request("/auth/profile", {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async logout(): Promise<void> {
    try {
      await request("/auth/logout", { method: "POST" });
    } catch {}
    clearToken();
    clearSessionToken();
  },

  // ── Subscription ──────────────────────────────────────────────────────────

  async getSubscription(): Promise<{
    data: SubscriptionStatus | null;
    error: string | null;
    status: number;
  }> {
    // ✅ FIXED: /subscription → /subscription/status (mengikuti Connect)
    const result = await request<any>("/subscription/status");
    if (result.data) {
      const d = result.data;
      const status = d.status || "none";
      // d.plan = { billing_cycle, price, original_price, is_beta, products: { name } }
      const planObj = d.plan && typeof d.plan === "object" ? d.plan : null;
      const billingCycle = d.billing_cycle || planObj?.billing_cycle || null;
      const isBeta = planObj?.is_beta ?? (planObj?.original_price != null && planObj?.original_price > planObj?.price);
      const cycleLabel = billingCycle === "annual" ? "Tahunan" : billingCycle === "monthly" ? "Bulanan" : null;
      // Derive nama: "Beta — Tahunan" / "Standard — Bulanan" (sama dengan PlanSelection)
      const planName = cycleLabel
        ? `${isBeta ? "Beta" : "Standard"} — ${cycleLabel}`
        : planObj?.products?.name ?? null;
      const planType = d.plan_type || (status === "trial" ? "trial" : null);
      result.data = {
        ...d,
        status,
        plan_name: planName,
        plan_type: planType,
        billing_cycle: billingCycle,
        current_period_start: d.current_period_start ?? null,
        trial_days_left: d.trial_days_left ?? null,
      };
    }
    return result as {
      data: SubscriptionStatus | null;
      error: string | null;
      status: number;
    };
  },

  async toggleAutoRenew(): Promise<{
    data: ToggleAutoRenewResponse | null;
    error: string | null;
  }> {
    return request<ToggleAutoRenewResponse>("/subscription/toggle-renew", {
      method: "POST",
    });
  },

  // Nonaktifkan auto_renew — alias toggle yang lebih eksplisit
  async cancelSubscription(): Promise<{
    data: { auto_renew: boolean } | null;
    error: string | null;
  }> {
    return request<{ auto_renew: boolean }>("/subscription/toggle-renew", {
      method: "POST",
    });
  },

  async getPaymentUrl(invoiceNumber: string): Promise<{
    data: { invoice_url: string; status: string } | null;
    error: string | null;
    status: number;
  }> {
    return request<{ invoice_url: string; status: string }>(
      `/invoices/payment-url?invoice_number=${encodeURIComponent(invoiceNumber)}`
    );
  },

  async cancelPendingInvoice(invoiceNumber: string): Promise<{
    data: { cancelled: boolean; message: string } | null;
    error: string | null;
    status: number;
  }> {
    return request<{ cancelled: boolean; message: string }>("/subscription/cancel-invoice", {
      method: "POST",
      body: JSON.stringify({ invoice_number: invoiceNumber }),
    });
  },

  async createInvoice(payload: {
    plan_id: string;
    device_id: string;
    promo_code?: string;
    return_url?: string;
    auto_renew?: boolean;
  }): Promise<{ data: InvoiceResponse | null; error: string | null }> {
    return request<InvoiceResponse>("/subscription/checkout", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async getBillingHistory(): Promise<{
    data: BillingHistoryItem[] | null;
    error: string | null;
  }> {
    // ✅ FIXED: /invoices → /subscription/billing-history (mengikuti Connect)
    const result = await request<any[]>(
      "/subscription/billing-history",
    );
    if (result.data && Array.isArray(result.data)) {
      result.data = result.data.map((item: any) => {
        const sub = item.subscriptions;
        const plan = sub?.product_plans;
        // plan.name = "Beta - Bulanan" / "Standard - Tahunan" dll — langsung dari SKU
        const isBeta = plan?.is_beta ?? false;
        const planLabel = plan?.name ?? (isBeta ? "Beta" : "Standard");
        return {
          ...item,
          plan_name: planLabel,
          is_beta: isBeta,
          billing_cycle: sub?.billing_cycle ?? item.billing_cycle ?? null,
        };
      });
    }
    return result as { data: BillingHistoryItem[] | null; error: string | null; status: number };
  },

  async getPlans(): Promise<{ data: Plan[] | null; error: string | null }> {
    const result = await request<any[]>("/pricing");
    if (result.data && Array.isArray(result.data)) {
      const mapped = result.data.map((p: any) => ({
        ...p,
        product_name: p.products?.name || p.product_name || "Aexon",
        features: Array.isArray(p.features)
          ? p.features.filter(
              (f: string) => !/^hemat\s+rp/i.test((f || "").trim()),
            )
          : [],
      }));

      const byBillingCycle = new Map<string, any>();
      for (const plan of mapped) {
        const cycle = plan.billing_cycle;
        const existing = byBillingCycle.get(cycle);
        if (!existing || Number(plan.price) < Number(existing.price)) {
          byBillingCycle.set(cycle, plan);
        }
      }
      result.data = Array.from(byBillingCycle.values());
    }
    return result as { data: Plan[] | null; error: string | null };
  },

  async validatePromo(
    code: string,
  ): Promise<{ data: PromoValidation | null; error: string | null }> {
    return request<PromoValidation>("/subscription/promo/validate", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  },

  // ── Device Session ────────────────────────────────────────────────────────

  /**
   * Dipanggil setelah login berhasil.
   * Connect akan upsert sesi dengan user_id UNIQUE → device lain otomatis invalid.
   * Session token disimpan di localStorage untuk validasi berikutnya.
   */
  async createDeviceSession(
    deviceId: string,
  ): Promise<{ data: CreateSessionResponse | null; error: string | null }> {
    const result = await request<CreateSessionResponse>("/login-session", {
      method: "POST",
      body: JSON.stringify({ device_info: deviceId }),
    });
    // Simpan session token yang dikembalikan Connect
    if (result.data?.session_token) {
      storeSessionToken(result.data.session_token);
    }
    return result;
  },

  /**
   * Dipanggil secara periodik untuk memverifikasi apakah device ini masih aktif.
   * Jika user login di device lain, Connect akan timpa session_token di DB,
   * sehingga token device ini tidak valid lagi → valid: false → force logout.
   *
   * Jika belum ada session_token tersimpan (user lama sebelum fitur ini),
   * kembalikan valid: true agar tidak kick out paksa.
   */
  async checkDeviceSession(): Promise<{
    data: CheckSessionResponse | null;
    error: string | null;
  }> {
    const sessionToken = getStoredSessionToken();
    if (!sessionToken) {
      return { data: { valid: true }, error: null };
    }
    return request<CheckSessionResponse>("/check-session", {
      method: "POST",
      body: JSON.stringify({ session_token: sessionToken }),
    });
  },

  // ─── Hospital Settings (Kop Surat) ──────────────────────────

  async getHospitalSettings(params: { doctor_id?: string; institution_id?: string }) {
    const qs = params.doctor_id
      ? `?doctor_id=${params.doctor_id}`
      : params.institution_id
      ? `?institution_id=${params.institution_id}`
      : "";
    return request<any[]>(`/hospital-settings${qs}`);
  },

  async createHospitalSetting(payload: Record<string, any>) {
    return request("/hospital-settings", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  async updateHospitalSetting(id: string, payload: Record<string, any>) {
    return request(`/hospital-settings/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });
  },

  async deleteHospitalSetting(id: string) {
    return request(`/hospital-settings/${id}`, {
      method: "DELETE",
    });
  },

  async requestCooldownReset(hospitalSettingId: string, reason?: string) {
    return request("/hospital-settings/request-edit", {
      method: "POST",
      body: JSON.stringify({ hospital_setting_id: hospitalSettingId, reason }),
    });
  },

  async migrateHospitalSettings(payload: {
    doctor_id?: string;
    institution_id?: string;
    settings: Record<string, any>[];
  }) {
    return request("/hospital-settings/migrate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // ── Enterprise: Get institution info ──────────────────────────
  async getInstitution(): Promise<{ data: any; error: string | null }> {
    const { data, error } = await request("/enterprise/institution");
    return { data, error };
  },

  // ── Enterprise: List doctors ──────────────────────────────────
  async getEnterpriseDoctors(): Promise<{
    data: { doctors: any[]; pending_invitations: any[]; institution_id: string } | null;
    error: string | null;
  }> {
    const { data, error } = await request("/enterprise/doctors");
    return { data, error };
  },

  // ── Enterprise: Invite doctor ─────────────────────────────────
  async inviteEnterpriseDoctor(payload: {
    email: string; full_name: string;
    specialty?: string; str_number?: string; sip_number?: string; phone?: string;
  }): Promise<{ data: any; error: string | null }> {
    const { data, error } = await request("/enterprise/invite-doctor", {
      method: "POST", body: JSON.stringify(payload),
    });
    return { data, error };
  },

  // ── Enterprise: Remove doctor ─────────────────────────────────
  async removeEnterpriseDoctor(doctorId: string): Promise<{ data: any; error: string | null }> {
    const { data, error } = await request("/enterprise/remove-doctor", {
      method: "POST", body: JSON.stringify({ doctor_id: doctorId }),
    });
    return { data, error };
  },

  // ── Enterprise: Toggle doctor status ──────────────────────────
  async toggleEnterpriseDoctorStatus(doctorId: string): Promise<{ data: any; error: string | null }> {
    const { data, error } = await request("/enterprise/toggle-doctor-status", {
      method: "POST", body: JSON.stringify({ doctor_id: doctorId }),
    });
    return { data, error };
  },

  // ── Support Tickets ─────────────────────────────────────────────

  async createSupportTicket(payload: {
    subject: string;
    message: string;
    category: SupportCategory;
    priority: SupportPriority;
    attachment_url?: string;
  }): Promise<{ data: SupportTicket | null; error: string | null }> {
    const { data, error } = await request<SupportTicket>("/support/ticket", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { data, error };
  },

  async getSupportTickets(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: SupportTicket[] | null; error: string | null }> {
    const qs = new URLSearchParams();
    if (params?.status) qs.set("status", params.status);
    if (params?.page) qs.set("page", String(params.page));
    if (params?.limit) qs.set("limit", String(params.limit));
    const query = qs.toString();
    const { data, error } = await request<SupportTicket[]>(
      `/support/tickets${query ? `?${query}` : ""}`,
    );
    return { data, error };
  },

  async getSupportTicketDetail(
    ticketId: string,
  ): Promise<{ data: SupportTicketDetail | null; error: string | null }> {
    const { data, error } = await request<SupportTicketDetail>(
      `/support/ticket/${ticketId}`,
    );
    return { data, error };
  },

  async replySupportTicket(
    ticketId: string,
    message: string,
  ): Promise<{ data: SupportMessage | null; error: string | null }> {
    const { data, error } = await request<SupportMessage>(
      `/support/ticket/${ticketId}/reply`,
      { method: "POST", body: JSON.stringify({ message }) },
    );
    return { data, error };
  },

  async getSupportUnreadCount(): Promise<{
    data: SupportUnreadCount | null;
    error: string | null;
  }> {
    const { data, error } =
      await request<SupportUnreadCount>("/support/unread-count");
    return { data, error };
  },

  // ── Patients ─────────────────────────────────────────────────────────────

  async lookupPatientByRM(
    rmNumber: string,
  ): Promise<{
    data: {
      id: string;
      rm_number: string;
      full_name: string;
      gender: string;
      date_of_birth: string;
      diagnosis: string;
      icd10_code: string;
      icd9_codes: string[];
      notes: string;
    } | null;
    error: string | null;
  }> {
    const { data, error } = await request<any>(
      `/patients/lookup?rm_number=${encodeURIComponent(rmNumber)}`,
    );
    return { data, error };
  },

  async upsertPatient(patient: {
    rm_number: string;
    full_name: string;
    gender: string;
    date_of_birth: string;
    diagnosis: string;
    icd10_code: string;
    icd9_codes: string[];
    notes: string;
  }): Promise<{ data: any; error: string | null }> {
    const { data, error } = await request<any>("/patients/upsert", {
      method: "POST",
      body: JSON.stringify(patient),
    });
    return { data, error };
  },

  async uploadSupportAttachment(
    file: File,
  ): Promise<{ data: { url: string } | null; error: string | null }> {
    const token = getStoredToken();
    if (!AEXON_CONNECT_API_URL) {
      return { data: null, error: "API belum dikonfigurasi." };
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(
        `${AEXON_CONNECT_API_URL}/support/upload-attachment`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        },
      );
      const body = await res.json();
      if (!res.ok || body.success === false) {
        return { data: null, error: body.error || "Gagal upload file." };
      }
      return { data: body.data ?? { url: body.url }, error: null };
    } catch (err: any) {
      return { data: null, error: err.message || "Gagal upload file." };
    }
  },
};

// ─── Device ID ────────────────────────────────────────────────────────────────

export function getDeviceId(): string {
  const KEY = "aexon_device_id";
  let id = localStorage.getItem(KEY);
  if (id) {
    sessionStorage.setItem(KEY, id);
    return id;
  }
  id = sessionStorage.getItem(KEY);
  if (id) {
    console.warn(
      "[AexonConnect] Device ID recovered from sessionStorage — localStorage was cleared. Re-persisting.",
    );
    localStorage.setItem(KEY, id);
    return id;
  }
  id =
    crypto.randomUUID?.() ||
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  console.warn(
    "[AexonConnect] Generated new device ID. This is a web app limitation — native apps should use hardware IDs.",
  );
  localStorage.setItem(KEY, id);
  sessionStorage.setItem(KEY, id);
  return id;
}