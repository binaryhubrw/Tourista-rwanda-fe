import { Link } from 'react-router-dom';
import type { SearchResult } from '@/types';
import { Badge, Rating, SmartImage } from '@/components/ui';

const typeLabel = { location: 'Destination', experience: 'Experience', business: 'Business' };

export function SearchResultCard({ result }: { result: SearchResult }) {
  return (
    <Link to={result.href} className="group flex gap-4 rounded-2xl border border-slate-200 bg-white p-3 transition-colors hover:border-brand-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600">
      <SmartImage src={result.image} alt={result.title} className="h-24 w-28 shrink-0 rounded-xl sm:w-36" />
      <div className="min-w-0 flex-1 py-1">
        <div className="flex flex-wrap gap-1.5">
          <Badge>{typeLabel[result.type]}</Badge>
          <Badge tone="neutral">{result.category}</Badge>
        </div>
        <h3 className="mt-1.5 truncate font-display text-lg font-bold text-ink group-hover:text-brand-700">{result.title}</h3>
        <p className="truncate text-sm text-slate-500">{result.subtitle}</p>
        {result.description && <p className="mt-1 line-clamp-2 text-sm text-slate-600">{result.description}</p>}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
          <Rating value={result.rating} className="text-sm" />
          {result.priceLabel && <p className="text-sm font-semibold text-ink">{result.priceLabel}</p>}
        </div>
      </div>
    </Link>
  );
}
