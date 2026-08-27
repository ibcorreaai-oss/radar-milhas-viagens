'use server';

import { z } from 'zod';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserContext } from '@/lib/auth';
import { isBlocked } from '@/lib/roles';
import { generateTripPlan } from '@/lib/ai/trip-builder';
import type { ExperienceTag, TripOptimization, TripPace, TripVariant } from '@/lib/types';

// Mesmo gate de plano do Consultor IA (app/(app)/consultor-ia/actions.ts) —
// cada geração chama a API da Anthropic (custo real por token), então o
// Trip Builder segue o mesmo controle de custo por plano em vez de ficar
// aberto para qualquer usuário free gerar itinerários ilimitados.
const ELIGIBLE_PLANS = ['pro', 'consultor'];

const formSchema = z.object({
  title: z.string().min(1, 'Dê um nome para a viagem.'),
  origin: z.string().nullable(),
  destination: z.string().nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  nights: z.coerce.number().int().min(1).max(60),
  travelers_adults: z.coerce.number().int().min(1).max(20),
  travelers_children: z.coerce.number().int().min(0).max(20),
  budget_total: z.coerce.number().min(0).nullable(),
  interests: z.array(z.string()),
  pace: z.enum(['tranquilo', 'moderado', 'intenso']),
  variant: z.enum(['economy', 'balanced', 'premium']),
  optimizations: z.array(z.string()),
});

function nullableString(value: FormDataEntryValue | null): string | null {
  const s = String(value ?? '').trim();
  return s || null;
}

export async function createTrip(formData: FormData): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx || isBlocked(ctx.profile)) {
    throw new Error('Faça login para usar o Trip Builder.');
  }
  if (!ELIGIBLE_PLANS.includes(ctx.plan)) {
    throw new Error('O Trip Builder está disponível nos planos Pro e Consultor.');
  }

  const startDate = nullableString(formData.get('start_date'));
  const endDate = nullableString(formData.get('end_date'));
  const budgetRaw = nullableString(formData.get('budget_total'));

  let nights = Number(formData.get('nights') ?? 3);
  if (startDate && endDate) {
    const diff = Math.round((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
    if (diff > 0) nights = diff;
  }

  const parsed = formSchema.parse({
    title: String(formData.get('title') ?? '').trim(),
    origin: nullableString(formData.get('origin')),
    destination: nullableString(formData.get('destination')),
    start_date: startDate,
    end_date: endDate,
    nights,
    travelers_adults: formData.get('travelers_adults') ?? 1,
    travelers_children: formData.get('travelers_children') ?? 0,
    budget_total: budgetRaw ? Number(budgetRaw) : null,
    interests: formData.getAll('interests').map(String),
    pace: formData.get('pace') ?? 'moderado',
    variant: formData.get('variant') ?? 'balanced',
    optimizations: formData.getAll('optimizations').map(String),
  });

  const plan = await generateTripPlan({
    origin: parsed.origin,
    destination: parsed.destination,
    startDate: parsed.start_date,
    endDate: parsed.end_date,
    nights: parsed.nights,
    travelersAdults: parsed.travelers_adults,
    travelersChildren: parsed.travelers_children,
    budgetTotal: parsed.budget_total,
    interests: parsed.interests as ExperienceTag[],
    pace: parsed.pace as TripPace,
    variant: parsed.variant as TripVariant,
    optimizations: parsed.optimizations as TripOptimization[],
  });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('trips')
    .insert({
      user_id: ctx.userId,
      title: parsed.title,
      origin: parsed.origin,
      destination: parsed.destination,
      start_date: parsed.start_date,
      end_date: parsed.end_date,
      travelers_adults: parsed.travelers_adults,
      travelers_children: parsed.travelers_children,
      budget_total: parsed.budget_total,
      interests: parsed.interests,
      pace: parsed.pace,
      variant: parsed.variant,
      optimizations: parsed.optimizations,
      itinerary: plan.itinerary,
      budget_breakdown: plan.budgetBreakdown,
      summary: plan.summary,
      ai_generated: plan.aiGenerated,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Erro ao salvar a viagem: ${error?.message}`);
  }

  redirect(`/viagens/${data.id}`);
}
