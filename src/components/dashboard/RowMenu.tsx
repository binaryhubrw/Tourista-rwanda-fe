import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical, type LucideIcon } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface RowMenuItem {
  label: string;
  icon?: LucideIcon;
  onSelect: () => void;
  /** 'danger' renders red (destructive actions like Delete). */
  tone?: 'default' | 'danger';
  disabled?: boolean;
}

const MENU_WIDTH = 192;

/**
 * Trailing "kebab" (three-dots) row action. The menu is portalled to the body so it
 * is not clipped by the table's horizontal scroll container.
 */
export function RowMenu({ label = 'Actions', items }: { label?: string; items: RowMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const [placement, setPlacement] = useState<{ top: number; left: number; up: boolean } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!open) return;
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const estimatedHeight = items.length * 40 + 16;
    const up = window.innerHeight - rect.bottom < estimatedHeight + 8;
    const left = Math.min(Math.max(8, rect.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8);
    setPlacement({ top: up ? rect.top - 6 : rect.bottom + 6, left, up });
  }, [open, items.length]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!btnRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onMove = () => setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    window.addEventListener('scroll', onMove, true);
    window.addEventListener('resize', onMove);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('scroll', onMove, true);
      window.removeEventListener('resize', onMove);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        className="inline-grid h-9 w-9 place-items-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-ink"
      >
        <MoreVertical className="h-5 w-5" aria-hidden />
      </button>
      {open && placement && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ top: placement.top, left: placement.left, width: MENU_WIDTH }}
          className={cn('fixed z-[80] animate-modal-in rounded-2xl border border-slate-200 bg-white p-1.5 text-left shadow-lift', placement.up && '-translate-y-full')}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              onClick={() => { setOpen(false); item.onSelect(); }}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                item.tone === 'danger' ? 'text-red-600 hover:bg-red-50' : 'text-slate-700 hover:bg-brand-50',
              )}
            >
              {item.icon && <item.icon className={cn('h-4 w-4 shrink-0', item.tone === 'danger' ? 'text-red-600' : 'text-brand-600')} aria-hidden />}
              {item.label}
            </button>
          ))}
        </div>,
        document.body,
      )}
    </>
  );
}
