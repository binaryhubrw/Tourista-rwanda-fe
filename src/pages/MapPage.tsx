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
import type { Business, Coordinates, Location, LocationCategory } from '@/types';
import { cn } from '@/utils/cn';

const NEAR_KM = 20;

const kindFor = (category: LocationCategory): MapPoint['kind'] =>
  category === 'Cultural Site' ? 'cultural' : 'attraction';

const districtTokens = (value: string) =>
  value.toLowerCase().split(/[,&/]+/).map((t) => t.trim()).filter(Boolean);

function sameDistrict(a: string, b: string) {
  const other = new Set(districtTokens(b));
  return districtTokens(a).some((token) => other.has(token));
}

function atOrNear(business: Business, place: Location) {
  if (business.locationId === place.id) return true;
  if (sameDistrict(business.district, place.district)) return true;
  return distanceKm(business.coordinates, place.coordinates) < NEAR_KM;
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
  const [category, setCategory] = useState<'all' | LocationCategory>('all');
  const [origin, setOrigin] = useState<{ pos: Coordinates; label: string }>({ pos: KIGALI, label: 'Kigali city centre' });
  const [userPos, setUserPos] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');

  const all = data?.locations ?? [];
  const categories = [...new Set(all.map((l) => l.category))].sort();

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all
      .filter((l) => category === 'all' || l.category === category)
      .filter((l) => !q || `${l.name} ${l.district} ${l.province}`.toLowerCase().includes(q))
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [all, query, category]);

  const points = useMemo(
    () => visible.map((l): MapPoint => ({ id: l.id, name: l.name, coordinates: l.coordinates, kind: kindFor(l.category) })),
    [visible],
  );

  const selected = all.find((l) => l.id === selectedId) ?? null;

  const nearby = useMemo(() => {
    if (!selected || !data) return [];
    return data.businesses
      .filter((b) => atOrNear(b, selected))
      .map((b) => ({ business: b, km: distanceKm(selected.coordinates, b.coordinates), here: b.locationId === selected.id }))
      .sort((a, b) => (Number(b.here) - Number(a.here)) || a.km - b.km);
  }, [selected, data]);

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

  return (
    <div className="flex flex-col lg:h-[calc(100vh-72px)] lg:flex-row">
      <aside className="flex flex-col border-slate-200 lg:w-[400px] lg:shrink-0 lg:border-r">
        <div className="space-y-3 border-b border-slate-200 p-4">
          <h1 className="font-display text-2xl font-bold text-ink">Map of Rwanda</h1>
          <label className="relative block">
            <span className="sr-only">Search locations</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search locations" className={`${fieldClass} h-10 rounded-full pl-9 text-sm`} />
          </label>
          <Select
            aria-label="Filter by category"
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            options={[{ value: 'all', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
            className="h-10 py-0 text-sm"
          />
          <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
            <span>{visible.length} locations{origin.label === 'your location' ? `, from ${origin.label}` : ''}</span>
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
              {visible.map((l) => (
                <li key={l.id}>
                  <button onClick={() => select(l.id)} aria-current={l.id === selectedId ? 'true' : undefined} className={cn('flex w-full items-start gap-3 px-4 py-3 text-left', l.id === selectedId ? 'bg-brand-50' : 'hover:bg-slate-50')}>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-ink">{l.name}</span>
                      <span className="mt-0.5 block text-sm text-slate-500">{l.district}</span>
                      <span className="block text-sm text-slate-500">{l.province}</span>
                      <span className="mt-1.5 inline-flex"><Badge tone={l.isHiddenGem ? 'solid' : 'brand'}>{l.category}</Badge></span>
                    </span>
                    <span className="shrink-0 tabular-nums text-sm text-slate-600">{l.rating ? l.rating.toFixed(1) : 'New'}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4"><EmptyState title="No locations" message="Clear the search or category filter." /></div>
          )}
        </div>
      </aside>

      <section className={cn('relative flex-1 p-4 lg:p-6', mobileView === 'list' && 'hidden lg:block')} aria-label="Map">
        <RwandaMap points={points} selectedId={selectedId} onSelect={select} userPosition={userPos} markers="names" className="aspect-[1000/884] w-full lg:aspect-auto lg:h-full" />

        {selected && (
          <div className="mt-4 flex max-h-[min(70vh,32rem)] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lift lg:absolute lg:left-9 lg:top-9 lg:mt-0 lg:w-[22rem]">
            <div className="relative shrink-0">
              <SmartImage src={selected.image} alt={selected.name} className="aspect-[16/9] w-full" />
              <button onClick={() => setSelectedId(null)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/95" aria-label="Close details"><X className="h-4 w-4" /></button>
            </div>
            <div className="shrink-0 border-b border-slate-100 px-4 py-3">
              <Badge tone={selected.isHiddenGem ? 'solid' : 'brand'}>{selected.category}</Badge>
              <h2 className="mt-1 font-display text-xl font-bold text-ink">{selected.name}</h2>
              <p className="text-sm text-slate-500">{selected.district}</p>
              <p className="text-sm text-slate-500">{selected.province}</p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {nearby.length ? `${nearby.length} ${nearby.length === 1 ? 'business' : 'businesses'} here` : 'No businesses here yet'}
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              {nearby.length ? (
                <ul className="divide-y divide-slate-100">
                  {nearby.map(({ business: b, km, here }) => (
                    <li key={b.id}>
                      <Link to={`/businesses/${b.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50">
                        <SmartImage src={b.image} alt="" className="h-14 w-14 shrink-0 rounded-xl" />
                        <span className="min-w-0 flex-1">
                          <span className="truncate font-semibold text-ink">{b.name}</span>
                          <span className="block truncate text-sm text-slate-500">{listingKindOf(b)}, {b.district}</span>
                        </span>
                        <span className="shrink-0 text-right text-sm text-slate-600">
                          <span className="block font-semibold text-ink">{here && km < 1 ? 'Here' : `${km < 1 ? '<1' : Math.round(km)} km`}</span>
                          <Rating value={b.rating} className="text-xs" />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-4 py-6 text-sm text-slate-500">Nothing is listed at this place yet.</p>
              )}
            </div>
            <div className="shrink-0 border-t border-slate-100 p-3">
              <ButtonLink to={`/explore?location=${encodeURIComponent(selected.id)}#explore-listings`} size="sm" className="w-full">Explore this place</ButtonLink>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500 lg:hidden">
          Tap a location name to see businesses, or <Link to="#" onClick={(e) => { e.preventDefault(); setMobileView('list'); }} className="font-semibold text-brand-600">browse the list</Link>.
        </p>
      </section>
    </div>
  );
}
