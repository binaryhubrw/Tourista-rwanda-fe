import { Link } from 'react-router-dom';
import { MapPin, Leaf } from 'lucide-react';
import type { Business } from '@/types';
import { Badge, Rating, SmartImage, buttonClass } from '@/components/ui';
import { formatRwf } from '@/utils/format';
import { fromPrice } from '@/utils/pricing';
import { listingKindOf } from '@/utils/catalog';
import { withExploreDates } from '@/utils/explore';
import { FavoriteButton } from './FavoriteButton';

export function BusinessCard({ business, showActions = true, checkin = '', checkout = '' }: { business: Business; showActions?: boolean; checkin?: string; checkout?: string }) {
  const href = withExploreDates(`/businesses/${business.id}`, checkin, checkout);
  const from = fromPrice(business);
  const label = listingKindOf(business);
  const cars = business.services.filter((s) => s.group === 'vehicle');
  const carFrom = cars.length ? cars.reduce((a, c) => (c.priceRwf < a.priceRwf ? c : a)) : null;
  const carCount = cars.reduce((n, s) => n + (s.available ?? 1), 0);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lift">
      <div className="relative">
        <SmartImage src={business.image} alt={business.name} className="aspect-[16/10] w-full" />
        <Badge tone="glass" className="absolute left-3 top-3">{label}</Badge>
        <FavoriteButton
          className="absolute right-3 top-3"
          item={{ itemId: business.id, itemType: 'business', title: business.name, subtitle: `${label}, ${business.district}`, image: business.image, href }}
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 font-display text-lg font-bold leading-snug text-ink">
            <Link to={href} className="hover:text-brand-600">{business.name}</Link>
          </h3>
          <Rating value={business.rating} className="shrink-0 text-sm" />
        </div>
        <p className="mt-0.5 text-sm text-slate-500">by {business.ownerName}</p>
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><MapPin className="h-3.5 w-3.5" aria-hidden />{business.district}</p>
        <p className="mt-3 line-clamp-2 text-[15px] text-slate-600">{business.description}</p>
        {business.badges.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {business.badges.map((b) => <Badge key={b} icon={<Leaf className="h-3 w-3" />}>{b}</Badge>)}
          </div>
        )}
        {from && (
          <p className="mt-3 text-sm text-slate-500">
            From <span className="font-display text-lg font-bold text-ink">{formatRwf(from.priceRwf)}</span> {from.unit}
          </p>
        )}
        {carFrom && (
          <p className="mt-1 text-sm text-slate-500">
            {carCount} {carCount === 1 ? 'car' : 'cars'} from <span className="font-semibold text-ink">{formatRwf(carFrom.priceRwf)}</span> {carFrom.unit}
          </p>
        )}
        {showActions && (
          <div className="mt-auto flex flex-wrap gap-2 pt-4">
            <Link to={href} className={buttonClass('secondary', 'sm')}>View details</Link>
            <Link to={href} className={buttonClass('primary', 'sm')}>Book</Link>
          </div>
        )}
      </div>
    </article>
  );
}
