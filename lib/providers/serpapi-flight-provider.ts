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
// Ida-e-volta usa o fluxo oficial de 2 passos da Google Flights API: 1)
// busca type=1 com outbound_date+return_date devolve opções de IDA, cada
// uma com um `departure_token`; 2) uma nova busca com esse token devolve as
// opções de VOLTA combinadas com a ida escolhida, e o `price` dessa 2ª
// resposta é o total real da viagem combinada (documentado em
// https://serpapi.com/google-flights-api#api-parameters-next-flights).
//
// Limite de tempo (achado em code-review, 2 rodadas; recalibrado depois de
// validação AO VIVO em produção): app/(app)/voos/actions.ts chama isto
// dentro de uma Server Action síncrona, e este projeto roda no plano Hobby
// da Vercel — funções serverless aí têm um teto RÍGIDO de 10s (não dá pra
// configurar maxDuration maior, é limite da plataforma, não do app).
// Ida-e-volta é 1 (passo 1) + até MAX_ROUND_TRIP_CANDIDATES (passo 2)
// chamadas HTTP SEQUENCIAIS à SerpApi — mas o orçamento de 10s também é
// dividido com várias chamadas ao Supabase no mesmo request
// (currentUsageCount + recordSuccessfulUsage aqui, mais o insert em
// flight_searches/flight_results e as queries de loyalty_programs em
// actions.ts). Primeira tentativa usou 3s por chamada (achado de
// code-review, preocupado com o teto de 10s) — mas isso estourou de
// verdade num teste ao vivo em produção (busca real de ida-e-volta caiu
// pro mock com "operation was aborted due to timeout": o Google Flights
// via SerpApi rotineiramente leva mais de 3s pra responder). 4.5s por
// chamada (REQUEST_TIMEOUT_MS) deixa passar respostas reais da SerpApi sem
// abortar à toa, e ainda mantém o pior caso (2 × 4.5s = 9s) com alguma
// margem pro resto do request — mas não existe garantia formal, é
// mitigação, não uma prova matemática de que nunca estoura. Se o teto da
// Vercel for atingido mesmo assim, a função é morta pela plataforma antes
// do try/catch de fallback rodar (não é um erro capturável) — pior caso
// vira erro genérico pro usuário em vez do fallback gracioso pro mock, não
// um dado errado mostrado.

const SERPAPI_ENDPOINT = 'https://serpapi.com/search.json';
const DEFAULT_INTERACTIVE_CAP = 200; // plano Free = 250 buscas/mês; margem de segurança
// Reserva separada pro cron de alertas (app/api/cron/check-alerts/route.ts):
// sem isso, um número modesto de alertas ativos checados 1x/dia esgotaria a
// cota inteira em poucos dias, sem erro visível, e "roubaria" a cota que
// deveria sobrar pra busca interativa do usuário (achado em code-review).
// Bucket próprio ('serpapi_alerts') com teto bem menor.
const DEFAULT_ALERTS_CAP = 30;
const MAX_RESULTS = 10;
// 4.5s por chamada HTTP à SerpApi — ver nota sobre o teto de 10s do plano
// Hobby e a recalibração pós-teste-ao-vivo no comentário do topo do
// arquivo (o orçamento de 10s também é dividido com chamadas ao Supabase
// no mesmo request, não só estas).
const REQUEST_TIMEOUT_MS = 4500;
// Só a ida mais barata do passo 1 ganha uma 2ª busca (pra achar a volta
// combinada) — ver nota de timeout no topo do arquivo. Subir esse número
// exige também revisar REQUEST_TIMEOUT_MS pra manter N × timeout com folga
// real abaixo do teto de função do plano Hobby.
const MAX_ROUND_TRIP_CANDIDATES = 1;

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
  departure_token?: string;
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

// Comparador genérico "mais barato primeiro" (preço ausente/inválido/<=0
// vai pro final) — um lugar só define esse critério pros dois formatos de
// preço usados neste arquivo (itinerário bruto da SerpApi e
// NormalizedFlightResult já mapeado), em vez de dois comparadores quase
// idênticos duplicados (achado em code-review).
function cheapestFirst<T>(getPrice: (item: T) => number | null | undefined) {
  return (a: T, b: T): number => {
    const priceOf = (x: T) => {
      const price = getPrice(x);
      return typeof price === 'number' && price > 0 ? price : Number.POSITIVE_INFINITY;
    };
    return priceOf(a) - priceOf(b);
  };
}

const byCheapest = cheapestFirst((itinerary: SerpApiItinerary) => itinerary.price);
const byCheapestResult = cheapestFirst((result: NormalizedFlightResult) => result.cashPrice);

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
// Devolve se AINDA está dentro da cota depois deste incremento — usado como
// circuito de segurança em tempo real dentro do fluxo de ida-e-volta (achado
// em code-review: a pré-checagem sozinha não impede 2 buscas concorrentes de
// estourar juntas; checar o retorno real da RPC a cada chamada reduz essa
// janela sem precisar de uma RPC de "reservar N vagas" nova). Best-effort:
// falha aqui não derruba a busca que já teve sucesso — só assume "estourou"
// (mais seguro parar de tentar mais chamadas do que continuar sem saber).
async function recordSuccessfulUsage(bucket: string, yearMonth: string, cap: number): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc('increment_provider_usage', {
      p_provider: bucket,
      p_year_month: yearMonth,
      p_cap: cap,
    });
    if (error) {
      logger.warn('integration', 'serpapi: falha ao registrar uso da cota mensal', { bucket, reason: error.message });
      return false;
    }
    return Boolean(data);
  } catch (err) {
    logger.warn('integration', 'serpapi: erro inesperado ao registrar uso da cota mensal', {
      bucket,
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

// A SerpApi devolve o horário "como o Google mostra" (local ao aeroporto),
// sem offset de timezone. lib/airport-codes.ts tem um mapa de offset UTC
// padrão (sem DST) só pros aeroportos que este app já resolve por nome de
// cidade — corrige pro instante UTC real nesses casos. Fora dessa lista (ou
// pra quem digitou um código IATA de aeroporto não coberto), cai no
// best-effort antigo (assume timezone do processo Node — UTC na Vercel),
// aproximado mas nunca inventado. String realmente não interpretável devolve
// null — achado em code-review: um fallback pro instante "agora" passava
// sem ser notado pela guarda de sanidade ida/volta (qualquer volta futura
// real é "depois de agora"), fabricando um horário de chegada da ida que
// pareceria real. Melhor descartar o itinerário inteiro (mesmo tratamento
// de qualquer outro dado malformado neste arquivo) do que inventar "agora".
function parseGoogleFlightsTime(raw: string, airportId: string): string | null {
  const iso = raw.replace(' ', 'T');
  const naive = new Date(iso);
  if (Number.isNaN(naive.getTime())) return null;

  const offsetHours = AIRPORT_UTC_OFFSET_HOURS[airportId];
  if (offsetHours == null) return naive.toISOString();

  return new Date(naive.getTime() - offsetHours * 3600000).toISOString();
}

interface LegFields {
  airline: string;
  origin: string;
  destination: string;
  departureDatetime: string;
  arrivalDatetime: string;
  durationMinutes: number;
  stops: number;
}

// Extrai os campos de "perna" (origin/destino/horários/duração/paradas) de
// um itinerário — reaproveitado tanto pra ida (campos principais) quanto
// pra volta (campos return*) em mapRoundTripItinerary. Devolve null se a
// resposta da API vier sem duração/segmentos (defensivo — achado em
// code-review: total_duration não tem checagem de runtime em nenhum lugar,
// então uma resposta malformada nunca deve virar "0 min, direto" na UI).
// Loga quando descarta, pra não ficar invisível se acontecer de verdade
// (achado em code-review: essa validação também vale pro caminho de ida
// simples, que antes nunca rejeitava nada).
function legFields(itinerary: SerpApiItinerary): LegFields | null {
  const segments = itinerary.flights;
  if (!segments || segments.length === 0) {
    logger.warn('integration', 'serpapi: itinerário sem segmentos de voo, descartado', {});
    return null;
  }
  if (typeof itinerary.total_duration !== 'number' || itinerary.total_duration <= 0) {
    logger.warn('integration', 'serpapi: itinerário sem total_duration válido, descartado', {
      airline: segments[0]?.airline,
    });
    return null;
  }

  const first = segments[0];
  const last = segments[segments.length - 1];
  const departureDatetime = parseGoogleFlightsTime(first.departure_airport.time, first.departure_airport.id);
  const arrivalDatetime = parseGoogleFlightsTime(last.arrival_airport.time, last.arrival_airport.id);
  if (departureDatetime == null || arrivalDatetime == null) {
    logger.warn('integration', 'serpapi: itinerário com horário não interpretável, descartado', {
      airline: first.airline,
    });
    return null;
  }

  return {
    airline: first.airline,
    origin: first.departure_airport.id,
    destination: last.arrival_airport.id,
    departureDatetime,
    arrivalDatetime,
    durationMinutes: itinerary.total_duration,
    stops: segments.length - 1,
  };
}

// Monta os campos finais comuns a mapItinerary/mapRoundTripItinerary (preço,
// Zero Hallucination Policy, moeda, programa de fidelidade) — um lugar só,
// pra não divergir entre os dois formatos (achado em code-review: os
// comentários já tinham começado a divergir entre as duas funções).
function finalizeResult(
  leg: LegFields,
  cashPrice: number | null,
  extra?: Partial<NormalizedFlightResult>
): NormalizedFlightResult {
  return {
    ...leg,
    provider: 'serpapi',
    cashPrice,
    pointsPrice: null, // Zero Hallucination Policy — ver comentário no topo do arquivo
    taxes: 0, // preço da SerpApi já é o total (all-in)
    currency: 'BRL',
    loyaltyProgram: AIRLINE_TO_PROGRAM[leg.airline] ?? null,
    ...extra,
  };
}

function priceOrNull(itinerary: SerpApiItinerary): number | null {
  return typeof itinerary.price === 'number' && itinerary.price > 0 ? itinerary.price : null;
}

function mapItinerary(itinerary: SerpApiItinerary): NormalizedFlightResult | null {
  const leg = legFields(itinerary);
  if (!leg) return null;
  return finalizeResult(leg, priceOrNull(itinerary));
}

// Combina uma opção de IDA (passo 1) com a opção de VOLTA mais barata
// encontrada pra ela (passo 2) num único NormalizedFlightResult. O preço
// final é sempre o da resposta do passo 2 (`returnItinerary.price`) — é o
// único que representa o total real combinado; o price do passo 1 é só uma
// estimativa preliminar da Google e nunca é usado como cashPrice aqui.
function mapRoundTripItinerary(
  outbound: SerpApiItinerary,
  returnItinerary: SerpApiItinerary
): NormalizedFlightResult | null {
  const outboundLeg = legFields(outbound);
  const returnLeg = legFields(returnItinerary);
  if (!outboundLeg || !returnLeg) return null;

  // Guarda de sanidade (achado em code-review): a volta tem que partir
  // depois da ida chegar. Sem isso, um horário malformado na resposta da
  // API (parseGoogleFlightsTime cai num fallback "agora" se não conseguir
  // interpretar a string) podia gerar uma combinação sem sentido — e pior,
  // violar o CHECK novo do banco (migration 0046) na hora do INSERT,
  // travando a busca inteira com um erro não tratado em vez de só
  // descartar essa combinação específica.
  if (new Date(returnLeg.departureDatetime).getTime() <= new Date(outboundLeg.arrivalDatetime).getTime()) {
    logger.warn('integration', 'serpapi: volta com horário antes/igual à chegada da ida, descartada', {});
    return null;
  }

  return finalizeResult(outboundLeg, priceOrNull(returnItinerary), {
    returnDepartureDatetime: returnLeg.departureDatetime,
    returnArrivalDatetime: returnLeg.arrivalDatetime,
    returnDurationMinutes: returnLeg.durationMinutes,
    returnStops: returnLeg.stops,
  });
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

  private baseQuery(params: FlightSearchParams, origin: string, destination: string): URLSearchParams {
    return new URLSearchParams({
      engine: 'google_flights',
      departure_id: origin,
      arrival_id: destination,
      outbound_date: params.departureDate as string,
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
  }

  // Instrumentação temporária de latência (diagnóstico ao vivo, 28/08):
  // REQUEST_TIMEOUT_MS=4500 ainda estourou em produção real depois de já
  // ter sido subido de 3000 — sem saber a duração real de cada chamada,
  // qualquer novo valor seria só chute. logger.info aqui é best-effort e
  // nunca afeta o resultado da busca.
  private async fetchSerpApi(query: URLSearchParams): Promise<SerpApiFlightsResponse> {
    const startedAt = Date.now();
    try {
      const response = await fetch(`${SERPAPI_ENDPOINT}?${query.toString()}`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      logger.info('integration', 'serpapi: chamada respondeu', {
        elapsedMs: Date.now() - startedAt,
        status: response.status,
      });

      if (!response.ok) {
        throw new Error(`SerpApi respondeu ${response.status}`);
      }

      const data = (await response.json()) as SerpApiFlightsResponse;

      if (data.search_metadata?.status === 'Error' || data.error) {
        throw new Error(`SerpApi: ${data.error ?? 'status Error sem detalhe'}`);
      }

      return data;
    } catch (err) {
      logger.warn('integration', 'serpapi: chamada falhou', {
        elapsedMs: Date.now() - startedAt,
        reason: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  private async searchReal(params: FlightSearchParams): Promise<NormalizedFlightResult[]> {
    const origin = resolveIataCode(params.origin);
    const destination = resolveIataCode(params.destination);

    // Sem código IATA resolvido ou sem data de ida, a API real não tem como
    // buscar — cai pro mock.
    if (!origin || !destination || !params.departureDate) {
      return new MockFlightProvider().search(params);
    }

    return params.returnDate
      ? this.searchRoundTrip(params, origin, destination, params.returnDate)
      : this.searchOneWay(params, origin, destination);
  }

  private async searchOneWay(
    params: FlightSearchParams,
    origin: string,
    destination: string
  ): Promise<NormalizedFlightResult[]> {
    const yearMonth = currentYearMonthUTC();
    const cap = this.monthlyCap;

    const usedSoFar = await currentUsageCount(this.quotaBucket, yearMonth);
    if (usedSoFar >= cap) {
      return new MockFlightProvider().search(params);
    }

    const query = this.baseQuery(params, origin, destination);
    query.set('type', '2'); // one way

    const data = await this.fetchSerpApi(query);

    // Só registra o gasto de cota depois de confirmar resposta válida —
    // falha de rede/parse acima nunca chega aqui.
    await recordSuccessfulUsage(this.quotaBucket, yearMonth, cap);

    const itineraries = [...(data.best_flights ?? []), ...(data.other_flights ?? [])];
    const results = itineraries
      .map(mapItinerary)
      .filter((r): r is NormalizedFlightResult => r !== null)
      // Ordena por preço ANTES de truncar — sem isso, um resultado mais
      // barato que viesse depois do índice de corte na ordem bruta da API
      // seria descartado (achado em code-review).
      .sort(byCheapestResult)
      .slice(0, MAX_RESULTS);

    // Resposta "Success" mas sem nenhum voo pra rota/data (acontece de
    // verdade — rota sem operação naquele dia) não é erro, é resultado
    // vazio real; não cai pro mock (mostraria voos fictícios onde a
    // realidade é "não há voo").
    return results;
  }

  private async searchRoundTrip(
    params: FlightSearchParams,
    origin: string,
    destination: string,
    returnDate: string
  ): Promise<NormalizedFlightResult[]> {
    const yearMonth = currentYearMonthUTC();
    const cap = this.monthlyCap;

    // Pré-checagem exige espaço pro fluxo INTEIRO (1 busca de ida + até
    // MAX_ROUND_TRIP_CANDIDATES buscas de volta) — sem isso, o fluxo podia
    // começar, gastar a busca de ida, e abortar no meio por falta de cota
    // pra buscar a volta, gastando cota sem produzir resultado nenhum.
    const usedSoFar = await currentUsageCount(this.quotaBucket, yearMonth);
    if (usedSoFar + 1 + MAX_ROUND_TRIP_CANDIDATES > cap) {
      return new MockFlightProvider().search(params);
    }

    // --- Passo 1: opções de ida, cada uma com departure_token ---
    const outboundQuery = this.baseQuery(params, origin, destination);
    outboundQuery.set('type', '1'); // round trip
    outboundQuery.set('return_date', returnDate);

    const outboundData = await this.fetchSerpApi(outboundQuery);
    const stillWithinCap = await recordSuccessfulUsage(this.quotaBucket, yearMonth, cap);

    const outboundCandidates = [...(outboundData.best_flights ?? []), ...(outboundData.other_flights ?? [])]
      .filter((it) => Boolean(it.departure_token))
      .sort(byCheapest)
      .slice(0, MAX_ROUND_TRIP_CANDIDATES);

    if (outboundCandidates.length === 0) {
      // Resposta "Success" sem nenhuma opção de ida-e-volta pra essa
      // rota/data — resultado vazio real, não cai pro mock.
      return [];
    }

    // Circuito de segurança em tempo real (achado em code-review): a RPC
    // já confirmou que este incremento estourou a cota — não tenta mais
    // nenhuma chamada real, mesmo com candidatas de ida em mãos.
    if (!stillWithinCap) {
      return new MockFlightProvider().search(params);
    }

    // --- Passo 2: pra cada ida candidata, busca a volta + preço combinado ---
    const combined: NormalizedFlightResult[] = [];

    for (const outbound of outboundCandidates) {
      try {
        const returnQuery = this.baseQuery(params, origin, destination);
        returnQuery.set('type', '1');
        returnQuery.set('return_date', returnDate);
        returnQuery.set('departure_token', outbound.departure_token as string);

        const returnData = await this.fetchSerpApi(returnQuery);
        const returnStillWithinCap = await recordSuccessfulUsage(this.quotaBucket, yearMonth, cap);

        const returnCandidates = [...(returnData.best_flights ?? []), ...(returnData.other_flights ?? [])].sort(
          byCheapest
        );
        // Tenta a mais barata primeiro, mas não para na primeira que a
        // guarda de sanidade de mapRoundTripItinerary rejeitar — as
        // próximas já vieram de graça na mesma resposta (achado em
        // code-review: descartar a busca inteira só porque a opção mais
        // barata tinha um horário malformado, quando a 2ª/3ª mais barata
        // era válida, desperdiçava dado real já pago pela cota).
        for (const candidate of returnCandidates) {
          const mapped = mapRoundTripItinerary(outbound, candidate);
          if (mapped) {
            combined.push(mapped);
            break;
          }
        }

        // Circuito de segurança em tempo real (achado em code-review): se
        // esta chamada já estourou a cota, para de tentar candidatas
        // seguintes — hoje adormecido (MAX_ROUND_TRIP_CANDIDATES=1, só 1
        // iteração), mas documentado aqui pra não virar armadilha se esse
        // teto subir no futuro sem revisar este loop de novo.
        if (!returnStillWithinCap) break;
      } catch (err) {
        // Uma candidata de ida falhar na busca da volta não derruba as
        // outras — só essa combinação fica de fora do resultado.
        logger.warn('integration', 'serpapi: falha buscando volta pra uma candidata de ida', {
          bucket: this.quotaBucket,
          reason: err instanceof Error ? err.message : String(err),
        });
      }
    }

    // Nenhuma combinação ida+volta resolvida (todas as buscas do passo 2
    // falharam) — tratado como resultado vazio real, igual à checagem de
    // outboundCandidates acima: a diferença entre "a Google não tem
    // ida-e-volta pra essa busca" e "nossas tentativas de achar a volta
    // falharam" não é visível pro usuário, e cair pro mock aqui fabricaria
    // TANTO a ida quanto a volta — descartando a ida real que a cota já
    // pagou pra confirmar. Melhor mostrar vazio (usuário pode tentar de
    // novo) do que inventar uma viagem inteira.
    return combined.sort(byCheapestResult);
  }
}
