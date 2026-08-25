'use server';

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';
import { contactMessageEmail } from '@/lib/email/templates';
import { logger } from '@/lib/logger';

// ETAPA 15.1 (ver GROWTH.md) — assistente público da home, sem login.
// Reaproveita o Anthropic já usado em app/(app)/consultor-ia/actions.ts,
// mas com um system prompt diferente (vende o produto, não acessa dado de
// usuário nenhum — não existe usuário ainda) e limites mais curtos:
// exposto sem autenticação, então precisa de mais controle de custo/abuso
// que a versão logada e paga.

export interface PublicChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PublicChatResult {
  reply?: string;
  error?: string;
}

const leadSchema = z.object({
  name: z.string().trim().min(1, 'Informe seu nome.').max(120),
  email: z.string().trim().toLowerCase().email('Informe um e-mail válido.').max(200),
});

// 10 trocas (20 mensagens) — depois disso, empurra pro cadastro em vez de
// deixar a conversa continuar indefinidamente num endpoint público. Isto é
// só uma sugestão de UX pro widget (o `history` mandado de volta é
// controlado pelo PRÓPRIO client) — quem chama a Server Action direto pode
// mandar qualquer array. A trava de verdade é MAX_MESSAGES_PER_DAY abaixo.
const MAX_HISTORY = 20;
// No máximo 3 conversas novas por e-mail em 24h — trava um script tentando
// gerar lead/custo de IA em massa, sem precisar de infra de rate limit nova.
const MAX_NEW_CHATS_PER_DAY = 3;
// Teto de verdade contra abuso: achado em revisão adversarial que o check
// acima só rodava quando `history.length === 0`, e esse campo é decidido
// pelo client — chamar a action direto com um array forjado sempre curto
// pulava o limite inteiro (chamada ilimitada e grátis à Anthropic). Este
// contador roda em TODA mensagem, via RPC atômica no banco
// (0019_home_chat_message_counter.sql), nunca confiando em nada vindo do
// client. ~3 conversas de MAX_HISTORY cada, com folga.
const MAX_MESSAGES_PER_DAY = 60;

const FALLBACK_ANSWER =
  'No momento não consigo responder com IA completa, mas aqui vai o resumo: o Radar Milhas & Viagens compara preço de passagem/hotel em dinheiro vs pontos e avisa só quando vale a pena, com planos a partir de grátis. Crie sua conta em /cadastro (é gratuito) pra ver os alertas e o Consultor IA completo, personalizado com seus próprios pontos.';

const SYSTEM_PROMPT = `Você é o assistente de vendas e suporte do site do Radar Milhas & Viagens (radarmilhas.com), falando com um VISITANTE que ainda não tem conta.

O produto: assinatura que monitora preço de passagens aéreas e hotéis, compara pagar em dinheiro vs usar pontos/milhas de programas brasileiros (Livelo, Esfera, Smiles, LATAM Pass, Azul Fidelidade, TudoAzul, ALL Accor, Hilton Honors, Marriott Bonvoy), e manda alerta só quando vale a pena. Tem calculadora de pontos, comparador de oportunidades, e um Consultor IA completo (personalizado com os próprios pontos do usuário) disponível pra assinantes dos planos Pro e Consultor. Existe um plano gratuito.

Seu papel:
- Tirar dúvida sobre como o produto funciona, planos, e a diferença entre pagar em dinheiro e usar pontos.
- Incentivar a criar a conta gratuita (link /cadastro) quando fizer sentido — sem ser insistente.
- Você NÃO tem acesso a nenhum dado de conta, pontos ou busca de ninguém — se perguntarem algo pessoal ("quantos pontos eu tenho"), explique que isso só aparece depois de entrar na conta.
- Nunca invente preço específico de passagem/hotel — isso só existe depois de uma busca real dentro do produto.
- Responda sempre em português do Brasil, curto e direto (isto é um chat de site, não um relatório).`;

// RPC, não select direto: contact_messages só tem policy de SELECT pra
// admin (ver 0006_contact_messages.sql) — um visitante anônimo faria essa
// query sempre voltar 0 linhas por causa da RLS, não porque não há
// conversa recente, o que tornaria o limite anti-abuso um no-op silencioso
// (achado revisando antes mesmo de terminar a etapa). Ver
// supabase/migrations/0015_home_chat_rate_limit_rpc.sql.
async function recentChatCount(email: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('count_recent_home_chat_leads', { target_email: email });
  if (error) {
    logger.error('integration', 'Falha ao checar limite de conversas do chat público', { reason: error.message });
    return 0;
  }
  return data ?? 0;
}

// Incrementa e devolve a contagem de mensagens de HOJE pra este e-mail, via
// RPC atômica (insert...on conflict) — nunca confia em `history.length` do
// client. Falha aberta (0) só em erro de infraestrutura, igual ao padrão de
// recentChatCount acima; se Supabase não está configurado, não há como
// persistir o contador mesmo, então também não há limite pra impor.
async function incrementDailyMessageCount(email: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('increment_home_chat_message_count', { target_email: email });
  if (error) {
    logger.error('integration', 'Falha ao incrementar contador de mensagens do chat público', { reason: error.message });
    return 0;
  }
  return data ?? 0;
}

// Só na primeira mensagem da conversa — reaproveita contact_messages
// (source 'home_ai_chat') em vez de criar tabela de lead nova, e o mesmo
// aviso por e-mail que app/contato/actions.ts já usa pro formulário normal.
async function captureLead(name: string, email: string, firstMessage: string): Promise<void> {
  if (!isSupabaseConfigured()) return;

  const adminEmail = process.env.OPS_ALERT_EMAIL;
  let emailStatus: 'sent' | 'skipped' | 'failed' = 'skipped';
  if (adminEmail) {
    const result = await sendEmail(
      adminEmail,
      contactMessageEmail({
        name,
        email,
        subject: 'Novo lead — Consultor IA (home)',
        message: firstMessage,
      })
    );
    emailStatus = result.status === 'sent' ? 'sent' : result.status === 'skipped' ? 'skipped' : 'failed';
  }

  const supabase = await createClient();
  const { error } = await supabase.from('contact_messages').insert({
    name,
    email,
    subject: 'Consultor IA (visitante)',
    message: firstMessage,
    email_status: emailStatus,
    source: 'home_ai_chat',
  });

  if (error) {
    logger.error('integration', 'Falha ao salvar lead do chat público', { reason: error.message });
  } else {
    logger.info('system', 'Lead capturado via chat público da home', { email });
  }
}

export async function askPublicAssistant(
  lead: { name: string; email: string },
  history: PublicChatMessage[],
  message: string
): Promise<PublicChatResult> {
  const parsedLead = leadSchema.safeParse(lead);
  if (!parsedLead.success) {
    return { error: parsedLead.error.issues[0]?.message ?? 'Informe nome e e-mail válidos.' };
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return { error: 'Mensagem vazia.' };
  }

  if (history.length >= MAX_HISTORY) {
    return {
      reply:
        'Essa conversa já foi bem longa por aqui! Pra continuar com o Consultor IA completo (e personalizado com seus próprios pontos), crie sua conta gratuita em /cadastro.',
    };
  }

  const { name, email } = parsedLead.data;

  // Teto de verdade, em toda mensagem — não depende de `history.length`
  // (controlado pelo client, ver comentário de MAX_MESSAGES_PER_DAY acima).
  const messageCountToday = await incrementDailyMessageCount(email);
  if (messageCountToday > MAX_MESSAGES_PER_DAY) {
    return {
      error: 'Muitas mensagens enviadas com este e-mail hoje. Tente de novo amanhã, ou crie sua conta em /cadastro.',
    };
  }

  if (history.length === 0) {
    const recentCount = await recentChatCount(email);
    if (recentCount >= MAX_NEW_CHATS_PER_DAY) {
      return {
        error: 'Muitas conversas iniciadas com este e-mail hoje. Tente de novo amanhã, ou crie sua conta em /cadastro.',
      };
    }
    await captureLead(name, email, trimmedMessage);
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return { reply: FALLBACK_ANSWER };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: trimmedMessage },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const reply = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    return { reply: reply || FALLBACK_ANSWER };
  } catch (error) {
    console.error('askPublicAssistant: falha ao chamar Anthropic, usando fallback.', error);
    return { reply: FALLBACK_ANSWER };
  }
}
