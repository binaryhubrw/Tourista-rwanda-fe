import { Compass } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { ButtonLink, Container, HillLines } from '@/components/ui';

export default function NotFoundPage({ what }: { what?: string }) {
  useDocumentTitle('Page not found');
  return (
    <section className="relative overflow-hidden">
      <HillLines className="absolute inset-x-0 bottom-0 h-64 w-full text-white" />
      <Container className="relative flex flex-col items-center py-24 text-center sm:py-32">
        <Compass className="h-14 w-14 text-brand-600" aria-hidden />
        <p className="mt-6 font-display text-7xl font-extrabold text-brand-600">404</p>
        <h1 className="mt-2 font-display text-3xl font-bold text-ink">{what ? `We couldn't find that ${what}` : 'This path leads off the map'}</h1>
        <p className="mt-3 max-w-md text-slate-600">The link may be old or mistyped. Search listings or open the map instead.</p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <ButtonLink to="/explore">Explore Rwanda</ButtonLink>
          <ButtonLink to="/map" variant="secondary">Open the map</ButtonLink>
        </div>
      </Container>
    </section>
  );
}
