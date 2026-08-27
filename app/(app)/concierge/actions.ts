'use server';

import { getUserContext } from '@/lib/auth';
import { isBlocked } from '@/lib/roles';
import { getFeatureFlags } from '@/lib/feature-flags';
import { askConcierge as askConciergeImpl, type ConciergeMessage, type AskConciergeResult } from '@/lib/ai/concierge';

export type { ConciergeMessage, AskConciergeResult };

// Mesmo gate de plano do Consultor IA/Trip Builder — o Concierge também
// pode chamar uma API de IA paga quando AI_PROVIDER=anthropic estiver
// configurado, então segue o mesmo controle de custo por plano.
const ELIGIBLE_PLANS = ['pro', 'consultor'];

export async function askConciergeAction(history: ConciergeMessage[], message: string): Promise<AskConciergeResult> {
  const flags = await getFeatureFlags();
  if (!flags.conciergeAI) return { error: 'Recurso indisponível' };

  const ctx = await getUserContext();
  if (!ctx || isBlocked(ctx.profile)) return { error: 'Sem acesso' };
  if (!ELIGIBLE_PLANS.includes(ctx.plan)) return { error: 'Disponível nos planos Pro e Consultor' };

  return askConciergeImpl(history, message);
}
