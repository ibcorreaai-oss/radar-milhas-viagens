-- ETAPA 15.2 (revisão adversarial pós-etapa) — achado real: askPublicAssistant só
-- checava o limite anti-abuso quando o client mandava `history.length === 0`, mas
-- history é um array que o PRÓPRIO client controla. Quem chama a Server Action
-- direto (fora do widget) sempre manda um array curto forjado e nunca cai no
-- limite nem no MAX_HISTORY de verdade — chamadas ilimitadas e grátis à Anthropic
-- por um endpoint sem autenticação. Fix: contador atômico por e-mail/dia, no
-- banco, checado em TODA mensagem (não só na "primeira"), sem depender de nada
-- que o client informe.
create table public.home_chat_message_counts (
  email text not null,
  day date not null default current_date,
  count int not null default 0,
  primary key (email, day)
);

alter table public.home_chat_message_counts enable row level security;
-- Sem policy de select/insert/update pra nenhum role — só a RPC abaixo
-- (security definer) mexe nesta tabela; nem admin precisa consultar direto.

create or replace function public.increment_home_chat_message_count(target_email text)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  new_count int;
begin
  insert into public.home_chat_message_counts (email, day, count)
  values (lower(target_email), current_date, 1)
  on conflict (email, day) do update set count = home_chat_message_counts.count + 1
  returning count into new_count;
  return new_count;
end;
$$;

revoke all on function public.increment_home_chat_message_count(text) from public;
grant execute on function public.increment_home_chat_message_count(text) to anon, authenticated;
