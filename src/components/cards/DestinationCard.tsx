import { Link } from 'react-router-dom';
import { MapPin, Gem } from 'lucide-react';
import type { Location } from '@/types';
import { Badge, Rating, SmartImage, buttonClass } from '@/components/ui';
import { formatRwf, priceLabel } from '@/utils/format';
import { guidedVisitPrice } from '@/utils/pricing';
import { FavoriteButton } from './FavoriteButton';

export function DestinationCard({ location, compact }: { location: Location; compact?: boolean }) {
  const href = `/explore?location=${location.id}#explore-listings`;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lift">
      <div className="relative">
        <Link to={href} tabIndex={-1} aria-hidden>
          <SmartImage src={location.image} alt={location.name} className="aspect-[4/3] w-full" />
        </Link>
        <div className="absolute left-3 top-3 flex gap-2">
          {location.isHiddenGem ? <Badge tone="solid" icon={<Gem className="h-3.5 w-3.5" />}>Hidden gem</Badge> : <Badge tone="glass">{location.category}</Badge>}
        </div>
        <FavoriteButton
          className="absolute right-3 top-3"
          item={{ itemId: location.id, itemType: 'location', title: location.name, subtitle: location.district, image: location.image, href }}
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="min-w-0 font-display text-lg font-bold leading-snug text-ink">
            <Link to={href} className="hover:text-brand-700">{location.name}</Link>
          </h3>
          <Rating value={location.rating} className="shrink-0 text-sm" />
        </div>
        <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="h-3.5 w-3.5" aria-hidden /> {location.district}, {location.province}
        </p>
        {!compact && <p className="mt-3 line-clamp-2 text-[15px] text-slate-600">{location.shortDescription}</p>}
        <p className="mt-3 text-sm text-slate-500">
          Guided visit from <span className="font-display text-lg font-bold text-ink">{formatRwf(guidedVisitPrice(location.priceLevel))}</span>
          <span className="text-slate-500"> · {priceLabel(location.priceLevel)}</span>
        </p>
        <div className="mt-auto pt-4">
          <Link to={href} className={buttonClass('secondary', 'sm')}>Explore {location.isHiddenGem ? 'this gem' : location.name.split(' ')[0]}</Link>
        </div>
      </div>
    </article>
  );
}
