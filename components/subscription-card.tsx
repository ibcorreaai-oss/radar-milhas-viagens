import { Check } from 'lucide-react';
import { startCheckout } from '@/app/(app)/assinatura/actions';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { planPriceForInterval, type PlanDefinition, type BillingInterval } from '@/lib/plans';

interface SubscriptionCardProps {
  plan: PlanDefinition;
  isCurrent: boolean;
  isDowngrade: boolean;
  interval: BillingInterval;
}

// Server Component (sem interatividade própria) — o botão de assinar é um
// <form action={startCheckout}> simples, sem precisar de client component.
// `interval` vem do query param ?interval= lido no page.tsx (server) — ver
// components/billing-interval-toggle.tsx.
export function SubscriptionCard({ plan, isCurrent, isDowngrade, interval }: SubscriptionCardProps) {
  const pricing = planPriceForInterval(plan, interval);
  const priceLabel = pricing?.label ?? plan.priceLabel;

  return (
    <Card className={cn('flex flex-col', isCurrent && 'border-primary shadow-md')}>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>{plan.name}</CardTitle>
          {isCurrent && <Badge>Seu plano atual</Badge>}
        </div>
        <CardDescription>
          <span className="text-2xl font-bold text-foreground">{priceLabel}</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <ul className="space-y-2 text-sm">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        {isCurrent ? (
          <Badge variant="secondary" className="w-full justify-center py-2">
            Plano ativo
          </Badge>
        ) : plan.id === 'free' ? (
          <Button variant="outline" className="w-full" disabled>
            Plano gratuito
          </Button>
        ) : (
          <form action={startCheckout} className="w-full">
            <input type="hidden" name="planId" value={plan.id} />
            <input type="hidden" name="interval" value={interval} />
            <Button type="submit" className="w-full" variant={isDowngrade ? 'outline' : 'default'}>
              Assinar {plan.name}
            </Button>
          </form>
        )}
      </CardFooter>
    </Card>
  );
}
