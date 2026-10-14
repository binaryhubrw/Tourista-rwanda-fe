import type { ApprovalStatus, Business } from '@/types';

/** Missing status is treated as approved (listings created before review existed). */
export function listingApproval(listing: Pick<Business, 'approvalStatus'>): ApprovalStatus {
  if (listing.approvalStatus === 'pending' || listing.approvalStatus === 'rejected') return listing.approvalStatus;
  return 'approved';
}

export const approvalLabel: Record<ApprovalStatus, string> = {
  pending: 'Awaiting review',
  approved: 'Live',
  rejected: 'Needs changes',
};

export function isListingLive(listing: Pick<Business, 'approvalStatus'>) {
  return listingApproval(listing) === 'approved';
}
