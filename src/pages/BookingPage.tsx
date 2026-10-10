import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CheckCircle2, ChevronLeft, Minus, Plus } from 'lucide-react';
import type { Booking, BookingLine, Payment, Service } from '@/types';
import { createBooking, getBookings, getBusinessById, getExperienceById, getLocationById, getPayoutForBusiness } from '@/services';
import { useAsync, errorMessage } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { Badge, Button, ButtonLink, Container, DatePicker, ErrorState, Input, LoadingSpinner, SmartImage, Textarea } from '@/components/ui';
import { PaymentForm } from '@/components/payment/PaymentForm';
import { formatDate, formatRwf, todayIso } from '@/utils/format';
import { addDaysIso, guidedVisitPrice, periodNoun, pricingMode, quote } from '@/utils/pricing';
import { isNightTakenFor, isStayRangeTaken, remaining } from '@/utils/availability';
import { paymentMethodLabel, type PayoutTarget } from '@/utils/payment';
import { cn } from '@/utils/cn';
import NotFoundPage from './NotFoundPage';

type TargetType = 'location' | 'experience' | 'business';

interface Bookable {
  id: string;
  type: TargetType;
  name: string;
  image: string;
  subtitle: string;
  businessId?: string;
  services: Service[];
  payout?: PayoutTarget | null;
}

async function loadBookable(type: TargetType, id: string): Promise<Bookable> {
  if (type === 'experience') {
    const e = await getExperienceById(id);
    return { id, type, name: e.title, image: e.image, subtitle: e.locationName, services: [{ id: 'main', name: e.title, description: e.description || e.duration, priceRwf: e.priceRwf, unit: 'per person', group: 'activity' }] };
  }
  if (type === 'business') {
    const b = await getBusinessById(id);
    return { id, type, name: b.name, image: b.image, subtitle: `${b.listingKind ?? b.propertyType ?? b.category}, ${b.district}`, businessId: b.id, services: b.services, payout: await getPayoutForBusiness(b.id) };
  }
  const l = await getLocationById(id);
  return {
    id, type: 'location', name: l.name, image: l.image, subtitle: `${l.district}, ${l.province}`,
    services: [{ id: 'guided', name: `Guided visit to ${l.name}`, description: l.shortDescription || 'Licensed local guide for the day', priceRwf: guidedVisitPrice(l.priceLevel), unit: 'per person', group: 'activity' }],
  };
}

const steps = ['Choose & dates', 'Your details', 'Payment'];

function Stepper({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  const btn = 'grid h-11 w-11 place-items-center rounded-xl border border-slate-300 text-ink hover:border-brand-600 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40';
  return (
    <div>
      <p className="mb-1.5 text-sm font-semibold text-ink">{label}</p>
      <div className="flex items-center gap-2">
        <button type="button" className={btn} onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label={`Fewer ${label.toLowerCase()}`}><Minus className="h-4 w-4" /></button>
        <output className="w-12 text-center font-display text-xl font-bold tabular-nums text-ink" aria-live="polite">{value}</output>
        <button type="button" className={btn} onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label={`More ${label.toLowerCase()}`}><Plus className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

function windowFor(services: Service[], start: string, end: string) {
  const modes = services.map((service) => pricingMode(service.unit));
  const stay = modes.includes('stay');
  const rental = modes.includes('rental');
  if (!start) return null;
  if (stay) return end ? { start, end } : null;
  if (rental) return end ? { start, end: addDaysIso(end, 1) } : null;
  return { start, end: addDaysIso(start, 1) };
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
    const [item, bookings] = await Promise.all([loadBookable(type as TargetType, id), getBookings()]);
    return { item, bookings: bookings.filter((booking) => booking.businessId === id || booking.targetId === id) };
  }, [type, id]);
  const item = data?.item;
  useDocumentTitle(item ? `Book ${item.name}` : 'Book');

  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState<string[]>(() => (params.get('services') ?? params.get('service') ?? '').split(',').filter(Boolean));
  const [start, setStart] = useState(params.get('checkin') ?? '');
  const [end, setEnd] = useState(params.get('checkout') ?? '');
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [people, setPeople] = useState(2);
  const [info, setInfo] = useState({ name: user?.name ?? '', email: user?.email ?? '', phone: user?.phone ?? '', notes: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState<Booking | null>(null);

  useEffect(() => {
    if (!item) return;
    setSelected((current) => {
      const valid = current.filter((serviceId) => item.services.some((service) => service.id === serviceId));
      return valid.length ? valid : item.services[0] ? [item.services[0].id] : [];
    });
  }, [item]);

  const services = item?.services.filter((service) => selected.includes(service.id)) ?? [];
  const modes = services.map((service) => pricingMode(service.unit));
  const needsStay = modes.includes('stay');
  const needsRange = needsStay || modes.includes('rental');
  const needsPeople = modes.some((mode) => mode === 'perPerson' || mode === 'stay');
  const span = item ? windowFor(services, start, end) : null;
  const demand = services.map((service) => ({
    service,
    units: pricingMode(service.unit) === 'perPerson' ? 1 : (counts[service.id] ?? 1),
  }));

  useEffect(() => {
    if (!data || !start) return;
    const next = services.map((service) => ({
      service,
      units: pricingMode(service.unit) === 'perPerson' ? 1 : (counts[service.id] ?? 1),
    }));
    if (!needsRange) {
      if (isNightTakenFor(next, data.bookings, start)) setStart('');
      return;
    }
    if (end && isStayRangeTaken(next, data.bookings, start, needsStay ? end : addDaysIso(end, 1))) {
      setStart('');
      setEnd('');
    }
  }, [counts, data, end, needsRange, needsStay, selected, start]);

  const lines = useMemo(() => {
    if (!item || !span) return [];
    return services.map((service) => {
      const mode = pricingMode(service.unit);
      const units = mode === 'perPerson' ? people : (counts[service.id] ?? 1);
      const priced = quote(service, { start, end, units, people });
      const left = remaining(service, data?.bookings ?? [], span.start, span.end);
      return { service, mode, units, priced, left };
    });
  }, [item, services, span, counts, people, start, end, data?.bookings]);

  const total = lines.reduce((sum, line) => sum + line.priced.total, 0);

  if (loading) return <LoadingSpinner label="Preparing your booking" />;
  if (error?.includes('not found')) return <NotFoundPage what="item to book" />;
  if (error || !item || !data) return <Container className="py-16"><ErrorState message={error ?? undefined} onRetry={reload} /></Container>;

  const validateStep = () => {
    const e: Record<string, string> = {};
    if (step === 0) {
      if (!services.length) e.services = 'Choose at least one thing to book.';
      if (!start) e.start = needsRange ? `Choose your ${needsStay ? 'check-in' : 'start'} date.` : 'Choose a date.';
      else if (start < todayIso()) e.start = 'Choose a date from today onwards.';
      if (needsRange) {
        if (!end) e.end = `Choose your ${needsStay ? 'check-out' : 'end'} date.`;
        else if (needsStay && end <= start) e.end = 'Check-out must be after check-in.';
        else if (!needsStay && end < start) e.end = 'The end date can’t be before the start date.';
      }
      if (needsPeople && people < 1) e.people = 'At least one guest.';
      lines.forEach((line) => {
        if (line.priced.total <= 0) e.dates = 'Those dates do not cover a chargeable stay.';
        if (line.units > line.left) e[line.service.id] = line.left > 0 ? `Only ${line.left} left for those dates.` : `${line.service.name} is already booked for those dates.`;
      });
    }
    if (step === 1) {
      if (info.name.trim().length < 2) e.name = 'Enter your full name.';
      if (!/^\S+@\S+\.\S+$/.test(info.email)) e.email = 'Enter a valid email address.';
      if (info.phone.replace(/\D/g, '').length < 9) e.phone = 'Enter a phone number with country code, e.g. +250 788 000 000.';
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => validateStep() && setStep((s) => s + 1);

  const onPaid = async (payment: Payment) => {
    if (!user || !lines.length || lines.some((line) => line.priced.total <= 0)) return;
    const bookingLines: BookingLine[] = lines.map((line) => ({
      serviceId: line.service.id,
      serviceName: line.service.name,
      units: line.units,
      unitPriceRwf: line.service.priceRwf,
      lineTotalRwf: line.priced.total,
    }));
    try {
      const booking = await createBooking({
        userId: user.id, customerName: info.name.trim(), customerEmail: info.email.trim(), customerPhone: info.phone.trim(),
        targetId: item.id, targetType: item.type, targetName: item.name, businessId: item.businessId,
        serviceId: bookingLines[0].serviceId,
        serviceName: bookingLines.length > 1 ? bookingLines.map((line) => line.serviceName).join(', ') : bookingLines[0].serviceName,
        lines: bookingLines,
        date: start, endDate: needsRange ? end : undefined,
        nights: needsRange ? lines.find((line) => line.mode === 'stay' || line.mode === 'rental')?.priced.periods : undefined,
        units: bookingLines.reduce((sum, line) => sum + line.units, 0),
        unitPriceRwf: bookingLines[0].unitPriceRwf,
        people, totalRwf: total, notes: info.notes.trim() || undefined,
      }, payment);
      setConfirmed(booking);
      toast.success('Payment received. Your booking is confirmed.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  if (confirmed) {
    const p = confirmed.payment!;
    const booked = confirmed.lines?.length ? confirmed.lines : [{ serviceName: confirmed.serviceName ?? item.name, units: confirmed.units ?? 1, lineTotalRwf: confirmed.totalRwf }];
    return (
      <Container className="max-w-2xl py-16 text-center">
        <CheckCircle2 className="mx-auto h-16 w-16 text-brand-600" aria-hidden />
        <h1 className="mt-4 font-display text-3xl font-bold text-ink">Booking confirmed</h1>
        <p className="mt-2 text-slate-600">Payment went through, so your booking at {item.name} is confirmed. A receipt has been sent to {confirmed.customerEmail}.</p>
        <dl className="mx-auto mt-8 grid max-w-md gap-3 rounded-3xl border border-slate-200 p-6 text-left text-sm">
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Reference</dt><dd className="font-semibold text-ink">{confirmed.id.toUpperCase()}</dd></div>
          {booked.map((line) => (
            <div key={line.serviceName} className="flex justify-between gap-4"><dt className="text-slate-500">{line.serviceName} × {line.units}</dt><dd className="font-semibold">{formatRwf(line.lineTotalRwf)}</dd></div>
          ))}
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Date</dt><dd className="text-right font-semibold">{needsRange && confirmed.endDate ? `${formatDate(confirmed.date)} → ${formatDate(confirmed.endDate)}` : formatDate(confirmed.date)}</dd></div>
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Paid with</dt><dd className="text-right font-semibold">{paymentMethodLabel[p.method]} ({p.account})</dd></div>
          {p.sentTo && <div className="flex justify-between gap-4"><dt className="text-slate-500">Sent to</dt><dd className="text-right font-semibold">{p.sentToLabel ?? p.sentTo}</dd></div>}
          <div className="flex justify-between gap-4"><dt className="text-slate-500">Payment ref</dt><dd className="font-semibold">{p.reference}</dd></div>
          <div className="flex justify-between border-t border-slate-100 pt-3"><dt className="text-slate-500">Status</dt><dd><Badge tone="success">Confirmed · Paid</Badge></dd></div>
          <div className="flex justify-between"><dt className="font-semibold">Total paid</dt><dd className="font-display text-lg font-bold">{formatRwf(confirmed.totalRwf)}</dd></div>
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
    { title: 'Other', items: item.services.filter((service) => pricingMode(service.unit) !== 'stay' && service.group !== 'wellness' && service.group !== 'food') },
  ].filter((group) => group.items.length);

  return (
    <Container className="py-8 lg:py-12">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden />Back</button>
      <h1 className="mt-3 font-display text-3xl font-bold text-ink sm:text-4xl">Book {item.name}</h1>
      <p className="mt-2 max-w-2xl text-slate-600">Choose one or more rooms, services or meals. You pay first, and the booking is confirmed only after payment.</p>

      <ol className="mt-6 grid grid-cols-3 gap-2" aria-label="Booking steps">
        {steps.map((label, i) => (
          <li key={label} aria-current={i === step ? 'step' : undefined} className="flex flex-col gap-2">
            <span className={cn('h-1.5 rounded-full', i <= step ? 'bg-brand-600' : 'bg-slate-200')} />
            <span className={cn('text-xs font-semibold sm:text-sm', i === step ? 'text-brand-600' : 'text-slate-500')}>{i + 1}. {label}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 rounded-3xl border border-slate-200 p-5 sm:p-7">
          {step === 0 && (
            <div className="space-y-6">
              {grouped.map((group) => (
                <fieldset key={group.title} className="space-y-2">
                  <legend className="mb-2 text-sm font-semibold text-ink">{group.title}</legend>
                  {group.items.map((service) => {
                    const on = selected.includes(service.id);
                    const mode = pricingMode(service.unit);
                    const rawMax = span ? remaining(service, data.bookings, span.start, span.end) : (service.available ?? 10);
                    const max = Number.isFinite(rawMax) ? Math.max(0, Math.floor(rawMax)) : 20;
                    const count = counts[service.id] ?? 1;
                    return (
                      <div key={service.id} className={cn('rounded-2xl border-2 p-4', on ? 'border-brand-600 bg-brand-50/60' : 'border-slate-200')}>
                        <label className="flex cursor-pointer gap-3">
                          <input type="checkbox" className="mt-1 accent-brand-600" checked={on} onChange={() => setSelected((current) => (on ? current.filter((serviceId) => serviceId !== service.id) : [...current, service.id]))} />
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                              <span className="font-semibold text-ink">{service.name}</span>
                              <span className="whitespace-nowrap font-semibold text-ink">{formatRwf(service.priceRwf)} <span className="text-sm font-normal text-slate-500">{service.unit}</span></span>
                            </span>
                            <span className="mt-1 block text-sm text-slate-600">{service.description}</span>
                          </span>
                        </label>
                        {on && mode !== 'perPerson' && (
                          <div className="mt-3 pl-7">
                            <Stepper label={mode === 'stay' ? 'Rooms' : 'Quantity'} value={Math.min(count, Math.max(max, 1))} min={1} max={Math.max(max, 1)} onChange={(value) => setCounts({ ...counts, [service.id]: value })} />
                            {errors[service.id] && <p className="mt-1 text-sm text-red-600">{errors[service.id]}</p>}
                            {span && service.available != null && <p className="mt-1 text-xs text-slate-500">{max} available for these dates</p>}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </fieldset>
              ))}
              {errors.services && <p className="text-sm text-red-600">{errors.services}</p>}

              <div className="grid gap-4 sm:grid-cols-2">
                <DatePicker
                  label={needsRange ? (needsStay ? 'Check-in' : 'From') : 'Date'}
                  required min={todayIso()} value={start}
                  isDisabled={(iso) => isNightTakenFor(demand, data.bookings, iso)}
                  onChange={(iso) => {
                    setStart(iso);
                    if (needsStay && iso && (!end || end <= iso)) setEnd(addDaysIso(iso, 1));
                  }}
                  error={errors.start}
                  hint="Booked dates cannot be chosen."
                />
                {needsRange && (
                  <DatePicker
                    label={needsStay ? 'Check-out' : 'To'}
                    required
                    min={start ? (needsStay ? addDaysIso(start, 1) : start) : todayIso()}
                    value={end}
                    isDisabled={(iso) => {
                      if (!start) return false;
                      if (needsStay) return iso <= start || isStayRangeTaken(demand, data.bookings, start, iso);
                      return iso < start || isStayRangeTaken(demand, data.bookings, start, addDaysIso(iso, 1));
                    }}
                    onChange={setEnd}
                    error={errors.end}
                    hint="Booked dates cannot be chosen."
                  />
                )}
              </div>
              {errors.dates && <p className="text-sm text-red-600">{errors.dates}</p>}
              {needsPeople && <Stepper label="Guests" value={people} min={1} max={30} onChange={setPeople} />}
              {errors.people && <p className="text-sm text-red-600">{errors.people}</p>}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Input label="Full name" required value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} error={errors.name} autoComplete="name" />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Email" type="email" required value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} error={errors.email} autoComplete="email" />
                <Input label="Phone" type="tel" required value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} error={errors.phone} autoComplete="tel" placeholder="+250 788 000 000" />
              </div>
              <Textarea label="Notes for the host" value={info.notes} onChange={(e) => setInfo({ ...info, notes: e.target.value })} placeholder="Arrival time, dietary needs, accessibility…" />
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="font-display text-xl font-bold text-ink">Pay to confirm your booking</h2>
              <p className="mb-5 mt-1 text-sm text-slate-600">Nothing is reserved until this payment goes through.</p>
              <PaymentForm amountRwf={total} defaultPhone={info.phone} payout={item.payout} onPaid={onPaid} payLabel={`Pay ${formatRwf(total)} and confirm`} />
            </div>
          )}

          {step < 2 && (
            <div className="mt-8 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
              {step > 0 ? <Button variant="ghost" onClick={() => setStep((s) => s - 1)}>Back</Button> : <span />}
              <Button onClick={next}>{step === 1 ? 'Continue to payment' : 'Continue'}</Button>
            </div>
          )}
          {step === 2 && <Button variant="ghost" className="mt-4" onClick={() => setStep(1)}>Back</Button>}
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
                    <dt className="text-slate-500">{line.service.name} × {line.units}</dt>
                    <dd className="whitespace-nowrap">{formatRwf(line.priced.total)}</dd>
                  </div>
                ))}
                {start && <div className="flex justify-between gap-3"><dt className="text-slate-500">{needsRange ? (needsStay ? 'Check-in' : 'From') : 'Date'}</dt><dd>{formatDate(start)}</dd></div>}
                {needsRange && end && <div className="flex justify-between gap-3"><dt className="text-slate-500">{needsStay ? 'Check-out' : 'To'}</dt><dd>{formatDate(end)}</dd></div>}
                {lines[0] && needsRange && <div className="flex justify-between gap-3"><dt className="text-slate-500">Length</dt><dd>{lines[0].priced.periods} {periodNoun(lines[0].mode, lines[0].priced.periods)}</dd></div>}
                {needsPeople && <div className="flex justify-between gap-3"><dt className="text-slate-500">Guests</dt><dd>{people}</dd></div>}
                <div className="flex justify-between border-t border-slate-100 pt-3 text-base"><dt className="font-semibold">Total</dt><dd className="font-display text-xl font-bold">{formatRwf(total)}</dd></div>
              </dl>
              <p className="mt-3 text-xs text-slate-500">Pay by card, MTN MoMo or Airtel Money. The booking starts only after payment. Free cancellation refunds to the same account.</p>
            </div>
          </div>
        </aside>
      </div>
    </Container>
  );
}
