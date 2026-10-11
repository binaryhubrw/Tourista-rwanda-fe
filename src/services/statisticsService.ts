import type { TourismStatistics } from '@/types';
import { api } from './apiClient';

export async function getTourismStatistics(): Promise<TourismStatistics> {
  return api.get<TourismStatistics>('/analytics/overview/');
}
