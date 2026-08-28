import type { FlightProvider, FlightSearchParams, NormalizedFlightResult } from '@/lib/providers/types';
import { MockFlightProvider } from '@/lib/providers/mock-flight-provider';
import { resolveIataCode } from '@/lib/airport-codes';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';

// SerpApiFlightProvider — dados REAIS de mercado (Google Flights, via
// SerpApi), diferente dos stubs "preparado, não implementado" de
// Amadeus/Duffel neste mesmo diretório.
//
// Zero Hallucination Policy (mesmo espírito de lib/price-observations.ts):
// este provider NUNCA inventa preço em pontos/milhas — o Google Flights só
// tem preço em dinheiro, então pointsPrice sai sempre null aqui (o programa
// de fidelidade da companhia, quando reconhecido, ainda é anexado como
// informação — só a conversão pra pontos é que não é fabricada). O
// OpportunityEngine já trata pointsPrice=null com uma recomendação honesta
// só-dinheiro (lib/scoring/opportunity-engine.ts).
//
// Nunca lança erro pro chamador (app/(app)/voos/actions.ts e
// app/api/cron/check-alerts/route.ts não esperam isso desta camada — só o
// stub do Amadeus/Duffel lança de propósito). Qualquer falha (rota sem
// código IATA resolvido, cota mensal estourada, rede, resposta malformada)
// cai transparentemente no MockFlightProvider, com log estruturado.

const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json';
const DEFAULT_MONTHLY_CAP = 200; // plano Free = 250 buscas/mês; margem de segurança
const MAX_RESULTS = 8;
const REQUEST_TIMEOUT_MS = 10000;

// Google Flights não devolve programa de fidelidade — anexado aqui só como
// informação de contexto (nunca usado para calcular pointsPrice, que
// continua null). Best-effort, cobre as companhias mais comuns em rotas
// envolvendo o Brasil.
const AIRLINE_TO_PROGRAM: Record<string, string> = {
  LATAM: 'LATAM Pass',
  'LATAM Airlines': 'LATAM Pass',
  Azul: 'Azul Fidelidade',
  GOL: 'Smiles',
  'GOL Linhas Aéreas': 'Smiles',
  'TAP Portugal': 'TAP Miles&Go',
  'TAP Air Portugal': 'TAP Miles&Go',
  'Air France': 'Flying Blue',
  KLM: 'Flying Blue',
  'American Airlines': 'AAdvantage',
  Delta: 'SkyMiles',
  'Delta Air Lines': 'SkyMiles',
  United: 'MileagePlus',
  'United Airlines': 'MileagePlus',
  Iberia: 'Iberia Plus',
  'British Airways': 'Executive Club',
  Lufthansa: 'Miles & More',
  'Copa Airlines': 'ConnectMiles',
  Avianca: 'LifeMiles',
  Emirates: 'Skywards',
  'Qatar Airways': 'Privilege Club',
};

interface SerpApiFlightSegment {
  departure_airport: { name: string; id: string; time: string };
  arrival_airport: { name: string; id: string; time: string };
  duration: number;
  airline: string;
  flight_number?: string;
}

interface SerpApiItinerary {
  flights: SerpApiFlightSegment[];
  total_duration: number;
  price: number;
  type?: string;
}

interface SerpApiFlightsResponse {
  search_metadata?: { status?: string };
  error?: string;
  best_flights?: SerpApiItinerary[];
  other_flights?: SerpApiItinerary[];
}

export function isSerpApiConfigured(): boolean {
  return Boolean(process.env.SERPAPI_KEY);
}

function currentYearMonthUTC(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

// Checa e incrementa a cota mensal atomicamente (RPC security definer, ver
// migration 0043). Falha de qualquer tipo (banco indisponível, service role
// não configurada) é tratada como "estourou" — mais seguro nunca gastar
// busca real da SerpApi quando não dá pra confirmar que ainda há cota.
async function stillWithinMonthlyQuota(): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const cap = Number(process.env.SERPAPI_MONTHLY_CAP) || DEFAULT_MONTHLY_CAP;
    const { data, error } = await admin.rpc('increment_provider_usage', {
      p_provider: 'serpapi',
      p_year_month: currentYearMonthUTC(),
      p_cap: cap,
    });
    if (error) {
      logger.warn('integration', 'serpapi: falha ao checar cota mensal, tratando como estourada', {
        reason: error.message,
      });
      return false;
    }
    return Boolean(data);
  } catch (err) {
    logger.warn('integration', 'serpapi: erro inesperado ao checar cota mensal, tratando como estourada', {
      reason: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

function travelClassParam(cabinClass: FlightSearchParams['cabinClass']): number {
  switch (cabinClass) {
    case 'executiva':
      return 3;
    case 'primeira':
      return 4;
    default:
      return 1; // economica | qualquer
  }
}

// Sem timezone por aeroporto na resposta da SerpApi — o horário vem "como o
// Google mostra" (local ao aeroporto), sem offset. Igual a qualquer consumo
// direto dessa API sem uma base própria de timezone por aeroporto, o Date
// resultante é aproximado (interpretado no timezone do processo Node), não
// exato ao segundo — aceitável para exibição de busca de voo, não para
// cálculo de duração (por isso duration_minutes vem sempre do total_duration
// da própria API, nunca recalculado a partir das duas datas).
function parseGoogleFlightsTime(raw: string): string {
  const iso = raw.replace(' ', 'T');
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function mapItinerary(itinerary: SerpApiItinerary): NormalizedFlightResult | null {
  const segments = itinerary.flights;
  if (!segments || segments.length === 0) return null;

  const first = segments[0];
  const last = segments[segments.length - 1];
  const loyaltyProgram = AIRLINE_TO_PROGRAM[first.airline] ?? null;

  return {
    provider: 'serpapi',
    airline: first.airline,
    origin: first.departure_airport.id,
    destination: last.arrival_airport.id,
    departureDatetime: parseGoogleFlightsTime(first.departure_airport.time),
    arrivalDatetime: parseGoogleFlightsTime(last.arrival_airport.time),
    durationMinutes: itinerary.total_duration,
    stops: segments.length - 1,
    cashPrice: typeof itinerary.price === 'number' ? itinerary.price : null,
    pointsPrice: null, // Zero Hallucination Policy — ver comentário no topo do arquivo
    taxes: 0, // preço da SerpApi já é o total (all-in)
    currency: 'BRL',
    loyaltyProgram,
  };
}

export class SerpApiFlightProvider implements FlightProvider {
  readonly name = 'serpapi';

  async search(params: FlightSearchParams): Promise<NormalizedFlightResult[]> {
    try {
      return await this.searchReal(params);
    } catch (err) {
      logger.warn('integration', 'serpapi: busca real falhou, caindo para mock', {
        reason: err instanceof Error ? err.message : String(err),
      });
      return new MockFlightProvider().search(params);
    }
  }

  private async searchReal(params: FlightSearchParams): Promise<NormalizedFlightResult[]> {
    const origin = resolveIataCode(params.origin);
    const destination = resolveIataCode(params.destination);

    // Sem código IATA resolvido ou sem data de ida, a API real não tem como
    // buscar — cai pro mock em vez de tentar um request que sempre falharia.
    if (!origin || !destination || !params.departureDate) {
      return new MockFlightProvider().search(params);
    }

    const withinQuota = await stillWithinMonthlyQuota();
    if (!withinQuota) {
      return new MockFlightProvider().search(params);
    }

    const isRoundTrip = Boolean(params.returnDate);
    const query = new URLSearchParams({
      engine: 'google_flights',
      departure_id: origin,
      arrival_id: destination,
      outbound_date: params.departureDate,
      type: isRoundTrip ? '1' : '2',
      travel_class: String(travelClassParam(params.cabinClass)),
      adults: String(Math.max(1, params.adults)),
      children: String(Math.max(0, params.children)),
      infants_on_lap: String(Math.max(0, params.infants)),
      currency: 'BRL',
      gl: 'br',
      hl: 'pt',
      api_key: process.env.SERPAPI_KEY as string,
    });
    if (isRoundTrip && params.returnDate) query.set('return_date', params.returnDate);

    const response = await fetch(`${SERPAPI_ENDPOINT}?${query.toString()}`, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`SerpApi respondeu ${response.status}`);
    }

    const data = (await response.json()) as SerpApiFlightsResponse;

    if (data.search_metadata?.status === 'Error' || data.error) {
      throw new Error(`SerpApi: ${data.error ?? 'status Error sem detalhe'}`);
    }

    const itineraries = [...(data.best_flights ?? []), ...(data.other_flights ?? [])].slice(0, MAX_RESULTS);
    const results = itineraries.map(mapItinerary).filter((r): r is NormalizedFlightResult => r !== null);

    // Resposta "Success" mas sem nenhum voo pra rota/data (acontece de
    // verdade — rota sem operação naquele dia) não é erro, é resultado
    // vazio real; não cai pro mock (mostraria voos fictícios onde a
    // realidade é "não há voo").
    return results;
  }
}
