import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';
import { Loading } from '@/components/ui';
import { cn } from '@/utils/cn';

export function MainLayout() {
  const path = useLocation().pathname;
  const compactAuth = path === '/login' || path === '/register' || path.startsWith('/register/');
  return (
    <div className={cn('flex min-w-0 flex-col bg-white', compactAuth ? 'h-dvh overflow-hidden' : 'min-h-screen')}>
      <a href="#main" className="sr-only z-[100] rounded-full bg-brand-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <Navbar />
      <main id="main" className={compactAuth ? 'min-h-0 flex-1 overflow-hidden' : 'flex-1'}>
        <PageErrorBoundary resetKey={path}>
          <Suspense fallback={<Loading />}>
            <Outlet />
          </Suspense>
        </PageErrorBoundary>
      </main>
      {!compactAuth && <Footer />}
    </div>
  );
}
