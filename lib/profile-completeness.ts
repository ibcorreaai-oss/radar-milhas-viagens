// Completude de perfil (ETAPA 13 — NeuroUX: "sistema de progresso"). Usado
// no onboarding (calculado a partir do estado local do form, ainda não
// salvo) e em /perfil (calculado a partir do profile já salvo) — mesma
// função pura, duas fontes de dado diferentes. Cada critério pesa o mesmo
// e reflete algo que genuinamente melhora a precisão dos alertas (não é
// gamificação vazia: perfil incompleto = alerta pior, é a própria copy do
// onboarding: "quanto mais completo, mais precisos ficam os alertas").
export interface ProfileCompletenessInput {
  homeAirport: string;
  hasFavoriteDestinations: boolean;
  hasLoyaltyProgram: boolean;
  hasNotificationChannel: boolean;
  hasMonthlyBudget: boolean;
}

export interface ProfileCompletenessItem {
  key: string;
  label: string;
  done: boolean;
}

export function computeProfileCompleteness(input: ProfileCompletenessInput): {
  percent: number;
  items: ProfileCompletenessItem[];
} {
  const items: ProfileCompletenessItem[] = [
    { key: 'home_airport', label: 'Aeroporto de origem', done: Boolean(input.homeAirport.trim()) },
    { key: 'destinations', label: 'Destinos favoritos', done: input.hasFavoriteDestinations },
    { key: 'programs', label: 'Ao menos 1 programa de pontos', done: input.hasLoyaltyProgram },
    { key: 'notifications', label: 'Um canal de alerta ativo', done: input.hasNotificationChannel },
    { key: 'budget', label: 'Orçamento mensal para viagens', done: input.hasMonthlyBudget },
  ];
  const done = items.filter((i) => i.done).length;
  const percent = Math.round((done / items.length) * 100);
  return { percent, items };
}
