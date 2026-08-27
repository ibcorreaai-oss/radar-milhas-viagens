-- Segunda rodada de FKs sem índice de cobertura (achados de performance do
-- Supabase, revisão geral de 27/08) — diferentes dos 5 cobertos pela
-- migration 0034 (essas 3 não apareciam naquela lista).
create index if not exists notification_logs_alert_id_idx on public.notification_logs(alert_id);
create index if not exists opportunities_world_event_id_idx on public.opportunities(world_event_id);
create index if not exists user_loyalty_programs_program_id_idx on public.user_loyalty_programs(program_id);
