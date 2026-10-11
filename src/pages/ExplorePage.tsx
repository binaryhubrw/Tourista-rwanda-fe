import { useEffect } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Container } from '@/components/ui';
import { HomeHero } from '@/components/layout/HomeHero';
import { ExploreBrowser } from '@/components/ExploreBrowser';

export default function ExplorePage() {
  const [params] = useSearchParams();
  const location = useLocation();
  useDocumentTitle();

  useEffect(() => {
    if (location.hash !== '#explore-listings') return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      document.getElementById('explore-listings')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
  }, [location.hash, location.search]);

  return (
    <>
      <HomeHero initialQuery={params.get('q') ?? ''} />
      <div id="explore-listings" className="scroll-mt-20 lg:scroll-mt-24">
        <Container className="py-12 sm:py-16">
          <ExploreBrowser showSearch={false} featuredFirst />
        </Container>
      </div>
    </>
  );
}
