import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { MapPin, Phone, Mail, Leaf, ChevronLeft, User, Users, BedDouble, DoorOpen, Check } from 'lucide-react';
import { getBookings, getBusinessById } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { FavoriteButton } from '@/components/cards';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { Badge, Button, Container, ErrorState, LoadingSpinner, Rating, SmartImage, buttonClass } from '@/components/ui';
import { formatRwf, todayIso } from '@/utils/format';
import { addDaysIso, fromPrice, isRoom } from '@/utils/pricing';
import { remaining } from '@/utils/availability';
import { listingKindOf } from '@/utils/catalog';
import { cn } from '@/utils/cn';
import type { Accommodation, Restaurant, Service } from '@/types';
import NotFoundPage from './NotFoundPage';

const sections: { group: Service['group']; title: string; intro: string }[] = [
  { group: 'room', title: 'Rooms', intro: 'Prices are per room, per night. Choose one or more categories to book.' },
  { group: 'wellness', title: 'Services', intro: 'Book a massage, the gym, a sauna or another service. Each has its own price.' },
  { group: 'food', title: 'Food and drink', intro: 'Restaurant, bar and coffee shop. Prices are for one person.' },
  { group: 'activity', title: 'More to book', intro: 'Tours, workshops and other things you can add to the same booking.' },
];

export default function BusinessDetailsPage() {
  const { id = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(async () => {
    const [b, bookings] = await Promise.all([getBusinessById(id), getBookings()]);
    return { b, bookings: bookings.filter((item) => item.businessId === id || item.targetId === id) };
  }, [id]);
  const [photo, setPhoto] = useState(0);
  const [picked, setPicked] = useState<string[]>([]);
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

  if (loading) return <LoadingSpinner label="Loading business" />;
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

  const toggle = (serviceId: string) => setPicked((current) => (current.includes(serviceId) ? current.filter((item) => item !== serviceId) : [...current, serviceId]));
  const startBooking = () => {
    if (!picked.length) return;
    navigate(`/book/business/${b.id}?services=${picked.join(',')}`);
  };

  const offerRow = (service: Service) => {
    const left = remaining(service, data.bookings, today, tomorrow);
    const soldOutToday = left <= 0;
    const on = picked.includes(service.id);
    return (
      <li key={service.id} id={`offer-${service.id}`} className={cn('rounded-2xl border p-4', on ? 'border-brand-600 bg-brand-50/50' : 'border-slate-200')}>
        <label className="flex cursor-pointer gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-600" checked={on} onChange={() => toggle(service.id)} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <p className="font-display text-lg font-bold text-ink">{service.category && service.category !== service.name ? `${service.category} · ${service.name}` : service.name}</p>
              <p className="whitespace-nowrap font-semibold text-ink">{formatRwf(service.priceRwf)} <span className="text-sm font-normal text-slate-500">{service.unit}</span></p>
            </div>
            <p className="mt-1 text-sm text-slate-600">{service.description}</p>
            {isRoom(service) && (
              <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                <span className="inline-flex items-center gap-1.5"><Users className="h-4 w-4 text-brand-600" aria-hidden />Sleeps {service.capacity ?? 2}</span>
                {service.bedType && <span className="inline-flex items-center gap-1.5"><BedDouble className="h-4 w-4 text-brand-600" aria-hidden />{service.bedType}</span>}
                {service.available !== undefined && <span className="inline-flex items-center gap-1.5"><DoorOpen className="h-4 w-4 text-brand-600" aria-hidden />{service.available} {service.available === 1 ? 'room' : 'rooms'}</span>}
              </p>
            )}
            {!!service.amenities?.length && (
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {service.amenities.map((amenity) => <li key={amenity} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-medium text-brand-600"><Check className="h-3 w-3" aria-hidden />{amenity}</li>)}
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
      <Container className="pt-6">
        <Link to="/businesses" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden />Listings</Link>
      </Container>
      <Container className="mt-4 grid gap-10 pb-16 lg:grid-cols-[1fr_360px]">
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
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink">{b.name}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-slate-600">
              <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4 text-brand-600" aria-hidden />{b.ownerName}</span>
              <Link to={`/destinations/${b.locationId}`} className="inline-flex items-center gap-1.5 hover:text-brand-600"><MapPin className="h-4 w-4 text-brand-600" aria-hidden />{b.district}</Link>
              <Rating value={b.rating} count={b.reviewCount} />
            </div>
          </header>
          <p className="max-w-prose text-lg leading-relaxed text-slate-700">{b.description}</p>
          {(acc || rest) && (
            <div className="grid gap-3 sm:grid-cols-2">
              {acc && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Property</p><p className="font-semibold">{kind} · {rooms.reduce((n, r) => n + (r.available ?? 1), 0)} rooms</p></div>}
              {acc && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Eco features</p><p className="font-semibold">{acc.ecoFeatures.join(', ') || '—'}</p></div>}
              {rest && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Cuisine</p><p className="font-semibold">{rest.cuisine.join(', ')}</p></div>}
              {rest && <div className="rounded-2xl border border-slate-200 p-4"><p className="text-sm text-slate-500">Signature dish</p><p className="font-semibold">{rest.signatureDish}</p></div>}
            </div>
          )}

          {sections.map((section) => {
            const items = b.services.filter((service) => (service.group ?? (isRoom(service) ? 'room' : 'activity')) === section.group);
            if (!items.length) return null;
            return (
              <section key={section.group} aria-labelledby={section.group}>
                <h2 id={section.group} className="font-display text-2xl font-bold text-ink">{section.title}</h2>
                <p className="text-slate-600">{section.intro}</p>
                <ul className="mt-4 grid gap-3">{items.map(offerRow)}</ul>
              </section>
            );
          })}
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
            <h2 className="font-display text-lg font-bold">Book {picked.length ? `${picked.length} selected` : 'what you need'}</h2>
            <p className="text-sm text-slate-600">{picked.length ? 'You will pay once, then the booking is confirmed.' : 'Select one or more rooms, services or meals, then continue to payment.'}</p>
            <Button onClick={startBooking} disabled={!picked.length} className="w-full">Continue to booking</Button>
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
    </article>
  );
}
