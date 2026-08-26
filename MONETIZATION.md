# Monetização — Stripe, teste gratuito e regras de negócio (ETAPA 16)

> **Isto é um ponto de partida, não a versão final.** O Igor pediu explicitamente pra eu montar
> as regras de negócio com exemplos concretos, deixando claro que ele vai revisar e ajustar
> (preço, duração do teste, o que fica bloqueado, etc.) só depois que o app inteiro estiver
> pronto. Tudo neste documento que é "número"/"regra" (preço, dias de teste, desconto anual) é
> exemplo ajustável — o que é "arquitetura" (onde o gate roda, quem escreve `subscriptions`,
> como o webhook funciona) é o que deve permanecer estável mesmo quando os números mudarem.

## 1. Modelo de acesso (resumo)

```
Cadastro → 5 dias de teste gratuito (trialing) → sem pagar → acesso bloqueado
                                                → assina (mensal/anual) → acesso liberado enquanto pagar em dia
Administrador → sempre tem acesso, independente de assinatura
```

- **Teste gratuito**: 5 dias corridos a partir do cadastro (`TRIAL_DAYS` em
  `lib/subscription-access.ts`), sem precisar de cartão de crédito. Durante o teste, o usuário
  usa o app com os limites do plano **Free** (`lib/plans.ts`: 3 buscas/dia, 1 alerta) — o teste
  libera o *acesso às páginas* (ver detalhes, usar favoritos), não os limites de uso de um plano
  pago. Essa é uma decisão de produto explícita: dá pra mudar pra "teste com limites do Premium"
  trocando só o `plan` gravado em `handle_new_user()` (migration `0022_trial_period.sql`), sem
  tocar no gate de acesso.
- **Depois do teste, sem assinatura paga**: as páginas de produto (`/dashboard`, `/voos`,
  `/hoteis`, `/alertas`, `/consultor-ia`, `/favoritos`, `/bucket-list`, `/afiliados`,
  `/treinamentos`, `/descobrir`) redirecionam pra `/assinatura?trial_expirado=1`. `/perfil` e
  `/assinatura` continuam sempre acessíveis (a pessoa precisa conseguir ver o status e pagar).
- **Assinatura ativa** (`status='active'` — só a Stripe escreve isso, via webhook): acesso total,
  dentro dos limites do plano contratado.
- **`past_due`** (cobrança falhou mas a Stripe ainda está tentando de novo — dunning automático):
  mantém acesso. Só quando a Stripe desiste de vez e cancela (`customer.subscription.deleted`,
  status vira `canceled`) o acesso é cortado. Prática comum de SaaS — não vale a pena irritar
  quem só teve um cartão recusado uma vez.
- **Administrador** (`role='admin'` ou `'super_admin'`): bypass total do gate de assinatura, em
  qualquer rota — implementado no `middleware.ts`, mesmo padrão que já existia pra bloqueio de
  conta.

Implementação: `lib/subscription-access.ts` (`hasActiveAccess`/`isTrialActive`/`trialDaysLeft`,
puro, sem I/O — roda no Edge Runtime do `middleware.ts`) + gate no `middleware.ts` + UI em
`components/subscription-status-card.tsx` (`/perfil`) e `app/(app)/assinatura/page.tsx`.

## 2. Por que o teste é "do nosso lado", não da Stripe

A Stripe tem um recurso nativo de trial (`subscription_data.trial_period_days` no Checkout), mas
ele **normalmente exige cartão de crédito já no início do teste** (cobra automaticamente quando o
trial acaba, a não ser que se configure "trial sem forma de pagamento", uma opção mais nova e
menos padrão da Stripe). Como a regra pedida foi "5 dias grátis, DEPOIS faz a assinatura" — sem
fricção de pedir cartão logo no cadastro — o teste é controlado inteiramente pelo nosso banco
(`subscriptions.trial_ends_at`, coluna que já existia desde o MVP original sem uso nenhum) e só
na hora de vencer o teste é que a pessoa é levada pra um Checkout de verdade. Isso também evita
duplicar trial (Stripe + nosso) e mantém a Stripe fazendo só o que ela faz melhor: cobrança
recorrente de quem já decidiu pagar.

## 3. Planos e preços (exemplo — ajustável em `lib/plans.ts`)

| Plano | Mensal | Anual (exemplo: ~2 meses grátis) | Canais | Alertas | Buscas/dia |
|---|---|---|---|---|---|
| Free | R$ 0 | — | — | 1 | 3 |
| Premium | R$ 29,90 | R$ 299 | e-mail | 10 | ilimitado |
| Pro | R$ 79,90 | R$ 799 | e-mail + WhatsApp | 50 | ilimitado |
| Consultor/Agência | R$ 199 | R$ 1.990 | e-mail + WhatsApp | 50 | ilimitado |

O desconto anual (10x o valor mensal = ~17% off, "2 meses grátis" como texto de marketing) é só
um exemplo de mercado comum — trocar é só editar `annualPriceCents`/`annualPriceLabel` em
`lib/plans.ts` e o Price correspondente na Stripe.

**Tipo de cobrança**: os 3 planos pagos são **recorrentes** (Stripe Price com `recurring`,
intervalo `month` ou `year`), nunca pagamento único — o modelo de negócio inteiro é assinatura.
Não existe hoje nenhum produto de pagamento avulso ("comprar 1x"); a arquitetura do Checkout
(`app/(app)/assinatura/actions.ts`) suporta adicionar um no futuro (`mode: 'payment'` em vez de
`'subscription'`) se um dia fizer sentido vender algo avulso (ex.: um relatório/consultoria
pontual), mas isso é trabalho novo, não algo já pronto esperando ser ligado.

## 4. Dados coletados na assinatura (e-mail, telefone, CPF)

- **E-mail**: já é obrigatório desde o cadastro (login por OTP/senha) — reaproveitado direto no
  Checkout (`customer_email`), sem pedir de novo.
- **Telefone e CPF/CNPJ**: coletados **dentro do Checkout hospedado da própria Stripe**
  (`phone_number_collection.enabled` + `tax_id_collection.enabled` em
  `app/(app)/assinatura/actions.ts`), não no nosso formulário de perfil nem no nosso banco. Isso
  segue o mesmo princípio já usado na ETAPA 15.1 pro CPF do chat público: **dado sensível só onde
  tem uso real** — aqui, o uso real é nota fiscal/compliance fiscal da Stripe, que já é equipada
  pra guardar isso com segurança; duplicar CPF no nosso `profiles` seria mais superfície de
  vazamento (LGPD) sem ganho nenhum, já que não emitimos nota fiscal nós mesmos. Se um dia o app
  precisar do CPF pra alguma regra própria (ex.: nota fiscal emitida por nós, não pela Stripe),
  aí sim vale adicionar uma coluna — decisão pra revisitar se/quando isso virar necessidade real.
- **Login**: continua só e-mail (OTP ou senha, ETAPA 14) — este documento não muda nada da
  autenticação, só do que é pedido especificamente na hora de pagar.

## 5. O que acontece em cada evento (webhook `/api/webhooks/stripe`, já existia, sem mudança de
lógica nesta etapa — só passou a receber eventos com metadata de `interval` também)

| Evento Stripe | O que o app faz |
|---|---|
| `checkout.session.completed` | Ativa a assinatura (`status='active'`, `plan=<planId do metadata>`), manda e-mail de confirmação |
| `customer.subscription.updated` | Sincroniza `status`/`current_period_end`. Se virar `past_due`, dispara alerta crítico interno (`OPS_ALERT_EMAIL`) — sinal de cartão recusado |
| `customer.subscription.deleted` | Assinatura cancelada de vez: `status='canceled'`, `plan` volta pra `'free'`, manda e-mail de win-back |

`subscriptions` só é escrita pelo webhook (service_role) — nunca por Server Action do usuário nem
por RLS de `authenticated` (já era assim desde o MVP, ver `supabase/migrations/0001_schema.sql`).

## 6. Cenários de teste (modo Teste da Stripe — cartões oficiais)

| Cenário | Cartão de teste | Resultado esperado | Validado nesta etapa? |
|---|---|---|---|
| Criação de assinatura (Price real) | — (via API, `trial_period_days`, sem cartão) | `status='trialing'` | **Sim, ao vivo** — ver #7 |
| Cancelamento | Cancelar no Billing Portal (`/assinatura` → "Gerenciar assinatura") ou via API | `status='canceled'`, volta pra `free`, acesso bloqueado (a não ser que ainda esteja nos 5 dias de teste) | **Sim, ao vivo** — ver #7 |
| Aprovação | `4242 4242 4242 4242` | Checkout completa, webhook ativa a assinatura | Não — precisa `STRIPE_SECRET_KEY` + passar pelo Checkout de verdade (a integração usada nesta etapa tem uma chave restrita, sem permissão de anexar cartão) |
| Recusa (genérica) | `4000 0000 0000 0002` | Checkout mostra erro, nenhuma assinatura é criada | Não — mesmo motivo acima |
| Recusa (saldo insuficiente) | `4000 0000 0000 9995` | Idem — Checkout nunca completa, nada muda no banco | Não |
| Requer autenticação (3-D Secure) | `4000 0025 0000 3155` | Checkout pede confirmação extra antes de aprovar | Não |
| Renovação | Avançar o "Test clock" da assinatura no Dashboard da Stripe (Developers → Test clocks) | `customer.subscription.updated` com `current_period_end` novo | Não — operação de Test clock não disponível pela integração usada |
| Falha de cobrança / dunning | Trocar o método de pagamento de um cliente de teste pra um cartão de recusa e forçar cobrança | `status` vira `past_due`, acesso continua liberado, alerta crítico interno disparado | Não — mesmo motivo (sem permissão de cartão) |

Data completa oficial de cartões de teste:
https://docs.stripe.com/testing (não citada em detalhe aqui pra não desatualizar este documento
se a Stripe mudar a lista).

## 7. O que já foi validado ao vivo nesta etapa (via integração Stripe conectada)

Confirmado que existe uma conta Stripe real conectada (modo Teste) e usada:
- Criados os 3 produtos × 2 Prices (mensal/anual) de verdade na Stripe, com os valores da tabela
  do #3 — os 6 Price IDs já estão em `.env.local`.
- Criada uma assinatura de teste real no Price Premium mensal (sem cartão, via
  `trial_period_days`) e confirmado `status='trialing'` — prova que o Price ID funciona pra
  criar assinatura de verdade.
- Cancelada essa mesma assinatura e confirmado `status='canceled'`.
- **Não deu pra ir além disso**: a integração usada tem uma chave **restrita** — sem permissão
  pra ler dados da conta (`get_stripe_account_info` falhou por permissão), criar Price avulso
  fora de um produto novo, anexar cartão/PaymentMethod a um cliente, nem criar Checkout Session
  ou Test Clock. Ou seja, dá pra montar catálogo e gerenciar assinaturas por trás, mas não dá pra
  simular "cliente pagando com cartão" sem passar pelo Checkout de verdade do próprio app — que
  por sua vez precisa do `STRIPE_SECRET_KEY` (não obtido por essa integração, e não é algo que eu
  deva extrair/gerar sozinho por segurança).
- Cliente de teste ficou no Dashboard (`cus_V91lhjp4AllO6o`, metadata
  `purpose='teste_automatizado_etapa16'`), sem custo — pode apagar quando quiser.

## 8. Pendências que só o Igor resolve (checklist completo em `MANUAL_ACTIONS.md`/`README.md`)

- `STRIPE_SECRET_KEY` (Developers → API keys → chave secreta de Teste) — sem ela, o Checkout do
  próprio app não roda, mesmo com os Price IDs já configurados.
- `STRIPE_WEBHOOK_SECRET` — só depois de ter um domínio real publicado (Stripe não alcança
  `localhost` pra entregar webhook).
- `SUPABASE_SERVICE_ROLE_KEY` — sem ele, o webhook não grava nada no banco mesmo com a Stripe 100%
  configurada (pendência antiga, não nova desta etapa).
