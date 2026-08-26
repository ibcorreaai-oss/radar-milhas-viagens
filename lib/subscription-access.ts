import type { Subscription } from '@/lib/types';

// ETAPA 16 (ver MONETIZATION.md) -- predicado central de "este usuario pode
// usar o app agora?", usado tanto no middleware (edge) quanto no /perfil e
// /assinatura. Fica num arquivo separado de lib/roles.ts porque cobre um
// eixo diferente (pagamento em dia) do que roles.ts cobre (admin/bloqueado)
// -- mesmo principio de "um predicado, um lugar so" que ja existe pra
// isAdminRole/isBlocked (ver comentario no topo de lib/roles.ts).
//
// Puro (sem I/O) de proposito -- precisa rodar no Edge Runtime do
// middleware.ts, que nao pode importar o SDK da Stripe nem nada Node-only.

export const TRIAL_DAYS = 5;

// ETAPA 19 (auditoria de segurança pré-deploy) — antes só existia em
// middleware.ts. O gate de assinatura era a ÚNICA camada (diferente do
// bloqueio de conta, que tem middleware.ts E app/(app)/layout.tsx —
// assimetria real, achada em auditoria). Compartilhado aqui pra
// middleware.ts (edge) e app/(app)/layout.tsx (defesa em profundidade)
// nunca dessincronizarem qual prefixo é isento.
export const SUBSCRIPTION_EXEMPT_PREFIXES = ['/assinatura', '/perfil', '/onboarding'];

// `pathname.startsWith(prefix)` sozinho combina de mais: "/admin-login"
// cairia dentro do prefixo "/admin". Exige que o próximo caractere seja
// "/" ou fim de string.
export function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

type SubscriptionLike = Pick<Subscription, 'status' | 'trial_ends_at'> | null | undefined;

// Teste gratuito (app-level, nao e o trial nativo da Stripe -- ver
// MONETIZATION.md #2 sobre essa escolha) ainda dentro da janela.
export function isTrialActive(subscription: SubscriptionLike): boolean {
  if (!subscription?.trial_ends_at) return false;
  return new Date(subscription.trial_ends_at).getTime() > Date.now();
}

// status='active': assinatura Stripe real, cobrando em dia.
// status='past_due': cobranca falhou mas a Stripe ainda esta tentando de
// novo (dunning) -- mantem acesso ate a Stripe desistir de vez e mandar
// customer.subscription.deleted (status vira 'canceled'). Padrao comum de
// SaaS: nao cortar o usuario no primeiro cartao recusado.
export function hasActiveAccess(subscription: SubscriptionLike): boolean {
  if (!subscription) return false;
  if (subscription.status === 'active' || subscription.status === 'past_due') return true;
  return isTrialActive(subscription);
}

// Dias restantes de teste, arredondado pra cima (>0 dias e <1 dia mostra
// "1 dia", nunca "0 dias" enquanto ainda houver acesso). null = sem teste
// (nunca teve trial_ends_at) ou teste ja encerrado.
export function trialDaysLeft(subscription: SubscriptionLike): number | null {
  if (!subscription?.trial_ends_at) return null;
  const ms = new Date(subscription.trial_ends_at).getTime() - Date.now();
  if (ms <= 0) return null;
  return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}
