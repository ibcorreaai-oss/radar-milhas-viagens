-- ETAPA 11 (SEO/GEO): /promocoes e /programas são alcançáveis sem login
-- (não estão em middleware.ts PROTECTED_PREFIXES) e sempre foram descritas
-- como "vitrine pública" — mas a policy de SELECT exigia
-- auth.role() = 'authenticated', então um crawler anônimo (Google, ChatGPT,
-- Gemini) via essas rotas só via uma tela vazia. Decisão confirmada com o
-- Igor: liberar leitura anônima nas duas tabelas — é conteúdo curado pelo
-- admin, sem dado pessoal/sensível. Escrita continua só admin (as policies
-- de insert/update/delete não mudam).
alter policy "loyalty_programs: read all authenticated" on public.loyalty_programs
  rename to "loyalty_programs: read all";
alter policy "loyalty_programs: read all" on public.loyalty_programs
  using (true);

alter policy "promotions: read all authenticated" on public.promotions
  rename to "promotions: read all";
alter policy "promotions: read all" on public.promotions
  using (true);
