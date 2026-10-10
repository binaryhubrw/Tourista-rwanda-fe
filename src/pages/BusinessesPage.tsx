import { useMemo, useState } from 'react';
import { Search, Store } from 'lucide-react';
import { getBookings, getBusinesses } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { BusinessCard, ServiceCard } from '@/components/cards';
import { Pagination } from '@/components/dashboard';
import { ButtonLink, Container, EmptyState, ErrorState, Loading, PageHeader, fieldClass } from '@/components/ui';
import type { SustainabilityBadge } from '@/types';
import { availableServices, hasAvailability } from '@/utils/availability';
import { listingKindOf } from '@/utils/catalog';
import { cn } from '@/utils/cn';

const kinds = ['All', 'Hotel', 'Lodge', 'Guesthouse', 'House', 'Apartment', 'Restaurant', 'Bar', 'Coffee shop', 'Tour guide', 'Transportation', 'Handcraft', 'Local product', 'Community tourism', 'Wellness', 'Massage', 'Gym', 'Sauna', 'Spa', 'Yoga'];
const badges: SustainabilityBadge[] = ['Women-led', 'Community-owned', 'Eco-certified', 'Solar-powered', 'Plastic-free'];
const pageSize = 9;

type CardItem =
  | { key: string; kind: string; text: string; badges: SustainabilityBadge[]; listing: true; businessId: string }
  | { key: string; kind: string; text: string; badges: SustainabilityBadge[]; listing: false; businessId: string; serviceId: string };

export default function BusinessesPage() {
  useDocumentTitle('Listings & services');
  const { data, loading, error, reload } = useAsync(async () => {
    const [businesses, bookings] = await Promise.all([getBusinesses(), getBookings()]);
    return { businesses, bookings };
  });
  const [kind, setKind] = useState<(typeof kinds)[number]>('All');
  const [badge, setBadge] = useState<SustainabilityBadge | ''>('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const items = useMemo(() => {
    const businesses = (data?.businesses ?? []).filter((business) => hasAvailability(business, data?.bookings ?? []));
    const cards: CardItem[] = [];
    for (const business of businesses) {
      const label = listingKindOf(business);
      cards.push({
        key: `b-${business.id}`, kind: label, listing: true, businessId: business.id, badges: business.badges,
        text: `${business.name} ${business.ownerName} ${business.district} ${business.description} ${label}`,
      });
      for (const service of availableServices(business.services, data?.bookings ?? [])) {
        cards.push({
          key: `s-${service.id}`, kind: service.category ?? service.name, listing: false, businessId: business.id, serviceId: service.id, badges: business.badges,
          text: `${service.name} ${service.description} ${service.category ?? ''} ${business.name} ${business.district} ${label}`,
        });
      }
    }
    return cards;
  }, [data]);

  const list = useMemo(() => {
    const t = q.trim().toLowerCase();
    return items.filter((item) => (kind === 'All' || item.kind === kind) && (!badge || item.badges.includes(badge)) && (!t || item.text.toLowerCase().includes(t)));
  }, [items, kind, badge, q]);

  const pageCount = Math.max(1, Math.ceil(list.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visible = list.slice((safePage - 1) * pageSize, safePage * pageSize);
  const byId = new Map((data?.businesses ?? []).map((business) => [business.id, business]));

  return (
    <>
      <PageHeader title="Listings and services" intro="Hotels, lodges, guesthouses, guides, meals and services such as massage, gym and sauna. Everything shows a price and a description. Places that are fully booked today are hidden.">
        <ButtonLink to="/register?role=business_owner" variant="light"><Store className="h-4 w-4" aria-hidden />List your business</ButtonLink>
      </PageHeader>
      <Container className="py-8 lg:py-10">
        <div className="mb-5 grid gap-3 md:grid-cols-[1fr_auto]">
          <label className="relative">
            <span className="sr-only">Search listings and services</span>
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-brand-600" aria-hidden />
            <input value={q} onChange={(e) => { setPage(1); setQ(e.target.value); }} placeholder="Search by name, service or district" className={`${fieldClass} h-12 rounded-full pl-11`} />
          </label>
          <label>
            <span className="sr-only">Sustainability</span>
            <select value={badge} onChange={(e) => { setPage(1); setBadge(e.target.value as SustainabilityBadge | ''); }} className={`${fieldClass} h-12 rounded-full font-semibold md:w-56`}>
              <option value="">Any sustainability badge</option>
              {badges.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </label>
        </div>
        <div role="tablist" aria-label="Listing kind" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          {kinds.map((c) => (
            <button key={c} role="tab" aria-selected={kind === c} onClick={() => { setPage(1); setKind(c); }} className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-semibold', kind === c ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700 hover:border-brand-400')}>{c}</button>
          ))}
        </div>
        {loading ? <Loading variant="section" label="Loading businesses" /> : error ? <ErrorState message={error} onRetry={reload} /> : list.length === 0 ? (
          <EmptyState title="Nothing is available" message="Try another kind, or check back when a booked room or service is free again." />
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-600" aria-live="polite">{list.length} available</p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((item) => {
                const business = byId.get(item.businessId);
                if (!business) return null;
                if (item.listing) return <BusinessCard key={item.key} business={{ ...business, services: availableServices(business.services, data?.bookings ?? []) }} />;
                const service = business.services.find((entry) => entry.id === item.serviceId);
                return service ? <ServiceCard key={item.key} service={service} business={business} /> : null;
              })}
            </div>
            {pageCount > 1 && (
              <Pagination className="mt-6 rounded-2xl border border-slate-200 bg-white px-2" page={safePage} pageCount={pageCount} pageSize={pageSize} total={list.length} onPageChange={setPage} showPageSize={false} />
            )}
          </>
        )}
      </Container>
    </>
  );
}
