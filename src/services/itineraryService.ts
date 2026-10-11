import type { Itinerary } from '@/types';
import { api } from './apiClient';

export async function getItineraries(_userId: string): Promise<Itinerary[]> {
  return api.get<Itinerary[]>('/itineraries/');
}

export async function getItineraryById(id: string): Promise<Itinerary> {
  return api.get<Itinerary>(`/itineraries/${id}/`);
}

export type ItineraryInput = Omit<Itinerary, 'id' | 'createdAt' | 'updatedAt'>;

export async function createItinerary(input: ItineraryInput): Promise<Itinerary> {
  return api.post<Itinerary>('/itineraries/', input);
}

export async function updateItinerary(id: string, input: ItineraryInput): Promise<Itinerary> {
  return api.put<Itinerary>(`/itineraries/${id}/`, input);
}

export async function deleteItinerary(id: string): Promise<void> {
  return api.delete(`/itineraries/${id}/`);
}
