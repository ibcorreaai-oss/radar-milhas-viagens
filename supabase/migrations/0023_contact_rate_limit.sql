-- ETAPA 19 (auditoria de segurança pré-deploy) -- achado real:
-- app/contato/actions.ts (endpoint público, sem autenticacao) so tinha
-- honeypot contra bot, nenhum throttle de verdade -- um script podia
-- inundar contact_messages e (quando RESEND_API_KEY for configurado) a
-- caixa de OPS_ALERT_EMAIL. Mesmo padrao ja usado pro rate limit do chat
-- publico (0019_home_chat_message_counter.sql): contador atomico por
-- e-mail/dia, via RPC security definer -- a policy de contact_messages so
-- permite INSERT pra anon/authenticated, nunca SELECT (0006), entao um
-- COUNT(*) direto do client nem funcionaria sem isso.

create table public.contact_message_counts (
  email text not null,
  day date not null default current_date,
  count int not null default 0,
  primary key (email, day)
);

alter table public.contact_message_counts enable row level security;
-- Sem policy de select/insert/update pra nenhum role -- so a RPC abaixo
-- (security definer) mexe nesta tabela.

-- Retorna o novo total do dia; a Server Action decide o limite (nao
-- hardcoded aqui, pra dar pra ajustar sem migration nova).
create or replace function public.increment_contact_message_count(target_email text)
returns int
language plpgsql
security definer set search_path = public
as $$
declare
  new_count int;
begin
  insert into public.contact_message_counts (email, day, count)
  values (lower(target_email), current_date, 1)
  on conflict (email, day) do update set count = contact_message_counts.count + 1
  returning count into new_count;
  return new_count;
end;
$$;

revoke all on function public.increment_contact_message_count(text) from public;
grant execute on function public.increment_contact_message_count(text) to anon, authenticated;
