# AUDIT_REPORT.md — Radar Milhas & Viagens

> Auditoria executada em 23/08/2026, antes de qualquer alteração, conforme Fase 0 do
> PROMPT MESTRE 3.0. Baseline verificado: `npm run typecheck` limpo, `npm run build`
> limpo (33 rotas, todas compilando).

## 1. O que existe (fonte de verdade: código real, não o PROMPT.md antigo)

- **Repo Git**: sim, `.git` existe. 3 commits (`115906e` MVP inicial, `cccc41e` fix de
  crash sem Supabase, `33c040a` auditoria/correção de 13 bugs). Working tree limpo.
- **Stack real**: Next.js `^15.1.3` (App Router), React `^19.0.0`, TypeScript `^5.7.2`,
  Tailwind CSS `^3.4.17`. Package manager: **npm** (há `package-lock.json`, sem
  `pnpm-lock.yaml`/`yarn.lock`/`bun.lockb`).
- **Banco/Auth**: Supabase (`@supabase/ssr` + `@supabase/supabase-js`), Postgres com RLS
  completo em `supabase/migrations/0001_schema.sql`. Sem ORM — queries via SDK do
  Supabase direto nos server components/actions.
- **Pagamento**: Stripe (`stripe` SDK), único writer de `subscriptions.plan/status` é o
  webhook em `app/api/webhooks/stripe/route.ts` (via `service_role`, ignora RLS).
- **E-mail**: Resend (`lib/email/*`).
- **WhatsApp**: módulo abstrato `lib/whatsapp/*` com providers Evolution API e Z-API —
  loga em vez de falhar sem credencial.
- **IA**: `@anthropic-ai/sdk` já é dependência; usado em `consultor-ia` com fallback de
  regras se `ANTHROPIC_API_KEY` não existir.
- **Cron**: 3 rotas em `app/api/cron/*` (check-alerts, refresh-promotions,
  expire-opportunities), protegidas por header `CRON_SECRET`, agendadas via
  `vercel.json` (Vercel Cron nativo — não há fila/worker separado).
- **Providers de voo/hotel**: `lib/providers/*` com factory que cai automaticamente em
  `MockFlightProvider`/`MockHotelProvider` se as env vars de Amadeus/Duffel/Booking não
  existirem. Nunca quebra por falta de credencial.
- **Motor de score**: `lib/scoring/opportunity-engine.ts` — dinheiro × milhas, score
  0-100, recomendação textual (nunca "mais barato" puro). Puro, determinístico, sem
  chamada de IA.
- **Admin**: `/admin` + CRUD completo de promoções, programas e oportunidades
  (list/nova/editar/deletar via Server Actions, `requireAdmin()` como defesa em
  profundidade em cima da RLS).
- **33 rotas** cobrindo auth, onboarding, dashboard, voos, hotéis, calculadora, alertas,
  promoções, programas, consultor-ia, perfil, assinatura, admin (3 sub-áreas), páginas
  legais (termos/privacidade/política de afiliados/aviso de preços).
- **Segurança já resolvida**: `profiles.role` e `subscriptions.plan/status` não são
  editáveis pelo client (GRANT de colunas específicas + ausência de policy de
  insert/update de usuário em `subscriptions`). Padrão consistente em todas as tabelas
  novas que criei nesta sessão.

## 2. Dependências

Ver `package.json` — 11 dependências de produção, todas ativas e usadas (nenhuma órfã
encontrada). Nenhuma versão será trocada nesta evolução.

## 3. Tabelas existentes (0001_schema.sql)

`profiles`, `loyalty_programs`, `user_loyalty_programs`, `flight_searches`,
`flight_results`, `hotel_searches`, `hotel_results`, `alerts`, `opportunities`,
`promotions`, `subscriptions`, `notification_logs`, `audit_logs`. Todas com RLS.

## 4. Riscos e dívida técnica encontrados

- Nenhum bug crítico novo encontrado nesta auditoria (a sessão anterior já corrigiu 13
  bugs e o crash sem Supabase). Build/typecheck limpos confirmam isso.
- Dívida técnica pré-existente e **fora de escopo** desta evolução: `AmadeusProvider`,
  `DuffelProvider`, `BookingProvider` são stubs não implementados (documentado no
  próprio README, item 6 do checklist manual). Não mexi nisso.
- Nenhuma duplicação de código relevante encontrada nos módulos existentes.
- **Achado menor, não corrigido (fora de escopo)**: `supabase/seed.sql` original insere
  `loyalty_programs` com `on conflict do nothing` sem alvo, mas a tabela não tem
  `unique(name)` — rodar o seed duas vezes duplicaria os programas. Encontrei esse
  mesmo padrão de bug no meu próprio seed novo (`sources` sem unique) e corrigi lá
  (`0002_world_radar.sql` agora tem `unique(name)` em `sources`). Não toquei em
  `0001_schema.sql`/`seed.sql` porque é schema já em produção potencial — decisão sua
  se quer o mesmo fix lá (é uma migration aditiva de uma linha:
  `alter table public.loyalty_programs add constraint loyalty_programs_name_key unique (name);`).

## 5. Funcionalidades incompletas (pré-existentes, não desta sessão)

Ver `README.md` seção "Checklist manual final" — são pendências de infraestrutura
externa (criar contas Supabase/Stripe/Resend/WhatsApp reais), não de código.

## 6. Oportunidade de reaproveitamento identificada

O padrão CRUD admin (`page.tsx` + `actions.ts` + `*-form.tsx` + `nova/page.tsx` +
`[id]/editar/page.tsx`, sempre com `requireAdmin()`/`getUserContext()` + RLS
`admin write/update/delete`) é idêntico em `promocoes`, `programas` e `oportunidades`.
Reaproveitei esse exato padrão para o novo módulo `admin/eventos` em vez de inventar um
novo jeito de fazer CRUD.

O componente `ScoreBadge`/`Badge`/`AdminTable`/`EmptyState` também foi reaproveitado
sem alteração.

## 7. Matriz Build vs Reuse (funcionalidades do PROMPT 3.0 endereçadas nesta sessão)

| Feature | Existe? | Decisão | Risco |
|---|---|---|---|
| OpportunityEngine | sim | **EVOLUIR** (extensão aditiva: `world_event_id` opcional em `opportunities`, engine de score do evento é um módulo novo e paralelo — `opportunity-engine.ts` não foi tocado) | baixo |
| CRUD admin (promoções/programas) | sim | **REUTILIZAR** padrão exato para `admin/eventos` | baixo |
| Sidebar/App shell | sim | **ESTENDER** (nav condicionada a feature flag, zero rota existente alterada) | baixo |
| RLS/admin-guard | sim | **REUTILIZAR** (`is_admin()`, `requireAdmin()`) | baixo |
| World Experience Radar (eventos/festivais/esportes/sazonalidade) | não | **CRIAR** — schema `world_events` + `event_categories` + `destinations` + `sources`, página `/descobrir`, admin `/admin/eventos` | médio (dado é curado manualmente nesta fase, não há agente de descoberta automática — ver §8) |
| Bucket List | não | **CRIAR** — `bucket_lists`/`bucket_list_items`, página `/bucket-list` | baixo |
| Feature flags | não | **CRIAR** — tabela `feature_flags` + `lib/feature-flags.ts` | baixo |
| Agentes de IA de descoberta (WorldDiscoveryAgent, SportsAgent, etc.) | não | **NÃO CRIADO NESTA SESSÃO** — ver §8 | — |
| Cruise Radar, Ski Radar, Extraordinary Stays, Smart Stay Split, Trip Builder, Concierge IA (dados reais), World Calendar, Weather/Crowd Intelligence, Price Intelligence 2.0, Award Availability | não | **NÃO CRIADO NESTA SESSÃO** — desenhado no `IMPLEMENTATION_PLAN.md`, fica para próximas fases | — |

## 8. Por que os agentes de descoberta automática (ingestão externa) NÃO foram criados

O PROMPT 3.0 pede (§46-§49) agentes que buscam eventos em fontes externas (sites
oficiais, RSS, scrapers). Isso implica: (a) contratar/consumir APIs ou scraping de
terceiros — **gasto novo de API/LLM**, que é regra sua não fazer sem aprovação prévia;
(b) risco de ToS de scraping não autorizado em sites de terceiros; (c) risco de inventar
dado (§92 do próprio prompt proíbe isso). Por isso, a Fase 2 desta sessão entrega a
**fundação estrutural completa** (schema + scoring + UI + admin) para o World Experience
Radar, populada com dados de exemplo **explicitamente marcados como `is_mock=true`** (a
UI mostra um badge "dado de exemplo" nesses casos) — exatamente como o MVP original já
fazia com `MockFlightProvider`. A automação de ingestão fica como decisão sua: qual
fonte usar, se vale contratar uma API paga, e nesse momento eu implemento o
`WorldDiscoveryAgent` de verdade.

## 9. Revisão adversarial pós-implementação (mesma sessão)

Depois de fechar a Fase 1-2, revisei linha a linha meus próprios arquivos novos
(não só rodei build/typecheck) e encontrei + corrigi 5 problemas reais antes de
considerar a fase pronta:

1. **Bug de SQL que quebraria o seed**: `seed_world_radar.sql` fazia `insert` referenciando
   `v.source_url`, uma coluna que nunca foi declarada na lista de colunas do `VALUES`
   aliasado — a query falharia ao rodar. Removida a referência (o `source_id` já
   resolve a fonte; a URL específica do evento fica para quando houver fonte real por
   evento).
2. **`sources` sem constraint única**: rodar o seed duas vezes duplicaria as fontes.
   Adicionado `unique` em `sources.name` na migration + `on conflict (name)`.
3. **Dados de exemplo com datas já no passado**: vários eventos (Tomorrowland, San
   Fermín, GP Mônaco, Festival de Parintins, Coachella) tinham datas de 2026 que já
   haviam passado em relação à data corrente do sistema (23/08/2026) — um deles
   (GP Mônaco) ainda marcado como `confirmado`/`comprar_agora`, o que é visivelmente
   errado para uma corrida que já teria acontecido. Reprojetados para a edição de 2027
   (título/slug ajustados para não afirmar um ano que não bate com a data).
4. **Scores de exemplo arbitrários**: os valores de `experience_score`/`book_now_state`
   no seed tinham sido "chutados" na hora de escrever o SQL, sem bater com o motor
   determinístico real (`lib/scoring/event-score.ts`). Recalculados à mão replicando
   exatamente `evaluateExperience`/`deriveBookNowState` para cada evento — cada linha do
   seed agora tem um comentário mostrando a conta.
5. **Filtro de mês com bug de fuso horário**: `/descobrir` comparava mês com
   `getMonth()` (fuso local) numa data `'YYYY-MM-DD'` (parseada como UTC-meia-noite) —
   em fuso negativo (Brasil) isso erra o mês para eventos no dia 1. Trocado para
   `getUTCMonth()`.
6. **Filtro de categoria impreciso**: comparava por `radar` (compartilhável entre
   categorias) em vez de `category_id` — corrigido para comparar por id diretamente.
7. **Feed "Descobrir" mostrava eventos já finalizados**: só excluía `status='cancelado'`,
   deixando `finalizado` (já ocorrido) aparecer num radar que deveria mostrar só o que
   está por vir. Corrigido para excluir os dois.

Nenhum desses bugs foi pego pelo `npm run build`/`npm run typecheck` (todos passavam
mesmo com os bugs) — reforça a regra de não confiar só em build verde. Ver
[[feedback_build_verde_nao_prova_feature_conectada]] na memória.

## 10. Comandos executados nesta auditoria

```
pwd / ls -la / find app components lib supabase -type f
git log --oneline -20 && git status
npm run typecheck   → limpo
npm run build       → limpo, 33 rotas
```
