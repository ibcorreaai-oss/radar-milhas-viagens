# Radar Milhas & Viagens

SaaS de alertas e comparação de viagens (dinheiro vs pontos/milhas), evoluindo para uma
plataforma de inteligência de oportunidades de viagem (Discover → Optimize → Plan →
Book). MVP original completo, buildado e com typecheck limpo. Vendido como **clube
premium de alertas de viagem com IA**.

**Comece por `SYSTEM_ARCHITECTURE.md`** — referência única de arquitetura geral (modelo de
dados, papéis, integrações, auth, storage, logs, backup, monitoramento, escalabilidade), com
link pro documento certo pra cada assunto. Nenhuma funcionalidade nova deve ser criada sem
checar esse documento primeiro.

**Se for retomar o projeto depois de um tempo parado, comece por `MANUAL_ACTIONS.md`** — é o
único documento que lista, por etapa, tudo que ainda depende de uma ação sua (chave de API,
decisão de produto, configuração de dashboard) organizado em BLOCKERS/IMPORTANT/OPTIONAL/DONE.
`PRODUCTION_READINESS_REPORT.md` + `LAUNCH_CHECKLIST.md` têm o resultado da auditoria de
produção mais recente (decisão GO/NO-GO com evidência).

Os demais documentos, por assunto (ordem aproximada de quando cada um foi escrito):

- `PROMPT.md` — spec original do MVP · `VISION_MASTER.md` — norte de longo prazo, referência de UX
- `REQUIREMENTS.md` — requisitos funcionais/não funcionais · `SCREENS.md` — inventário de telas
- `SCORING.md` — lógica de pontuação/ranking de oportunidades · `EXISTING_FEATURES.md` — o que já existia antes de cada etapa nova
- `AUDIT_REPORT.md` — baseline pré-etapa-3.0 (23/08) · `ARCHITECTURE.md` + `IMPLEMENTATION_PLAN.md` — evolução 3.0 (World Experience Radar, Bucket List)
- `OBSERVABILITY.md` — logs, auditoria, uptime, alertas críticos · `PERFORMANCE.md` — consultas, cache, imagens, Core Web Vitals
- `DATA_QUALITY.md` — validação Zod, deduplicação, integridade referencial · `DISASTER_RECOVERY.md` — backup/restore, rollback, recuperação de exclusão acidental
- `GROWTH.md` — ativação, retenção, conversão, `/admin/metricas` · `ENGAGEMENT_UX.md` — progresso, microvitórias, feedback imediato, conquistas opcionais
- `SEO_GEO.md` — SEO, Open Graph, GEO/IA generativa · `AUTOMATIONS.md` — n8n, alerta crítico → Telegram
- `AUTH_AND_ADMIN.md` — Stack Auth × Supabase Auth × OTP, roles · `PLATFORM_ADMIN.md` — painel `/admin` completo
- `MONETIZATION.md` — planos, trial, gate de acesso, regras de negócio Stripe · `TRAINING.md` — Central de Treinamentos / Mini LMS
- `SECURITY_REPORT.md` — visão consolidada "estamos seguros pra estar no ar?" (não substitui `AUTH_AND_ADMIN.md`/`PLATFORM_ADMIN.md`/`MONETIZATION.md`, que têm o detalhe de cada subsistema)
- `POST_DEPLOY_AUDIT.md` — auditoria completa pós-deploy (ETAPA 20, 26/08) · `WORLD_EXPERIENCE_RADAR_FINAL_REPORT.md` — implementação das Fases 3-11
- `PRODUCTION_CONFIG_MATRIX.md` — toda variável de ambiente, valor esperado e onde configurar

Documento novo desta rodada: `CODEBASE_REVIEW_FINAL.md` (revisão geral pré-pausa do projeto,
27/08 — bugs corrigidos, decisões de organização, estado final antes de o Igor desligar).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (Auth/Postgres/RLS) · Stripe ·
Resend · WhatsApp (Evolution API/Z-API, abstrato) · Vercel Cron · n8n (alerta crítico → Telegram,
ver `AUTOMATIONS.md`).

## Versionamento (GitHub)

Repositório: [`ibcorreaai-oss/radar-milhas-viagens`](https://github.com/ibcorreaai-oss/radar-milhas-viagens)
— **privado**, criado em 25/08/2026 (ETAPA 10). Fluxo adotado a partir daqui:

- Toda funcionalidade nova ou correção de bug entra numa branch (`feature/*`/`fix/*`), com
  merge pra `master` só depois de typecheck + build limpos e teste real no navegador.
- Todo commit em `master` é enviado ao GitHub automaticamente (push normal — nunca
  `--force`, nunca reescreve histórico já publicado).
- Nenhuma chave/variável de ambiente é commitada — `.env.local`/`.env*.local` seguem no
  `.gitignore`; só `.env.example` (com placeholders vazios) vai pro repositório. Ver a
  checklist de contas externas abaixo.

## Rodando localmente

```bash
npm install
cp .env.example .env.local   # preencha as variáveis (ver checklist abaixo)
npm run dev
```

`npm run build`, `npm run typecheck` e `npm run lint` (ESLint configurado 27/08) sempre limpos —
84 rotas geradas no build mais recente. `npm run test:smoke` roda a suíte Playwright (14 testes)
contra produção real por padrão (ver `playwright.config.ts` pra rodar contra local).

## Estrutura

- `app/(auth)/*` — login, cadastro, recuperar senha
- `app/onboarding` — questionário inicial (aeroporto, destinos, programas, orçamento)
- `app/(app)/*` — dashboard, voos, hoteis, calculadora, alertas, promocoes, programas,
  consultor-ia, perfil, assinatura, admin (protegidas por `middleware.ts`)
- `app/(app)/descobrir` — **World Experience Radar** (Discover): eventos/festivais/
  esportes/sazonalidade com Experience Score explicável — atrás da feature flag
  `worldRadar`, pública (mesmo padrão de `/promocoes`: RLS exige usuário autenticado)
- `app/(app)/bucket-list` — lista de desejos monitorada, atrás da feature flag
  `bucketList`, protegida por login
- `app/(app)/admin/eventos` — CRUD de eventos do World Radar (mesmo padrão dos outros
  admin CRUDs)
- `app/api/webhooks/stripe` — único lugar que escreve `plan`/`status` em `subscriptions`
- `app/api/cron/*` — check-alerts, refresh-promotions, expire-opportunities e check-trials,
  todos 1x/dia (limite do plano Hobby da Vercel — ver `MANUAL_ACTIONS.md`) — protegidas por
  `CRON_SECRET`, agendadas em `vercel.json`
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

## Contas externas necessárias (visão rápida)

Toda integração deste projeto — os passos detalhados de cada uma estão na checklist logo
abaixo, esta tabela é só o resumo de "o que existe e por quê":

| Serviço | Para quê | Custo | Obrigatório pro MVP? |
|---|---|---|---|
| GitHub | Versionamento (privado) | Grátis | ✅ já configurado |
| Supabase | Banco, Auth, RLS | Grátis pra começar; Pro (US$25/mês) quando precisar de PITR (`DISASTER_RECOVERY.md`) | ✅ sim |
| Vercel | Deploy, Cron, Speed Insights | Grátis (Hobby) | ✅ sim |
| Stripe | Cobrança das assinaturas | % por transação, sem mensalidade | ✅ sim (pra planos pagos) |
| Resend | E-mail transacional | Grátis até um volume baixo | ✅ sim (alertas, welcome, etc.) |
| Evolution API / Z-API | WhatsApp | Depende do provider escolhido | Opcional — canal WhatsApp fica indisponível sem isso, resto do app funciona |
| Anthropic/OpenAI | Consultor IA | Por uso (tokens) | Opcional — fallback sem IA já existe |
| UptimeRobot/Better Uptime/Freshping | Monitorar `/api/health` | Grátis nos planos básicos | Recomendado, não bloqueia nada |
| Amadeus/Duffel/Booking | Dados reais de voo/hotel | Varia por parceiro | Fora do MVP — mock ativo até essa decisão |

## Checklist manual final (o que só o Igor pode fazer)

Nada abaixo está bloqueando o código — é infraestrutura externa que exige login/pagamento real.
Ordem sugerida:

### 1. Supabase
- [x] Projeto criado (ETAPA 12, 25/08) — `radar-milhas-viagens`, org Cortex Tech, região
      `sa-east-1`, ref `gvncsfkypxcgfmifjqzh`. **Custa US$ 10/mês** (confirmado com o Igor
      antes de criar — a org já tinha 13 outros projetos, não é mais o tier gratuito).
- [x] Migrations `0001` a `0007` aplicadas direto no projeto real (schema completo + World
      Radar + `contact_messages` + hardening do Security Advisor — ver `get_advisors`).
- [x] `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` já estão no `.env.local`
      local (o anon key não é segredo, pode ser copiado por ferramenta automática).
- [ ] `SUPABASE_SERVICE_ROLE_KEY` continua vazio no `.env.local` — por segurança, nenhuma
      ferramenta automática busca esse valor. Copiar manualmente em
      https://supabase.com/dashboard/project/gvncsfkypxcgfmifjqzh/settings/api-keys e colar
      no `.env.local` (e depois na Vercel também, quando o deploy existir — ver item 7).
- [ ] Rodar `supabase/seed.sql` e depois `supabase/seed_world_radar.sql` — ainda não
      rodados no projeto novo. Ver `MANUAL_ACTIONS.md` antes de expor a usuários reais
      (eventos de exemplo são `is_mock=true`)
- [ ] Habilitar login com Google em Authentication → Providers (Client ID/Secret do Google Cloud Console)
- [ ] Configurar Redirect URL: `https://<seu-domínio>/auth/callback`
- [ ] Testar RLS: criar 2 usuários de teste e confirmar que um não vê alertas/buscas do outro
- [ ] Promover manualmente o 1º usuário admin: `update profiles set role='admin' where user_id='<uuid>';` direto no SQL Editor (só assim, nunca via app)
- [ ] **ETAPA 15**: promover o Administrador Principal — criar a conta em `/cadastro` com
      `ibcorrea@hotmail.com` e depois rodar `update profiles set role='super_admin' where
      email='ibcorrea@hotmail.com';` no SQL Editor. A migration `0011_super_admin_rbac.sql` já
      tenta fazer isso sozinha (idempotente), mas só surte efeito se a conta já existir na hora em
      que a migration roda — ver `PLATFORM_ADMIN.md`.
- [ ] (Opcional, não bloqueia nada) `get_advisors` de performance apontou ~20 policies de RLS
      que re-avaliam `auth.uid()`/`is_admin()` por linha em vez de `(select auth.uid())` —
      otimização de escala, pré-existente desde a ETAPA 1, fora do escopo da ETAPA 12. Revisar
      numa etapa dedicada se o volume de dados crescer.

### 2. Stripe (ver `MONETIZATION.md` para as regras de negócio completas — ETAPA 16)
- [x] Conta Stripe já conectada (modo Teste, `livemode:false`) — a mesma conta que você já usa
      pra outros apps (ErgoFácil, Perícia Médica Pro etc.)
- [x] Criados os 3 produtos com 2 Prices cada (mensal + anual) via API em modo Teste: Premium
      (R$29,90/mês · R$299/ano), Pro (R$79,90/mês · R$799/ano), Consultor (R$199/mês ·
      R$1.990/ano) — valores de exemplo, ver `MONETIZATION.md` #3 pra ajustar. Cada preço virou
      um produto próprio (`Radar Milhas & Viagens — <plano>` e `— <plano> (anual)`), marcado
      `metadata.app='radar_milhas'` pra não confundir com os produtos dos outros apps na mesma
      conta.
- [x] Preenchidos os 6 Price IDs em `.env.local` (`STRIPE_PRICE_PREMIUM`,
      `STRIPE_PRICE_PREMIUM_ANNUAL`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_PRO_ANNUAL`,
      `STRIPE_PRICE_CONSULTOR`, `STRIPE_PRICE_CONSULTOR_ANNUAL`)
- [x] Validado ao vivo, via API, contra a Stripe de teste real: criei uma assinatura de teste no
      Price Premium mensal (`trial_period_days`, sem precisar de cartão) e confirmei
      `status='trialing'`, depois cancelei e confirmei `status='canceled'` — prova que os Price
      IDs acima funcionam de verdade pra criar/cancelar assinatura. Cliente de teste
      (`cus_V91lhjp4AllO6o`, metadata `purpose='teste_automatizado_etapa16'`) ficou no Dashboard,
      sem custo — pode apagar quando quiser.
- [ ] **Ainda falta**: `STRIPE_SECRET_KEY` (chave secreta do modo Teste) — a integração usada
      acima roda com uma chave restrita (sem permissão de conta/preço avulso/cartão), então não
      dá pra extrair ou gerar essa chave por ela; precisa copiar em Developers → API keys →
      "Reveal test key" e colar em `.env.local`. Sem isso, o Checkout do próprio app
      (`app/(app)/assinatura/actions.ts`) não roda.
- [ ] Criar webhook apontando para `https://<seu-domínio>/api/webhooks/stripe`, eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` — só depois de ter um domínio real (Stripe não alcança `localhost`), copiar `STRIPE_WEBHOOK_SECRET`
- [ ] Ativar o Billing Portal do Stripe (Settings → Billing → Customer portal) e habilitar a opção "Update subscription" (permitir trocar de plano) apontando pros 6 Prices pagos — o app manda quem já assina pro Billing Portal em vez de abrir um Checkout novo, justamente pra nunca criar uma segunda assinatura cobrando em paralelo
- [ ] Depois de preencher `STRIPE_SECRET_KEY`: testar uma assinatura ponta a ponta pelo próprio
      Checkout do app com cartão de teste (aprovação/recusa — cartões em `MONETIZATION.md` #6);
      a criação/cancelamento direto na Stripe já foi validada acima, isso testa o Checkout em si
- [ ] Preencher `SUPABASE_SERVICE_ROLE_KEY` (item 1 acima) — sem ele o webhook da Stripe não
      consegue gravar `plan`/`status` em `subscriptions`, mesmo com tudo acima configurado certo

### 3. Resend (e-mail)
- [ ] Criar conta, verificar domínio de envio
- [ ] Preencher `RESEND_API_KEY` e `RESEND_FROM_EMAIL`
- [ ] Preencher `OPS_ALERT_EMAIL` (ver `OBSERVABILITY.md`) — sem isso, alertas críticos
      (falha de pagamento, falha de autenticação sistêmica, erro não tratado) só ficam no log,
      sem e-mail

### 4. n8n — alerta crítico → Telegram (ver `AUTOMATIONS.md` — ETAPA 17)
- [x] Workflow criado, ativado e testado ao vivo (`Radar Milhas & Viagens — Alerta Operacional →
      Telegram`, instância `webhook.cortexbot.xyz`) — nada pendente aqui, `N8N_ALERT_WEBHOOK_URL`
      e `N8N_ALERT_WEBHOOK_SECRET` já preenchidos em `.env.local`
- [ ] (Opcional) Ler `AUTOMATIONS.md` §6 — 3 propostas de automação adicional (resumo diário,
      ponte WhatsApp, crons via n8n) que ainda dependem de você decidir se quer

### 5. WhatsApp (Evolution API ou Z-API — escolher um)
- [ ] Subir instância Evolution API (ou criar conta Z-API)
- [ ] Preencher `EVOLUTION_API_URL`/`EVOLUTION_API_KEY`/`EVOLUTION_INSTANCE` (ou `ZAPI_INSTANCE_ID`/`ZAPI_TOKEN`)
- [ ] Definir `WHATSAPP_PROVIDER` (`evolution` ou `zapi`)
- [ ] Testar envio manual antes de confiar no cron

### 6. IA consultora
- [ ] Preencher `ANTHROPIC_API_KEY` (sem isso, o consultor usa um fallback de regras simples, não quebra)

### 7. APIs de voo/hotel (fora do MVP, opcional)
- [x] **Voo real implementado de verdade — SerpApi Google Flights (28/08/2026).**
      Diferente de Amadeus/Duffel/Booking abaixo (que continuam stubs), este está
      implementado e funcionando: `lib/providers/serpapi-flight-provider.ts`, plano Free da
      SerpApi (250 buscas/mês, sem cartão), fallback automático pro mock em qualquer
      erro/estouro de cota (nunca quebra a busca). Cota mensal com guarda própria via RPC
      atômica `increment_provider_usage` (migrations `0043`/`0044`) — teto de 200/mês pra
      busca interativa + 30/mês reservados só pro cron de alertas (buckets separados, pra
      um não roubar cota do outro), total 230, sempre com folga do limite real de 250.
  - [x] **`SERPAPI_KEY` configurada e validada ao vivo em produção (28/08/2026)** — conta
        `ibcorrea.ai@gmail.com` na SerpApi, e-mail+telefone verificados, chave colada na Vercel
        (Production) e confirmada com busca real (GRU→GIG, badge "Preço real de mercado"
        aparecendo de verdade, `get_runtime_logs` sem warning de fallback).
  - [ ] `SERPAPI_MONTHLY_CAP` é opcional (default 200 se vazio; só afeta o bucket interativo).
  - [x] **Ida-e-volta também usa dado real (28/08/2026)** — fluxo oficial de 2 passos da
        Google Flights API (`departure_token`): 1ª busca traz as opções de ida mais baratas,
        2ª busca (só pra 1 candidata — `MAX_ROUND_TRIP_CANDIDATES=1`, ver comentário em
        `serpapi-flight-provider.ts` sobre o teto de 10s de função do plano Hobby da Vercel)
        traz a volta + preço combinado real. Custa até 1+1=2 buscas da cota por pesquisa
        ida-e-volta (vs 1 pra ida simples) — mostra no máximo 1 card com preço real por
        busca (a UI avisa isso quando é ida-e-volta). Sempre com fallback pro mock em
        qualquer falha/estouro de cota. Schema (`flight_results`) ganhou colunas de perna de
        volta (migrations `0045`/`0046`, com CHECK de sanidade volta-depois-da-ida).
- [ ] Solicitar acesso Amadeus for Developers, preencher `AMADEUS_CLIENT_ID`/`AMADEUS_CLIENT_SECRET`
- [ ] Solicitar acesso Duffel, preencher `DUFFEL_ACCESS_TOKEN`
- [ ] Solicitar Booking.com Affiliate/Demand API, preencher `BOOKING_API_KEY`
- [ ] Implementar de fato as chamadas em `lib/providers/amadeus-provider.ts` / `duffel-provider.ts` / `booking-provider.ts` (hoje são stubs que caem no mock)

### 8. Domínio e deploy (ETAPA 19 — 26/08/2026)
- [x] Projeto Vercel criado e ligado ao repositório GitHub
      `ibcorreaai-oss/radar-milhas-viagens` (`radar-milhas-viagens`, time `ibcorreas-projects`,
      plano Hobby) — todo push em `master` já dispara deploy automático de produção.
- [ ] **Env vars ainda precisam ser coladas no dashboard da Vercel** (Project → Settings →
      Environment Variables) — nada disso foi feito automaticamente, o `.env.local` só existe
      nesta máquina. Sem isso, o site sobe (build passa mesmo sem credencial — arquitetura já
      tolera isso) mas com Supabase/Stripe/e-mail/IA todos desligados. Cole pelo menos:
      `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
      `STRIPE_SECRET_KEY` + os 6 `STRIPE_PRICE_*` (já tem valor real em `.env.local`),
      `N8N_ALERT_WEBHOOK_URL`/`N8N_ALERT_WEBHOOK_SECRET` (idem), `CRON_SECRET` (gerar novo,
      string aleatória forte), `NEXT_PUBLIC_APP_URL` (a URL da Vercel por enquanto, trocar
      quando o domínio próprio existir).
- [x] Confirmado ao vivo: o plano Hobby só permite cron **1x/dia** — `check-alerts` era de hora
      em hora, bloqueou o primeiro deploy ("Hobby accounts are limited to daily cron jobs"),
      corrigido pra rodar às 09h. Se quiser alertas mais frequentes que 1x/dia, precisa upgrade
      pra Vercel Pro (decisão de custo sua) — sem isso, ficam 1x/dia mesmo, funcional mas menos
      em tempo real do que o produto originalmente prometia.
- [ ] Comprar e configurar domínio próprio (seu passo, depois disso eu aponto o domínio no
      projeto da Vercel) — **HTTPS vem de graça**: a Vercel emite certificado SSL automático
      pra qualquer domínio (próprio ou `.vercel.app`), não precisa configurar nada à parte.
- [ ] Depois do domínio: atualizar `NEXT_PUBLIC_APP_URL` na Vercel pra URL final, e só aí criar
      o webhook da Stripe (`STRIPE_WEBHOOK_SECRET`) — a Stripe precisa de uma URL pública de
      verdade pra entregar o webhook, não alcança `.vercel.app` de preview nem `localhost`.
- [ ] Conferir todas as env vars acima também na Vercel (não só no `.env.local`)
- [ ] Apontar um serviço de uptime gratuito (UptimeRobot, Better Uptime, Freshping) para
      `/api/health` — ver `OBSERVABILITY.md`
- [ ] Habilitar o Vercel Speed Insights (gratuito no plano Hobby) para medir Core Web Vitals
      de campo com tráfego real — ver `PERFORMANCE.md`
- [ ] (Opcional, achado em auditoria pré-deploy) Supabase → Authentication → Policies → ativar
      "Leaked password protection" (gratuito, checa senha vazada contra HaveIBeenPwned) — não
      dá pra ligar por SQL/migration, é config do serviço de Auth.

### 9. Testes finais ponta a ponta
- [ ] Cadastro → onboarding → dashboard
- [ ] Busca de voo e de hotel (mock) gerando resultados com score/recomendação
- [ ] Criar alerta, forçar `npm run` local do cron (ou aguardar) e confirmar notificação
- [ ] Assinar um plano pago em modo teste do Stripe e confirmar que `subscriptions.plan` mudou
- [ ] Acessar `/admin` com o usuário promovido e cadastrar uma promoção/programa/oportunidade manual
- [ ] ETAPA 16 — expirar manualmente o `trial_ends_at` de um usuário de teste (SQL) e confirmar
      que ele é redirecionado pra `/assinatura?trial_expirado=1` ao tentar acessar `/dashboard`,
      mas continua acessando `/perfil` e `/assinatura` normalmente
- [ ] ETAPA 16 — cancelar a assinatura de teste no Billing Portal e confirmar que o acesso volta a
      ser bloqueado (a não ser que o trial dos 5 dias ainda esteja rodando)
