'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserContext } from '@/lib/auth';
import { getHotelProvider } from '@/lib/providers';
import { evaluateOpportunity } from '@/lib/scoring/opportunity-engine';
import { planAllowsMoreSearchesToday } from '@/lib/plans';
import type { NormalizedHotelResult } from '@/lib/providers/types';

// Quantidade de noites entre check-in/check-out — usada só para aplicar o
// filtro de "orçamento máximo por noite" do formulário (o provider devolve o
// preço total da estadia). Mesma lógica do MockHotelProvider.
function nights(checkin: string | null, checkout: string | null): number {
  if (!checkin || !checkout) return 1;
  const diff = new Date(checkout).getTime() - new Date(checkin).getTime();
  if (!Number.isFinite(diff) || diff <= 0) return 1;
  return Math.max(1, Math.round(diff / 86400000));
}

// Server Action usada diretamente como `action` do formulário de busca de
// hotéis (`<form action={searchHotels}>`). Sem estado de loading no client —
// o redirect ao final é que leva o usuário para a tela de resultados.
export async function searchHotels(formData: FormData): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx) {
    redirect('/login');
  }

  const supabase = await createClient();

  // --- Gate de plano: soma buscas de voos + hotéis feitas hoje ---
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const [{ count: flightCount }, { count: hotelCount }] = await Promise.all([
    supabase
      .from('flight_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId)
      .gte('created_at', startOfDay.toISOString()),
    supabase
      .from('hotel_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId)
      .gte('created_at', startOfDay.toISOString()),
  ]);

  const searchesToday = (flightCount ?? 0) + (hotelCount ?? 0);

  if (!planAllowsMoreSearchesToday(ctx.plan, searchesToday)) {
    redirect('/hoteis?limite=1');
  }

  // --- Parse do formulário ---
  const city = String(formData.get('city') ?? '').trim();
  const checkinRaw = String(formData.get('checkin') ?? '').trim();
  const checkin = checkinRaw || null;
  const checkoutRaw = String(formData.get('checkout') ?? '').trim();
  const checkout = checkoutRaw || null;

  const guests = Math.max(1, Number(formData.get('guests') ?? 1) || 1);
  const rooms = Math.max(1, Number(formData.get('rooms') ?? 1) || 1);

  const maxBudgetRaw = String(formData.get('maxBudgetPerNight') ?? '').trim();
  const maxBudgetPerNight = maxBudgetRaw ? Number(maxBudgetRaw) || null : null;

  const starsMinRaw = String(formData.get('starsMin') ?? '').trim();
  const starsMin = starsMinRaw ? Number(starsMinRaw) || 0 : 0;

  const flexibleDates = formData.get('flexibleDates') === 'true';

  if (!city) {
    redirect('/hoteis?erro=1');
  }

  // --- Grava a busca ---
  const { data: insertedSearch, error: insertSearchError } = await supabase
    .from('hotel_searches')
    .insert({
      user_id: ctx.userId,
      city,
      checkin,
      checkout,
      guests,
      rooms,
      flexible_dates: flexibleDates,
    })
    .select('id')
    .single();

  if (insertSearchError || !insertedSearch) {
    throw new Error(`Erro ao salvar busca de hotel: ${insertSearchError?.message ?? 'sem retorno'}`);
  }

  const searchId = insertedSearch.id as string;

  // --- Chama o provider (mock ou API paga, transparente) ---
  const provider = getHotelProvider();
  const allResults = await provider.search({
    city,
    checkin: checkin ?? undefined,
    checkout: checkout ?? undefined,
    guests,
    rooms,
  });

  // --- Filtros vindos do formulário (orçamento/noite e categoria mínima) ---
  // A interface HotelProvider não recebe esses critérios, então filtramos
  // aqui em cima dos resultados normalizados.
  const n = nights(checkin, checkout);
  const results: NormalizedHotelResult[] = allResults.filter((r) => {
    if (starsMin > 0 && (r.stars ?? 0) < starsMin) return false;
    if (maxBudgetPerNight != null && r.cashPrice != null) {
      const perNight = r.cashPrice / n;
      if (perNight > maxBudgetPerNight) return false;
    }
    return true;
  });

  // --- Busca valor médio do milheiro dos programas envolvidos, quando existir ---
  const programNames = Array.from(
    new Set(results.map((r) => r.loyaltyProgram).filter((p): p is string => Boolean(p)))
  );

  const mileValueByProgram = new Map<string, number | null>();
  if (programNames.length > 0) {
    const { data: programs } = await supabase
      .from('loyalty_programs')
      .select('name, average_mile_value')
      .in('name', programNames);

    for (const p of programs ?? []) {
      mileValueByProgram.set(p.name as string, (p.average_mile_value as number | null) ?? null);
    }
  }

  // --- Roda o OpportunityEngine em cada resultado e monta as linhas ---
  const rows = results.map((result) => {
    const averageMileValue = result.loyaltyProgram
      ? mileValueByProgram.get(result.loyaltyProgram) ?? null
      : null;

    const evaluation = evaluateOpportunity({
      cashPrice: result.cashPrice,
      pointsPrice: result.pointsPrice,
      taxes: result.taxes,
      averageMileValue,
      flexibleDates,
    });

    return {
      search_id: searchId,
      provider: result.provider,
      hotel_name: result.hotelName,
      location: result.location,
      rating: result.rating,
      stars: result.stars,
      cash_price: result.cashPrice,
      points_price: result.pointsPrice,
      taxes: result.taxes,
      currency: result.currency,
      loyalty_program: result.loyaltyProgram,
      cancellation_policy: result.cancellationPolicy,
      breakfast_included: result.breakfastIncluded,
      score: evaluation.score,
      recommendation: evaluation.recommendationText,
    };
  });

  if (rows.length > 0) {
    const { error: insertResultsError } = await supabase.from('hotel_results').insert(rows);
    if (insertResultsError) {
      throw new Error(`Erro ao salvar resultados de hotel: ${insertResultsError.message}`);
    }
  }

  redirect(`/hoteis?search=${searchId}`);
}
