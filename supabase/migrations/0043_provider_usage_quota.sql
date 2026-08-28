-- SerpApi Google Flights (lib/providers/serpapi-flight-provider.ts) roda no
-- plano Free da SerpApi: 250 buscas/mes, sem cartao cadastrado -- estourar a
-- cota so faz a SerpApi recusar a chamada (nunca cobra nada), mas sem guarda
-- proativa o app tentaria a API real a cada busca e só descobriria o estouro
-- depois de gastar o round-trip de rede. Contador mensal atomico, mesmo
-- padrao ja usado em increment_home_chat_message_count/
-- increment_contact_message_count (0019/0023): RPC security definer, sem
-- policy de leitura/escrita direta na tabela, EXECUTE nunca concedido a
-- anon/authenticated -- so createAdminClient() (server-side) chama.
create table public.provider_usage_monthly (
  provider text not null,
  year_month text not null, -- 'YYYY-MM' (UTC)
  request_count int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (provider, year_month)
);

alter table public.provider_usage_monthly enable row level security;
-- Sem policy nenhuma -- só a RPC abaixo (security definer) mexe nesta
-- tabela, nem admin precisa consultar direto.

create or replace function public.increment_provider_usage(p_provider text, p_year_month text, p_cap int)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  new_count int;
begin
  insert into public.provider_usage_monthly (provider, year_month, request_count)
  values (p_provider, p_year_month, 1)
  on conflict (provider, year_month)
  do update set request_count = provider_usage_monthly.request_count + 1, updated_at = now()
  returning request_count into new_count;

  -- true = ainda dentro da cota (chamada de agora incluida no count).
  return new_count <= p_cap;
end;
$$;

revoke all on function public.increment_provider_usage(text, text, int) from public;
