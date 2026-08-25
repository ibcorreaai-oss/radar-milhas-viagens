import type { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

// ETAPA 15 (ver PLATFORM_ADMIN.md) — checagem única de conta bloqueada,
// chamada logo após CADA caminho de autenticação bem-sucedida (senha, OTP,
// Google/callback, admin-login) — melhor avisar na hora do que deixar a
// pessoa "entrar" e só ser barrada na primeira página protegida
// (app/(app)/layout.tsx já faz essa segunda barreira de qualquer forma —
// isto é só UX melhor, não é a única linha de defesa).
//
// Achado em revisão adversarial: a versão anterior descartava o `error` da
// query e caía em "não bloqueado" — uma falha transiente de rede/RLS
// deixava uma conta genuinamente suspensa entrar durante a janela de erro
// (fail-open). Corrigido pra falhar FECHADO: erro de leitura é tratado como
// "não dá pra confirmar que está seguro", nunca como "está tudo bem".
export type AccountStatus = 'active' | 'blocked' | 'unknown';

export async function checkAccountStatus(
  supabase: SupabaseClient,
  userId: string
): Promise<{ status: AccountStatus; reason: string | null }> {
  const { data, error } = await supabase
    .from('profiles')
    .select('blocked_at, blocked_reason')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    logger.error('auth', 'Falha ao checar status de bloqueio da conta', { userId, reason: error.message });
    return { status: 'unknown', reason: null };
  }
  if (!data?.blocked_at) {
    return { status: 'active', reason: null };
  }
  return { status: 'blocked', reason: data.blocked_reason };
}

export function accountStatusMessage(status: AccountStatus, reason: string | null): string {
  if (status === 'blocked') {
    return reason
      ? `Sua conta foi suspensa: ${reason}. Entre em contato com o suporte se acha que é um engano.`
      : 'Sua conta foi suspensa. Entre em contato com o suporte se acha que é um engano.';
  }
  // 'unknown' — nunca dizer "suspensa" pra um erro transiente, mas também
  // nunca deixar entrar sem saber.
  return 'Não foi possível confirmar o status da sua conta agora. Tente novamente em alguns instantes.';
}
