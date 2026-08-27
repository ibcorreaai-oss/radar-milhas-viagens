// Camada AIProvider (pedida explicitamente pelo Igor após a Fase 8, reforçada
// depois: "não quero gastar nada com API, coloque IA gratuita"): nenhuma
// feature de IA deste app presume Claude pago como dependência obrigatória, e
// o provider gratuito (Groq) é preferido por padrão sempre que configurado.
//
// AI_PROVIDER controla o comportamento:
// - "none"       -> nunca chama nenhuma IA, mesmo com chaves configuradas.
// - "groq"       -> usa Groq (grátis, free tier — mesmo provider já usado em
//                   outros bots do Igor) se GROQ_API_KEY + GROQ_MODEL existirem.
// - "anthropic"  -> usa Anthropic (PAGO) — só entra em uso com opt-in
//                   explícito nesta variável, nunca por padrão.
// - não definida -> auto-detecção que PREFERE GRÁTIS: usa Groq se
//                   GROQ_API_KEY+GROQ_MODEL existirem; caso contrário "none"
//                   (nunca cai pro Anthropic pago silenciosamente, mesmo que
//                   ANTHROPIC_API_KEY exista no ambiente — evita o cenário
//                   que gerou a pendência em MANUAL_ACTIONS.md item 14).
// - qualquer outro valor -> degrada pra "none" (nunca quebra por env mal configurada).
//
// GROQ_MODEL é obrigatório pra usar Groq (sem fallback de model hardcoded) —
// modelos da Groq são descontinuados com frequência (ex.: llama-3.3-70b-versatile
// já foi desativado e outros bots do Igor migraram pra outro id); assumir um
// nome fixo aqui quebraria silenciosamente quando a Groq aposentar o modelo.
// Confirme o model id atual num bot que já funciona (ex.: @ibc_trader_bot) ou
// em https://console.groq.com/docs/models antes de configurar.
//
// Toda feature que usa este provider PRECISA continuar funcionando com
// AI_PROVIDER=none (fallback determinístico próprio, sem IA) — ver
// lib/ai/trip-builder.ts e lib/ai/concierge.ts.

import Anthropic from '@anthropic-ai/sdk';

export type AIProviderName = 'groq' | 'anthropic' | 'none';

function resolveProviderName(): AIProviderName {
  const configured = process.env.AI_PROVIDER?.trim().toLowerCase();
  const hasGroq = Boolean(process.env.GROQ_API_KEY && process.env.GROQ_MODEL);
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);

  if (configured === 'none') return 'none';
  if (configured === 'groq') return hasGroq ? 'groq' : 'none';
  if (configured === 'anthropic') return hasAnthropic ? 'anthropic' : 'none';
  if (!configured) return hasGroq ? 'groq' : 'none';
  return 'none';
}

export function isAIAvailable(): boolean {
  return resolveProviderName() !== 'none';
}

export function currentAIProvider(): AIProviderName {
  return resolveProviderName();
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
// log de custo estimado quando o provider ativo for Anthropic; Groq é grátis
// (free tier), então o custo estimado é sempre 0 nesse caso.
const APPROX_INPUT_COST_PER_MTOK_USD = 3;
const APPROX_OUTPUT_COST_PER_MTOK_USD = 15;

export function estimateCostUsd(inputTokens: number, outputTokens: number): number {
  if (resolveProviderName() !== 'anthropic') return 0;
  return (inputTokens / 1_000_000) * APPROX_INPUT_COST_PER_MTOK_USD + (outputTokens / 1_000_000) * APPROX_OUTPUT_COST_PER_MTOK_USD;
}

async function completeWithGroq(params: AICompletionParams): Promise<AICompletionResult | null> {
  const messages = [
    ...(params.system ? [{ role: 'system' as const, content: params.system }] : []),
    ...params.messages,
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL,
      messages,
      max_tokens: params.maxTokens ?? 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq respondeu ${response.status}: ${await response.text()}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const text = data.choices?.[0]?.message?.content ?? '';
  if (!text) return null;

  return {
    text,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
}

async function completeWithAnthropic(params: AICompletionParams): Promise<AICompletionResult | null> {
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

// Retorna null quando a IA não está disponível (provider=none) OU quando a
// chamada falha/retorna vazio — quem chama SEMPRE precisa ter um fallback
// determinístico pronto para esse caso, nunca deve propagar erro pro usuário.
export async function completeWithAI(params: AICompletionParams): Promise<AICompletionResult | null> {
  const provider = resolveProviderName();
  if (provider === 'groq') return completeWithGroq(params);
  if (provider === 'anthropic') return completeWithAnthropic(params);
  return null;
}
