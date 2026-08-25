# Radar Milhas & Viagens

SaaS de alertas e comparação de viagens (dinheiro vs pontos/milhas), evoluindo para uma
plataforma de inteligência de oportunidades de viagem (Discover → Optimize → Plan →
Book). MVP original completo, buildado e com typecheck limpo. Vendido como **clube
premium de alertas de viagem com IA**.

**Comece por `SYSTEM_ARCHITECTURE.md`** — referência única de arquitetura geral (modelo de
dados, papéis, integrações, auth, storage, logs, backup, monitoramento, escalabilidade), com
link pro documento certo pra cada assunto. Nenhuma funcionalidade nova deve ser criada sem
checar esse documento primeiro. Os demais, por assunto: `PROMPT.md` (spec original do MVP),
`VISION_MASTER.md` (norte de longo prazo, referência de UX), `ARCHITECTURE.md` +
`IMPLEMENTATION_PLAN.md` (evolução 3.0 — World Experience Radar, Bucket List),
`DISASTER_RECOVERY.md` (backup/restore, rollback, recuperação de exclusão acidental),
`OBSERVABILITY.md` (logs, auditoria, uptime, alertas críticos), `PERFORMANCE.md` (consultas,
cache, imagens, Core Web Vitals), `DATA_QUALITY.md` (validação Zod, deduplicação, integridade
referencial), `GROWTH.md` (ativação, retenção, conversão, `/admin/metricas`),
`ENGAGEMENT_UX.md` (progresso, microvitórias, feedback imediato, conquistas opcionais),
`REQUIREMENTS.md` (requisitos funcionais/não funcionais), `SCREENS.md` (inventário das 34
telas) e `SEO_GEO.md` (SEO, Open Graph, GEO/IA generativa).

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS · Supabase (Auth/Postgres/RLS) · Stripe ·
Resend · WhatsApp (Evolution API/Z-API, abstrato) · Vercel Cron.

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

`npm run build` e `npm run typecheck` já foram validados (37 rotas, build limpo, incluindo o
World Radar/Bucket List novos). `npm run lint` ainda não está configurado neste projeto
(ver `EXISTING_FEATURES.md`).

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

### 2. Stripe
- [ ] Criar conta/produto no Stripe, criar 3 Prices recorrentes (Premium R$29,90, Pro R$79,90, Consultor R$199)
- [ ] Preencher `STRIPE_SECRET_KEY`, `STRIPE_PRICE_PREMIUM`, `STRIPE_PRICE_PRO`, `STRIPE_PRICE_CONSULTOR`
- [ ] Criar webhook apontando para `https://<seu-domínio>/api/webhooks/stripe`, eventos: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] Copiar `STRIPE_WEBHOOK_SECRET`
- [ ] Ativar o Billing Portal do Stripe (Settings → Billing → Customer portal) e habilitar a opção "Update subscription" (permitir trocar de plano) apontando pros 3 Prices pagos — o app manda quem já assina pro Billing Portal em vez de abrir um Checkout novo, justamente pra nunca criar uma segunda assinatura cobrando em paralelo
- [ ] Testar uma assinatura ponta a ponta em modo teste

### 3. Resend (e-mail)
- [ ] Criar conta, verificar domínio de envio
- [ ] Preencher `RESEND_API_KEY` e `RESEND_FROM_EMAIL`
- [ ] Preencher `OPS_ALERT_EMAIL` (ver `OBSERVABILITY.md`) — sem isso, alertas críticos
      (falha de pagamento, falha de autenticação sistêmica, erro não tratado) só ficam no log,
      sem e-mail

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
- [ ] **Nenhum projeto Vercel existe ainda** (confirmado na ETAPA 12, 25/08 — só o repositório
      GitHub `ibcorreaai-oss/radar-milhas-viagens` é real; todo trabalho até aqui rodou local
      via `npm run dev`/`npm run build`). Deploy na Vercel (importar o repo)
- [ ] Configurar domínio próprio
- [ ] Preencher `NEXT_PUBLIC_APP_URL` com a URL final
- [ ] Preencher `CRON_SECRET` (qualquer string aleatória forte) e confirmar que os 3 cron jobs do `vercel.json` estão rodando (aba Cron Jobs do projeto na Vercel)
- [ ] Conferir todas as env vars acima também na Vercel (não só no `.env.local`)
- [ ] Apontar um serviço de uptime gratuito (UptimeRobot, Better Uptime, Freshping) para
      `/api/health` — ver `OBSERVABILITY.md`
- [ ] Habilitar o Vercel Speed Insights (gratuito no plano Hobby) para medir Core Web Vitals
      de campo com tráfego real — ver `PERFORMANCE.md`

### 8. Testes finais ponta a ponta
- [ ] Cadastro → onboarding → dashboard
- [ ] Busca de voo e de hotel (mock) gerando resultados com score/recomendação
- [ ] Criar alerta, forçar `npm run` local do cron (ou aguardar) e confirmar notificação
- [ ] Assinar um plano pago em modo teste do Stripe e confirmar que `subscriptions.plan` mudou
- [ ] Acessar `/admin` com o usuário promovido e cadastrar uma promoção/programa/oportunidade manual
