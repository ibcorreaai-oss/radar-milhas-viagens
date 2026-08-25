import Link from 'next/link';
import { Bell, Clock, Gift, Plane, Search } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { getFeatureFlags } from '@/lib/feature-flags';
import { computeAchievements } from '@/lib/achievements';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { buttonVariants } from '@/components/ui/button';
import { OpportunityCard } from '@/components/opportunity-card';
import { PromotionCard } from '@/components/promotion-card';
import { EmptyState } from '@/components/empty-state';
import { DashboardStats } from '@/components/dashboard-stats';
import { AchievementsPanel } from '@/components/achievements-panel';
import { ToastFromQuery } from '@/components/toast-from-query';
import { PLANS } from '@/lib/plans';
import { formatBRL, formatDate, cn } from '@/lib/utils';
import {
  scoreTier,
  SCORE_TIER_LABEL,
  type ScoreTier,
  type Opportunity,
  type Promotion,
  type Alert,
  type LoyaltyProgram,
} from '@/lib/types';

const ALERT_TYPE_LABEL: Record<Alert['type'], string> = {
  voo: 'Voo',
  hotel: 'Hotel',
  transferencia: 'Transferência',
};

const TIER_ORDER: ScoreTier[] = ['imperdivel', 'excelente', 'bom', 'normal', 'nao_recomendado'];

const TIER_BADGE_VARIANT: Record<ScoreTier, 'success' | 'default' | 'accent' | 'secondary' | 'destructive'> = {
  imperdivel: 'success',
  excelente: 'default',
  bom: 'accent',
  normal: 'secondary',
  nao_recomendado: 'destructive',
};

type UserLoyaltyProgramWithProgram = {
  id: string;
  user_id: string;
  program_id: string;
  points_balance: number;
  loyalty_programs: Pick<LoyaltyProgram, 'name' | 'average_mile_value'> | null;
};

export default async function DashboardPage() {
  const ctx = await getUserContext();

  if (!ctx) {
    return (
      <div className="p-6">
        <EmptyState
          title="Não foi possível carregar seu painel"
          description="Sua sessão pode ter expirado. Tente entrar novamente."
        />
      </div>
    );
  }

  const supabase = await createClient();
  const flags = await getFeatureFlags();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: topOpportunitiesData },
    { data: activePromotionsData },
    { data: activeAlertsData },
    { data: userProgramsData },
    { count: searchesLast7Days },
    { count: hotelSearchesLast7Days },
    achievements,
    { data: favoritePromotionsData },
  ] = await Promise.all([
    supabase.from('opportunities').select('*').order('score', { ascending: false }).limit(6),
    supabase.from('promotions').select('*').eq('status', 'ativa').order('score', { ascending: false }).limit(4),
    supabase.from('alerts').select('*').eq('user_id', ctx.userId).eq('active', true),
    supabase
      .from('user_loyalty_programs')
      .select('*, loyalty_programs(name, average_mile_value)')
      .eq('user_id', ctx.userId),
    supabase
      .from('flight_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId)
      .gte('created_at', sevenDaysAgo),
    supabase
      .from('hotel_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId)
      .gte('created_at', sevenDaysAgo),
    flags.achievementsPanel ? computeAchievements(supabase, ctx.userId, ctx.profile) : Promise.resolve(null),
    // ETAPA 14 — mesma promoção aparece aqui e em /promocoes; sem isso a
    // estrela de favorito simplesmente não aparecia no dashboard (achado em
    // revisão adversarial), inconsistente com o resto do produto.
    supabase.from('favorites').select('item_id').eq('user_id', ctx.userId).eq('item_type', 'promotion'),
  ]);

  const opportunities = (topOpportunitiesData ?? []) as Opportunity[];
  const promotions = (activePromotionsData ?? []) as Promotion[];
  const favoritedPromotionIds = new Set(
    ((favoritePromotionsData ?? []) as { item_id: string }[]).map((f) => f.item_id)
  );
  const alerts = (activeAlertsData ?? []) as Alert[];
  const userPrograms = (userProgramsData ?? []) as UserLoyaltyProgramWithProgram[];
  const searchesThisWeek = (searchesLast7Days ?? 0) + (hotelSearchesLast7Days ?? 0);

  // Valor estimado dos pontos do usuário: soma, por programa, de
  // (saldo / 1000) * milheiro médio do programa.
  const estimatedPointsValue = userPrograms.reduce((total, ulp) => {
    const avgMileValue = ulp.loyalty_programs?.average_mile_value ?? 0;
    return total + (ulp.points_balance / 1000) * avgMileValue;
  }, 0);

  // Proxy honesto de "quanto dinheiro está em jogo" nas oportunidades em
  // destaque — não é economia calculada, é só a soma dos preços à vista.
  const totalOpportunityCashValue = opportunities.reduce((sum, o) => sum + (o.cash_price ?? 0), 0);

  // Oportunidades expirando em até 7 dias (filtradas em memória a partir
  // da amostra já buscada, para não fazer uma segunda query redundante).
  const now = Date.now();
  const in7Days = now + 7 * 24 * 60 * 60 * 1000;
  const expiringSoon = opportunities
    .filter((o) => {
      if (!o.expires_at) return false;
      const t = new Date(o.expires_at).getTime();
      return t >= now && t <= in7Days;
    })
    .sort((a, b) => new Date(a.expires_at as string).getTime() - new Date(b.expires_at as string).getTime());

  // Recorte por tier de score — amostra das 6 oportunidades em destaque,
  // não é a distribuição completa do banco.
  const tierCounts = opportunities.reduce<Record<ScoreTier, number>>(
    (acc, o) => {
      const tier = scoreTier(o.score);
      acc[tier] += 1;
      return acc;
    },
    { imperdivel: 0, excelente: 0, bom: 0, normal: 0, nao_recomendado: 0 }
  );

  const firstName = ctx.profile?.full_name?.split(' ')[0] || 'viajante';

  return (
    <div className="space-y-8 p-6">
      <ToastFromQuery
        rules={[
          {
            param: 'onboarded',
            value: '1',
            variant: 'celebration',
            title: '🎉 Perfil configurado!',
            description: 'Agora seus alertas já saem personalizados pro seu jeito de viajar.',
          },
        ]}
      />
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Olá, {firstName}</h1>
        <p className="mt-1 text-muted-foreground">
          Aqui está o resumo de hoje: seus pontos, alertas e as melhores oportunidades do clube.
          {searchesThisWeek > 0 && ` Você já fez ${searchesThisWeek} busca${searchesThisWeek > 1 ? 's' : ''} nos últimos 7 dias.`}
        </p>
      </div>

      <DashboardStats
        estimatedPointsValue={estimatedPointsValue}
        activeAlertsCount={alerts.length}
        featuredOpportunitiesCount={opportunities.length}
        activePromotionsCount={promotions.length}
      />

      {achievements && <AchievementsPanel achievements={achievements} />}

      {/* Upsell no ponto de maior fricção real: usuário Free que já usou
          todo o limite de alertas do plano — ver GROWTH.md (ETAPA 7). */}
      {ctx.plan === 'free' && alerts.length >= PLANS.free.maxAlerts && (
        <Card className="border-accent/40 bg-accent/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <p>
              Você está usando {alerts.length} de {PLANS.free.maxAlerts} alerta{PLANS.free.maxAlerts > 1 ? 's' : ''}{' '}
              do plano Free. O Premium libera até {PLANS.premium.maxAlerts} alertas e buscas ilimitadas.
            </p>
            <Link href="/assinatura" className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}>
              Ver planos
            </Link>
          </CardContent>
        </Card>
      )}

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Melhores oportunidades de hoje</h2>
            <p className="text-sm text-muted-foreground">
              {opportunities.length > 0
                ? `Valor total das oportunidades em destaque (recorte das ${opportunities.length} de maior score): ${formatBRL(totalOpportunityCashValue)}`
                : 'Nenhuma oportunidade cadastrada ainda.'}
            </p>
          </div>
          {opportunities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {TIER_ORDER.filter((tier) => tierCounts[tier] > 0).map((tier) => (
                <Badge key={tier} variant={TIER_BADGE_VARIANT[tier]}>
                  {SCORE_TIER_LABEL[tier]} · {tierCounts[tier]}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {opportunities.length === 0 ? (
          <EmptyState
            title="Nenhuma oportunidade cadastrada ainda"
            description="Faça uma busca em Voos ou Hotéis para começar a ver oportunidades com score calculado."
            icon={Search}
            action={
              <div className="flex gap-2">
                <Link href="/voos" className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}>
                  Buscar voos
                </Link>
                <Link href="/hoteis" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                  Buscar hotéis
                </Link>
              </div>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {opportunities.map((opportunity) => (
              <OpportunityCard key={opportunity.id} opportunity={opportunity} />
            ))}
          </div>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Promoções em destaque</h2>
          <Link href="/promocoes" className="text-sm text-primary hover:underline">
            Ver todas
          </Link>
        </div>

        {promotions.length === 0 ? (
          <EmptyState
            title="Nenhuma promoção ativa no momento"
            description="Volte em breve — o clube cadastra transferências bonificadas e promoções assim que surgem."
            icon={Gift}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {promotions.map((promotion) => (
              <PromotionCard
                key={promotion.id}
                promotion={promotion}
                isFavorited={favoritedPromotionIds.has(promotion.id)}
              />
            ))}
          </div>
        )}
      </section>

      <Separator />

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Seus alertas ativos</h2>
          <Link href="/alertas" className="text-sm text-primary hover:underline">
            Gerenciar alertas
          </Link>
        </div>

        {alerts.length === 0 ? (
          <EmptyState
            title="Você ainda não tem alertas ativos"
            description="Crie um alerta de voo, hotel ou transferência e a gente avisa quando valer a pena."
            icon={Bell}
            action={
              <Link href="/alertas" className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}>
                Criar meu primeiro alerta
              </Link>
            }
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {alerts.map((alert) => {
                  const route = [alert.origin, alert.destination].filter(Boolean).join(' → ');
                  return (
                    <li key={alert.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                      <div>
                        <p className="font-medium">{alert.name}</p>
                        <p className="text-muted-foreground">
                          {ALERT_TYPE_LABEL[alert.type]}
                          {route ? ` · ${route}` : alert.city ? ` · ${alert.city}` : ''}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <p>Último disparo</p>
                        <p className="font-medium text-foreground">
                          {alert.last_triggered_at ? formatDate(alert.last_triggered_at) : 'Nunca disparou'}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {expiringSoon.length > 0 && (
        <>
          <Separator />
          <section className="space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-warning" />
              <h2 className="text-lg font-semibold">Oportunidades expirando em breve</h2>
            </div>
            <Card>
              <CardHeader>
                <CardDescription>Validade em até 7 dias — confira antes que expire.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {expiringSoon.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-4 px-6 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <Plane className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{o.title}</p>
                          <p className="text-muted-foreground">
                            {[o.origin, o.destination].filter(Boolean).join(' → ') || o.city}
                          </p>
                        </div>
                      </div>
                      <Badge variant="warning">Expira em {formatDate(o.expires_at)}</Badge>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
