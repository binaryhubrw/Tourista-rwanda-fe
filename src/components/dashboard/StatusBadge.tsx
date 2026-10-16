import { CheckCircle2, Clock, RotateCcw, Wallet, XCircle } from 'lucide-react';
import type { ApprovalStatus, BookingStatus, PaymentLedgerStatus, RefundStage } from '@/types';
import { approvalLabel } from '@/utils/approval';
import { Badge } from '@/components/ui';
import { refundStageLabel } from '@/utils/refund';
import { STATUS_COLORS } from './charts';

export const bookingStatusLabel: Record<BookingStatus, string> = {
  Pending: 'Awaiting host',
  Declined: 'Declined',
  OwnerApproved: 'Pending payment',
  AwaitingPayment: 'Pending payment',
  PaymentReview: 'Proof sent',
  Confirmed: 'Confirmed',
  Canceled: 'Canceled',
  Expired: 'Window closed',
  RefundPending: 'Refund in progress',
  Refunded: 'Refunded',
};

const config: Record<BookingStatus, { tone: 'success' | 'warning' | 'danger' | 'neutral' | 'brand'; icon: typeof Clock }> = {
  Confirmed: { tone: 'success', icon: CheckCircle2 },
  Pending: { tone: 'warning', icon: Clock },
  OwnerApproved: { tone: 'brand', icon: Clock },
  AwaitingPayment: { tone: 'warning', icon: Wallet },
  PaymentReview: { tone: 'brand', icon: Clock },
  Declined: { tone: 'danger', icon: XCircle },
  Canceled: { tone: 'danger', icon: XCircle },
  Expired: { tone: 'neutral', icon: Clock },
  RefundPending: { tone: 'warning', icon: RotateCcw },
  Refunded: { tone: 'neutral', icon: RotateCcw },
};

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { tone, icon: Icon } = config[status];
  return <Badge tone={tone} icon={<Icon className="h-3.5 w-3.5" aria-hidden />}>{bookingStatusLabel[status]}</Badge>;
}

const ledgerTone: Record<PaymentLedgerStatus, 'success' | 'warning' | 'brand' | 'violet'> = {
  pending: 'warning',
  approved: 'success',
  partial: 'warning',
  refund_requested: 'violet',
  refunded: 'brand',
};

export const paymentLedgerLabel: Record<PaymentLedgerStatus, string> = {
  pending: 'Pending',
  approved: 'Approved',
  partial: 'Partially paid',
  refund_requested: 'Refund requested',
  refunded: 'Refunded',
};

export function PaymentLedgerBadge({ status }: { status: PaymentLedgerStatus }) {
  return <Badge tone={ledgerTone[status]}>{paymentLedgerLabel[status]}</Badge>;
}

const refundTone: Record<RefundStage, 'success' | 'warning' | 'danger' | 'brand' | 'neutral'> = {
  requested: 'warning',
  owner_review: 'warning',
  admin_review: 'warning',
  returning: 'brand',
  completed: 'success',
  rejected: 'danger',
  canceled: 'neutral',
};

export function RefundStageBadge({ status }: { status: RefundStage }) {
  return <Badge tone={refundTone[status]}>{refundStageLabel[status]}</Badge>;
}

const vehicleCategoryTone: Record<string, 'success' | 'neutral' | 'brand' | 'violet' | 'warning'> = {
  Economy: 'success',
  Standard: 'neutral',
  VIP: 'brand',
  VVIP: 'violet',
  Luxury: 'warning',
};

export function VehicleCategoryBadge({ category }: { category?: string | null }) {
  const label = category?.trim() || 'Standard';
  return <Badge tone={vehicleCategoryTone[label] ?? 'neutral'}>{label}</Badge>;
}

const approvalTone: Record<ApprovalStatus, 'success' | 'warning' | 'danger'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
};

export function ListingApprovalBadge({ status }: { status: ApprovalStatus }) {
  return <Badge tone={approvalTone[status]}>{approvalLabel[status]}</Badge>;
}

export const BOOKING_STATUSES: BookingStatus[] = [
  'Pending', 'OwnerApproved', 'AwaitingPayment', 'PaymentReview', 'Confirmed', 'Declined', 'Expired', 'RefundPending', 'Refunded', 'Canceled',
];

export const bookingStatusColor: Record<BookingStatus, string> = {
  Confirmed: STATUS_COLORS.good,
  Pending: STATUS_COLORS.warning,
  OwnerApproved: STATUS_COLORS.warning,
  AwaitingPayment: STATUS_COLORS.warning,
  PaymentReview: STATUS_COLORS.warning,
  Declined: STATUS_COLORS.critical,
  Canceled: STATUS_COLORS.critical,
  Expired: STATUS_COLORS.neutral,
  RefundPending: STATUS_COLORS.warning,
  Refunded: STATUS_COLORS.neutral,
};
