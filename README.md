# Radar Milhas & Viagens

SaaS de alertas e comparação de viagens (dinheiro vs pontos/milhas). MVP completo, buildado e
com typecheck limpo. Vendido como **clube premium de alertas de viagem com IA** — ver
`PROMPT.md` para a spec completa e a justificativa do posicionamento.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (Auth/Postgres/RLS) · Stripe ·
Resend · WhatsApp (Evolution API/Z-API, abstrato) · Vercel Cron.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as variáveis (ver checklist abaixo)
npm run dev
```

`npm run build` e `npm run typecheck` já foram validados neste MVP (33 rotas, build limpo).

## Estrutura

- `app/(auth)/*` — login, cadastro, recuperar senha
- `app/onboarding` — questionário inicial (aeroporto, destinos, programas, orçamento)
- `app/(app)/*` — dashboard, voos, hoteis, calculadora, alertas, promocoes, programas,
  consultor-ia, perfil, assinatura, admin (protegidas por `middleware.ts`)
- `app/api/webhooks/stripe` — único lugar que escreve `plan`/`status` em `subscriptions`
- `app/api/cron/*` — check-alerts (a cada hora), refresh-promotions e expire-opportunities
  (diários) — protegidas por `CRON_SECRET`, agendadas em `vercel.json`
- `lib/providers/*` — `MockFlightProvider`/`MockHotelProvider` ativos no MVP; `AmadeusProvider`,
  `DuffelProvider`, `BookingProvider` preparados (a factory em `lib/providers/index.ts` cai pro
  mock automaticamente se a env var da API paga não existir — nunca quebra por falta de
  credencial)
- `lib/scoring/opportunity-engine.ts` — motor de score 0-100 e recomendação textual
- `lib/plans.ts` — 4 planos (Free/Premium/Pro/Consultor) e seus limites
- `supabase/migrations/0001_schema.sql` — schema completo + RLS
- `supabase/seed.sql` — catálogo inicial de programas de pontos + exemplos de promoção/oportunidade

## Segurança — regra que não pode ser quebrada

`profiles.role` e `subscriptions.plan`/`status` **nunca** são editáveis pelo usuário via client.
A migration já bloqueia isso com `revoke`/`grant` de colunas específicas em `profiles` e por não
existir nenhuma policy de `insert`/`update` de usuário em `subscriptions` — só `service_role`
(webhook do Stripe) escreve nessas colunas. Não crie um formulário ou action que tente contornar
isso.

---

## Checklist manual final (o que só o Igor pode fazer)

Nada abaixo está bloqueando o código — é infraestrutura externa que exige login/pagamento real.
Ordem sugerida:

### 1. Supabase
- [ ] Criar projeto novo no Supabase
- [ ] Rodar `supabase/migrations/0001_schema.sql` (SQL Editor ou `supabase db push`)
- [ ] Rodar `supabase/seed.sql` depois da migration
- [ ] Copiar `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` pro `.env.local`
- [ ] Habilitar login com Google em Authentication → Providers (Client ID/Secret do Google Cloud Console)
- [ ] Configurar Redirect URL: `https://<seu-domínio>/auth/callback`
- [ ] Testar RLS: criar 2 usuários de teste e confirmar que um não vê alertas/buscas do outro
- [ ] Promover manualmente o 1º usuário admin: `update profiles set role='admin' where user_id='<uuid>';` direto no SQL Editor (só assim, nunca via app)

### 2. Stripe
- [ ] Criar conta/produto no Stripe, criar 3 Prices recorrentes (Premium R$29,90, Pro R$79,90, Consultor R$199)
- [ ] Preencher `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PREMIUM`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_CONSULTOR`
- [ ] Criar webhook apontando para `https://<seu-domínio>/api/webhooks/stripe`, eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] Copiar `STRIPE_WEBHOOK_SECRET`
- [ ] Ativar o Billing Portal do Stripe (Settings → Billing → Customer portal)
- [ ] Testar uma assinatura ponta a ponta em modo teste

### 3. Resend (e-mail)
- [ ] Criar conta, verificar domínio de envio
- [ ] Preencher `RESEND_API_KEY` e `RESEND_FROM_EMAIL`

### 4. WhatsApp (Evolution API ou Z-API — escolher um)
- [ ] Subir instância Evolution API (ou criar conta Z-API)
- [ ] Preencher `EVOLUTION_API_URL`/`EVOLUTION_API_KEY`/`EVOLUTION_INSTANCE` (ou `ZAPI_INSTANCE_ID`/`ZAPI_TOKEN`)
- [ ] Definir `WHATSAPP_PROVIDER` (`evolution` ou `zapi`)
- [ ] Testar envio manual antes de confiar no cron

### 5. IA consultora
- [ ] Preencher `ANTHROPIC_API_KEY` (sem isso, o consultor usa um fallback de regras simples, não quebra)

### 6. APIs de voo/hotel (fora do MVP, opcional)
- [ ] Solicitar acesso Amadeus for Developers, preencher `AMADEUS_CLIENT_ID`/`AMADEUS_CLIENT_SECRET`
- [ ] Solicitar acesso Duffel, preencher `DUFFEL_ACCESS_TOKEN`
- [ ] Solicitar Booking.com Affiliate/Demand API, preencher `BOOKING_API_KEY`
- [ ] Implementar de fato as chamadas em `lib/providers/amadeus-provider.ts` / `duffel-provider.ts` / `booking-provider.ts` (hoje são stubs que caem no mock)

### 7. Domínio e deploy
- [ ] Deploy na Vercel (importar o repo)
- [ ] Configurar domínio próprio
- [ ] Preencher `NEXT_PUBLIC_APP_URL` com a URL final
- [ ] Preencher `CRON_SECRET` (qualquer string aleatória forte) e confirmar que os 3 cron jobs do `vercel.json` estão rodando (aba Cron Jobs do projeto na Vercel)
- [ ] Conferir todas as env vars acima também na Vercel (não só no `.env.local`)

### 8. Testes finais ponta a ponta
- [ ] Cadastro → onboarding → dashboard
- [ ] Busca de voo e de hotel (mock) gerando resultados com score/recomendação
- [ ] Criar alerta, forçar `npm run` local do cron (ou aguardar) e confirmar notificação
- [ ] Assinar um plano pago em modo teste do Stripe e confirmar que `subscriptions.plan` mudou
- [ ] Acessar `/admin` com o usuário promovido e cadastrar uma promoção/programa/oportunidade manual
