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
  /** When set, the marker shows this many business icons. */
  count?: number;
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
const KM_PER_X = ((BOUNDS.east - BOUNDS.west) / W) * 111.32 * Math.cos((1.95 * Math.PI) / 180);
const KM_PER_Y = ((BOUNDS.north - BOUNDS.south) / H) * 111.32;

const kivu: [number, number][] = [[29.24, -1.67], [29.13, -1.8], [29.05, -2.0], [29.0, -2.3], [28.87, -2.5], [28.8, -2.5], [28.8, -1.7], [29.05, -1.62]];

const lakes: { name: string; lng: number; lat: number; rxKm: number; ryKm: number }[] = [
  { name: 'Burera', lng: 29.83, lat: -1.43, rxKm: 8, ryKm: 6 },
  { name: 'Ruhondo', lng: 29.76, lat: -1.53, rxKm: 7, ryKm: 5 },
  { name: 'Muhazi', lng: 30.40, lat: -1.87, rxKm: 16, ryKm: 4 },
  { name: 'Ihema', lng: 30.75, lat: -1.93, rxKm: 9, ryKm: 6 },
  { name: 'Mugesera', lng: 30.45, lat: -2.17, rxKm: 10, ryKm: 5 },
  { name: 'Rweru', lng: 30.55, lat: -2.38, rxKm: 8, ryKm: 6 },
];

const rivers: { name: string; line: [number, number][] }[] = [
  { name: 'Nyabarongo', line: [[29.55, -1.78], [29.78, -1.92], [30.02, -2.04], [30.22, -2.14], [30.40, -2.22]] },
  { name: 'Akagera', line: [[30.72, -1.38], [30.78, -1.62], [30.80, -1.88], [30.76, -2.12], [30.62, -2.32]] },
];

const volcanoes: { name: string; lng: number; lat: number }[] = [
  { name: 'Karisimbi', lng: 29.45, lat: -1.51 },
  { name: 'Bisoke', lng: 29.49, lat: -1.46 },
  { name: 'Muhabura', lng: 29.68, lat: -1.39 },
];

const parks: { name: string; lng: number; lat: number; rxKm: number; ryKm: number }[] = [
  { name: 'Volcanoes NP', lng: 29.52, lat: -1.45, rxKm: 18, ryKm: 12 },
  { name: 'Akagera NP', lng: 30.70, lat: -1.72, rxKm: 22, ryKm: 32 },
  { name: 'Nyungwe NP', lng: 29.22, lat: -2.48, rxKm: 22, ryKm: 16 },
];

const neighbors: { name: string; lng: number; lat: number }[] = [
  { name: 'Uganda', lng: 30.05, lat: -1.12 },
  { name: 'Tanzania', lng: 30.90, lat: -2.08 },
  { name: 'Burundi', lng: 29.72, lat: -2.86 },
  { name: 'DRC', lng: 28.95, lat: -2.05 },
];

const meridians = [29, 29.5, 30, 30.5];
const parallels = [-1.5, -2, -2.5];
const toPath = (pts: [number, number][]) =>
  pts.map(([lng, lat], i) => { const p = project({ lat, lng }); return `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }).join(' ') + ' Z';
const toLine = (pts: [number, number][]) =>
  pts.map(([lng, lat], i) => { const p = project({ lat, lng }); return `${i ? 'L' : 'M'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`; }).join(' ');

function borderSpan(from: number, to: number) {
  const out: [number, number][] = [];
  let i = from;
  while (true) {
    out.push(border[i]);
    if (i === to) break;
    i = (i + 1) % border.length;
  }
  return out;
}

/** Junctions of the five provinces, on the national border and around Kigali. */
const WN: [number, number] = [29.49, -1.44];
const NE: [number, number] = [30.24, -1.18];
const ES: [number, number] = [30.38, -2.40];
const SW: [number, number] = [29.20, -2.78];
const nws: [number, number] = [29.70, -1.92];
const kigali: [number, number][] = [
  [29.97, -1.91], [30.07, -1.88], [30.16, -1.92], [30.18, -1.98],
  [30.13, -2.04], [30.04, -2.06], [29.96, -2.02], [29.94, -1.96],
];

const provinces: { name: string; fill: string; ring: [number, number][]; label: [number, number] }[] = [
  {
    name: 'Northern', fill: '#d4ebf3', label: [30.02, -1.48],
    ring: [WN, ...borderSpan(2, 5), NE, [30.18, -1.52], [30.12, -1.72], kigali[1], kigali[0], kigali[7], nws, [29.58, -1.68], WN],
  },
  {
    name: 'Eastern', fill: '#eaf6fa', label: [30.58, -1.88],
    ring: [NE, ...borderSpan(6, 13), ES, [30.30, -2.26], [30.22, -2.12], kigali[4], kigali[3], kigali[2], kigali[1], [30.12, -1.72], [30.18, -1.52], NE],
  },
  {
    name: 'Southern', fill: '#c5e3ee', label: [29.88, -2.48],
    ring: [ES, ...borderSpan(14, 18), SW, [29.42, -2.42], nws, kigali[7], kigali[6], kigali[5], kigali[4], [30.22, -2.12], [30.30, -2.26], ES],
  },
  {
    name: 'Western', fill: '#f3fafc', label: [29.22, -2.12],
    ring: [SW, ...borderSpan(19, 1), WN, [29.58, -1.68], nws, [29.42, -2.42], SW],
  },
  {
    name: 'Kigali', fill: '#9fd0e0', label: [30.06, -1.97],
    ring: kigali,
  },
];

const provinceBorders: [number, number][][] = [
  [WN, [29.58, -1.68], nws],
  [nws, [29.42, -2.42], SW],
  [nws, kigali[7]],
  [NE, [30.18, -1.52], [30.12, -1.72], kigali[1]],
  [ES, [30.30, -2.26], [30.22, -2.12], kigali[4]],
  kigali,
];

const MAX_ICONS = 5;

function markerSize(point: MapPoint, scale: number, names: boolean) {
  if (!names) return { w: 22 * scale, h: 22 * scale };
  const shown = point.count != null ? Math.min(Math.max(point.count, 1), MAX_ICONS) : 0;
  const icon = 11 * scale;
  const label = Math.max(48, point.name.length * 7.2) * scale;
  return {
    w: Math.max(shown > 1 ? shown * icon * 1.55 : icon * 2, label),
    h: (shown ? 52 : 22) * scale,
  };
}

/** Push overlapping markers apart in map space, keeping a leader back to the true point. */
function spreadOverlapping(points: MapPoint[], zoom: number, names: boolean) {
  const scale = 1 / Math.sqrt(zoom);
  const placed = points.map((point) => {
    const { x, y } = project(point.coordinates);
    return { point, x, y, ox: x, oy: y };
  });
  for (let round = 0; round < 48; round++) {
    let moved = false;
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        const sa = markerSize(a.point, scale, names);
        const sb = markerSize(b.point, scale, names);
        const minDx = (sa.w + sb.w) / 2 + 14 * scale;
        const minDy = (sa.h + sb.h) / 2 + 16 * scale;
        const dx = b.x - a.x || 0.01 * (i % 2 ? 1 : -1);
        const dy = b.y - a.y || 0.01 * (j % 2 ? 1 : -1);
        const overlapX = minDx - Math.abs(dx);
        const overlapY = minDy - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;
        moved = true;
        const push = 0.55;
        if (overlapX <= overlapY) {
          const dir = Math.sign(dx) || 1;
          a.x -= dir * overlapX * push;
          b.x += dir * overlapX * push;
        } else {
          const dir = Math.sign(dy) || 1;
          a.y -= dir * overlapY * push;
          b.y += dir * overlapY * push;
        }
      }
    }
    if (!moved) break;
  }
  placed.forEach((item) => {
    item.x = Math.min(Math.max(item.x, 28), W - 28);
    item.y = Math.min(Math.max(item.y, 28), H - 28);
  });
  return placed;
}

/** Simple store-front icon, sized in projected map units. */
function StoreIcon({ size, fill, stroke, strokeWidth }: { size: number; fill: string; stroke: string; strokeWidth: number }) {
  const s = size;
  return (
    <g>
      <path
        d={`M ${-s} ${s * 0.7} V ${-s * 0.05} L 0 ${-s} L ${s} ${-s * 0.05} V ${s * 0.7} Z`}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
      />
      <rect x={-s * 0.28} y={s * 0.08} width={s * 0.56} height={s * 0.62} fill={stroke} rx={s * 0.06} />
    </g>
  );
}

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
  const placed = useMemo(() => spreadOverlapping(points, zoom, markers === 'names'), [points, zoom, markers]);
  const scale = 1 / Math.sqrt(zoom);
  const visibleKm = (W / zoom) * KM_PER_X;
  const scaleKm = visibleKm > 180 ? 100 : visibleKm > 90 ? 50 : visibleKm > 40 ? 20 : 10;
  const scalePct = Math.min(42, (scaleKm / visibleKm) * 100);
  const kivuLabel = project({ lat: -2.08, lng: 29.02 });
  const capital = project({ lat: -1.95, lng: 30.06 });

  return (
    <div className={cn('relative overflow-hidden rounded-3xl border border-brand-100 bg-brand-50', className)}>
      <svg viewBox={viewBox} className="h-full w-full transition-[viewBox] duration-300" role="img" aria-label="Map of Rwanda showing provinces, lakes, parks and businesses">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="#CCE4EE" strokeWidth="0.8" />
          </pattern>
        </defs>
        <rect width={W} height={H} fill="url(#grid)" />
        {meridians.map((lng) => {
          const a = project({ lat: BOUNDS.north, lng });
          const b = project({ lat: BOUNDS.south, lng });
          return <line key={`m${lng}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#b7d7e4" strokeWidth={0.8} strokeDasharray="4 6" />;
        })}
        {parallels.map((lat) => {
          const a = project({ lat, lng: BOUNDS.west });
          const b = project({ lat, lng: BOUNDS.east });
          return <line key={`p${lat}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#b7d7e4" strokeWidth={0.8} strokeDasharray="4 6" />;
        })}
        {provinces.map((province) => (
          <path key={province.name} d={toPath(province.ring)} fill={province.fill} stroke="none" />
        ))}
        {parks.map((park) => {
          const p = project({ lat: park.lat, lng: park.lng });
          return (
            <ellipse key={park.name} cx={p.x} cy={p.y} rx={park.rxKm / KM_PER_X} ry={park.ryKm / KM_PER_Y} fill="#7eb89a" fillOpacity={0.22} stroke="#2f6b4f" strokeWidth={1.2 / zoom} strokeDasharray={`${6 / zoom} ${4 / zoom}`} />
          );
        })}
        {rivers.map((river) => (
          <path key={river.name} d={toLine(river.line)} fill="none" stroke="#3d8fb3" strokeWidth={2 / zoom} strokeLinecap="round" opacity={0.75} />
        ))}
        <path d={toPath(kivu)} fill="#6eb3cc" />
        {lakes.map((lake) => {
          const p = project({ lat: lake.lat, lng: lake.lng });
          return <ellipse key={lake.name} cx={p.x} cy={p.y} rx={lake.rxKm / KM_PER_X} ry={lake.ryKm / KM_PER_Y} fill="#6eb3cc" stroke="#4a93ad" strokeWidth={0.8 / zoom} />;
        })}
        <path d={toPath(border)} fill="none" stroke="#00628B" strokeWidth={2.5 / zoom} strokeLinejoin="round" />
        {provinceBorders.map((line, i) => (
          <path key={i} d={i === provinceBorders.length - 1 ? toPath(line) : toLine(line)} fill="none" stroke="#2A87AB" strokeWidth={1.6 / zoom} strokeLinejoin="round" opacity={0.85} />
        ))}
        {volcanoes.map((peak) => {
          const p = project({ lat: peak.lat, lng: peak.lng });
          const s = 7 * scale;
          return (
            <g key={peak.name} transform={`translate(${p.x} ${p.y})`} pointerEvents="none">
              <polygon points={`0,${-s * 1.4} ${s * 1.1},${s * 0.7} ${-s * 1.1},${s * 0.7}`} fill="#8a6a4a" stroke="#ffffff" strokeWidth={1.2 * scale} />
            </g>
          );
        })}
        {provinces.map((province) => {
          const p = project({ lat: province.label[1], lng: province.label[0] });
          return (
            <text key={`${province.name}-label`} x={p.x} y={p.y} textAnchor="middle" fill="#004F70" fontSize={13 * scale} fontWeight={700} fontStyle="italic" opacity={0.7} stroke="#ffffff" strokeWidth={3.5 * scale} paintOrder="stroke" pointerEvents="none">
              {province.name}
            </text>
          );
        })}
        {parks.map((park) => {
          const p = project({ lat: park.lat, lng: park.lng });
          return (
            <text key={`${park.name}-label`} x={p.x} y={p.y - park.ryKm / KM_PER_Y - 4} textAnchor="middle" fill="#1f5a3c" fontSize={10 * scale} fontWeight={700} stroke="#ffffff" strokeWidth={3 * scale} paintOrder="stroke" pointerEvents="none">{park.name}</text>
          );
        })}
        <text x={kivuLabel.x} y={kivuLabel.y} textAnchor="middle" fill="#004F70" fontSize={14 * scale} fontStyle="italic" fontWeight={700} stroke="#ffffff" strokeWidth={3 * scale} paintOrder="stroke" pointerEvents="none">Lake Kivu</text>
        {lakes.map((lake) => {
          const p = project({ lat: lake.lat, lng: lake.lng });
          return (
            <text key={`${lake.name}-label`} x={p.x} y={p.y + lake.ryKm / KM_PER_Y + 10 * scale} textAnchor="middle" fill="#004F70" fontSize={9 * scale} fontStyle="italic" stroke="#ffffff" strokeWidth={2.5 * scale} paintOrder="stroke" pointerEvents="none">{lake.name}</text>
          );
        })}
        {rivers.map((river) => {
          const mid = river.line[Math.floor(river.line.length / 2)];
          const p = project({ lat: mid[1], lng: mid[0] });
          return (
            <text key={`${river.name}-label`} x={p.x} y={p.y - 6 * scale} textAnchor="middle" fill="#2a6f8a" fontSize={9 * scale} fontStyle="italic" stroke="#ffffff" strokeWidth={2.5 * scale} paintOrder="stroke" pointerEvents="none">{river.name}</text>
          );
        })}
        {neighbors.map((place) => {
          const p = project({ lat: place.lat, lng: place.lng });
          return (
            <text key={place.name} x={p.x} y={p.y} textAnchor="middle" fill="#64748b" fontSize={13 * scale} fontWeight={700} letterSpacing={1.2} pointerEvents="none">{place.name}</text>
          );
        })}
        {meridians.map((lng) => {
          const p = project({ lat: BOUNDS.south + 0.08, lng });
          return <text key={`ml${lng}`} x={p.x} y={p.y} textAnchor="middle" fill="#7aa0b0" fontSize={9 * scale} pointerEvents="none">{lng.toFixed(1)}°E</text>;
        })}
        {parallels.map((lat) => {
          const p = project({ lat, lng: BOUNDS.west + 0.08 });
          return <text key={`pl${lat}`} x={p.x} y={p.y} textAnchor="start" fill="#7aa0b0" fontSize={9 * scale} pointerEvents="none">{Math.abs(lat).toFixed(1)}°S</text>;
        })}

        {placed.map(({ point: p, x, y, ox, oy }) => {
          const s = kindStyle[p.kind];
          const isSel = p.id === selectedId;
          const scale = 1 / Math.sqrt(zoom);
          const shifted = Math.hypot(x - ox, y - oy) > 6 * scale;
          const count = Math.max(1, p.count ?? 0);
          const shown = markers === 'names' && p.count != null ? Math.min(count, MAX_ICONS) : 0;
          const icon = 11 * scale;
          const gap = icon * 1.55;
          const rowW = shown > 1 ? (shown - 1) * gap : 0;
          return (
            <g key={p.id}>
              {shifted && (
                <g pointerEvents="none">
                  <line x1={ox} y1={oy} x2={x} y2={y} stroke="#00628B" strokeWidth={1.4 * scale} strokeDasharray={`${4 * scale} ${3 * scale}`} opacity={0.55} />
                  <circle cx={ox} cy={oy} r={2.4 * scale} fill="#00628B" />
                </g>
              )}
              <g
                transform={`translate(${x} ${y})`}
                onClick={() => interactive && onSelect?.(p.id)}
                className={interactive ? 'cursor-pointer' : undefined}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                aria-label={interactive ? `${p.name}, ${p.count != null ? `${p.count} ${p.count === 1 ? 'business' : 'businesses'}` : s.label}` : undefined}
                onKeyDown={(e) => interactive && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onSelect?.(p.id))}
              >
                {markers === 'names' ? (
                  <>
                    {isSel && <circle r={Math.max(r * 2.8, icon * 2.4)} fill="#00628B" opacity={0.12} pointerEvents="none" />}
                    {shown > 0 && Array.from({ length: shown }, (_, i) => (
                      <g key={i} transform={`translate(${-rowW / 2 + i * gap} ${-icon * 0.2})`}>
                        <StoreIcon size={icon} fill={isSel ? '#00628B' : '#003B53'} stroke="#ffffff" strokeWidth={1.6 * scale} />
                      </g>
                    ))}
                    {p.count != null && p.count > MAX_ICONS && (
                      <text y={-icon * 1.7} textAnchor="middle" fontSize={11 * scale} fontWeight={800} fill="#00628B" stroke="#ffffff" strokeWidth={3.5 * scale} paintOrder="stroke">
                        +{p.count - MAX_ICONS}
                      </text>
                    )}
                    {p.count != null && (
                      <text y={icon * 1.55} textAnchor="middle" fontSize={12 * scale} fontWeight={800} fill="#00628B" stroke="#ffffff" strokeWidth={3.5 * scale} paintOrder="stroke">
                        {p.count}
                      </text>
                    )}
                    <text y={shown ? icon * (p.count != null ? 2.7 : 1.7) : 0} textAnchor="middle" dominantBaseline={shown ? 'hanging' : 'middle'} fontSize={(isSel ? 16 : 14) * scale} fontWeight={isSel ? 800 : 700} fill={isSel ? '#00628B' : '#14232B'} stroke="#ffffff" strokeWidth={5 * scale} paintOrder="stroke">
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
            </g>
          );
        })}

        <g transform={`translate(${capital.x} ${capital.y})`} pointerEvents="none" aria-label="Capital city, Kigali">
          <circle r={6 * scale} fill="#003B53" stroke="#ffffff" strokeWidth={1.4 * scale} />
          <circle r={2.2 * scale} fill="#ffffff" />
          <text y={13 * scale} textAnchor="middle" fill="#003B53" fontSize={9 * scale} fontWeight={700} stroke="#ffffff" strokeWidth={2.5 * scale} paintOrder="stroke">Capital</text>
        </g>
        {me && (
          <g transform={`translate(${me.x} ${me.y})`} aria-label="Your location">
            <circle r={r * 1.1} fill="#ffffff" stroke="#00628B" strokeWidth={3 / Math.sqrt(zoom)} />
            <circle r={r * 0.5} fill="#00628B" />
          </g>
        )}
      </svg>

      <div className="pointer-events-none absolute left-2 top-2 max-w-[calc(100%-4.5rem)] rounded-xl border border-slate-200 bg-white/90 px-2.5 py-1.5 shadow-sm sm:left-3 sm:top-3 sm:px-3 sm:py-2">
        <p className="font-display text-sm font-bold text-ink">Map of Rwanda</p>
        <p className="text-[11px] text-slate-500">1°00'S–2°54'S · 28°48'E–30°57'E</p>
      </div>
      <ul className="pointer-events-none absolute bottom-2 left-2 max-h-[38%] max-w-[min(11.5rem,calc(100%-6.5rem))] space-y-0.5 overflow-y-auto rounded-xl border border-slate-200 bg-white/90 px-2 py-1.5 text-[10px] font-semibold text-slate-600 shadow-sm sm:bottom-3 sm:left-3 sm:max-h-[42%] sm:px-2.5">
        <li className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Legend</li>
        {provinces.map((province) => (
          <li key={province.name} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-[#2A87AB]/40" style={{ background: province.fill }} />
            {province.name === 'Kigali' ? 'City of Kigali' : `${province.name} Province`}
          </li>
        ))}
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#6eb3cc]" />Lakes</li>
        <li className="flex items-center gap-1.5"><span className="h-0.5 w-4 shrink-0 rounded bg-[#3d8fb3]" />Rivers</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-sm border border-dashed border-[#2f6b4f] bg-[#7eb89a]/40" />National parks</li>
        <li className="flex items-center gap-1.5"><span className="h-0 w-0 border-x-[5px] border-b-[9px] border-x-transparent border-b-[#8a6a4a]" />Volcanoes</li>
        <li className="flex items-center gap-1.5"><span className="grid h-2.5 w-2.5 shrink-0 place-items-center rounded-full bg-[#003B53]"><span className="h-1 w-1 rounded-full bg-white" /></span>Capital</li>
        <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 bg-[#003B53]" style={{ clipPath: 'polygon(50% 0, 100% 70%, 70% 70%, 70% 100%, 30% 100%, 30% 70%, 0 70%)' }} />Businesses</li>
        {userPosition && <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 shrink-0 rounded-full border-2 border-[#00628B] bg-white" />Your location</li>}
      </ul>
      <div className="pointer-events-none absolute bottom-2 right-2 hidden items-end gap-3 sm:flex sm:bottom-3 sm:right-3">
        <div className="rounded-xl border border-slate-200 bg-white/90 px-2.5 py-2 shadow-sm" aria-hidden>
          <svg viewBox="0 0 32 40" className="mx-auto h-10 w-8">
            <polygon points="16,2 20,18 16,14 12,18" fill="#00628B" />
            <polygon points="16,38 20,22 16,26 12,22" fill="#94a3b8" />
            <text x="16" y="12" textAnchor="middle" fontSize="7" fontWeight="700" fill="#00628B">N</text>
          </svg>
          <p className="text-center text-[10px] font-bold text-slate-500">North</p>
        </div>
        <div className="min-w-[7rem] rounded-xl border border-slate-200 bg-white/90 px-3 py-2 shadow-sm" aria-label={`Scale: ${scaleKm} kilometres`}>
          <p className="mb-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Scale</p>
          <div className="h-1.5 overflow-hidden rounded-sm border border-slate-400" style={{ width: `${scalePct}%`, minWidth: '4.5rem' }}>
            <div className="flex h-full">
              <span className="w-1/2 bg-ink" />
              <span className="w-1/2 bg-white" />
            </div>
          </div>
          <p className="mt-1 text-xs font-semibold tabular-nums text-slate-600">0 — {scaleKm} km</p>
        </div>
      </div>
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
