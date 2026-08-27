-- Achado real em /code-review high (revisão geral de 27/08/2026): a migration
-- 0021 (ETAPA 15.2) criou is_blocked() e aplicou só em favorites/lesson_progress
-- -- nunca generalizada pras outras 7 tabelas de escrita direta do usuário
-- comum que usam o mesmo padrão bare `user_id = auth.uid()`. Sem isso, uma
-- conta bloqueada com sessão/JWT ainda válida (bloquear não revoga token,
-- só um efeito client-side chama signOut()) consegue ler/escrever essas
-- tabelas direto via REST API do Supabase, ignorando toda checagem
-- isBlocked() da camada de app -- exatamente a classe de vulnerabilidade que
-- a 0021 dizia fechar, mas não tinha fechado por completo.

drop policy "alerts: owner all" on public.alerts;
create policy "alerts: owner all" on public.alerts
  for all using (user_id = auth.uid() and not public.is_blocked())
  with check (user_id = auth.uid() and not public.is_blocked());

drop policy "bucket_lists: owner all" on public.bucket_lists;
create policy "bucket_lists: owner all" on public.bucket_lists
  for all using (user_id = auth.uid() and not public.is_blocked())
  with check (user_id = auth.uid() and not public.is_blocked());

-- bucket_list_items já herdaria a proteção indiretamente (a policy dela faz
-- EXISTS contra bucket_lists, que agora também exclui dono bloqueado), mas
-- fica explícito aqui também -- defesa em profundidade, sem depender de RLS
-- aninhada funcionar do jeito esperado.
drop policy "bucket_list_items: owner via list" on public.bucket_list_items;
create policy "bucket_list_items: owner via list" on public.bucket_list_items
  for all using (
    not public.is_blocked()
    and exists (select 1 from public.bucket_lists bl where bl.id = bucket_list_items.bucket_list_id and bl.user_id = auth.uid())
  )
  with check (
    not public.is_blocked()
    and exists (select 1 from public.bucket_lists bl where bl.id = bucket_list_items.bucket_list_id and bl.user_id = auth.uid())
  );

drop policy "flight_searches: owner all" on public.flight_searches;
create policy "flight_searches: owner all" on public.flight_searches
  for all using (user_id = auth.uid() and not public.is_blocked())
  with check (user_id = auth.uid() and not public.is_blocked());

drop policy "hotel_searches: owner all" on public.hotel_searches;
create policy "hotel_searches: owner all" on public.hotel_searches
  for all using (user_id = auth.uid() and not public.is_blocked())
  with check (user_id = auth.uid() and not public.is_blocked());

-- trips mantém a policy separada "trips: public read when shared" intacta
-- (leitura pública de viagem compartilhada não depende de quem é o dono).
drop policy "trips: owner all" on public.trips;
create policy "trips: owner all" on public.trips
  for all using (user_id = auth.uid() and not public.is_blocked())
  with check (user_id = auth.uid() and not public.is_blocked());

drop policy "ulp: owner all" on public.user_loyalty_programs;
create policy "ulp: owner all" on public.user_loyalty_programs
  for all using (user_id = auth.uid() and not public.is_blocked())
  with check (user_id = auth.uid() and not public.is_blocked());
