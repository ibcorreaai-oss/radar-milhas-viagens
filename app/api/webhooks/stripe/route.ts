import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import type { PlanId, SubscriptionStatus } from '@/lib/types';

// Route Handler do webhook da Stripe. É a ÚNICA superfície do app que
// escreve `plan`/`status` em `subscriptions` — usa createAdminClient()
// (service_role) porque a policy de RLS não dá insert/update pra
// `authenticated` nessa tabela (ver supabase/migrations/0001_schema.sql).
export const runtime = 'nodejs';

function mapStripeStatusToOurs(status: Stripe.Subscription.Status): SubscriptionStatus {
  if (status === 'active' || status === 'trialing' || status === 'past_due') {
    return status;
  }
  return 'canceled';
}

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!signature || !webhookSecret) {
    console.error('Stripe webhook: assinatura ou STRIPE_WEBHOOK_SECRET ausente.');
    return NextResponse.json({ error: 'Configuração de webhook ausente.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'assinatura inválida';
    console.error(`Stripe webhook: falha ao validar assinatura — ${message}`);
    return NextResponse.json({ error: `Webhook inválido: ${message}` }, { status: 400 });
  }

  try {
    const supabaseAdmin = createAdminClient();

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const planId = session.metadata?.planId as PlanId | undefined;
        const customerId =
          typeof session.customer === 'string' ? session.customer : session.customer?.id ?? null;
        const subscriptionId =
          typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription?.id ?? null;

        if (!userId || !planId) {
          console.error('Stripe webhook: checkout.session.completed sem metadata.userId/planId.');
          break;
        }

        const { error } = await supabaseAdmin.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan: planId,
            status: 'active',
            current_period_end: null,
          },
          { onConflict: 'user_id' }
        );

        if (error) {
          console.error(`Stripe webhook: erro ao gravar subscription (checkout.session.completed): ${error.message}`);
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const status = mapStripeStatusToOurs(subscription.status);
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({ status, current_period_end: currentPeriodEnd })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error(`Stripe webhook: erro ao atualizar subscription (customer.subscription.updated): ${error.message}`);
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'canceled', plan: 'free' })
          .eq('stripe_subscription_id', subscription.id);

        if (error) {
          console.error(`Stripe webhook: erro ao cancelar subscription (customer.subscription.deleted): ${error.message}`);
        }
        break;
      }

      default:
        // Eventos não tratados são ignorados de propósito.
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido';
    console.error(`Stripe webhook: erro não tratado ao processar evento ${event.type}: ${message}`);
    return NextResponse.json({ error: 'Erro interno ao processar webhook.' }, { status: 500 });
  }
}
