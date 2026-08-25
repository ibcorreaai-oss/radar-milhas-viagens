# GROWTH.md — Radar Milhas & Viagens

> Ativação, retenção, conversão, upsell/cross-sell, recuperação de cancelados e as métricas de
> negócio. Escrito em 25/08/2026 (ETAPA 7 do Igor).

## O achado que guiou esta etapa: 4 e-mails prontos, nenhum disparado

Igual ao Zod na ETAPA 6, `lib/email/templates.ts` já tinha `welcomeEmail`, `subscriptionActiveEmail`,
`trialEndingEmail`, `opportunityExpiredEmail` e `newPromotionEmail` escritos desde sessões
anteriores — só `alertFoundEmail` era realmente chamado em algum lugar (pelo cron
`check-alerts`). Os outros quatro eram infraestrutura morta: o funil de ativação/conversão/
retenção não tinha nenhum e-mail automático além do alerta de oportunidade.

## 1. Mecanismos de ativação, retenção e conversão implementados

| E-mail | Gatilho | Papel no funil |
|---|---|---|
| `welcomeEmail` | Cadastro concluído (`cadastro/actions.ts`, sessão instantânea) ou primeiro login confirmado (`auth/callback`, e-mail/Google) | **Ativação** — primeiro contato, direciona pro onboarding |
| `subscriptionActiveEmail` | Webhook Stripe `checkout.session.completed` | **Conversão** — confirma que o pagamento funcionou, reduz ansiedade pós-compra |
| `winBackEmail` (novo) | Webhook Stripe `customer.subscription.deleted` | **Recuperação** — lembra o que a pessoa perde, convida a voltar |
| `alertFoundEmail` (já existia) | Cron `check-alerts` | **Retenção** — é o próprio motivo de existir do produto |

Todos passam por `sendEmail()` (`lib/email/send.ts`), que nunca lança exceção e já loga
sucesso/falha (ETAPA 4) — nenhum desses disparos pode derrubar o fluxo principal (cadastro,
checkout, cancelamento) se o Resend falhar ou não estiver configurado.

**Decisão de produto pendente, não implementada:** `trialEndingEmail` continua sem gatilho — o
Stripe Checkout atual (`assinatura/actions.ts`) não cria um período de teste
(`trial_period_days`), então "trial terminando" nunca acontece de verdade hoje. Só faz sentido
ligar esse e-mail se/quando o Igor decidir oferecer trial gratuito nos planos pagos — infra
pronta (`SubscriptionStatus` já tem `'trialing'`, o template já existe), só falta a decisão de
negócio + um cron que verifique `subscriptions.trial_ends_at` (coluna já existe no schema).

## 2. Pontos de abandono identificados

Calculados em `/admin/metricas` a partir do dado real que o app já coleta (sem tabela de eventos
nova — ver §6):

- **Cadastrou, nunca buscou nada, há mais de 7 dias** — nunca chegou perto do valor central do
  produto (comparar dinheiro vs pontos). É o abandono mais grave: a pessoa nem experimentou.
- **Travado no onboarding há mais de 3 dias** — terminou o cadastro mas não respondeu o
  questionário inicial. Sinal de fricção no onboarding em si, não de desinteresse no produto.
- **(Já existia, reforçado)** dashboard mostra `EmptyState` com CTA "Criar meu primeiro alerta"
  quando `alerts.length === 0` — cobre o abandono entre "fez uma busca" e "configurou algo
  recorrente" (sem alerta, o usuário não tem motivo pra voltar).

## 3. Oportunidades de upsell

- **Banner no dashboard** (novo, `app/(app)/dashboard/page.tsx`): usuário Free que já usa o
  alerta grátis (limite do plano) vê um convite pra Premium na hora — momento de maior fricção
  real (literalmente não consegue criar outro alerta sem pagar), não um banner genérico.
- **`/admin/metricas`** lista a contagem de candidatos a upsell (free no limite de alertas) —
  dá pra priorizar contato manual/campanha se o volume justificar.
- Os banners de limite já existentes (`/hoteis?limite=1`, `/voos?limite=1`, `/alertas?limite=1`)
  já eram um mecanismo de upsell no ponto de fricção — não precisaram de mudança, só foram
  confirmados como corretos durante a auditoria.

## 4. Oportunidades de cross-sell

- **`/admin/metricas`** identifica usuários com alerta só de hotel (nunca configuraram de voo) e
  vice-versa — candidatos naturais a "você também pode monitorar voos para esse destino".
  Não implementei o nudge automático na UI ainda (ex.: sugestão dentro de `/alertas` na hora de
  criar um alerta de hotel) — fica como próximo passo se o Igor quiser, a identificação já está
  pronta pra alimentar essa decisão.

## 5. Recuperação de assinantes cancelados

- **Automático:** `winBackEmail` dispara no momento exato do cancelamento (webhook
  `customer.subscription.deleted`), com o nome do plano que a pessoa tinha.
- **Manual:** `/admin/metricas` lista os últimos 10 cancelamentos (30 dias) com nome/e-mail, pra
  contato direto quando fizer sentido (ex.: perguntar o motivo, oferecer condição especial) — o
  e-mail automático é o primeiro toque, não substitui uma conversa quando o valor do cliente
  justificar.

## 6. Métricas de crescimento, retenção e conversão

`/admin/metricas` (novo, link no painel `/admin`) — calculado sob demanda a partir de
`profiles`/`subscriptions`/`alerts`/`flight_searches`/`hotel_searches`, sem tabela de evento
nova e sem serviço externo (zero custo adicional):

- **Crescimento:** usuários totais, novos nos últimos 7/30 dias.
- **Conversão:** contagem por plano, taxa de conversão paga (pagantes / total).
- **Ativação:** % onboarding concluído, % com pelo menos 1 alerta criado, quantos já buscaram.
- **Retenção:** churn dos últimos 30 dias (cancelamentos / base paga+cancelada no período).
- Pontos de abandono, upsell e cross-sell — ver §2-4 acima, todos na mesma página.

**Por que não uma tabela de eventos genérica (page views, cliques) nem um serviço tipo
PostHog:** sem tráfego real ainda, uma tabela de eventos ficaria vazia e um serviço pago não se
paga sozinho — as métricas acima já respondem "cresceu quanto, converteu quanto, reteve quanto"
usando dado que o produto já precisa gravar de qualquer forma (busca, alerta, assinatura). Se o
volume de usuários crescer a ponto de precisar de funil de conversão por página/clique de
verdade, aí sim vale reconsiderar — decisão de custo pro Igor, ver checklist.

**Por que a página usa `service_role` em vez do client de sessão:** a RLS de `subscriptions` só
libera "read own" (dado de pagamento é sensível, ver `DATA_QUALITY.md`/`0001_schema.sql`) — sem
policy de admin-lê-tudo. Em vez de afrouxar essa RLS pra todo lugar, a página usa
`createAdminClient()` só aqui, atrás do mesmo `role !== 'admin' → redirect` que toda página
`/admin` já tem.

---

## Checklist manual

- [ ] Decidir se o produto vai oferecer trial gratuito nos planos pagos — se sim, eu implemento
      `trial_period_days` no Checkout + o cron que dispara `trialEndingEmail`.
- [ ] Definir se cross-sell (hotel↔voo) vira nudge automático na UI ou fica só como métrica pra
      decisão manual por enquanto.
- [ ] Revisar o copy dos e-mails novos (`welcomeEmail`, `subscriptionActiveEmail`,
      `winBackEmail` — o `winBackEmail` é novo desta etapa) antes de considerar produção real.

## Custos externos envolvidos

Nenhum novo — reaproveita Resend (já no checklist do README) e Supabase. Nenhum serviço de
analytics pago foi adicionado.
