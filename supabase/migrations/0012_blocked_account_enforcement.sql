-- ETAPA 15.1 -- fecha lacuna achada em revisao adversarial: bloquear uma
-- conta so atualizava a coluna e derrubava a UI (app/(app)/layout.tsx),
-- mas is_admin()/is_super_admin() -- usadas por TODA policy de RLS e
-- pelas RPCs admin_set_user_role/admin_set_user_blocked -- nunca checavam
-- blocked_at. Isso significa que uma sessao ja aberta (cookie ainda
-- valido) de um admin recem-bloqueado continuava passando em toda policy
-- is_admin()-gated e em ambas as RPCs, mesmo depois do bloqueio. Ver
-- PLATFORM_ADMIN.md.

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role in ('admin', 'super_admin') and blocked_at is null
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'super_admin' and blocked_at is null
  );
$$;
