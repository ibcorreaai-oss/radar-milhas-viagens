'use server';

import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth';
import { isBlocked } from '@/lib/roles';
import { stripe } from '@/lib/stripe';
import { PLANS, planPriceForInterval, type BillingInterval } from '@/lib/plans';
import type { PlanId } from '@/lib/types';

// Server Action do botão "Assinar {plano}" (<form action={startCheckout}>).
// Cria uma Checkout Session da Stripe e redireciona o usuário pra lá.
// Plano e status da assinatura só mudam de fato quando o webhook processar
// o evento `checkout.session.completed` — aqui só iniciamos o fluxo.
export async function startCheckout(formData: FormData): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx || isBlocked(ctx.profile)) {
    redirect('/login');
  }

  const planId = String(formData.get('planId') ?? '') as PlanId;
  const intervalRaw = String(formData.get('interval') ?? 'month');
  const interval: BillingInterval = intervalRaw === 'year' ? 'year' : 'month';

  if (planId === 'free' || !(planId in PLANS)) {
    redirect('/assinatura');
  }

  // Já tem assinatura paga ativa/trial na Stripe: não cria um segundo
  // Checkout (isso abriria uma SEGUNDA subscription cobrando em paralelo,
  // órfã — o usuário só veria a mais nova no Billing Portal e continuaria
  // sendo cobrado pela antiga sem saber). Manda pro Billing Portal, onde dá
  // pra trocar de plano na MESMA assinatura (Igor precisa habilitar "Update
  // subscription" no Customer Portal da Stripe — ver README).
  const hasLiveSubscription =
    Boolean(ctx.subscription?.stripe_subscription_id) &&
    (ctx.subscription?.status === 'active' || ctx.subscription?.status === 'trialing');

  if (hasLiveSubscription) {
    await openBillingPortal();
    return;
  }

  const plan = PLANS[planId];
  const pricing = planPriceForInterval(plan, interval);
  const priceId = pricing ? process.env[pricing.stripeEnvVar] : undefined;

  if (!priceId) {
    redirect('/assinatura?erro=stripe_nao_configurado');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  // Reaproveita o Customer da Stripe já existente (se houver, de uma
  // assinatura anterior cancelada) em vez de deixar o Checkout criar um
  // Customer novo por e-mail — evita duplicar o cadastro de cliente na Stripe.
  const existingCustomerId = ctx.subscription?.stripe_customer_id ?? undefined;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    ...(existingCustomerId
      ? { customer: existingCustomerId }
      : { customer_email: ctx.email ?? undefined }),
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/assinatura?sucesso=1`,
    cancel_url: `${appUrl}/assinatura?cancelado=1`,
    // ETAPA 16 (ver MONETIZATION.md #4) — telefone e CPF/CNPJ coletados e
    // guardados pela própria Stripe no Checkout hospedado, não no nosso
    // banco: mesmo raciocínio já usado pro CPF do chat público na ETAPA
    // 15.1 (dado sensível só armazenado onde tem uso real — aqui, nota
    // fiscal/antifraude da Stripe). tax_id_collection detecta o país pelo
    // endereço de cobrança preenchido no próprio Checkout.
    phone_number_collection: { enabled: true },
    tax_id_collection: { enabled: true },
    metadata: {
      userId: ctx.userId,
      planId,
      interval,
    },
    subscription_data: {
      metadata: { userId: ctx.userId, planId, interval },
    },
  });

  if (!session.url) {
    throw new Error('Stripe não retornou uma URL de checkout.');
  }

  redirect(session.url);
}

// Server Action do botão "Gerenciar assinatura" — abre o Billing Portal da
// Stripe (cancelar, trocar cartão, ver faturas), sem passar por nenhuma
// tela nossa de edição de plano/status (isso é escrita só do webhook).
export async function openBillingPortal(): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx || isBlocked(ctx.profile)) {
    redirect('/login');
  }

  const customerId = ctx.subscription?.stripe_customer_id;
  if (!customerId) {
    redirect('/assinatura');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/assinatura`,
  });

  redirect(session.url);
}
