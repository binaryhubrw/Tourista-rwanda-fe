import { API_BASE_URL, TOKEN_KEY, USER_KEY } from './config';
import type { ApiError } from '@/types';

const AUTH_PAGES = ['/login', '/register', '/forgot-password', '/reset-password'];

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

function expireSession() {
  clearSession();
  const path = window.location.pathname;
  if (AUTH_PAGES.some((p) => path === p || path.startsWith(`${p}/`))) return;
  window.location.assign('/login');
}

/** Thin fetch wrapper for the Node API. Sends `Authorization: Bearer <token>`. */
export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401 && token) expireSession();
    let message = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      message = body.detail ?? body.message ?? message;
    } catch { /* non-JSON error body */ }
    const err: ApiError = { message, status: res.status };
    throw err;
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

export const api = {
  get: <T>(p: string) => apiRequest<T>(p),
  post: <T>(p: string, body: unknown) => apiRequest<T>(p, { method: 'POST', body: JSON.stringify(body) }),
  put: <T>(p: string, body: unknown) => apiRequest<T>(p, { method: 'PUT', body: JSON.stringify(body) }),
  patch: <T>(p: string, body: unknown) => apiRequest<T>(p, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(p: string) => apiRequest<T>(p, { method: 'DELETE' }),
};
