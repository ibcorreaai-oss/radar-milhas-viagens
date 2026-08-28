// Resolve um texto de origem/destino digitado pelo usuário (DestinationField
// aceita texto livre — código IATA OU nome de cidade) para um código IATA de
// 3 letras, exigido por APIs de voo reais (SerpApi Google Flights, Amadeus,
// Duffel). Best-effort, não autoritativo: cobre só o aeroporto principal de
// cada cidade da lista curada já usada como sugestão de autocomplete
// (lib/destinations.ts) — cidade fora dessa lista e que não seja já um
// código de 3 letras não resolve, e quem chamar deve cair no fallback mock
// (nunca inventar um código errado).

const CITY_TO_IATA: Record<string, string> = {
  'rio de janeiro': 'GIG',
  'são paulo': 'GRU',
  'sao paulo': 'GRU',
  fortaleza: 'FOR',
  recife: 'REC',
  maceió: 'MCZ',
  maceio: 'MCZ',
  salvador: 'SSA',
  gramado: 'POA', // sem aeroporto comercial próprio — Porto Alegre é o hub mais próximo
  florianópolis: 'FLN',
  florianopolis: 'FLN',
  natal: 'NAT',
  'porto de galinhas': 'REC', // sem aeroporto próprio — Recife é o hub mais próximo
  búzios: 'GIG', // sem aeroporto comercial regular — Rio é o hub mais próximo
  buzios: 'GIG',
  'foz do iguaçu': 'IGU',
  'foz do iguacu': 'IGU',
  'belo horizonte': 'CNF',
  brasília: 'BSB',
  brasilia: 'BSB',
  orlando: 'MCO',
  miami: 'MIA',
  'nova york': 'JFK',
  paris: 'CDG',
  lisboa: 'LIS',
  porto: 'OPO',
  'buenos aires': 'EZE',
  santiago: 'SCL',
  cancún: 'CUN',
  cancun: 'CUN',
  'punta cana': 'PUJ',
};

const IATA_PATTERN = /^[A-Z]{3}$/;

/** Só aceita 3 letras já maiúsculas OU já normaliza (trim+upper) antes de checar. */
export function resolveIataCode(input: string): string | null {
  const normalized = input.trim().toUpperCase();
  if (IATA_PATTERN.test(normalized)) return normalized;

  const byCity = CITY_TO_IATA[input.trim().toLowerCase()];
  return byCity ?? null;
}
