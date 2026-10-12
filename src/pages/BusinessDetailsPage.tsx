import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MapPin, Phone, Mail, Leaf, ChevronLeft, User, Users, BedDouble, DoorOpen, Check, Search } from 'lucide-react';
import { getAvailability, getBusinessById } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { FavoriteButton } from '@/components/cards';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { Badge, Button, Container, ErrorState, Loading, Rating, SmartImage, buttonClass } from '@/components/ui';
import { formatRwf, todayIso } from '@/utils/format';
import { addDaysIso, fromPrice, isRoom } from '@/utils/pricing';
import { remaining } from '@/utils/availability';
import { listingKindOf, vehicleCarry, vehiclePlates } from '@/utils/catalog';
import { cn } from '@/utils/cn';
import type { Accommodation, Restaurant, Service } from '@/types';
import NotFoundPage from './NotFoundPage';

const sections: { group: Service['group']; title: string; intro: string }[] = [
  { group: 'room', title: 'Rooms', intro: 'Prices are per room, per night. Tick one or more categories, then continue.' },
  { group: 'wellness', title: 'Wellness', intro: 'Massage, gym, sauna, spa and yoga. Each has its own price.' },
  { group: 'food', title: 'Food and drink', intro: 'Meals are per plate. Drinks and coffee show a starting price — the bill depends on what you order.' },
  { group: 'vehicle', title: 'Vehicles', intro: 'Cars for hire by level and brand. Prices are per day.' },
  { group: 'activity', title: 'More to book', intro: 'Tours, workshops and anything else you can add to the same booking.' },
];

export default function BusinessDetailsPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(async () => {
    const [b, bookings] = await Promise.all([getBusinessById(id), getAvailability({ businessId: id })]);
    return { b, bookings: bookings.filter((item) => item.businessId === id || item.targetId === id) };
  }, [id]);
  const [photo, setPhoto] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
  const [offerQuery, setOfferQuery] = useState('');
  const [section, setSection] = useState<'all' | NonNullable<Service['group']>>('all');
  const b = data?.b;
  useDocumentTitle(b?.name);

  useEffect(() => {
    if (!b) return;
    const fromQuery = (params.get('services') ?? params.get('service') ?? '').split(',').filter(Boolean);
    const hash = window.location.hash.replace('#offer-', '');
    const ids = [...fromQuery, hash].filter((serviceId, index, all) => all.indexOf(serviceId) === index && b.services.some((service) => service.id === serviceId));
    if (ids.length) setPicked(ids);
    const target = hash || ids[0];
    if (target) document.getElementById(`offer-${target}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [b, params]);

  const grouped = useMemo(() => {
    if (!b) return [];
    const q = offerQuery.trim().toLowerCase();
    return sections.map((item) => {
      const items = b.services.filter((service) => {
        const group = service.group ?? (isRoom(service) ? 'room' : 'activity');
        if (group !== item.group) return false;
        if (section !== 'all' && group !== section) return false;
        if (!q) return true;
        return `${service.name} ${service.brand ?? ''} ${service.category ?? ''} ${service.description}`.toLowerCase().includes(q);
      });
      return { ...item, items };
    }).filter((item) => item.items.length);
  }, [b, offerQuery, section]);

  if (loading) return <Loading label="Loading business" />;
  if (error?.includes('not found')) return <NotFoundPage what="business" />;
  if (error || !b || !data) return <Container className="py-16"><ErrorState message={error ?? undefined} onRetry={reload} /></Container>;

  const acc = b.category === 'Accommodation' ? (b as Accommodation) : null;
  const rest = b.category === 'Restaurants' ? (b as Restaurant) : null;
  const photos = [b.image, ...(b.gallery ?? [])];
  const rooms = b.services.filter(isRoom);
  const from = fromPrice({ services: b.services });
  const today = todayIso();
  const tomorrow = addDaysIso(today, 1);
  const kind = listingKindOf(b);
  const counts = sections.map((item) => ({
    ...item,
    count: b.services.filter((service) => (service.group ?? (isRoom(service) ? 'room' : 'activity')) === item.group).length,
  })).filter((item) => item.count);

  const toggle = (serviceId: string) => setPicked((current) => (current.includes(serviceId) ? current.filter((item) => item !== serviceId) : [...current, serviceId]));
  const startBooking = () => {
    const query = picked.length ? `?services=${picked.join(',')}` : '';
    navigate(`/book/business/${b.id}${query}`);
  };

  const offerRow = (service: Service) => {
    const left = remaining(service, data.bookings, today, tomorrow);
    const soldOutToday = left <= 0;
    const on = picked.includes(service.id);
    const label = service.category && service.category !== service.name ? `${service.category} · ${service.name}` : service.name;
    return (
      <li key={service.id} id={`offer-${service.id}`} className={cn('rounded-2xl border p-4 sm:p-5', on ? 'border-brand-600 bg-brand-50/50' : 'border-slate-200 bg-white')}>
        <label className="flex cursor-pointer gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-brand-600" checked={on} onChange={() => toggle(service.id)} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
              <p className="font-display text-lg font-bold text-ink">{service.brand ? `${service.brand} · ${label}` : label}</p>
              <p className="whitespace-nowrap font-semibold text-ink">{formatRwf(service.priceRwf)} <span className="text-sm font-normal text-slate-500">{service.unit}</span></p>
            </div>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">{service.description}</p>
            {isRoom(service) && (
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-brand-600" aria-hidden />{service.available ?? 1} {(service.available ?? 1) === 1 ? 'bed' : 'beds'}</span>
                {service.available !== undefined && <span className="inline-flex items-center gap-1.5"><DoorOpen className="h-4 w-4 text-brand-600" aria-hidden />{service.available} {service.available === 1 ? 'room' : 'rooms'}</span>}
              </p>
            )}
            {service.group === 'vehicle' && (
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-brand-600" aria-hidden />{vehicleCarry(service).label}</span>
                <span>{service.available ?? 1} {(service.available ?? 1) === 1 ? 'car' : 'cars'}{service.category ? ` · ${service.category}` : ''}{vehiclePlates(service).length ? ` · ${vehiclePlates(service).join(' · ')}` : ''}</span>
              </p>
            )}
            {!!service.amenities?.length && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {service.amenities.map((amenity) => <li key={amenity} className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-brand-700"><Check className="h-3 w-3" aria-hidden />{amenity}</li>)}
              </ul>
            )}
            <p className={cn('mt-2 text-xs font-semibold', soldOutToday ? 'text-amber-700' : 'text-brand-700')}>
              {service.available == null ? 'Available' : soldOutToday ? 'Fully booked today. You can still request other dates.' : `${left} left today`}
            </p>
          </div>
        </label>
      </li>
    );
  };

  return (
    <article>
      <Container className="pt-4 sm:pt-6">
        <Link to="/explore#explore-listings" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden />All listings</Link>
      </Container>
      <Container className="mt-4 grid gap-8 pb-28 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-10 lg:pb-16">
        <div className="min-w-0 space-y-8">
          <div>
            <SmartImage src={photos[photo] ?? b.image} alt={`${b.name}, photo ${photo + 1} of ${photos.length}`} className="aspect-[16/9] w-full rounded-3xl" />
            {photos.length > 1 && (
              <ul className="mt-3 flex gap-2 overflow-x-auto p-1" aria-label="Photos">
                {photos.map((src, i) => (
                  <li key={i} className="shrink-0">
                    <button onClick={() => setPhoto(i)} aria-label={`Show photo ${i + 1}`} aria-pressed={i === photo} className={cn('block overflow-hidden rounded-xl ring-2 ring-offset-2 transition', i === photo ? 'ring-brand-600' : 'ring-transparent opacity-80 hover:opacity-100')}>
                      <SmartImage src={src} alt="" className="h-16 w-24" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <header>
            <div className="flex flex-wrap gap-2">
              <Badge tone="solid">{kind}</Badge>
              {b.badges.map((x) => <Badge key={x} icon={<Leaf className="h-3 w-3" />}>{x}</Badge>)}
            </div>
            <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{b.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-slate-600">
              <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4 text-brand-600" aria-hidden />{b.ownerName}</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-brand-600" aria-hidden />{b.district}</span>
              <Rating value={b.rating} count={b.reviewCount} />
            </div>
          </header>
          <p className="max-w-prose text-base leading-relaxed text-slate-700 sm:text-lg">{b.description}</p>
          {(acc || rest) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {acc && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Property</p><p className="font-semibold">{kind} · {rooms.reduce((n, r) => n + (r.available ?? 1), 0)} rooms</p></div>}
              {acc && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Eco features</p><p className="font-semibold">{acc.ecoFeatures.join(', ') || '—'}</p></div>}
              {rest && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Cuisine</p><p className="font-semibold">{rest.cuisine.join(', ')}</p></div>}
              {rest && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Signature dish</p><p className="font-semibold">{rest.signatureDish}</p></div>}
            </div>
          )}

          <section aria-labelledby="what-they-offer">
            <h2 id="what-they-offer" className="font-display text-2xl font-bold text-ink">What you can book</h2>
            <p className="mt-1 text-slate-600">Everything this listing offers. Filter by type or search a name such as massage or VIP.</p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <label className="relative min-w-0 flex-1">
                <span className="sr-only">Find a room or service</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" aria-hidden />
                <input value={offerQuery} onChange={(e) => setOfferQuery(e.target.value)} placeholder="Find a room or service" className="h-11 w-full rounded-full border border-slate-300 pl-10 pr-4 text-sm focus:border-brand-600 focus:outline-none" />
              </label>
              <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1" role="tablist" aria-label="Offering type">
                <button type="button" onClick={() => setSection('all')} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold', section === 'all' ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700')}>All ({b.services.length})</button>
                {counts.map((item) => (
                  <button key={item.group} type="button" onClick={() => setSection(item.group ?? 'activity')} className={cn('shrink-0 rounded-full border px-3 py-1.5 text-sm font-semibold', section === item.group ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700')}>{item.title} ({item.count})</button>
                ))}
              </div>
            </div>
            {grouped.length === 0 ? (
              <p className="mt-6 rounded-2xl border border-dashed border-slate-300 p-6 text-sm text-slate-600">Nothing matches that search. Try a shorter word, or show all offerings.</p>
            ) : grouped.map((item) => (
              <div key={item.group} className="mt-8">
                <h3 className="font-display text-xl font-bold text-ink">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.intro}</p>
                <ul className="mt-4 grid gap-3">{item.items.map(offerRow)}</ul>
              </div>
            ))}
          </section>
          <ReviewsSection target={{ id: b.id, type: 'business', name: b.name }} />
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-3 rounded-3xl border border-slate-200 p-5">
            {from && (
              <p className="border-b border-slate-100 pb-3">
                <span className="text-sm text-slate-500">From </span>
                <span className="font-display text-2xl font-bold text-ink">{formatRwf(from.priceRwf)}</span>
                <span className="text-sm text-slate-500"> {from.unit}</span>
              </p>
            )}
            <h2 className="font-display text-lg font-bold">Book {picked.length ? `${picked.length} selected` : 'this listing'}</h2>
            <p className="text-sm text-slate-600">You will choose dates first. We then show what is still free in that range.</p>
            {picked.length > 0 && (
              <ul className="space-y-1 text-sm text-slate-700">
                {picked.map((serviceId) => {
                  const service = b.services.find((item) => item.id === serviceId);
                  return service ? <li key={serviceId} className="flex justify-between gap-3"><span>{service.category ?? service.name}</span><span className="font-semibold">{formatRwf(service.priceRwf)}</span></li> : null;
                })}
              </ul>
            )}
            <Button onClick={startBooking} className="w-full">Continue to booking</Button>
            <h2 className="font-display text-lg font-bold">Contact {b.ownerName.split(' ')[0]}</h2>
            <a href={`tel:${b.phone.replace(/\s/g, '')}`} className="flex items-center gap-2 text-slate-700 hover:text-brand-600"><Phone className="h-4 w-4 text-brand-600" aria-hidden />{b.phone}</a>
            <a href={`mailto:${b.email}`} className="flex items-center gap-2 break-all text-slate-700 hover:text-brand-600"><Mail className="h-4 w-4 shrink-0 text-brand-600" aria-hidden />{b.email}</a>
            <div className="grid gap-2 pt-2">
              <a href={`mailto:${b.email}?subject=${encodeURIComponent(`Enquiry via Tourista Rwanda: ${b.name}`)}`} className={buttonClass('secondary', 'md', 'w-full')}>Send an enquiry</a>
              <FavoriteButton variant="full" className="w-full" item={{ itemId: b.id, itemType: 'business', title: b.name, subtitle: `${kind}, ${b.district}`, image: b.image, href: `/businesses/${b.id}` }} />
            </div>
          </div>
        </aside>
      </Container>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-7xl items-center gap-3">
          <p className="min-w-0 flex-1 text-sm">
            {from ? <><span className="text-slate-500">From </span><span className="font-semibold text-ink">{formatRwf(from.priceRwf)}</span></> : 'Select what to book'}
            {picked.length > 0 && <span className="block truncate text-xs text-slate-500">{picked.length} selected</span>}
          </p>
          <Button onClick={startBooking} disabled={!picked.length} className="shrink-0">Continue</Button>
        </div>
      </div>
    </article>
  );
}
