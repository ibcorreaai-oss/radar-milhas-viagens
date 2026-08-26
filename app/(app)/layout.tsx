import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth';
import { getFeatureFlags } from '@/lib/feature-flags';
import { isAdminRole, isBlocked } from '@/lib/roles';
import { hasActiveAccess, matchesPathPrefix, SUBSCRIPTION_EXEMPT_PREFIXES } from '@/lib/subscription-access';
import { AppShell } from '@/components/app-shell';
import { BlockedAccountScreen } from '@/components/blocked-account-screen';

export default async function AppGroupLayout({ children }: { children: React.ReactNode }) {
  const ctx = await getUserContext();

  // ETAPA 15 (ver PLATFORM_ADMIN.md) — conta bloqueada (admin_set_user_blocked)
  // nunca vê o app, mesmo com sessão válida. BlockedAccountScreen derruba a
  // sessão de verdade pelo client (achado em revisão adversarial: fazer
  // isso aqui, num Server Component, é silenciosamente descartado pelo
  // adaptador de cookies de lib/supabase/server.ts).
  if (ctx?.profile && isBlocked(ctx.profile)) {
    return <BlockedAccountScreen reason={ctx.profile.blocked_reason} />;
  }

  // ETAPA 19 (auditoria de segurança pré-deploy) — segunda camada do gate
  // de trial/assinatura da ETAPA 16: até esta etapa, `middleware.ts` era o
  // ÚNICO lugar que checava isso (assimetria real com o bloqueio de conta
  // acima, que já tinha 2 camadas). `x-pathname` vem do header que o
  // middleware injeta na request (ver middleware.ts) — layouts não
  // recebem pathname como prop no Next.js.
  if (ctx) {
    const pathname = (await headers()).get('x-pathname') ?? '';
    const isExempt = SUBSCRIPTION_EXEMPT_PREFIXES.some((p) => matchesPathPrefix(pathname, p));
    if (!isExempt && !isAdminRole(ctx.profile) && !hasActiveAccess(ctx.subscription)) {
      redirect('/assinatura?trial_expirado=1');
    }
  }

  const flags = await getFeatureFlags();

  return (
    <AppShell isLoggedIn={Boolean(ctx)} isAdmin={isAdminRole(ctx?.profile)} flags={flags}>
      {children}
    </AppShell>
  );
}
