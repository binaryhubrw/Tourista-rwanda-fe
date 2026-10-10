import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/utils/cn';

interface Props {
  page: number;
  pageCount: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  showPageSize?: boolean;
  className?: string;
}

/** Page numbers to show, with null standing in for an ellipsis: 1 … 4 5 6 … 12 */
function pageList(page: number, count: number): (number | null)[] {
  if (count <= 7) return Array.from({ length: count }, (_, i) => i + 1);
  const pages = new Set([1, count, page - 1, page, page + 1]);
  if (page <= 3) [2, 3, 4].forEach((p) => pages.add(p));
  if (page >= count - 2) [count - 3, count - 2, count - 1].forEach((p) => pages.add(p));
  const sorted = [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? [null, p] : [p]));
}

export function Pagination({ page, pageCount, pageSize, total, pageSizeOptions = [10, 25, 50], onPageChange, onPageSizeChange, showPageSize = true, className }: Props) {
  const from = total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, total);
  const btn = 'grid h-9 min-w-9 place-items-center rounded-lg px-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <nav aria-label="Pagination" className={cn('flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex items-center gap-4">
        {showPageSize && onPageSizeChange && (
          <label className="flex items-center gap-2">
            <span className="whitespace-nowrap">Rows per page</span>
            <select value={pageSize} onChange={(e) => onPageSizeChange(Number(e.target.value))} className="h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm font-semibold text-ink focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100">
              {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        )}
        <p className="whitespace-nowrap" aria-live="polite"><span className="font-semibold text-ink">{from}–{to}</span> of {total}</p>
      </div>

      <div className="flex items-center gap-1">
        <button className={cn(btn, 'text-slate-600 hover:bg-slate-100')} onClick={() => onPageChange(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="h-4 w-4" />
        </button>
        {pageList(page, pageCount).map((p, i) =>
          p === null ? (
            <span key={`gap-${i}`} className="px-1 text-slate-400" aria-hidden>…</span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Page ${p}`}
              className={cn(btn, p === page ? 'bg-brand-600 text-white' : 'text-slate-700 hover:bg-slate-100')}
            >
              {p}
            </button>
          ),
        )}
        <button className={cn(btn, 'text-slate-600 hover:bg-slate-100')} onClick={() => onPageChange(page + 1)} disabled={page >= pageCount} aria-label="Next page">
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </nav>
  );
}
