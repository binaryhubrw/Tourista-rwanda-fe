import { Link } from 'react-router-dom';
import { Clock, Users } from 'lucide-react';
import type { Experience } from '@/types';
import { Badge, Rating, SmartImage } from '@/components/ui';
import { formatRwf } from '@/utils/format';
import { FavoriteButton } from './FavoriteButton';

export function ExperienceCard({ experience }: { experience: Experience }) {
  const href = `/experiences/${experience.id}`;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-shadow hover:shadow-lift">
      <div className="relative">
        <SmartImage src={experience.image} alt={experience.title} className="aspect-[16/10] w-full" />
        <Badge tone="glass" className="absolute left-3 top-3">{experience.type}</Badge>
        <FavoriteButton
          className="absolute right-3 top-3"
          item={{ itemId: experience.id, itemType: 'experience', title: experience.title, subtitle: experience.locationName, image: experience.image, href }}
        />
      </div>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-display text-lg font-bold leading-snug text-ink">
          <Link to={href} className="hover:text-brand-700">{experience.title}</Link>
        </h3>
        <p className="mt-1 text-sm text-slate-500">{experience.locationName}</p>
        <p className="mt-3 line-clamp-2 text-[15px] text-slate-600">{experience.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          <span className="inline-flex items-center gap-1"><Clock className="h-4 w-4 text-brand-600" aria-hidden />{experience.duration}</span>
          {experience.communityLed && <span className="inline-flex items-center gap-1"><Users className="h-4 w-4 text-brand-600" aria-hidden />Community-led</span>}
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
          <span className="font-semibold text-ink">{formatRwf(experience.priceRwf)}<span className="text-sm font-normal text-slate-500"> / person</span></span>
          <Rating value={experience.rating} className="text-sm" />
        </div>
      </div>
    </article>
  );
}
