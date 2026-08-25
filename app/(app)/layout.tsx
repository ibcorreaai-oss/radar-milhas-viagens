import { getUserContext } from '@/lib/auth';
import { getFeatureFlags } from '@/lib/feature-flags';
import { isAdminRole, isBlocked } from '@/lib/roles';
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

  const flags = await getFeatureFlags();

  return (
    <AppShell isLoggedIn={Boolean(ctx)} isAdmin={isAdminRole(ctx?.profile)} flags={flags}>
      {children}
    </AppShell>
  );
}
