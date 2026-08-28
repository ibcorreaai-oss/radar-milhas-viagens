// Lista curada de destinos populares — usada só como sugestão de autocomplete
// nos campos de busca (hero da home, /hoteis, /voos). Não é um catálogo do
// banco: o usuário pode digitar qualquer cidade, isto é só atalho de UX.

export interface CuratedDestination {
  label: string;
  region: string | null;
  country: string;
  /**
   * Código IATA do aeroporto principal (best-effort, nem sempre o aeroporto
   * mais próximo tem serviço comercial — ver comentário na entrada quando
   * for esse o caso). Única fonte de verdade pra lib/airport-codes.ts
   * resolver essas cidades pra busca de voo real (SerpApi Google Flights) —
   * não duplicar este mapeamento em outro arquivo.
   */
  iata?: string;
}

export const POPULAR_DESTINATIONS: CuratedDestination[] = [
  { label: 'Rio de Janeiro', region: 'RJ', country: 'Brasil', iata: 'GIG' },
  { label: 'São Paulo', region: 'SP', country: 'Brasil', iata: 'GRU' },
  { label: 'Fortaleza', region: 'CE', country: 'Brasil', iata: 'FOR' },
  { label: 'Recife', region: 'PE', country: 'Brasil', iata: 'REC' },
  { label: 'Maceió', region: 'AL', country: 'Brasil', iata: 'MCZ' },
  { label: 'Salvador', region: 'BA', country: 'Brasil', iata: 'SSA' },
  // Gramado não tem aeroporto comercial próprio — Porto Alegre é o hub mais próximo.
  { label: 'Gramado', region: 'RS', country: 'Brasil', iata: 'POA' },
  { label: 'Florianópolis', region: 'SC', country: 'Brasil', iata: 'FLN' },
  { label: 'Natal', region: 'RN', country: 'Brasil', iata: 'NAT' },
  // Porto de Galinhas não tem aeroporto próprio — Recife é o hub mais próximo.
  { label: 'Porto de Galinhas', region: 'PE', country: 'Brasil', iata: 'REC' },
  // Búzios não tem aeroporto comercial regular — Rio é o hub mais próximo.
  { label: 'Búzios', region: 'RJ', country: 'Brasil', iata: 'GIG' },
  { label: 'Foz do Iguaçu', region: 'PR', country: 'Brasil', iata: 'IGU' },
  { label: 'Belo Horizonte', region: 'MG', country: 'Brasil', iata: 'CNF' },
  { label: 'Brasília', region: 'DF', country: 'Brasil', iata: 'BSB' },
  { label: 'Orlando', region: 'FL', country: 'Estados Unidos', iata: 'MCO' },
  { label: 'Miami', region: 'FL', country: 'Estados Unidos', iata: 'MIA' },
  { label: 'Nova York', region: 'NY', country: 'Estados Unidos', iata: 'JFK' },
  { label: 'Paris', region: null, country: 'França', iata: 'CDG' },
  { label: 'Lisboa', region: null, country: 'Portugal', iata: 'LIS' },
  { label: 'Porto', region: null, country: 'Portugal', iata: 'OPO' },
  { label: 'Buenos Aires', region: null, country: 'Argentina', iata: 'EZE' },
  { label: 'Santiago', region: null, country: 'Chile', iata: 'SCL' },
  { label: 'Cancún', region: null, country: 'México', iata: 'CUN' },
  { label: 'Punta Cana', region: null, country: 'República Dominicana', iata: 'PUJ' },
];

export function destinationSubtitle(d: CuratedDestination): string {
  return d.region ? `${d.region}, ${d.country}` : d.country;
}

export function searchDestinations(query: string, limit = 6): CuratedDestination[] {
  const q = query.trim().toLowerCase();
  if (!q) return POPULAR_DESTINATIONS.slice(0, limit);
  return POPULAR_DESTINATIONS.filter(
    (d) =>
      d.label.toLowerCase().includes(q) ||
      d.country.toLowerCase().includes(q) ||
      (d.region?.toLowerCase().includes(q) ?? false)
  ).slice(0, limit);
}
