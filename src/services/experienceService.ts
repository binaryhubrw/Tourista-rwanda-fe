import type { Experience } from '@/types';
import { api } from './apiClient';

export async function getExperiences(): Promise<Experience[]> {
  return api.get<Experience[]>('/experiences/');
}

export async function getExperienceById(id: string): Promise<Experience> {
  return api.get<Experience>(`/experiences/${id}/`);
}
