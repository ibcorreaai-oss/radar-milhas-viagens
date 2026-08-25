-- ETAPA 15.1 -- achado antes mesmo de terminar a etapa (revisando o
-- proprio codigo): contact_messages so tem policy de INSERT publico e
-- SELECT admin-only ("contact_messages: admin read all"). O select direto
-- que app/home-chat-actions.ts fazia pra contar conversas recentes por
-- e-mail (limite anti-abuso) SEMPRE retornava 0 pra um visitante anonimo
-- -- a RLS bloqueia silenciosamente, entao o limite nunca funcionava de
-- verdade. RPC security definer resolve sem abrir uma policy de SELECT
-- pra anon (que exporia toda mensagem de contato de qualquer um).
create or replace function public.count_recent_home_chat_leads(target_email text)
returns integer
language sql stable security definer set search_path = public
as $$
  select count(*)::integer from public.contact_messages
  where source = 'home_ai_chat' and email = target_email and created_at > now() - interval '1 day';
$$;

-- anon PRECISA poder chamar -- e exatamente quem usa o chat publico da
-- home (sem sessao). So devolve um numero, nada de conteudo de mensagem.
revoke all on function public.count_recent_home_chat_leads(text) from public;
grant execute on function public.count_recent_home_chat_leads(text) to anon, authenticated;
