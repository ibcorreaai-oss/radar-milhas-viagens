-- =====================================================================
-- Radar Milhas & Viagens — 0029: Fase 7 do World Experience Radar —
-- Alerts + Bucket List evolution
--
-- Extensão 100% aditiva de public.bucket_list_items (criada em 0002):
-- agora aceita referenciar uma estadia (Fase 3) ou um cruzeiro (Fase 4),
-- além do evento (Fase 2) e do item livre já suportados. A constraint de
-- "pelo menos um tipo preenchido" é recriada para cobrir os dois novos
-- campos — troca o check antigo por um mais abrangente, sem perder dado
-- existente (todas as linhas atuais continuam satisfazendo a nova regra,
-- já que world_event_id/custom_title continuam sendo alternativas válidas).
--
-- Não introduz tabelas novas de AlertRule/AlertCondition/AlertEvaluation/
-- AlertNotification (§25 do PROMPT WORLD EXPERIENCE RADAR) — mapeamento
-- deliberado pra evitar overengineering (§46): a tabela `alerts` já
-- existente (0001) + `last_checked_at`/`last_triggered_at` já cobrem
-- AlertRule+AlertCondition+AlertEvaluation para voo/hotel; `notification_logs`
-- já cobre AlertNotification; `bucket_list_items.last_alert_sent_at` (já
-- existia desde 0002, nunca tinha sido usado) passa a cobrir o cooldown de
-- alerta por item salvo — documentado em IMPLEMENTATION_PLAN.md.
-- =====================================================================

alter table public.bucket_list_items
  add column stay_id uuid references public.stays(id) on delete cascade,
  add column cruise_id uuid references public.cruises(id) on delete cascade;

alter table public.bucket_list_items drop constraint bucket_list_items_check;
alter table public.bucket_list_items add constraint bucket_list_items_check
  check (world_event_id is not null or stay_id is not null or cruise_id is not null or custom_title is not null);

create index bucket_list_items_stay_idx on public.bucket_list_items(stay_id);
create index bucket_list_items_cruise_idx on public.bucket_list_items(cruise_id);

create unique index bucket_list_items_unique_stay on public.bucket_list_items(bucket_list_id, stay_id)
  where stay_id is not null;
create unique index bucket_list_items_unique_cruise on public.bucket_list_items(bucket_list_id, cruise_id)
  where cruise_id is not null;
