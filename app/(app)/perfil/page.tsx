import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ToastFromQuery } from '@/components/toast-from-query';
import { ProfileCompletenessBar } from '@/components/profile-completeness-bar';
import { computeProfileCompleteness } from '@/lib/profile-completeness';
import { ProfileForm, type UserProgramRow, type AllProgramOption } from './profile-form';

export default async function PerfilPage() {
  const ctx = await getUserContext();
  if (!ctx) {
    redirect('/login');
  }

  const supabase = await createClient();

  const [{ data: userProgramsData }, { data: allProgramsData }] = await Promise.all([
    supabase
      .from('user_loyalty_programs')
      .select('*, loyalty_programs(id, name)')
      .eq('user_id', ctx.userId),
    supabase.from('loyalty_programs').select('id, name').eq('active', true).order('name'),
  ]);

  const userPrograms = (userProgramsData ?? []) as unknown as UserProgramRow[];
  const allPrograms = (allProgramsData ?? []) as AllProgramOption[];

  const { percent, items } = computeProfileCompleteness({
    homeAirport: ctx.profile?.home_airport ?? '',
    hasFavoriteDestinations: (ctx.profile?.favorite_destinations?.length ?? 0) > 0,
    hasLoyaltyProgram: userPrograms.length > 0,
    hasNotificationChannel: Boolean(ctx.profile?.notify_email || ctx.profile?.notify_whatsapp),
    hasMonthlyBudget: ctx.profile?.monthly_budget != null,
  });

  return (
    <div className="space-y-6 p-6">
      {/* ETAPA 13: /perfil redirecionava com ?sucesso=1 em 3 actions
          diferentes (actions.ts) e nada consumia o parâmetro — a pessoa
          salvava e não via nenhuma confirmação. Corrigido aqui. */}
      <ToastFromQuery
        rules={[
          { param: 'sucesso', value: '1', variant: 'success', title: 'Perfil atualizado com sucesso.' },
          { param: 'senha', value: '1', variant: 'success', title: 'Senha salva com sucesso.' },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meu perfil</h1>
        <p className="mt-1 text-muted-foreground">
          Dados pessoais, preferências de busca e saldos de pontos.
        </p>
      </div>

      <ProfileCompletenessBar percent={percent} items={items} />

      <ProfileForm profile={ctx.profile} userPrograms={userPrograms} allPrograms={allPrograms} />
    </div>
  );
}
