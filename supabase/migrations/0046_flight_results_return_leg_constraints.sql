-- Achado em code-review (feature/serpapi-round-trip): as colunas de perna
-- de volta adicionadas na migration 0045 não tinham nenhuma checagem, ao
-- contrário de 0004_data_quality_constraints.sql pra dado derivado
-- semelhante. Mesmo espírito de defesa em profundidade: o código de
-- verdade já não deveria gravar volta antes da ida nem duração/paradas
-- negativas, mas sem CHECK nada no banco impede isso se um bug futuro
-- (provider novo, edição manual) escrever esse dado inválido.
alter table public.flight_results
  add constraint flight_results_return_duration_nonnegative
  check (return_duration_minutes is null or return_duration_minutes >= 0);

alter table public.flight_results
  add constraint flight_results_return_stops_nonnegative
  check (return_stops is null or return_stops >= 0);

alter table public.flight_results
  add constraint flight_results_return_after_outbound
  check (return_departure_datetime is null or return_departure_datetime > arrival_datetime);
