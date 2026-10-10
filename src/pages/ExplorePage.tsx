import { useSearchParams } from 'react-router-dom';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Container } from '@/components/ui';
import { HomeHero } from '@/components/layout/HomeHero';
import { ExploreBrowser } from '@/components/ExploreBrowser';

export default function ExplorePage() {
  const [params] = useSearchParams();
  useDocumentTitle();
  return (
    <>
      <HomeHero initialQuery={params.get('q') ?? ''} />
      <div id="explore-listings">
        <Container className="py-12 sm:py-16">
          <ExploreBrowser showSearch={false} featuredFirst />
        </Container>
      </div>
    </>
  );
}
