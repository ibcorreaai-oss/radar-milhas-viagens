'use client';

import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOptimisticToggle } from '@/lib/use-optimistic-toggle';
import { toggleFavorite } from '@/app/(app)/favoritos/actions';

export function FavoriteButton({
  itemType,
  itemId,
  initialFavorited,
  className,
}: {
  itemType: 'promotion' | 'loyalty_program';
  itemId: string;
  initialFavorited: boolean;
  className?: string;
}) {
  const { value: favorited, pending, toggle } = useOptimisticToggle(initialFavorited, (next) =>
    toggleFavorite(itemType, itemId, next)
  );

  return (
    <button
      type="button"
      onClick={() => toggle(!favorited)}
      disabled={pending}
      aria-pressed={favorited}
      aria-label={favorited ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      className={cn(
        'shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent/10 hover:text-accent-foreground disabled:opacity-50',
        className
      )}
    >
      <Star className={cn('h-4 w-4', favorited && 'fill-current text-primary')} />
    </button>
  );
}
