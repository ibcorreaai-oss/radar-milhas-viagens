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
| `SUPABASE_SERVICE_ROLE_KEY` | Sim | production | ✅ Confirmado (webhook Stripe grava `subscriptions` via admin client) | Nenhuma |

## Stripe (obrigatório pra monetização)

| Variável | Obrigatória | Ambiente | Status | Ação |
|---|---|---|---|---|
| `STRIPE_SECRET_KEY` | Sim | production | ⚠️ Configurada, mas aponta pra uma conta/escopo com Price IDs que não batem (ver abaixo) | Confirmar que é a chave da conta REAL do Igor (não a do MCP) |
| `STRIPE_WEBHOOK_SECRET` | Sim | production | ⚠️ Log real mostra "ausente" até ~20:37 UTC, depois "assinatura inválida" 1x às 22:38 UTC — histórico misto, estado atual não confirmável sem novo teste | Reenviar um evento de teste real do Stripe Dashboard e conferir 200 |
| `STRIPE_PRICE_PREMIUM` / `_PRO` / `_CONSULTOR` | Sim (pelo menos 1) | production | 🔴 **BLOCKER confirmado**: log real de produção (23:38 UTC, poucas horas atrás) mostra `Error: No such price: 'price_1U8jeSFbJuUYebOzjb7TReB3'` — usuário de teste tentou assinar e recebeu 400 | Recriar/confirmar o Price ID certo no Stripe Dashboard real e colar o valor correto na env var correspondente na Vercel |
| `STRIPE_PRICE_*_ANNUAL` (3) | Não (opcional) | production | UNVERIFIED | Preencher se quiser oferecer anual |

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
