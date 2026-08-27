// Inspire Me (Fase 6) — responde "onde eu deveria estar?" reaproveitando o
// World Opportunity Engine da Fase 5 (nenhum motor de score novo, conforme
// PROMPT WORLD EXPERIENCE RADAR §6 pede explicitamente).
//
// Escopo deliberadamente reduzido em relação à lista literal de inputs do
// prompt (origem/datas/orçamento/viajantes/duração): este app não tem
// provider de preço de voo/hotel por destino nem dado de duração de
// deslocamento, então filtrar por "orçamento exato" ou "cabe no fim de
// semana" seria inventar precisão que não existe (Zero Hallucination
// Policy, §3). Os únicos filtros implementados são os que o banco consegue
// responder honestamente: continente (destinations.continent) e interesse/
// modo (experience_tags das estadias catalogadas, ou presença de eventos).
// "Melhor custo-benefício" usa price_from_cash real (curado, em BRL) — não
// é inventado, é o mesmo preço estimado já exibido em /estadias e /cruzeiros.

import type { DestinationOpportunity } from './opportunity-engine';
import type { ExperienceTag } from './types';

export type InspireMode =
  | 'surpreenda'
  | 'custo_beneficio'
  | 'fim_de_semana'
  | 'romantico'
  | 'familia'
  | 'luxo'
  | 'aventura'
  | 'praia'
  | 'neve'
  | 'eventos'
  | 'natureza'
  | 'gastronomia';

export const INSPIRE_MODE_LABEL: Record<InspireMode, string> = {
  surpreenda: 'Surpreenda-me',
  custo_beneficio: 'Melhor custo-benefício',
  fim_de_semana: 'Fim de semana',
  romantico: 'Romântico',
  familia: 'Família',
  luxo: 'Luxo',
  aventura: 'Aventura',
  praia: 'Praia',
  neve: 'Neve',
  eventos: 'Eventos',
  natureza: 'Natureza',
  gastronomia: 'Gastronomia',
};

const MODE_TAG: Partial<Record<InspireMode, ExperienceTag>> = {
  romantico: 'ROMANTIC',
  familia: 'FAMILY',
  luxo: 'LUXURY',
  aventura: 'ADVENTURE',
  praia: 'BEACH',
  neve: 'SNOW',
  natureza: 'NATURE',
  gastronomia: 'GASTRONOMY',
};

const TOP_N = 10;

export function rankForInspireMe(
  opportunities: DestinationOpportunity[],
  mode: InspireMode,
  continent: string | null
): DestinationOpportunity[] {
  let pool = continent ? opportunities.filter((o) => o.destination.continent === continent) : opportunities;

  const tag = MODE_TAG[mode];
  if (tag) {
    // Sem fallback silencioso pro ranking padrão: mostrar vazio é mais honesto
    // do que devolver destinos que não têm essa característica catalogada.
    return pool.filter((o) => o.experienceTags.includes(tag)).slice(0, TOP_N);
  }

  if (mode === 'eventos') {
    return pool.filter((o) => o.upcomingEventsCount > 0).slice(0, TOP_N);
  }

  if (mode === 'custo_beneficio') {
    return [...pool]
      .filter((o) => o.cheapestPriceBRL != null)
      .sort((a, b) => b.explanation.score / (b.cheapestPriceBRL as number) - a.explanation.score / (a.cheapestPriceBRL as number))
      .slice(0, TOP_N);
  }

  // "fim_de_semana" e "surpreenda": sem dado de duração de deslocamento pra
  // diferenciar honestamente — usam o mesmo ranking padrão do Opportunity
  // Engine (score desc), documentado no IMPLEMENTATION_PLAN.md.
  return pool.slice(0, TOP_N);
}
