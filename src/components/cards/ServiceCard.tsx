import { Link } from 'react-router-dom';
import { MapPin } from 'lucide-react';
import type { Business, Service } from '@/types';
import { Badge, SmartImage, buttonClass } from '@/components/ui';
import { formatRwf } from '@/utils/format';
import { listingKindOf, vehicleCarry, vehiclePhoto } from '@/utils/catalog';

export function ServiceCard({ service, business }: { service: Service; business: Business }) {
  const href = `/businesses/${business.id}#offer-${service.id}`;
  const kind = service.group === 'vehicle'
    ? `${service.brand ? `${service.brand} · ` : ''}${service.category ?? 'Car'}`
    : (service.category ?? service.group ?? 'Service');
  const fleet = service.group === 'vehicle' ? (service.available ?? 1) : null;
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lift">
      <div className="relative">
        <SmartImage src={service.group === 'vehicle' ? vehiclePhoto(service) : business.image} alt="" className="aspect-[16/10] w-full" />
        <Badge tone="glass" className="absolute left-3 top-3">{kind}</Badge>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold leading-snug text-ink">
          <Link to={href} className="hover:text-brand-600">{service.name}</Link>
        </h3>
        <p className="mt-0.5 text-sm text-slate-500">{business.name}</p>
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" aria-hidden />{listingKindOf(business)} · {business.district}</p>
        <p className="mt-3 line-clamp-2 text-[15px] text-slate-600">{service.description}</p>
        <p className="mt-3 text-sm text-slate-500">
          <span className="font-display text-lg font-bold text-ink">{formatRwf(service.priceRwf)}</span> {service.unit}
          {service.available != null && service.group === 'room' && <span> · {service.available} {service.available === 1 ? 'room' : 'rooms'}</span>}
          {fleet != null && <span> · {fleet} {fleet === 1 ? 'car' : 'cars'} · {vehicleCarry(service).label}</span>}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link to={href} className={buttonClass('secondary', 'sm')}>View listing</Link>
          <Link to={`/book/business/${business.id}?services=${service.id}`} className={buttonClass('primary', 'sm')}>Book</Link>
        </div>
      </div>
    </article>
  );
}
