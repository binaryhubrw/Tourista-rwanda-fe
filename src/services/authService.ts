import type { User, UserRole } from '@/types';
import { TOKEN_KEY, USER_KEY } from './config';
import { api } from './apiClient';
import { DEMO_TOKEN_PREFIX, findStaffByEmail, findStaffById, setOwnerPayout } from '@/demo/store';
import { payoutFromUser } from '@/utils/payment';

export interface AuthResponse { token: string; user: User }

function persist(res: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, res.token);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  return res;
}

export function getStoredUser(): User | null {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token || token.startsWith('mock.')) {
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
  const staff = findStaffByEmail(email, password);
  if (staff) return persist({ token: `${DEMO_TOKEN_PREFIX}${staff.id}`, user: staff });
  const res = persist(await api.post<AuthResponse>('/auth/login/', { email, password }));
  if (res.user.role === 'business_owner') setOwnerPayout(res.user.id, payoutFromUser(res.user));
  return res;
}

export async function register(input: { name: string; email: string; password: string; role: Exclude<UserRole, 'admin' | 'staff'>; businessName?: string; bankAccount?: string; mtnNumber?: string; airtelNumber?: string }): Promise<AuthResponse> {
  return persist(await api.post<AuthResponse>('/auth/register/', input));
}

export async function fetchMe(): Promise<User> {
  const token = localStorage.getItem(TOKEN_KEY) ?? '';
  if (token.startsWith(DEMO_TOKEN_PREFIX)) {
    const staff = findStaffById(token.slice(DEMO_TOKEN_PREFIX.length));
    if (!staff) {
      logout();
      throw { message: 'That staff account is no longer active.' };
    }
    localStorage.setItem(USER_KEY, JSON.stringify(staff));
    return staff;
  }
  const user = await api.get<User>('/auth/me/');
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function updateProfile(user: User): Promise<User> {
  if (user.role === 'staff') {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    return user;
  }
  const updated = await api.patch<User>('/auth/me/', user);
  if (updated.role === 'business_owner') setOwnerPayout(updated.id, payoutFromUser(updated));
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
