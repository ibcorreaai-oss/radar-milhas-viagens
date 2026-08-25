-- ETAPA 6 (qualidade de dados): fecha lacunas reais achadas na auditoria.
-- Tudo aditivo — nenhuma coluna/tabela removida, só constraints novas. Todo
-- código que já escreve nessas tabelas (OpportunityEngine, actions do
-- admin) já respeita essas faixas, então não deveria haver linha existente
-- violando o CHECK — mas se houver, a migration falha e avisa em vez de
-- silenciosamente aceitar dado inválido (é o comportamento certo).

-- loyalty_programs.name sem unique era o gap mais sério: hoteis/actions.ts,
-- voos/actions.ts e o cron check-alerts casam `loyalty_program` (texto
-- vindo do provider) contra loyalty_programs.name pra achar o milheiro
-- médio — dois programas com o mesmo nome tornam esse casamento ambíguo
-- (Map por nome fica com qualquer um dos dois, silenciosamente).
alter table public.loyalty_programs
  add constraint loyalty_programs_name_key unique (name);

alter table public.loyalty_programs
  add constraint loyalty_programs_mile_value_nonnegative check (average_mile_value >= 0);

-- Score 0-100 já era um CHECK em world_events (0002) mas não nas 4 tabelas
-- de 0001 que também têm score — inconsistência entre as duas migrations,
-- não só ausência de validação.
alter table public.flight_results add constraint flight_results_score_range check (score between 0 and 100);
alter table public.hotel_results add constraint hotel_results_score_range check (score between 0 and 100);
alter table public.opportunities add constraint opportunities_score_range check (score between 0 and 100);
alter table public.promotions add constraint promotions_score_range check (score between 0 and 100);

-- Saldo de pontos negativo não faz sentido de negócio — o app já clampa em
-- >= 0 (app/(app)/perfil/actions.ts), isto é defesa em profundidade.
alter table public.user_loyalty_programs
  add constraint user_loyalty_programs_balance_nonnegative check (points_balance >= 0);

alter table public.promotions
  add constraint promotions_bonus_nonnegative check (bonus_percentage is null or bonus_percentage >= 0);
