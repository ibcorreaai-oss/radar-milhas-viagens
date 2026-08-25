-- =====================================================================
-- Radar Milhas & Viagens — 0002: fundação do World Experience Radar
--
-- Extensão 100% aditiva sobre 0001_schema.sql: nenhuma tabela, coluna ou
-- policy existente é removida ou alterada de forma destrutiva. O
-- OpportunityEngine (lib/scoring/opportunity-engine.ts) não é tocado.
-- Ver ARCHITECTURE.md para as decisões de design deste schema.
-- =====================================================================

-- ---------------------------------------------------------------------
-- FEATURE FLAGS — rollout incremental dos novos módulos
-- ---------------------------------------------------------------------
create table public.feature_flags (
  key text primary key,
  enabled boolean not null default false,
  description text,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- SOURCES — registro de fontes de ingestão (hierarquia de autoridade)
-- ---------------------------------------------------------------------
create table public.sources (
  id uuid primary key default gen_random_uuid(),
  source_type text not null check (source_type in (
    'site_oficial','organizador','promotor','federacao','clube',
    'turismo_oficial','companhia','ticketing','imprensa','agregador','manual'
  )),
  name text not null unique,
  url text,
  authority_level int not null default 5 check (authority_level between 1 and 10),
  last_checked_at timestamptz,
  status text not null default 'active' check (status in ('active','stale','broken','disabled')),
  health text not null default 'unknown' check (health in ('ok','degraded','down','unknown')),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- DESTINATIONS — geo reaproveitável por eventos e futuros módulos (stays, cruzeiros)
-- ---------------------------------------------------------------------
create table public.destinations (
  id uuid primary key default gen_random_uuid(),
  city text not null,
  region text,
  country text not null,
  country_code text,
  continent text,
  latitude numeric(9,6),
  longitude numeric(9,6),
  timezone text,
  created_at timestamptz not null default now(),
  unique (city, country)
);
create index destinations_country_idx on public.destinations(country);

-- ---------------------------------------------------------------------
-- EVENT CATEGORIES — discriminador dos "radares" (ver ARCHITECTURE.md #1)
-- ---------------------------------------------------------------------
create table public.event_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  label text not null,
  radar text not null check (radar in (
    'festa_tradicional','festival_musical','show','esporte','sazonal',
    'fenomeno_natural','natureza','cruzeiro','gastronomia','cultural',
    'trem_terrestre','once_in_a_lifetime','hidden_gem'
  )),
  icon text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- WORLD EVENTS — entidade central do World Experience Radar
-- ---------------------------------------------------------------------
create table public.world_events (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.event_categories(id) on delete set null,
  destination_id uuid references public.destinations(id) on delete set null,
  title text not null,
  slug text not null unique,
  description text,
  significance text check (significance in (
    'comum','classico','derby','mata_mata','semifinal','final','evento_historico'
  )),
  start_date date,
  end_date date,
  status text not null default 'em_monitoramento' check (status in (
    'confirmado','previsto','estimado','em_monitoramento','cancelado','adiado','finalizado'
  )),
  once_in_a_lifetime boolean not null default false,
  hidden_gem boolean not null default false,
  experience_score int not null default 0 check (experience_score between 0 and 100),
  book_now_state text not null default 'monitorar' check (book_now_state in (
    'monitorar','esperar','boa_janela','comprar','comprar_agora','alto_risco_esgotar'
  )),
  confidence_score numeric(3,2) not null default 0.50 check (confidence_score between 0 and 1),
  source_id uuid references public.sources(id) on delete set null,
  source_url text,
  cover_image_url text,
  tags text[] not null default '{}',
  featured boolean not null default false,
  last_checked_at timestamptz,
  last_changed_at timestamptz,
  -- Dado de desenvolvimento/demonstração — nunca deve ser apresentado como
  -- confirmado sem marcação (ver PROMPT 3.0 §92). A UI mostra um badge
  -- quando true.
  is_mock boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index world_events_dates_idx on public.world_events(start_date, end_date);
create index world_events_category_idx on public.world_events(category_id);
create index world_events_destination_idx on public.world_events(destination_id);
create index world_events_score_idx on public.world_events(experience_score desc);
create index world_events_featured_idx on public.world_events(featured) where featured = true;

-- ---------------------------------------------------------------------
-- BUCKET LIST
-- ---------------------------------------------------------------------
create table public.bucket_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'Minha Bucket List',
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

create table public.bucket_list_items (
  id uuid primary key default gen_random_uuid(),
  bucket_list_id uuid not null references public.bucket_lists(id) on delete cascade,
  world_event_id uuid references public.world_events(id) on delete cascade,
  custom_title text,
  notes text,
  last_alert_sent_at timestamptz,
  created_at timestamptz not null default now(),
  check (world_event_id is not null or custom_title is not null)
);
create index bucket_list_items_list_idx on public.bucket_list_items(bucket_list_id);
create unique index bucket_list_items_unique_event on public.bucket_list_items(bucket_list_id, world_event_id)
  where world_event_id is not null;

-- ---------------------------------------------------------------------
-- OPPORTUNITIES — extensão compatível: referência opcional a um world_event
-- (ver ARCHITECTURE.md #2 — o OpportunityEngine em si não é tocado).
-- ---------------------------------------------------------------------
alter table public.opportunities add column world_event_id uuid references public.world_events(id) on delete set null;
alter table public.opportunities drop constraint opportunities_type_check;
alter table public.opportunities add constraint opportunities_type_check
  check (type in ('voo','hotel','transferencia','pacote','evento'));

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.feature_flags enable row level security;
alter table public.sources enable row level security;
alter table public.destinations enable row level security;
alter table public.event_categories enable row level security;
alter table public.world_events enable row level security;
alter table public.bucket_lists enable row level security;
alter table public.bucket_list_items enable row level security;

-- feature_flags: leitura autenticada, escrita só admin (o insert inicial
-- é feito pelo seed via service_role, então não precisa policy de insert
-- para authenticated).
create policy "feature_flags: read all authenticated" on public.feature_flags
  for select using (auth.role() = 'authenticated');
create policy "feature_flags: admin update" on public.feature_flags
  for update using (public.is_admin()) with check (public.is_admin());

-- sources: leitura autenticada, escrita admin.
create policy "sources: read all authenticated" on public.sources
  for select using (auth.role() = 'authenticated');
create policy "sources: admin write" on public.sources
  for insert with check (public.is_admin());
create policy "sources: admin update" on public.sources
  for update using (public.is_admin()) with check (public.is_admin());
create policy "sources: admin delete" on public.sources
  for delete using (public.is_admin());

-- destinations: leitura autenticada, escrita admin.
create policy "destinations: read all authenticated" on public.destinations
  for select using (auth.role() = 'authenticated');
create policy "destinations: admin write" on public.destinations
  for insert with check (public.is_admin());
create policy "destinations: admin update" on public.destinations
  for update using (public.is_admin()) with check (public.is_admin());
create policy "destinations: admin delete" on public.destinations
  for delete using (public.is_admin());

-- event_categories: leitura autenticada, escrita admin.
create policy "event_categories: read all authenticated" on public.event_categories
  for select using (auth.role() = 'authenticated');
create policy "event_categories: admin write" on public.event_categories
  for insert with check (public.is_admin());
create policy "event_categories: admin update" on public.event_categories
  for update using (public.is_admin()) with check (public.is_admin());
create policy "event_categories: admin delete" on public.event_categories
  for delete using (public.is_admin());

-- world_events: leitura autenticada, escrita admin.
create policy "world_events: read all authenticated" on public.world_events
  for select using (auth.role() = 'authenticated');
create policy "world_events: admin write" on public.world_events
  for insert with check (public.is_admin());
create policy "world_events: admin update" on public.world_events
  for update using (public.is_admin()) with check (public.is_admin());
create policy "world_events: admin delete" on public.world_events
  for delete using (public.is_admin());

-- bucket_lists / bucket_list_items: só o dono.
create policy "bucket_lists: owner all" on public.bucket_lists
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "bucket_list_items: owner via list" on public.bucket_list_items
  for all using (
    exists (select 1 from public.bucket_lists bl where bl.id = bucket_list_id and bl.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.bucket_lists bl where bl.id = bucket_list_id and bl.user_id = auth.uid())
  );

create trigger world_events_touch before update on public.world_events
  for each row execute function public.touch_updated_at();
