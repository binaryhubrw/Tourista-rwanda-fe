import type { Business } from '@/types';
import { USE_MOCK } from './config';
import { api } from './apiClient';
import { delay, notFound, read, write } from './mockDb';
import { makeId } from '@/utils/id';
import { getUserById } from './userService';
import { payoutFromUser, type PayoutTarget } from '@/utils/payment';

export async function getBusinesses(): Promise<Business[]> {
  if (!USE_MOCK) return api.get<Business[]>('/businesses/');
  await delay();
  return read('businesses');
}

export async function getBusinessById(id: string): Promise<Business> {
  if (!USE_MOCK) return api.get<Business>(`/businesses/${id}/`);
  await delay();
  return read('businesses').find((b) => b.id === id) ?? notFound('Business');
}

export async function getBusinessesByOwner(ownerId: string): Promise<Business[]> {
  if (!USE_MOCK) return api.get<Business[]>(`/businesses/?owner=${ownerId}`);
  await delay();
  return read('businesses').filter((b) => b.ownerId === ownerId);
}

export async function getPayoutForBusiness(businessId: string): Promise<PayoutTarget | null> {
  if (!USE_MOCK) {
    try {
      return await api.get<PayoutTarget>(`/businesses/${businessId}/payout/`);
    } catch {
      return null;
    }
  }
  const listing = await getBusinessById(businessId);
  if (!listing.ownerId) return { businessName: listing.name };
  try {
    return payoutFromUser(await getUserById(listing.ownerId));
  } catch {
    return { businessName: listing.name };
  }
}

export type BusinessInput = Omit<Business, 'id' | 'rating' | 'reviewCount' | 'createdAt'>;

export async function createBusiness(input: BusinessInput): Promise<Business> {
  if (!USE_MOCK) return api.post<Business>('/businesses/', input);
  await delay();
  const business: Business = { ...input, id: makeId('biz'), rating: 0, reviewCount: 0, createdAt: new Date().toISOString() };
  write('businesses', [business, ...read('businesses')]);
  return business;
}

export async function updateBusiness(id: string, patch: Partial<Business>): Promise<Business> {
  if (!USE_MOCK) return api.patch<Business>(`/businesses/${id}/`, patch);
  await delay();
  const all = read('businesses');
  const idx = all.findIndex((b) => b.id === id);
  if (idx < 0) notFound('Business');
  all[idx] = { ...all[idx], ...patch };
  write('businesses', all);
  return all[idx];
}

export async function createBusinesses(inputs: BusinessInput[]): Promise<Business[]> {
  if (!USE_MOCK) return api.post<Business[]>('/businesses/bulk/', inputs);
  await delay();
  const now = new Date().toISOString();
  const created = inputs.map((input) => ({ ...input, id: makeId('biz'), rating: 0, reviewCount: 0, createdAt: now }));
  write('businesses', [...created, ...read('businesses')]);
  return created;
}
