-- Achado em /code-review high (revisão geral de 27/08/2026): as RPCs
-- increment_contact_message_count/increment_home_chat_message_count tinham
-- EXECUTE liberado pra anon/authenticated (migrations 0019/0023) —
-- qualquer um com a anon key pública podia chamar
-- /rest/v1/rpc/increment_contact_message_count (ou a irmã do chat) direto
-- via PostgREST, com QUALQUER e-mail, sem nunca passar pelo formulário/
-- widget real — um jeito barato de negar contato/chat público pra um
-- e-mail de terceiro (maxar o contador dele antes da vítima usar de
-- verdade). As duas Server Actions que legitimamente usam essas RPCs
-- (app/contato/actions.ts, app/home-chat-actions.ts) foram trocadas pra
-- chamar via createAdminClient() (service_role, só server-side) no mesmo
-- commit desta migration — revogar o EXECUTE público não quebra nada.
revoke execute on function public.increment_contact_message_count(text) from anon, authenticated;
revoke execute on function public.increment_home_chat_message_count(text) from anon, authenticated;
