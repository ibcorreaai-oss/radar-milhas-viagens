'use server';

import { revalidatePath } from 'next/cache';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { favoriteToggleSchema } from '@/lib/validation/auth-schemas';
import { isBlocked } from '@/lib/roles';

// ETAPA 14 (ver AUTH_AND_ADMIN.md §8) — favoritar/desfavoritar promoção ou
// programa. Chamada direto do client (mesmo padrão de toggleFeatureFlag em
// admin/funcionalidades/actions.ts) — o coração já muda na hora, não
// precisa de navegação nem de <form>.
export async function toggleFavorite(
  itemType: 'promotion' | 'loyalty_program',
  itemId: string,
  favorited: boolean
): Promise<{ error?: string }> {
  const ctx = await getUserContext();
  // ETAPA 15 (achado em revisão adversarial) — bloquear alguém só derrubava
  // a renderização (app/(app)/layout.tsx); Server Actions que checavam só
  // "está logado" continuavam aceitando escrita de uma conta suspensa com
  // sessão ainda aberta. Mesmo predicado central de lib/roles.ts.
  if (!ctx || isBlocked(ctx.profile)) {
    return { error: 'Faça login para favoritar.' };
  }

  const result = favoriteToggleSchema.safeParse({ itemType, itemId });
  if (!result.success) {
    return { error: 'Item inválido.' };
  }

  const supabase = await createClient();

  if (favorited) {
    const { error } = await supabase
      .from('favorites')
      .insert({ user_id: ctx.userId, item_type: result.data.itemType, item_id: result.data.itemId });
    if (error) {
      logger.error('audit', 'Falha ao favoritar', { userId: ctx.userId, reason: error.message });
      return { error: 'Não foi possível favoritar agora.' };
    }
  } else {
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('user_id', ctx.userId)
      .eq('item_type', result.data.itemType)
      .eq('item_id', result.data.itemId);
    if (error) {
      logger.error('audit', 'Falha ao desfavoritar', { userId: ctx.userId, reason: error.message });
      return { error: 'Não foi possível remover dos favoritos agora.' };
    }
  }

  revalidatePath('/favoritos');
  return {};
}
