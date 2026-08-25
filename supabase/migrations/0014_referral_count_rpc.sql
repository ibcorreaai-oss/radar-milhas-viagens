-- ETAPA 15.1 -- contar quantas pessoas um usuario indicou nao pode ser um
-- select direto em profiles filtrando por referred_by_user_id: a RLS
-- "profiles: select own or admin" bloquearia essas linhas (sao de OUTRAS
-- pessoas), e abrir uma policy nova pra esse filtro exporia a linha
-- inteira do indicado (nome, telefone, preferencias, role) pro
-- indicador -- vazamento de privacidade so pra mostrar uma contagem.
-- RPC security definer devolve so o numero, mesmo padrao de
-- is_admin()/is_super_admin() (0011_super_admin_rbac.sql).
create or replace function public.count_my_referrals()
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::integer from public.profiles where referred_by_user_id = auth.uid();
$$;

revoke all on function public.count_my_referrals() from public, anon;
grant execute on function public.count_my_referrals() to authenticated;
