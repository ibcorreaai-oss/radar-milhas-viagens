import type { PlanId } from '@/lib/types';

export interface PlanDefinition {
  id: PlanId;
  name: string;
  priceLabel: string;
  priceCents: number;
  stripeEnvVar: string;
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

export function planAllowsMoreAlerts(plan: PlanId, currentCount: number): boolean {
  return currentCount < PLANS[plan].maxAlerts;
}

export function planAllowsMoreSearchesToday(plan: PlanId, searchesToday: number): boolean {
  const limit = PLANS[plan].searchesPerDay;
  if (limit === null) return true;
  return searchesToday < limit;
}
