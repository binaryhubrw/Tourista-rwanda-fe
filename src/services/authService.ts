import type { User, UserRole } from '@/types';
import { TOKEN_KEY, USER_KEY } from './config';
import { api } from './apiClient';

export interface AuthResponse { token: string; user: User }

function persist(res: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, res.token);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  localStorage.removeItem('tourista.demo.v1');
  return res;
}

export function getStoredUser(): User | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    localStorage.removeItem('tourista.demo.v1');
    if (!token || token.startsWith('mock.') || token.startsWith('demo.')) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      return null;
    }
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return persist(await api.post<AuthResponse>('/auth/login/', { email, password }));
}

export async function register(input: { name: string; email: string; password: string; role: Exclude<UserRole, 'admin' | 'staff'>; businessName?: string; bankAccount?: string; mtnNumber?: string; airtelNumber?: string }): Promise<AuthResponse> {
  return persist(await api.post<AuthResponse>('/auth/register/', input));
}

export async function fetchMe(): Promise<User> {
  const user = await api.get<User>('/auth/me/');
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function updateProfile(user: User): Promise<User> {
  const updated = await api.patch<User>('/auth/me/', user);
  localStorage.setItem(USER_KEY, JSON.stringify(updated));
  return updated;
}

export async function requestPasswordReset(email: string): Promise<void> {
  return api.post('/auth/password-reset/', { email });
}

export async function resetPassword(token: string, password: string): Promise<void> {
  return api.post('/auth/password-reset/confirm/', { token, password });
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
