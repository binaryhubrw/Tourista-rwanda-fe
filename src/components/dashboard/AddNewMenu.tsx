import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Plus, type LucideIcon } from 'lucide-react';
import { buttonClass } from '@/components/ui';
import { cn } from '@/utils/cn';

export interface AddNewItem { label: string; description?: string; icon: LucideIcon; to: string }

/** "Add new" button with a menu of things that can be created. */
export function AddNewMenu({ items, label = 'Add new' }: { items: AddNewItem[]; label?: string }) {
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

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open} className={buttonClass('primary', 'md')}>
        <Plus className="h-4 w-4" aria-hidden />{label}<ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-2 w-72 animate-modal-in rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift">
          {items.map(({ label: text, description, icon: Icon, to }) => (
            <Link key={to} role="menuitem" to={to} onClick={() => setOpen(false)} className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-brand-50">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-600"><Icon className="h-4 w-4" aria-hidden /></span>
              <span><span className="block text-sm font-semibold text-ink">{text}</span>{description && <span className="block text-xs text-slate-500">{description}</span>}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
