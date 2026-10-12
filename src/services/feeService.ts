import type { FeeLedger } from '@/types';
import { api } from './apiClient';

export async function getFeeLedger(): Promise<FeeLedger> {
  return api.get<FeeLedger>('/fees/');
}
