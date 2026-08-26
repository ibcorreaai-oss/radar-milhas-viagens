import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth';
import { PLANS, PLAN_ORDER, type BillingInterval } from '@/lib/plans';
import { trialDaysLeft } from '@/lib/subscription-access';
import { SubscriptionCard } from '@/components/subscription-card';
import { BillingIntervalToggle } from '@/components/billing-interval-toggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { openBillingPortal } from './actions';
import { ConversionTracker } from '@/components/conversion-tracker';
import { ToastFromQuery } from '@/components/toast-from-query';

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
  const trialExpirado = params.trial_expirado === '1';
  const interval: BillingInterval = params.interval === 'year' ? 'year' : 'month';

  const currentPlan = ctx.plan;
  const currentRank = PLAN_RANK[currentPlan] ?? 0;
  const isPaidActive = ctx.subscription?.status === 'active';
  const daysLeft = trialDaysLeft(ctx.subscription);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Assinatura</h1>
        <p className="mt-1 text-muted-foreground">
          Escolha o plano que faz sentido para o seu volume de buscas e alertas.
        </p>
      </div>

      {/* ETAPA 15.1 (achado revisando antes do fim da etapa): "sucesso"/
          "cancelado" viraram toast (ToastFromQuery) em vez de banner preso
          ao searchParams do server component — ConversionTracker precisa
          limpar o param da URL depois de disparar a conversão de ads (senão
          reload/compartilhar a URL reconta a mesma conversão), e um banner
          renderizado a partir do searchParams do servidor desapareceria
          assim que a URL fosse limpa, antes da pessoa nem ler. */}
      <ToastFromQuery
        rules={[
          {
            param: 'sucesso',
            value: '1',
            variant: 'success',
            title: 'Assinatura confirmada!',
            description: 'Pode levar alguns instantes até o plano atualizar aqui.',
          },
          {
            param: 'cancelado',
            value: '1',
            variant: 'info',
            title: 'Checkout cancelado',
            description: 'Nenhuma cobrança foi feita.',
          },
        ]}
      />
      <ConversionTracker event="subscribe" param="sucesso" value="1" />

      {erro === 'stripe_nao_configurado' && (
        <Card className="border-destructive">
          <CardContent className="p-4 text-sm text-destructive">
            Esse plano ainda não está configurado para pagamento. Tente novamente mais tarde.
          </CardContent>
        </Card>
      )}

      {/* ETAPA 16 (ver MONETIZATION.md) — "tela de renovação de assinatura"
          pedida pelo Igor: em vez de criar uma página nova, o middleware
          redireciona pra cá com ?trial_expirado=1 (reaproveita a página de
          planos que já existe — a pessoa já está exatamente onde precisa
          estar pra resolver: escolher um plano e pagar). Banner fixo (não
          toast) de propósito — é a mensagem mais importante da página
          nesse estado, não pode desaparecer sozinha antes de ser lida. */}
      {trialExpirado && !isPaidActive && (
        <Card className="border-primary">
          <CardContent className="p-4 text-sm">
            <p className="font-medium text-foreground">Seu período de teste gratuito acabou.</p>
            <p className="mt-1 text-muted-foreground">
              Escolha um plano abaixo para continuar vendo os detalhes das oportunidades e usando
              seus favoritos.
            </p>
          </CardContent>
        </Card>
      )}

      {!trialExpirado && !isPaidActive && daysLeft != null && (
        <Card>
          <CardContent className="p-4 text-sm text-muted-foreground">
            Você está no período de teste gratuito —{' '}
            <span className="font-medium text-foreground">
              {daysLeft === 1 ? 'falta 1 dia' : `faltam ${daysLeft} dias`}
            </span>{' '}
            para assinar e manter o acesso.
          </CardContent>
        </Card>
      )}

      <BillingIntervalToggle interval={interval} />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLAN_ORDER.map((planId) => {
          const plan = PLANS[planId];
          const isCurrent = plan.id === currentPlan;
          const isDowngrade = (PLAN_RANK[plan.id] ?? 0) < currentRank;
          return (
            <SubscriptionCard
              key={plan.id}
              plan={plan}
              isCurrent={isCurrent}
              isDowngrade={isDowngrade}
              interval={interval}
            />
          );
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
