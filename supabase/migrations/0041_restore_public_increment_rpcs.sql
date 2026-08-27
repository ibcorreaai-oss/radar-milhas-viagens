-- Reverte a migration 0040 (mesmo dia, 27/08/2026). A 0040 revogou EXECUTE
-- público das 2 RPCs de contador anti-abuso e trocou app/contato/actions.ts
-- + app/home-chat-actions.ts pra chamar via createAdminClient() (service
-- role). Testado ao vivo em produção logo depois do deploy: o formulário de
-- contato real quebrou — "Error: Supabase admin: faltam ...
-- SUPABASE_SERVICE_ROLE_KEY no ambiente." SUPABASE_SERVICE_ROLE_KEY NÃO
-- está configurada em produção neste projeto (ao contrário do que a
-- evidência indireta — o webhook Stripe funcionando — parecia indicar; o
-- webhook nunca tinha de fato exercitado o caminho que usa o admin client,
-- porque nenhum checkout foi concluído até agora, só a validação de
-- assinatura foi testada). Revertido pra restaurar o formulário/chat
-- público. O achado de segurança (RPC chamável direto por anon com e-mail
-- arbitrário) continua real e documentado em MANUAL_ACTIONS.md — reabrir
-- a correção (idêntica à da 0040) assim que SUPABASE_SERVICE_ROLE_KEY for
-- preenchida na Vercel.
grant execute on function public.increment_contact_message_count(text) to anon, authenticated;
grant execute on function public.increment_home_chat_message_count(text) to anon, authenticated;
