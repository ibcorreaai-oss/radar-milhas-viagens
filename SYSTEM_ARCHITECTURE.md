# SYSTEM_ARCHITECTURE.md — Radar Milhas & Viagens

> Referência única de arquitetura geral. Escrito em 25/08/2026 (ETAPA 9 do Igor).
>
> **Regra permanente:** nenhuma funcionalidade nova deve ser criada sem antes checar se está
> alinhada com este documento. Quando este documento e um pedido novo conflitarem, o conflito
> se resolve pela ordem de prioridade já registrada (segurança → funcionamento correto → UX →
> escalabilidade → monetização → estética → velocidade — ver `feedback_protocolo_trabalho_
> radar_milhas_viagens.md` na memória, ETAPA 8).
>
> Este documento **não duplica** o que já está detalhado em outro lugar — cada seção linka pro
> documento fonte quando ele existe, e só desenvolve por extenso o que ainda não tinha um lugar
> definitivo (principalmente §8, armazenamento de arquivos, que era uma lacuna real).

## 1. Arquitetura geral do sistema

```
Browser
  │
  ▼
Vercel Edge (middleware.ts — sessão + gate de rota protegida/admin)
  │
  ▼
Next.js 15 App Router
  ├─ Server Components (a maioria das páginas — leem direto do Supabase via RLS)
  ├─ Server Actions (forms — escrevem no Supabase, sempre validados por Zod)
  └─ Route Handlers (/api/* — webhooks Stripe, crons, health check, log de erro client)
  │
  ▼
Supabase (Postgres + Auth + RLS)
  │
  ├─ service_role (só em: webhook Stripe, crons, /admin/metricas) — bypassa RLS de propósito
  └─ anon/authenticated (todo o resto) — RLS é a fronteira real de autorização

Integrações externas: Stripe (pagamento), Resend (e-mail), Evolution/Z-API (WhatsApp,
abstrato), Anthropic/OpenAI (IA consultora, com fallback sem IA), providers de voo/hotel
(mock hoje, interface pronta pra Amadeus/Duffel/Booking).
```

Monólito modular server-first, de propósito: um único deploy Next.js, sem microsserviço
separado. Para o volume de usuários que o produto tem hoje (e vai ter nos próximos passos
razoáveis), separar em serviços adicionaria complexidade operacional sem ganho — reavaliar
só se algum componente específico (ex.: um agente de scraping pesado) precisar de runtime/
scaling diferente do resto.

## 2-3. Modelo de dados principal e entidades

Fonte de verdade: `supabase/migrations/0001_schema.sql` → `0004_data_quality_constraints.sql`
(nunca copiar o schema aqui — ele muda, este documento não deveria precisar mudar toda vez).
Visão por domínio:

| Domínio | Tabelas |
|---|---|
| Identidade | `profiles`, `auth.users` (gerenciada pelo Supabase) |
| Assinatura | `subscriptions` |
| Pontos & milhas | `loyalty_programs`, `user_loyalty_programs` |
| Busca & oportunidade | `flight_searches`, `flight_results`, `hotel_searches`, `hotel_results`, `opportunities` |
| Alertas & notificação | `alerts`, `notification_logs` |
| Promoções | `promotions` |
| World Radar (Discover) | `sources`, `destinations`, `event_categories`, `world_events`, `bucket_lists`, `bucket_list_items` |
| Config | `feature_flags` |
| Observabilidade | `audit_logs` (ETAPA 3) |

## 4. Relacionamentos entre tabelas

Todo relacionamento estruturado usa FK de verdade com `on delete cascade`/`set null`
apropriado (ver `DATA_QUALITY.md` §4 — auditado na ETAPA 6, sem lacuna encontrada). Os dois
padrões que importam entender:

- **Cadeia de busca:** `*_searches` (1) → `*_results` (N), cada resultado carrega o score já
  calculado pelo `OpportunityEngine` no momento da busca (não recalculado depois).
- **`loyalty_program` como texto, não FK**, em `hotel_results`/`flight_results`/
  `opportunities`/`alerts`/`promotions.program` — decisão deliberada (dado vem de provider
  externo ou de preenchimento livre do admin), documentada e mitigada em `DATA_QUALITY.md`
  §4 (nome único + validação contra o catálogo real onde o usuário digita).

## 5. Permissões e papéis dos usuários

**Papéis hoje:** `user` | `admin` (`profiles.role`). Dois níveis só — sem papel intermediário
(ex.: "suporte", "editor de conteúdo") porque ninguém além do Igor opera o admin ainda.

**Autorização em 3 camadas** (defesa em profundidade, nenhuma sozinha é a fronteira):
1. RLS no Postgres — a fronteira real; toda tabela sensível tem policy própria.
2. `middleware.ts` — bloqueia rota protegida/admin antes de renderizar (UX + primeira barreira).
3. `requireAdmin()`/checagem de `ctx.profile.role` na Server Action/página — cobre o caso de a
   action ser chamada direto, sem passar pela renderização da página.

`profiles.role` e `subscriptions.plan/status` **nunca** são graváveis pelo próprio usuário via
client — só `service_role` (webhook Stripe, painel admin) — regra não-negociável, já reforçada
no `README.md`.

**Decisão de produto pendente:** o plano "Consultor/Agência" (`lib/plans.ts`) descreve
"múltiplos clientes, painel de clientes" — isso implica um modelo de permissão novo (um
usuário Consultor gerenciando dados em nome de vários clientes finais) que **não está
modelado no schema hoje**. Não implementar isso de graça numa etapa futura sem antes definir:
um cliente final vira uma conta de verdade (com login próprio) ou um registro "gerenciado"
sem login? Isso muda RLS, `profiles` e a estrutura de `alerts`/`user_loyalty_programs`
inteira — é uma decisão de arquitetura que precisa do Igor antes de qualquer código.

## 6. Integrações externas

| Integração | Papel | Estado |
|---|---|---|
| Supabase | Banco, Auth, RLS | Projeto real criado (ETAPA 12), falta só `SUPABASE_SERVICE_ROLE_KEY` (ver README) |
| Stripe | Assinaturas + teste de 5 dias | Checkout/webhook/gate de acesso prontos (ETAPA 16, ver `MONETIZATION.md`), produtos/preços/chaves reais pendentes |
| Resend | E-mail transacional | Interface pronta (`lib/email/*`), conta pendente |
| Evolution API / Z-API | WhatsApp | Abstrato — `lib/whatsapp/*`, nunca trava sem credencial |
| Anthropic / OpenAI | Consultor IA | Fallback sem IA se `ANTHROPIC_API_KEY` ausente |
| Amadeus / Duffel / Booking | Voo/hotel reais | `lib/providers/*` — só stub, cai no mock sem credencial |
| n8n | Alerta crítico → Telegram | Workflow real, ativo e testado (ETAPA 17, ver `AUTOMATIONS.md`) |

Padrão obrigatório pra qualquer integração nova: nunca travar o app por falta de credencial
(sempre um fallback/mock), nunca colocar segredo no client, sempre logar via `lib/logger.ts`
categoria `integration` (ver `OBSERVABILITY.md` §6).

## 7. Estratégia de autenticação

Supabase Auth — e-mail/senha (com confirmação por e-mail opcional, configurável no projeto
Supabase) e Google OAuth, ambos passando por `/auth/callback` (PKCE). Sessão via cookie
HttpOnly gerenciado por `@supabase/ssr`, refresh automático no `middleware.ts`.
`middleware.ts` usa `getUser()` (verifica contra o servidor de auth) em vez de `getSession()`
(decodifica local) de propósito — mais lento, mais seguro (detecta sessão revogada). Ver
`PERFORMANCE.md` §"decisões deliberadas" pro raciocínio completo desse trade-off.

## 8. Estratégia de armazenamento de arquivos (lacuna real, definida nesta etapa)

**Estado atual:** o app não armazena nenhum arquivo de usuário. A única "imagem" que existe é
`world_events.cover_image_url` — uma URL externa digitada pelo admin, nunca um upload (ver
`PERFORMANCE.md` §5 e `lib/image-hosts.ts`). Não há avatar de usuário no schema
(`profiles` não tem `avatar_url`), não há upload de documento/comprovante em lugar nenhum.

**Estratégia para quando upload de arquivo for necessário** (avatar, capa de evento por
upload em vez de URL, futuro export de relatório do plano Consultor):

- **Supabase Storage**, não um serviço de storage à parte — já é a mesma conta/projeto,
  mesma cobrança, mesma superfície de auditoria/backup que o resto do banco.
- **Buckets planejados** (criar só quando a primeira feature de upload for implementada,
  não antecipadamente):
  - `avatars` — público-leitura, escrita só do dono (`storage.objects` RLS por `auth.uid()`
    no path, padrão `avatars/{user_id}/*`), limite de tamanho (ex.: 2MB) e tipo (`image/*`)
    validado no client E na policy do bucket.
  - `event-covers` — público-leitura, escrita só admin (mesmo padrão de `is_admin()` já usado
    nas outras tabelas), pra permitir upload direto em vez de só URL externa.
  - `documents` (futuro, plano Consultor) — **privado**, sem leitura pública nenhuma, URLs
    assinadas com expiração curta (`createSignedUrl`), nunca um bucket público.
- **Nunca reinventar** o que o Storage do Supabase já resolve (upload resumível, CDN,
  transformação de imagem on-the-fly) com uma solução própria.
- Ao implementar, o mesmo princípio de "nunca trava por falta de configuração" se aplica:
  se o bucket não existir ainda, a feature de upload deve degradar (ex.: esconder o botão de
  upload, não quebrar a página), igual a todo provider externo do app hoje.

## 9. Estratégia de logs e auditoria

Ver `OBSERVABILITY.md` (logs estruturados, categorias, alertas críticos) e `DATA_QUALITY.md`
§1 + `lib/audit-log.ts` (trilha de auditoria de negócio, ETAPA 3). Resumo de uma linha: logs
operacionais efêmeros no `logger.ts` (Vercel Runtime Logs), trilha de auditoria permanente em
`audit_logs` (Postgres) — os dois nunca se confundem, ver a tabela comparativa em
`OBSERVABILITY.md`.

## 10. Estratégia de backup e recuperação

Ver `DISASTER_RECOVERY.md` (ETAPA 3) — PITR do Supabase (plano Pro), dump manual, ordem de
replay de migrations, rollback de deploy via Vercel, regra de migrations sempre aditivas.

## 11. Estratégia de monitoramento

Ver `OBSERVABILITY.md` (ETAPA 4) — `/api/health` pra uptime externo, logs estruturados
categorizados, alerta crítico por e-mail (`notifyOps`) pra falha de pagamento/autenticação/erro
não tratado.

## 12. Estratégia de escalabilidade futura

Ver `PERFORMANCE.md` (ETAPA 5) pro estado atual (cache por requisição, queries enxutas,
streaming). Além disso, especificamente sobre **crescer para milhares de usuários simultâneos
e milhões de registros**:

- **Compute:** Vercel Functions escalam horizontalmente sozinhas (serverless) — não é um
  gargalo até volume bem alto. Nenhuma ação necessária hoje.
- **Banco:** Supabase usa PgBouncer (connection pooling) por padrão nos planos pagos — crítico
  pra não esgotar conexões com muitas Functions simultâneas. **Ação futura:** confirmar que a
  string de conexão usada em produção é a do pooler (porta 6543), não a direta (5432), quando o
  volume justificar — hoje, com um Supabase ainda nem criado, não há nada a configurar.
  Read replica é a próxima alavanca depois disso, só se leitura virar gargalo de verdade.
- **Milhões de registros:** as tabelas que crescem sem limite natural são `flight_results`/
  `hotel_results`/`notification_logs`/`audit_logs` (uma linha por busca/notificação/ação).
  Já têm índice nas colunas de filtro real (`search_id`, `user_id`). **Ação futura, não
  antecipada agora:** política de retenção/arquivamento (ex.: `notification_logs` mais antigo
  que 1 ano vai pra uma tabela fria ou é resumido) — só implementar quando o volume real exigir,
  seguindo a mesma regra do `PERFORMANCE.md` de não otimizar pra escala que não existe ainda.
- **Cache de busca:** o `PROMPT.md`/master vision original cogitou um `search_hash` com TTL
  (Redis/Upstash) pra não repetir chamada de provider — não implementado, porque hoje o
  provider é mock (instantâneo, sem custo). **Reavaliar quando** um provider real (Amadeus/
  Duffel/Booking) entrar em produção — aí sim uma chamada de API paga por busca repetida vira
  custo de verdade, não antes.
