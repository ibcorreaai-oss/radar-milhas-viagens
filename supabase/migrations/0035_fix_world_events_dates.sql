-- Correção de datas erradas em 3 dos 15 eventos de exemplo (is_mock=true) do
-- World Radar, achadas numa auditoria com WebSearch contra fonte oficial em
-- 27/08/2026 (ver MANUAL_ACTIONS.md §14). Os outros 12 eventos já estavam
-- certos ou são "estimado" sem data fixa (não mexidos). is_mock continua
-- true nos 3 — corrigir a data não confirma o evento como pronto pra
-- promessa comercial, só tira uma data que estava objetivamente errada.

-- Rock in Rio 2026: banco tinha 11–20/09 (bloco contínuo). Fonte oficial
-- (rockinrio.com) mostra 7 dias não-contínuos: 4, 5, 6, 7, 11, 12, 13/09.
-- Ajustado pro intervalo que cobre os dias reais (04–13), e a descrição
-- ganhou a ressalva de que não é contínuo.
update public.world_events
set start_date = '2026-09-04',
    end_date = '2026-09-13',
    description = 'Um dos maiores festivais de música do mundo, na Cidade do Rock — 7 dias não-contínuos (4, 5, 6, 7, 11, 12 e 13/09), line-up ainda não fechado.',
    last_checked_at = now()
where title = 'Rock in Rio 2026';

-- Coachella 2027: banco tinha 16–25/04 (só o 2º final de semana + 1 semana
-- extra que não existe). Fonte oficial (Pollstar/NME, anúncio de abril/2026)
-- confirma 2 finais de semana: 9–11/04 e 16–18/04.
update public.world_events
set start_date = '2027-04-09',
    end_date = '2027-04-18',
    description = 'Festival de música e artes no deserto da Califórnia — 2 finais de semana (9–11/04 e 16–18/04).',
    last_checked_at = now()
where title = 'Coachella 2027';

-- GP de Mônaco de F1 2027: banco tinha 23/05 (dia único, sem fonte que
-- sustente essa data). Fonte oficial (formula1.com/ticketing, ACM Monaco)
-- aponta o fim de semana de 03–06/06, corrida no domingo 06/06 — sujeito
-- ainda a aprovação formal da FIA, mas é a única data com fonte real.
update public.world_events
set start_date = '2027-06-06',
    end_date = '2027-06-06',
    last_checked_at = now()
where title = 'GP de Mônaco de F1 2027';

-- Tomorrowland 2027 (não corrigido aqui): fontes conflitam e nenhuma é
-- oficial (tomorrowland.com não confirmou 2027 ainda em 27/08/2026) —
-- mudar pra um palpite não confirmado seria pior que deixar como está.
-- Fica pendente de revisão manual quando a organização anunciar de verdade.
