import type { PlanId } from '@/lib/types';

export type BillingInterval = 'month' | 'year';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  // Preço mensal — mantido nos mesmos campos de sempre (priceLabel/
  // priceCents/stripeEnvVar) de propósito: home-content.tsx e
  // lib/structured-data.ts (schema.org da home pública) já consomem esses
  // três campos e continuam funcionando sem alteração nenhuma.
  priceLabel: string;
  priceCents: number;
  stripeEnvVar: string;
  // ETAPA 16 (ver MONETIZATION.md) — preço anual, opcional (null no free).
  // Exemplo de desconto adotado: ~2 meses grátis (10x o valor mensal),
  // regra de negócio ajustável — ver MONETIZATION.md.
  annualPriceLabel: string | null;
  annualPriceCents: number | null;
  annualStripeEnvVar: string | null;
  searchesPerDay: number | null; // null = ilimitado
  maxAlerts: number;
  channels: ('email' | 'whatsapp')[];
  features: string[];
  cronFrequencyHours: number;
}

export const PLANS: Record<PlanId, PlanDefinition> = {
  free: {
    id: 'free',
    name: 'Free',
    priceLabel: 'R$ 0',
    priceCents: 0,
    stripeEnvVar: '',
    annualPriceLabel: null,
    annualPriceCents: null,
    annualStripeEnvVar: null,
    searchesPerDay: 3,
    maxAlerts: 1,
    channels: [],
    features: ['3 buscas por dia', '1 alerta ativo', 'promoções públicas', 'calculadora simples'],
    cronFrequencyHours: 24,
  },
  premium: {
    id: 'premium',
    name: 'Premium',
    priceLabel: 'R$ 29,90/mês',
    priceCents: 2990,
    stripeEnvVar: 'STRIPE_PRICE_PREMIUM',
    annualPriceLabel: 'R$ 299/ano',
    annualPriceCents: 29900,
    annualStripeEnvVar: 'STRIPE_PRICE_PREMIUM_ANNUAL',
    searchesPerDay: null,
    maxAlerts: 10,
    channels: ['email'],
    features: [
      'Buscas ilimitadas',
      '10 alertas ativos',
      'Alertas por e-mail',
      'Comparação dinheiro vs pontos',
      'Ranking de oportunidades',
      'Histórico de buscas',
    ],
    cronFrequencyHours: 6,
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    priceLabel: 'R$ 79,90/mês',
    priceCents: 7990,
    stripeEnvVar: 'STRIPE_PRICE_PRO',
    annualPriceLabel: 'R$ 799/ano',
    annualPriceCents: 79900,
    annualStripeEnvVar: 'STRIPE_PRICE_PRO_ANNUAL',
    searchesPerDay: null,
    maxAlerts: 50,
    channels: ['email', 'whatsapp'],
    features: [
      'Alertas por WhatsApp',
      'Até 50 alertas',
      'IA consultora de viagem',
      'Datas flexíveis',
      'Múltiplos programas',
      'Hotéis com pontos',
      'Alertas de transferência bonificada',
      'Ranking avançado',
    ],
    cronFrequencyHours: 1,
  },
  consultor: {
    id: 'consultor',
    name: 'Consultor/Agência',
    priceLabel: 'R$ 199/mês',
    priceCents: 19900,
    stripeEnvVar: 'STRIPE_PRICE_CONSULTOR',
    annualPriceLabel: 'R$ 1.990/ano',
    annualPriceCents: 199000,
    annualStripeEnvVar: 'STRIPE_PRICE_CONSULTOR_ANNUAL',
    searchesPerDay: null,
    maxAlerts: 50,
    channels: ['email', 'whatsapp'],
    features: [
      'Múltiplos clientes',
      'Painel de clientes',
      'Relatórios',
      'Alertas por cliente',
      'Exportação',
      'CRM simples',
    ],
    cronFrequencyHours: 1,
  },
};

export const PLAN_ORDER: PlanId[] = ['free', 'premium', 'pro', 'consultor'];

export function planHasChannel(plan: PlanId, channel: 'email' | 'whatsapp'): boolean {
  return PLANS[plan].channels.includes(channel);
}

// ETAPA 16 — um lugar só pra resolver "qual preço/env var usar", em vez de
// repetir `interval === 'year' ? plan.annual... : plan...` em cada
// componente/action que precisa disso (checkout, card de plano).
export function planPriceForInterval(
  plan: PlanDefinition,
  interval: BillingInterval
): { label: string; cents: number; stripeEnvVar: string } | null {
  if (interval === 'year') {
    if (!plan.annualStripeEnvVar || plan.annualPriceLabel == null || plan.annualPriceCents == null) {
      return null;
    }
    return { label: plan.annualPriceLabel, cents: plan.annualPriceCents, stripeEnvVar: plan.annualStripeEnvVar };
  }
  if (!plan.stripeEnvVar) return null;
  return { label: plan.priceLabel, cents: plan.priceCents, stripeEnvVar: plan.stripeEnvVar };
}

// Achado em /code-review (revisão geral 27/08): o webhook da Stripe
// (customer.subscription.updated) nunca atualizava `plan` — só `status`/
// `current_period_end` — então um upgrade/downgrade feito no Billing Portal
// (ex.: Premium→Pro) ficava com o plano antigo pra sempre no nosso banco,
// mesmo cobrando o valor novo na Stripe. Resolve o preço/Price ID da Stripe
// de volta pro PlanId — a mesma direção inversa de `planPriceForInterval`.
export function planIdForPriceId(priceId: string): PlanId | null {
  for (const plan of Object.values(PLANS)) {
    if (plan.stripeEnvVar && process.env[plan.stripeEnvVar] === priceId) return plan.id;
    if (plan.annualStripeEnvVar && process.env[plan.annualStripeEnvVar] === priceId) return plan.id;
  }
  return null;
}

export function planAllowsMoreAlerts(plan: PlanId, currentCount: number): boolean {
  return currentCount < PLANS[plan].maxAlerts;
}

export function planAllowsMoreSearchesToday(plan: PlanId, searchesToday: number): boolean {
  const limit = PLANS[plan].searchesPerDay;
  if (limit === null) return true;
  return searchesToday < limit;
}
