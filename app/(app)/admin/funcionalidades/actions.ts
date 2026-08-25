'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import { logAuditEvent } from '@/lib/audit-log';
import { featureFlagToggleSchema } from '@/lib/validation/auth-schemas';

// ETAPA 14 (ver AUTH_AND_ADMIN.md §4) — fecha a lacuna registrada desde a
// ETAPA 3.0 em MANUAL_ACTIONS.md: alternar feature_flags só era possível
// via SQL direto no Supabase. Chamada direto do client (não via <form>) —
// o Switch já dá feedback visual instantâneo, não precisa de navegação.
export async function toggleFeatureFlag(key: string, enabled: boolean): Promise<{ error?: string }> {
  const ctx = await requireAdmin();

  const result = featureFlagToggleSchema.safeParse({ key, enabled });
  if (!result.success) {
    return { error: 'Dado inválido.' };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('feature_flags')
    .update({ enabled: result.data.enabled, updated_at: new Date().toISOString() })
    .eq('key', result.data.key);

  if (error) {
    logger.error('audit', 'Falha ao alternar feature flag', {
      userId: ctx.userId,
      key: result.data.key,
      reason: error.message,
    });
    return { error: 'Não foi possível salvar agora. Tente novamente.' };
  }

  logger.info('audit', 'Feature flag alternada', { userId: ctx.userId, key: result.data.key, enabled: result.data.enabled });

  // Registro permanente/consultável via SQL (logger acima é só observação
  // operacional efêmera) — mesmo padrão de toda outra Server Action de
  // /admin/* (ver app/(app)/admin/eventos/actions.ts).
  await logAuditEvent({
    userId: ctx.userId,
    action: result.data.enabled ? 'enable' : 'disable',
    entity: 'feature_flags',
    entityId: result.data.key,
  });

  // A sidebar (components/app-sidebar.tsx) e várias páginas leem flags via
  // lib/feature-flags.ts (cache() por requisição) — precisa revalidar as
  // rotas que dependem delas pra refletir na próxima navegação.
  revalidatePath('/', 'layout');

  return {};
}
