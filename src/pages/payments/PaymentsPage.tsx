import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wallet, Clock, CheckCircle2, RotateCcw } from 'lucide-react';
import type { Booking, PaymentLedgerStatus } from '@/types';
import { getBookings, getBusinessesByOwner } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { ErrorState, Loading } from '@/components/ui';
import { DataTable, FilterTabs, PageHeader, PaymentLedgerBadge, StatCard, StatGrid, type Column } from '@/components/dashboard';
import { PaymentViewLink } from '@/pages/shared/tableColumns';
import { demoRefunds } from '@/demo/store';
import { formatDate, formatRwf, formatRwfShort } from '@/utils/format';
import { paymentDisplayStatus, paymentMethodShort } from '@/utils/payment';

type Filter = 'all' | PaymentLedgerStatus;

export default function PaymentsPage() {
  useDocumentTitle('Payments');
  const { user } = useAuth();
  const base = dashboardPathFor(user!.role);
  const { data, loading, error, reload } = useAsync(async () => {
    if (user!.role === 'tourist') return getBookings({ userId: user!.id });
    if (user!.role === 'admin') return getBookings();
    const listings = await getBusinessesByOwner(user!.ownerId ?? user!.id);
    return getBookings({ businessIds: listings.map((b) => b.id) });
  }, [user?.id, user?.role]);
  const [filter, setFilter] = useState<Filter>('all');
  const refunds = demoRefunds();
  const statusOf = (b: Booking) => paymentDisplayStatus(b, refunds);

  const rows = (data ?? []).filter((b) => statusOf(b));
  const list = useMemo(() => rows.filter((b) => filter === 'all' || statusOf(b) === filter), [rows, filter]);

  const columns: Column<Booking>[] = [
    {
      id: 'ref', header: 'Payment', sortValue: (b) => b.payment?.reference ?? b.id,
      cell: (b) => (
        <div>
          <Link to={`${base}/payments/${b.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">{b.payment?.reference ?? b.id.toUpperCase()}</Link>
          <p className="text-xs text-slate-500">{b.targetName}</p>
        </div>
      ),
    },
    { id: 'who', header: user?.role === 'tourist' ? 'Host branch' : 'Guest', sortValue: (b) => (user?.role === 'tourist' ? b.targetName : b.customerName), cell: (b) => (user?.role === 'tourist' ? b.targetName : b.customerName) },
    { id: 'method', header: 'Method', sortValue: (b) => b.payment?.method ?? '', cell: (b) => b.payment ? paymentMethodShort[b.payment.method] : '—' },
    { id: 'amount', header: 'Amount', align: 'right', sortValue: (b) => b.payment?.amountRwf ?? 0, cell: (b) => <span className="font-semibold tabular-nums">{formatRwf(b.payment?.amountRwf ?? 0)}</span> },
    { id: 'status', header: 'Status', sortValue: (b) => statusOf(b) ?? '', cell: (b) => { const status = statusOf(b); return status ? <PaymentLedgerBadge status={status} /> : '—'; } },
    { id: 'when', header: 'Submitted', sortValue: (b) => b.payment?.paidAt ?? b.createdAt, cell: (b) => <span className="whitespace-nowrap text-slate-500">{formatDate(b.payment?.paidAt ?? b.createdAt)}</span> },
  ];

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) return <Loading />;

  const n = (s: PaymentLedgerStatus) => rows.filter((b) => statusOf(b) === s).length;
  const paid = (b: Booking) => b.payment?.amountRwf ?? b.totalRwf;
  const money = (status?: PaymentLedgerStatus) => formatRwfShort(
    (status ? rows.filter((b) => statusOf(b) === status) : rows).reduce((sum, b) => sum + paid(b), 0),
  );

  return (
    <>
      <PageHeader title="Payments" intro="Transfers happen outside Tourista. This list is the proof, host confirmation and refund trail." />
      <StatGrid>
        <StatCard label="Total payments" icon={Wallet} value={money()} hint={`${rows.length} with proof`} />
        <StatCard label="Pending payment" icon={Clock} tone="amber" value={money('pending')} hint={n('pending') ? `${n('pending')} waiting for the host` : 'Nothing waiting'} />
        <StatCard label="Approved payments" icon={CheckCircle2} tone="teal" value={money('approved')} hint={n('approved') ? `${n('approved')} confirmed by the host` : 'None confirmed yet'} />
        <StatCard label="Refunded" icon={RotateCcw} tone="violet" value={money('refunded')} hint={n('refunded') ? `${n('refunded')} returned` : 'No refunds'} />
      </StatGrid>
      <DataTable
        className="mt-6"
        data={list}
        columns={columns}
        getRowId={(b) => b.id}
        initialSort={{ id: 'when', desc: true }}
        searchText={(b) => `${b.payment?.reference ?? ''} ${b.targetName} ${b.customerName} ${b.payment?.senderName ?? ''}`}
        searchPlaceholder="Search payments"
        filters={
          <FilterTabs
            label="Payment status"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: rows.length },
              { value: 'pending', label: 'Pending', count: n('pending') },
              { value: 'partial', label: 'Partially paid', count: n('partial') },
              { value: 'approved', label: 'Approved', count: n('approved') },
              { value: 'refund_requested', label: 'Refund requested', count: n('refund_requested') },
              { value: 'refunded', label: 'Refunded', count: n('refunded') },
            ]}
          />
        }
        rowActions={(b) => (
          <div className="flex items-center justify-end gap-2">
            <PaymentViewLink to={`${base}/payments/${b.id}`} />
          </div>
        )}
        emptyTitle="No payments yet"
        emptyMessage="When a traveller sends proof of an outside transfer, it appears here."
      />
    </>
  );
}
