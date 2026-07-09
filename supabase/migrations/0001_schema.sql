-- =====================================================================
-- Radar Milhas & Viagens — schema inicial
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- PROFILES
-- role = 'user' | 'admin' — SÓ pode ser alterado por service_role
-- (nunca por policy de update do próprio usuário — ver bloco de GRANTs).
-- ---------------------------------------------------------------------
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  phone text,
  home_airport text,
  favorite_destinations text[] not null default '{}',
  cabin_class_preference text not null default 'qualquer' check (cabin_class_preference in ('economica','executiva','primeira','qualquer')),
  flexible_dates boolean not null default false,
  monthly_budget numeric(12,2),
  notify_email boolean not null default true,
  notify_whatsapp boolean not null default false,
  preferred_currency text not null default 'BRL',
  language text not null default 'pt-BR',
  timezone text not null default 'America/Fortaleza',
  onboarding_done boolean not null default false,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_user_idx on public.profiles(user_id);

-- ---------------------------------------------------------------------
-- LOYALTY PROGRAMS (catálogo público, gerenciado pelo admin)
-- ---------------------------------------------------------------------
create table public.loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type text not null check (type in ('banco','companhia_aerea','hotel','coalizao')),
  country text not null default 'BR',
  average_mile_value numeric(10,4) not null default 0,
  transfer_partners text[] not null default '{}',
  validity_notes text,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- USER LOYALTY PROGRAMS (saldo do usuário por programa)
-- ---------------------------------------------------------------------
create table public.user_loyalty_programs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  program_id uuid not null references public.loyalty_programs(id) on delete cascade,
  points_balance bigint not null default 0,
  estimated_cost_per_1000 numeric(10,2),
  expiration_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, program_id)
);
create index ulp_user_idx on public.user_loyalty_programs(user_id);

-- ---------------------------------------------------------------------
-- FLIGHT SEARCHES / RESULTS
-- ---------------------------------------------------------------------
create table public.flight_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  origin text not null,
  destination text not null,
  departure_date date,
  return_date date,
  cabin_class text not null default 'economica',
  passengers_adults int not null default 1,
  passengers_children int not null default 0,
  passengers_infants int not null default 0,
  flexible_dates boolean not null default false,
  created_at timestamptz not null default now()
);
create index flight_searches_user_idx on public.flight_searches(user_id, created_at desc);

create table public.flight_results (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.flight_searches(id) on delete cascade,
  provider text not null default 'mock',
  airline text not null,
  origin text not null,
  destination text not null,
  departure_datetime timestamptz not null,
  arrival_datetime timestamptz not null,
  duration_minutes int not null,
  stops int not null default 0,
  cash_price numeric(12,2),
  points_price bigint,
  taxes numeric(12,2) not null default 0,
  currency text not null default 'BRL',
  loyalty_program text,
  score int not null default 0,
  recommendation text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index flight_results_search_idx on public.flight_results(search_id);

-- ---------------------------------------------------------------------
-- HOTEL SEARCHES / RESULTS
-- ---------------------------------------------------------------------
create table public.hotel_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  city text not null,
  checkin date,
  checkout date,
  guests int not null default 2,
  rooms int not null default 1,
  created_at timestamptz not null default now()
);
create index hotel_searches_user_idx on public.hotel_searches(user_id, created_at desc);

create table public.hotel_results (
  id uuid primary key default gen_random_uuid(),
  search_id uuid not null references public.hotel_searches(id) on delete cascade,
  provider text not null default 'mock',
  hotel_name text not null,
  location text,
  rating numeric(3,1),
  stars int,
  cash_price numeric(12,2),
  points_price bigint,
  taxes numeric(12,2) not null default 0,
  currency text not null default 'BRL',
  loyalty_program text,
  cancellation_policy text,
  breakfast_included boolean not null default false,
  score int not null default 0,
  recommendation text,
  raw_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index hotel_results_search_idx on public.hotel_results(search_id);

-- ---------------------------------------------------------------------
-- ALERTS
-- ---------------------------------------------------------------------
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null default 'voo' check (type in ('voo','hotel','transferencia')),
  name text not null,
  origin text,
  destination text,
  city text,
  start_date date,
  end_date date,
  flexible_dates boolean not null default false,
  max_cash_price numeric(12,2),
  max_points_price bigint,
  loyalty_program text,
  cabin_class text,
  passengers int not null default 1,
  channel_email boolean not null default true,
  channel_whatsapp boolean not null default false,
  active boolean not null default true,
  check_frequency_hours int not null default 24,
  last_checked_at timestamptz,
  last_triggered_at timestamptz,
  created_at timestamptz not null default now()
);
create index alerts_user_idx on public.alerts(user_id);
create index alerts_active_idx on public.alerts(active) where active = true;

-- ---------------------------------------------------------------------
-- OPPORTUNITIES (vitrine pública, gerada pelo OpportunityEngine ou admin)
-- ---------------------------------------------------------------------
create table public.opportunities (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('voo','hotel','transferencia','pacote')),
  title text not null,
  description text,
  origin text,
  destination text,
  city text,
  cash_price numeric(12,2),
  points_price bigint,
  taxes numeric(12,2) not null default 0,
  loyalty_program text,
  score int not null default 0,
  recommendation text,
  featured boolean not null default false,
  expires_at timestamptz,
  source text not null default 'manual',
  affiliate_url text,
  affiliate_provider text,
  commission_type text,
  tracking_id text,
  created_at timestamptz not null default now()
);
create index opportunities_score_idx on public.opportunities(score desc);
create index opportunities_expires_idx on public.opportunities(expires_at);

-- ---------------------------------------------------------------------
-- PROMOTIONS (vitrine pública, gerenciada pelo admin)
-- ---------------------------------------------------------------------
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('transferencia_bonificada','compra_pontos','passagem','hotel','pacote','clube','cartao','cashback','cupom')),
  program text,
  bonus_percentage numeric(6,2),
  start_date date,
  end_date date,
  rules text,
  url text,
  score int not null default 0,
  status text not null default 'ativa' check (status in ('ativa','expirada','futura')),
  created_at timestamptz not null default now()
);
create index promotions_status_idx on public.promotions(status);

-- ---------------------------------------------------------------------
-- SUBSCRIPTIONS (Stripe) — plano/status NUNCA editável pelo usuário
-- ---------------------------------------------------------------------
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free','premium','pro','consultor')),
  status text not null default 'active' check (status in ('active','trialing','past_due','canceled')),
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- NOTIFICATION LOGS
-- ---------------------------------------------------------------------
create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  alert_id uuid references public.alerts(id) on delete set null,
  channel text not null check (channel in ('email','whatsapp','telegram','push')),
  message text,
  status text not null default 'sent' check (status in ('sent','failed','skipped')),
  sent_at timestamptz not null default now()
);
create index notification_logs_user_idx on public.notification_logs(user_id, sent_at desc);

-- ---------------------------------------------------------------------
-- AUDIT LOGS (ações relevantes — busca, alerta, promoção, erro de API)
-- ---------------------------------------------------------------------
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_logs_user_idx on public.audit_logs(user_id, created_at desc);

-- =====================================================================
-- RLS
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.loyalty_programs enable row level security;
alter table public.user_loyalty_programs enable row level security;
alter table public.flight_searches enable row level security;
alter table public.flight_results enable row level security;
alter table public.hotel_searches enable row level security;
alter table public.hotel_results enable row level security;
alter table public.alerts enable row level security;
alter table public.opportunities enable row level security;
alter table public.promotions enable row level security;
alter table public.subscriptions enable row level security;
alter table public.notification_logs enable row level security;
alter table public.audit_logs enable row level security;

-- Helper: é admin?
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where user_id = auth.uid() and role = 'admin'
  );
$$;

-- profiles: dono vê e edita o próprio; admin vê tudo.
-- IMPORTANTE: a policy de UPDATE cobre a linha inteira, mas o GRANT abaixo
-- restringe quais colunas o role authenticated pode de fato escrever —
-- "role" fica de fora, então não dá para se autopromover a admin.
create policy "profiles: select own or admin" on public.profiles
  for select using (user_id = auth.uid() or public.is_admin());
create policy "profiles: insert own" on public.profiles
  for insert with check (user_id = auth.uid());
create policy "profiles: update own" on public.profiles
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke update on public.profiles from authenticated;
grant update (
  full_name, email, phone, home_airport, favorite_destinations,
  cabin_class_preference, flexible_dates, monthly_budget,
  notify_email, notify_whatsapp, preferred_currency, language, timezone,
  onboarding_done, updated_at
) on public.profiles to authenticated;

-- loyalty_programs: leitura pública (autenticado), escrita só admin.
create policy "loyalty_programs: read all authenticated" on public.loyalty_programs
  for select using (auth.role() = 'authenticated');
create policy "loyalty_programs: admin write" on public.loyalty_programs
  for insert with check (public.is_admin());
create policy "loyalty_programs: admin update" on public.loyalty_programs
  for update using (public.is_admin()) with check (public.is_admin());
create policy "loyalty_programs: admin delete" on public.loyalty_programs
  for delete using (public.is_admin());

-- user_loyalty_programs: só o dono.
create policy "ulp: owner all" on public.user_loyalty_programs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- flight_searches: só o dono.
create policy "flight_searches: owner all" on public.flight_searches
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- flight_results: visível/gerenciável se a busca pertence ao usuário.
create policy "flight_results: owner via search" on public.flight_results
  for all using (
    exists (select 1 from public.flight_searches s where s.id = search_id and s.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.flight_searches s where s.id = search_id and s.user_id = auth.uid())
  );

-- hotel_searches: só o dono.
create policy "hotel_searches: owner all" on public.hotel_searches
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- hotel_results: visível/gerenciável se a busca pertence ao usuário.
create policy "hotel_results: owner via search" on public.hotel_results
  for all using (
    exists (select 1 from public.hotel_searches s where s.id = search_id and s.user_id = auth.uid())
  )
  with check (
    exists (select 1 from public.hotel_searches s where s.id = search_id and s.user_id = auth.uid())
  );

-- alerts: só o dono; admin pode ler todos (painel de operação).
create policy "alerts: owner all" on public.alerts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "alerts: admin read all" on public.alerts
  for select using (public.is_admin());

-- opportunities: leitura pública (autenticado), escrita só admin.
create policy "opportunities: read all authenticated" on public.opportunities
  for select using (auth.role() = 'authenticated');
create policy "opportunities: admin write" on public.opportunities
  for insert with check (public.is_admin());
create policy "opportunities: admin update" on public.opportunities
  for update using (public.is_admin()) with check (public.is_admin());
create policy "opportunities: admin delete" on public.opportunities
  for delete using (public.is_admin());

-- promotions: leitura pública (autenticado), escrita só admin.
create policy "promotions: read all authenticated" on public.promotions
  for select using (auth.role() = 'authenticated');
create policy "promotions: admin write" on public.promotions
  for insert with check (public.is_admin());
create policy "promotions: admin update" on public.promotions
  for update using (public.is_admin()) with check (public.is_admin());
create policy "promotions: admin delete" on public.promotions
  for delete using (public.is_admin());

-- subscriptions: dono só LÊ. Escrita (insert/update) é só service_role
-- (Stripe webhook), que ignora RLS — por isso não existe policy de
-- insert/update aqui para authenticated.
create policy "subscriptions: read own" on public.subscriptions
  for select using (user_id = auth.uid());

-- notification_logs: dono só lê; admin lê tudo; inserção é feita por service_role (cron/webhook).
create policy "notification_logs: read own" on public.notification_logs
  for select using (user_id = auth.uid());
create policy "notification_logs: admin read all" on public.notification_logs
  for select using (public.is_admin());

-- audit_logs: dono só lê o que é dele; admin lê tudo. Inserção via server actions (usuário autenticado pode logar a própria ação).
create policy "audit_logs: read own or admin" on public.audit_logs
  for select using (user_id = auth.uid() or public.is_admin());
create policy "audit_logs: insert own" on public.audit_logs
  for insert with check (user_id = auth.uid());

-- =====================================================================
-- Trigger: novo usuário → profile + subscription free
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  display_name text;
begin
  display_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));

  insert into public.profiles (user_id, full_name, email)
  values (new.id, display_name, new.email);

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at automático
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger ulp_touch before update on public.user_loyalty_programs
  for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();
