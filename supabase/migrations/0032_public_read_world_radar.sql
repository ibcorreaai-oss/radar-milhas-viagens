-- Decisão registrada em MANUAL_ACTIONS.md (item "leitura anônima/SEO"): /estadias,
-- /cruzeiros, /descobrir, /oportunidades-mundiais e /onde-ir são vitrines públicas de
-- verdade (nenhuma está em middleware.ts PROTECTED_PREFIXES, todas fazem a própria
-- página carregar sem exigir login) — mas a RLS de leitura exigia
-- auth.role() = 'authenticated', então um visitante deslogado (ou um crawler do
-- Google/ChatGPT/Gemini) via a página carregar sempre vazia. Mesmo raciocínio e
-- mesmo padrão já aplicado a promotions/loyalty_programs desde
-- 0005_public_read_promotions_programs.sql (ETAPA 11): dado curado pelo admin, sem
-- informação pessoal/sensível, escrita continua só admin (policies de
-- insert/update/delete não mudam nesta migration).
--
-- world_events/stays/cruises alimentam também /oportunidades-mundiais e /onde-ir
-- (lib/opportunity-engine.ts, lib/inspire-engine.ts) — abrir essas três tabelas mais
-- destinations/event_categories/sources (usadas em join nas mesmas páginas) cobre as
-- 5 rotas de uma vez, sem precisar de policy nova em nenhuma tabela adicional.

alter policy "world_events: read all authenticated" on public.world_events
  rename to "world_events: read all";
alter policy "world_events: read all" on public.world_events
  using (true);

alter policy "stays: read active authenticated" on public.stays
  rename to "stays: read active";
alter policy "stays: read active" on public.stays
  using (active = true);

alter policy "cruises: read active authenticated" on public.cruises
  rename to "cruises: read active";
alter policy "cruises: read active" on public.cruises
  using (active = true);

alter policy "destinations: read all authenticated" on public.destinations
  rename to "destinations: read all";
alter policy "destinations: read all" on public.destinations
  using (true);

alter policy "event_categories: read all authenticated" on public.event_categories
  rename to "event_categories: read all";
alter policy "event_categories: read all" on public.event_categories
  using (true);

alter policy "sources: read all authenticated" on public.sources
  rename to "sources: read all";
alter policy "sources: read all" on public.sources
  using (true);
