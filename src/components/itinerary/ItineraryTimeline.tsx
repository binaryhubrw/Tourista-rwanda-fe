import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, GripVertical, Trash2 } from 'lucide-react';
import type { ItineraryStop } from '@/types';
import { SmartImage } from '@/components/ui';
import { formatDate } from '@/utils/format';
import { cn } from '@/utils/cn';

interface Props {
  stops: ItineraryStop[];
  startDate?: string;
  editable?: boolean;
  onChange?: (stops: ItineraryStop[]) => void;
}

const dateForDay = (start: string | undefined, day: number) => {
  if (!start) return null;
  const d = new Date(`${start}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  d.setDate(d.getDate() + day - 1);
  return formatDate(d.toISOString().slice(0, 10), { weekday: 'short', day: 'numeric', month: 'short' });
};

/** Re-number days so stop N is on day N (one stop per day, in order). */
export const renumber = (stops: ItineraryStop[]) => stops.map((s, i) => ({ ...s, day: i + 1 }));

export function ItineraryTimeline({ stops, startDate, editable, onChange }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const move = (from: number, to: number) => {
    if (to < 0 || to >= stops.length || from === to) return;
    const next = [...stops];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange?.(renumber(next));
  };
  const remove = (i: number) => onChange?.(renumber(stops.filter((_, idx) => idx !== i)));
  const setNote = (i: number, note: string) => onChange?.(stops.map((s, idx) => (idx === i ? { ...s, note } : s)));

  return (
    <ol className="relative">
      {stops.map((stop, i) => (
        <li
          key={stop.id}
          draggable={editable}
          onDragStart={() => setDragIndex(i)}
          onDragOver={(e) => { e.preventDefault(); setOverIndex(i); }}
          onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
          onDrop={() => { if (dragIndex !== null) move(dragIndex, i); setDragIndex(null); setOverIndex(null); }}
          className={cn('relative grid grid-cols-[48px_1fr] gap-3 pb-6 sm:grid-cols-[64px_1fr] sm:gap-4', dragIndex === i && 'opacity-50')}
        >
          {/* Day marker + connecting line */}
          <div className="relative flex flex-col items-center">
            <span className="z-10 grid h-12 w-12 place-items-center rounded-full bg-brand-600 text-center font-display text-white sm:h-14 sm:w-14">
              <span className="leading-none"><span className="block text-[10px] font-semibold opacity-80">Day</span><span className="text-lg font-bold">{stop.day}</span></span>
            </span>
            {i < stops.length - 1 && <span className="absolute top-12 h-[calc(100%-24px)] w-0.5 bg-brand-200 sm:top-14" aria-hidden />}
          </div>

          <div className={cn('flex flex-col gap-3 rounded-2xl border bg-white p-3 sm:flex-row', overIndex === i && dragIndex !== null && dragIndex !== i ? 'border-brand-600 ring-2 ring-brand-100' : 'border-slate-200')}>
            <SmartImage src={stop.image} alt={stop.locationName} className="aspect-[16/9] w-full rounded-xl sm:aspect-square sm:h-24 sm:w-24" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-600">{dateForDay(startDate, stop.day) ?? `Day ${stop.day}`}</p>
              <h3 className="font-display text-lg font-bold text-ink">
                <Link to={`/explore?location=${stop.locationId}#explore-listings`} className="hover:text-brand-700">{stop.locationName}</Link>
              </h3>
              {editable ? (
                <>
                  <label htmlFor={`note-${stop.id}`} className="sr-only">Note for {stop.locationName}</label>
                  <input
                    id={`note-${stop.id}`}
                    value={stop.note ?? ''}
                    onChange={(e) => setNote(i, e.target.value)}
                    placeholder="Add a note, e.g. morning game drive"
                    className="mt-1 w-full rounded-lg border border-transparent bg-slate-50 px-2.5 py-1.5 text-sm focus:border-brand-300 focus:bg-white focus:outline-none"
                  />
                </>
              ) : (
                stop.note && <p className="mt-1 text-sm text-slate-600">{stop.note}</p>
              )}
            </div>
            {editable && (
              <div className="flex items-center justify-end gap-1 sm:flex-col sm:justify-center">
                <span className="hidden cursor-grab text-slate-400 sm:block" title="Drag to reorder" aria-hidden><GripVertical className="h-5 w-5" /></span>
                <button onClick={() => move(i, i - 1)} disabled={i === 0} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-brand-50 disabled:opacity-30" aria-label={`Move ${stop.locationName} earlier`}><ArrowUp className="h-4 w-4" /></button>
                <button onClick={() => move(i, i + 1)} disabled={i === stops.length - 1} className="grid h-8 w-8 place-items-center rounded-lg text-slate-600 hover:bg-brand-50 disabled:opacity-30" aria-label={`Move ${stop.locationName} later`}><ArrowDown className="h-4 w-4" /></button>
                <button onClick={() => remove(i)} className="grid h-8 w-8 place-items-center rounded-lg text-red-600 hover:bg-red-50" aria-label={`Remove ${stop.locationName}`}><Trash2 className="h-4 w-4" /></button>
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
