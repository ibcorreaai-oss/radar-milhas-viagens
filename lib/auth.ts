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
export async function getUserContext(): Promise<UserContext | null> {
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
}
