import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { Profile, Subscription, PlanId } from '@/lib/types';

export interface UserContext {
  userId: string;
  email: string | null;
  profile: Profile | null;
  subscription: Subscription | null;
  plan: PlanId;
}

// Helper único de "quem é o usuário logado + plano dele", usado em todas as
// páginas server-side que precisam gatear por plano ou saber onboarding_done.
// Retorna null se não há sessão — cada página decide se redireciona
// (o middleware já bloqueia rotas protegidas, isto é defesa em profundidade).
//
// Envolto em cache() de propósito: app/(app)/layout.tsx chama isto pra
// montar o AppShell E quase toda page.tsx chama de novo pra checar plano/
// onboarding — sem cache(), isso são 2 buscas ao Supabase (profile +
// subscription) DUPLICADAS por página carregada. cache() do React dedupe
// chamadas com os mesmos argumentos dentro da mesma passada de renderização
// no servidor — mesma requisição HTTP, não vaza entre usuários/requests.
export const getUserContext = cache(async (): Promise<UserContext | null> => {
  // Antes do Supabase real ser configurado (checklist do README ainda não
  // rodada), trata como "sem sessão" em vez de lançar — createClient() joga
  // erro de propósito pra quem PRECISA do Supabase de verdade, mas pra
  // getUserContext() "não configurado" e "deslogado" são a mesma coisa pra
  // quem chama (a maioria só faz `if (!ctx) redirect('/login')` ou mostra
  // a página em modo público). Sem isso, todo page.tsx do grupo (app) —
  // inclusive páginas públicas como /promocoes, /programas, /calculadora —
  // quebra com 500 assim que entra no ar, antes mesmo do onboarding manual.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const [{ data: profile }, { data: subscription }] = await Promise.all([
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('user_id', user.id).maybeSingle(),
  ]);

  return {
    userId: user.id,
    email: user.email ?? null,
    profile: (profile as Profile) ?? null,
    subscription: (subscription as Subscription) ?? null,
    plan: (subscription?.plan as PlanId) ?? 'free',
  };
});
