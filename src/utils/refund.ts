import type { RefundStage } from '@/types';

export const refundStageLabel: Record<RefundStage, string> = {
  requested: 'Requested',
  owner_review: 'Requested',
  admin_review: 'Requested',
  returning: 'Approved',
  completed: 'Completed',
  rejected: 'Rejected',
  canceled: 'Canceled',
};

export const refundIsRequested = (status: RefundStage) => ['requested', 'owner_review', 'admin_review'].includes(status);

export const refundIsClosed = (status: RefundStage) => ['completed', 'rejected', 'canceled'].includes(status);
