import type { User, UserRole } from '@/types';
import { api } from './apiClient';

export async function getUserById(id: string): Promise<User> {
  return api.get<User>(`/users/${id}/`);
}

export async function getUsers(): Promise<User[]> {
  return api.get<User[]>('/users/');
}

export interface AdminContact {
  name: string;
  phone: string;
  email: string;
}

export async function getAdminContacts(): Promise<AdminContact[]> {
  return api.get<AdminContact[]>('/users/admins/');
}

export async function deleteUsers(ids: string[]): Promise<void> {
  await Promise.all(ids.map((id) => api.delete(`/users/${id}/`)));
}

export async function setUserActive(id: string, active: boolean): Promise<User> {
  return api.patch<User>(`/users/${id}/`, { active });
}

export interface UserInput {
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  country?: string;
  password?: string;
}

export async function createUsers(inputs: UserInput[]): Promise<User[]> {
  return api.post<User[]>('/users/bulk/', inputs);
}

export async function createUser(input: UserInput): Promise<User> {
  return api.post<User>('/users/', input);
}
