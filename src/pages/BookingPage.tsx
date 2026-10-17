import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, Minus, Plus } from 'lucide-react';
import type { Booking, BookingLine, Service } from '@/types';
import { createBooking, getAvailability, getBusinessById, getExperienceById, getLocationById } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Badge, Button, ButtonLink, CalendarCard, Container, ErrorState, Input, Loading, SmartImage, Textarea } from '@/components/ui';
import { formatDate, formatRwf, todayIso } from '@/utils/format';
import { addDaysIso, guidedVisitPrice, periodNoun, pricingMode, quote } from '@/utils/pricing';
import { assignVehiclePlates, remaining } from '@/utils/availability';
import { cn } from '@/utils/cn';
import { platesPhrase, vehicleCarry, vehiclePlates } from '@/utils/catalog';
import NotFoundPage from './NotFoundPage';

type TargetType = 'location' | 'experience' | 'business';

interface Bookable {
  id: string;
  type: TargetType;
  name: string;
  image: string;
  subtitle: string;
  businessId?: string;
  ownerId?: string;
  services: Service[];
}

async function loadBookable(type: TargetType, id: string): Promise<Bookable> {
  if (type === 'experience') {
    const e = await getExperienceById(id);
    return { id, type, name: e.title, image: e.image, subtitle: e.locationName, services: [{ id: 'main', name: e.title, description: e.description || e.duration, priceRwf: e.priceRwf, unit: 'per person', group: 'activity' }] };
  }
  if (type === 'business') {
    const b = await getBusinessById(id);
    return { id, type, name: b.name, image: b.image, subtitle: `${b.listingKind ?? b.propertyType ?? b.category}, ${b.district}`, businessId: b.id, ownerId: b.ownerId, services: b.services };
  }
  const l = await getLocationById(id);
  return {
    id, type: 'location', name: l.name, image: l.image, subtitle: `${l.district}, ${l.province}`,
    services: [{ id: 'guided', name: `Guided visit to ${l.name}`, description: l.shortDescription || 'Licensed local guide for the day', priceRwf: guidedVisitPrice(l.priceLevel), unit: 'per person', group: 'activity' }],
  };
}

const steps = ['Dates', 'Choose', 'Your details'];

function Stepper({ label, value, min, max, onChange, showMax = true }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void; showMax?: boolean }) {
  const btn = 'grid h-11 w-11 place-items-center rounded-xl border border-slate-300 text-ink hover:border-brand-600 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink">
        {label}
        {showMax && max > 0 && <span className="font-normal text-slate-500"> · max {max}</span>}
      </p>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`}><Minus className="h-4 w-4" /></button>
        <output className="w-12 text-center font-display text-xl font-bold tabular-nums text-ink" aria-live="polite">{value}</output>
        <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function asksForPeople(service: Service) {
  return service.group === 'wellness' || service.group === 'food' || pricingMode(service.unit) === 'perPerson';
}

function quantityLabel(service: Service, mode: ReturnType<typeof pricingMode>) {
  if (mode === 'stay') return 'Rooms';
  if (service.group === 'vehicle') return 'Cars';
  if (service.unit === 'per plate') return 'Plates';
  if (service.unit === 'per drink') return 'Drinks';
  if (service.unit === 'per cup') return 'Cups';
  if (service.group === 'food') return 'Quantity';
  return 'Quantity';
}

function stockOf(service: Service, left: number) {
  if (Number.isFinite(left)) return Math.max(0, Math.floor(left));
  if (service.available != null && Number.isFinite(service.available)) return Math.max(0, Math.floor(service.available));
  return null;
}

function peopleCap(service: Service, rooms: number, stock: number | null) {
  if (pricingMode(service.unit) === 'stay') return Math.max(1, (service.capacity ?? 1) * Math.max(1, rooms));
  if (stock != null) return Math.max(1, stock);
  return null;
}

function listingDateKind(services: Service[]) {
  if (services.some((service) => pricingMode(service.unit) === 'stay')) return 'stay' as const;
  if (services.some((service) => pricingMode(service.unit) === 'rental')) return 'rental' as const;
  return 'day' as const;
}

function datesReady(start: string, end: string, kind: ReturnType<typeof listingDateKind>) {
  if (!start || !end) return false;
  return kind === 'stay' ? end > start : end >= start;
}

function occupancyWindow(service: Service, start: string, end: string) {
  const mode = pricingMode(service.unit);
  if (mode === 'stay') return { start, end };
  return { start, end: addDaysIso(end, 1) };
}

function windowFor(services: Service[], start: string, end: string) {
  if (!start || !end) return null;
  const kind = listingDateKind(services);
  if (kind === 'stay') return { start, end };
  return { start, end: addDaysIso(end, 1) };
}

/** Remaining units for one offering in the chosen range. 0 means it cannot be selected. */
function offeringLeft(service: Service, bookings: Booking[], start: string, end: string) {
  if (!start || !end) return service.available ?? Number.POSITIVE_INFINITY;
  if (service.available != null && service.available <= 0) return 0;
  const span = occupancyWindow(service, start, end);
  if (pricingMode(service.unit) === 'stay' && !(end > start)) return 0;
  const left = remaining(service, bookings, span.start, span.end);
  const fleet = service.group === 'vehicle' ? vehiclePlates(service) : [];
  if (fleet.length) {
    const free = assignVehiclePlates(service, fleet.length, bookings, span.start, span.end).length;
    return Number.isFinite(left) ? Math.min(left, free) : free;
  }
  return left;
}

export default function BookingPage() {
  const { type = 'location', id = '' } = useParams();
  const [params] = useSearchParams();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const validType = (['location', 'experience', 'business'] as const).includes(type as TargetType);
  const { data, loading, error, reload } = useAsync(async () => {
    if (!validType) throw { message: 'not found' };
    const [item, bookings] = await Promise.all([loadBookable(type as TargetType, id), getAvailability({ targetId: id })]);
    return { item, bookings: bookings.filter((booking) => booking.businessId === id || booking.targetId === id) };
  }, [type, id]);
  const item = data?.item;
  useDocumentTitle(item ? `Book ${item.name}` : 'Book');

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>(() => (params.get('services') ?? params.get('service') ?? '').split(',').filter(Boolean));
  const [start, setStart] = useState(params.get('checkin') ?? '');
  const [end, setEnd] = useState(params.get('checkout') ?? '');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [peopleCounts, setPeopleCounts] = useState<Record<string, number>>({});
  const [info, setInfo] = useState({ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const dateKind = listingDateKind(item?.services ?? []);
  const rangeReady = datesReady(start, end, dateKind);
  const needsStay = dateKind === 'stay';
  const needsRange = dateKind !== 'day';

  useEffect(() => {
    if (!item || !data || !rangeReady) return;
    setSelected((current) => current.filter((serviceId) => {
      const service = item.services.find((offering) => offering.id === serviceId);
      return !!service && offeringLeft(service, data.bookings, start, end) > 0;
    }));
  }, [item, data, start, end, rangeReady]);

  const services = item?.services.filter((service) => selected.includes(service.id)) ?? [];
  const needsPeople = services.some((service) => asksForPeople(service) || pricingMode(service.unit) === 'stay');
  const span = rangeReady ? windowFor(item?.services ?? services, start, end) : null;
  const partyOf = (id: string, cap = 30) => {
    const n = peopleCounts[id];
    if (n != null) return Math.min(Math.max(1, n), Math.max(1, cap));
    return Math.min(2, Math.max(1, cap));
  };
  const stayParty = services.filter((s) => pricingMode(s.unit) === 'stay').reduce((n, s) => n + partyOf(s.id), 0);
  const otherParty = Math.max(0, ...services.filter((s) => pricingMode(s.unit) !== 'stay').map((s) => partyOf(s.id)));
  const partySize = stayParty || otherParty || 1;

  const lines = useMemo(() => {
    if (!item || !span || !rangeReady) return [];
    return services.map((service) => {
      const mode = pricingMode(service.unit);
      const units = mode === 'perPerson' ? partySize : (counts[service.id] ?? 1);
      const priced = quote(service, { start, end, units, people: partySize });
      const occ = occupancyWindow(service, start, end);
      const left = offeringLeft(service, data?.bookings ?? [], start, end);
      const plateNumbers = service.group === 'vehicle' ? assignVehiclePlates(service, units, data?.bookings ?? [], occ.start, occ.end) : undefined;
      return { service, mode, units, priced, left, plateNumbers };
    });
  }, [item, services, span, counts, peopleCounts, start, end, data?.bookings, partySize, rangeReady]);

  const total = lines.reduce((sum, line) => sum + line.priced.total, 0);

  if (loading) return <Loading label="Preparing your booking" />;
  if (error?.includes('not found')) return <NotFoundPage what="item to book" />;
  if (error || !item || !data) return <Container className="py-16"><ErrorState message={error ?? undefined} onRetry={reload} /></Container>;

  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!start) e.start = `Choose your ${needsStay ? 'check-in' : 'start'} date.`;
      else if (start < todayIso()) e.start = 'Choose a date from today onwards.';
      if (!end) e.end = `Choose your ${needsStay ? 'check-out' : 'end'} date.`;
      else if (needsStay && end <= start) e.end = 'Check-out must be after check-in.';
      else if (!needsStay && end < start) e.end = 'The end date can’t be before the start date.';
    }
    if (step === 1) {
      if (!services.length) e.services = 'Choose at least one thing to book.';
      if (needsPeople && partySize < 1) e.people = 'At least one guest.';
      if (partySize > 30) e.people = 'Bookings are limited to 30 people. Contact the host for larger groups.';
      lines.forEach((line) => {
        if (line.priced.total <= 0) e.dates = 'Those dates do not cover a chargeable stay.';
        if (line.units > line.left) e[line.service.id] = line.left > 0 ? `Only ${line.left} left for those dates.` : `${line.service.name} is booked during this date range.`;
      });
    }
    if (step === 2) {
      if (info.name.trim().length < 2) e.name = 'Enter your full name.';
      if (!/^\S+@\S+\.\S+$/.test(info.email)) e.email = 'Enter a valid email address.';
      if (info.phone.replace(/\D/g, '').length < 9) e.phone = 'Enter a phone number with country code, e.g. +250 788 000 000.';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => validateStep() && setStep((s) => s + 1);

  const submitRequest = async () => {
    if (!validateStep() || !user || !lines.length || lines.some((line) => line.priced.total <= 0)) return;
    const bookingLines: BookingLine[] = lines.map((line) => ({
      serviceId: line.service.id,
      serviceName: line.service.name,
      units: line.units,
      unitPriceRwf: line.service.priceRwf,
      lineTotalRwf: line.priced.total,
      plateNumbers: line.plateNumbers?.length ? line.plateNumbers : undefined,
    }));
    setSubmitting(true);
    try {
      const booking = await createBooking({
        userId: user.id, customerName: info.name.trim(), customerEmail: info.email.trim(), customerPhone: info.phone.trim(),
        targetId: item.id, targetType: item.type, targetName: item.name, businessId: item.businessId, ownerId: item.ownerId,
        serviceId: bookingLines[0].serviceId,
        serviceName: bookingLines.length > 1 ? bookingLines.map((line) => line.serviceName).join(', ') : bookingLines[0].serviceName,
        lines: bookingLines,
        date: start, endDate: end || undefined,
        nights: needsRange ? lines.find((line) => line.mode === 'stay' || line.mode === 'rental')?.priced.periods : undefined,
        units: bookingLines.reduce((sum, line) => sum + line.units, 0),
        unitPriceRwf: bookingLines[0].unitPriceRwf,
        people: Math.min(30, partySize), notes: info.notes.trim() || undefined,
        totalRwf: total,
      });
      setConfirmed(booking);
      toast.success('Request sent. The host will approve or decline it.');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (confirmed) {
    const booked = confirmed.lines?.length ? confirmed.lines : [{ serviceName: confirmed.serviceName ?? item.name, units: confirmed.units ?? 1, lineTotalRwf: confirmed.totalRwf, plateNumbers: undefined as string[] | undefined }];
    return (
      <Container className="max-w-2xl py-16 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-brand-600" aria-hidden />
        <h1 className="mt-4 font-display text-3xl font-bold text-ink">Request sent</h1>
        <p className="mt-2 text-slate-600">You have not paid yet. The host approves or declines first. Once approved, you have two hours to pay at least 30% from Bookings.</p>
        <dl className="mx-auto mt-8 grid max-w-md gap-3 rounded-3xl border border-slate-200 p-6 text-left text-sm">
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Reference</dt><dd className="font-semibold text-ink">{confirmed.id.toUpperCase()}</dd></div>
          {booked.map((line) => (
            <div key={`${line.serviceName}-${line.plateNumbers?.join('-') ?? ''}`} className="flex justify-between gap-4">
              <dt className="text-slate-500">
                {line.serviceName} × {line.units}
                {line.plateNumbers?.length ? <span className="mt-1 block font-semibold tracking-wide text-ink">Plate {platesPhrase(line.plateNumbers)}</span> : null}
              </dt>
              <dd className="font-semibold">{formatRwf(line.lineTotalRwf)}</dd>
            </div>
          ))}
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Date</dt><dd className="text-right font-semibold">{needsRange && confirmed.endDate ? `${formatDate(confirmed.date)} → ${formatDate(confirmed.endDate)}` : formatDate(confirmed.date)}</dd></div>
          <div className="flex justify-between border-t border-slate-100 pt-3"><dt className="text-slate-500">Status</dt><dd><Badge tone="warning">Awaiting host</Badge></dd></div>
          <div className="flex justify-between"><dt className="font-semibold">Total</dt><dd className="font-display text-lg font-bold">{formatRwf(confirmed.totalRwf)}</dd></div>
        </dl>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <ButtonLink to={`${dashboardPathFor(user?.role ?? 'tourist')}/bookings/${confirmed.id}`}>View booking</ButtonLink>
          <ButtonLink to="/explore" variant="secondary">Back to listings</ButtonLink>
        </div>
      </Container>
    );
  }

  const grouped = [
    { title: 'Rooms', items: item.services.filter((service) => pricingMode(service.unit) === 'stay') },
    { title: 'Services', items: item.services.filter((service) => service.group === 'wellness') },
    { title: 'Food and drink', items: item.services.filter((service) => service.group === 'food') },
    { title: 'Vehicles', items: item.services.filter((service) => service.group === 'vehicle') },
    { title: 'Other', items: item.services.filter((service) => pricingMode(service.unit) !== 'stay' && service.group !== 'wellness' && service.group !== 'food' && service.group !== 'vehicle') },
  ].filter((group) => group.items.length);

  return (
    <Container className="py-8 lg:py-12">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden />Back</button>
      <h1 className="mt-3 font-display text-2xl font-bold text-ink sm:text-4xl">Book {item.name}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">Pick your dates first. We then show what is free in that range. The host approves first. You pay at least 30% later from Bookings, using their published accounts.</p>

      <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Booking steps">
        {steps.map((label, i) => (
          <li key={label} aria-current={i === step ? 'step' : undefined} className="flex flex-col gap-2">
            <span className={cn('h-1.5 rounded-full', i <= step ? 'bg-brand-600' : 'bg-slate-200')} />
            <span className={cn('text-xs font-semibold sm:text-sm', i === step ? 'text-brand-600' : 'text-slate-500')}>{i + 1}. {label}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid min-w-0 gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <div className="min-w-0 rounded-3xl border border-slate-200 p-4 sm:p-7">
          {step === 0 && (
            <div className="space-y-6">
              <p className="text-sm text-slate-600">Choose your date range first. Next you will only be able to book what is still free in those dates.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <CalendarCard
                  label={needsStay ? 'Check-in' : 'From'}
                  value={start}
                  min={todayIso()}
                  onChange={(iso) => {
                    setStart(iso);
                    if (needsStay && iso && (!end || end <= iso)) setEnd(addDaysIso(iso, 1));
                    else if (!needsStay && iso && end && end < iso) setEnd(iso);
                  }}
                  error={errors.start}
                  rangeEnd={end}
                />
                <CalendarCard
                  label={needsStay ? 'Check-out' : 'To'}
                  value={end}
                  min={start ? (needsStay ? addDaysIso(start, 1) : start) : todayIso()}
                  onChange={setEnd}
                  error={errors.end}
                  rangeStart={start}
                />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <p className="text-sm text-slate-600">
                Availability for {formatDate(start)}{end && end !== start ? ` – ${formatDate(end)}` : ''}. Items already booked in this date range cannot be selected.
              </p>
              {grouped.map((group) => (
                <fieldset key={group.title} className="space-y-2">
                  <legend className="mb-2 text-sm font-semibold text-ink">{group.title}</legend>
                  {group.items.map((service) => {
                    const on = selected.includes(service.id);
                    const mode = pricingMode(service.unit);
                    const left = offeringLeft(service, data.bookings, start, end);
                    const booked = Number.isFinite(left) && left <= 0;
                    const stock = stockOf(service, left);
                    const qtyMax = stock ?? 20;
                    const count = Math.min(counts[service.id] ?? 1, Math.max(qtyMax, 1));
                    const guestsMax = peopleCap(service, count, stock);
                    const guestsCap = guestsMax ?? 30;
                    const guests = partyOf(service.id, guestsCap);
                    const showPeople = mode === 'stay' || asksForPeople(service);
                    const assignedPlates = lines.find((line) => line.service.id === service.id)?.plateNumbers;
                    return (
                      <div key={service.id} className={cn(
                        'rounded-2xl border-2 p-4',
                        booked
                          ? 'border-slate-400 bg-slate-300/90 bg-[repeating-linear-gradient(135deg,transparent_0_10px,rgba(15,23,42,0.08)_10px_20px)] opacity-80'
                          : on ? 'border-brand-600 bg-brand-50/60' : 'border-slate-200',
                      )}>
                        <label className={cn('flex gap-3', booked ? 'cursor-not-allowed' : 'cursor-pointer')}>
                          <input type="checkbox" className="mt-1 accent-brand-600 disabled:opacity-40" checked={on} disabled={booked} onChange={() => setSelected((current) => (on ? current.filter((serviceId) => serviceId !== service.id) : [...current, service.id]))} />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                              <span className="flex flex-wrap items-center gap-2">
                                <span className={cn('font-semibold', booked ? 'text-slate-600' : 'text-ink')}>{service.name}</span>
                                {booked && <Badge tone="neutral" className="bg-slate-600 text-white">Booked</Badge>}
                              </span>
                              <span className={cn('whitespace-nowrap font-semibold', booked ? 'text-slate-500' : 'text-ink')}>{service.brand ? `${service.brand} · ` : ''}{formatRwf(service.priceRwf)} <span className="text-sm font-normal text-slate-500">{service.unit}</span></span>
                            </span>
                            <span className={cn('mt-1 block text-sm', booked ? 'text-slate-500' : 'text-slate-600')}>{service.description}</span>
                            {service.group === 'vehicle' && (
                              <span className="mt-1 block text-sm font-medium text-slate-700">
                                {vehicleCarry(service).label}
                                {on && assignedPlates?.length ? <span className="block font-semibold tracking-wide text-ink">You are booking plate {platesPhrase(assignedPlates)}</span> : null}
                              </span>
                            )}
                            {booked && (
                              <span className="mt-1 block text-sm font-semibold text-slate-700">
                                Booked during this date range ({formatDate(start)} – {formatDate(end)}).
                              </span>
                            )}
                            {!booked && Number.isFinite(left) && left < (service.available ?? left) && (
                              <span className="mt-1 block text-sm text-slate-600">{left} left for these dates.</span>
                            )}
                          </span>
                        </label>
                        {on && (mode !== 'perPerson' || showPeople) && (
                          <div className="mt-3 grid gap-3 pl-7 sm:grid-cols-2">
                            {mode !== 'perPerson' && (
                              <Stepper label={quantityLabel(service, mode)} value={Math.max(1, count)} min={1} max={Math.max(qtyMax, 1)} showMax={stock != null} onChange={(value) => setCounts({ ...counts, [service.id]: value })} />
                            )}
                            {showPeople && (
                              <Stepper
                                label="People"
                                value={guests}
                                min={1}
                                max={guestsCap}
                                showMax={guestsMax != null}
                                onChange={(value) => setPeopleCounts({ ...peopleCounts, [service.id]: value })}
                              />
                            )}
                            {errors[service.id] && <p className="mt-1 text-sm text-red-600 sm:col-span-2">{errors[service.id]}</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </fieldset>
              ))}
              {errors.services && <p className="text-sm text-red-600">{errors.services}</p>}
              {errors.dates && <p className="text-sm text-red-600">{errors.dates}</p>}
              {errors.people && <p className="text-sm text-red-600">{errors.people}</p>}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <Input label="Full name" required value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} error={errors.name} autoComplete="name" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Email" type="email" required value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} error={errors.email} autoComplete="email" />
                <Input label="Phone" type="tel" required value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} error={errors.phone} autoComplete="tel" placeholder="+250 788 000 000" />
              </div>
              <Textarea label="Notes for the host" value={info.notes} onChange={(e) => setInfo({ ...info, notes: e.target.value })} placeholder="Arrival time, dietary needs, accessibility…" />
            </div>
          )}

          <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            {step > 0 ? <Button variant="ghost" className="w-full sm:w-auto" onClick={() => setStep((s) => s - 1)}>Back</Button> : <span />}
            {step < 2 ? <Button className="w-full sm:w-auto" onClick={next}>Continue</Button> : <Button className="w-full sm:w-auto" onClick={submitRequest} loading={submitting}>Send booking request</Button>}
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-3xl border border-slate-200">
            <SmartImage src={item.image} alt={item.name} className="aspect-[16/9] w-full" />
            <div className="p-5">
              <h2 className="font-display text-lg font-bold text-ink">Booking summary</h2>
              <p className="text-sm text-slate-500">{item.subtitle}</p>
              <dl className="mt-4 space-y-2 text-sm">
                {lines.map((line) => (
                  <div key={line.service.id} className="flex justify-between gap-3">
                    <dt className="text-slate-500">
                      {line.service.name} × {line.units}
                      {line.plateNumbers?.length ? <span className="mt-0.5 block font-semibold tracking-wide text-ink">Plate {platesPhrase(line.plateNumbers)}</span> : null}
                    </dt>
                    <dd className="whitespace-nowrap">{formatRwf(line.priced.total)}</dd>
                  </div>
                ))}
                {start && <div className="flex justify-between gap-3"><dt className="text-slate-500">{needsStay ? 'Check-in' : 'From'}</dt><dd>{formatDate(start)}</dd></div>}
                {end && <div className="flex justify-between gap-3"><dt className="text-slate-500">{needsStay ? 'Check-out' : 'To'}</dt><dd>{formatDate(end)}</dd></div>}
                {lines[0] && (needsStay || needsRange) && <div className="flex justify-between gap-3"><dt className="text-slate-500">Length</dt><dd>{lines[0].priced.periods} {periodNoun(lines[0].mode, lines[0].priced.periods)}</dd></div>}
                {needsPeople && <div className="flex justify-between gap-3"><dt className="text-slate-500">Guests</dt><dd>{partySize}</dd></div>}
                <div className="flex justify-between border-t border-slate-100 pt-3 text-base"><dt className="font-semibold">Total</dt><dd className="font-display text-xl font-bold">{formatRwf(total)}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-slate-500">No payment yet. After the host approves, you will have two hours to pay at least 30% from your Bookings page.</p>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  );
}
