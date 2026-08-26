'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserContext } from '@/lib/auth';
import { planHasChannel } from '@/lib/plans';
import { isBlocked } from '@/lib/roles';
import type { CabinClass } from '@/lib/types';

export interface OnboardingState {
  error?: string;
}

const CABIN_CLASSES: CabinClass[] = ['economica', 'executiva', 'primeira', 'qualquer'];

export async function completeOnboarding(
  _prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Sessão expirada. Faça login novamente.' };
  }

  // ETAPA 18 (ver ENGAGEMENT_UX.md) — "o usuário deve conseguir pular
  // qualquer etapa": nenhum campo do onboarding é mais obrigatório, nem
  // este. Mesmo padrão que app/(app)/perfil/actions.ts já usa pra este
  // mesmo campo (home_airport || null) — só ficava inconsistente aqui.
  const homeAirport = String(formData.get('home_airport') || '').trim().toUpperCase();

  const destinationsRaw = String(formData.get('favorite_destinations') || '');
  const favoriteDestinations = destinationsRaw
    .split(',')
    .map((d) => d.trim())
    .filter(Boolean);

  const cabinClassRaw = String(formData.get('cabin_class_preference') || 'qualquer');
  const cabinClass = (CABIN_CLASSES as string[]).includes(cabinClassRaw)
    ? (cabinClassRaw as CabinClass)
    : 'qualquer';

  const flexibleDates = formData.get('flexible_dates') === 'true';

  // Plano do usuário determina quais canais de alerta ele pode de fato
  // receber (ver lib/plans.ts) — clampa aqui pra nunca gravar notify_*=true
  // pra um canal que o plano atual não libera, mesmo que o switch do form
  // tenha vindo marcado (defesa em profundidade, não só UI).
  const ctx = await getUserContext();
  // ETAPA 15 (ver PLATFORM_ADMIN.md) — mesmo predicado central de
  // lib/roles.ts, aplicado aqui porque este arquivo já busca o próprio
  // getUserContext() um pouco mais abaixo, não é uma query nova.
  if (isBlocked(ctx?.profile)) {
    return { error: 'Sua conta foi suspensa. Entre em contato com o suporte se acha que é um engano.' };
  }
  const plan = ctx?.plan ?? 'free';
  // ETAPA 18 — botão "Pular tudo" manda intent=skip: além de dispensar a
  // validação HTML5 do navegador (formNoValidate no botão), a própria
  // Server Action também não pode barrar em "informe o WhatsApp" — pular
  // tudo precisa funcionar mesmo que o usuário tenha ligado o switch de
  // WhatsApp sem preencher o número numa etapa que nem chegou a visitar.
  const skippedAll = formData.get('intent') === 'skip';
  const notifyEmail = formData.get('notify_email') === 'true' && planHasChannel(plan, 'email');
  const notifyWhatsapp =
    !skippedAll && formData.get('notify_whatsapp') === 'true' && planHasChannel(plan, 'whatsapp');

  const monthlyBudgetRaw = String(formData.get('monthly_budget') || '').trim();
  const monthlyBudgetNumber = monthlyBudgetRaw ? Number(monthlyBudgetRaw) : null;
  const monthlyBudget =
    monthlyBudgetNumber !== null && !Number.isNaN(monthlyBudgetNumber) ? monthlyBudgetNumber : null;

  const phone = String(formData.get('phone') || '').trim();

  if (notifyWhatsapp && !phone) {
    return { error: 'Informe seu WhatsApp para receber alertas por lá.' };
  }

  // NUNCA inclua "role" (ou "plan"/"subscription") aqui — a RLS de
  // profiles nem concede UPDATE nessa coluna para o client (ver GRANT em
  // supabase/migrations/0001_schema.sql), mudança de role é só via
  // service_role (admin action / webhook Stripe).
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      home_airport: homeAirport || null,
      favorite_destinations: favoriteDestinations,
      cabin_class_preference: cabinClass,
      flexible_dates: flexibleDates,
      monthly_budget: monthlyBudget,
      notify_email: notifyEmail,
      notify_whatsapp: notifyWhatsapp,
      phone: phone || null,
      onboarding_done: true,
    })
    .eq('user_id', user.id);

  if (profileError) {
    return { error: 'Não foi possível salvar seus dados. Tente novamente.' };
  }

  const selectedProgramIds = formData.getAll('programs').map(String);

  for (const programId of selectedProgramIds) {
    const balanceRaw = String(formData.get(`balance_${programId}`) || '0').replace(/\D/g, '');
    const balance = balanceRaw ? Number(balanceRaw) : 0;

    const { error: ulpError } = await supabase.from('user_loyalty_programs').upsert(
      {
        user_id: user.id,
        program_id: programId,
        points_balance: Number.isNaN(balance) ? 0 : balance,
      },
      { onConflict: 'user_id,program_id' }
    );

    if (ulpError) {
      // Não trava o onboarding inteiro por causa de um programa com erro.
      console.error('Erro ao salvar programa de fidelidade no onboarding:', programId, ulpError);
    }
  }

  redirect('/dashboard?onboarded=1');
}
