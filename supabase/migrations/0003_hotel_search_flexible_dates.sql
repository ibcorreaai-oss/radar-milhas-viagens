-- Paridade com flight_searches.flexible_dates: o formulário de busca de
-- hotéis (site inteiro, inclusive o hero da home) agora tem o mesmo toggle
-- "Minhas datas são flexíveis" que já existia em voos. Aditiva, sem RLS nova
-- (a policy "hotel_searches: owner all" de 0001_schema.sql já cobre a coluna).

alter table public.hotel_searches
  add column if not exists flexible_dates boolean not null default false;
