import { Link, useParams } from 'react-router-dom';
import { Clock, MapPin, Users, User, Ticket, ChevronLeft } from 'lucide-react';
import { getExperienceById } from '@/services';
import { useAsync } from '@/hooks/useAsync';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { FavoriteButton } from '@/components/cards';
import { ReviewsSection } from '@/components/reviews/ReviewsSection';
import { Badge, ButtonLink, Container, ErrorState, LoadingSpinner, Rating, SmartImage } from '@/components/ui';
import { formatRwf } from '@/utils/format';
import NotFoundPage from './NotFoundPage';

export default function ExperienceDetailsPage() {
  const { id = '' } = useParams();
  const { data: exp, loading, error, reload } = useAsync(() => getExperienceById(id), [id]);
  useDocumentTitle(exp?.title);

  if (loading) return <LoadingSpinner label="Loading experience" />;
  if (error?.includes('not found')) return <NotFoundPage what="experience" />;
  if (error || !exp) return <Container className="py-16"><ErrorState message={error ?? undefined} onRetry={reload} /></Container>;

  return (
    <article>
      <Container className="pt-6">
        <Link to="/explore#explore-listings" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:underline"><ChevronLeft className="h-4 w-4" aria-hidden />All listings</Link>
      </Container>
      <Container className="mt-4 grid gap-10 pb-16 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-8">
          <SmartImage src={exp.image} alt={exp.title} className="aspect-[16/9] w-full rounded-3xl" />
          <header>
            <div className="flex flex-wrap gap-2"><Badge tone="solid">{exp.type}</Badge>{exp.communityLed && <Badge>Community-led</Badge>}</div>
            <h1 className="mt-3 font-display text-4xl font-extrabold tracking-tight text-ink">{exp.title}</h1>
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-slate-600">
              <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4 text-brand-600" aria-hidden />{exp.locationName}</span>
              <Rating value={exp.rating} count={exp.reviewCount} />
            </div>
          </header>
          <p className="max-w-prose text-lg leading-relaxed text-slate-700">{exp.description}</p>
          <dl className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: Clock, label: 'Duration', value: exp.duration },
              { icon: User, label: 'Hosted by', value: exp.hostName },
              { icon: Users, label: 'Who benefits', value: exp.communityLed ? 'Your fee goes to the host community' : 'Licensed operator' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-2xl border border-slate-200 p-4">
                <dt className="flex items-center gap-2 text-sm text-slate-500"><Icon className="h-4 w-4 text-brand-600" aria-hidden />{label}</dt>
                <dd className="mt-1 font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <ReviewsSection target={{ id: exp.id, type: 'experience', name: exp.title }} />
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-3 rounded-3xl border border-slate-200 p-5">
            <p className="font-display text-3xl font-bold text-ink">{formatRwf(exp.priceRwf)}<span className="text-base font-normal text-slate-500"> per person</span></p>
            <ButtonLink to={`/book/experience/${exp.id}`} size="lg" className="w-full"><Ticket className="h-5 w-5" aria-hidden />Book this experience</ButtonLink>
            <FavoriteButton variant="full" className="w-full" item={{ itemId: exp.id, itemType: 'experience', title: exp.title, subtitle: exp.locationName, image: exp.image, href: `/experiences/${exp.id}` }} />
            <ButtonLink to={`/itinerary?add=${exp.locationId}`} variant="ghost" className="w-full">Add {exp.locationName.split(',')[0]} to itinerary</ButtonLink>
          </div>
        </aside>
      </Container>
    </article>
  );
}
