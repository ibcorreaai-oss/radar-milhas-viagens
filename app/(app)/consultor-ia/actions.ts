'use server';

import Anthropic from '@anthropic-ai/sdk';
import { getUserContext, type UserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Opportunity, UserLoyaltyProgram, LoyaltyProgram } from '@/lib/types';

const ELIGIBLE_PLANS = ['pro', 'consultor'];
const DISCLAIMER =
  'Lembrete: preços, disponibilidade e regras de milhas mudam a qualquer momento — sempre confirme no site oficial da companhia/programa antes de comprar ou emitir.';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AskConsultantResult {
  reply?: string;
  error?: string;
}

// Espelha o shape montado em app/(app)/consultor-ia/page.tsx — mantido
// solto (não importado de lib/types.ts) porque é um contrato só entre a
// página e a Server Action, não uma entidade de banco.
export interface ConsultantUserContext {
  nome: string | null;
  aeroportoBase: string | null;
  destinosFavoritos: string[];
  classePreferida: string;
  datasFlexiveis: boolean;
  orcamentoMensal: number | null;
  programas: {
    programa: string;
    saldoPontos: number;
    milheiroMedio: number | null;
  }[];
  oportunidadesAtuais: {
    titulo: string;
    tipo: string;
    origem: string | null;
    destino: string | null;
    cidade: string | null;
    precoDinheiro: number | null;
    precoPontos: number | null;
    programa: string | null;
    score: number;
    expiraEm: string | null;
  }[];
}

type UserLoyaltyProgramWithProgram = UserLoyaltyProgram & {
  loyalty_programs: Pick<LoyaltyProgram, 'name' | 'average_mile_value'> | null;
};

// Monta o contexto do usuário SEMPRE a partir da sessão/banco reais, nunca
// do que o client mandar — evita que alguém forje o payload (via devtools
// ou chamada direta da action) pra injetar texto arbitrário no system
// prompt da própria conversa. Espelha a mesma query que existia antes em
// app/(app)/consultor-ia/page.tsx.
async function loadUserContext(ctx: UserContext): Promise<ConsultantUserContext> {
  const supabase = await createClient();

  const [{ data: userProgramsData }, { data: opportunitiesData }] = await Promise.all([
    supabase
      .from('user_loyalty_programs')
      .select('*, loyalty_programs(name, average_mile_value)')
      .eq('user_id', ctx.userId),
    supabase.from('opportunities').select('*').order('score', { ascending: false }).limit(10),
  ]);

  const userPrograms = (userProgramsData ?? []) as UserLoyaltyProgramWithProgram[];
  const opportunities = (opportunitiesData ?? []) as Opportunity[];

  return {
    nome: ctx.profile?.full_name || null,
    aeroportoBase: ctx.profile?.home_airport || null,
    destinosFavoritos: ctx.profile?.favorite_destinations || [],
    classePreferida: ctx.profile?.cabin_class_preference || 'qualquer',
    datasFlexiveis: ctx.profile?.flexible_dates ?? false,
    orcamentoMensal: ctx.profile?.monthly_budget ?? null,
    programas: userPrograms.map((ulp) => ({
      programa: ulp.loyalty_programs?.name ?? 'Programa desconhecido',
      saldoPontos: ulp.points_balance,
      milheiroMedio: ulp.loyalty_programs?.average_mile_value ?? null,
    })),
    oportunidadesAtuais: opportunities.map((o) => ({
      titulo: o.title,
      tipo: o.type,
      origem: o.origin,
      destino: o.destination,
      cidade: o.city,
      precoDinheiro: o.cash_price,
      precoPontos: o.points_price,
      programa: o.loyalty_program,
      score: o.score,
      expiraEm: o.expires_at,
    })),
  };
}

function buildSystemPrompt(userContext: ConsultantUserContext): string {
  return `Você é o Consultor IA do Radar Milhas & Viagens, especializado em pontos e milhas de programas brasileiros (Livelo, Esfera, Smiles, LATAM Pass, Azul Fidelidade, TudoAzul, ALL Accor, Hilton Honors, Marriott Bonvoy, entre outros).

Seu papel: ajudar o usuário a decidir se vale mais a pena pagar em dinheiro, usar pontos, transferir pontos com bônus, comprar pontos ou esperar uma promoção — sempre de forma específica e prática, nunca genérica.

Contexto do usuário (use para personalizar a resposta):
${JSON.stringify(userContext, null, 2)}

Regras obrigatórias:
- Responda sempre em português do Brasil, de forma direta e prática.
- Considere o saldo de pontos, os programas e as preferências do usuário acima quando fizer sentido.
- Quando útil, cite as oportunidades atuais listadas no contexto.
- Você NUNCA garante disponibilidade ou preço — não é uma agência de viagem e não emite passagens.
- Termine SEMPRE a resposta com o seguinte aviso, no final, em uma linha própria: "${DISCLAIMER}"`;
}

// Fallback determinístico, sem depender de IA — usado quando não há
// ANTHROPIC_API_KEY configurada. Nunca deve lançar erro nem deixar o
// chat quebrado; é só um conjunto de regras simples baseadas em palavras-chave.
function buildFallbackAnswer(message: string, userContext: ConsultantUserContext): string {
  const lower = message.toLowerCase();
  const lines: string[] = [];

  const mentionsTransfer =
    lower.includes('transfer') || lower.includes('bônus') || lower.includes('bonus');
  const mentionsPrograms = userContext.programas.some((p) =>
    lower.includes(p.programa.toLowerCase())
  );

  if (mentionsTransfer) {
    lines.push(
      'Sobre transferência de pontos: bônus de transferência só costumam valer a pena quando o valor final do milheiro (custo dos pontos de origem já com o bônus somado ao custo de aquisição) fica abaixo da média histórica do programa de destino, e quando você já sabe exatamente qual passagem/hotel vai resgatar — transferir "no escuro" é o erro mais comum.'
    );
  }

  if (mentionsPrograms && userContext.programas.length > 0) {
    const relevantes = userContext.programas.filter((p) =>
      lower.includes(p.programa.toLowerCase())
    );
    relevantes.forEach((p) => {
      lines.push(
        `No seu cadastro, você tem ${p.saldoPontos.toLocaleString('pt-BR')} pontos em ${p.programa}${
          p.milheiroMedio ? `, cujo milheiro médio monitorado pelo clube é de R$ ${p.milheiroMedio.toFixed(2)}` : ''
        }.`
      );
    });
  }

  const mentionsDestination =
    /\b(para|até|destino)\b/.test(lower) ||
    userContext.destinosFavoritos.some((d) => lower.includes(d.toLowerCase()));

  if (mentionsDestination) {
    lines.push(
      'Para achar a melhor janela de preço para um destino específico, dá uma olhada na página de Promoções (transferências bonificadas e passagens em destaque) e considere criar um Alerta com suas datas — assim que uma oportunidade com bom score aparecer, você é avisado.'
    );
  }

  if (userContext.oportunidadesAtuais.length > 0) {
    const melhor = userContext.oportunidadesAtuais[0];
    lines.push(
      `A oportunidade com melhor score cadastrada agora no clube é "${melhor.titulo}"${
        melhor.destino ? ` (destino: ${melhor.destino})` : ''
      }, com score ${melhor.score}/100 — vale conferir na página de Oportunidades/Dashboard.`
    );
  }

  if (lines.length === 0) {
    lines.push(
      'Não consegui identificar um padrão específico na sua pergunta agora (o modo de IA completa está temporariamente indisponível), mas de forma geral: compare sempre o valor do milheiro da opção em pontos com a média histórica do programa, e só transfira pontos quando já tiver a passagem/hotel específico em mãos. Dê uma olhada nas páginas de Promoções e Programas para dados atualizados.'
    );
  }

  lines.push('', DISCLAIMER);
  return lines.join('\n');
}

export async function askConsultant(
  history: ChatMessage[],
  message: string
): Promise<AskConsultantResult> {
  const ctx = await getUserContext();

  if (!ctx || !ELIGIBLE_PLANS.includes(ctx.plan)) {
    return { error: 'Sem acesso' };
  }

  const trimmedMessage = message.trim();
  if (!trimmedMessage) {
    return { error: 'Mensagem vazia' };
  }

  const userContext = await loadUserContext(ctx);
  const systemPrompt = buildSystemPrompt(userContext);

  if (!process.env.ANTHROPIC_API_KEY) {
    return { reply: buildFallbackAnswer(trimmedMessage, userContext) };
  }

  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: trimmedMessage },
      ],
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    const reply = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    if (!reply) {
      return { reply: buildFallbackAnswer(trimmedMessage, userContext) };
    }

    return { reply };
  } catch (error) {
    console.error('askConsultant: falha ao chamar Anthropic, usando fallback.', error);
    return { reply: buildFallbackAnswer(trimmedMessage, userContext) };
  }
}
