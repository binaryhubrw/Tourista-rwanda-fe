export const formatRwf = (amount: number) =>
  `RWF ${new Intl.NumberFormat('en-US').format(Math.round(amount))}`;

export const formatCompact = (n: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);

export const formatDate = (iso: string, opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-GB', opts);
};

export const priceLabel = (level: 1 | 2 | 3) => ['Budget', 'Mid-range', 'Premium'][level - 1];

export const initials = (name: string) =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');

export const daysBetween = (start: string, end: string) => {
  const a = new Date(start).getTime();
  const b = new Date(end).getTime();
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  return Math.round((b - a) / 86_400_000) + 1;
};

export const todayIso = () => new Date().toISOString().slice(0, 10);

/** Short money for charts and stat cards: "RWF 1.2M". */
export const formatRwfShort = (amount: number) => `RWF ${formatCompact(amount)}`;
