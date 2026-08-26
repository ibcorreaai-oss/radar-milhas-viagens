import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isBlocked } from '@/lib/roles';
import { BlockedAccountScreen } from '@/components/blocked-account-screen';
import type { LoyaltyProgram, UserLoyaltyProgram } from '@/lib/types';
import { OnboardingWizard } from './onboarding-wizard';

// Fica solto em app/onboarding (fora do grupo (app)) — não usa a sidebar do
// AppShell, é um passo único guiado antes do usuário entrar no produto.
export default async function OnboardingPage() {
  const ctx = await getUserContext();

  // O middleware já bloqueia /onboarding sem sessão — isto é defesa em
  // profundidade, mesmo padrão de lib/auth.ts.
  if (!ctx) {
    redirect('/login?next=/onboarding');
  }

  // Achado em revisão adversarial (ETAPA 15.2): app/(app)/layout.tsx troca
  // pra BlockedAccountScreen em toda rota do AppShell, mas /onboarding fica
  // FORA do grupo (app) de propósito (não usa a sidebar) — isso também
  // significava ficar fora daquele enforcement. Uma conta bloqueada
  // continuava vendo o formulário de onboarding inteiro.
  if (isBlocked(ctx.profile)) {
    return <BlockedAccountScreen reason={ctx.profile?.blocked_reason ?? null} />;
  }

  const supabase = await createClient();

  const [{ data: programs }, { data: userPrograms }] = await Promise.all([
    supabase.from('loyalty_programs').select('*').eq('active', true).order('name'),
    supabase.from('user_loyalty_programs').select('*').eq('user_id', ctx.userId),
  ]);

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold">Bem-vindo ao Radar Milhas & Viagens</h1>
          <p className="mt-2 text-muted-foreground">
            A Rada te mostra rapidinho como funciona por aqui. Pode pular qualquer etapa quando
            quiser.
          </p>
        </div>

        <OnboardingWizard
          profile={ctx.profile}
          programs={(programs as LoyaltyProgram[]) ?? []}
          userPrograms={(userPrograms as UserLoyaltyProgram[]) ?? []}
        />
      </div>
    </div>
  );
}
