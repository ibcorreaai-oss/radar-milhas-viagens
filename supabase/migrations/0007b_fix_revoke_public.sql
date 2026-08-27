-- Recuperado do histórico real do Supabase (supabase_migrations.schema_migrations)
-- na revisão geral de 27/08/2026 — esta migration foi aplicada no banco real em
-- 25/08 (mesmo dia da 0007), mas o arquivo nunca chegou a ser commitado no repo:
-- drift real entre o que está rodando em produção e o que o repositório descreve.
-- Recuperado via SQL (coluna `statements`), não recriado de memória.

revoke execute on function public.handle_new_user() from public;
