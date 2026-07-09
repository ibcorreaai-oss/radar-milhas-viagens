'use server';

import { redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth';
import { stripe } from '@/lib/stripe';
import { PLANS } from '@/lib/plans';
import type { PlanId } from '@/lib/types';

// Server Action do botão "Assinar {plano}" (<form action={startCheckout}>).
// Cria uma Checkout Session da Stripe e redireciona o usuário pra lá.
// Plano e status da assinatura só mudam de fato quando o webhook processar
// o evento `checkout.session.completed` — aqui só iniciamos o fluxo.
export async function startCheckout(formData: FormData): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx) {
    redirect('/login');
  }

  const planId = String(formData.get('planId') ?? '') as PlanId;

  if (planId === 'free' || !(planId in PLANS)) {
    redirect('/assinatura');
  }

  const plan = PLANS[planId];
  const priceId = plan.stripeEnvVar ? process.env[plan.stripeEnvVar] : undefined;

  if (!priceId) {
    redirect('/assinatura?erro=stripe_nao_configurado');
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer_email: ctx.email ?? undefined,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/assinatura?sucesso=1`,
    cancel_url: `${appUrl}/assinatura?cancelado=1`,
    metadata: {
      userId: ctx.userId,
      planId,
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
  if (!ctx) {
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
