-- Achado nos advisors de performance do Supabase (auditoria de produção,
-- 27/08): 8 foreign keys sem índice de cobertura. Adiciona os índices que
-- faltam nas FKs de `source_id` (stays/cruises/world_events/
-- price_observations) e `world_event_id` (bucket_list_items) — sem
-- urgência com o volume atual (dezenas de linhas), mas é uma migration
-- aditiva, zero-risco, então resolvida em vez de deixada pendente.

create index if not exists stays_source_id_idx on public.stays(source_id);
create index if not exists cruises_source_id_idx on public.cruises(source_id);
create index if not exists world_events_source_id_idx on public.world_events(source_id);
create index if not exists price_observations_source_id_idx on public.price_observations(source_id);
create index if not exists bucket_list_items_world_event_id_idx on public.bucket_list_items(world_event_id);
