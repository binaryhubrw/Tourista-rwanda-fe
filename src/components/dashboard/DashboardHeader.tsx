import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, ChevronRight, Globe, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, User as UserIcon } from 'lucide-react';
import type { User } from '@/types';
import { Avatar } from '@/components/ui';
import { cn } from '@/utils/cn';
import { roleLabel } from './navigation';

interface Props {
  user: User;
  basePath: string;
  pageTitle?: string;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onOpenMobile: () => void;
  onLogout: () => void;
}

/** Sticky top bar of the dashboard shell. */
export function DashboardHeader({ user, basePath, pageTitle, collapsed, onToggleCollapsed, onOpenMobile, onLogout }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => setMenuOpen(false), [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenuOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const iconBtn = 'grid h-10 w-10 shrink-0 place-items-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-ink';

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      <div className="flex h-16 items-center gap-2 px-4 sm:px-6 lg:px-8">
        <button onClick={onOpenMobile} className={cn(iconBtn, 'lg:hidden')} aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <button onClick={onToggleCollapsed} className={cn(iconBtn, 'hidden lg:grid')} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={`${collapsed ? 'Expand' : 'Collapse'} sidebar (Ctrl+B)`}>
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </button>

        <nav aria-label="Breadcrumb" className="ml-1 min-w-0">
          <ol className="flex items-center gap-1.5 text-sm">
            <li className="hidden sm:block"><Link to={basePath} className="font-medium text-slate-500 hover:text-brand-700">{roleLabel[user.role]}</Link></li>
            {pageTitle && (
              <>
                <li aria-hidden className="hidden text-slate-300 sm:block"><ChevronRight className="h-4 w-4" /></li>
                <li aria-current="page" className="truncate font-display text-base font-bold text-ink">{pageTitle}</li>
              </>
            )}
          </ol>
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <Link to="/" className="hidden h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-ink sm:inline-flex">
            <Globe className="h-4 w-4" aria-hidden />Visit site
          </Link>

          <div ref={menuRef} className="relative">
            <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-xl py-1 pl-1 pr-2 hover:bg-slate-100" aria-haspopup="menu" aria-expanded={menuOpen}>
              <Avatar name={user.name} src={user.avatar} size={34} />
              <span className="hidden text-left leading-tight md:block">
                <span className="block max-w-[160px] truncate text-sm font-semibold text-ink">{user.name}</span>
                <span className="block text-xs text-slate-500">{roleLabel[user.role]}</span>
              </span>
              <ChevronDown className={cn('h-4 w-4 text-slate-500 transition-transform', menuOpen && 'rotate-180')} aria-hidden />
            </button>
            {menuOpen && (
              <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-60 animate-modal-in rounded-2xl border border-slate-200 bg-white p-2 shadow-lift">
                <p className="px-3 py-2 text-sm text-slate-500">Signed in as <span className="block truncate font-semibold text-ink">{user.email}</span></p>
                <div className="my-1 border-t border-slate-100" />
                <Link role="menuitem" to={`${basePath}/profile`} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-brand-50"><UserIcon className="h-4 w-4 text-brand-600" />Profile</Link>
                <Link role="menuitem" to={`${basePath}/settings`} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-brand-50"><Settings className="h-4 w-4 text-brand-600" />Settings</Link>
                <Link role="menuitem" to="/" className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-brand-50 sm:hidden"><Globe className="h-4 w-4 text-brand-600" />Visit site</Link>
                <div className="my-1 border-t border-slate-100" />
                <button role="menuitem" onClick={onLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Log out</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
