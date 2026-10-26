/** Calls to this site's own /api routes. The session lives in an HttpOnly cookie the browser sends itself. */

import { Capacitor, CapacitorHttp } from '@capacitor/core';

const API_ORIGIN = 'https://mywallet.momia.top';

function blobAsBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? '');
      resolve(value.includes(',') ? value.slice(value.indexOf(',') + 1) : value);
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function headerValue(headers: Record<string, string>, name: string): string | undefined {
  const key = Object.keys(headers).find((candidate) => candidate.toLowerCase() === name.toLowerCase());
  return key ? headers[key] : undefined;
}

/**
 * Native requests bypass the bundled WebView asset server while preserving the
 * backend's existing URL, cookies and CSRF policy. Web/PWA behavior is unchanged.
 */
export async function serverFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (!Capacitor.isNativePlatform()) return fetch(path, init);

  const requestHeaders = new Headers(init.headers);
  let data: unknown;
  let dataType: 'file' | undefined;
  if (init.body instanceof Blob) {
    data = await blobAsBase64(init.body);
    dataType = 'file';
  } else if (typeof init.body === 'string') {
    data = init.body;
  }

  const nativeResponse = await CapacitorHttp.request({
    url: `${API_ORIGIN}${path}`,
    method: init.method ?? 'GET',
    headers: Object.fromEntries(requestHeaders.entries()),
    data,
    dataType,
    connectTimeout: 20_000,
    readTimeout: 30_000,
    disableRedirects: init.redirect === 'manual',
    responseType: 'text',
  });

  const body = typeof nativeResponse.data === 'string'
    ? nativeResponse.data
    : JSON.stringify(nativeResponse.data ?? null);
  const responseBody = [204, 205, 304].includes(nativeResponse.status) ? null : body;
  return new Response(responseBody, {
    status: nativeResponse.status,
    headers: nativeResponse.headers,
  });
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Fired when any call finds the session gone, so the app can show the login screen */
export const SESSION_EXPIRED_EVENT = 'mywallet:session-expired';

export async function api<T = unknown>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  let res: Response;
  try {
    res = await serverFetch(path, {
      method: init.method ?? 'GET',
      credentials: 'same-origin',
      headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new ApiError('Không kết nối được máy chủ. Kiểm tra mạng.', 0);
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/')) window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    const message = (data as { error?: { message?: string } } | null)?.error?.message;
    throw new ApiError(message || `Lỗi máy chủ (${res.status})`, res.status);
  }
  return data as T;
}

export interface AuthUser {
  username: string;
  mustChangePassword: boolean;
}

export const authApi = {
  me: () => api<{ user: AuthUser | null }>('/api/auth/me'),
  login: (username: string, password: string) =>
    api<{ user: AuthUser }>('/api/auth/login', { method: 'POST', body: { username, password } }),
  logout: () => api('/api/auth/logout', { method: 'POST', body: {} }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api<{ user: AuthUser }>('/api/auth/password', { method: 'POST', body: { currentPassword, newPassword } }),
};

export interface PasskeyInfo {
  id: string;
  name: string | null;
  createdAt: number;
  lastUsedAt: number | null;
}

/** Passkeys: the device's fingerprint / Face ID instead of the password */
export const passkeyApi = {
  async register(name: string) {
    const { startRegistration } = await import('@simplewebauthn/browser');
    const { options, challengeId } = await api<{ options: any; challengeId: string }>('/api/auth/passkey/register-options', {
      method: 'POST',
      body: {},
    });
    const response = await startRegistration({ optionsJSON: options });
    await api('/api/auth/passkey/register-verify', { method: 'POST', body: { challengeId, response, name } });
  },
  async login() {
    const { startAuthentication } = await import('@simplewebauthn/browser');
    const { options, challengeId } = await api<{ options: any; challengeId: string }>('/api/auth/passkey/login-options', {
      method: 'POST',
      body: {},
    });
    const response = await startAuthentication({ optionsJSON: options });
    return api<{ user: AuthUser }>('/api/auth/passkey/login-verify', { method: 'POST', body: { challengeId, response } });
  },
  list: () => api<{ passkeys: PasskeyInfo[] }>('/api/auth/passkey'),
  remove: (id: string) => api('/api/auth/passkey', { method: 'DELETE', body: { id } }),
};

/** Receipt photos, stored privately in R2 */
export const receiptApi = {
  async upload(image: Blob): Promise<string> {
    let res: Response;
    try {
      res = await serverFetch('/api/receipts', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': image.type || 'image/webp' },
        body: image,
        signal: AbortSignal.timeout(30_000),
      });
    } catch {
      throw new ApiError('Không tải được ảnh lên. Kiểm tra mạng.', 0);
    }
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new ApiError(data?.error?.message || `Lỗi tải ảnh (${res.status})`, res.status);
    return data.key as string;
  },
  url: (key: string) => `/api/receipts/${encodeURIComponent(key)}`,
  async displayUrl(key: string): Promise<string> {
    const path = `/api/receipts/${encodeURIComponent(key)}`;
    if (!Capacitor.isNativePlatform()) return path;

    const response = await CapacitorHttp.get({
      url: `${API_ORIGIN}${path}`,
      connectTimeout: 20_000,
      readTimeout: 30_000,
      responseType: 'blob',
    });
    if (response.status < 200 || response.status >= 300) {
      throw new ApiError(`Không tải được ảnh hóa đơn (${response.status})`, response.status);
    }
    const mime = headerValue(response.headers, 'content-type')?.split(';')[0] || 'image/webp';
    return `data:${mime};base64,${String(response.data)}`;
  },
};

/** Whether this browser can use passkeys at all */
export function passkeysSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.PublicKeyCredential === 'function';
}

export type SyncKey ='wallets' | 'categories' | 'transactions' | 'preferences';

export const dataApi = {
  load: () => api<{ data: Partial<Record<SyncKey, { value: unknown; updatedAt: number }>> }>('/api/data'),
  save: (key: SyncKey, value: unknown) => api<{ ok: true; updatedAt: number }>(`/api/data/${key}`, { method: 'PUT', body: { value } }),
};
