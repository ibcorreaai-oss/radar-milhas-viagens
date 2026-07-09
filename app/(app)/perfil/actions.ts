'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserContext } from '@/lib/auth';
import { planHasChannel } from '@/lib/plans';
import type { CabinClass } from '@/lib/types';

// Server Action do formulário de perfil (`<form action={updateProfile}>`).
// Só grava colunas que o GRANT de `profiles` libera para `authenticated`
// (ver supabase/migrations/0001_schema.sql) — "role" nunca entra aqui.
export async function updateProfile(formData: FormData): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx) {
    redirect('/login');
  }

  const supabase = await createClient();

  const fullName = String(formData.get('full_name') ?? '').trim();
  const phone = String(formData.get('phone') ?? '').trim();
  const homeAirport = String(formData.get('home_airport') ?? '').trim().toUpperCase();
  const favoriteDestinationsRaw = String(formData.get('favorite_destinations') ?? '').trim();
  const favoriteDestinations = favoriteDestinationsRaw
    ? favoriteDestinationsRaw
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean)
    : [];
  const cabinClassPreference = (String(formData.get('cabin_class_preference') ?? 'qualquer') ||
    'qualquer') as CabinClass;
  const flexibleDates = formData.get('flexible_dates') === 'true';
  const monthlyBudgetRaw = String(formData.get('monthly_budget') ?? '').trim();
  const monthlyBudget = monthlyBudgetRaw ? Number(monthlyBudgetRaw) : null;
  // Clampa contra o plano atual — mesma regra do onboarding (ver
  // app/onboarding/actions.ts), pra nunca gravar notify_*=true pra um canal
  // que o plano do usuário não libera.
  const notifyEmail = formData.get('notify_email') === 'true' && planHasChannel(ctx.plan, 'email');
  const notifyWhatsapp = formData.get('notify_whatsapp') === 'true' && planHasChannel(ctx.plan, 'whatsapp');
  const preferredCurrency = String(formData.get('preferred_currency') ?? 'BRL').trim() || 'BRL';

  if (!fullName) {
    redirect('/perfil?erro=nome_obrigatorio');
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      full_name: fullName,
      phone: phone || null,
      home_airport: homeAirport || null,
      favorite_destinations: favoriteDestinations,
      cabin_class_preference: cabinClassPreference,
      flexible_dates: flexibleDates,
      monthly_budget: monthlyBudget !== null && !Number.isNaN(monthlyBudget) ? monthlyBudget : null,
      notify_email: notifyEmail,
      notify_whatsapp: notifyWhatsapp,
      preferred_currency: preferredCurrency,
    })
    .eq('user_id', ctx.userId);

  if (error) {
    throw new Error(`Erro ao atualizar perfil: ${error.message}`);
  }

  revalidatePath('/perfil');
  redirect('/perfil?sucesso=1');
}

// Cria ou atualiza o saldo de um programa de pontos do usuário.
export async function upsertUserLoyaltyProgram(formData: FormData): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx) {
    redirect('/login');
  }

  const supabase = await createClient();

  const programId = String(formData.get('program_id') ?? '').trim();
  const pointsBalanceRaw = String(formData.get('points_balance') ?? '').trim();
  const pointsBalance = Math.max(0, Math.trunc(Number(pointsBalanceRaw) || 0));
  const estimatedCostPer1000Raw = String(formData.get('estimated_cost_per_1000') ?? '').trim();
  const estimatedCostPer1000 = estimatedCostPer1000Raw ? Number(estimatedCostPer1000Raw) : null;

  if (!programId) {
    redirect('/perfil?erro=programa_obrigatorio');
  }

  const { error } = await supabase.from('user_loyalty_programs').upsert(
    {
      user_id: ctx.userId,
      program_id: programId,
      points_balance: pointsBalance,
      estimated_cost_per_1000:
        estimatedCostPer1000 !== null && !Number.isNaN(estimatedCostPer1000) ? estimatedCostPer1000 : null,
    },
    { onConflict: 'user_id,program_id' }
  );

  if (error) {
    throw new Error(`Erro ao salvar programa de pontos: ${error.message}`);
  }

  revalidatePath('/perfil');
  redirect('/perfil?sucesso=1');
}

// Remove um programa de pontos do usuário (id de user_loyalty_programs).
export async function deleteUserLoyaltyProgram(formData: FormData): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx) {
    redirect('/login');
  }

  const supabase = await createClient();

  const id = String(formData.get('id') ?? '').trim();
  if (!id) {
    redirect('/perfil');
  }

  const { error } = await supabase
    .from('user_loyalty_programs')
    .delete()
    .eq('id', id)
    .eq('user_id', ctx.userId);

  if (error) {
    throw new Error(`Erro ao remover programa de pontos: ${error.message}`);
  }

  revalidatePath('/perfil');
  redirect('/perfil?sucesso=1');
}
