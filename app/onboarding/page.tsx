import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { LoyaltyProgram, UserLoyaltyProgram } from '@/lib/types';
import { OnboardingForm } from './onboarding-form';

// Fica solto em app/onboarding (fora do grupo (app)) — não usa a sidebar do
// AppShell, é um passo único guiado antes do usuário entrar no produto.
export default async function OnboardingPage() {
  const ctx = await getUserContext();

  // O middleware já bloqueia /onboarding sem sessão — isto é defesa em
  // profundidade, mesmo padrão de lib/auth.ts.
  if (!ctx) {
    redirect('/login?next=/onboarding');
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
          <h1 className="text-2xl font-semibold">Vamos personalizar seus alertas</h1>
          <p className="mt-2 text-muted-foreground">
            Leva menos de 2 minutos. Quanto mais completo, mais precisos ficam os alertas de
            viagem que o Radar te manda.
          </p>
        </div>

        <OnboardingForm
          profile={ctx.profile}
          programs={(programs as LoyaltyProgram[]) ?? []}
          userPrograms={(userPrograms as UserLoyaltyProgram[]) ?? []}
        />
      </div>
    </div>
  );
}
