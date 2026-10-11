import type { Business, User } from '@/types';
import { api } from './apiClient';
import { mergeVehicles, persistFleet, payoutForOwner } from '@/demo/store';
import { DEMO_INN_ID, DEMO_PAYOUT, demoHireBusiness, demoInnBusiness, demoStaffBranches, isDemoHire, isDemoListing, withDemoListings } from '@/demo/vehicles';
import { getStoredUser } from './authService';
import type { PayoutTarget } from '@/utils/payment';
import { announceCatalog } from '@/utils/explore';

function attach(b: Business): Business {
  return mergeVehicles(b) as Business;
}

function scoped(list: Business[], user: User | null) {
  if (user?.role !== 'staff') return list;
  const allowed = new Set(user.assignedListingIds ?? []);
  const fromOwner = list.filter((b) => allowed.has(b.id));
  const seen = new Set(fromOwner.map((b) => b.id));
  const assignedDemo = demoStaffBranches().filter((b) => allowed.has(b.id) && !seen.has(b.id)).map(attach);
  return [...assignedDemo, ...fromOwner];
}

function hireFor(ownerId?: string, ownerName?: string): Business {
  const hire = demoHireBusiness();
  return { ...hire, ownerId: ownerId ?? hire.ownerId, ownerName: ownerName ?? hire.ownerName };
}

function innFor(ownerId?: string, ownerName?: string): Business {
  const inn = demoInnBusiness();
  return { ...inn, ownerId: ownerId ?? inn.ownerId, ownerName: ownerName ?? inn.ownerName };
}

function demoById(id: string, ownerId?: string, ownerName?: string): Business | null {
  if (isDemoHire(id)) return hireFor(ownerId, ownerName);
  if (id === DEMO_INN_ID) return innFor(ownerId, ownerName);
  return null;
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
  const demo = demoById(id);
  if (demo) return attach(demo);
  try {
    return attach(await api.get<Business>(`/businesses/${id}/`));
  } catch (e) {
    const fallback = demoById(id);
    if (fallback) return attach(fallback);
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
  if (user?.role === 'staff') return scoped(list.map(attach), user);
  const hire = hireFor(id, user?.name);
  if (!list.some((b) => isDemoHire(b.id))) list = [hire, ...list];
  return list.map(attach);
}

export async function getPayoutForBusiness(businessId: string): Promise<PayoutTarget | null> {
  if (isDemoListing(businessId)) return DEMO_PAYOUT;
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
  announceCatalog();
  return attach(created);
}

export async function updateBusiness(id: string, patch: Partial<Business>): Promise<Business> {
  const demo = demoById(id);
  if (demo) {
    if (patch.services) persistFleet(id, patch.services);
    announceCatalog();
    return attach({ ...demo, ...patch, id, services: patch.services ?? demo.services });
  }
  const updated = await api.patch<Business>(`/businesses/${id}/`, patch);
  if (patch.services) persistFleet(id, patch.services);
  announceCatalog();
  return attach(updated);
}

export async function createBusinesses(inputs: BusinessInput[]): Promise<Business[]> {
  const created = await api.post<Business[]>('/businesses/bulk/', inputs);
  created.forEach((business, i) => persistFleet(business.id, inputs[i]?.services ?? business.services ?? []));
  announceCatalog();
  return created.map(attach);
}
