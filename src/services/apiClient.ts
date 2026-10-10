import { API_BASE_URL, TOKEN_KEY } from './config';
import type { ApiError } from '@/types';

/**
 * Thin fetch wrapper for the Django REST API.
 * Sends the JWT as `Authorization: Bearer <token>` (djangorestframework-simplejwt style).
 */
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
