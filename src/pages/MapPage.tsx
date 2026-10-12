import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, List, Map as MapIcon, Search, X } from 'lucide-react';
import { getBusinesses, getLocations } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { RwandaMap, type MapPoint } from '@/components/map/RwandaMap';
import { Badge, Button, ButtonLink, EmptyState, ErrorState, Loading, Rating, Select, SmartImage, fieldClass } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { distanceKm, KIGALI } from '@/utils/geo';
import { listingKindOf } from '@/utils/catalog';
import { formatRwf } from '@/utils/format';
import { fromPrice } from '@/utils/pricing';
import type { Business, Coordinates, Location } from '@/types';
import { cn } from '@/utils/cn';

const districtTokens = (value: string) =>
  value.toLowerCase().split(/[,&/]+/).map((t) => t.trim()).filter(Boolean);

function sameDistrict(a: string, b: string) {
  const other = new Set(districtTokens(b));
  return districtTokens(a).some((token) => other.has(token));
}

function centroid(coords: Coordinates[]): Coordinates {
  return {
    lat: coords.reduce((sum, c) => sum + c.lat, 0) / coords.length,
    lng: coords.reduce((sum, c) => sum + c.lng, 0) / coords.length,
  };
}

interface DistrictPlace {
  id: string;
  name: string;
  province: string;
  coordinates: Coordinates;
  listings: Business[];
  image: string;
}

function districtsFromBusinesses(businesses: Business[], locations: Location[]): DistrictPlace[] {
  const groups = new Map<string, Business[]>();
  businesses.forEach((listing) => {
    const name = listing.district.trim();
    if (!name) return;
    const group = groups.get(name) ?? [];
    group.push(listing);
    groups.set(name, group);
  });
  return [...groups.entries()]
    .map(([name, listings]) => {
      const place = locations.find((location) => sameDistrict(location.district, name));
      const coords = listings.map((listing) => listing.coordinates).filter((c) => Number.isFinite(c?.lat) && Number.isFinite(c?.lng));
      return {
        id: `district:${name.toLowerCase()}`,
        name,
        province: place?.province ?? '',
        coordinates: coords.length ? centroid(coords) : place?.coordinates ?? KIGALI,
        listings,
        image: listings[0]?.image || place?.image || '',
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export default function MapPage() {
  useDocumentTitle('Map');
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const [locations, businesses] = await Promise.all([getLocations(), getBusinesses()]);
    return { locations, businesses };
  });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [province, setProvince] = useState('all');
  const [origin, setOrigin] = useState<{ pos: Coordinates; label: string }>({ pos: KIGALI, label: 'Kigali city centre' });
  const [userPos, setUserPos] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');

  const districts = useMemo(
    () => districtsFromBusinesses(data?.businesses ?? [], data?.locations ?? []),
    [data],
  );
  const provinces = [...new Set(districts.map((d) => d.province).filter(Boolean))].sort();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return districts
      .filter((d) => province === 'all' || d.province === province)
      .filter((d) => !q || `${d.name} ${d.province}`.toLowerCase().includes(q));
  }, [districts, query, province]);

  const points = useMemo(
    () => visible.map((d): MapPoint => ({ id: d.id, name: d.name, coordinates: d.coordinates, kind: 'business', count: d.listings.length })),
    [visible],
  );

  const selected = districts.find((d) => d.id === selectedId) ?? null;

  const nearby = useMemo(() => {
    if (!selected) return [];
    return [...selected.listings]
      .map((b) => ({ business: b, km: distanceKm(origin.pos, b.coordinates) }))
      .sort((a, b) => a.km - b.km);
  }, [selected, origin]);

  const locate = () => {
    if (!navigator.geolocation) return toast.error('Your browser does not share location. Distances are from Kigali.');
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        const pos = { lat: p.coords.latitude, lng: p.coords.longitude };
        setUserPos(pos);
        setOrigin({ pos, label: 'your location' });
        setLocating(false);
        toast.success('Distances now measured from your location.');
      },
      () => {
        setLocating(false);
        toast.error('Location access was blocked. Distances are measured from Kigali.');
      },
      { timeout: 8000 },
    );
  };

  const select = (id: string) => {
    setSelectedId(id);
    setMobileView('map');
  };

  if (loading) return <Loading label="Loading the map" />;
  if (error) return <div className="p-8"><ErrorState message={error} onRetry={reload} /></div>;

  const exploreTo = selected?.listings[0]?.locationId
    ? `/explore?location=${encodeURIComponent(selected.listings[0].locationId)}#explore-listings`
    : `/search?q=${encodeURIComponent(selected?.name ?? '')}`;

  return (
    <div className="flex flex-col lg:h-[calc(100vh-72px)] lg:flex-row">
      <aside className="flex flex-col border-slate-200 lg:w-[400px] lg:shrink-0 lg:border-r">
        <div className="space-y-3 border-b border-slate-200 p-4">
          <h1 className="font-display text-2xl font-bold text-ink">Map of Rwanda</h1>
          <label className="relative block">
            <span className="sr-only">Search districts</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search districts" className={`${fieldClass} h-10 rounded-full pl-9 text-sm`} />
          </label>
          {provinces.length > 0 && (
            <Select
              aria-label="Filter by province"
              value={province}
              onChange={(e) => setProvince(e.target.value)}
              options={[{ value: 'all', label: 'All provinces' }, ...provinces.map((p) => ({ value: p, label: p }))]}
              className="h-10 py-0 text-sm"
            />
          )}
          <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
            <span>{visible.length} district{visible.length === 1 ? '' : 's'}{origin.label === 'your location' ? `, from ${origin.label}` : ''}</span>
            <Button size="sm" variant="ghost" onClick={locate} loading={locating}><Crosshair className="h-4 w-4" aria-hidden />Near me</Button>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1 lg:hidden" role="tablist" aria-label="View">
            <button role="tab" aria-selected={mobileView === 'map'} onClick={() => setMobileView('map')} className={cn('flex h-9 items-center justify-center gap-1.5 rounded-full text-sm font-semibold', mobileView === 'map' && 'bg-white shadow-sm text-brand-600')}><MapIcon className="h-4 w-4" />Map</button>
            <button role="tab" aria-selected={mobileView === 'list'} onClick={() => setMobileView('list')} className={cn('flex h-9 items-center justify-center gap-1.5 rounded-full text-sm font-semibold', mobileView === 'list' && 'bg-white shadow-sm text-brand-600')}><List className="h-4 w-4" />List</button>
          </div>
        </div>
        <div className={cn('flex-1 overflow-y-auto', mobileView === 'map' && 'hidden lg:block')}>
          {visible.length ? (
            <ul className="divide-y divide-slate-100">
              {visible.map((d) => (
                <li key={d.id}>
                  <button onClick={() => select(d.id)} aria-current={d.id === selectedId ? 'true' : undefined} className={cn('flex w-full items-start gap-3 px-4 py-3 text-left', d.id === selectedId ? 'bg-brand-50' : 'hover:bg-slate-50')}>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{d.name}</span>
                      {d.province && <span className="mt-0.5 block text-sm text-slate-500">{d.province}</span>}
                      <span className="mt-1.5 inline-flex"><Badge tone="brand">{d.listings.length} {d.listings.length === 1 ? 'listing' : 'listings'}</Badge></span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4"><EmptyState title="No districts" message="Clear the search or province filter." /></div>
          )}
        </div>
      </aside>

      <section className={cn('relative flex-1 p-4 lg:p-6', mobileView === 'list' && 'hidden lg:block')} aria-label="Map">
        <RwandaMap points={points} selectedId={selectedId} onSelect={select} userPosition={userPos} markers="names" className="aspect-[1000/884] w-full lg:aspect-auto lg:h-full" />

        {selected && (
          <div className="absolute inset-x-4 top-4 z-10 flex max-h-[min(70vh,42rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lift lg:inset-x-auto lg:left-9 lg:top-9 lg:w-[26rem]">
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{selected.province || 'District'}</p>
                <h2 className="font-display text-xl font-bold text-ink">{selected.name}</h2>
                <p className="mt-0.5 text-sm font-semibold text-ink">
                  {nearby.length} {nearby.length === 1 ? 'business' : 'businesses'}
                </p>
              </div>
              <button onClick={() => setSelectedId(null)} className="grid h-8 w-8 shrink-0 place-items-center rounded-full hover:bg-slate-100" aria-label="Close details"><X className="h-4 w-4" /></button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {nearby.length ? (
                <ul className="divide-y divide-slate-100">
                  {nearby.map(({ business: b, km }) => {
                    const from = fromPrice(b);
                    return (
                      <li key={b.id}>
                        <Link to={`/businesses/${b.id}`} className="flex gap-3 px-4 py-3.5 hover:bg-slate-50">
                          <SmartImage src={b.image} alt="" className="h-[4.5rem] w-[5.5rem] shrink-0 rounded-2xl" />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span className="font-display text-base font-bold leading-snug text-ink">{b.name}</span>
                              <Rating value={b.rating} className="shrink-0 text-sm" />
                            </span>
                            <span className="mt-0.5 block text-sm text-slate-500">{listingKindOf(b)}</span>
                            <span className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                              {from ? (
                                <span className="text-sm text-slate-600">From <span className="font-display font-bold tabular-nums text-ink">{formatRwf(from.priceRwf)}</span></span>
                              ) : <span />}
                              <span className="text-sm font-semibold tabular-nums text-slate-600">{km < 1 ? '<1' : Math.round(km)} km</span>
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="px-4 py-6 text-sm text-slate-500">Nothing is listed in this district yet.</p>
              )}
            </div>
            <div className="shrink-0 border-t border-slate-100 p-3">
              <ButtonLink to={exploreTo} size="sm" className="w-full">Explore this district</ButtonLink>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500 lg:hidden">
          Tap a district name to see listings, or <Link to="#" onClick={(e) => { e.preventDefault(); setMobileView('list'); }} className="font-semibold text-brand-600">browse the list</Link>.
        </p>
      </section>
    </div>
  );
}
