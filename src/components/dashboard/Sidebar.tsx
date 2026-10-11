import { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ChevronsLeft, X } from 'lucide-react';
import { Logo } from '@/components/layout/Logo';
import { cn } from '@/utils/cn';
import type { SidebarSection } from './navigation';

export const SIDEBAR_WIDTH = 'lg:w-[264px]';
export const SIDEBAR_WIDTH_COLLAPSED = 'lg:w-[76px]';

interface SidebarProps {
  sections: SidebarSection[];
  /** Desktop only: icon rail instead of full labels. */
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Mobile/tablet only: drawer visibility. */
  mobileOpen: boolean;
  onMobileClose: () => void;
  label?: string;
}

/**
 * Fixed dashboard sidebar. On large screens it sticks to the left edge and can
 * collapse to an icon rail; below `lg` it becomes an off-canvas drawer.
 */
export function Sidebar({ sections, collapsed, onToggleCollapsed, mobileOpen, onMobileClose, label = 'Dashboard' }: SidebarProps) {
  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onMobileClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [mobileOpen, onMobileClose]);

  return (
    <>
      {/* Mobile backdrop */}
      <div
        aria-hidden
        onClick={onMobileClose}
        className={cn('fixed inset-0 z-40 bg-brand-900/50 transition-opacity lg:hidden', mobileOpen ? 'opacity-100' : 'pointer-events-none opacity-0')}
      />

      <aside
        aria-label={label}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-[280px] max-w-[85vw] flex-col bg-brand-600 text-white shadow-lift transition-[transform,width] duration-200 ease-out lg:z-30 lg:max-w-none lg:translate-x-0 lg:shadow-none',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
          collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH,
        )}
      >
        {/* Brand */}
        <div className={cn('flex h-16 shrink-0 items-center gap-2 border-b border-white/20 px-4', collapsed && 'lg:justify-center lg:px-0')}>
          <div className={cn(collapsed && 'lg:hidden')}><Logo light /></div>
          <div className={cn('hidden', collapsed && 'lg:block')}><Logo light compact /></div>
          <button onClick={onMobileClose} className="ml-auto grid h-9 w-9 place-items-center rounded-lg text-white hover:bg-white/10 lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        {/* In rail mode the nav overflows visibly so tooltips aren't clipped. */}
        <nav aria-label={label} className={cn('flex-1 overflow-y-auto overflow-x-hidden px-3 py-4 [scrollbar-width:thin]', collapsed && 'lg:overflow-visible')}>
          {sections.map((section, si) => (
            <div key={section.title} className={cn(si > 0 && 'mt-5')}>
              <p className={cn('mb-1.5 px-3 text-[11px] font-bold uppercase tracking-[0.08em] text-white/70', collapsed && 'lg:sr-only')}>{section.title}</p>
              {si > 0 && <div aria-hidden className={cn('mx-3 mb-3 hidden border-t border-white/20', collapsed && 'lg:block')} />}
              <ul className="space-y-0.5">
                {section.items.map(({ to, label: text, icon: Icon, end }) => (
                  <li key={to} className="group relative">
                    <NavLink
                      to={to}
                      end={end}
                      onClick={onMobileClose}
                      className={({ isActive }) =>
                        cn(
                          'relative flex h-10 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold transition-colors',
                          collapsed && 'lg:justify-center lg:px-0',
                          isActive ? 'bg-white text-brand-600 shadow-sm' : 'text-white/90 hover:bg-white/15 hover:text-white',
                        )
                      }
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" aria-hidden />
                      <span className={cn('truncate', collapsed && 'lg:sr-only')}>{text}</span>
                    </NavLink>
                    {/* Tooltip for the collapsed rail */}
                    {collapsed && (
                      <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 hidden -translate-y-1/2 whitespace-nowrap rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-brand-600 shadow-lift lg:group-hover:block lg:group-focus-within:block">
                        {text}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        {/* Desktop collapse handle on the sidebar edge */}
        <button
          onClick={onToggleCollapsed}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          aria-expanded={!collapsed}
          title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}
          className="absolute -right-3 top-20 hidden h-6 w-6 place-items-center rounded-full border border-slate-200 bg-white text-brand-600 shadow-sm transition-colors hover:bg-brand-50 lg:grid"
        >
          <ChevronsLeft className={cn('h-3.5 w-3.5 transition-transform', collapsed && 'rotate-180')} aria-hidden />
        </button>
      </aside>
    </>
  );
}
