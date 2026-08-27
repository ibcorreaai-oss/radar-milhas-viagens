# IMPLEMENTATION_PLAN.md — Radar Milhas & Viagens 3.0

Plano incremental por fases (§73-§76 do PROMPT 3.0). Cada fase só é considerada
concluída com typecheck limpo, build limpo e sem regressão nas rotas existentes
(critério §95).

## FASE 0 — Auditoria ✅ CONCLUÍDA (esta sessão)

`AUDIT_REPORT.md`, `ARCHITECTURE.md`, `IMPLEMENTATION_PLAN.md` (este arquivo).

## FASE 1 — Core Data Model ✅ CONCLUÍDA (esta sessão)

Migration `supabase/migrations/0002_world_radar.sql`:
- `feature_flags`, `sources`, `destinations`, `event_categories`, `world_events`,
  `bucket_lists`, `bucket_list_items`.
- Extensão aditiva em `opportunities` (`world_event_id` nullable).
- RLS em todas as tabelas novas, seguindo exatamente o padrão de `0001_schema.sql`
  (leitura autenticada pública, escrita só admin; bucket list só o dono).
- Tipos TypeScript espelhados em `lib/types.ts`.

## FASE 2 — World Experience Radar ✅ CONCLUÍDA (esta sessão, escopo curado)

- `lib/scoring/event-score.ts` — Experience Score explicável (score, label, reasons,
  positives, negatives, urgency, confidence).
- `lib/feature-flags.ts` — leitura de flags com default seguro.
- Página pública `/descobrir` (World Radar) — grid de eventos com filtro por
  categoria/mês, card mostrando score, status, badge de "dado de exemplo" quando
  `is_mock`.
- `/bucket-list` — salvar/remover eventos, criar item customizado.
- `/admin/eventos` — CRUD completo (list/nova/editar/deletar), mesmo padrão dos CRUDs
  existentes.
- Sidebar atualizada com "Descobrir" e "Bucket List", condicionados a feature flag.
- Seed de exemplo (`supabase/seed_world_radar.sql`) com destinos, categorias, fontes e
  ~10 eventos reais conhecidos (Oktoberfest, Rock in Rio, Tomorrowland, Carnaval, F1
  Mônaco, Réveillon Copacabana, aurora boreal na Lapônia, Festival de Parintins, San
  Fermín, Coachella) — todos com `is_mock = true` e `confidence_score` moderado, porque
  são dados de demonstração, não confirmados por fonte oficial nesta sessão.

**Não incluído nesta fase** (fica para quando houver decisão sobre fonte de dados real):
agentes de descoberta automática, deduplicação semântica, verificação contínua de fonte.

## FASE 3 — Stay Experience ✅ CONCLUÍDA (26/08/2026)

- Migration `0025_stay_experience.sql` — tabela `stays` (19 categorias, `experience_tags[]`,
  provenance mais rigorosa que a Fase 2: `verification_status` explícito
  verified/unverified/estimated/stale/mock + `retrieved_at`/`last_verified_at`, além de
  `source_id`/`confidence_score`/`is_mock` já existentes na Fase 2). RLS idêntica ao padrão de
  `world_events`.
- `lib/scoring/stay-score.ts` — Stay Experience Score explicável (mesmo formato
  `ExplainableScore` do Experience Score), determinístico.
- `/estadias` (não `/stays` — mantém convenção PT-BR do resto do app) + `/estadias/[slug]`
  (mostra o score com "por quê", positivos/negativos).
- `/admin/estadias` — CRUD completo, mesmo padrão dos outros CRUDs do admin.
- Sidebar atualizada (`Estadias`, atrás da flag `stayExperience`).
- Seed (`supabase/seed_stay_experience.sql`) com 8 hospedagens reais e conhecidas (Amangiri,
  ICEHOTEL, Treehotel, Giraffe Manor, Conrad Maldives, Skylodge Peru, Castello di Vicarello,
  acampamento em Merzouga) — `verification_status='estimated'`, `is_mock=true` (dados públicos
  conhecidos, mas preço/disponibilidade não verificados ao vivo nesta sessão). Scores
  calculados à mão replicando `evaluateStay()`, não chutados.
- Feature flag `stayExperience` ativada (mesmo padrão de `worldRadar` na Fase 2).
- Testado ao vivo localmente (`next start`): listagem + filtros + card + página de detalhe com
  explicação do score, tudo renderizando corretamente. `tsc`/`build` limpos.

**Decisão registrada**: RLS de `stays` segue exatamente o padrão de `world_events` (leitura só
`authenticated`, não `anon`) — mesmo `/estadias` sendo rota pública no `middleware.ts`. Isso
significa que um visitante deslogado vê a página carregar mas sem itens (mesmo comportamento já
existente em `/descobrir` desde a Fase 2 — não é uma regressão nova desta fase, é a mesma
característica herdada). Registrado aqui, não corrigido agora (preservar decisão da Fase 2 sem
scope creep) — fica como item de melhoria futura se o Igor quiser habilitar leitura anônima
para SEO (mesmo padrão de `0005_public_read_promotions_programs.sql`).

## FASE 4 — Cruise Radar (não iniciada)

`cruises`, `cruise_lines`, `cruise_ships`, `cruise_itineraries`, `cruise_departures`,
`cruise_ports`, Cruise Deal Score. Forma de dado própria (porto de embarque/desembarque,
categoria de cabine) — tabela dedicada, não `world_events`.

## FASE 5 — World Opportunity Engine (não iniciada)

Cruza voos + milhas + `world_events` + hotel + cruzeiro + sazonalidade em um
`Trip Opportunity Score` consolidado. Depende das Fases 3 e 4 existirem com dado real
(não mock) para não inventar número — ver `AUDIT_REPORT.md` §8.

## FASE 6 — Inspire-me (não iniciada)

Formulário (origem/datas/orçamento/milhas/interesses) → ranking usando
`event-score.ts` + `opportunity-engine.ts` já existentes, sem motor novo.

## FASE 7 — Alertas de Bucket List (não iniciada)

Estende `app/api/cron/check-alerts/route.ts` (já existe, roda 1x/dia — limite do plano Hobby da
Vercel, ver ETAPA 19) para
também varrer `bucket_list_items` e cruzar com `world_events` atualizados. Reaproveita o
cron existente — não cria worker novo.

## FASE 8-11 — AI Trip Builder, Concierge IA (dados reais), Price Intelligence 2.0,
Advanced Radars (não iniciadas)

Descritas no PROMPT 3.0 original (§40-§42, §29, §11-§24). Ficam para depois das fases
3-7 terem dado real — Concierge IA em particular precisa consultar dados reais do banco
(§42), não pode ser implementado de forma honesta antes de Optimize/Discover terem
volume de dado.

## Regra de ouro para todas as fases futuras

1. Nenhuma fase nova quebra rota/tabela/RLS existente.
2. Nenhuma fase usa API paga nova sem aprovação explícita prévia (ver memória de
   feedback do usuário: gasto zero de API/LLM novo sem combinar antes).
3. Toda tabela nova segue o padrão de RLS do `0001_schema.sql` (leitura autenticada,
   escrita admin via `is_admin()`, dono-only quando é dado pessoal).
4. Todo CRUD admin novo segue o padrão `page.tsx`/`actions.ts`/`*-form.tsx` já
   estabelecido — não inventar um segundo jeito de fazer admin.
5. Rodar `npm run typecheck && npm run build` antes de considerar a fase pronta.
