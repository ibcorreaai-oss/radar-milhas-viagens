-- =====================================================================
-- Radar Milhas & Viagens — 0028: Fase 6 do World Experience Radar —
-- Inspire Me (/onde-ir)
--
-- Sem tabela nova: reaproveita 100% o World Opportunity Engine da Fase 5
-- (lib/opportunity-engine.ts) — só adiciona uma camada de filtro/ranking
-- por modo/continente (lib/inspire-engine.ts). Única mudança de schema:
-- inserir a flag já reservada no tipo FeatureFlagKey desde o começo do
-- projeto, mesmo padrão de 0025/0026/0027.
-- =====================================================================

insert into public.feature_flags (key, enabled, description)
values ('inspireMe', false, 'Fase 6 — Inspire Me: "onde eu deveria estar?" por modo/continente (/onde-ir)')
on conflict (key) do nothing;
