-- ETAPA 13 (NeuroUX/engajamento): painel de conquistas no dashboard
-- ("Perfil completo", "Primeiro alerta criado" etc.) é opcional e decidido
-- pelo admin — mesmo padrão de worldRadar/bucketList (0002_world_radar.sql).
-- Calculado sob demanda a partir de profiles/alerts/flight_searches/
-- hotel_searches/notification_logs, sem tabela nova (mesma filosofia do
-- GROWTH.md §6: nada de tabela de evento genérica sem tráfego real pra
-- justificar). Desligado por padrão — o Igor liga quando quiser.
insert into public.feature_flags (key, enabled, description) values
  ('achievementsPanel', false, 'Painel de conquistas no dashboard (perfil completo, primeiro alerta, primeira busca etc.) — calculado sob demanda, sem tabela nova')
on conflict (key) do nothing;
