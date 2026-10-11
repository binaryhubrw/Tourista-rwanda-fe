import type { SearchResult } from '@/types';
import { api } from './apiClient';

export type SearchScope = 'all' | 'accommodations' | 'restaurants' | 'businesses';

export async function search(query: string, scope: SearchScope = 'all'): Promise<SearchResult[]> {
  return api.get<SearchResult[]>(`/search/?q=${encodeURIComponent(query)}&scope=${scope}`);
}
