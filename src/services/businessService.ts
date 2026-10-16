import type { ApprovalStatus, Business, User } from '@/types';
import { api } from './apiClient';
import { getStoredUser } from './authService';
import type { PayoutTarget } from '@/utils/payment';
import { announceCatalog } from '@/utils/explore';

function scoped(list: Business[], user: User | null) {
  if (user?.role !== 'staff') return list;
  const allowed = new Set(user.assignedListingIds ?? []);
  return list.filter((b) => allowed.has(b.id));
}

export async function getBusinesses(filter: { approvalStatus?: ApprovalStatus } = {}): Promise<Business[]> {
  const qs = filter.approvalStatus ? `?approvalStatus=${filter.approvalStatus}` : '';
  return api.get<Business[]>(`/businesses/${qs}`);
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

export type BusinessInput = Omit<Business, 'id' | 'rating' | 'reviewCount' | 'createdAt' | 'approvalStatus' | 'rejectionReason' | 'submittedAt' | 'reviewedAt' | 'reviewedBy' | 'active'>;

export async function setBusinessActive(id: string, active: boolean): Promise<Business> {
  const updated = await api.patch<Business>(`/businesses/${id}/active/`, { active });
  announceCatalog();
  return updated;
}

export async function approveBusiness(id: string): Promise<Business> {
  const updated = await api.post<Business>(`/businesses/${id}/approve/`, {});
  announceCatalog();
  return updated;
}

export async function rejectBusiness(id: string, reason: string): Promise<Business> {
  const updated = await api.post<Business>(`/businesses/${id}/reject/`, { reason });
  announceCatalog();
  return updated;
}

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

export async function deleteBusiness(id: string): Promise<void> {
  await api.delete(`/businesses/${id}/`);
  announceCatalog();
}
