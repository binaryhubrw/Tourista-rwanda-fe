import { useMemo, useState } from 'react';
import { Plus, Minus, LocateFixed } from 'lucide-react';
import type { Coordinates } from '@/types';
import { cn } from '@/utils/cn';

export type MapPointKind = 'attraction' | 'cultural' | 'accommodation' | 'restaurant' | 'business' | 'guide';

export interface MapPoint {
  id: string;
  name: string;
  coordinates: Coordinates;
  kind: MapPointKind;
}

export const kindStyle: Record<MapPointKind, { label: string; fill: string; stroke: string }> = {
  attraction: { label: 'Tourist attractions', fill: '#00628B', stroke: '#ffffff' },
  cultural: { label: 'Cultural sites', fill: '#003B53', stroke: '#ffffff' },
  accommodation: { label: 'Eco-friendly stays', fill: '#5FA9C6', stroke: '#ffffff' },
  restaurant: { label: 'Restaurants', fill: '#ffffff', stroke: '#00628B' },
  business: { label: 'Local businesses', fill: '#99C9DC', stroke: '#003B53' },
  guide: { label: 'Tour guides', fill: '#2A87AB', stroke: '#ffffff' },
};

// Simple equirectangular projection over Rwanda's bounding box.
const BOUNDS = { west: 28.8, east: 30.95, north: -1.0, south: -2.9 };
const W = 1000;
const SCALE = W / (BOUNDS.east - BOUNDS.west);
const H = Math.round((BOUNDS.north - BOUNDS.south) * SCALE);
export const project = ({ lat, lng }: Coordinates) => ({ x: (lng - BOUNDS.west) * SCALE, y: (BOUNDS.north - lat) * SCALE });

// Simplified national border and Lake Kivu shoreline (lng, lat).
const border: [number, number][] = [
  [29.24, -1.67], [29.38, -1.5], [29.6, -1.38], [29.82, -1.32], [30.0, -1.25], [30.15, -1.25], [30.34, -1.1], [30.47, -1.06],
  [30.56, -1.35], [30.74, -1.6], [30.84, -1.9], [30.89, -2.1], [30.85, -2.32], [30.57, -2.41], [30.3, -2.38], [30.1, -2.55],
  [29.95, -2.8], [29.7, -2.81], [29.35, -2.82], [29.05, -2.75], [28.87, -2.5], [29.0, -2.3], [29.05, -2.0], [29.13, -1.8],
];
const kivu: [number, number][] = [[29.24, -1.67], [29.13, -1.8], [29.05, -2.0], [29.0, -2.3], [28.87, -2.5], [28.8, -2.5], [28.8, -1.7], [29.05, -1.62]];
const toPath = (pts: [number, number][]) =>
  pts.map(([lng, lat], i) => { const p = project({ lat, lng }); return `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }).join(' ') + ' Z';

interface Props {
  points: MapPoint[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  userPosition?: Coordinates | null;
  className?: string;
  interactive?: boolean;
  /** Dots are the default; names are used on the public map. */
  markers?: 'dots' | 'names';
}

/**
 * Lightweight SVG map of Rwanda.
 * To switch to Google Maps / Leaflet / Mapbox, keep this props contract (points, selectedId, onSelect)
 * and render the provider's map + markers inside a new component with the same signature.
 */
export function RwandaMap({ points, selectedId, onSelect, userPosition, className, interactive = true, markers = 'dots' }: Props) {
  const [zoom, setZoom] = useState(1);
  const selected = points.find((p) => p.id === selectedId);

  const viewBox = useMemo(() => {
    const w = W / zoom;
    const h = H / zoom;
    const c = selected ? project(selected.coordinates) : { x: W / 2, y: H / 2 };
    const x = Math.min(Math.max(c.x - w / 2, 0), W - w);
    const y = Math.min(Math.max(c.y - h / 2, 0), H - h);
    return `${x} ${y} ${w} ${h}`;
  }, [zoom, selected]);

  const r = 9 / Math.sqrt(zoom);
  const me = userPosition ? project(userPosition) : null;

  return (
    <div className={cn('relative overflow-hidden rounded-3xl border border-brand-100 bg-brand-50', className)}>
      <svg viewBox={viewBox} className="h-full w-full transition-[viewBox] duration-300" role="img" aria-label="Map of Rwanda with tourism locations">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#CCE4EE" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />
        <path d={toPath(kivu)} fill="#99C9DC" />
        <path d={toPath(border)} fill="#ffffff" stroke="#00628B" strokeWidth={2.5 / zoom} strokeLinejoin="round" />
        <text {...project({ lat: -2.15, lng: 28.86 })} fill="#004F70" fontSize={16 / Math.sqrt(zoom)} fontStyle="italic">Lake Kivu</text>

        {points.map((p) => {
          const { x, y } = project(p.coordinates);
          const s = kindStyle[p.kind];
          const isSel = p.id === selectedId;
          return (
            <g
              key={p.id}
              transform={`translate(${x} ${y})`}
              onClick={() => interactive && onSelect?.(p.id)}
              className={interactive ? 'cursor-pointer' : undefined}
              role={interactive ? 'button' : undefined}
              tabIndex={interactive ? 0 : undefined}
              aria-label={interactive ? `${p.name}, ${s.label}` : undefined}
              onKeyDown={(e) => interactive && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect?.(p.id))}
            >
              {markers === 'names' ? (
                <>
                  {isSel && <circle r={r * 2.2} fill="#00628B" opacity={0.12} pointerEvents="none" />}
                  <text textAnchor="middle" dominantBaseline="middle" fontSize={(isSel ? 17 : 15) / Math.sqrt(zoom)} fontWeight={isSel ? 800 : 700} fill={isSel ? '#00628B' : '#14232B'} stroke="#ffffff" strokeWidth={5 / Math.sqrt(zoom)} paintOrder="stroke">
                    {p.name}
                  </text>
                </>
              ) : (
                <>
                  {isSel && <circle r={r * 2.6} fill="#00628B" opacity={0.18}><animate attributeName="r" values={`${r * 1.6};${r * 2.8};${r * 1.6}`} dur="2s" repeatCount="indefinite" /></circle>}
                  <circle r={isSel ? r * 1.5 : r} fill={s.fill} stroke={isSel ? '#002838' : s.stroke} strokeWidth={isSel ? 3 / Math.sqrt(zoom) : 2 / Math.sqrt(zoom)} />
                  {(isSel || zoom >= 2) && (
                    <text y={-r * 2} textAnchor="middle" fontSize={15 / Math.sqrt(zoom)} fontWeight={700} fill="#14232B" stroke="#ffffff" strokeWidth={4 / Math.sqrt(zoom)} paintOrder="stroke">
                      {p.name}
                    </text>
                  )}
                </>
              )}
            </g>
          );
        })}

        {me && (
          <g transform={`translate(${me.x} ${me.y})`} aria-label="Your location">
            <circle r={r * 1.1} fill="#ffffff" stroke="#00628B" strokeWidth={3 / Math.sqrt(zoom)} />
            <circle r={r * 0.5} fill="#00628B" />
          </g>
        )}
      </svg>

      {interactive && <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <button onClick={() => setZoom((z) => Math.min(z * 1.6, 5))} className="grid h-9 w-9 place-items-center hover:bg-brand-50" aria-label="Zoom in"><Plus className="h-4 w-4" /></button>
        <button onClick={() => setZoom((z) => Math.max(z / 1.6, 1))} className="grid h-9 w-9 place-items-center border-t border-slate-200 hover:bg-brand-50" aria-label="Zoom out"><Minus className="h-4 w-4" /></button>
        <button onClick={() => setZoom(1)} className="grid h-9 w-9 place-items-center border-t border-slate-200 hover:bg-brand-50" aria-label="Reset view"><LocateFixed className="h-4 w-4" /></button>
      </div>}
    </div>
  );
}

export function MapLegend({ kinds }: { kinds: MapPointKind[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
      {kinds.map((k) => (
        <li key={k} className="inline-flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full border-2" style={{ background: kindStyle[k].fill, borderColor: kindStyle[k].stroke === '#ffffff' ? kindStyle[k].fill : kindStyle[k].stroke }} />
          {kindStyle[k].label}
        </li>
      ))}
    </ul>
  );
}
