-- ETAPA 12: achado pelo Supabase Security Advisor logo após a criação do
-- projeto (get_advisors). Dois problemas reais, ambos aditivos/sem impacto
-- de comportamento:
--
-- 1. touch_updated_at() não fixava search_path — função SECURITY DEFINER-
--    like (roda em trigger) com search_path mutável pode ser sequestrada
--    por um schema malicioso na frente de "public" no path da sessão.
-- 2. handle_new_user() e is_admin() (SECURITY DEFINER) eram executáveis via
--    RPC direto (/rest/v1/rpc/...) por anon/authenticated. Só handle_new_user()
--    é revogada aqui: é gatilho puro (AFTER INSERT em auth.users), nenhum
--    papel deveria chamá-la fora do trigger, e a execução do trigger em si
--    NÃO depende de GRANT EXECUTE do role conectado. is_admin() por outro
--    lado é chamada DENTRO das próprias policies de RLS (profiles, alerts,
--    audit_logs etc.) — quem avalia a policy é o role "authenticated"
--    conectado, que PRECISA de EXECUTE nela; revogar quebraria toda
--    checagem de admin no app. Fica como warning aceito (só leitura de
--    auth.uid(), sem risco real).
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- CREATE FUNCTION concede EXECUTE a PUBLIC por padrão — anon/authenticated
-- herdam via PUBLIC, então o revoke precisa mirar PUBLIC, não os roles
-- individualmente (grants explícitos de postgres/service_role continuam
-- intactos, então o trigger e chamadas administrativas não são afetados).
revoke execute on function public.handle_new_user() from public;
