import { Heart, MapPin, Sparkles, Store } from 'lucide-react';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useFavorites } from '@/context/FavoritesContext';
import { PageHeader, StatCard, StatGrid } from '@/components/dashboard';
import { FavoritesGrid } from '../FavoritesPage';

export default function DashboardFavoritesPage() {
  useDocumentTitle('Favorites');
  const { favorites } = useFavorites();
  const count = (t: string) => favorites.filter((f) => f.itemType === t).length;

  return (
    <>
      <PageHeader title="Favorites" intro="Everything you've saved while exploring." />
      <StatGrid>
        <StatCard label="Saved in total" icon={Heart} tone="rose" value={favorites.length} />
        <StatCard label="Destinations" icon={MapPin} value={count('location')} />
        <StatCard label="Experiences" icon={Sparkles} tone="violet" value={count('experience')} />
        <StatCard label="Local businesses" icon={Store} tone="teal" value={count('business')} />
      </StatGrid>
      <div className="mt-6"><FavoritesGrid embedded /></div>
    </>
  );
}
