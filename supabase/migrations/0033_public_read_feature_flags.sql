-- Achado real durante a validação da migration 0032 (leitura anônima de
-- world_events/stays/cruises/destinations/event_categories/sources): mesmo
-- com aquelas tabelas abertas, /estadias continuava mostrando "Estadias
-- ainda não está ativado" para visitante deslogado. Causa raiz:
-- `feature_flags` também exigia auth.role() = 'authenticated' pra leitura,
-- e lib/feature-flags.ts (getFeatureFlags()) trata QUALQUER falha/vazio de
-- leitura como "todas as flags desligadas" (fallback seguro por design,
-- ver comentário no próprio arquivo) — então TODA página atrás de feature
-- flag (Descobrir, Bucket List, Estadias, Cruzeiros, Oportunidades
-- Mundiais, Onde Ir, e qualquer uma futura) ficava com todas as flags como
-- `false` pra visitante anônimo, independente do valor real no banco.
--
-- feature_flags não tem dado sensível nenhum (só chave/booleano/descrição
-- de admin) — seguro abrir leitura, mesmo padrão de
-- 0005_public_read_promotions_programs.sql e 0032. Escrita continua só
-- admin (policy de update não muda).

alter policy "feature_flags: read all authenticated" on public.feature_flags
  rename to "feature_flags: read all";
alter policy "feature_flags: read all" on public.feature_flags
  using (true);
