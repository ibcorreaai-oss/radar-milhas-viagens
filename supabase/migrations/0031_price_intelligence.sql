-- Recuperado do histórico real do Supabase (supabase_migrations.schema_migrations)
-- na revisão geral de 27/08/2026 — esta migration foi aplicada no banco real em
-- 27/08 às 01:55 (mesmo dia da 0030/0032), mas o arquivo nunca chegou a ser
-- commitado no repo: drift real entre produção e o que o repositório descreve.
-- Recuperado via SQL (coluna `statements`), não recriado de memória.

-- Fase 10 do World Experience Radar -- Price Intelligence 2.0.
--
-- Zero Hallucination Policy: este app NUNCA compra ou inventa historico de
-- preco. price_observations so recebe linhas quando um admin cadastra/edita
-- um preco real (stays/cruises/opportunities) -- cada linha e "isso foi o
-- preco visto nesse momento", nunca uma estimativa ou projecao.
--
-- Como o projeto comecou hoje, o historico comeca vazio/raso (uma unica
-- observacao por item recem-criado) -- a UI mostra "dados historicos
-- insuficientes" honestamente ate o historico acumular ao longo dos dias
-- (ver lib/scoring/price-intelligence.ts), nunca fabrica tendencia.

create table public.price_observations (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('opportunity','stay','cruise')),
  entity_id uuid not null,
  price_cash numeric(12,2) not null check (price_cash >= 0),
  price_currency text not null default 'BRL',
  observed_at timestamptz not null default now(),
  source_id uuid references public.sources(id),
  created_at timestamptz not null default now()
);

create index price_observations_entity_idx on public.price_observations(entity_type, entity_id, observed_at desc);

alter table public.price_observations enable row level security;

create policy "price_observations: read authenticated" on public.price_observations
  for select using (auth.role() = 'authenticated');

-- Insert via is_admin() (mesmas Server Actions de admin que ja gravam
-- stays/cruises/opportunities). Sem update/delete -- log append-only, nao
-- deve ser editado retroativamente (a propria garantia de integridade que a
-- feature promete).
create policy "price_observations: admin insert" on public.price_observations
  for insert with check (public.is_admin());

insert into public.feature_flags (key, enabled, description)
values ('priceIntelligence', false, 'Fase 10 -- Price Intelligence 2.0: historico de preco proprio construido a partir de observacoes reais, nunca inventado')
on conflict (key) do nothing;
