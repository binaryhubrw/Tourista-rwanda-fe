import { Link, useParams } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { getBookings, getBusinessesByOwner, getUserById } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Avatar, Badge, ErrorState, Loading } from '@/components/ui';
import { DataTable, PageHeader, roleLabel, type Column } from '@/components/dashboard';
import { ListingViewLink, bookingColumns, bookingSearchText } from '../shared/tableColumns';
import type { Business } from '@/types';
import { formatDate, formatRwf } from '@/utils/format';
import { fromPrice } from '@/utils/pricing';
import { listingKindOf } from '@/utils/catalog';

const roleTone = { tourist: 'brand', business_owner: 'warning', admin: 'solid' } as const;

const businessColumns: Column<Business>[] = [
  { id: 'name', header: 'Listing', sortValue: (b) => b.name, cell: (b) => <Link to={`/admin/businesses/${b.id}`} className="font-semibold text-ink hover:text-brand-700 hover:underline">{b.name}</Link> },
  { id: 'kind', header: 'Kind', sortValue: (b) => listingKindOf(b), cell: (b) => listingKindOf(b) },
  { id: 'district', header: 'District', sortValue: (b) => b.district, cell: (b) => b.district },
  { id: 'from', header: 'From', align: 'right', sortValue: (b) => fromPrice(b)?.priceRwf ?? 0, cell: (b) => { const price = fromPrice(b); return price ? formatRwf(price.priceRwf) : '—'; } },
];

export default function AdminUserDetailsPage() {
  const { id = '' } = useParams();
  const { data, loading, error, reload } = useAsync(async () => {
    const user = await getUserById(id);
    const [bookings, businesses] = await Promise.all([
      getBookings({ userId: user.id }),
      user.role === 'business_owner' ? getBusinessesByOwner(user.id) : Promise.resolve([]),
    ]);
    return { user, bookings, businesses };
  }, [id]);
  useDocumentTitle(data ? data.user.name : 'User');

  if (loading) return <Loading label="Loading user" />;
  if (error || !data) return <ErrorState message={error ?? 'User was not found.'} onRetry={reload} />;

  const { user, bookings, businesses } = data;
  const columns = bookingColumns(['target', 'date', 'total', 'status', 'payment'], { detailsBase: '/admin/bookings' });

  return (
    <>
      <Link to="/admin/users" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden />All users</Link>
      <PageHeader title={user.name} intro={user.email} action={<Badge tone={roleTone[user.role]}>{roleLabel[user.role]}</Badge>} />

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <Avatar name={user.name} src={user.avatar} size={64} />
          <div>
            <p className="font-display text-2xl font-bold text-ink">{user.name}</p>
            <p className="text-slate-500">Joined {formatDate(user.joinedAt)}</p>
          </div>
        </div>
        <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Email', user.email],
            ['Phone', user.phone || '—'],
            ['Country', user.country || '—'],
            ['Bookings', String(bookings.length)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl bg-brand-50 px-4 py-3">
              <dt className="text-slate-500">{label}</dt>
              <dd className="mt-1 font-semibold text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      {user.role === 'business_owner' && (
        <div className="mt-6">
          <h2 className="mb-3 font-display text-xl font-bold text-ink">Listings</h2>
          <DataTable data={businesses} columns={businessColumns} getRowId={(b) => b.id} searchText={(b) => `${b.name} ${b.district} ${listingKindOf(b)}`} searchPlaceholder="Search listings" emptyTitle="No listings" emptyMessage="This owner has not published a listing yet." rowActions={(b) => <ListingViewLink to={`/admin/businesses/${b.id}`} name={b.name} />} />
        </div>
      )}

      <div className="mt-6">
        <h2 className="mb-3 font-display text-xl font-bold text-ink">Bookings</h2>
        <DataTable
          data={bookings}
          columns={columns}
          getRowId={(b) => b.id}
          searchText={bookingSearchText}
          searchPlaceholder="Search bookings"
          initialSort={{ id: 'date', desc: true }}
          emptyTitle="No bookings"
          emptyMessage="This account has not booked anything yet."
        />
      </div>
    </>
  );
}
