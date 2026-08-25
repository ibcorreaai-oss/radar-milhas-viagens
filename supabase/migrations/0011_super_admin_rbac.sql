-- ETAPA 15.0 -- Super Admin / Platform Admin / RBAC global.
-- Ver PLATFORM_ADMIN.md para o raciocinio completo (por que nao existe
-- conceito de "tenant" neste produto, por que role change e RPC em vez de
-- service_role, etc). Sem acentuacao nas mensagens de erro/comentarios SQL
-- de proposito -- mesma convencao das migrations anteriores que tocam em
-- texto que pode aparecer em log/erro do Postgres.

-- ---------------------------------------------------------------------
-- 1. Novo nivel de role, acima de 'admin' (nunca ao lado -- este produto
--    nao e multi-tenant, nao existe "tenant admin" pra distinguir).
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user', 'admin', 'super_admin'));

-- Suspensao de conta (equivalente a auth.users.banned_until, mas sem
-- depender de SUPABASE_SERVICE_ROLE_KEY/Admin API -- este projeto ja roda
-- sem essa chave configurada, ver MANUAL_ACTIONS.md). Checado em
-- lib/auth.ts (getUserContext) e no momento do login.
alter table public.profiles add column blocked_at timestamptz;
alter table public.profiles add column blocked_reason text;

-- ---------------------------------------------------------------------
-- 2. is_admin() passa a cobrir super_admin tambem -- super_admin pode
--    fazer TUDO que admin ja fazia (nenhuma policy existente precisa ser
--    duplicada ou reescrita, so a funcao central).
-- ---------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where user_id = auth.uid() and role in ('admin', 'super_admin')
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where user_id = auth.uid() and role = 'super_admin'
  );
$$;

revoke execute on function public.is_super_admin() from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Alterar role/bloqueio e RPC security definer, nao Server Action com
--    service_role -- profiles.role ja nao e grantavel a `authenticated`
--    (ver 0001_schema.sql), entao nenhum client autenticado consegue
--    escrever ali por nenhum caminho alem destas funcoes, mesmo com RLS
--    mal configurada por engano no futuro. A funcao roda com o privilegio
--    de quem a definiu (dono da tabela), nao do caller -- por isso
--    dispensa SUPABASE_SERVICE_ROLE_KEY (que este projeto nem tem
--    preenchido ainda) so pra essa operacao.
-- ---------------------------------------------------------------------
create or replace function public.admin_set_user_role(target_user_id uuid, new_role text)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_current_role text;
  remaining_super_admins int;
begin
  if not public.is_super_admin() then
    raise exception 'Apenas super_admin pode alterar roles.' using errcode = '42501';
  end if;

  if new_role not in ('user', 'admin', 'super_admin') then
    raise exception 'Role invalida: %', new_role using errcode = '22023';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Voce nao pode alterar a propria role.' using errcode = '42501';
  end if;

  select role into target_current_role from public.profiles where user_id = target_user_id;
  if target_current_role is null then
    raise exception 'Usuario nao encontrado.' using errcode = 'P0002';
  end if;

  if target_current_role = 'super_admin' and new_role <> 'super_admin' then
    select count(*) into remaining_super_admins
    from public.profiles
    where role = 'super_admin' and user_id <> target_user_id;

    if remaining_super_admins = 0 then
      raise exception 'Nao e possivel remover o unico super_admin do sistema.' using errcode = '42501';
    end if;
  end if;

  update public.profiles set role = new_role where user_id = target_user_id;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public, anon;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

create or replace function public.admin_set_user_blocked(target_user_id uuid, blocked boolean, reason text default null)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  target_current_role text;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem bloquear/desbloquear usuarios.' using errcode = '42501';
  end if;

  if target_user_id = auth.uid() then
    raise exception 'Voce nao pode bloquear a propria conta.' using errcode = '42501';
  end if;

  select role into target_current_role from public.profiles where user_id = target_user_id;
  if target_current_role is null then
    raise exception 'Usuario nao encontrado.' using errcode = 'P0002';
  end if;

  -- so super_admin bloqueia outro admin/super_admin -- um admin comum nao
  -- pode silenciar outro admin nem o administrador principal.
  if target_current_role in ('admin', 'super_admin') and not public.is_super_admin() then
    raise exception 'Apenas super_admin pode bloquear um administrador.' using errcode = '42501';
  end if;

  if target_current_role = 'super_admin' and blocked then
    raise exception 'O super_admin nao pode ser bloqueado.' using errcode = '42501';
  end if;

  update public.profiles
  set blocked_at = case when blocked then now() else null end,
      blocked_reason = case when blocked then reason else null end
  where user_id = target_user_id;
end;
$$;

revoke all on function public.admin_set_user_blocked(uuid, boolean, text) from public, anon;
grant execute on function public.admin_set_user_blocked(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Bootstrap do Administrador Principal -- idempotente e sem senha: so
--    tem efeito se a conta ja existir (0 linhas afetadas se ainda nao
--    existir, sem erro). Ver PLATFORM_ADMIN.md SS5 -- o Igor precisa criar
--    a propria conta normalmente por /cadastro (ou /login com Google)
--    ANTES desta linha ter efeito; se rodar antes, e reexecutada
--    manualmente depois (mesmo padrao ja usado neste projeto pro primeiro
--    'admin', ver README.md item 1).
-- ---------------------------------------------------------------------
update public.profiles set role = 'super_admin'
where email = 'ibcorrea@hotmail.com' and role <> 'super_admin';
