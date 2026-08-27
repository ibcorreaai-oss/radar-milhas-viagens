import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { stripe } from '@/lib/stripe';
import { createAdminClient } from '@/lib/supabase/admin';
import { logger } from '@/lib/logger';
import { sendEmail } from '@/lib/email/send';
import { subscriptionActiveEmail, winBackEmail } from '@/lib/email/templates';
import { PLANS, planIdForPriceId } from '@/lib/plans';
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
    await logger.critical('payment', 'Webhook Stripe recebido sem assinatura ou STRIPE_WEBHOOK_SECRET ausente', {
      hasSignature: Boolean(signature),
      hasSecret: Boolean(webhookSecret),
    });
    return NextResponse.json({ error: 'Configuração de webhook ausente.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'assinatura inválida';
    // Assinatura inválida quase sempre é STRIPE_WEBHOOK_SECRET errado (config)
    // ou alguém tentando forjar um evento — os dois merecem atenção rápida.
    await logger.critical('payment', 'Falha ao validar assinatura do webhook Stripe', { reason: message });
    return NextResponse.json({ error: `Webhook inválido: ${message}` }, { status: 400 });
  }

  logger.info('payment', 'Webhook Stripe recebido', { eventType: event.type, eventId: event.id });

  try {
    const supabaseAdmin = createAdminClient();

    // Idempotência: a Stripe pode reentregar o mesmo evento (retry por
    // timeout, reenvio manual no dashboard). Registra o event.id ANTES de
    // processar — se já existir (conflito de PK), é reentrega: responde
    // 200 sem reprocessar, pra não duplicar o e-mail de ativação/cancelamento
    // nem o log de "past_due". Achado em auditoria ETAPA 20.
    const { error: dedupeError } = await supabaseAdmin
      .from('stripe_webhook_events')
      .insert({ event_id: event.id, event_type: event.type });

    if (dedupeError) {
      if (dedupeError.code === '23505') {
        logger.info('payment', 'Webhook Stripe reentregue, ignorando (já processado)', {
          eventType: event.type,
          eventId: event.id,
        });
        return NextResponse.json({ received: true, deduped: true });
      }
      // Falha inesperada ao gravar o guard de idempotência (não é
      // duplicata) — segue processando em vez de bloquear o evento por
      // um problema no logging de idempotência.
      logger.error('payment', 'Erro ao gravar stripe_webhook_events (seguindo mesmo assim)', {
        eventType: event.type,
        eventId: event.id,
        reason: dedupeError.message,
      });
    }

    // Achado na auditoria de producao: sem isto, um erro de escrita real
    // (ex.: subscriptions.upsert falhando) so era logado, e o handler ainda
    // devolvia 200 no fim — a Stripe nunca reentregava o evento porque, do
    // ponto de vista dela, deu tudo certo. `hadCriticalWriteError` marca essa
    // falha pra devolver 500 (a Stripe reentrega automaticamente com
    // backoff); o guard de idempotencia gravado acima e apagado antes de
    // devolver 500, senao a proxima reentrega seria descartada como
    // "ja processada" sem nunca re-tentar a escrita que falhou.
    let hadCriticalWriteError = false;

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
          await logger.critical('payment', 'checkout.session.completed sem metadata.userId/planId — assinatura não ativada', {
            eventId: event.id,
            sessionId: session.id,
          });
          break;
        }

        // Achado em /code-review (revisão geral 27/08): antes gravava
        // status:'active' incondicionalmente. Métodos de pagamento com
        // confirmação demorada (boleto, comum em conta Stripe pt-BR) ou
        // cartão exigindo 3DS deixam a subscription real como 'incomplete'
        // mesmo depois do checkout.session.completed disparar — gravar
        // 'active' de qualquer jeito liberava acesso pago antes do
        // pagamento ser confirmado de verdade. Busca o status real da
        // subscription na Stripe em vez de assumir.
        let status: SubscriptionStatus = 'active';
        let currentPeriodEnd: string | null = null;
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          status = mapStripeStatusToOurs(subscription.status);
          currentPeriodEnd = subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000).toISOString()
            : null;
        }

        const { error } = await supabaseAdmin.from('subscriptions').upsert(
          {
            user_id: userId,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            plan: planId,
            status,
            current_period_end: currentPeriodEnd,
          },
          { onConflict: 'user_id' }
        );

        if (error) {
          hadCriticalWriteError = true;
          await logger.critical('payment', 'Erro ao gravar subscription após checkout concluído', {
            userId,
            planId,
            reason: error.message,
          });
        } else if (status === 'active' || status === 'trialing') {
          logger.info('payment', 'Assinatura ativada via checkout', { userId, planId, status });

          // ETAPA 7 (conversão): confirma a ativação por e-mail — reduz
          // "paguei mas não sei se funcionou" e reforça a decisão de compra.
          // Só dispara quando o status já é ativo de verdade (não em
          // 'incomplete'/boleto pendente) — ver comentário acima.
          const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('email')
            .eq('user_id', userId)
            .maybeSingle();
          if (profile?.email) {
            await sendEmail(profile.email, subscriptionActiveEmail({ planName: PLANS[planId].name }));
          }
        } else {
          // Checkout completou mas o pagamento ainda não confirmou (boleto
          // pendente, 3DS em andamento) — grava o status real (sem liberar
          // acesso) e espera o customer.subscription.updated seguinte
          // atualizar pra 'active' quando o pagamento compensar.
          logger.info('payment', 'Checkout concluído, aguardando confirmação de pagamento', { userId, planId, status });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const status = mapStripeStatusToOurs(subscription.status);
        const currentPeriodEnd = subscription.current_period_end
          ? new Date(subscription.current_period_end * 1000).toISOString()
          : null;

        // Achado em /code-review (revisão geral 27/08): este handler nunca
        // atualizava `plan` — só status/current_period_end. Upgrade/downgrade
        // feito pelo usuário no Billing Portal (Premium→Pro, por exemplo)
        // dispara exatamente este evento, mas o plano ficava travado no
        // valor antigo pra sempre no nosso banco, mesmo cobrando o valor
        // novo na Stripe (entitlements — maxAlerts/canais/buscas — nunca
        // atualizavam). Resolve o plano pelo Price ID real do item da
        // subscription em vez de confiar em metadata (que só existe na
        // criação, não é atualizada pela Stripe num upgrade feito no Portal).
        const priceId = subscription.items.data[0]?.price.id;
        const resolvedPlanId = priceId ? planIdForPriceId(priceId) : null;
        if (priceId && !resolvedPlanId) {
          logger.error('payment', 'customer.subscription.updated com Price ID não reconhecido — plan não atualizado', {
            stripeSubscriptionId: subscription.id,
            priceId,
          });
        }

        const { data: updated, error } = await supabaseAdmin
          .from('subscriptions')
          .update({
            status,
            current_period_end: currentPeriodEnd,
            ...(resolvedPlanId ? { plan: resolvedPlanId } : {}),
          })
          .eq('stripe_subscription_id', subscription.id)
          .select('user_id');

        if (error) {
          hadCriticalWriteError = true;
          logger.error('payment', 'Erro ao atualizar subscription (customer.subscription.updated)', {
            stripeSubscriptionId: subscription.id,
            reason: error.message,
          });
        } else if (!updated || updated.length === 0) {
          // Achado em /code-review: .update().eq() não dá erro quando 0
          // linhas batem (não é o mesmo que falha de escrita) — sem checar
          // isso, entrega fora de ordem (este evento chegando antes do
          // checkout.session.completed criar a linha) perdia a atualização
          // pra sempre, e a Stripe nunca reentregava (recebia 200). Marca
          // como falha real pra forçar retry — a essa altura o
          // checkout.session.completed quase certamente já terá criado a
          // linha, então o retry resolve sozinho.
          hadCriticalWriteError = true;
          logger.error('payment', 'customer.subscription.updated não encontrou linha em subscriptions (entrega fora de ordem?)', {
            stripeSubscriptionId: subscription.id,
          });
        } else if (status === 'past_due') {
          // Sinal real de falha de pagamento (cartão recusado, sem saldo,
          // etc.) — não precisa assinar o evento invoice.payment_failed à
          // parte no Stripe pra detectar isto, já vem no que já está
          // configurado.
          await logger.critical('payment', 'Assinatura entrou em past_due — provável falha de cobrança', {
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
          });
        } else {
          logger.info('payment', 'Subscription atualizada', { stripeSubscriptionId: subscription.id, status });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;

        // Busca o plano/dono ANTES de resetar pra 'free' — depois do
        // update não dá mais pra saber o que a pessoa estava perdendo,
        // e o e-mail de recuperação (ETAPA 7) precisa dessa informação.
        const { data: before } = await supabaseAdmin
          .from('subscriptions')
          .select('user_id, plan')
          .eq('stripe_subscription_id', subscription.id)
          .maybeSingle();

        const { data: deleted, error } = await supabaseAdmin
          .from('subscriptions')
          .update({ status: 'canceled', plan: 'free' })
          .eq('stripe_subscription_id', subscription.id)
          .select('user_id');

        if (error) {
          hadCriticalWriteError = true;
          logger.error('payment', 'Erro ao cancelar subscription (customer.subscription.deleted)', {
            stripeSubscriptionId: subscription.id,
            reason: error.message,
          });
        } else if (!deleted || deleted.length === 0) {
          // Mesmo achado do handler de 'updated' acima — 0 linhas batendo
          // não é erro pro Supabase, mas significa que a atualização se
          // perdeu (entrega fora de ordem). Força retry.
          hadCriticalWriteError = true;
          logger.error('payment', 'customer.subscription.deleted não encontrou linha em subscriptions (entrega fora de ordem?)', {
            stripeSubscriptionId: subscription.id,
          });
        } else {
          logger.info('payment', 'Subscription cancelada, usuário voltou pro plano free', {
            stripeSubscriptionId: subscription.id,
          });

          if (before?.user_id && before.plan && before.plan !== 'free') {
            const { data: profile } = await supabaseAdmin
              .from('profiles')
              .select('email')
              .eq('user_id', before.user_id)
              .maybeSingle();
            if (profile?.email) {
              await sendEmail(profile.email, winBackEmail({ planName: PLANS[before.plan as PlanId].name }));
            }
          }
        }
        break;
      }

      default:
        // Eventos não tratados são ignorados de propósito.
        break;
    }

    if (hadCriticalWriteError) {
      // Apaga o guard de idempotência gravado no início — sem isto, a
      // reentrega da Stripe (disparada pelo 500 abaixo) seria descartada
      // como "já processada" antes de tentar escrever de novo.
      await supabaseAdmin.from('stripe_webhook_events').delete().eq('event_id', event.id);
      return NextResponse.json({ error: 'Falha ao gravar estado da assinatura, aguardando nova tentativa.' }, { status: 500 });
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'erro desconhecido';
    await logger.critical('payment', `Erro não tratado ao processar webhook Stripe`, {
      eventType: event.type,
      eventId: event.id,
      reason: message,
    });
    return NextResponse.json({ error: 'Erro interno ao processar webhook.' }, { status: 500 });
  }
}
