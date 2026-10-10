import type { Experience } from '@/types';
import { USE_MOCK } from './config';
import { api } from './apiClient';
import { delay, notFound, read } from './mockDb';

export async function getExperiences(): Promise<Experience[]> {
  if (!USE_MOCK) return api.get<Experience[]>('/experiences/');
  await delay();
  return read('experiences');
}

export async function getExperienceById(id: string): Promise<Experience> {
  if (!USE_MOCK) return api.get<Experience>(`/experiences/${id}/`);
  await delay();
  return read('experiences').find((e) => e.id === id) ?? notFound('Experience');
}
