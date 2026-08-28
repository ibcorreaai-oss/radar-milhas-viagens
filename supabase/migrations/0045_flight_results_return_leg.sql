-- Suporte a perna de volta (ida-e-volta) em flight_results. Até aqui o
-- schema só modelava uma perna (ida) — correto pro MVP (mock nunca
-- diferenciava) e para SerpApiFlightProvider one-way. Agora que a busca
-- real de ida-e-volta usa o fluxo de 2 passos da Google Flights API
-- (departure_token), a perna de volta tem dados reais próprios (horário,
-- duração, paradas) que precisam de colunas dedicadas — nunca reaproveitar
-- as colunas de ida pra volta, isso corromperia o dado da ida.
-- Nullable: resultado de busca só-ida continua sem nenhum dado de volta.
alter table public.flight_results
  add column return_departure_datetime timestamptz,
  add column return_arrival_datetime timestamptz,
  add column return_duration_minutes int,
  add column return_stops int;
