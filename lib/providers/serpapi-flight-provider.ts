import type { FlightProvider, FlightSearchParams, NormalizedFlightResult } from '@/lib/providers/types';
import { MockFlightProvider } from '@/lib/providers/mock-flight-provider';
import { resolveIataCode, AIRPORT_UTC_OFFSET_HOURS } from '@/lib/airport-codes';
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
//
// Escopo desta versão: só busca ida simples (one-way) via API real. A busca
// de ida-e-volta da Google Flights API é um fluxo de 2 passos (2º request
// usando o `departure_token` da 1ª resposta pra pegar a perna de volta e o
// preço combinado real) — não implementado ainda; buscas com returnDate
// preenchido caem pro mock em vez de mostrar preço de só-ida como se fosse
// o total da viagem. Reavaliar quando o 2º passo for implementado.

const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json';
const DEFAULT_INTERACTIVE_CAP = 200; // plano Free = 250 buscas/mês; margem de segurança
// Reserva separada pro cron de alertas (app/api/cron/check-alerts/route.ts):
// sem isso, um número modesto de alertas ativos checados 1x/dia esgotaria a
// cota inteira em poucos dias, sem erro visível, e "roubaria" a cota que
// deveria sobrar pra busca interativa do usuário (achado em code-review).
// Bucket próprio ('serpapi_alerts') com teto bem menor.
const DEFAULT_ALERTS_CAP = 30;
const MAX_RESULTS = 10;
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

// Lê o contador atual SEM incrementar (pré-checagem antes de gastar um
// request de rede) — se já estourou, nem tenta a chamada real. Falha de
// qualquer tipo é tratada como "estourou": mais seguro nunca gastar busca
// real da SerpApi quando não dá pra confirmar que ainda há cota.
async function currentUsageCount(bucket: string, yearMonth: string): Promise<number> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('provider_usage_monthly')
      .select('request_count')
      .eq('provider', bucket)
      .eq('year_month', yearMonth)
      .maybeSingle();
    if (error) {
      logger.warn('integration', 'serpapi: falha ao ler cota mensal, tratando como estourada', {
        bucket,
        reason: error.message,
      });
      return Number.POSITIVE_INFINITY;
    }
    return (data?.request_count as number | undefined) ?? 0;
  } catch (err) {
    logger.warn('integration', 'serpapi: erro inesperado ao ler cota mensal, tratando como estourada', {
      bucket,
      reason: err instanceof Error ? err.message : String(err),
    });
    return Number.POSITIVE_INFINITY;
  }
}

// Incrementa o contador SÓ depois de uma chamada real bem-sucedida (achado
// em code-review: incrementar antes do fetch fazia falha transitória de
// rede/SerpApi gastar cota por um resultado que nunca chegou a ser usado).
// Best-effort: falha aqui não derruba a busca que já teve sucesso — só fica
// sem registrar o gasto desta vez (o teto real do plano Free, com cartão
// nenhum cadastrado, continua sendo a rede de segurança final).
async function recordSuccessfulUsage(bucket: string, yearMonth: string, cap: number): Promise<void> {
  try {
    const admin = createAdminClient();
    const { error } = await admin.rpc('increment_provider_usage', {
      p_provider: bucket,
      p_year_month: yearMonth,
      p_cap: cap,
    });
    if (error) {
      logger.warn('integration', 'serpapi: falha ao registrar uso da cota mensal', { bucket, reason: error.message });
    }
  } catch (err) {
    logger.warn('integration', 'serpapi: erro inesperado ao registrar uso da cota mensal', {
      bucket,
      reason: err instanceof Error ? err.message : String(err),
    });
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

// A SerpApi devolve o horário "como o Google mostra" (local ao aeroporto),
// sem offset de timezone. lib/airport-codes.ts tem um mapa de offset UTC
// padrão (sem DST) só pros aeroportos que este app já resolve por nome de
// cidade — corrige pro instante UTC real nesses casos. Fora dessa lista (ou
// pra quem digitou um código IATA de aeroporto não coberto), cai no
// best-effort antigo (assume timezone do processo Node — UTC na Vercel),
// aproximado mas nunca inventado.
function parseGoogleFlightsTime(raw: string, airportId: string): string {
  const iso = raw.replace(' ', 'T');
  const naive = new Date(iso);
  if (Number.isNaN(naive.getTime())) return new Date().toISOString();

  const offsetHours = AIRPORT_UTC_OFFSET_HOURS[airportId];
  if (offsetHours == null) return naive.toISOString();

  return new Date(naive.getTime() - offsetHours * 3600000).toISOString();
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
    departureDatetime: parseGoogleFlightsTime(first.departure_airport.time, first.departure_airport.id),
    arrivalDatetime: parseGoogleFlightsTime(last.arrival_airport.time, last.arrival_airport.id),
    durationMinutes: itinerary.total_duration,
    stops: segments.length - 1,
    cashPrice: typeof itinerary.price === 'number' && itinerary.price > 0 ? itinerary.price : null,
    pointsPrice: null, // Zero Hallucination Policy — ver comentário no topo do arquivo
    taxes: 0, // preço da SerpApi já é o total (all-in)
    currency: 'BRL',
    loyaltyProgram,
  };
}

export class SerpApiFlightProvider implements FlightProvider {
  readonly name = 'serpapi';
  private readonly monthlyCap: number;

  // quotaBucket/monthlyCap permitem reservar uma cota separada por tipo de
  // chamador (ver getFlightProviderForAlerts em lib/providers/index.ts) —
  // sem isso, busca interativa e cron de alerta competiriam pelo mesmo
  // contador global e o cron poderia esgotar a cota sozinho. SERPAPI_MONTHLY_CAP
  // (env var) só afeta o bucket interativo padrão — passar monthlyCap
  // explícito (como getFlightProviderForAlerts faz) nunca é sobrescrito por
  // env var, senão a env var anularia a reserva separada do cron.
  constructor(private readonly quotaBucket: string = 'serpapi', monthlyCap?: number) {
    if (monthlyCap != null) {
      this.monthlyCap = monthlyCap;
    } else if (quotaBucket === 'serpapi') {
      this.monthlyCap = Number(process.env.SERPAPI_MONTHLY_CAP) || DEFAULT_INTERACTIVE_CAP;
    } else {
      this.monthlyCap = DEFAULT_ALERTS_CAP;
    }
  }

  async search(params: FlightSearchParams): Promise<NormalizedFlightResult[]> {
    try {
      return await this.searchReal(params);
    } catch (err) {
      logger.warn('integration', 'serpapi: busca real falhou, caindo para mock', {
        bucket: this.quotaBucket,
        reason: err instanceof Error ? err.message : String(err),
      });
      return new MockFlightProvider().search(params);
    }
  }

  private async searchReal(params: FlightSearchParams): Promise<NormalizedFlightResult[]> {
    const origin = resolveIataCode(params.origin);
    const destination = resolveIataCode(params.destination);

    // Sem código IATA resolvido, sem data de ida, ou busca de ida-e-volta
    // (ver nota de escopo no topo do arquivo) — cai pro mock em vez de
    // tentar/mostrar um preço que não representaria a viagem completa.
    if (!origin || !destination || !params.departureDate || params.returnDate) {
      return new MockFlightProvider().search(params);
    }

    const yearMonth = currentYearMonthUTC();
    const cap = this.monthlyCap;

    const usedSoFar = await currentUsageCount(this.quotaBucket, yearMonth);
    if (usedSoFar >= cap) {
      return new MockFlightProvider().search(params);
    }

    const query = new URLSearchParams({
      engine: 'google_flights',
      departure_id: origin,
      arrival_id: destination,
      outbound_date: params.departureDate,
      type: '2', // one way — ver nota de escopo no topo do arquivo
      travel_class: String(travelClassParam(params.cabinClass)),
      adults: String(Math.max(1, params.adults)),
      children: String(Math.max(0, params.children)),
      // O formulário de busca (FlightSearchForm) só tem um campo "Bebês",
      // sem distinguir colo x assento próprio — mapeado pro caso mais comum
      // (infants_on_lap). Sem impacto no cashPrice retornado hoje: a UI não
      // expõe a diferença de tarifa entre as duas categorias.
      infants_on_lap: String(Math.max(0, params.infants)),
      currency: 'BRL',
      gl: 'br',
      hl: 'pt',
      api_key: process.env.SERPAPI_KEY as string,
    });

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

    // Só registra o gasto de cota depois de confirmar resposta válida —
    // falha de rede/parse acima nunca chega aqui (ver recordSuccessfulUsage).
    await recordSuccessfulUsage(this.quotaBucket, yearMonth, cap);

    const itineraries = [...(data.best_flights ?? []), ...(data.other_flights ?? [])];
    const results = itineraries
      .map(mapItinerary)
      .filter((r): r is NormalizedFlightResult => r !== null)
      // Ordena por preço (nulo por último) ANTES de truncar — sem isso, um
      // resultado mais barato que viesse depois do índice de corte na ordem
      // bruta da API seria descartado (achado em code-review).
      .sort((a, b) => (a.cashPrice ?? Number.POSITIVE_INFINITY) - (b.cashPrice ?? Number.POSITIVE_INFINITY))
      .slice(0, MAX_RESULTS);

    // Resposta "Success" mas sem nenhum voo pra rota/data (acontece de
    // verdade — rota sem operação naquele dia) não é erro, é resultado
    // vazio real; não cai pro mock (mostraria voos fictícios onde a
    // realidade é "não há voo").
    return results;
  }
}
