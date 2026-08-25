-- ETAPA 15.1 -- achado revisando antes do fim da etapa: admin_set_user_role
-- (0011_super_admin_rbac.sql) tinha uma condicao de corrida classica
-- check-then-act. Se dois super_admins diferentes chamassem a funcao ao
-- mesmo tempo pra rebaixar dois OUTROS super_admins diferentes, as duas
-- transacoes podiam contar "resta pelo menos 1 outro super_admin" (a
-- contagem de cada uma nao via o rebaixamento da outra, ainda nao
-- commitada) e as duas seguirem em frente -- resultado: sistema sem
-- nenhum super_admin ativo, exatamente o que a funcao existe pra impedir.
-- Fix: `for update` trava as linhas de super_admin ANTES de contar,
-- serializando as duas transacoes concorrentes (a segunda espera a
-- primeira commitar e ve a contagem ja atualizada).
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
    -- Trava TODAS as linhas de super_admin antes de contar -- uma segunda
    -- chamada concorrente (rebaixando outro super_admin) bloqueia aqui ate
    -- esta transacao terminar, em vez de contar em paralelo com dado
    -- desatualizado.
    perform 1 from public.profiles where role = 'super_admin' for update;

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
