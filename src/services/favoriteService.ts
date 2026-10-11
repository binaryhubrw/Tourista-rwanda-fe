import type { Favorite } from '@/types';
import { api } from './apiClient';

export async function getFavorites(): Promise<Favorite[]> {
  return api.get<Favorite[]>('/favorites/');
}

export async function addFavorite(item: Omit<Favorite, 'id' | 'addedAt'>): Promise<Favorite> {
  return api.post<Favorite>('/favorites/', item);
}

export async function removeFavorite(itemId: string): Promise<void> {
  return api.delete(`/favorites/${itemId}/`);
}
