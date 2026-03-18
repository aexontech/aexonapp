const AEXON_CONNECT_API_URL = (import.meta.env.VITE_AEXON_CONNECT_API_URL || '').replace(/\/+$/, '');

const TOKEN_KEY = 'aexon_jwt_token';
const REFRESH_TOKEN_KEY = 'aexon_refresh_token';
const LAST_ONLINE_KEY = 'aexon_last_online';
const OFFLINE_EXPIRY_MS = 24 * 60 * 60 * 1000;

if (!AEXON_CONNECT_API_URL) {
  console.warn('[AexonConnect] VITE_AEXON_CONNECT_API_URL is not set. API calls will fail.');
}

function getStoredToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function getStoredRefreshToken(): string | null {
  try {
    return sessionStorage.getItem(REFRESH_TOKEN_KEY) || localStorage.getItem(REFRESH_TOKEN_KEY);
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
  } catch {
  }
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {
  }
}

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

let _onSessionExpired: (() => void) | null = null;

export function onSessionExpired(callback: () => void) {
  _onSessionExpired = callback;
}

async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${AEXON_CONNECT_API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    if (res.ok) {
      const body = await res.json();
      const payload = body && typeof body === 'object' && 'success' in body ? body.data : body;
      if (payload?.token) {
        const isRemember = !!localStorage.getItem(TOKEN_KEY);
        storeToken(payload.token, payload.refresh_token, isRemember);
        return payload.token;
      }
    }
  } catch {
  }
  return null;
}

async function request<T = any>(
  endpoint: string,
  options: RequestInit = {},
  _isRetry = false
): Promise<{ data: T | null; error: string | null; status: number }> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!AEXON_CONNECT_API_URL) {
    console.error('[AexonConnect] API URL not configured. Set VITE_AEXON_CONNECT_API_URL.');
    return { data: null, error: 'AEXON Connect API belum dikonfigurasi. Hubungi administrator.', status: 0 };
  }

  const fullUrl = `${AEXON_CONNECT_API_URL}${endpoint}`;
  console.log(`[AexonConnect] ${options.method || 'GET'} ${fullUrl}`);

  try {
    const res = await fetch(fullUrl, {
      ...options,
      headers,
    });

    let body: any = null;
    const contentType = res.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      body = await res.json();
    }

    const isEnvelope = body && typeof body === 'object' && 'success' in body;
    const envelopeData = isEnvelope ? body.data : body;
    const envelopeError = isEnvelope ? body.error : (body?.message || body?.error);
    const envelopeSuccess = isEnvelope ? body.success : res.ok;

    const isAuthEndpoint = endpoint.startsWith('/auth/');
    if (res.status === 401 && !_isRetry && !isAuthEndpoint) {
      const newToken = await attemptTokenRefresh();
      if (newToken) {
        return request<T>(endpoint, options, true);
      }
      return { data: null, error: 'Token tidak valid. Silakan cek koneksi internet.', status: 401 };
    }

    if (res.ok) {
      updateLastOnline();
    }

    if (res.status === 404) {
      return {
        data: null,
        error: envelopeError || 'Fitur ini belum tersedia.',
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
      error: err.message || 'Koneksi gagal. Periksa internet dan coba lagi.',
      status: 0,
    };
  }
}

export interface LoginResponse {
  token: string;
  refresh_token?: string;
  user: {
    id: string;
    email: string;
    full_name: string;
    role: 'doctor' | 'admin';
    enterprise_id?: string | null;
    specialization?: string;
    str_number?: string;
    sip_number?: string;
    phone?: string;
  };
}

export interface SubscriptionStatus {
  status: 'active' | 'trial' | 'pending' | 'expired' | 'cancelled' | 'none';
  plan_type: 'subscription' | 'enterprise' | null;
  plan: 'subscription' | 'enterprise' | null;
  trial_days_left: number | null;
  plan_name?: string;
  billing_cycle?: string;
  starts_at?: string;
  expires_at?: string;
  auto_renew?: boolean;
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

export interface DeviceSessionResponse {
  session_id: string;
  device_id: string;
  valid: boolean;
}

export interface Plan {
  id: string;
  billing_cycle: 'monthly' | 'annual';
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

export interface PromoValidation {
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  label: string;
}

export interface DeviceRegisterResponse {
  device_token: string;
  device_id: string;
}

export interface DeviceVerifyResponse {
  verified: boolean;
  message?: string;
}

export interface BillingHistoryItem {
  id: string;
  order_id: string;
  plan_name: string;
  billing_cycle: string;
  amount: number;
  status: string;
  created_at: string;
  invoice_url?: string;
}

export const aexonConnect = {
  getToken: getStoredToken,
  clearSession: clearToken,

  async login(email: string, password: string, remember = false): Promise<{ data: LoginResponse | null; error: string | null }> {
    const { data, error } = await request<LoginResponse>('/auth/login', {
      method: 'POST',
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
    str_number: string;
    sip_number?: string;
    specialization?: string;
  }): Promise<{ data: any; error: string | null }> {
    return request('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async resetPassword(email: string): Promise<{ data: any; error: string | null }> {
    return request('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  async changePassword(current_password: string, new_password: string): Promise<{ data: any; error: string | null }> {
    return request('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ current_password, new_password }),
    });
  },

  async updateProfile(payload: Record<string, any>): Promise<{ data: any; error: string | null }> {
    return request('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async getSubscription(): Promise<{ data: SubscriptionStatus | null; error: string | null; status: number }> {
    const result = await request<any>('/subscription');
    if (result.data) {
      const d = result.data;
      const planType = d.plan_type || d.plan || null;
      const status = d.status || 'none';
      const isActive = status === 'active' || status === 'trial';
      result.data = {
        ...d,
        status,
        plan_type: planType,
        plan: isActive ? (planType || 'subscription') : null,
        trial_days_left: d.trial_days_left ?? null,
      };
    }
    return result as { data: SubscriptionStatus | null; error: string | null; status: number };
  },

  async toggleAutoRenew(): Promise<{ data: ToggleAutoRenewResponse | null; error: string | null }> {
    return request<ToggleAutoRenewResponse>('/subscription/toggle-renew', {
      method: 'POST',
    });
  },

  async createInvoice(payload: {
    plan_id: string;
    device_id: string;
    promo_code?: string;
    return_url?: string;
  }): Promise<{ data: InvoiceResponse | null; error: string | null }> {
    return request<InvoiceResponse>('/subscription/checkout', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async createDeviceSession(deviceId: string): Promise<{ data: DeviceSessionResponse | null; error: string | null }> {
    return request<DeviceSessionResponse>('/login-session', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId }),
    });
  },

  async checkDeviceSession(deviceId: string): Promise<{ data: DeviceSessionResponse | null; error: string | null }> {
    return request<DeviceSessionResponse>('/check-session', {
      method: 'POST',
      body: JSON.stringify({ device_id: deviceId }),
    });
  },

  async getPlans(): Promise<{ data: Plan[] | null; error: string | null }> {
    const result = await request<any[]>('/pricing');
    if (result.data && Array.isArray(result.data)) {
      const mapped = result.data.map((p: any) => ({
        ...p,
        product_name: p.products?.name || p.product_name || 'Aexon',
        features: Array.isArray(p.features)
          ? p.features.filter((f: string) => !/^hemat\s+rp/i.test((f || '').trim()))
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

  async validatePromo(code: string): Promise<{ data: PromoValidation | null; error: string | null }> {
    return request<PromoValidation>('/subscription/promo/validate', {
      method: 'POST',
      body: JSON.stringify({ code }),
    });
  },

  async registerDevice(device_id: string): Promise<{ data: DeviceRegisterResponse | null; error: string | null }> {
    return request<DeviceRegisterResponse>('/device/register', {
      method: 'POST',
      body: JSON.stringify({ device_id }),
    });
  },

  async verifyDevice(device_id: string): Promise<{ data: DeviceVerifyResponse | null; error: string | null }> {
    return request<DeviceVerifyResponse>('/device/verify', {
      method: 'POST',
      body: JSON.stringify({ device_id }),
    });
  },

  async getBillingHistory(): Promise<{ data: BillingHistoryItem[] | null; error: string | null }> {
    return request<BillingHistoryItem[]>('/subscription/billing-history');
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } catch {
    }
    clearToken();
  },
};

export function getDeviceId(): string {
  const KEY = 'aexon_device_id';
  let id = localStorage.getItem(KEY);
  if (id) {
    sessionStorage.setItem(KEY, id);
    return id;
  }
  id = sessionStorage.getItem(KEY);
  if (id) {
    console.warn('[AexonConnect] Device ID recovered from sessionStorage — localStorage was cleared. Re-persisting.');
    localStorage.setItem(KEY, id);
    return id;
  }
  // Web app limitation: no hardware ID available, generating a software UUID.
  // Native apps should use a hardware-bound identifier instead.
  id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  console.warn('[AexonConnect] Generated new device ID. This is a web app limitation — native apps should use hardware IDs.');
  localStorage.setItem(KEY, id);
  sessionStorage.setItem(KEY, id);
  return id;
}
