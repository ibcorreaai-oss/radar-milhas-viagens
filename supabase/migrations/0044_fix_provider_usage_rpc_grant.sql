-- Mesmo padrão já corrigido em 0040/0042 para increment_contact_message_count/
-- increment_home_chat_message_count: `revoke all ... from public` sozinho NÃO
-- bloqueia anon/authenticated (Supabase concede EXECUTE direto pra esses
-- roles em função nova via default privileges, não só via `public`) —
-- confirmado pelo advisor de segurança logo após aplicar 0043
-- (anon_security_definer_function_executable/authenticated_...). Revoga
-- citando os roles explicitamente, igual ao fix definitivo já usado ali.
revoke execute on function public.increment_provider_usage(text, text, int) from anon, authenticated;
