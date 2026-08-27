-- =====================================================================
-- Radar Milhas & Viagens — 0026: Fase 4 do World Experience Radar — Cruise Radar
--
-- Uma tabela central (`cruises`), não a granularidade completa sugerida no
-- prompt original (cruise_lines/ships/itineraries/departures/ports
-- separadas) — decisão técnica deliberada (regra §46 do prompt: não fazer
-- overengineering). Companhia e navio viram texto simples (mesmo padrão de
-- `world_events.significance` ser texto, não uma tabela à parte); região
-- do roteiro vira tag (`cruise_region_tags`), não FK. Reavaliar para
-- tabelas normalizadas só se/quando houver integração real com um
-- provider de cruzeiros (dado dinâmico de verdade, não seed curado).
-- =====================================================================

create table public.cruises (
  id uuid primary key default gen_random_uuid(),
  embarkation_destination_id uuid references public.destinations(id) on delete set null,
  name text not null,
  slug text not null unique,
  cruise_line text,
  ship_name text,
  category text not null check (category in (
    'oceanico','fluvial','expedicao','tematico','volta_ao_mundo'
  )),
  region_tags text[] not null default '{}', -- CARIBE, MEDITERRANEO, FIORDES_NORUEGUESES, AMAZONIA, NILO, MISSISSIPI, ANTARTIDA, ARTICO, BRASIL, DANUBIO, RENO, DOURO
  route_description text,
  nights int not null check (nights > 0),
  ports_count int not null default 0,
  cabin_category text check (cabin_category in ('interna','vista_mar','varanda','suite')),
  price_from_cash numeric(10,2),
  price_currency text not null default 'BRL',
  cruise_score int not null default 0 check (cruise_score between 0 and 100),
  -- Provenance (mesmo padrão de stays, ver 0025_stay_experience.sql)
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
create index cruises_embarkation_idx on public.cruises(embarkation_destination_id);
create index cruises_category_idx on public.cruises(category);
create index cruises_score_idx on public.cruises(cruise_score desc);
create index cruises_featured_idx on public.cruises(featured) where featured = true;
create index cruises_region_tags_idx on public.cruises using gin(region_tags);

alter table public.cruises enable row level security;

create policy "cruises: read active authenticated" on public.cruises
  for select using (auth.role() = 'authenticated' and active = true);
create policy "cruises: admin read all" on public.cruises
  for select using (public.is_admin());
create policy "cruises: admin write" on public.cruises
  for insert with check (public.is_admin());
create policy "cruises: admin update" on public.cruises
  for update using (public.is_admin()) with check (public.is_admin());
create policy "cruises: admin delete" on public.cruises
  for delete using (public.is_admin());

create trigger cruises_touch before update on public.cruises
  for each row execute function public.touch_updated_at();

-- cruiseRadar já existia no tipo FeatureFlagKey (reservada desde a Fase 2),
-- mas nunca tinha sido inserida na tabela — nasce desligada aqui, ativada
-- só depois de testar (mesmo procedimento da Fase 3).
insert into public.feature_flags (key, enabled, description)
values ('cruiseRadar', false, 'Fase 4 — Cruise Radar: cruzeiros oceânicos, fluviais e de expedição (/cruzeiros)')
on conflict (key) do nothing;
