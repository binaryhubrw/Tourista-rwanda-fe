import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Container, PageHeader } from '@/components/ui';
import { ExploreBrowser } from '@/components/ExploreBrowser';

export default function ExplorePage() {
  useDocumentTitle('Explore Rwanda');
  return (
    <>
      <PageHeader title="Explore Rwanda" intro="Places, activities, stays, restaurants, guides and local makers, all in one search." />
      <Container className="py-8 lg:py-10">
        <ExploreBrowser />
      </Container>
    </>
  );
}
