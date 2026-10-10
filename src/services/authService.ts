import type { User, UserRole } from '@/types';
import { TOKEN_KEY, USE_MOCK } from './config';
import { api } from './apiClient';
import { delay, read, write } from './mockDb';
import { makeId } from '@/utils/id';

const USER_KEY = 'tourista.user';

export interface AuthResponse { token: string; user: User }

const strip = ({ password: _pw, ...user }: User & { password: string }): User => user;

function persist(res: AuthResponse) {
  localStorage.setItem(TOKEN_KEY, res.token);
  localStorage.setItem(USER_KEY, JSON.stringify(res.user));
  return res;
}

export function getStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  if (!USE_MOCK) return persist(await api.post<AuthResponse>('/auth/login/', { email, password }));
  await delay(500);
  const user = read('users').find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  if (!user || user.password !== password) throw { message: 'That email and password don’t match. Check them and try again.' };
  return persist({ token: `mock.${user.id}`, user: strip(user) });
}

export async function register(input: { name: string; email: string; password: string; role: Exclude<UserRole, 'admin'> }): Promise<AuthResponse> {
  if (!USE_MOCK) return persist(await api.post<AuthResponse>('/auth/register/', input));
  await delay(600);
  const users = read('users');
  if (users.some((u) => u.email.toLowerCase() === input.email.trim().toLowerCase())) {
    throw { message: 'An account with this email already exists. Log in instead.' };
  }
  const user = { id: makeId('user'), name: input.name.trim(), email: input.email.trim(), password: input.password, role: input.role, joinedAt: new Date().toISOString() };
  write('users', [...users, user]);
  return persist({ token: `mock.${user.id}`, user: strip(user) });
}

export async function updateProfile(user: User): Promise<User> {
  if (!USE_MOCK) return api.patch<User>('/auth/me/', user);
  await delay();
  write('users', read('users').map((u) => (u.id === user.id ? { ...u, ...user } : u)));
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function requestPasswordReset(email: string): Promise<void> {
  if (!USE_MOCK) return api.post('/auth/password-reset/', { email });
  await delay(600);
}

export async function resetPassword(token: string, password: string): Promise<void> {
  if (!USE_MOCK) return api.post('/auth/password-reset/confirm/', { token, password });
  await delay(600);
}

export function logout() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
