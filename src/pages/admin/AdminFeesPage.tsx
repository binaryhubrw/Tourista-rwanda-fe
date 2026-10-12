import { ArrowDownLeft, ArrowUpRight, CalendarCheck, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { FeeWalletEntry } from '@/types';
import { getFeeLedger } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useAuth } from '@/context/AuthContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { DataTable, PageHeader, StatCard, StatGrid, type Column } from '@/components/dashboard';
import { ErrorState, Loading } from '@/components/ui';
import { formatDate, formatRwf } from '@/utils/format';
import { formatPayAccount } from '@/utils/payment';
import { cn } from '@/utils/cn';

export default function AdminFeesPage() {
  useDocumentTitle('Wallet');
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(getFeeLedger);
  const cardNumber = user?.bankAccount ? formatPayAccount('card', user.bankAccount) : '';
  const entries = data?.wallet ?? [];
  const incoming = data?.totals.earnedRwf ?? 0;
  const outgoing = data?.totals.reversedRwf ?? 0;
  const available = data?.totals.balanceRwf ?? 0;
  const rate = data?.rate ?? 0.1;
  const monthKey = new Date().toISOString().slice(0, 7);
  const thisMonth = entries.filter((e) => e.kind === 'in' && e.at.startsWith(monthKey)).reduce((s, e) => s + e.amount, 0);
  const columns: Column<FeeWalletEntry>[] = [
    {
      id: 'title', header: 'Activity', sortValue: (e) => e.title,
      cell: (e) => (
        <Link to={`/admin/payments/${e.bookingId}`} className="flex items-center gap-3">
          <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-full', e.kind === 'in' ? 'bg-teal-50 text-teal-700' : 'bg-red-50 text-red-600')}>
            {e.kind === 'in' ? <ArrowDownLeft className="h-4 w-4" aria-hidden /> : <ArrowUpRight className="h-4 w-4" aria-hidden />}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-semibold text-ink">{e.title}</span>
            <span className="block truncate text-xs text-slate-500">{e.subtitle}</span>
          </span>
        </Link>
      ),
    },
    { id: 'when', header: 'Date', sortValue: (e) => e.at, cell: (e) => <span className="whitespace-nowrap text-slate-500">{formatDate(e.at)}</span> },
    {
      id: 'amount', header: 'Amount', align: 'right', sortValue: (e) => e.amount,
      cell: (e) => (
        <span className={cn('font-semibold tabular-nums', e.kind === 'in' ? 'text-teal-700' : 'text-red-600')}>
          {e.kind === 'in' ? '+' : '−'}{formatRwf(e.amount)}
        </span>
      ),
    },
  ];

  if (error) return <ErrorState message={error} onRetry={reload} />;
  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title="Wallet" intro={`${Math.round(rate * 100)}% of each confirmed booking is reserved for Tourista. Refunds reverse that fee.`} />

      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-800 via-brand-600 to-[#0f766e] p-6 text-white shadow-lift sm:p-8">
        <div className="absolute -right-8 -top-10 h-40 w-40 rounded-full bg-white/10" aria-hidden />
        <div className="absolute -bottom-12 left-1/3 h-36 w-36 rounded-full bg-black/10" aria-hidden />
        <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Wallet className="h-7 w-7 text-white/80" aria-hidden />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Tourista Rwanda</p>
                <p className="text-sm font-medium text-white/80">Platform wallet</p>
              </div>
            </div>
            <p className="mt-8 text-sm text-white/70">Available balance</p>
            <p className="mt-1 font-display text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">{formatRwf(available)}</p>
            <p className="mt-6 font-mono text-lg tracking-[0.18em] sm:text-xl">{cardNumber || 'No card on file'}</p>
            {user?.name && <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">{user.name}</p>}
          </div>
          <div className="flex gap-8 text-sm">
            <div>
              <p className="text-white/60">Card</p>
              <p className="font-mono tracking-wide">{cardNumber || '—'}</p>
            </div>
            <div>
              <p className="text-white/60">Rate</p>
              <p className="font-semibold">{Math.round(rate * 100)}% fee</p>
            </div>
          </div>
        </div>
      </div>

      <StatGrid className="mt-6">
        <StatCard label="Available" icon={Wallet} value={formatRwf(available)} hint="Fees in, minus refund reversals" />
        <StatCard label="Fees in" icon={ArrowDownLeft} tone="teal" value={formatRwf(incoming)} hint={`This month ${formatRwf(thisMonth)}`} />
        <StatCard label="Refund reversals" icon={ArrowUpRight} tone="amber" value={formatRwf(outgoing)} />
        <StatCard label="Bookings contributing" icon={CalendarCheck} tone="violet" value={entries.filter((e) => e.kind === 'in').length} hint={`${Math.round(rate * 100)}% of each confirmed total`} />
      </StatGrid>

      <DataTable
        className="mt-6"
        data={entries}
        columns={columns}
        getRowId={(e) => e.id}
        initialSort={{ id: 'when', desc: true }}
        searchText={(e) => `${e.title} ${e.subtitle} ${e.bookingId}`}
        searchPlaceholder="Search wallet activity"
        exportFileName="wallet"
        emptyTitle="No fees yet"
        emptyMessage="Fees land here when a host confirms a traveller’s transfer."
      />
    </>
  );
}
