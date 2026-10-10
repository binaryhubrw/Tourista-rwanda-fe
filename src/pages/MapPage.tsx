import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Crosshair, List, Map as MapIcon, Search, X } from 'lucide-react';
import { getBusinesses } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { RwandaMap, MapLegend, kindStyle, type MapPoint, type MapPointKind } from '@/components/map/RwandaMap';
import { Badge, Button, ButtonLink, EmptyState, ErrorState, LoadingSpinner, Rating, SmartImage, fieldClass } from '@/components/ui';
import { useToast } from '@/context/ToastContext';
import { distanceKm, KIGALI } from '@/utils/geo';
import type { Coordinates } from '@/types';
import { cn } from '@/utils/cn';

interface Place extends MapPoint {
  image: string;
  rating: number;
  category: string;
  subtitle: string;
  href: string;
}

const kinds: MapPointKind[] = ['accommodation', 'restaurant', 'business', 'guide'];

export default function MapPage() {
  useDocumentTitle('Map');
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(async () => {
    const businesses = await getBusinesses();
    const places: Place[] = businesses.map((b) => ({
      id: b.id, name: b.name, coordinates: b.coordinates,
      kind: b.category === 'Accommodation' ? 'accommodation' : b.category === 'Restaurants' ? 'restaurant' : b.category === 'Tour Guides' ? 'guide' : 'business',
      image: b.image, rating: b.rating, category: b.category, subtitle: b.district, href: `/businesses/${b.id}`,
    }));
    return places;
  });

  const [active, setActive] = useState<Set<MapPointKind>>(new Set(kinds));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [origin, setOrigin] = useState<{ pos: Coordinates; label: string }>({ pos: KIGALI, label: 'Kigali city centre' });
  const [userPos, setUserPos] = useState<Coordinates | null>(null);
  const [locating, setLocating] = useState(false);
  const [mobileView, setMobileView] = useState<'map' | 'list'>('map');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data ?? [])
      .filter((p) => active.has(p.kind) && (!q || `${p.name} ${p.subtitle} ${p.category}`.toLowerCase().includes(q)))
      .map((p) => ({ ...p, km: distanceKm(origin.pos, p.coordinates) }))
      .sort((a, b) => a.km - b.km);
  }, [data, active, query, origin]);

  const selected = visible.find((p) => p.id === selectedId) ?? null;

  const toggleKind = (k: MapPointKind) => {
    setActive((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k); else next.add(k);
      return next;
    });
  };

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

  if (loading) return <LoadingSpinner label="Loading the map" />;
  if (error) return <div className="p-8"><ErrorState message={error} onRetry={reload} /></div>;

  const list = (
    <ul className="divide-y divide-slate-100">
      {visible.map((p) => (
        <li key={p.id}>
          <button onClick={() => select(p.id)} aria-current={p.id === selectedId} className={cn('flex w-full items-center gap-3 px-4 py-3 text-left', p.id === selectedId ? 'bg-brand-50' : 'hover:bg-slate-50')}>
            <SmartImage src={p.image} alt="" className="h-14 w-14 shrink-0 rounded-xl" />
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full border" style={{ background: kindStyle[p.kind].fill, borderColor: kindStyle[p.kind].stroke === '#ffffff' ? kindStyle[p.kind].fill : kindStyle[p.kind].stroke }} aria-hidden />
                <span className="truncate font-semibold text-ink">{p.name}</span>
              </span>
              <span className="block truncate text-sm text-slate-500">{p.category}, {p.subtitle}</span>
            </span>
            <span className="shrink-0 text-right text-sm"><span className="block font-semibold text-ink">{Math.round(p.km)} km</span><Rating value={p.rating} className="text-xs" /></span>
          </button>
        </li>
      ))}
    </ul>
  );

  return (
    <div className="flex flex-col lg:h-[calc(100vh-72px)] lg:flex-row">
      {/* Sidebar */}
      <aside className="flex flex-col border-slate-200 lg:w-[400px] lg:shrink-0 lg:border-r">
        <div className="space-y-3 border-b border-slate-200 p-4">
          <h1 className="font-display text-2xl font-bold text-ink">Map of Rwanda</h1>
          <label className="relative block">
            <span className="sr-only">Filter listings on the map</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" aria-hidden />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter by name or district" className={`${fieldClass} h-10 rounded-full pl-9 text-sm`} />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show on map">
            {kinds.map((k) => (
              <button key={k} onClick={() => toggleKind(k)} aria-pressed={active.has(k)} className={cn('rounded-full border px-3 py-1 text-xs font-semibold', active.has(k) ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-600')}>
                {kindStyle[k].label}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2 text-sm text-slate-600">
            <span>{visible.length} listings, nearest to {origin.label}</span>
            <Button size="sm" variant="ghost" onClick={locate} loading={locating}><Crosshair className="h-4 w-4" aria-hidden />Near me</Button>
          </div>
          <div className="grid grid-cols-2 gap-1 rounded-full bg-slate-100 p-1 lg:hidden" role="tablist" aria-label="View">
            <button role="tab" aria-selected={mobileView === 'map'} onClick={() => setMobileView('map')} className={cn('flex h-9 items-center justify-center gap-1.5 rounded-full text-sm font-semibold', mobileView === 'map' && 'bg-white shadow-sm text-brand-600')}><MapIcon className="h-4 w-4" />Map</button>
            <button role="tab" aria-selected={mobileView === 'list'} onClick={() => setMobileView('list')} className={cn('flex h-9 items-center justify-center gap-1.5 rounded-full text-sm font-semibold', mobileView === 'list' && 'bg-white shadow-sm text-brand-600')}><List className="h-4 w-4" />List</button>
          </div>
        </div>
        <div className={cn('flex-1 overflow-y-auto', mobileView === 'map' && 'hidden lg:block')}>
          {visible.length ? list : <div className="p-4"><EmptyState title="No listings to show" message="Turn on more categories or clear the name filter." /></div>}
        </div>
      </aside>

      {/* Map */}
      <section className={cn('relative flex-1 p-4 lg:p-6', mobileView === 'list' && 'hidden lg:block')} aria-label="Map">
        <RwandaMap points={visible} selectedId={selectedId} onSelect={setSelectedId} userPosition={userPos} className="aspect-[1000/884] w-full lg:aspect-auto lg:h-full" />
        <div className="mt-3 lg:absolute lg:bottom-9 lg:left-9 lg:mt-0 lg:rounded-2xl lg:bg-white/90 lg:p-3 lg:backdrop-blur"><MapLegend kinds={kinds} /></div>

        {selected && (
          <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lift lg:absolute lg:left-9 lg:top-9 lg:mt-0 lg:w-80">
            <div className="relative">
              <SmartImage src={selected.image} alt={selected.name} className="aspect-[16/9] w-full" />
              <button onClick={() => setSelectedId(null)} className="absolute right-2 top-2 grid h-8 w-8 place-items-center rounded-full bg-white/95" aria-label="Close details"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-4">
              <Badge>{selected.category}</Badge>
              <h2 className="mt-2 font-display text-xl font-bold text-ink">{selected.name}</h2>
              <p className="text-sm text-slate-500">{selected.subtitle}</p>
              <div className="mt-2 flex items-center justify-between text-sm">
                <Rating value={selected.rating} />
                <span className="font-semibold text-ink">{Math.round(selected.km)} km from {origin.label}</span>
              </div>
              <ButtonLink to={selected.href} size="sm" className="mt-4 w-full">Open listing</ButtonLink>
            </div>
          </div>
        )}
        <p className="mt-4 text-xs text-slate-500 lg:hidden">
          Tap a marker or <Link to="#" onClick={(e) => { e.preventDefault(); setMobileView('list'); }} className="font-semibold text-brand-600">browse the list</Link>.
        </p>
      </section>
    </div>
  );
}
