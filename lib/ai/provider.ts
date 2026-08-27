// Camada AIProvider (pedida explicitamente pelo Igor após a Fase 8): nenhuma
// feature de IA deste app presume Claude pago como dependência obrigatória.
//
// AI_PROVIDER controla o comportamento:
// - "none"       -> nunca chama IA paga, mesmo com ANTHROPIC_API_KEY configurada.
// - "anthropic"  -> usa Anthropic (única opção paga suportada hoje).
// - não definida -> comportamento retrocompatível: usa Anthropic só se a chave
//                   existir (mesmo padrão já usado antes desta camada existir).
// - qualquer outro valor -> degrada pra "none" (nunca quebra por env mal configurada).
//
// Toda feature que usa este provider PRECISA continuar funcionando com
// AI_PROVIDER=none (fallback determinístico próprio, sem IA) — ver
// lib/ai/trip-builder.ts e lib/ai/concierge.ts.

import Anthropic from '@anthropic-ai/sdk';

export type AIProviderName = 'anthropic' | 'none';

function resolveProviderName(): AIProviderName {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase();
  if (configured === 'none') return 'none';
  if (configured === 'anthropic') return process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'none';
  if (!configured) return process.env.ANTHROPIC_API_KEY ? 'anthropic' : 'none';
  return 'none';
}

export function isAIAvailable(): boolean {
  return resolveProviderName() === 'anthropic';
}

export interface AICompletionParams {
  system?: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  maxTokens?: number;
}

export interface AICompletionResult {
  text: string;
  inputTokens: number;
  outputTokens: number;
}

// Preço aproximado por milhão de tokens (Claude Sonnet, ago/2026) — só para
// log de custo estimado, nunca é uma fatura real (a fatura real vem do
// console da Anthropic).
const APPROX_INPUT_COST_PER_MTOK_USD = 3;
const APPROX_OUTPUT_COST_PER_MTOK_USD = 15;

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  return (inputTokens / 1_000_000) * APPROX_INPUT_COST_PER_MTOK_USD + (outputTokens / 1_000_000) * APPROX_OUTPUT_COST_PER_MTOK_USD;
}

// Retorna null quando a IA não está disponível (provider=none) OU quando a
// chamada falha/retorna vazio — quem chama SEMPRE precisa ter um fallback
// determinístico pronto para esse caso, nunca deve propagar erro pro usuário.
export async function completeWithAI(params: AICompletionParams): Promise<AICompletionResult | null> {
  if (!isAIAvailable()) return null;

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const response = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: params.maxTokens ?? 1024,
    ...(params.system ? { system: params.system } : {}),
    messages: params.messages,
  });

  const textBlock = response.content.find((block) => block.type === 'text');
  const text = textBlock && textBlock.type === 'text' ? textBlock.text : '';
  if (!text) return null;

  return {
    text,
    inputTokens: response.usage?.input_tokens ?? 0,
    outputTokens: response.usage?.output_tokens ?? 0,
  };
}
