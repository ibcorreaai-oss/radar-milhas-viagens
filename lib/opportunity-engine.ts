// World Opportunity Engine (Fase 5) — agrega world_events + stays + cruises
// por destino e calcula o Trip Opportunity Score de cada um.
//
// Calculado ao vivo a cada request, nunca persistido: a "urgência" do score
// depende de quantos dias faltam para o próximo evento, então um valor
// gravado ficaria desatualizado no dia seguinte (diferente de stay_score/
// cruise_score, que descrevem a experiência em si e mudam raramente).

import { createClient } from '@/lib/supabase/server';
import { evaluateTripOpportunity } from '@/lib/scoring/opportunity-score';
import type { ExplainableScore } from '@/lib/scoring/event-score';
import type { Destination, ExperienceTag } from '@/lib/types';

export interface DestinationOpportunity {
  destination: Pick<Destination, 'id' | 'city' | 'country' | 'country_code' | 'continent'>;
  explanation: ExplainableScore;
  upcomingEventsCount: number;
  staysCount: number;
  cruisesCount: number;
  /** União das experience_tags de todas as estadias catalogadas neste destino — usada pelo Inspire Me (Fase 6). */
  experienceTags: ExperienceTag[];
  /**
   * Menor price_from_cash (estadia ou cruzeiro) neste destino, só quando em BRL — usada pelo
   * modo "Melhor custo-benefício" do Inspire Me. Preços em outra moeda ficam de fora para não
   * comparar valores incompatíveis sem conversão real.
   */
  cheapestPriceBRL: number | null;
}

interface EventRow {
  destination_id: string | null;
  title: string;
  start_date: string | null;
  experience_score: number;
  confidence_score: number;
}

interface StayRow {
  destination_id: string | null;
  stay_score: number;
  confidence_score: number;
  experience_tags: ExperienceTag[];
  price_from_cash: number | null;
  price_currency: string;
}

interface CruiseRow {
  embarkation_destination_id: string | null;
  cruise_score: number;
  confidence_score: number;
  price_from_cash: number | null;
  price_currency: string;
}

export async function getDestinationOpportunities(): Promise<DestinationOpportunity[]> {
  const supabase = await createClient();
  const todayIso = new Date().toISOString().slice(0, 10);

  const [{ data: destinations }, { data: events }, { data: stays }, { data: cruises }] = await Promise.all([
    supabase.from('destinations').select('id, city, country, country_code, continent'),
    supabase
      .from('world_events')
      .select('destination_id, title, start_date, experience_score, confidence_score')
      .not('destination_id', 'is', null)
      .not('status', 'in', '(cancelado,adiado,finalizado)')
      .order('start_date', { ascending: true, nullsFirst: false }),
    supabase
      .from('stays')
      .select('destination_id, stay_score, confidence_score, experience_tags, price_from_cash, price_currency')
      .eq('active', true),
    supabase
      .from('cruises')
      .select('embarkation_destination_id, cruise_score, confidence_score, price_from_cash, price_currency')
      .eq('active', true),
  ]);

  if (!destinations) return [];

  const eventRows = (events ?? []) as EventRow[];
  const stayRows = (stays ?? []) as StayRow[];
  const cruiseRows = (cruises ?? []) as CruiseRow[];

  const results: DestinationOpportunity[] = [];

  for (const destination of destinations) {
    const destEvents = eventRows.filter(
      (e) => e.destination_id === destination.id && (!e.start_date || e.start_date >= todayIso)
    );
    const destStays = stayRows.filter((s) => s.destination_id === destination.id);
    const destCruises = cruiseRows.filter((c) => c.embarkation_destination_id === destination.id);

    if (destEvents.length === 0 && destStays.length === 0 && destCruises.length === 0) continue;

    const nearestEvent = destEvents.find((e) => e.start_date) ?? null;
    const nearestEventDaysUntil = nearestEvent?.start_date
      ? Math.floor((new Date(nearestEvent.start_date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null;

    const bestStayScore = destStays.length ? Math.max(...destStays.map((s) => s.stay_score)) : null;
    const bestCruiseScore = destCruises.length ? Math.max(...destCruises.map((c) => c.cruise_score)) : null;

    const confidences = [
      ...destEvents.map((e) => e.confidence_score),
      ...destStays.map((s) => s.confidence_score),
      ...destCruises.map((c) => c.confidence_score),
    ];
    const averageConfidence = confidences.length ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0.5;

    const explanation = evaluateTripOpportunity({
      upcomingEventsCount: destEvents.length,
      nearestEventDaysUntil,
      nearestEventTitle: nearestEvent?.title ?? null,
      nearestEventScore: nearestEvent?.experience_score ?? null,
      staysCount: destStays.length,
      bestStayScore,
      cruisesCount: destCruises.length,
      bestCruiseScore,
      averageConfidence,
    });

    const experienceTags = Array.from(new Set(destStays.flatMap((s) => s.experience_tags)));
    const brlPrices = [
      ...destStays.filter((s) => s.price_currency === 'BRL' && s.price_from_cash != null).map((s) => s.price_from_cash as number),
      ...destCruises.filter((c) => c.price_currency === 'BRL' && c.price_from_cash != null).map((c) => c.price_from_cash as number),
    ];
    const cheapestPriceBRL = brlPrices.length ? Math.min(...brlPrices) : null;

    results.push({
      destination,
      explanation,
      upcomingEventsCount: destEvents.length,
      staysCount: destStays.length,
      cruisesCount: destCruises.length,
      experienceTags,
      cheapestPriceBRL,
    });
  }

  return results.sort((a, b) => b.explanation.score - a.explanation.score);
}
