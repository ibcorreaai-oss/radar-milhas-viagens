'use server';

import { redirect } from 'next/navigation';
import type Stripe from 'stripe';
import { getUserContext } from '@/lib/auth';
import { isBlocked } from '@/lib/roles';
import { stripe } from '@/lib/stripe';
import { logger } from '@/lib/logger';
import { PLANS, planPriceForInterval, type BillingInterval } from '@/lib/plans';
import { getSiteUrl } from '@/lib/site-url';
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

  // Já tem assinatura paga ativa/trial/past_due na Stripe: não cria um
  // segundo Checkout (isso abriria uma SEGUNDA subscription cobrando em
  // paralelo, órfã — o usuário só veria a mais nova no Billing Portal e
  // continuaria sendo cobrado pela antiga sem saber). Manda pro Billing
  // Portal, onde dá pra trocar de plano na MESMA assinatura (Igor precisa
  // habilitar "Update subscription" no Customer Portal da Stripe — ver
  // README). 'past_due' incluído aqui (achado em /code-review, revisão
  // geral 27/08): hasActiveAccess() em lib/subscription-access.ts já trata
  // past_due como acesso concedido (dunning, cartão recusado mas Stripe
  // ainda tentando) — sem incluir aqui também, esse usuário clicando
  // "Assinar" de novo criava exatamente a segunda subscription órfã que
  // este código diz evitar.
  const hasLiveSubscription =
    Boolean(ctx.subscription?.stripe_subscription_id) &&
    (ctx.subscription?.status === 'active' ||
      ctx.subscription?.status === 'trialing' ||
      ctx.subscription?.status === 'past_due');

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

  const appUrl = getSiteUrl();
  // Reaproveita o Customer da Stripe já existente (se houver, de uma
  // assinatura anterior cancelada) em vez de deixar o Checkout criar um
  // Customer novo por e-mail — evita duplicar o cadastro de cliente na Stripe.
  const existingCustomerId = ctx.subscription?.stripe_customer_id ?? undefined;

  // Achado na auditoria de producao: uma falha real da API da Stripe aqui
  // (ex.: Price ID que nao existe na conta/modo configurado em
  // STRIPE_SECRET_KEY) nao era capturada — o usuario via a tela de erro
  // generica do Next.js (digest sem detalhe nenhum) em vez de uma mensagem
  // amigavel. Reaproveita o mesmo banner ?erro=stripe_nao_configurado que
  // ja existe pra "env var vazia", agora tambem pra "a Stripe recusou o
  // Price ID configurado" — sintoma igual do ponto de vista do usuario,
  // mesma mensagem, mas logado com detalhe pra diagnostico.
  let session: Stripe.Checkout.Session;
  try {
    session = await stripe.checkout.sessions.create({
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
  } catch (error) {
    await logger.critical('payment', 'Falha ao criar Checkout Session da Stripe', {
      planId,
      interval,
      priceEnvVar: pricing?.stripeEnvVar,
      reason: error instanceof Error ? error.message : String(error),
    });
    redirect('/assinatura?erro=stripe_nao_configurado');
  }

  if (!session.url) {
    await logger.critical('payment', 'Stripe criou a Checkout Session mas não retornou url', { planId, interval });
    redirect('/assinatura?erro=stripe_nao_configurado');
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

  const appUrl = getSiteUrl();

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${appUrl}/assinatura`,
  });

  redirect(session.url);
}
