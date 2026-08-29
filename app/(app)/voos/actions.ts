'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserContext } from '@/lib/auth';
import { isBlocked } from '@/lib/roles';
import { getFlightProvider } from '@/lib/providers';
import { evaluateOpportunity } from '@/lib/scoring/opportunity-engine';
import { planAllowsMoreSearchesToday } from '@/lib/plans';
import { startOfDayBrazil } from '@/lib/utils';
import type { CabinClass } from '@/lib/types';

// Server Action usada diretamente como `action` do formulário de busca de
// voos (`<form action={searchFlights}>`). Sem estado de loading no client —
// o redirect ao final é que leva o usuário para a tela de resultados.
export async function searchFlights(formData: FormData): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx || isBlocked(ctx.profile)) {
    redirect('/login');
  }

  const supabase = await createClient();

  // --- Gate de plano: soma buscas de voos + hotéis feitas hoje ---
  const startOfDay = startOfDayBrazil();

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
    redirect('/voos?limite=1');
  }

  // --- Parse do formulário ---
  const origin = String(formData.get('origin') ?? '').trim().toUpperCase();
  const destination = String(formData.get('destination') ?? '').trim().toUpperCase();
  const departureDateRaw = String(formData.get('departureDate') ?? '').trim();
  const departureDate = departureDateRaw || null;
  const oneWay = formData.get('oneWay') === 'true';
  const returnDateRaw = String(formData.get('returnDate') ?? '').trim();
  const returnDate = oneWay ? null : returnDateRaw || null;
  const cabinClass = (String(formData.get('cabinClass') ?? 'economica') || 'economica') as CabinClass;
  const flexibleDates = formData.get('flexibleDates') === 'true';

  const adults = Math.max(1, Number(formData.get('adults') ?? 1) || 1);
  const children = Math.max(0, Number(formData.get('children') ?? 0) || 0);
  const infants = Math.max(0, Number(formData.get('infants') ?? 0) || 0);

  if (!origin || !destination) {
    redirect('/voos');
  }

  // --- Grava a busca ---
  const { data: insertedSearch, error: insertSearchError } = await supabase
    .from('flight_searches')
    .insert({
      user_id: ctx.userId,
      origin,
      destination,
      departure_date: departureDate,
      return_date: returnDate,
      cabin_class: cabinClass,
      passengers_adults: adults,
      passengers_children: children,
      passengers_infants: infants,
      flexible_dates: flexibleDates,
    })
    .select('id')
    .single();

  if (insertSearchError || !insertedSearch) {
    throw new Error(`Erro ao salvar busca de voo: ${insertSearchError?.message ?? 'sem retorno'}`);
  }

  const searchId = insertedSearch.id as string;

  // --- Chama o provider (mock ou API paga, transparente) ---
  const provider = getFlightProvider();
  const results = await provider.search({
    origin,
    destination,
    departureDate: departureDate ?? undefined,
    returnDate: returnDate ?? undefined,
    cabinClass,
    adults,
    children,
    infants,
    flexibleDates,
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

    // Ida-e-volta: usa a PIOR das duas pernas pra paradas — um resultado
    // com ida direta mas volta com 2 conexões não pode pontuar como se a
    // viagem inteira fosse direta (achado em code-review). result.stops
    // sozinho só representa a ida.
    const combinedStops =
      result.returnStops != null ? Math.max(result.stops, result.returnStops) : result.stops;

    const evaluation = evaluateOpportunity({
      cashPrice: result.cashPrice,
      pointsPrice: result.pointsPrice,
      taxes: result.taxes,
      averageMileValue,
      flexibleDates,
      stops: combinedStops,
      durationMinutes: result.durationMinutes,
    });

    return {
      search_id: searchId,
      provider: result.provider,
      airline: result.airline,
      origin: result.origin,
      destination: result.destination,
      departure_datetime: result.departureDatetime,
      arrival_datetime: result.arrivalDatetime,
      duration_minutes: result.durationMinutes,
      stops: result.stops,
      return_departure_datetime: result.returnDepartureDatetime ?? null,
      return_arrival_datetime: result.returnArrivalDatetime ?? null,
      return_duration_minutes: result.returnDurationMinutes ?? null,
      return_stops: result.returnStops ?? null,
      cash_price: result.cashPrice,
      points_price: result.pointsPrice,
      taxes: result.taxes,
      currency: result.currency,
      loyalty_program: result.loyaltyProgram,
      score: evaluation.score,
      recommendation: evaluation.recommendationText,
    };
  });

  if (rows.length > 0) {
    const { error: insertResultsError } = await supabase.from('flight_results').insert(rows);
    if (insertResultsError) {
      throw new Error(`Erro ao salvar resultados de voo: ${insertResultsError.message}`);
    }
  }

  redirect(`/voos?search=${searchId}`);
}
