import type { StaffMember } from '@/types';
import { api } from './apiClient';

export type StaffInput = {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  assignedListingIds: string[];
  active?: boolean;
};

export async function getStaff(ownerId?: string): Promise<StaffMember[]> {
  const qs = ownerId ? `?ownerId=${encodeURIComponent(ownerId)}` : '';
  return api.get<StaffMember[]>(`/staff/${qs}`);
}

export async function createStaff(input: StaffInput): Promise<StaffMember> {
  return api.post<StaffMember>('/staff/', input);
}

export async function updateStaff(id: string, patch: StaffInput): Promise<StaffMember> {
  const body: Record<string, unknown> = {
    name: patch.name,
    email: patch.email,
    phone: patch.phone,
    assignedListingIds: patch.assignedListingIds,
  };
  if (patch.password) body.password = patch.password;
  if (patch.active !== undefined) body.active = patch.active;
  return api.patch<StaffMember>(`/staff/${id}/`, body);
}

export async function deleteStaff(id: string): Promise<void> {
  return api.delete(`/staff/${id}/`);
}

export function managerForListing(staff: StaffMember[], listingId: string, exceptId?: string) {
  return staff.find((row) => row.id !== exceptId && row.active !== false && row.assignedListingIds.includes(listingId));
}
