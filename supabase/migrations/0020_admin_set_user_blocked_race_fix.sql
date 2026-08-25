-- ETAPA 15.2 (revisão adversarial pós-etapa) -- achado real: admin_set_user_blocked
-- lia target_current_role (0011_super_admin_rbac.sql linha 117) sem travar a
-- linha antes de decidir, na linha 128, se dá pra bloquear um super_admin --
-- exatamente a mesma forma de corrida check-then-act que 0016 corrigiu com
-- `for update` na funcao irma admin_set_user_role, mas nunca generalizada
-- pra esta. Cenario: admin_set_user_role promove um usuario a super_admin ao
-- mesmo tempo que outra chamada tenta bloquear esse MESMO usuario -- a
-- leitura antiga (antes da promocao) deixa passar o check da linha 128, e o
-- update da linha 132 acaba bloqueando quem virou super_admin, violando a
-- garantia que a propria funcao existe pra proteger.
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

  -- `for update` trava a linha do alvo ANTES de ler o role -- uma promocao
  -- concorrente via admin_set_user_role (que tambem trava linhas de
  -- profiles) espera esta transacao terminar em vez de rodar com dado
  -- desatualizado.
  select role into target_current_role from public.profiles where user_id = target_user_id for update;
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
