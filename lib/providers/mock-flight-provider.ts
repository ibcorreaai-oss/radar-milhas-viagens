import type { FlightProvider, FlightSearchParams, NormalizedFlightResult } from '@/lib/providers/types';

const AIRLINES = [
  { name: 'LATAM', program: 'LATAM Pass' },
  { name: 'Azul', program: 'Azul Fidelidade' },
  { name: 'GOL', program: 'Smiles' },
  { name: 'TAP Portugal', program: 'TAP Miles&Go' },
  { name: 'Air France', program: 'Flying Blue' },
];

function seededRandom(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h << 5) - h + seed.charCodeAt(i);
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return (h % 1000) / 1000;
  };
}

// MockFlightProvider — gera resultados plausíveis e determinísticos (mesma
// busca => mesmos resultados) para o MVP funcionar sem nenhuma API paga.
export class MockFlightProvider implements FlightProvider {
  readonly name = 'mock';

  async search(params: FlightSearchParams): Promise<NormalizedFlightResult[]> {
    const seed = `${params.origin}-${params.destination}-${params.departureDate ?? 'flex'}-${params.cabinClass}`;
    const rand = seededRandom(seed);
    const baseDate = params.departureDate ? new Date(params.departureDate) : new Date(Date.now() + 30 * 86400000);

    const cabinMultiplier = { economica: 1, executiva: 3.2, primeira: 5.5, qualquer: 1 }[params.cabinClass];
    const paxMultiplier = params.adults + params.children * 0.75 + params.infants * 0.1;

    return AIRLINES.map((airline, idx) => {
      const r = rand();
      const stops = r > 0.7 ? 2 : r > 0.4 ? 1 : 0;
      const basePrice = (600 + r * 2600) * cabinMultiplier * paxMultiplier;
      const cashPrice = Math.round(basePrice * 100) / 100;
      const milheiroCost = 15 + rand() * 20; // R$ por milheiro implícito nesta oferta
      const pointsPrice = Math.round(((cashPrice * 0.85) / milheiroCost) * 1000);
      const taxes = Math.round((80 + rand() * 220) * paxMultiplier * 100) / 100;
      const durationMinutes = Math.round(120 + r * 600 + stops * 90);

      const departure = new Date(baseDate.getTime() + idx * 3600000 + rand() * 6 * 3600000);
      const arrival = new Date(departure.getTime() + durationMinutes * 60000);

      // Perna de volta — só gerada em busca ida-e-volta, pra não deixar o
      // mock com "menos informação" do que o provider real mostraria pro
      // mesmo tipo de busca (ver SerpApiFlightProvider.searchRoundTrip).
      let returnFields: Partial<NormalizedFlightResult> = {};
      if (params.returnDate) {
        const returnBase = new Date(params.returnDate);
        const returnStops = rand() > 0.7 ? 2 : rand() > 0.4 ? 1 : 0;
        const returnDurationMinutes = Math.round(120 + rand() * 600 + returnStops * 90);
        const returnDeparture = new Date(returnBase.getTime() + idx * 3600000 + rand() * 6 * 3600000);
        const returnArrival = new Date(returnDeparture.getTime() + returnDurationMinutes * 60000);
        returnFields = {
          returnDepartureDatetime: returnDeparture.toISOString(),
          returnArrivalDatetime: returnArrival.toISOString(),
          returnDurationMinutes,
          returnStops,
        };
      }

      return {
        provider: 'mock',
        airline: airline.name,
        origin: params.origin.toUpperCase(),
        destination: params.destination.toUpperCase(),
        departureDatetime: departure.toISOString(),
        arrivalDatetime: arrival.toISOString(),
        durationMinutes,
        stops,
        ...returnFields,
        cashPrice,
        pointsPrice,
        taxes,
        currency: 'BRL',
        loyaltyProgram: airline.program,
      } satisfies NormalizedFlightResult;
    });
  }
}
