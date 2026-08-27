-- Corrige 3 problemas achados numa revisão de código (/code-review high,
-- 27/08/2026) sobre a migration 0035_fix_world_events_dates.sql:
--
-- 1. Aquela migration mudou start_date/end_date via UPDATE cru, sem passar
--    pelo motor de score (lib/scoring/event-score.ts) — violando o
--    invariante do próprio app (app/(app)/admin/eventos/actions.ts:
--    "Score e Book Now State são sempre calculados pelo motor... pra nunca
--    divergir da explicação mostrada ao usuário"). experience_score/
--    book_now_state ficaram desatualizados em relação à data nova.
-- 2. Bumped last_checked_at mas não last_changed_at, mesmo com dado
--    (start_date/end_date/description) realmente mudando — quebra a
--    distinção que o resto do app usa entre "confirmei que segue certo"
--    (last_checked_at) e "o dado mudou de verdade" (last_changed_at).
-- 3. Fazia UPDATE por `title`, que não é unique (só `slug` é) — funcionou
--    por sorte (título batia com exatamente 1 linha), mas não usava a
--    chave certa.
--
-- Também corrige um 4º achado, encontrado ao recalcular o score à mão pra
-- conferir os 3 acima: lib/scoring/event-score.ts nunca tratava o status
-- 'previsto' na função evaluateExperience() (só 'confirmado'/'estimado'/
-- 'em_monitoramento'/'cancelado'/'adiado'/'finalizado') — um evento
-- "previsto" pontuava como se status não existisse (sem o -8 que
-- 'estimado'/'em_monitoramento' levam), inflando o score de todo evento
-- previsto desde a Fase 2. Corrigido no código-fonte (mesmo commit desta
-- migration); esta migration recalcula as linhas afetadas no banco real —
-- as 3 desta correção de data + Tomorrowland 2027 (única outra linha com
-- status='previsto' hoje, não tocada pela migration 0035).
--
-- Valores recalculados à mão com a fórmula de lib/scoring/event-score.ts
-- (score = 50 + pesos de significance/once/hidden_gem + ajuste de status
-- + (confidence_score-0.5)*20 + bônus de urgência por daysUntilStart,
-- clamp 0-100) usando a data real de hoje (27/08/2026) e os dados atuais
-- de cada linha. Conferido que bate com o score já salvo ANTES desta
-- correção pra cada linha (prova que a fórmula foi aplicada certo).

update public.world_events
set experience_score = 49,          -- 50 - 8 (em_monitoramento) + 1 (confiança 0.55) + 6 (HIGH, 8 dias) — inalterado: a janela de urgência não mudou com a correção de data (11/09→04/09, ambas dentro de 30 dias)
    book_now_state = 'esperar',     -- inalterado
    last_changed_at = now(),
    last_checked_at = now()
where slug = 'rock-in-rio-2026';

update public.world_events
set experience_score = 44,          -- 50 - 8 (previsto, corrigido) + 2 (confiança 0.60) + 0 (LOW, >90 dias) — era 52 com o bug do 'previsto' não penalizado
    book_now_state = 'esperar',     -- era 'monitorar' (score>=50); agora <50
    last_changed_at = now(),
    last_checked_at = now()
where slug = 'coachella-2027';

update public.world_events
set experience_score = 86,          -- 50 + 25 (evento_historico) + 15 (once_in_a_lifetime) - 8 (previsto, corrigido) + 4 (confiança 0.70) + 0 (LOW, >90 dias) — era 94 com o bug do 'previsto'
    book_now_state = 'boa_janela',  -- inalterado (score continua >=80)
    last_changed_at = now(),
    last_checked_at = now()
where slug = 'gp-monaco-f1-2027';

update public.world_events
set experience_score = 46,          -- 50 - 8 (previsto, corrigido) + 4 (confiança 0.70) + 0 (LOW, >90 dias) — era 54 com o bug do 'previsto'; start_date não mudou (Tomorrowland não foi tocado pela migration 0035)
    book_now_state = 'esperar',     -- era 'monitorar'; agora <50
    last_changed_at = now(),
    last_checked_at = now()
where slug = 'tomorrowland-2027';
