import { Link } from 'react-router-dom';
import { CreditCard, Eye, Smartphone } from 'lucide-react';
import type { Booking, BookingStatus, Review } from '@/types';
import { Avatar, StarRow } from '@/components/ui';
import { BookingStatusBadge, BOOKING_STATUSES, type Column } from '@/components/dashboard';
import { formatDate, formatRwf } from '@/utils/format';
import { paymentMethodShort } from '@/utils/payment';
import { periodNoun, unitNoun } from '@/utils/pricing';

export const reviewTargetHref = (r: Pick<Review, 'targetType' | 'targetId'>) =>
  r.targetType === 'location' ? `/destinations/${r.targetId}` : r.targetType === 'experience' ? `/experiences/${r.targetId}` : `/businesses/${r.targetId}`;

const bookingTargetHref = (b: Booking) => (b.targetType === 'experience' ? `/experiences/${b.targetId}` : b.targetType === 'location' ? `/destinations/${b.targetId}` : `/businesses/${b.targetId}`);

export function BookingViewLink({ to }: { to: string }) {
  return (
    <Link to={to} aria-label="View booking details" title="View booking" className="inline-grid h-9 w-9 place-items-center rounded-full text-brand-600 hover:bg-brand-50">
      <Eye className="h-4 w-4" aria-hidden />
    </Link>
  );
}

type BookingColumnId = 'guest' | 'target' | 'service' | 'date' | 'units' | 'people' | 'total' | 'status' | 'payment' | 'created';

/** Booking columns shared by the traveller, business and admin tables; pick the ones each view needs. */
export function bookingColumns(include: BookingColumnId[], options?: { detailsBase?: string; linkGuest?: boolean }): Column<Booking>[] {
  const detailsHref = (b: Booking) => (options?.detailsBase ? `${options.detailsBase}/${b.id}` : bookingTargetHref(b));
  const all: Record<BookingColumnId, Column<Booking>> = {
    guest: {
      id: 'guest', header: 'Guest', sortValue: (b) => b.customerName, exportValue: (b) => b.customerName,
      cell: (b) => (
        <div className="flex items-center gap-3">
          <Avatar name={b.customerName} size={32} />
          <div className="min-w-0">
            {options?.linkGuest ? <Link to={`/admin/users/${b.userId}`} className="truncate font-semibold text-ink hover:text-brand-700 hover:underline">{b.customerName}</Link> : <p className="truncate font-semibold text-ink">{b.customerName}</p>}
            <p className="truncate text-xs text-slate-500">{b.customerEmail}</p>
          </div>
        </div>
      ),
    },
    target: {
      id: 'target', header: 'Booking', sortValue: (b) => b.targetName,
      cell: (b) => (
        <div className="min-w-0">
          <Link to={bookingTargetHref(b)} className="font-semibold text-ink hover:text-brand-700 hover:underline">{b.targetName}</Link>
          <Link to={detailsHref(b)} className="text-xs font-semibold text-brand-600 hover:underline">Ref {b.id.toUpperCase()}</Link>
        </div>
      ),
    },
    service: { id: 'service', header: 'Service', sortValue: (b) => b.serviceName ?? '', cell: (b) => b.serviceName ?? '—' },
    date: {
      id: 'date', header: 'Dates', sortValue: (b) => b.date, exportValue: (b) => (b.endDate ? `${b.date} to ${b.endDate}` : b.date),
      cell: (b) => (
        <div className="whitespace-nowrap">
          <p>{formatDate(b.date, { day: 'numeric', month: 'short' })}{b.endDate && <> → {formatDate(b.endDate, { day: 'numeric', month: 'short' })}</>}</p>
          {b.nights !== undefined && <p className="text-xs text-slate-500">{b.nights} {periodNoun(isStay(b) ? 'stay' : 'rental', b.nights)}</p>}
        </div>
      ),
    },
    units: {
      id: 'units', header: 'Qty', align: 'right', sortValue: (b) => b.units ?? b.people, exportValue: (b) => b.units ?? b.people,
      cell: (b) => {
        const stay = isStay(b);
        const n = b.units ?? 1;
        return <span className="whitespace-nowrap tabular-nums">{n} <span className="text-xs text-slate-500">{stay ? unitNoun('stay', n) : ''}</span></span>;
      },
    },
    people: { id: 'people', header: 'Guests', align: 'right', sortValue: (b) => b.people, cell: (b) => <span className="tabular-nums">{b.people}</span> },
    total: { id: 'total', header: 'Total', align: 'right', sortValue: (b) => b.totalRwf, cell: (b) => <span className="whitespace-nowrap font-semibold tabular-nums text-ink">{formatRwf(b.totalRwf)}</span> },
    status: { id: 'status', header: 'Status', sortValue: (b) => b.status, cell: (b) => <BookingStatusBadge status={b.status} /> },
    payment: {
      id: 'payment', header: 'Payment', sortValue: (b) => b.payment?.status ?? 'Unpaid',
      exportValue: (b) => (b.payment ? `${b.payment.status} via ${paymentMethodShort[b.payment.method]} (${b.payment.reference})` : 'Unpaid'),
      cell: (b) => {
        if (!b.payment) return <span className="whitespace-nowrap text-xs font-semibold text-slate-500">{b.status === 'Pending' ? 'Awaiting payment' : 'Not paid'}</span>;
        const Icon = b.payment.method === 'card' ? CreditCard : Smartphone;
        return (
          <div className="whitespace-nowrap">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-ink"><Icon className="h-3.5 w-3.5 text-brand-600" aria-hidden />{paymentMethodShort[b.payment.method]}</p>
            <p className="text-xs text-slate-500">{b.payment.status}{b.payment.status === 'Refunded' ? ' to ' : ' · '}{b.payment.account}</p>
          </div>
        );
      },
    },
    created: { id: 'created', header: 'Booked on', sortValue: (b) => b.createdAt, exportValue: (b) => b.createdAt.slice(0, 10), cell: (b) => <span className="whitespace-nowrap text-slate-500">{formatDate(b.createdAt)}</span> },
  };
  return include.map((id) => all[id]);
}

export const bookingSearchText = (b: Booking) => `${b.id} ${b.customerName} ${b.customerEmail} ${b.targetName} ${b.serviceName ?? ''} ${b.payment?.reference ?? ''}`;

/** Nights between start and end, used to tell stays (nights) from rentals (days). */
function nightsOf(b: Booking) {
  if (!b.endDate) return 0;
  return Math.round((new Date(`${b.endDate}T00:00:00`).getTime() - new Date(`${b.date}T00:00:00`).getTime()) / 86_400_000);
}

export type StatusFilter = 'All' | BookingStatus;

export function statusOptions(bookings: Booking[]) {
  return [
    { value: 'All' as StatusFilter, label: 'All', count: bookings.length },
    ...BOOKING_STATUSES.map((s) => ({ value: s as StatusFilter, label: s, count: bookings.filter((b) => b.status === s).length })),
  ];
}

type ReviewColumnId = 'author' | 'target' | 'rating' | 'comment' | 'date';

export function reviewColumns(include: ReviewColumnId[]): Column<Review>[] {
  const all: Record<ReviewColumnId, Column<Review>> = {
    author: {
      id: 'author', header: 'Reviewer', sortValue: (r) => r.userName,
      cell: (r) => <div className="flex items-center gap-2.5"><Avatar name={r.userName} size={30} /><span className="font-semibold text-ink">{r.userName}</span></div>,
    },
    target: {
      id: 'target', header: 'Reviewed', sortValue: (r) => r.targetName,
      cell: (r) => (
        <div className="min-w-0">
          <Link to={reviewTargetHref(r)} className="font-semibold text-ink hover:text-brand-700 hover:underline">{r.targetName}</Link>
          <p className="text-xs capitalize text-slate-500">{r.targetType}</p>
        </div>
      ),
    },
    rating: {
      id: 'rating', header: 'Rating', sortValue: (r) => r.rating,
      cell: (r) => <span className="inline-flex items-center gap-2 whitespace-nowrap"><StarRow value={r.rating} /><span className="font-semibold tabular-nums text-ink">{r.rating}</span></span>,
    },
    comment: { id: 'comment', header: 'Comment', exportValue: (r) => r.comment, cell: (r) => <p className="line-clamp-2 min-w-[240px] max-w-md text-slate-600">{r.comment}</p> },
    date: { id: 'date', header: 'Date', sortValue: (r) => r.date, cell: (r) => <span className="whitespace-nowrap text-slate-500">{formatDate(r.date)}</span> },
  };
  return include.map((id) => all[id]);
}

export const reviewSearchText = (r: Review) => `${r.userName} ${r.targetName} ${r.comment}`;

/** A stay charges nights (check-out day not counted); a rental charges every day. */
const isStay = (b: Booking) => !!b.endDate && b.nights === nightsOf(b);
