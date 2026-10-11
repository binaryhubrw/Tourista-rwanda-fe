import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Search, X, LayoutDashboard, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useOfferedServices } from '@/hooks/useOfferedServices';
import { Avatar, buttonClass, Container } from '@/components/ui';
import { cn } from '@/utils/cn';
import { EXPLORE_SCOPES, exploreScopeHref, exploreServiceHref, normalizeExploreScope, normalizeExploreService } from '@/utils/explore';

export const catalogLinks = EXPLORE_SCOPES.filter((item) => item.id !== 'services').map((item) => ({ to: exploreScopeHref(item.id), label: item.label, scope: item.id }));
export const navLinks = [
  ...catalogLinks,
  { to: '/itinerary', label: 'Plan a trip' },
  { to: '/map', label: 'Map' },
];

const linkClass = (active: boolean) =>
  cn('whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-semibold transition-colors', active ? 'bg-brand-50 text-brand-600' : 'text-slate-700 hover:text-brand-700');

function scrollToCatalog() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.getElementById('explore-listings')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

export function Navbar() {
  const { user, logout } = useAuth();
  const ownedLabel = user?.role === 'business_owner' || user?.role === 'staff' ? (user.businessName ?? '') : '';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const [mobileServicesOpen, setMobileServicesOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const servicesRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setMenuOpen(false);
    setServicesOpen(false);
    setMobileServicesOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMobileOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileOpen]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      const node = e.target as Node;
      if (!menuRef.current?.contains(node)) setMenuOpen(false);
      if (!servicesRef.current?.contains(node)) setServicesOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setMenuOpen(false);
      setServicesOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const exploreScope = location.pathname === '/explore' ? normalizeExploreScope(new URLSearchParams(location.search).get('scope')) : '';
  const exploreService = location.pathname === '/explore' ? normalizeExploreService(new URLSearchParams(location.search).get('service')) : '';
  const goCatalog = () => { if (location.pathname === '/explore') requestAnimationFrame(scrollToCatalog); };
  const { options: serviceOptions, refresh: refreshServices } = useOfferedServices();
  const serviceActive = (id: string) => exploreService.toLowerCase() === id.toLowerCase();
  const toggleServices = () => {
    refreshServices();
    setServicesOpen((open) => !open);
  };
  const toggleMobileServices = () => {
    refreshServices();
    setMobileServicesOpen((open) => !open);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <Container className="relative flex h-16 items-center justify-between gap-3 lg:h-[72px]">
        <Logo />

        <nav aria-label="Main" className="hidden min-w-0 flex-1 justify-center px-4 lg:flex">
          <div className="flex items-center gap-0.5">
            {catalogLinks.map((l) => {
              const active = exploreScope === l.scope;
              return (
                <Link key={l.scope} to={l.to} aria-current={active ? 'page' : undefined} className={linkClass(active)} onClick={goCatalog}>
                  {l.label}
                </Link>
              );
            })}
            <div ref={servicesRef} className="relative">
              <button
                type="button"
                onClick={toggleServices}
                aria-haspopup="menu"
                aria-expanded={servicesOpen}
                aria-current={exploreScope === 'services' ? 'page' : undefined}
                className={cn(linkClass(exploreScope === 'services'), 'inline-flex items-center gap-1')}
              >
                Services
                <ChevronDown className={cn('h-3.5 w-3.5 transition-transform', servicesOpen && 'rotate-180')} aria-hidden />
              </button>
              {servicesOpen && (
                <div role="menu" className="absolute left-1/2 top-full z-30 mt-2 max-h-[min(24rem,70vh)] w-64 -translate-x-1/2 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-1.5 shadow-lift">
                  <Link
                    role="menuitem"
                    to={exploreScopeHref('services')}
                    className={cn('block rounded-xl px-3 py-2 text-sm font-semibold', exploreScope === 'services' && !exploreService ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-brand-50')}
                    onClick={() => { setServicesOpen(false); goCatalog(); }}
                  >
                    All services
                  </Link>
                  {serviceOptions.map((item) => (
                    <Link
                      key={item.id}
                      role="menuitem"
                      to={exploreServiceHref(item.id)}
                      className={cn('block rounded-xl px-3 py-2 text-sm font-semibold', serviceActive(item.id) ? 'bg-brand-50 text-brand-700' : 'text-ink hover:bg-brand-50')}
                      onClick={() => { setServicesOpen(false); goCatalog(); }}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <span className="mx-1.5 h-4 w-px bg-slate-200" aria-hidden />
            <NavLink to="/itinerary" className={({ isActive }) => linkClass(isActive)}>Plan a trip</NavLink>
            <NavLink to="/map" className={({ isActive }) => linkClass(isActive)}>Map</NavLink>
          </div>
        </nav>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {location.pathname !== '/explore' && (
            <button onClick={() => setSearchOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-brand-50 hover:text-brand-700" aria-label="Search" aria-expanded={searchOpen}>
              <Search className="h-5 w-5" />
            </button>
          )}

          {user ? (
            <div ref={menuRef} className="relative hidden sm:block">
              <button onClick={() => setMenuOpen((o) => !o)} className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 hover:bg-brand-50" aria-haspopup="menu" aria-expanded={menuOpen}>
                <Avatar name={user.name} size={34} />
                <span className="hidden max-w-[120px] truncate text-sm font-semibold text-ink xl:inline">{user.name.split(' ')[0]}</span>
                <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden />
              </button>
              {menuOpen && (
                <div role="menu" className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-lift">
                  <p className="px-3 py-2 text-sm text-slate-500">Signed in as <span className="block truncate font-semibold text-ink">{user.email}</span>{ownedLabel && <span className="mt-1 block truncate text-xs text-slate-500">Owner of {ownedLabel}</span>}</p>
                  <Link role="menuitem" to={`${dashboardPathFor(user.role)}/profile`} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-brand-50"><UserIcon className="h-4 w-4 text-brand-600" />Profile</Link>
                  <Link role="menuitem" to={dashboardPathFor(user.role)} className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium hover:bg-brand-50"><LayoutDashboard className="h-4 w-4 text-brand-600" />Dashboard</Link>
                  <button role="menuitem" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"><LogOut className="h-4 w-4" />Log out</button>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Link to="/login" className={buttonClass('ghost', 'sm', 'whitespace-nowrap')}>Log in</Link>
              <Link to="/register" className={buttonClass('secondary', 'sm', 'whitespace-nowrap')}>Sign up</Link>
              <Link to="/register/business" className={buttonClass('primary', 'sm', 'whitespace-nowrap')}>Register a business</Link>
            </div>
          )}

          <button onClick={() => setMobileOpen(true)} className="grid h-10 w-10 place-items-center rounded-full text-ink hover:bg-brand-50 lg:hidden" aria-label="Open menu" aria-expanded={mobileOpen}>
            <Menu className="h-6 w-6" />
          </button>
        </div>
      </Container>

      {searchOpen && (
        <div className="border-t border-slate-200 bg-white py-4">
          <Container>
            <SearchBar autoFocus onNavigate={() => setSearchOpen(false)} />
          </Container>
        </div>
      )}

      {/* Mobile drawer */}
      {mobileOpen && createPortal(
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div className="absolute inset-0 bg-brand-900/50" onClick={() => setMobileOpen(false)} aria-hidden />
          <div role="dialog" aria-modal="true" aria-label="Menu" className="absolute right-0 top-0 flex h-full w-full max-w-sm flex-col bg-white shadow-lift">
            <div className="flex h-16 items-center justify-between border-b border-slate-100 px-4">
              <Logo />
              <button onClick={() => setMobileOpen(false)} className="grid h-10 w-10 place-items-center rounded-full hover:bg-brand-50" aria-label="Close menu"><X className="h-6 w-6" /></button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              <SearchBar onNavigate={() => setMobileOpen(false)} placeholder="Search Rwanda" />
              <nav aria-label="Mobile" className="mt-4 flex flex-col">
                <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Browse</p>
                {catalogLinks.map((l) => {
                  const active = exploreScope === l.scope;
                  return (
                    <Link key={l.scope} to={l.to} aria-current={active ? 'page' : undefined} className={cn('rounded-xl px-3 py-3 text-base font-semibold', active ? 'bg-brand-50 text-brand-600' : 'text-ink')}>
                      {l.label}
                    </Link>
                  );
                })}
                <button
                  type="button"
                  onClick={toggleMobileServices}
                  aria-expanded={mobileServicesOpen}
                  className={cn('flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-base font-semibold', exploreScope === 'services' ? 'bg-brand-50 text-brand-600' : 'text-ink')}
                >
                  Services
                  <ChevronDown className={cn('h-4 w-4 transition-transform', mobileServicesOpen && 'rotate-180')} aria-hidden />
                </button>
                {mobileServicesOpen && (
                  <div className="mb-1 ml-3 space-y-0.5 border-l border-slate-200 pl-3">
                    <Link to={exploreScopeHref('services')} className={cn('block rounded-xl px-3 py-2.5 text-sm font-semibold', exploreScope === 'services' && !exploreService ? 'bg-brand-50 text-brand-600' : 'text-slate-700')}>All services</Link>
                    {serviceOptions.map((item) => (
                      <Link key={item.id} to={exploreServiceHref(item.id)} className={cn('block rounded-xl px-3 py-2.5 text-sm font-semibold', serviceActive(item.id) ? 'bg-brand-50 text-brand-600' : 'text-slate-700')}>{item.label}</Link>
                    ))}
                  </div>
                )}
                <p className="mt-3 px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-slate-400">Plan</p>
                <NavLink to="/itinerary" className={({ isActive }) => cn('rounded-xl px-3 py-3 text-base font-semibold', isActive ? 'bg-brand-50 text-brand-600' : 'text-ink')}>Plan a trip</NavLink>
                <NavLink to="/map" className={({ isActive }) => cn('rounded-xl px-3 py-3 text-base font-semibold', isActive ? 'bg-brand-50 text-brand-600' : 'text-ink')}>Map</NavLink>
              </nav>
            </div>
            <div className="border-t border-slate-100 p-4">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 px-1 pb-2">
                    <Avatar name={user.name} />
                    <div className="min-w-0"><p className="truncate font-semibold">{user.name}</p><p className="truncate text-sm text-slate-500">{ownedLabel ? `Owner of ${ownedLabel}` : user.email}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <Link to={`${dashboardPathFor(user.role)}/profile`} className={buttonClass('secondary', 'md')}>Profile</Link>
                    <Link to={dashboardPathFor(user.role)} className={buttonClass('primary', 'md')}>Dashboard</Link>
                  </div>
                  <button onClick={handleLogout} className={buttonClass('ghost', 'md', 'w-full text-red-600 hover:bg-red-50')}>Log out</button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/login" className={buttonClass('secondary', 'md')}>Log in</Link>
                    <Link to="/register" className={buttonClass('primary', 'md')}>Sign up</Link>
                  </div>
                  <Link to="/register/business" className={buttonClass('secondary', 'md', 'w-full')}>Register a business</Link>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </header>
  );
}
