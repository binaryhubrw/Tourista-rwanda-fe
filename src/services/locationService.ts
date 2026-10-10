import type { Location } from '@/types';
import { USE_MOCK } from './config';
import { api } from './apiClient';
import { delay, notFound, read, write } from './mockDb';

export async function getLocations(): Promise<Location[]> {
  if (!USE_MOCK) return api.get<Location[]>('/locations/');
  await delay();
  return read('locations');
}

export async function getLocationById(id: string): Promise<Location> {
  if (!USE_MOCK) return api.get<Location>(`/locations/${id}/`);
  await delay();
  return read('locations').find((l) => l.id === id) ?? notFound('Location');
}

export type LocationInput = Omit<Location, 'id' | 'rating' | 'reviewCount' | 'visitsLastYear' | 'createdAt'> & Partial<Pick<Location, 'visitsLastYear'>>;

const slug = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function newLocation(input: LocationInput, taken: Set<string>): Location {
  let id = slug(input.name) || 'location';
  for (let n = 2; taken.has(id); n++) id = `${slug(input.name)}-${n}`;
  taken.add(id);
  return { ...input, id, rating: 0, reviewCount: 0, visitsLastYear: input.visitsLastYear ?? 0, createdAt: new Date().toISOString() };
}

export async function createLocations(inputs: LocationInput[]): Promise<Location[]> {
  if (!USE_MOCK) return api.post<Location[]>('/locations/bulk/', inputs);
  await delay();
  const all = read('locations');
  const taken = new Set(all.map((l) => l.id));
  const created = inputs.map((i) => newLocation(i, taken));
  write('locations', [...created, ...all]);
  return created;
}

export async function createLocation(input: LocationInput): Promise<Location> {
  if (!USE_MOCK) return api.post<Location>('/locations/', input);
  return (await createLocations([input]))[0];
}
