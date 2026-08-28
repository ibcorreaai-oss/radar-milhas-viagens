// Resolve um texto de origem/destino digitado pelo usuário (DestinationField
// aceita texto livre — código IATA OU nome de cidade) para um código IATA de
// 3 letras, exigido por APIs de voo reais (SerpApi Google Flights, Amadeus,
// Duffel). Best-effort, não autoritativo: cobre só o aeroporto principal de
// cada cidade da lista curada já usada como sugestão de autocomplete
// (lib/destinations.ts, ÚNICA fonte de verdade — não duplicar o mapeamento
// aqui). Cidade fora dessa lista e que não seja já um código de 3 letras não
// resolve, e quem chamar deve cair no fallback mock (nunca inventar código).

import { POPULAR_DESTINATIONS } from '@/lib/destinations';

const IATA_PATTERN = /^[A-Z]{3}$/;

// Remove acento pra casar "Sao Paulo"/"São Paulo"/"SÃO PAULO" com a mesma
// entrada da lista curada, sem precisar de uma variante por grafia.
function normalizeCityKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const CITY_TO_IATA: Record<string, string> = Object.fromEntries(
  POPULAR_DESTINATIONS.filter((d): d is typeof d & { iata: string } => Boolean(d.iata)).map((d) => [
    normalizeCityKey(d.label),
    d.iata,
  ])
);

/** Aceita código IATA já digitado (3 letras) OU nome de cidade da lista curada. */
export function resolveIataCode(input: string): string | null {
  const normalized = input.trim().toUpperCase();
  if (IATA_PATTERN.test(normalized)) return normalized;

  return CITY_TO_IATA[normalizeCityKey(input)] ?? null;
}

// Offset UTC padrão (sem horário de verão) dos aeroportos cobertos acima —
// usado só pra corrigir o horário que a SerpApi devolve sem timezone
// (lib/providers/serpapi-flight-provider.ts) pro instante UTC real. NÃO
// cobre DST (afeta principalmente EUA/Europa em parte do ano — o horário
// mostrado fica ~1h errado nesses períodos) nem aeroporto fora desta lista;
// melhor que assumir UTC/horário do processo às cegas, não é exato.
export const AIRPORT_UTC_OFFSET_HOURS: Record<string, number> = {
  GIG: -3,
  GRU: -3,
  FOR: -3,
  REC: -3,
  MCZ: -3,
  SSA: -3,
  POA: -3,
  FLN: -3,
  NAT: -3,
  IGU: -3,
  CNF: -3,
  BSB: -3,
  MCO: -5,
  MIA: -5,
  JFK: -5,
  CDG: 1,
  LIS: 0,
  OPO: 0,
  EZE: -3,
  SCL: -3,
  CUN: -5,
  PUJ: -4,
};
