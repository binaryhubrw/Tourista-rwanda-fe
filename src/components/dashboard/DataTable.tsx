import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronDown, Download, FileJson, FileSpreadsheet, Search, X } from 'lucide-react';
import { EmptyState, Loading, fieldClass } from '@/components/ui';
import { exportRows, type ExportCell } from '@/utils/export';
import { cn } from '@/utils/cn';
import { Pagination } from './Pagination';
import { Checkbox } from './Checkbox';

export interface Column<T> {
  id: string;
  header: string;
  cell: (row: T) => ReactNode;
  /** Enables sorting on this column. */
  sortValue?: (row: T) => string | number;
  /** Value written to exports. Falls back to sortValue; columns with neither are not exported. */
  exportValue?: (row: T) => ExportCell;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  getRowId: (row: T) => string;
  title?: string;
  description?: string;
  /** Free-text search; pass the text each row should be matched on. */
  searchText?: (row: T) => string;
  searchPlaceholder?: string;
  /** Extra filter controls shown next to the search box. */
  filters?: ReactNode;
  selectable?: boolean;
  /** Actions for the current selection (e.g. "Confirm selected"). Call clear() when done. */
  bulkActions?: (selected: T[], clear: () => void) => ReactNode;
  /** Enables export; used as the downloaded file's base name. */
  exportFileName?: string;
  /** Per-row actions, rendered in a trailing column. */
  rowActions?: (row: T) => ReactNode;
  initialSort?: { id: string; desc?: boolean };
  pageSizeOptions?: number[];
  initialPageSize?: number;
  loading?: boolean;
  emptyTitle?: string;
  emptyMessage?: string;
  emptyAction?: ReactNode;
  className?: string;
}

type Sort = { id: string; desc: boolean } | null;

const alignClass = { left: 'text-left', right: 'text-right', center: 'text-center' };

export function DataTable<T>({
  data, columns, getRowId, title, description, searchText, searchPlaceholder = 'Search…', filters, selectable = true, bulkActions,
  exportFileName, rowActions, initialSort, pageSizeOptions = [5, 10, 25, 50], initialPageSize = 10, loading,
  emptyTitle = 'Nothing to show yet', emptyMessage, emptyAction, className,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<Sort>(initialSort ? { id: initialSort.id, desc: !!initialSort.desc } : null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Search, then sort.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q && searchText ? data.filter((r) => searchText(r).toLowerCase().includes(q)) : data;
  }, [data, query, searchText]);

  const sorted = useMemo(() => {
    const col = sort && columns.find((c) => c.id === sort.id);
    if (!col?.sortValue) return filtered;
    const get = col.sortValue;
    const dir = sort!.desc ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const x = get(a);
      const y = get(b);
      return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * dir;
    });
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  // Back to page 1 when the result set changes shape (search, page size, parent filters, deletions).
  useEffect(() => setPage(1), [query, pageSize, data.length]);
  useEffect(() => { if (page > pageCount) setPage(pageCount); }, [page, pageCount]);

  const pageRows = sorted.slice((page - 1) * pageSize, page * pageSize);

  // Keep only selections that still exist in the data (rows can be removed or filtered out by the parent).
  const ids = useMemo(() => new Set(data.map(getRowId)), [data, getRowId]);
  const selectedRows = useMemo(() => data.filter((r) => selected.has(getRowId(r))), [data, selected, getRowId]);
  useEffect(() => {
    setSelected((prev) => {
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [ids]);

  const pageIds = pageRows.map(getRowId);
  const pageSelectedCount = pageIds.filter((id) => selected.has(id)).length;
  const allPageSelected = pageIds.length > 0 && pageSelectedCount === pageIds.length;
  const allFilteredSelected = sorted.length > 0 && sorted.every((r) => selected.has(getRowId(r)));

  const togglePage = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      pageIds.forEach((id) => (allPageSelected ? next.delete(id) : next.add(id)));
      return next;
    });
  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectAllFiltered = () => setSelected(new Set(sorted.map(getRowId)));
  const clear = () => setSelected(new Set());

  const toggleSort = (id: string) =>
    setSort((s) => (s?.id !== id ? { id, desc: false } : !s.desc ? { id, desc: true } : null));

  const exportColumns = columns
    .filter((c) => c.exportValue || c.sortValue)
    .map((c) => ({ header: c.header, value: (c.exportValue ?? c.sortValue)! }));
  const exportTarget = selectedRows.length ? selectedRows : sorted;

  const hasToolbar = searchText || filters || exportFileName;
  const colSpan = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0);

  return (
    <section className={cn('relative overflow-hidden rounded-2xl border border-slate-200 bg-white', className)}>
      {(title || description) && (
        <header className="border-b border-slate-100 px-5 pb-3 pt-4">
          {title && <h2 className="font-display text-lg font-bold text-ink">{title}</h2>}
          {description && <p className="text-sm text-slate-500">{description}</p>}
        </header>
      )}

      {hasToolbar && (
        <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 md:flex-row md:items-center">
          {searchText && (
            <label className="relative block md:w-72">
              <span className="sr-only">{searchPlaceholder}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={searchPlaceholder} className={cn(fieldClass, 'h-10 py-0 pl-9 pr-9 text-sm')} />
              {query && (
                <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-ink" aria-label="Clear search">
                  <X className="h-4 w-4" />
                </button>
              )}
            </label>
          )}
          {filters && <div className="flex min-w-0 flex-wrap items-center gap-2">{filters}</div>}
          {exportFileName && (
            <div className="md:ml-auto">
              <ExportMenu
                count={exportTarget.length}
                selectedCount={selectedRows.length}
                disabled={!exportTarget.length}
                onExport={(format) => exportRows(format, exportFileName, exportTarget, exportColumns)}
              />
            </div>
          )}
        </div>
      )}

      {/* Selection bar */}
      {selectable && selectedRows.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-brand-100 bg-brand-50/70 px-4 py-2.5 text-sm" role="status">
          <span className="font-semibold text-brand-600">{selectedRows.length} selected</span>
          {allPageSelected && !allFilteredSelected && sorted.length > pageRows.length && (
            <button onClick={selectAllFiltered} className="font-semibold text-brand-600 underline-offset-2 hover:underline">Select all {sorted.length}</button>
          )}
          <button onClick={clear} className="font-semibold text-slate-600 underline-offset-2 hover:underline">Clear</button>
          {bulkActions && <div className="flex flex-wrap items-center gap-2 sm:ml-auto">{bulkActions(selectedRows, clear)}</div>}
        </div>
      )}

      {/* relative: keeps absolutely-positioned sr-only labels inside the scroll clip */}
      <div className="relative -mx-px overflow-x-auto overscroll-x-contain">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {selectable && (
                <th scope="col" className="w-12 px-4 py-3">
                  <Checkbox
                    checked={allPageSelected}
                    indeterminate={pageSelectedCount > 0 && !allPageSelected}
                    onChange={togglePage}
                    disabled={!pageRows.length}
                    aria-label="Select all rows on this page"
                  />
                </th>
              )}
              {columns.map((c) => {
                const active = sort?.id === c.id;
                const SortIcon = !active ? ArrowUpDown : sort!.desc ? ArrowDown : ArrowUp;
                return (
                  <th key={c.id} scope="col" aria-sort={active ? (sort!.desc ? 'descending' : 'ascending') : undefined} className={cn('whitespace-nowrap px-4 py-3 font-semibold', alignClass[c.align ?? 'left'])}>
                    {c.sortValue ? (
                      <button onClick={() => toggleSort(c.id)} className={cn('inline-flex items-center gap-1 rounded uppercase tracking-wide hover:text-ink', active && 'text-ink', c.align === 'right' && 'flex-row-reverse')}>
                        {c.header}
                        <SortIcon className={cn('h-3.5 w-3.5', !active && 'opacity-40')} aria-hidden />
                      </button>
                    ) : c.header}
                  </th>
                );
              })}
              {rowActions && <th scope="col" className="px-4 py-3"><span className="sr-only">Actions</span></th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={colSpan} className="p-2">
                  <Loading variant="section" label="Loading" className="min-h-[12rem] py-8" />
                </td>
              </tr>
            ) : !pageRows.length ? (
              <tr>
                <td colSpan={colSpan} className="p-4">
                  {query ? (
                    <EmptyState title="No matches" message={`Nothing matches “${query}”. Try a different search.`} action={<button onClick={() => setQuery('')} className="font-semibold text-brand-600 hover:underline">Clear search</button>} />
                  ) : (
                    <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />
                  )}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => {
                const id = getRowId(row);
                const isSelected = selected.has(id);
                return (
                  <tr key={id} className={cn('transition-colors', isSelected ? 'bg-brand-50/60' : 'hover:bg-slate-50/70')} aria-selected={selectable ? isSelected : undefined}>
                    {selectable && (
                      <td className="w-12 px-4 py-3"><Checkbox checked={isSelected} onChange={() => toggleRow(id)} aria-label="Select row" /></td>
                    )}
                    {columns.map((c) => (
                      <td key={c.id} className={cn('px-4 py-3 align-middle text-slate-700', alignClass[c.align ?? 'left'], c.className)}>{c.cell(row)}</td>
                    ))}
                    {rowActions && <td className="whitespace-nowrap px-4 py-3 text-right">{rowActions(row)}</td>}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!loading && sorted.length > 0 && (
        <Pagination page={page} pageCount={pageCount} pageSize={pageSize} total={sorted.length} pageSizeOptions={pageSizeOptions} onPageChange={setPage} onPageSizeChange={setPageSize} />
      )}
    </section>
  );
}

function ExportMenu({ count, selectedCount, disabled, onExport }: { count: number; selectedCount: number; disabled: boolean; onExport: (f: 'csv' | 'json') => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const label = selectedCount ? `Export selected (${selectedCount})` : `Export all (${count})`;
  const choose = (f: 'csv' | 'json') => { onExport(f); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        className={cn('inline-flex h-10 w-full items-center justify-center gap-2 whitespace-nowrap rounded-xl border px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:w-auto', selectedCount ? 'border-brand-600 bg-brand-600 text-white hover:bg-brand-700' : 'border-slate-300 bg-white text-ink hover:bg-slate-50')}
      >
        <Download className="h-4 w-4" aria-hidden />{label}<ChevronDown className="h-4 w-4 opacity-70" aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-56 animate-modal-in rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift">
          <p className="px-3 pb-1 pt-1.5 text-xs text-slate-500">{selectedCount ? `${selectedCount} selected row${selectedCount > 1 ? 's' : ''}` : `All ${count} row${count === 1 ? '' : 's'} (no selection)`}</p>
          <button role="menuitem" onClick={() => choose('csv')} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium hover:bg-brand-50"><FileSpreadsheet className="h-4 w-4 text-brand-600" />CSV (Excel)</button>
          <button role="menuitem" onClick={() => choose('json')} className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium hover:bg-brand-50"><FileJson className="h-4 w-4 text-brand-600" />JSON</button>
        </div>
      )}
    </div>
  );
}
