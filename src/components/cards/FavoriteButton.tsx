import { Heart } from 'lucide-react';
import { useFavorites } from '@/context/FavoritesContext';
import { useToast } from '@/context/ToastContext';
import type { Favorite } from '@/types';
import { cn } from '@/utils/cn';

type Item = Omit<Favorite, 'id' | 'addedAt'>;

export function FavoriteButton({ item, variant = 'icon', className }: { item: Item; variant?: 'icon' | 'full'; className?: string }) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const toast = useToast();
  const active = isFavorite(item.itemId);

  const onClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const added = toggleFavorite(item);
    toast.success(added ? `${item.title} added to favorites.` : `${item.title} removed from favorites.`);
  };

  if (variant === 'full') {
    return (
      <button
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          'inline-flex h-11 items-center justify-center gap-2 rounded-full border px-5 text-[15px] font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600',
          active ? 'border-brand-600 bg-brand-600 text-white' : 'border-brand-600 bg-white text-brand-600 hover:bg-brand-50',
          className,
        )}
      >
        <Heart className={cn('h-4 w-4', active && 'fill-white')} aria-hidden />
        {active ? 'Saved to favorites' : 'Add to favorites'}
      </button>
    );
  }
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={active ? `Remove ${item.title} from favorites` : `Add ${item.title} to favorites`}
      className={cn('grid h-10 w-10 place-items-center rounded-full bg-white/95 text-brand-600 shadow-sm transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600', className)}
    >
      <Heart className={cn('h-5 w-5', active && 'fill-brand-600 text-brand-600')} aria-hidden />
    </button>
  );
}
