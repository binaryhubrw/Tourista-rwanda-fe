import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import type { BookingStatus } from '@/types';
import { Badge } from '@/components/ui';
import { STATUS_COLORS } from './charts';

const config = {
  Confirmed: { tone: 'success', icon: CheckCircle2 },
  Pending: { tone: 'warning', icon: Clock },
  Canceled: { tone: 'danger', icon: XCircle },
} as const;

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const { tone, icon: Icon } = config[status];
  return <Badge tone={tone} icon={<Icon className="h-3.5 w-3.5" aria-hidden />}>{status}</Badge>;
}

export const BOOKING_STATUSES: BookingStatus[] = ['Confirmed', 'Pending', 'Canceled'];

/** Status colours for charts, matching the badges. */
export const bookingStatusColor: Record<BookingStatus, string> = {
  Confirmed: STATUS_COLORS.good,
  Pending: STATUS_COLORS.warning,
  Canceled: STATUS_COLORS.critical,
};
