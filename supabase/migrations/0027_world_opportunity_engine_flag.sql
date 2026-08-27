-- =====================================================================
-- Radar Milhas & Viagens — 0027: Fase 5 do World Experience Radar —
-- World Opportunity Engine (Trip Opportunity Score)
--
-- Sem tabela nova: o Trip Opportunity Score é 100% computado ao vivo
-- (lib/scoring/opportunity-score.ts + lib/opportunity-engine.ts) a partir
-- de world_events + stays + cruises já existentes, nunca persistido — a
-- urgência do score depende de "dias até o evento", que muda todo dia, um
-- valor gravado ficaria desatualizado no dia seguinte (diferente de
-- stay_score/cruise_score, que descrevem a experiência em si e mudam
-- raramente).
--
-- Única mudança de schema: inserir a flag já reservada no tipo
-- FeatureFlagKey desde o começo do projeto (lib/types.ts), mas nunca
-- inserida na tabela — mesmo padrão de 0025/0026.
-- =====================================================================

insert into public.feature_flags (key, enabled, description)
values ('worldOpportunityEngine', false, 'Fase 5 — World Opportunity Engine: Trip Opportunity Score por destino (/oportunidades-mundiais)')
on conflict (key) do nothing;
