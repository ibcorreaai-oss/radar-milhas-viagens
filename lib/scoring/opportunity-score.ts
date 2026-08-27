// Trip Opportunity Score — motor do World Opportunity Engine (Fase 5).
//
// Responde "vale a pena viajar para esse destino AGORA?" cruzando eventos
// (world_events), hospedagens (stays) e cruzeiros (cruises) já catalogados
// pelas Fases 2-4. Mesmo formato ExplainableScore dos outros motores
// (event-score.ts, stay-score.ts, cruise-score.ts) — 100% determinístico.
//
// Zero Hallucination Policy (PROMPT WORLD EXPERIENCE RADAR §3): este app
// não tem provider de preço de voo/hotel ao vivo (flight_results/
// hotel_results existentes são busca por usuário com provider='mock', não
// um feed de preços por destino). Por isso o componente de preço NUNCA
// entra no score — é sempre declarado "dado indisponível" em vez de
// estimado, para não fingir uma precisão que não existe (§44).

import type { ExplainableScore, Urgency } from './event-score';

export interface TripOpportunityInput {
  upcomingEventsCount: number;
  nearestEventDaysUntil: number | null;
  nearestEventTitle: string | null;
  nearestEventScore: number | null;
  staysCount: number;
  bestStayScore: number | null;
  cruisesCount: number;
  bestCruiseScore: number | null;
  /** 0-1 — média do confidence_score dos registros (eventos+stays+cruzeiros) usados. */
  averageConfidence: number;
}

export function evaluateTripOpportunity(input: TripOpportunityInput): ExplainableScore {
  const positives: string[] = [];
  const negatives: string[] = [];
  let score = 40;

  if (input.nearestEventDaysUntil != null && input.nearestEventDaysUntil >= 0) {
    const eventLabel = input.nearestEventTitle ?? 'Evento relevante';
    if (input.nearestEventDaysUntil <= 30) {
      score += 20;
      positives.push(`${eventLabel} acontece em ${input.nearestEventDaysUntil} dia(s)`);
    } else if (input.nearestEventDaysUntil <= 90) {
      score += 12;
      positives.push(`${eventLabel} acontece em ${input.nearestEventDaysUntil} dias`);
    } else if (input.nearestEventDaysUntil <= 180) {
      score += 5;
      positives.push(`${eventLabel} previsto para daqui a ${input.nearestEventDaysUntil} dias`);
    }
    if (input.nearestEventScore != null && input.nearestEventScore >= 80) {
      score += 6;
      positives.push('Evento com Experience Score alto');
    }
  }

  if (input.staysCount > 0) {
    const stayQualityBonus = input.bestStayScore != null ? Math.max(0, Math.round((input.bestStayScore - 50) / 4)) : 0;
    score += Math.min(10, input.staysCount * 2) + stayQualityBonus;
    positives.push(
      `${input.staysCount} hospedagem(ns) extraordinária(s) catalogada(s)${input.bestStayScore != null ? ` (melhor Stay Score: ${input.bestStayScore}/100)` : ''}`
    );
  }

  if (input.cruisesCount > 0) {
    const cruiseQualityBonus = input.bestCruiseScore != null ? Math.max(0, Math.round((input.bestCruiseScore - 50) / 4)) : 0;
    score += Math.min(8, input.cruisesCount * 3) + cruiseQualityBonus;
    positives.push(
      `${input.cruisesCount} cruzeiro(s) com embarque neste destino${input.bestCruiseScore != null ? ` (melhor Cruise Score: ${input.bestCruiseScore}/100)` : ''}`
    );
  }

  if (input.upcomingEventsCount === 0 && input.staysCount === 0 && input.cruisesCount === 0) {
    score -= 20;
    negatives.push('Nenhum evento, hospedagem ou cruzeiro catalogado para este destino no momento');
  }

  score += (input.averageConfidence - 0.5) * 20;
  if (input.averageConfidence >= 0.7) {
    positives.push('Dados subjacentes com boa confiança/proveniência');
  } else if (input.averageConfidence < 0.5) {
    negatives.push('Confiança dos dados subjacentes ainda é baixa — trate como estimativa');
  }

  negatives.push('Preço de voo e hotel ao vivo: dado indisponível (nenhum provider de preço configurado) — não incluído no score');

  score = Math.max(0, Math.min(100, Math.round(score)));

  const label =
    score >= 85
      ? 'Excelente oportunidade agora'
      : score >= 70
        ? 'Boa oportunidade'
        : score >= 50
          ? 'Vale acompanhar'
          : 'Poucos motivos para viajar agora';

  let urgency: Urgency = 'LOW';
  if (input.nearestEventDaysUntil != null && input.nearestEventDaysUntil >= 0) {
    if (input.nearestEventDaysUntil <= 30) urgency = 'HIGH';
    else if (input.nearestEventDaysUntil <= 90) urgency = 'MEDIUM';
  }

  return {
    score,
    label,
    reasons: [...positives, ...negatives],
    positives,
    negatives,
    urgency,
    confidence: input.averageConfidence,
  };
}
