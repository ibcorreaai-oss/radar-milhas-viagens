// AI Trip Builder (Fase 8) — gera itinerário + orçamento estimado via a
// camada AIProvider (lib/ai/provider.ts), nunca dependendo diretamente de
// Claude pago (AI_PROVIDER=none ou chave ausente cai sempre no fallback
// determinístico abaixo).
//
// Zero Hallucination Policy: o `budget_breakdown` retornado é SEMPRE uma
// estimativa de IA, nunca um preço real — a UI (app/(app)/viagens/[id])
// precisa deixar isso explícito. O itinerário em si (sugestões de
// passeio/restaurante) é conhecimento geral da IA, não uma reivindicação
// de disponibilidade em tempo real.
//
// AI Cost Control (§27 do PROMPT WORLD EXPERIENCE RADAR): cada chamada
// registra feature/model/tokens/custo estimado/latência/status via
// `logger` — mesmo padrão de observabilidade efêmera já usado no resto do
// app (ver OBSERVABILITY.md), sem tabela nova.

import { z } from 'zod';
import { logger } from '@/lib/logger';
import { completeWithAI, estimateCostUsd } from '@/lib/ai/provider';
import type { ExperienceTag, TripBudgetBreakdown, TripItineraryDay, TripOptimization, TripPace, TripVariant } from '@/lib/types';

export interface GenerateTripInput {
  origin: string | null;
  destination: string | null;
  startDate: string | null;
  endDate: string | null;
  nights: number;
  travelersAdults: number;
  travelersChildren: number;
  budgetTotal: number | null;
  interests: ExperienceTag[];
  pace: TripPace;
  variant: TripVariant;
  optimizations: TripOptimization[];
}

export interface GeneratedTripPlan {
  itinerary: TripItineraryDay[];
  budgetBreakdown: TripBudgetBreakdown;
  summary: string;
  aiGenerated: boolean;
}

const EMPTY_BUDGET: TripBudgetBreakdown = {
  flights: null,
  hotels: null,
  transport: null,
  food: null,
  tickets: null,
  experiences: null,
  cruise: null,
  other: null,
  estimated_total: null,
  currency: 'BRL',
};

const tripPlanSchema = z.object({
  summary: z.string(),
  days: z.array(
    z.object({
      day: z.number(),
      date: z.string().nullable().optional(),
      morning: z.string(),
      afternoon: z.string(),
      evening: z.string(),
    })
  ),
  budget: z.object({
    flights: z.number().nullable().optional(),
    hotels: z.number().nullable().optional(),
    transport: z.number().nullable().optional(),
    food: z.number().nullable().optional(),
    tickets: z.number().nullable().optional(),
    experiences: z.number().nullable().optional(),
    cruise: z.number().nullable().optional(),
    other: z.number().nullable().optional(),
    estimated_total: z.number().nullable().optional(),
    currency: z.string().optional(),
  }),
});

function buildFallbackPlan(input: GenerateTripInput): GeneratedTripPlan {
  const days: TripItineraryDay[] = Array.from({ length: Math.max(1, input.nights) }, (_, i) => {
    const dayNumber = i + 1;
    const isFirst = dayNumber === 1;
    const isLast = dayNumber === input.nights;
    return {
      day: dayNumber,
      date: null,
      morning: isFirst ? 'Chegada, check-in e reconhecimento da região.' : 'Explore pontos turísticos e atrações próximas.',
      afternoon: isLast ? 'Últimas compras/passeios e preparação para o check-out.' : 'Tempo livre para passeios de acordo com seus interesses.',
      evening: isLast ? 'Deslocamento para o aeroporto/rodoviária de partida.' : 'Jantar na região — pesquise opções bem avaliadas no destino.',
    };
  });

  return {
    itinerary: days,
    budgetBreakdown: EMPTY_BUDGET,
    summary:
      'Modo IA completa temporariamente indisponível — este é um roteiro simplificado gerado por regras, sem orçamento estimado. Edite manualmente ou tente gerar novamente mais tarde.',
    aiGenerated: false,
  };
}

function buildSystemPrompt(input: GenerateTripInput): string {
  const optimizationText = input.optimizations.length > 0 ? input.optimizations.join(', ') : 'nenhuma prioridade específica';
  return `Você é o AI Trip Builder do Radar Milhas & Viagens. Monte um itinerário de viagem realista e uma estimativa de orçamento.

Dados da viagem:
- Origem: ${input.origin ?? 'não informada'}
- Destino: ${input.destination ?? 'não informado'}
- Duração: ${input.nights} noites
- Viajantes: ${input.travelersAdults} adulto(s), ${input.travelersChildren} criança(s)
- Orçamento total informado pelo usuário: ${input.budgetTotal != null ? `R$ ${input.budgetTotal}` : 'não informado'}
- Interesses: ${input.interests.length > 0 ? input.interests.join(', ') : 'nenhum específico'}
- Ritmo desejado: ${input.pace}
- Variante: ${input.variant} (economy = mais econômica, balanced = equilibrada, premium = mais luxuosa)
- Prioridades de otimização: ${optimizationText}

Responda ESTRITAMENTE em JSON válido, sem nenhum texto antes ou depois, no seguinte formato:
{
  "summary": "resumo de 1-2 frases sobre a viagem",
  "days": [
    { "day": 1, "date": null, "morning": "...", "afternoon": "...", "evening": "..." }
  ],
  "budget": {
    "flights": number ou null, "hotels": number ou null, "transport": number ou null,
    "food": number ou null, "tickets": number ou null, "experiences": number ou null,
    "cruise": number ou null, "other": number ou null, "estimated_total": number ou null,
    "currency": "BRL"
  }
}

Regras obrigatórias:
- Gere exatamente ${input.nights} dias.
- Valores de orçamento são SEMPRE estimativas gerais (não são preços reais de nenhum provider) — baseie-se em referências realistas de mercado para o destino informado.
- Nunca afirme disponibilidade real de voo, hotel ou ingresso — são apenas sugestões de itinerário.
- Responda em português do Brasil.`;
}

export async function generateTripPlan(input: GenerateTripInput): Promise<GeneratedTripPlan> {
  const startedAt = Date.now();
  const prompt = buildSystemPrompt(input);

  try {
    const completion = await completeWithAI({ messages: [{ role: 'user', content: prompt }], maxTokens: 2048 });
    if (!completion) {
      logger.info('system', 'trip_builder: IA indisponível (provider=none ou sem chave), usando fallback', {
        feature: 'trip_builder',
        status: 'fallback',
      });
      return buildFallbackPlan(input);
    }

    // Claude às vezes envolve o JSON em ```json — extrai só o objeto.
    const jsonMatch = completion.text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('resposta sem JSON identificável');

    const parsed = tripPlanSchema.parse(JSON.parse(jsonMatch[0]));

    logger.info('system', 'trip_builder: geração de IA concluída', {
      feature: 'trip_builder',
      model: 'claude-sonnet-4-5',
      inputTokens: completion.inputTokens,
      outputTokens: completion.outputTokens,
      estimatedCostUsd: Number(estimateCostUsd(completion.inputTokens, completion.outputTokens).toFixed(4)),
      latencyMs: Date.now() - startedAt,
      status: 'success',
    });

    return {
      itinerary: parsed.days.map((d) => ({ day: d.day, date: d.date ?? null, morning: d.morning, afternoon: d.afternoon, evening: d.evening })),
      budgetBreakdown: {
        flights: parsed.budget.flights ?? null,
        hotels: parsed.budget.hotels ?? null,
        transport: parsed.budget.transport ?? null,
        food: parsed.budget.food ?? null,
        tickets: parsed.budget.tickets ?? null,
        experiences: parsed.budget.experiences ?? null,
        cruise: parsed.budget.cruise ?? null,
        other: parsed.budget.other ?? null,
        estimated_total: parsed.budget.estimated_total ?? null,
        currency: parsed.budget.currency ?? 'BRL',
      },
      summary: parsed.summary,
      aiGenerated: true,
    };
  } catch (error) {
    logger.error('system', 'trip_builder: falha na geração de IA, usando fallback', {
      feature: 'trip_builder',
      status: 'error',
      reason: error instanceof Error ? error.message : String(error),
      latencyMs: Date.now() - startedAt,
    });
    return buildFallbackPlan(input);
  }
}
