import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TrendingUp, Users, Repeat, UserX, ArrowUpCircle, Layers, AlertTriangle } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { PLANS, PLAN_ORDER } from '@/lib/plans';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { PlanId } from '@/lib/types';

// Métricas de crescimento/conversão/retenção (ETAPA 7 — comercialização).
// Usa createAdminClient() (service_role) de propósito: a RLS de
// `subscriptions` só libera "read own" pro dono, sem policy de admin
// (dado de pagamento é sensível — ver supabase/migrations/0001_schema.sql).
// Isolado numa página só de leitura, atrás do mesmo requireAdmin implícito
// (checagem de role) que toda página /admin já usa.
export default async function AdminMetricasPage() {
  const ctx = await getUserContext();
  if (ctx?.profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const admin = createAdminClient();
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: profilesData },
    { data: subscriptionsData },
    { data: alertsData },
    { data: flightSearchUsers },
    { data: hotelSearchUsers },
  ] = await Promise.all([
    admin.from('profiles').select('user_id, full_name, email, created_at, onboarding_done'),
    admin.from('subscriptions').select('user_id, plan, status, updated_at'),
    admin.from('alerts').select('user_id, type, active'),
    admin.from('flight_searches').select('user_id'),
    admin.from('hotel_searches').select('user_id'),
  ]);

  const profiles = profilesData ?? [];
  const subscriptions = subscriptionsData ?? [];
  const alerts = alertsData ?? [];

  // --- Crescimento ---
  const totalUsers = profiles.length;
  const newLast7d = profiles.filter((p) => p.created_at >= days(7)).length;
  const newLast30d = profiles.filter((p) => p.created_at >= days(30)).length;

  // --- Conversão ---
  const planCounts: Record<PlanId, number> = { free: 0, premium: 0, pro: 0, consultor: 0 };
  for (const s of subscriptions) {
    const plan = (s.plan as PlanId) ?? 'free';
    if (plan in planCounts) planCounts[plan] += 1;
  }
  // Usuário sem linha em subscriptions ainda conta como free (trigger
  // handle_new_user cria a linha, mas por segurança contra dado legado).
  const accountedFor = subscriptions.length;
  planCounts.free += Math.max(0, totalUsers - accountedFor);
  const paidUsers = planCounts.premium + planCounts.pro + planCounts.consultor;
  const conversionRate = totalUsers > 0 ? (paidUsers / totalUsers) * 100 : 0;

  // --- Ativação ---
  const usersWithAlert = new Set(alerts.map((a) => a.user_id)).size;
  const activationRate = totalUsers > 0 ? (usersWithAlert / totalUsers) * 100 : 0;
  const onboardingDoneCount = profiles.filter((p) => p.onboarding_done).length;
  const onboardingRate = totalUsers > 0 ? (onboardingDoneCount / totalUsers) * 100 : 0;

  const searchedUserIds = new Set([
    ...((flightSearchUsers ?? []) as { user_id: string }[]).map((r) => r.user_id),
    ...((hotelSearchUsers ?? []) as { user_id: string }[]).map((r) => r.user_id),
  ]);

  // --- Pontos de abandono ---
  // Cadastrou há mais de 7 dias, nunca fez nenhuma busca — não chegou nem
  // perto do valor central do produto (comparar dinheiro vs pontos).
  const stalledAfterSignup = profiles.filter(
    (p) => p.created_at < days(7) && !searchedUserIds.has(p.user_id)
  ).length;
  // Terminou o cadastro mas nunca voltou pra terminar o onboarding.
  const stuckInOnboarding = profiles.filter(
    (p) => !p.onboarding_done && p.created_at < days(3)
  ).length;

  // --- Retenção / churn ---
  const canceledLast30d = subscriptions.filter((s) => s.status === 'canceled' && s.updated_at >= days(30));
  // Base do churn: quem tinha assinatura paga ativa em algum momento do
  // período (aproximação: paga agora + cancelada nos últimos 30d).
  const churnBase = paidUsers + canceledLast30d.length;
  const churnRate = churnBase > 0 ? (canceledLast30d.length / churnBase) * 100 : 0;

  // --- Oportunidades de upsell: free, já no limite de alertas (maxAlerts=1) ---
  const alertCountByUser = new Map<string, number>();
  for (const a of alerts) {
    if (!a.active) continue;
    alertCountByUser.set(a.user_id, (alertCountByUser.get(a.user_id) ?? 0) + 1);
  }
  const freeUserIds = new Set(
    subscriptions.filter((s) => (s.plan as PlanId) === 'free' || !s.plan).map((s) => s.user_id)
  );
  const upsellCandidates = profiles.filter(
    (p) =>
      (freeUserIds.has(p.user_id) || !subscriptions.some((s) => s.user_id === p.user_id)) &&
      (alertCountByUser.get(p.user_id) ?? 0) >= PLANS.free.maxAlerts
  );

  // --- Oportunidades de cross-sell: só alerta de hotel, nunca de voo (ou vice-versa) ---
  const typesByUser = new Map<string, Set<string>>();
  for (const a of alerts) {
    if (!typesByUser.has(a.user_id)) typesByUser.set(a.user_id, new Set());
    typesByUser.get(a.user_id)!.add(a.type);
  }
  let hotelOnlyCount = 0;
  let flightOnlyCount = 0;
  for (const types of typesByUser.values()) {
    if (types.has('hotel') && !types.has('voo')) hotelOnlyCount += 1;
    if (types.has('voo') && !types.has('hotel')) flightOnlyCount += 1;
  }

  // --- Recuperação de cancelados: lista pra contato manual (além do
  // winBackEmail automático já disparado no webhook — ver ETAPA 7) ---
  const recentCancellations = canceledLast30d
    .map((s) => ({ ...s, profile: profiles.find((p) => p.user_id === s.user_id) }))
    .sort((a, b) => (b.updated_at > a.updated_at ? 1 : -1))
    .slice(0, 10);

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Métricas de negócio</h1>
        <p className="mt-1 text-muted-foreground">
          Crescimento, conversão, retenção e oportunidades comerciais — calculado a partir dos
          dados reais do banco (sem tráfego real ainda, os números abaixo tendem a ser pequenos).
        </p>
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← Voltar pro painel operacional
        </Link>
      </div>

      {/* Crescimento */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <TrendingUp className="h-5 w-5 text-primary" /> Crescimento
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Usuários totais" value={totalUsers} />
          <MetricCard label="Novos (7 dias)" value={newLast7d} />
          <MetricCard label="Novos (30 dias)" value={newLast30d} />
        </div>
      </section>

      {/* Conversão */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Users className="h-5 w-5 text-primary" /> Conversão
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Taxa de conversão paga" value={`${conversionRate.toFixed(1)}%`} />
          {PLAN_ORDER.map((planId) => (
            <MetricCard key={planId} label={PLANS[planId].name} value={planCounts[planId]} />
          ))}
        </div>
      </section>

      {/* Ativação */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Layers className="h-5 w-5 text-primary" /> Ativação
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard label="Onboarding concluído" value={`${onboardingRate.toFixed(1)}%`} />
          <MetricCard label="Criou pelo menos 1 alerta" value={`${activationRate.toFixed(1)}%`} />
          <MetricCard label="Usuários que já buscaram" value={searchedUserIds.size} />
        </div>
      </section>

      {/* Retenção / churn */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Repeat className="h-5 w-5 text-primary" /> Retenção
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard label="Churn (30 dias)" value={`${churnRate.toFixed(1)}%`} />
          <MetricCard label="Cancelamentos (30 dias)" value={canceledLast30d.length} />
        </div>
      </section>

      {/* Pontos de abandono */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle className="h-5 w-5 text-warning" /> Pontos de abandono identificados
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard
            label="Cadastrou, nunca buscou (>7 dias)"
            value={stalledAfterSignup}
            hint="Nunca chegou perto do valor central (comparar dinheiro vs pontos)."
          />
          <MetricCard
            label="Travado no onboarding (>3 dias)"
            value={stuckInOnboarding}
            hint="Cadastrou mas não terminou o questionário inicial."
          />
        </div>
      </section>

      {/* Oportunidades comerciais */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <ArrowUpCircle className="h-5 w-5 text-primary" /> Oportunidades comerciais
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <MetricCard
            label="Upsell: free no limite de alertas"
            value={upsellCandidates.length}
            hint="Já usa o alerta grátis, provável candidato a upgrade."
          />
          <MetricCard
            label="Cross-sell: só alerta de hotel"
            value={hotelOnlyCount}
            hint="Nunca configurou alerta de voo."
          />
          <MetricCard
            label="Cross-sell: só alerta de voo"
            value={flightOnlyCount}
            hint="Nunca configurou alerta de hotel."
          />
        </div>
      </section>

      {/* Recuperação de cancelados */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <UserX className="h-5 w-5 text-destructive" /> Cancelados recentes (recuperação)
        </h2>
        <p className="text-sm text-muted-foreground">
          O e-mail de recuperação já é disparado automaticamente no momento do cancelamento (ver
          GROWTH.md) — esta lista é para contato manual quando fizer sentido.
        </p>
        {recentCancellations.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">
              Nenhum cancelamento nos últimos 30 dias.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border p-0">
              {recentCancellations.map((c) => (
                <div key={c.user_id} className="flex items-center justify-between gap-3 p-4 text-sm">
                  <div>
                    <p className="font-medium">{c.profile?.full_name || 'Usuário'}</p>
                    <p className="text-muted-foreground">{c.profile?.email ?? '—'}</p>
                  </div>
                  <Badge variant="outline">Cancelado em {formatDate(c.updated_at)}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl">{value}</CardTitle>
      </CardHeader>
      {hint && (
        <CardContent className="pt-0">
          <p className="text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      )}
    </Card>
  );
}
