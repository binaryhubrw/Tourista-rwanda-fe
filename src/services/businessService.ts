import type { Business, User } from '@/types';
import { api } from './apiClient';
import { mergeVehicles, persistFleet, payoutForOwner } from '@/demo/store';
import { DEMO_PAYOUT, demoHireBusiness, isDemoHire, withDemoListings } from '@/demo/vehicles';
import { getStoredUser } from './authService';
import type { PayoutTarget } from '@/utils/payment';

function attach(b: Business): Business {
  return mergeVehicles(b) as Business;
}

function scoped(list: Business[], user: User | null) {
  if (user?.role !== 'staff') return list;
  const allowed = new Set(user.assignedListingIds ?? []);
  return list.filter((b) => allowed.has(b.id) || isDemoHire(b.id));
}

function hireFor(ownerId?: string, ownerName?: string): Business {
  const hire = demoHireBusiness();
  return { ...hire, ownerId: ownerId ?? hire.ownerId, ownerName: ownerName ?? hire.ownerName };
}

async function remoteBusinesses() {
  try {
    return await api.get<Business[]>('/businesses/');
  } catch {
    return [] as Business[];
  }
}

export async function getBusinesses(): Promise<Business[]> {
  return withDemoListings(await remoteBusinesses()).map(attach);
}

export async function getBusinessById(id: string): Promise<Business> {
  if (isDemoHire(id)) return attach(hireFor());
  try {
    return attach(await api.get<Business>(`/businesses/${id}/`));
  } catch (e) {
    if (isDemoHire(id)) return attach(hireFor());
    throw e;
  }
}

export async function getBusinessesByOwner(ownerId: string): Promise<Business[]> {
  const user = getStoredUser();
  const id = user?.role === 'staff' ? (user.ownerId ?? ownerId) : ownerId;
  let list: Business[] = [];
  try {
    list = await api.get<Business[]>(`/businesses/?owner=${id}`);
  } catch {
    list = (await remoteBusinesses()).filter((b) => b.ownerId === id);
  }
  const hire = hireFor(id, user?.name);
  if (!list.some((b) => isDemoHire(b.id))) list = [hire, ...list];
  return scoped(list.map(attach), user);
}

export async function getPayoutForBusiness(businessId: string): Promise<PayoutTarget | null> {
  if (isDemoHire(businessId)) return DEMO_PAYOUT;
  let remote: PayoutTarget | null = null;
  try {
    remote = await api.get<PayoutTarget>(`/businesses/${businessId}/payout/`);
  } catch { /* demo overlay still applies */ }
  try {
    const b = await getBusinessById(businessId);
    const demo = payoutForOwner(b.ownerId);
    if (demo) return demo;
    const hasRemote = remote && (remote.bankAccount || remote.mtnNumber || remote.airtelNumber);
    if (hasRemote) return remote;
    return { ...DEMO_PAYOUT, businessName: b.name };
  } catch { /* listing may be missing */ }
  return remote ?? DEMO_PAYOUT;
}

export type BusinessInput = Omit<Business, 'id' | 'rating' | 'reviewCount' | 'createdAt'>;

export async function createBusiness(input: BusinessInput): Promise<Business> {
  const created = await api.post<Business>('/businesses/', input);
  persistFleet(created.id, input.services ?? []);
  return attach(created);
}

export async function updateBusiness(id: string, patch: Partial<Business>): Promise<Business> {
  if (isDemoHire(id)) {
    if (patch.services) persistFleet(id, patch.services);
    return attach({ ...hireFor(), ...patch, id, services: patch.services ?? hireFor().services });
  }
  const updated = await api.patch<Business>(`/businesses/${id}/`, patch);
  if (patch.services) persistFleet(id, patch.services);
  return attach(updated);
}

export async function createBusinesses(inputs: BusinessInput[]): Promise<Business[]> {
  return api.post<Business[]>('/businesses/bulk/', inputs);
}
