/** Calls to this site's own /api routes. The session lives in an HttpOnly cookie the browser sends itself. */

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
    res = await fetch(path, {
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

export type SyncKey = 'wallets' | 'categories' | 'transactions' | 'preferences';

export const dataApi = {
  load: () => api<{ data: Partial<Record<SyncKey, { value: unknown; updatedAt: number }>> }>('/api/data'),
  save: (key: SyncKey, value: unknown) => api<{ ok: true; updatedAt: number }>(`/api/data/${key}`, { method: 'PUT', body: { value } }),
};
