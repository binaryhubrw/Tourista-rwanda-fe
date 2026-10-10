import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Heart, Menu, Search, X, LayoutDashboard, LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { Logo } from './Logo';
import { SearchBar } from './SearchBar';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { useFavorites } from '@/context/FavoritesContext';
import { Avatar, buttonClass, Container } from '@/components/ui';
import { cn } from '@/utils/cn';

export const navLinks = [
  { to: '/itinerary', label: 'Plan a trip' },
  { to: '/map', label: 'Map' },
];

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cn('whitespace-nowrap rounded-full px-2.5 py-2 text-sm font-semibold transition-colors', isActive ? 'bg-brand-50 text-brand-600' : 'text-slate-700 hover:text-brand-700');

export function Navbar() {
  const { user, logout } = useAuth();
  const { favorites } = useFavorites();
  const ownedLabel = user?.role === 'business_owner' ? (user.businessName ?? '') : '';
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setMenuOpen(false);
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
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <Container className="relative flex h-16 items-center justify-between gap-3 lg:h-[72px]">
        <Logo />

        <nav aria-label="Main" className="pointer-events-none absolute inset-x-0 hidden justify-center lg:flex">
          <div className="pointer-events-auto flex items-center gap-1">
            {navLinks.map((l) => (
              <NavLink key={l.to} to={l.to} className={linkClass}>{l.label}</NavLink>
            ))}
          </div>
        </nav>

        <div className="flex items-center gap-1 sm:gap-2">
          {location.pathname !== '/explore' && (
            <button onClick={() => setSearchOpen((o) => !o)} className="grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-brand-50 hover:text-brand-700" aria-label="Search" aria-expanded={searchOpen}>
              <Search className="h-5 w-5" />
            </button>
          )}
          <Link to="/favorites" className="relative grid h-10 w-10 place-items-center rounded-full text-slate-700 hover:bg-brand-50 hover:text-brand-700" aria-label={`Favorites (${favorites.length})`}>
            <Heart className="h-5 w-5" />
            {favorites.length > 0 && (
              <span className="absolute right-0.5 top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-brand-600 px-1 text-[11px] font-bold text-white">{favorites.length}</span>
            )}
          </Link>

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
              <Link to="/register" className={buttonClass('primary', 'sm', 'whitespace-nowrap')}>Sign up</Link>
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
                {navLinks.map((l) => (
                  <NavLink key={l.to} to={l.to} className={({ isActive }) => cn('rounded-xl px-3 py-3 text-base font-semibold', isActive ? 'bg-brand-50 text-brand-600' : 'text-ink')}>
                    {l.label}
                  </NavLink>
                ))}
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
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/login" className={buttonClass('secondary', 'md')}>Log in</Link>
                  <Link to="/register" className={buttonClass('primary', 'md')}>Sign up</Link>
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
