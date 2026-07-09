'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
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

  const homeAirport = String(formData.get('home_airport') || '').trim().toUpperCase();
  if (!homeAirport) {
    return { error: 'Informe sua cidade ou aeroporto de origem.' };
  }

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
  const notifyEmail = formData.get('notify_email') === 'true';
  const notifyWhatsapp = formData.get('notify_whatsapp') === 'true';

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
      home_airport: homeAirport,
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

  redirect('/dashboard');
}
