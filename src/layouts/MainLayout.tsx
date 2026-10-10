import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { cn } from '@/utils/cn';

export function MainLayout() {
  const compactAuth = ['/login', '/register'].includes(useLocation().pathname);
  return (
    <div className={cn('flex flex-col bg-white', compactAuth ? 'h-dvh overflow-hidden' : 'min-h-screen')}>
      <a href="#main" className="sr-only z-[100] rounded-full bg-brand-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
      <Navbar />
      <main id="main" className={compactAuth ? 'min-h-0 flex-1 overflow-hidden' : 'flex-1'}>
        <Outlet />
      </main>
      {!compactAuth && <Footer />}
    </div>
  );
}
