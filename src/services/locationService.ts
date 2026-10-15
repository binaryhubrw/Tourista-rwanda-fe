import type { Location } from '@/types';
import { api } from './apiClient';

export async function getLocations(): Promise<Location[]> {
  return api.get<Location[]>('/locations/');
}

export async function getLocationById(id: string): Promise<Location> {
  return api.get<Location>(`/locations/${id}/`);
}

export type LocationInput = Pick<Location, 'name' | 'district' | 'province' | 'coordinates'>;

export async function createLocations(inputs: LocationInput[]): Promise<Location[]> {
  return api.post<Location[]>('/locations/bulk/', inputs);
}

export async function createLocation(input: LocationInput): Promise<Location> {
  return api.post<Location>('/locations/', input);
}
