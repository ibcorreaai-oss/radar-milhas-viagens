-- =====================================================================
-- Radar Milhas & Viagens — 0025: Fase 3 do World Experience Radar — Stay Experience
--
-- Extensão 100% aditiva. Reaproveita public.destinations e public.sources
-- (já existentes desde 0002_world_radar.sql) em vez de duplicar conceito —
-- só public.stays é nova. Segue exatamente o mesmo padrão de RLS de
-- world_events (leitura autenticada, escrita admin).
--
-- Provenance mais rigorosa que a Fase 2 (verification_status explícito,
-- retrieved_at/last_verified_at) — pedido explícito do PROMPT WORLD
-- EXPERIENCE RADAR §2/§6. Não retroaplicado em world_events (preservar
-- Fase 0-2 intacta), só nas tabelas novas a partir daqui.
-- =====================================================================

create table public.stays (
  id uuid primary key default gen_random_uuid(),
  destination_id uuid references public.destinations(id) on delete set null,
  name text not null,
  slug text not null unique,
  category text not null check (category in (
    'hotel','resort','pousada','lodge','safari_lodge','glamping','villa','chalet',
    'ryokan','overwater_bungalow','boutique_hotel','eco_lodge','castle_hotel',
    'cave_hotel','treehouse','desert_camp','ski_resort','wellness_retreat','all_inclusive'
  )),
  experience_tags text[] not null default '{}', -- BEACH, SNOW, NATURE, LUXURY, ROMANTIC, FAMILY, ADVENTURE, WELLNESS, GASTRONOMY, SAFARI, SKI, DIVING, REMOTE, UNIQUE, ALL_INCLUSIVE, OVERWATER, NORTHERN_LIGHTS
  description text,
  price_from_cash numeric(10,2),
  price_currency text not null default 'BRL',
  price_unit text not null default 'diaria' check (price_unit in ('diaria','pacote')),
  best_season text,
  stay_score int not null default 0 check (stay_score between 0 and 100),
  -- Provenance (PROMPT WORLD EXPERIENCE RADAR §2/§6)
  source_id uuid references public.sources(id) on delete set null,
  source_url text,
  retrieved_at timestamptz,
  last_verified_at timestamptz,
  verification_status text not null default 'mock' check (verification_status in (
    'verified','unverified','estimated','stale','mock'
  )),
  confidence_score numeric(3,2) not null default 0.50 check (confidence_score between 0 and 1),
  is_mock boolean not null default false,
  cover_image_url text,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index stays_destination_idx on public.stays(destination_id);
create index stays_category_idx on public.stays(category);
create index stays_score_idx on public.stays(stay_score desc);
create index stays_featured_idx on public.stays(featured) where featured = true;
create index stays_tags_idx on public.stays using gin(experience_tags);

alter table public.stays enable row level security;

create policy "stays: read active authenticated" on public.stays
  for select using (auth.role() = 'authenticated' and active = true);
-- Admin precisa ver inativos também (curadoria) — segunda policy explícita
-- em vez de complicar a de leitura pública com OR is_admin(), mesmo padrão
-- de outras tabelas deste projeto que já têm essa duplicação.
create policy "stays: admin read all" on public.stays
  for select using (public.is_admin());
create policy "stays: admin write" on public.stays
  for insert with check (public.is_admin());
create policy "stays: admin update" on public.stays
  for update using (public.is_admin()) with check (public.is_admin());
create policy "stays: admin delete" on public.stays
  for delete using (public.is_admin());

create trigger stays_touch before update on public.stays
  for each row execute function public.touch_updated_at();

-- Feature flag desta fase (chave já reservada no tipo FeatureFlagKey do
-- app, mas nunca tinha sido inserida na tabela) — nasce desligada, mesmo
-- padrão de worldRadar/bucketList na 0002.
insert into public.feature_flags (key, enabled, description)
values ('stayExperience', false, 'Fase 3 — Stay Experience: hospedagens extraordinárias (/estadias)')
on conflict (key) do nothing;
