import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, Trash2 } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { useToast } from '@/context/ToastContext';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { Badge, ButtonLink, Container, EmptyState, PageHeader, SmartImage } from '@/components/ui';
import type { FavoriteType } from '@/types';
import { cn } from '@/utils/cn';

const tabs: { value: 'all' | FavoriteType; label: string }[] = [
  { value: 'all', label: 'All' }, { value: 'location', label: 'Destinations' }, { value: 'experience', label: 'Experiences' }, { value: 'business', label: 'Businesses & stays' },
];

export function FavoritesGrid({ embedded }: { embedded?: boolean }) {
  const { favorites, removeFavorite } = useFavorites();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof tabs)[number]['value']>('all');
  const list = favorites.filter((f) => tab === 'all' || f.itemType === tab);

  if (!favorites.length) {
    return <EmptyState icon={<Heart className="h-7 w-7" />} title="No saved destinations yet" message="Tap the heart on any destination, experience or business to keep it here for later." action={<ButtonLink to="/explore">Start exploring</ButtonLink>} />;
  }

  return (
    <>
      <div role="tablist" aria-label="Favorite type" className={cn('-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0', embedded && 'mx-0 px-0')}>
        {tabs.map((t) => {
          const count = t.value === 'all' ? favorites.length : favorites.filter((f) => f.itemType === t.value).length;
          return (
            <button key={t.value} role="tab" aria-selected={tab === t.value} onClick={() => setTab(t.value)} className={cn('shrink-0 rounded-full border px-4 py-2 text-sm font-semibold', tab === t.value ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-300 text-slate-700')}>
              {t.label} ({count})
            </button>
          );
        })}
      </div>
      {!list.length ? <EmptyState title="Nothing saved in this category" /> : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((f) => (
            <li key={f.id} className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white">
              <Link to={f.href}><SmartImage src={f.image} alt={f.title} className="aspect-[16/10] w-full" /></Link>
              <div className="flex flex-1 flex-col p-4">
                <Badge className="self-start">{f.itemType === 'location' ? 'Destination' : f.itemType === 'experience' ? 'Experience' : 'Business'}</Badge>
                <h3 className="mt-2 font-display text-lg font-bold text-ink"><Link to={f.href} className="hover:text-brand-700">{f.title}</Link></h3>
                <p className="text-sm text-slate-500">{f.subtitle}</p>
                <button onClick={() => { removeFavorite(f.itemId); toast.success(`${f.title} removed from favorites.`); }} className="mt-auto inline-flex items-center gap-1.5 self-start pt-3 text-sm font-semibold text-red-600 hover:underline">
                  <Trash2 className="h-4 w-4" aria-hidden />Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export default function FavoritesPage() {
  useDocumentTitle('Favorites');
  return (
    <>
      <PageHeader title="Favorites" intro="Places, experiences and businesses you've saved." />
      <Container className="py-8 lg:py-10"><FavoritesGrid /></Container>
    </>
  );
}
