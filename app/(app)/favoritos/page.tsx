import { redirect } from 'next/navigation';
import { Star } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PromotionCard } from '@/components/promotion-card';
import { LoyaltyProgramCard } from '@/components/loyalty-program-card';
import { EmptyState } from '@/components/empty-state';
import type { Promotion, LoyaltyProgram, Favorite } from '@/lib/types';

export default async function FavoritosPage() {
  const ctx = await getUserContext();
  if (!ctx) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: favoritesData } = await supabase
    .from('favorites')
    .select('*')
    .eq('user_id', ctx.userId)
    .order('created_at', { ascending: false });

  const favorites = (favoritesData ?? []) as Favorite[];
  const promotionIds = favorites.filter((f) => f.item_type === 'promotion').map((f) => f.item_id);
  const programIds = favorites.filter((f) => f.item_type === 'loyalty_program').map((f) => f.item_id);

  const [{ data: promotionsData }, { data: programsData }] = await Promise.all([
    promotionIds.length > 0
      ? supabase.from('promotions').select('*').in('id', promotionIds)
      : Promise.resolve({ data: [] as Promotion[] }),
    programIds.length > 0
      ? supabase.from('loyalty_programs').select('*').in('id', programIds)
      : Promise.resolve({ data: [] as LoyaltyProgram[] }),
  ]);

  const promotions = (promotionsData ?? []) as Promotion[];
  const programs = (programsData ?? []) as LoyaltyProgram[];

  const hasAny = promotions.length > 0 || programs.length > 0;

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Favoritos</h1>
        <p className="mt-1 text-muted-foreground">
          Promoções e programas de pontos que você guardou para achar rápido depois.
        </p>
      </div>

      {!hasAny ? (
        <EmptyState
          title="Você ainda não favoritou nada"
          description="Clique na estrela em qualquer promoção ou programa de pontos para guardar aqui."
          icon={Star}
        />
      ) : (
        <>
          {promotions.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Promoções</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {promotions.map((promotion) => (
                  <PromotionCard key={promotion.id} promotion={promotion} isFavorited />
                ))}
              </div>
            </section>
          )}

          {programs.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Programas de pontos</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {programs.map((program) => (
                  <LoyaltyProgramCard key={program.id} program={program} isFavorited />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
