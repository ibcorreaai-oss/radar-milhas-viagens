import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth';
import { PLANS, PLAN_ORDER } from '@/lib/plans';
import { SubscriptionCard } from '@/components/subscription-card';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { openBillingPortal } from './actions';

const PLAN_RANK: Record<string, number> = { free: 0, premium: 1, pro: 2, consultor: 3 };

export default async function AssinaturaPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const ctx = await getUserContext();
  if (!ctx) {
    redirect('/login');
  }

  const params = await searchParams;
  const erro = typeof params.erro === 'string' ? params.erro : null;
  const sucesso = params.sucesso === '1';
  const cancelado = params.cancelado === '1';

  const currentPlan = ctx.plan;
  const currentRank = PLAN_RANK[currentPlan] ?? 0;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assinatura</h1>
        <p className="mt-1 text-muted-foreground">
          Escolha o plano que faz sentido para o seu volume de buscas e alertas.
        </p>
      </div>

      {erro === 'stripe_nao_configurado' && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">
            Esse plano ainda não está configurado para pagamento. Tente novamente mais tarde.
          </CardContent>
        </Card>
      )}
      {sucesso && (
        <Card className="border-success">
          <CardContent className="p-4 text-sm text-success">
            Assinatura confirmada! Pode levar alguns instantes até o plano atualizar aqui.
          </CardContent>
        </Card>
      )}
      {cancelado && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Checkout cancelado — nenhuma cobrança foi feita.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = plan.id === currentPlan;
          const isDowngrade = (PLAN_RANK[plan.id] ?? 0) < currentRank;
          return <SubscriptionCard key={plan.id} plan={plan} isCurrent={isCurrent} isDowngrade={isDowngrade} />;
        })}
      </div>

      {ctx.subscription?.stripe_customer_id && (
        <Card>
          <CardContent className="flex flex-col items-start gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium">Gerenciar assinatura</p>
              <p className="text-sm text-muted-foreground">
                Cancelar, trocar cartão ou ver faturas — tudo direto no portal seguro da Stripe.
              </p>
            </div>
            <form action={openBillingPortal}>
              <Button type="submit" variant="outline">
                Gerenciar assinatura
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
