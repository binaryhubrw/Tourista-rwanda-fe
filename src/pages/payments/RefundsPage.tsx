import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { RotateCcw, Clock, CheckCircle2, XCircle } from 'lucide-react';
import type { Refund, RefundStage } from '@/types';
import { DataTable, FilterTabs, PageHeader, RefundStageBadge, StatCard, StatGrid, type Column } from '@/components/dashboard';
import { getBookings, getBusinessesByOwner, getRefunds } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useViewerMode } from '@/hooks/useViewerMode';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { Button, ButtonLink, ErrorState, Loading } from '@/components/ui';
import { PaymentViewLink } from '@/pages/shared/tableColumns';
import { formatDate, formatRwf, formatRwfShort } from '@/utils/format';
import { refundIsRequested } from '@/utils/refund';

type Filter = 'all' | RefundStage;

export default function RefundsPage() {
  useDocumentTitle('Refunds');
  const { user } = useAuth();
  const base = dashboardPathFor(user!.role);
  const { isHost, asTraveller, setTraveller } = useViewerMode();
  const { data, loading, error, reload } = useAsync(async () => {
    if (user!.role === 'admin') {
      const [refunds, bookings] = await Promise.all([getRefunds(), getBookings()]);
      return { refunds, bookings };
    }
    if (asTraveller) {
      const [refunds, bookings] = await Promise.all([getRefunds('traveller'), getBookings({ scope: 'traveller' })]);
      return { refunds, bookings };
    }
    const listings = await getBusinessesByOwner(user!.ownerId ?? user!.id);
    const [refunds, bookings] = await Promise.all([
      getRefunds(),
      getBookings({ businessIds: listings.map((b) => b.id) }),
    ]);
    return { refunds, bookings };
  }, [user?.id, user?.role, asTraveller]);
  const [filter, setFilter] = useState<Filter>('all');

  const rows = data?.refunds ?? [];
  const bookings = data?.bookings ?? [];
  const bookingOf = (id: string) => bookings.find((b) => b.id === id);
  const list = useMemo(
    () => rows.filter((r) => filter === 'all' || (filter === 'requested' ? refundIsRequested(r.status) : r.status === filter)),
    [rows, filter],
  );
  const n = (s: RefundStage) => rows.filter((r) => r.status === s).length;
  const requestedCount = rows.filter((r) => refundIsRequested(r.status)).length;
  const money = (...statuses: RefundStage[]) => formatRwfShort(
    (statuses.length ? rows.filter((r) => statuses.includes(r.status)) : rows).reduce((sum, r) => sum + r.amountRwf, 0),
  );

  const columns: Column<Refund>[] = [
    {
      id: 'id', header: 'Refund', sortValue: (r) => r.id,
      cell: (r) => (
        <div>
          <Link to={`${base}/refunds/${r.id}${asTraveller ? '?viewer=traveller' : ''}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">{r.id.toUpperCase()}</Link>
          <p className="text-xs text-slate-500">{bookingOf(r.bookingId)?.targetName ?? r.bookingId}</p>
        </div>
      ),
    },
    { id: 'who', header: asTraveller ? 'Branch' : 'Guest', sortValue: (r) => bookingOf(r.bookingId)?.customerName ?? '', cell: (r) => (asTraveller ? (bookingOf(r.bookingId)?.targetName ?? '—') : (bookingOf(r.bookingId)?.customerName ?? '—')) },
    { id: 'amount', header: 'Amount', align: 'right', sortValue: (r) => r.amountRwf, cell: (r) => <span className="font-semibold tabular-nums">{formatRwf(r.amountRwf)}</span> },
    { id: 'status', header: 'Status', sortValue: (r) => r.status, cell: (r) => <RefundStageBadge status={r.status} /> },
    { id: 'when', header: 'Requested', sortValue: (r) => r.steps[0]?.at ?? '', cell: (r) => <span className="whitespace-nowrap text-slate-500">{formatDate(r.steps[0]?.at ?? '')}</span> },
  ];

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) return <Loading />;

  const showViewToggle = isHost;

  return (
    <>
      <PageHeader
        title="Refunds"
        intro={user?.role === 'admin' ? 'Approve or reject traveller requests. Hosts return the money after you approve.' : asTraveller ? 'Ask for a refund on a confirmed payment. Admin approves, then the host returns the money.' : 'When admin approves a guest refund, open it and send the money to the traveller’s account.'}
        action={
          <>
            {showViewToggle && (
              <div className="flex gap-2 rounded-full border border-slate-200 bg-white p-1">
                <Button variant={asTraveller ? 'ghost' : 'primary'} size="sm" onClick={() => setTraveller(false)}>Business view</Button>
                <Button variant={asTraveller ? 'primary' : 'ghost'} size="sm" onClick={() => setTraveller(true)}>Traveller view</Button>
              </div>
            )}
            {asTraveller && <ButtonLink to={`${base}/refunds/new`}>Ask for a refund</ButtonLink>}
          </>
        }
      />
      <StatGrid>
        <StatCard label="All refunds" icon={RotateCcw} value={money()} hint={`${rows.length} request${rows.length === 1 ? '' : 's'}`} />
        <StatCard label="Requested" icon={Clock} tone="amber" value={money('admin_review', 'owner_review', 'requested')} hint={`${requestedCount} request${requestedCount === 1 ? '' : 's'}`} />
        <StatCard label="Completed" icon={CheckCircle2} tone="teal" value={money('completed')} hint={n('completed') ? `${n('completed')} paid back` : 'None paid back yet'} />
        <StatCard label="Rejected" icon={XCircle} tone="violet" value={money('rejected')} hint={n('rejected') ? `${n('rejected')} declined` : 'None declined'} />
      </StatGrid>
      <DataTable
        className="mt-6"
        data={list}
        columns={columns}
        getRowId={(r) => r.id}
        initialSort={{ id: 'when', desc: true }}
        searchText={(r) => `${r.id} ${r.reason} ${bookingOf(r.bookingId)?.targetName ?? ''} ${bookingOf(r.bookingId)?.customerName ?? ''}`}
        searchPlaceholder="Search refunds"
        filters={
          <FilterTabs
            label="Refund status"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: rows.length },
              { value: 'requested', label: 'Requested', count: requestedCount },
              { value: 'returning', label: 'Approved', count: n('returning') },
              { value: 'completed', label: 'Completed', count: n('completed') },
              { value: 'rejected', label: 'Rejected', count: n('rejected') },
              { value: 'canceled', label: 'Canceled', count: n('canceled') },
            ]}
          />
        }
        rowActions={(r) => (
          <div className="flex justify-end gap-1">
            <PaymentViewLink to={`${base}/refunds/${r.id}${asTraveller ? '?viewer=traveller' : ''}`} label="View refund details" />
          </div>
        )}
        emptyTitle="No refunds yet"
        emptyMessage={asTraveller ? 'When a host has confirmed your payment, you can ask for a refund here.' : user?.role === 'admin' ? 'Refund requests from travellers appear here for you to approve or reject.' : 'Approved refunds appear here so you can send the money and mark them completed.'}
      />
    </>
  );
}
