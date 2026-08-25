-- ETAPA 14 (auth/admin): favoritos do usuário + storage de mídia do admin.
-- Ver AUTH_AND_ADMIN.md §5 e §8 para o raciocínio completo.

-- ---------------------------------------------------------------------
-- FAVORITES — "guardar rápido" de promoção ou programa, distinto de
-- alerts (critério de busca) e bucket_lists (desejo de viagem futura).
-- ---------------------------------------------------------------------
create table public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (item_type in ('promotion', 'loyalty_program')),
  item_id uuid not null,
  created_at timestamptz not null default now(),
  unique (user_id, item_type, item_id)
);
create index favorites_user_idx on public.favorites(user_id);

alter table public.favorites enable row level security;

create policy "favorites: owner all" on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------------
-- STORAGE — bucket público de mídia de conteúdo admin (hoje só a imagem
-- de capa de world_events; ver AUTH_AND_ADMIN.md §5 sobre por que não há
-- upload de vídeo/documento neste produto). Leitura pública porque as
-- imagens aparecem para qualquer visitante em /descobrir; escrita só admin.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('event-media', 'event-media', true)
on conflict (id) do nothing;

create policy "event-media: public read"
  on storage.objects for select
  using (bucket_id = 'event-media');

create policy "event-media: admin insert"
  on storage.objects for insert
  with check (bucket_id = 'event-media' and public.is_admin());

create policy "event-media: admin update"
  on storage.objects for update
  using (bucket_id = 'event-media' and public.is_admin())
  with check (bucket_id = 'event-media' and public.is_admin());

create policy "event-media: admin delete"
  on storage.objects for delete
  using (bucket_id = 'event-media' and public.is_admin());
