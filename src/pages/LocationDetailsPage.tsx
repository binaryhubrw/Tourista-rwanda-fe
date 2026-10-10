import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Navigation, CalendarPlus, Ticket, Leaf, Check, PenLine, ChevronLeft } from 'lucide-react';
import { getBusinesses, getExperiences, getLocationById, getLocations } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { FavoriteButton, ExperienceCard, BusinessCard } from '@/components/cards';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { RwandaMap } from '@/components/map/RwandaMap';
import { Badge, ButtonLink, Container, ErrorState, Loading, Rating, SmartImage, buttonClass } from '@/components/ui';
import { distanceKm } from '@/utils/geo';
import { priceLabel } from '@/utils/format';
import NotFoundPage from './NotFoundPage';
import { cn } from '@/utils/cn';

export default function LocationDetailsPage() {
  const { id = '' } = useParams();
  const { data: location, loading, error, reload } = useAsync(() => getLocationById(id), [id]);
  const related = useAsync(async () => {
    const [locations, experiences, businesses] = await Promise.all([getLocations(), getExperiences(), getBusinesses()]);
    return { locations, experiences, businesses };
  }, [id]);
  const [activeImg, setActiveImg] = useState(0);
  useDocumentTitle(location?.name);

  const nearby = useMemo(() => {
    if (!location || !related.data) return [];
    return related.data.locations
      .filter((l) => l.id !== location.id)
      .map((l) => ({ l, km: distanceKm(location.coordinates, l.coordinates) }))
      .sort((a, b) => a.km - b.km)
      .slice(0, 4);
  }, [location, related.data]);

  if (loading) return <Loading label="Loading destination" />;
  if (error?.includes('not found')) return <NotFoundPage what="destination" />;
  if (error || !location) return <Container className="py-16"><ErrorState message={error ?? undefined} onRetry={reload} /></Container>;

  const href = `/destinations/${location.id}`;
  const gallery = location.gallery.length ? location.gallery : [location.image];
  const experiencesHere = related.data?.experiences.filter((e) => e.locationId === location.id) ?? [];
  const businessesHere = related.data?.businesses.filter((b) => b.locationId === location.id || distanceKm(b.coordinates, location.coordinates) < 15) ?? [];
  const mapPoints = [
    { id: location.id, name: location.name, coordinates: location.coordinates, kind: 'attraction' as const },
    ...nearby.map(({ l }) => ({ id: l.id, name: l.name, coordinates: l.coordinates, kind: (l.category === 'Cultural Site' ? 'cultural' : 'attraction') as 'cultural' | 'attraction' })),
  ];

  return (
    <article>
      <Container className="pt-6">
        <Link to="/destinations" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden />All destinations</Link>
      </Container>

      {/* Gallery */}
      <Container className="mt-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_200px]">
          <SmartImage src={gallery[activeImg]} alt={`${location.name}, photo ${activeImg + 1}`} className="aspect-[16/10] w-full rounded-3xl lg:aspect-[21/10]" />
          <div className="flex gap-3 overflow-x-auto lg:flex-col">
            {gallery.map((src, i) => (
              <button key={i} onClick={() => setActiveImg(i)} aria-label={`Show photo ${i + 1}`} aria-pressed={i === activeImg} className={cn('shrink-0 overflow-hidden rounded-2xl ring-offset-2', i === activeImg && 'ring-2 ring-brand-600')}>
                <SmartImage src={src} alt="" className="h-20 w-28 lg:h-[88px] lg:w-full" />
              </button>
            ))}
          </div>
        </div>
      </Container>

      <Container className="mt-8 grid gap-10 pb-16 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-10">
          <header>
            <div className="flex flex-wrap gap-2">
              <Badge tone="solid">{location.category}</Badge>
              {location.interests.map((i) => <Badge key={i}>{i}</Badge>)}
            </div>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink sm:text-5xl">{location.name}</h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-slate-600">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-brand-600" aria-hidden />{location.district}, {location.province}</span>
              <a href="#reviews"><Rating value={location.rating} count={location.reviewCount} /></a>
              <span>{priceLabel(location.priceLevel)}</span>
            </div>
          </header>

          <section aria-labelledby="about">
            <h2 id="about" className="font-display text-2xl font-bold text-ink">About {location.name}</h2>
            <p className="mt-3 max-w-prose text-lg leading-relaxed text-slate-700">{location.description}</p>
          </section>

          <section aria-labelledby="todo">
            <h2 id="todo" className="font-display text-2xl font-bold text-ink">Things to do</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {location.thingsToDo.map((t) => (
                <li key={t} className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4"><Check className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden /><span className="text-slate-700">{t}</span></li>
              ))}
            </ul>
          </section>

          <section aria-labelledby="sustain" className="rounded-3xl bg-brand-50 p-6">
            <h2 id="sustain" className="flex items-center gap-2 font-display text-2xl font-bold text-ink"><Leaf className="h-6 w-6 text-brand-600" aria-hidden />Visiting sustainably</h2>
            <ul className="mt-4 space-y-2">
              {location.sustainability.map((s) => <li key={s} className="flex gap-2 text-slate-700"><span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />{s}</li>)}
            </ul>
          </section>

          {experiencesHere.length > 0 && (
            <section aria-labelledby="exp-here">
              <h2 id="exp-here" className="font-display text-2xl font-bold text-ink">Experiences here</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">{experiencesHere.map((e) => <ExperienceCard key={e.id} experience={e} />)}</div>
            </section>
          )}

          {businessesHere.length > 0 && (
            <section aria-labelledby="biz-here">
              <h2 id="biz-here" className="font-display text-2xl font-bold text-ink">Local businesses nearby</h2>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">{businessesHere.slice(0, 4).map((b) => <BusinessCard key={b.id} business={b} />)}</div>
            </section>
          )}

          <ReviewsSection target={{ id: location.id, type: 'location', name: location.name }} />
        </div>

        {/* Action sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-3 rounded-3xl border border-slate-200 p-5">
            <FavoriteButton variant="full" className="w-full" item={{ itemId: location.id, itemType: 'location', title: location.name, subtitle: location.district, image: location.image, href }} />
            <ButtonLink to={`/itinerary?add=${location.id}`} variant="secondary" className="w-full"><CalendarPlus className="h-4 w-4" aria-hidden />Add to itinerary</ButtonLink>
            <a href="#reviews" className={buttonClass('ghost', 'md', 'w-full')}><PenLine className="h-4 w-4" aria-hidden />Write a review</a>
            <ButtonLink to={`/book/location/${location.id}`} className="w-full"><Ticket className="h-4 w-4" aria-hidden />Book now</ButtonLink>
          </div>

          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <RwandaMap points={mapPoints} selectedId={location.id} className="aspect-square rounded-none border-0" />
            <div className="space-y-1 p-5 text-sm">
              <p className="font-semibold text-ink">Coordinates</p>
              <p className="text-slate-600">Latitude {location.coordinates.lat.toFixed(4)}, longitude {location.coordinates.lng.toFixed(4)}</p>
              <a href={`https://www.google.com/maps/search/?api=1&query=${location.coordinates.lat},${location.coordinates.lng}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 pt-1 font-semibold text-brand-600 hover:underline">
                <Navigation className="h-4 w-4" aria-hidden />Get directions
              </a>
            </div>
          </div>

          {nearby.length > 0 && (
            <div className="rounded-3xl border border-slate-200 p-5">
              <h2 className="font-display text-lg font-bold text-ink">Nearby places</h2>
              <ul className="mt-3 divide-y divide-slate-100">
                {nearby.map(({ l, km }) => (
                  <li key={l.id}>
                    <Link to={`/destinations/${l.id}`} className="flex items-center gap-3 py-3 hover:text-brand-700">
                      <SmartImage src={l.image} alt="" className="h-12 w-12 shrink-0 rounded-xl" />
                      <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{l.name}</span><span className="text-sm text-slate-500">{Math.round(km)} km away</span></span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </Container>
    </article>
  );
}
