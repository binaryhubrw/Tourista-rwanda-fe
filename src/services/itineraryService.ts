import type { Itinerary } from '@/types';
import { USE_MOCK } from './config';
import { api } from './apiClient';
import { delay, notFound, read, write } from './mockDb';
import { makeId } from '@/utils/id';

export async function getItineraries(userId: string): Promise<Itinerary[]> {
  if (!USE_MOCK) return api.get<Itinerary[]>('/itineraries/');
  await delay();
  return read('itineraries').filter((i) => i.userId === userId).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getItineraryById(id: string): Promise<Itinerary> {
  if (!USE_MOCK) return api.get<Itinerary>(`/itineraries/${id}/`);
  await delay();
  return read('itineraries').find((i) => i.id === id) ?? notFound('Itinerary');
}

export type ItineraryInput = Omit<Itinerary, 'id' | 'createdAt' | 'updatedAt'>;

export async function createItinerary(input: ItineraryInput): Promise<Itinerary> {
  if (!USE_MOCK) return api.post<Itinerary>('/itineraries/', input);
  await delay();
  const now = new Date().toISOString();
  const itinerary: Itinerary = { ...input, id: makeId('itin'), createdAt: now, updatedAt: now };
  write('itineraries', [itinerary, ...read('itineraries')]);
  return itinerary;
}

export async function updateItinerary(id: string, input: ItineraryInput): Promise<Itinerary> {
  if (!USE_MOCK) return api.put<Itinerary>(`/itineraries/${id}/`, input);
  await delay();
  const all = read('itineraries');
  const idx = all.findIndex((i) => i.id === id);
  if (idx < 0) notFound('Itinerary');
  all[idx] = { ...all[idx], ...input, updatedAt: new Date().toISOString() };
  write('itineraries', all);
  return all[idx];
}

export async function deleteItinerary(id: string): Promise<void> {
  if (!USE_MOCK) return api.delete(`/itineraries/${id}/`);
  await delay();
  write('itineraries', read('itineraries').filter((i) => i.id !== id));
}
