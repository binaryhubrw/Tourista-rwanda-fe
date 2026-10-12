import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth, dashboardPathFor } from '@/context/AuthContext';
import { Loading } from '@/components/ui';
import { DashboardHeader, Sidebar, activeLink, hostRoleCaption, navigationFor, roleLabel } from '@/components/dashboard';
import { cn } from '@/utils/cn';

const COLLAPSED_KEY = 'tourista.sidebar.collapsed';

function readCollapsed() {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * App shell for every dashboard: fixed sidebar on the left, sticky header and
 * the page on the right. Deliberately separate from the public site layout,
 * so the marketing navbar and footer never appear here.
 */
export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = user!.role;
  const sections = useMemo(() => navigationFor(role), [role]);
  const current = activeLink(sections, pathname);
  const basePath = dashboardPathFor(role);
  const roleCaption = role === 'business_owner' || role === 'staff' ? hostRoleCaption(role, user!.businessName) : roleLabel[role];
  const pageTitle = pathname === `${basePath}/notifications` ? 'Notifications' : current?.label;

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1');
      } catch { /* preference just won't persist */ }
      return !c;
    });
  }, []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => setMobileOpen(false), [pathname]);

  // Ctrl/Cmd + B toggles the sidebar, as in most editors and admin tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [toggleCollapsed]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <a href="#dashboard-main" className="sr-only z-[100] rounded-full bg-brand-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>

      <Sidebar
        sections={sections}
        label={`${roleCaption} navigation`}
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onMobileClose={closeMobile}
      />

      <div className={cn('flex min-h-screen min-w-0 flex-col transition-[padding] duration-200 ease-out', collapsed ? 'lg:pl-[76px]' : 'lg:pl-[264px]')}>
        <DashboardHeader
          user={user!}
          basePath={basePath}
          pageTitle={pageTitle}
          roleCaption={roleCaption}
          collapsed={collapsed}
          onToggleCollapsed={toggleCollapsed}
          onOpenMobile={() => setMobileOpen(true)}
          onLogout={handleLogout}
        />
        <main id="dashboard-main" className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}>
          <div className="mx-auto w-full min-w-0 max-w-[1440px]">
            <Suspense fallback={<Loading />}>
              <Outlet />
            </Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
