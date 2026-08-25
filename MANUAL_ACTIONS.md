# MANUAL_ACTIONS.md — Radar Milhas & Viagens 3.0 (Fase 0-2)

Nada abaixo bloqueia o código — a evolução desta sessão está completa e compila/builda
limpa sem essas ações. São passos que só o Igor pode fazer (infraestrutura, decisão de
produto ou dinheiro).

## 1. Rodar as migrations novas no Supabase real

Além do checklist já existente no `README.md` (seção "Supabase"):
- [ ] Rodar `supabase/migrations/0002_world_radar.sql` (depois da `0001_schema.sql`)
- [ ] Rodar `supabase/seed_world_radar.sql` (depois do `seed.sql` original) — popula
      `feature_flags`, `event_categories`, `destinations`, `sources` e ~8 eventos de
      exemplo marcados `is_mock=true`

## 2. Decidir sobre o World Radar antes de abrir para usuários reais

- [ ] Revisar os eventos de exemplo em `/admin/eventos` — eles têm `is_mock=true` e
      não foram confirmados por fonte oficial nesta sessão (datas de 2026 são
      plausíveis mas não verificadas). Confirmar ou desmarcar `is_mock` evento por
      evento antes de expor a usuários pagantes.
- [ ] Decidir se `worldRadar`/`bucketList` ficam ligados em produção (hoje o seed já
      liga as duas) ou se você prefere popular com dados reais antes — desligar é só
      um toggle em `feature_flags` (tabela) ou editar `/admin` no futuro (hoje via SQL
      direto, não há UI de toggle ainda).

## 3. Decisão sobre agentes de descoberta automática (fica para você)

Não implementei nenhum agente de scraping/API externa para popular eventos
automaticamente (§46 do PROMPT 3.0) — isso teria custo de API novo e/ou risco de ToS de
scraping não autorizado, e você tem regra de não aprovar gasto novo de API/LLM sem
combinar antes. Quando você decidir qual fonte usar (ex.: uma API de eventos paga, RSS
de organizadores oficiais, ou continuar 100% manual via `/admin/eventos`), eu implemento
o `WorldDiscoveryAgent` de verdade — o schema (`sources`, `world_events.source_id`,
`confidence_score`, `last_checked_at`) já está pronto para isso.

## 4. Nada novo em Stripe/Resend/WhatsApp/Amadeus/Duffel/Booking/domínio/deploy

Essas pendências continuam exatamente como estavam no `README.md` original — esta
sessão não mexeu em nenhuma integração de pagamento/e-mail/WhatsApp/voo/hotel.

## 5. Teste manual sugerido depois de rodar as migrations

- [ ] Visitar `/descobrir` sem login → deve mostrar página vazia/sem dados (RLS exige
      `authenticated`) — comportamento esperado, igual a `/promocoes`.
- [ ] Logar → `/descobrir` deve mostrar os ~8 eventos de exemplo com badge "Dado de
      exemplo"
- [ ] Salvar um evento na Bucket List → conferir em `/bucket-list`
- [ ] Como admin, criar/editar/excluir um evento em `/admin/eventos` e conferir que o
      score muda ao trocar status/relevância/data
