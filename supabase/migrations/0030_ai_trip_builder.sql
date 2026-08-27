-- =====================================================================
-- Radar Milhas & Viagens — 0030: Fase 8 do World Experience Radar —
-- AI Trip Builder
--
-- itinerary/budget_breakdown ficam em jsonb (não normalizados em tabelas
-- separadas por dia) — decisão deliberada citando a regra "não fazer
-- overengineering" do próprio prompt: um itinerário é sempre lido/escrito
-- inteiro (nunca precisa consultar "todos os dias com passeio X entre
-- viagens diferentes"), então normalizar seria complexidade sem benefício
-- real de consulta.
--
-- share_slug: reaproveita o próprio `id` como token de compartilhamento
-- (rota pública /viagens/compartilhado/[id]) em vez de criar um sistema de
-- tokens separado — simples e suficiente pro escopo desta fase.
-- =====================================================================

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  origin text,
  destination text,
  start_date date,
  end_date date,
  travelers_adults int not null default 1,
  travelers_children int not null default 0,
  budget_total numeric(12,2),
  interests text[] not null default '{}',
  pace text not null default 'moderado' check (pace in ('tranquilo', 'moderado', 'intenso')),
  variant text not null default 'balanced' check (variant in ('economy', 'balanced', 'premium')),
  optimizations text[] not null default '{}', -- reduzir_custo, menos_deslocamentos, mais_descanso etc (§16 do prompt)
  itinerary jsonb not null default '[]'::jsonb, -- [{day, date, morning, afternoon, evening}]
  budget_breakdown jsonb not null default '{}'::jsonb, -- {flights,hotels,transport,food,tickets,experiences,cruise,other,estimated_total,currency}
  summary text,
  ai_generated boolean not null default true, -- false = fallback determinístico (sem IA disponível)
  status text not null default 'ativa' check (status in ('ativa', 'arquivada')),
  is_shared boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index trips_user_idx on public.trips(user_id, created_at desc);
create index trips_shared_idx on public.trips(id) where is_shared = true;

alter table public.trips enable row level security;

create policy "trips: owner all" on public.trips
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Compartilhamento público: leitura sem dono, só quando is_shared = true
-- (link "somente leitura" — nunca permite edição por quem não é dono).
create policy "trips: public read when shared" on public.trips
  for select using (is_shared = true);

create trigger trips_touch before update on public.trips
  for each row execute function public.touch_updated_at();

-- Bucket List (Fase 7) ganha a possibilidade de referenciar uma viagem
-- montada pelo Trip Builder — "adicionar à bucket list" é uma das ações de
-- persistência pedidas explicitamente pra Fase 8.
alter table public.bucket_list_items
  add column trip_id uuid references public.trips(id) on delete cascade;

alter table public.bucket_list_items drop constraint bucket_list_items_check;
alter table public.bucket_list_items add constraint bucket_list_items_check
  check (world_event_id is not null or stay_id is not null or cruise_id is not null or trip_id is not null or custom_title is not null);

create index bucket_list_items_trip_idx on public.bucket_list_items(trip_id);
create unique index bucket_list_items_unique_trip on public.bucket_list_items(bucket_list_id, trip_id)
  where trip_id is not null;

insert into public.feature_flags (key, enabled, description)
values ('tripBuilder', false, 'Fase 8 — AI Trip Builder: monta itinerário + orçamento estimado com IA (/montar-viagem)')
on conflict (key) do nothing;
