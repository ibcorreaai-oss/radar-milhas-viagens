-- Reaplica a migration 0040 (revertida na 0041 por falta de
-- SUPABASE_SERVICE_ROLE_KEY em produção). O Igor configurou a chave na
-- Vercel em 27/08 e o fix foi confirmado ao vivo (submissão real do
-- formulário de /contato retornou sucesso usando createAdminClient()).
-- Revoga o EXECUTE público de novo — só o service_role (via
-- createAdminClient(), usado nas Server Actions de app/contato/actions.ts
-- e app/home-chat-actions.ts) consegue chamar essas RPCs agora.
revoke execute on function public.increment_contact_message_count(text) from anon, authenticated;
revoke execute on function public.increment_home_chat_message_count(text) from anon, authenticated;
