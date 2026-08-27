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

## FASE 4 — Cruise Radar ✅ CONCLUÍDA (26/08/2026)

- Migration `0026_cruise_radar.sql` — tabela única `cruises` (não as 6 tabelas normalizadas
  cruise_lines/ships/itineraries/departures/ports sugeridas no prompt original — decisão
  deliberada citando a própria regra do prompt de "não fazer overengineering"; `cruise_line`/
  `ship_name` são texto livre, `region_tags` é array de tags, não FK). Mesma provenance
  rigorosa da Fase 3 (`verification_status`/`retrieved_at`/`last_verified_at` +
  `source_id`/`confidence_score`/`is_mock`). RLS idêntica ao padrão de `world_events`/`stays`.
- `lib/scoring/cruise-score.ts` — Cruise Score explicável (mesmo formato `ExplainableScore`),
  determinístico, considera categoria (expedição/volta ao mundo pontuam mais), região,
  duração, número de portos, qualidade da fonte/provenance.
- `/cruzeiros` (não `/cruises` — mesma convenção PT-BR de `/estadias`) + `/cruzeiros/[slug]`
  (score com "por quê", positivos/negativos).
- `/admin/cruzeiros` — CRUD completo, mesmo padrão dos outros CRUDs do admin.
- Sidebar atualizada (`Cruzeiros`, ícone `Ship`, atrás da flag `cruiseRadar`).
- Seed (`supabase/seed_cruise_radar.sql`) com 8 cruzeiros reais e conhecidos (Fiordes
  Noruegueses/Hurtigruten, Expedição à Antártida, Mediterrâneo Clássico, Danúbio fluvial,
  Amazônia, volta ao mundo Queen Mary 2, Caribe clássico, Nilo) — `verification_status=
  'estimated'`, `is_mock=true` (roteiros/categorias reais e conhecidos publicamente, mas
  preço/disponibilidade não verificados ao vivo nesta sessão). Scores calculados à mão
  replicando `evaluateCruise()`: Hurtigruten=55, Antártida=74, Mediterrâneo=47, Danúbio=55,
  Amazônia=47, Queen Mary 2=73, Caribe=47, Nilo=55 — confirmado no banco
  (`count=8, min_score=47, max_score=74`).
  Feature flag `cruiseRadar` ativada (mesmo padrão das fases anteriores).
- Testado ao vivo localmente (`next start`): listagem com 3 cards em destaque (Expedição
  Antártida 74/100, Volta ao Mundo Queen Mary 2 73/100, Fiordes Noruegueses 55/100) e página
  de detalhe da Expedição à Antártida com explicação do score renderizando corretamente.
  `tsc --noEmit` e `next build` limpos, as 5 rotas novas confirmadas no output do build.

**Decisão registrada**: mesma característica herdada de RLS documentada na Fase 3 (visitante
deslogado vê `/cruzeiros` carregar sem itens, porque a rota não está em `PROTECTED_PREFIXES`
mas RLS só libera leitura pra `authenticated`) — não é regressão nova, não foi corrigida agora
pelo mesmo motivo (preservar decisão da Fase 2, evitar scope creep).

## FASE 5 — World Opportunity Engine ✅ CONCLUÍDA (26/08/2026)

**Achado de auditoria antes de implementar (regra §0 do PROMPT WORLD EXPERIENCE RADAR)**:
ao consultar o banco real para agregar dados por destino, `world_events`/`event_categories`/
`sources` estavam **vazios** — o seed da Fase 2 (`supabase/seed_world_radar.sql`) e as flags
`worldRadar`/`bucketList` nunca tinham sido de fato aplicados neste projeto Supabase, apesar do
código de `/descobrir` e `/bucket-list` já existir e a Fase 2 estar marcada como concluída.
Corrigido nesta fase: seed aplicado (8 eventos reais, 11 categorias, 6 fontes, 8 destinos) e
flags `worldRadar`/`bucketList` ativadas — comportamento pré-existente, não uma regressão desta
sessão. Testado ao vivo: `/descobrir` agora renderiza os 8 eventos corretamente (GP Mônaco
94/100, Oktoberfest 74/100, San Fermín 75/100, etc.).

- Sem tabela nova — decisão deliberada: o Trip Opportunity Score depende de "dias até o
  evento", que muda todo dia; um valor persistido ficaria desatualizado no dia seguinte
  (diferente de `stay_score`/`cruise_score`, que descrevem a experiência em si e mudam raramente).
  Migration `0027_world_opportunity_engine_flag.sql` só insere a feature flag.
- `lib/scoring/opportunity-score.ts` — `evaluateTripOpportunity()`, mesmo formato
  `ExplainableScore` das outras fases. Combina: proximidade/importância do próximo evento
  catalogado no destino, quantidade e qualidade das estadias (`stays`) e cruzeiros (`cruises`)
  com aquele destino, e confiança média dos dados subjacentes.
  **Zero Hallucination Policy**: preço de voo/hotel NUNCA entra no score — este app não tem
  provider de preço ao vivo por destino (`flight_results`/`hotel_results` são busca pontual do
  usuário, não um feed histórico), então o componente é sempre declarado explicitamente "dado
  indisponível" nas razões negativas, nunca estimado ou omitido silenciosamente.
- `lib/opportunity-engine.ts` — `getDestinationOpportunities()`, agrega `world_events` +
  `stays` + `cruises` por `destination_id`/`embarkation_destination_id` e calcula o score de
  cada destino com pelo menos um sinal (evento, estadia ou cruzeiro) catalogado.
- `/oportunidades-mundiais` (rota nova, distinta de `/admin/oportunidades` que gerencia a
  tabela `opportunities` — conceito totalmente diferente, não confundir: aquela é vitrine de
  descontos de voo/hotel/pacote, esta é o Trip Opportunity Score por destino) — lista todos os
  destinos com sinal, ordenados por score, cada card mostrando label + confiança + positivos/
  negativos explicáveis.
- Sidebar atualizada (`Oportunidades`, ícone `TrendingUp`, atrás da flag `worldOpportunityEngine`).
- Feature flag `worldOpportunityEngine` ativada.
- Testado ao vivo localmente: Munique (Oktoberfest em 22 dias) 68/100, Rio de Janeiro (Rock in
  Rio em 14 dias, confiança menor) 61/100, Ushuaia (cruzeiro 74/100) 52/100, hospedagens com
  Stay Score mais alto rankeando acima das de score mais baixo — confirmado que a qualidade do
  item subjacente influencia o score (bug encontrado e corrigido durante o teste: a primeira
  versão só contava quantidade, não qualidade, do stay/cruzeiro — corrigido antes de commitar).
  `tsc --noEmit` e `next build` limpos.

**Não incluído nesta fase**: não há página de detalhe por destino (ex. `/destinos/[slug]`) —
isso é o "Experience Graph" do §12, fora do escopo desta fase; os cards de `/oportunidades-mundiais`
são informativos, sem link de destino individual (evitando link para uma página inexistente).

## FASE 6 — Inspire Me ✅ CONCLUÍDA (26/08/2026)

- Sem tabela nova, sem motor de score novo — reaproveita 100% o `getDestinationOpportunities()`
  da Fase 5 (`lib/opportunity-engine.ts`), só adiciona uma camada de filtro/ranking por modo
  (`lib/inspire-engine.ts`, `rankForInspireMe()`). Migration `0028_inspire_me_flag.sql` só
  insere a feature flag.
- **Escopo reduzido em relação à lista literal de inputs do prompt** (origem/datas/orçamento/
  viajantes/duração): documentado no topo de `lib/inspire-engine.ts` — este app não tem provider
  de preço de voo/hotel por destino nem dado de duração de deslocamento, então filtrar por
  "orçamento exato" ou "cabe no fim de semana" seria inventar precisão que não existe (Zero
  Hallucination Policy). Os únicos filtros implementados são os que o banco responde
  honestamente: **continente** (`destinations.continent`) e **modo/interesse** — mapeado pra
  `experience_tags` das estadias catalogadas (Romântico→ROMANTIC, Família→FAMILY, Luxo→LUXURY,
  Aventura→ADVENTURE, Praia→BEACH, Neve→SNOW, Natureza→NATURE, Gastronomia→GASTRONOMY),
  presença de evento catalogado (modo Eventos), ou `price_from_cash` real em BRL (modo Melhor
  custo-benefício — não inventado, é o mesmo preço estimado já exibido em `/estadias`/`/cruzeiros`).
  "Fim de semana" e "Surpreenda-me" caem no ranking padrão do Opportunity Engine por falta de
  dado de duração/randomização honesta pra diferenciar.
- **Sem fallback silencioso**: um modo sem nenhum destino correspondente (ex. "Família" — nenhuma
  estadia semeada tem a tag FAMILY ainda) mostra estado vazio explícito em vez de devolver
  resultados de outro filtro disfarçados de "família" — verificado ao vivo.
- `/onde-ir` (rota nova) + `inspire-filters.tsx` (12 modos como pills + select de continente,
  refletidos na URL via query params, mesmo padrão dos outros filtros do app).
- Sidebar atualizada (`Onde Ir`, ícone `Navigation`, atrás da flag `inspireMe`).
- Feature flag `inspireMe` ativada.
- Testado ao vivo localmente: modo padrão mostra o mesmo TOP do Opportunity Engine (Munique 68,
  Rio 61, Ushuaia 52...); modo "Praia" filtra corretamente para Ilha Rangali/Conrad Maldives
  (único stay com tag BEACH); modo "Família" mostra o estado vazio honesto. `tsc --noEmit` e
  `next build` limpos.

## FASE 7 — Alerts + Bucket List evolution ✅ CONCLUÍDA (26/08/2026)

- Migration `0029_bucket_list_alerts_evolution.sql` — `bucket_list_items` ganha `stay_id`/
  `cruise_id` (nullable, FK pra `stays`/`cruises`), constraint de "pelo menos um tipo
  preenchido" recriada pra cobrir os dois campos novos, índices únicos por lista pra evitar
  duplicata (mesmo padrão do `world_event_id` já existente desde a Fase 2).
- **Sem tabelas novas de `AlertRule`/`AlertCondition`/`AlertEvaluation`/`AlertNotification`**
  (decisão deliberada citando a regra "não fazer overengineering" do próprio prompt): a tabela
  `alerts` (0001) já cobre AlertRule+AlertCondition+AlertEvaluation pra voo/hotel;
  `notification_logs` já cobre AlertNotification; `bucket_list_items.last_alert_sent_at` (coluna
  existia desde 0002, nunca tinha sido usada) passa a cobrir o cooldown de alerta por item salvo.
- `/estadias/[slug]` e `/cruzeiros/[slug]` ganharam botão "Salvar na Bucket List" (só faltava
  isso — o botão já existia em `/descobrir` desde a Fase 2, mas nunca tinha sido estendido pras
  Fases 3/4). Novos `app/(app)/estadias/actions.ts` e `app/(app)/cruzeiros/actions.ts`
  (`saveStayToBucketList`/`saveCruiseToBucketList`), mesmo padrão de `saveEventToBucketList`.
- `/bucket-list` atualizada pra renderizar itens de estadia/cruzeiro (nome, destino, score,
  botão remover) além dos itens de evento e livre já suportados.
- `app/api/cron/check-alerts/route.ts` (já existia, roda 1x/dia) ganhou uma segunda passada:
  varre `bucket_list_items` com `world_event_id`, e quando o `book_now_state` do evento entra em
  `comprar`/`comprar_agora` — o proxy honesto mais próximo que este app tem de "evento abrir
  vendas", já que não existe integração real com bilheteria — envia e-mail/WhatsApp respeitando
  `profiles.notify_email`/`notify_whatsapp` e o plano do usuário (`planHasChannel`), com cooldown
  de 7 dias via `last_alert_sent_at` pra não notificar todo dia. Novo template
  `bucketListEventReadyEmail` em `lib/email/templates.ts`.
- **Não incluído nesta fase** (documentado, não escondido): alertas de queda de preço para
  estadias/cruzeiros salvos ("avise quando hotel < X", "avise quando cruzeiro cair X%") — exigem
  histórico de preço real, que é exatamente o que a Fase 10 (Price Intelligence 2.0) vai
  construir; implementar agora seria inventar uma tendência de preço sem dado por trás (Zero
  Hallucination Policy). Canais Telegram/Push: `notification_logs.channel` já aceita esses
  valores no schema desde 0001, mas nenhum provider real foi ativado (exigiria token/conta
  externa — decisão que cabe ao Igor, não uma decisão técnica normal).
- Testado ao vivo localmente: estadia e cruzeiro salvos via botão novo, renderizados
  corretamente em `/bucket-list` com o score certo, remoção funcionando; consulta SQL direta
  confirmou que o item de Oktoberfest 2026 (book_now_state='comprar') seria corretamente
  identificado pela nova passada do cron como elegível para notificação (sem disparar o envio
  real de e-mail, pra não gerar side-effect indesejado num teste). `tsc --noEmit` e `next build`
  limpos.

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
