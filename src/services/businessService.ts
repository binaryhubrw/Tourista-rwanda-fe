import type { Business, User } from '@/types';
import { api } from './apiClient';
import { getStoredUser } from './authService';
import type { PayoutTarget } from '@/utils/payment';
import { announceCatalog } from '@/utils/explore';

function scoped(list: Business[], user: User | null) {
  if (user?.role !== 'staff') return list;
  const allowed = new Set(user.assignedListingIds ?? []);
  return list.filter((b) => allowed.has(b.id));
}

export async function getBusinesses(): Promise<Business[]> {
  return api.get<Business[]>('/businesses/');
}

export async function getBusinessById(id: string): Promise<Business> {
  return api.get<Business>(`/businesses/${id}/`);
}

export async function getBusinessesByOwner(ownerId: string): Promise<Business[]> {
  const user = getStoredUser();
  const id = user?.role === 'staff' ? (user.ownerId ?? ownerId) : ownerId;
  const list = await api.get<Business[]>(`/businesses/?owner=${encodeURIComponent(id)}`);
  return user?.role === 'staff' ? scoped(list, user) : list;
}

export async function getPayoutForBusiness(businessId: string): Promise<PayoutTarget | null> {
  return api.get<PayoutTarget>(`/businesses/${businessId}/payout/`);
}

export type BusinessInput = Omit<Business, 'id' | 'rating' | 'reviewCount' | 'createdAt'>;

export async function createBusiness(input: BusinessInput): Promise<Business> {
  const created = await api.post<Business>('/businesses/', input);
  announceCatalog();
  return created;
}

export async function updateBusiness(id: string, patch: Partial<Business>): Promise<Business> {
  const updated = await api.patch<Business>(`/businesses/${id}/`, patch);
  if (patch.services) announceCatalog();
  return updated;
}

export async function createBusinesses(inputs: BusinessInput[]): Promise<Business[]> {
  const created = await api.post<Business[]>('/businesses/bulk/', inputs);
  announceCatalog();
  return created;
}
