import { Link } from 'react-router-dom';
import { CalendarDays, MapPin, Pencil, Trash2 } from 'lucide-react';
import type { Itinerary } from '@/types';
import { SmartImage, buttonClass } from '@/components/ui';
import { daysBetween, formatDate } from '@/utils/format';

export function ItineraryCard({ itinerary, onDelete }: { itinerary: Itinerary; onDelete?: (it: Itinerary) => void }) {
  const cover = itinerary.stops[0]?.image;
  const days = daysBetween(itinerary.startDate, itinerary.endDate);
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white sm:flex-row">
      <SmartImage src={cover} alt={itinerary.title} className="aspect-[16/9] w-full sm:aspect-auto sm:w-48" />
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold text-ink"><Link to={`/dashboard/itineraries/${itinerary.id}`} className="hover:text-brand-700">{itinerary.title}</Link></h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-600">{itinerary.description}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4 text-brand-600" aria-hidden />{formatDate(itinerary.startDate, { day: 'numeric', month: 'short' })} – {formatDate(itinerary.endDate)}{days ? `, ${days} days` : ''}</span>
          <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-brand-600" aria-hidden />{itinerary.stops.length} stops</span>
        </div>
        <div className="mt-auto flex flex-wrap gap-2 pt-4">
          <Link to={`/dashboard/itineraries/${itinerary.id}`} className={buttonClass('primary', 'sm')}>View details</Link>
          <Link to={`/itinerary/${itinerary.id}`} className={buttonClass('secondary', 'sm')}><Pencil className="h-4 w-4" aria-hidden />Edit</Link>
          {onDelete && (
            <button onClick={() => onDelete(itinerary)} className={buttonClass('ghost', 'sm', 'text-red-600 hover:bg-red-50')}>
              <Trash2 className="h-4 w-4" aria-hidden />Delete
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
