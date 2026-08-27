# PRODUCTION_CONFIG_MATRIX.md — Radar Milhas & Viagens

Inventário completo de toda variável de ambiente que o código realmente lê (auditoria de
26/08/2026, via grep de `process.env.`/`NEXT_PUBLIC_` em todo `app/`/`lib/`/`components/`,
cruzado com `.env.example`). Nenhum valor real aparece aqui — só nomes e status.

**Nota sobre verificação**: não existe ferramenta MCP para listar as variáveis realmente
configuradas na Vercel (fato já confirmado em sessões anteriores) — a coluna "Status" abaixo é
inferida a partir de `get_runtime_errors` (evidência real de comportamento em produção), não de
uma leitura direta do painel. Onde não há evidência de log, está marcado `UNVERIFIED`.

## Supabase (obrigatório)

| Variável | Obrigatória | Ambiente | Status | Ação |
|---|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Sim | production | ✅ Confirmado funcionando (login/cadastro retornam 200 agora) | Nenhuma |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Sim | production | ✅ Confirmado funcionando | Nenhuma |
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | production | ✅ **Confirmado funcionando (27/08, mesmo dia)** — estava ausente (achado ao vivo, quebrou `/contato` real quando testado), Igor preencheu na Vercel com a chave `service_role` (aba "Legacy anon, service_role API keys" do Supabase — sistema de chaves novo do Supabase usa outro formato). Reconfirmado ao vivo depois: `createAdminClient()` funciona, `/contato` real retornou sucesso, `get_runtime_errors` limpo. | Nenhuma |

## Stripe (obrigatório pra monetização)

**Stripe Mode**: LIVE (chave de produção configurada na Vercel — não confirmável por leitura
direta).

**Atualizado 27/08 (validação final)**: Igor corrigiu manualmente os 6 Price IDs e o
`STRIPE_WEBHOOK_SECRET` no Stripe Dashboard real + Vercel, redeploy confirmado `READY` (commit
`5071f0d`), e **testou pessoalmente os 6 checkouts em produção** — todos abriram o Stripe
Checkout corretamente (nenhum pagamento concluído). `get_runtime_errors` confirma nenhum erro
novo de Stripe nas 2h seguintes. Causa raiz (Price IDs de conta/escopo errado) resolvida.

| Variável | Obrigatória | Ambiente | Status | Ação |
|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | Sim | production | CONFIGURED | Nenhuma |
| `STRIPE_WEBHOOK_SECRET` | Sim | production | CONFIGURED — código verificado correto; falta só o teste operacional de 1 evento real (opcional, não bloqueia) | Stripe Dashboard → Webhooks → "Send test webhook" |
| `STRIPE_PRICE_PREMIUM` | Sim | production | ✅ **PASS** — testado em produção, Stripe Checkout abriu corretamente | Nenhuma |
| `STRIPE_PRICE_PREMIUM_ANNUAL` | Sim | production | ✅ **PASS** — testado em produção | Nenhuma |
| `STRIPE_PRICE_PRO` | Sim | production | ✅ **PASS** — testado em produção | Nenhuma |
| `STRIPE_PRICE_PRO_ANNUAL` | Sim | production | ✅ **PASS** — testado em produção | Nenhuma |
| `STRIPE_PRICE_CONSULTOR` | Sim | production | ✅ **PASS** — testado em produção | Nenhuma |
| `STRIPE_PRICE_CONSULTOR_ANNUAL` | Sim | production | ✅ **PASS** — testado em produção | Nenhuma |
| **Checkout Session (criação)** | — | — | ✅ **PASS** (validado manualmente pelo Igor, 6/6 planos) | Nenhuma |
| **Production Checkout redirect** | — | — | ✅ **PASS** | Nenhuma |
| **Price livemode** | — | — | Inferido `true` pelo comportamento real (checkout abriu de verdade em produção) — não lido diretamente | — |

## IA (opcional, zero-custo por padrão)

| Variável | Obrigatória | Ambiente | Status | Ação |
|---|---|---|---|---|
| `AI_PROVIDER` | Não | qualquer | Sem valor = seguro (`none` a menos que Groq esteja configurada) | Nenhuma ação necessária |
| `GROQ_API_KEY` / `GROQ_MODEL` | Não | qualquer | Não configuradas — Trip Builder/Concierge rodam só em fallback | Preencher se quiser IA de graça (ver MANUAL_ACTIONS.md) |
| `ANTHROPIC_API_KEY` | Não | local (`.env.local`) | Configurada localmente (Consultor IA) — não usada por padrão em Trip Builder/Concierge desde a correção desta sessão | Nenhuma ação obrigatória |

## Cron / operacional

| Variável | Obrigatória | Ambiente | Status | Ação |
|---|---|---|---|---|
| `CRON_SECRET` | Sim (senão os 4 crons diários nunca rodam) | production | UNVERIFIED — nenhum log de "unauthorized" nos cron routes nos últimos 7 dias, o que é consistente com estar configurado corretamente (silêncio nem sempre prova sucesso, mas ausência de rejeição é um bom sinal) | Confirmar no painel da Vercel que está setada |

## E-mail / notificações (opcional, degrada bem sem)

| Variável | Obrigatória | Status |
|---|---|---|
| `RESEND_API_KEY` | Não | UNVERIFIED — histórico de sessões anteriores registra que o mailer padrão do Supabase (usado enquanto não há SMTP próprio) tem rate limit baixo; log real mostra 2 ocorrências de `email rate limit exceeded`/"only request after 12 seconds" em 26/08, ambas em contas de teste QA |
| `RESEND_FROM_EMAIL` | Não | Tem fallback hardcoded |
| `OPS_ALERT_EMAIL` | Não | Opcional, degrada com `console.warn` |
| `N8N_ALERT_WEBHOOK_URL`/`_SECRET` | Não | Opcional, degrada com log |
| `EVOLUTION_API_URL`/`_API_KEY`/`_INSTANCE` ou `ZAPI_*` | Não | Opcional, degrada com `{status:'skipped'}` |

## Analytics/Ads (100% opcional)

`NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GOOGLE_ADS_ID`, `NEXT_PUBLIC_META_PIXEL_ID`,
`NEXT_PUBLIC_TWITTER_PIXEL_ID` (+ 3 event IDs), `NEXT_PUBLIC_TIKTOK_PIXEL_ID`,
`NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER`, `NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE` — todas
com truthy-check antes de renderizar, nenhuma quebra o app se ausente.

## Fora do MVP (deixar vazio de propósito)

`AMADEUS_CLIENT_ID`/`_SECRET`, `SKYSCANNER_API_KEY` (declarada mas nunca lida — código morto),
`DUFFEL_ACCESS_TOKEN`, `BOOKING_API_KEY`, `OPENAI_API_KEY` (declarada mas nunca lida — código
morto).

## Auto-injetadas pela Vercel (não declarar)

`VERCEL_PROJECT_PRODUCTION_URL`, `VERCEL_URL` — usadas por `lib/site-url.ts`, nunca devem entrar
em `.env.example`/`.env.local`.

## Deploy (confirmado via API da Vercel)

- Projeto: `radar-milhas-viagens` (`prj_SdMiQ8wja88oCPNrJCvGGnIe7MH1`), team `ibcorrea's
  projects` (Hobby).
- Domínio: `radar-milhas-viagens.vercel.app` (sem domínio próprio ainda).
- Deploy automático via GitHub a cada push em `master` — confirmado: todos os commits desta
  sessão já geraram deployment `READY` em produção.
- Sem proteção de deployment (password/SSO/IP) — site público, como esperado para produção real.
