import Link from 'next/link';
import { CheckCircle2, Clock, ShieldCheck, XCircle } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';
import { isTrialActive, trialDaysLeft } from '@/lib/subscription-access';
import { PLANS } from '@/lib/plans';
import type { Subscription } from '@/lib/types';

interface SubscriptionStatusCardProps {
  subscription: Subscription | null;
  isAdmin: boolean;
}

// ETAPA 16 (ver MONETIZATION.md) — seção pedida pelo Igor na página de
// perfil: status da assinatura, dias restantes de teste e botão de assinar
// quando aplicável. Regras exatas (nessa ordem de prioridade):
// 1. Administrador: acesso independe de assinatura, nunca mostra "expirado"
//    nem botão de assinar (confundiria quem nunca precisou pagar).
// 2. Assinatura paga ativa (status='active'): mostra só "Ativo", mesmo que
//    a pessoa AINDA esteja dentro da janela de teste — o Igor pediu
//    explicitamente "mostre somente o status ativo" nesse caso.
// 3. Teste gratuito em andamento (sem assinatura ativa): mostra quantos
//    dias faltam + botão "Assinar agora".
// 4. Nem um nem outro (teste expirado ou nunca existiu): "sem assinatura
//    ativa" + botão "Assinar agora".
export function SubscriptionStatusCard({ subscription, isAdmin }: SubscriptionStatusCardProps) {
  if (isAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assinatura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Acesso administrativo</p>
              <p className="text-xs text-muted-foreground">
                Contas de administrador acessam o app independente de assinatura.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isPaidActive = subscription?.status === 'active';
  const trialing = !isPaidActive && isTrialActive(subscription);
  const daysLeft = trialDaysLeft(subscription);
  const planName = subscription ? PLANS[subscription.plan]?.name : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assinatura</CardTitle>
        <CardDescription>Status do seu acesso ao clube.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {isPaidActive ? (
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-success" />
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium">Assinatura ativa</p>
                <Badge variant="secondary">{planName ?? 'Plano pago'}</Badge>
              </div>
              {subscription?.current_period_end && (
                <p className="text-xs text-muted-foreground">
                  Renova em {formatDate(subscription.current_period_end)}.
                </p>
              )}
            </div>
          </div>
        ) : trialing ? (
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-warning" />
            <div>
              <p className="text-sm font-medium">Período de teste gratuito</p>
              <p className="text-xs text-muted-foreground">
                {daysLeft === 1 ? 'Falta 1 dia' : `Faltam ${daysLeft} dias`} para você precisar
                assinar e manter o acesso.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="text-sm font-medium">Sem assinatura ativa</p>
              <p className="text-xs text-muted-foreground">
                Seu período de teste acabou. Assine um plano para voltar a ver os detalhes das
                oportunidades e usar seus favoritos.
              </p>
            </div>
          </div>
        )}
      </CardContent>
      {!isPaidActive && (
        <CardFooter>
          <Link href="/assinatura" className={cn(buttonVariants({ variant: 'default' }), 'w-full sm:w-auto')}>
            Assinar agora
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}
