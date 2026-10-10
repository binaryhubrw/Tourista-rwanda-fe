import type { User, UserRole } from '@/types';
import { makeId } from '@/utils/id';
import { USE_MOCK } from './config';
import { api } from './apiClient';
import { delay, notFound, read, write } from './mockDb';

export async function getUserById(id: string): Promise<User> {
  if (!USE_MOCK) return api.get<User>(`/users/${id}/`);
  await delay();
  const user = read('users').find((item) => item.id === id);
  if (!user) notFound('User');
  const { password: _pw, ...safe } = user;
  return safe;
}

/** All platform members (admins only). */
export async function getUsers(): Promise<User[]> {
  if (!USE_MOCK) return api.get<User[]>('/users/');
  await delay();
  return read('users')
    .map(({ password: _pw, ...u }) => u)
    .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt));
}

export async function deleteUsers(ids: string[]): Promise<void> {
  if (!USE_MOCK) {
    await Promise.all(ids.map((id) => api.delete(`/users/${id}/`)));
    return;
  }
  await delay();
  write('users', read('users').filter((u) => !ids.includes(u.id)));
}

export interface UserInput {
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  country?: string;
  password?: string;
}

/** Creates accounts; fails as a whole if any email is already registered or repeated. */
export async function createUsers(inputs: UserInput[]): Promise<User[]> {
  if (!USE_MOCK) return api.post<User[]>('/users/bulk/', inputs);
  await delay();
  const all = read('users');
  const seen = new Set(all.map((u) => u.email.toLowerCase()));
  const created = inputs.map((i) => {
    const email = i.email.trim().toLowerCase();
    if (seen.has(email)) throw { message: `An account with ${email} already exists.` };
    seen.add(email);
    return { id: makeId('user'), name: i.name.trim(), email, role: i.role, phone: i.phone || undefined, country: i.country || undefined, joinedAt: new Date().toISOString().slice(0, 10), password: i.password || 'password' };
  });
  write('users', [...all, ...created]);
  return created.map(({ password: _pw, ...u }) => u);
}

export async function createUser(input: UserInput): Promise<User> {
  if (!USE_MOCK) return api.post<User>('/users/', input);
  return (await createUsers([input]))[0];
}
