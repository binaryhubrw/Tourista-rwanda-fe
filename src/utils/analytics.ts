// Small helpers that turn lists of records into chart- and stat-card-ready numbers.

const DAY = 86_400_000;
const toTime = (iso: string) => new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).getTime();

/** The last `n` calendar months, oldest first, e.g. [{ key: '2026-05', label: 'May' }, …]. */
export function lastMonths(n: number, end = new Date()) {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(end.getFullYear(), end.getMonth() - (n - 1 - i), 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    return { key, label: d.toLocaleDateString('en-GB', { month: 'short' }) };
  });
}

/** Sums one or more measures per month: byMonth(bookings, b => b.createdAt, { bookings: () => 1, revenue: b => b.totalRwf }). */
export function byMonth<T, K extends string>(items: T[], getDate: (item: T) => string, series: Record<K, (item: T) => number>, months = 12) {
  const keys = Object.keys(series) as K[];
  const buckets = lastMonths(months).map(({ key, label }) => ({ key, month: label, ...(Object.fromEntries(keys.map((k) => [k, 0])) as Record<K, number>) }));
  const index = new Map(buckets.map((b, i) => [b.key, i]));
  items.forEach((item) => {
    const i = index.get(getDate(item).slice(0, 7));
    if (i === undefined) return;
    keys.forEach((k) => { (buckets[i] as Record<K, number>)[k] += series[k](item); });
  });
  return buckets;
}

/** Counts items per group, largest first. */
export function countBy<T>(items: T[], getKey: (item: T) => string, getValue: (item: T) => number = () => 1) {
  const map = new Map<string, number>();
  items.forEach((item) => map.set(getKey(item), (map.get(getKey(item)) ?? 0) + getValue(item)));
  return [...map.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

/** Percentage change, or null when there is no baseline to compare with. */
export function percentChange(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0;
  return ((current - previous) / previous) * 100;
}

/**
 * Compares the last `days` days with the `days` before that.
 * Returns the current total, the previous total and the % change.
 */
export function periodTrend<T>(items: T[], getDate: (item: T) => string, getValue: (item: T) => number = () => 1, days = 30) {
  const now = Date.now();
  let current = 0;
  let previous = 0;
  items.forEach((item) => {
    const age = (now - toTime(getDate(item))) / DAY;
    if (age >= 0 && age < days) current += getValue(item);
    else if (age >= days && age < days * 2) previous += getValue(item);
  });
  return { current, previous, change: percentChange(current, previous) };
}

export const average = (values: number[]) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);

export const sum = <T,>(items: T[], getValue: (item: T) => number) => items.reduce((s, i) => s + getValue(i), 0);
