// Lista curada de destinos populares — usada só como sugestão de autocomplete
// nos campos de busca (hero da home, /hoteis, /voos). Não é um catálogo do
// banco: o usuário pode digitar qualquer cidade, isto é só atalho de UX.

export interface CuratedDestination {
  label: string;
  region: string | null;
  country: string;
}

export const POPULAR_DESTINATIONS: CuratedDestination[] = [
  { label: 'Rio de Janeiro', region: 'RJ', country: 'Brasil' },
  { label: 'São Paulo', region: 'SP', country: 'Brasil' },
  { label: 'Fortaleza', region: 'CE', country: 'Brasil' },
  { label: 'Recife', region: 'PE', country: 'Brasil' },
  { label: 'Maceió', region: 'AL', country: 'Brasil' },
  { label: 'Salvador', region: 'BA', country: 'Brasil' },
  { label: 'Gramado', region: 'RS', country: 'Brasil' },
  { label: 'Florianópolis', region: 'SC', country: 'Brasil' },
  { label: 'Natal', region: 'RN', country: 'Brasil' },
  { label: 'Porto de Galinhas', region: 'PE', country: 'Brasil' },
  { label: 'Búzios', region: 'RJ', country: 'Brasil' },
  { label: 'Foz do Iguaçu', region: 'PR', country: 'Brasil' },
  { label: 'Belo Horizonte', region: 'MG', country: 'Brasil' },
  { label: 'Brasília', region: 'DF', country: 'Brasil' },
  { label: 'Orlando', region: 'FL', country: 'Estados Unidos' },
  { label: 'Miami', region: 'FL', country: 'Estados Unidos' },
  { label: 'Nova York', region: 'NY', country: 'Estados Unidos' },
  { label: 'Paris', region: null, country: 'França' },
  { label: 'Lisboa', region: null, country: 'Portugal' },
  { label: 'Porto', region: null, country: 'Portugal' },
  { label: 'Buenos Aires', region: null, country: 'Argentina' },
  { label: 'Santiago', region: null, country: 'Chile' },
  { label: 'Cancún', region: null, country: 'México' },
  { label: 'Punta Cana', region: null, country: 'República Dominicana' },
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
