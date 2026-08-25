-- ETAPA 15.2 (revisão adversarial pós-etapa) — achado real: bloquear uma
-- conta (profiles.blocked_at) não revoga a sessão/JWT já emitida (nenhum
-- signOut() é chamado do lado do servidor — lib/auth-block.ts só CLASSIFICA
-- o status, e app/(app)/layout.tsx troca a renderização, ver
-- components/blocked-account-screen.tsx pro único signOut() real, que
-- depende do CLIENT rodar o efeito). Um usuário bloqueado com sessão ainda
-- válida pode chamar a REST API do Supabase direto (anon key pública +
-- JWT dele mesmo, ambos já expostos no browser) e ler/escrever as PRÓPRIAS
-- linhas de favorites/lesson_progress — RLS ainda permite, porque as
-- policies "owner all" dessas duas tabelas só checam `user_id = auth.uid()`,
-- nunca `blocked_at`. is_admin()/is_super_admin() já tinham sido corrigidas
-- pra isso na 0012 (blocked_account_enforcement) — nunca generalizado pras
-- tabelas de escrita direta do usuário comum. Toda a aplicação (Server
-- Actions) já checa isBlocked() antes de escrever nessas tabelas — isto
-- fecha a MESMA garantia na camada de banco, pra não depender só do app
-- nunca ter um bug de esquecimento (como o achado separadamente em
-- app/(app)/treinamentos/actions.ts nesta mesma revisão).
create or replace function public.is_blocked()
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and blocked_at is not null
  );
$$;

drop policy "favorites: owner all" on public.favorites;
create policy "favorites: owner all" on public.favorites
  for all using (user_id = auth.uid() and not public.is_blocked())
  with check (user_id = auth.uid() and not public.is_blocked());

drop policy "lesson_progress: owner all" on public.lesson_progress;
create policy "lesson_progress: owner all" on public.lesson_progress
  for all using (user_id = auth.uid() and not public.is_blocked())
  with check (user_id = auth.uid() and not public.is_blocked());
