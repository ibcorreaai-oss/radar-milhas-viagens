-- Seed do World Experience Radar. Rodar depois de 0002_world_radar.sql
-- (e depois de seed.sql, que já populou loyalty_programs/promotions).
--
-- IMPORTANTE: os eventos abaixo são DADOS DE EXEMPLO (is_mock = true) para
-- a vitrine funcionar imediatamente após o deploy. Não são confirmados por
-- fonte oficial nesta sessão — ver AUDIT_REPORT.md §8. A UI mostra um
-- badge "Dado de exemplo" sempre que is_mock = true. Antes de ir para
-- produção com usuários reais, o admin deve revisar/confirmar cada um em
-- /admin/eventos ou desligar a feature flag `worldRadar`.

insert into public.feature_flags (key, enabled, description) values
  ('worldRadar', true, 'Discover: World Experience Radar (eventos, festivais, esportes, sazonalidade)'),
  ('bucketList', true, 'Lista de desejos monitorada com alertas de oportunidade'),
  ('cruiseRadar', false, 'Radar de cruzeiros — fase futura, ver IMPLEMENTATION_PLAN.md'),
  ('experienceRadar', false, 'Extraordinary Stays / Smart Stay Split — fase futura'),
  ('tripBuilder', false, 'AI Trip Builder — fase futura'),
  ('worldCalendar', false, 'Calendário mundial de 12 meses — fase futura'),
  ('conciergeAI', false, 'Concierge IA consultando dados reais — fase futura')
on conflict (key) do nothing;

insert into public.sources (source_type, name, url, authority_level, status, health) values
  ('manual', 'Cadastro manual do admin', null, 6, 'active', 'ok'),
  ('site_oficial', 'Oktoberfest.de', 'https://www.oktoberfest.de', 10, 'active', 'ok'),
  ('organizador', 'Rock in Rio', 'https://rockinrio.com', 9, 'active', 'ok'),
  ('organizador', 'Tomorrowland', 'https://www.tomorrowland.com', 9, 'active', 'ok'),
  ('federacao', 'FIFA', 'https://www.fifa.com', 10, 'active', 'ok'),
  ('companhia', 'Formula 1', 'https://www.formula1.com', 9, 'active', 'ok')
on conflict (name) do nothing;

insert into public.destinations (city, region, country, country_code, continent, latitude, longitude, timezone) values
  ('Munique', 'Baviera', 'Alemanha', 'DE', 'Europa', 48.137154, 11.576124, 'Europe/Berlin'),
  ('Rio de Janeiro', 'Rio de Janeiro', 'Brasil', 'BR', 'América do Sul', -22.906847, -43.172897, 'America/Sao_Paulo'),
  ('Antuérpia', 'Flandres', 'Bélgica', 'BE', 'Europa', 51.219448, 4.402464, 'Europe/Brussels'),
  ('Pamplona', 'Navarra', 'Espanha', 'ES', 'Europa', 42.812526, -1.645774, 'Europe/Madrid'),
  ('Mônaco', null, 'Mônaco', 'MC', 'Europa', 43.738418, 7.424616, 'Europe/Monaco'),
  ('Parintins', 'Amazonas', 'Brasil', 'BR', 'América do Sul', -2.628448, -56.735565, 'America/Manaus'),
  ('Rovaniemi', 'Lapônia', 'Finlândia', 'FI', 'Europa', 66.502147, 25.729765, 'Europe/Helsinki'),
  ('Indio', 'Califórnia', 'Estados Unidos', 'US', 'América do Norte', 33.720463, -116.215256, 'America/Los_Angeles')
on conflict (city, country) do nothing;

insert into public.event_categories (slug, label, radar, icon) values
  ('festa-tradicional', 'Festa tradicional', 'festa_tradicional', 'PartyPopper'),
  ('festival-musical', 'Festival musical', 'festival_musical', 'Music'),
  ('show', 'Show', 'show', 'Mic2'),
  ('esporte', 'Esporte', 'esporte', 'Trophy'),
  ('sazonal', 'Sazonal', 'sazonal', 'Sun'),
  ('fenomeno-natural', 'Fenômeno natural', 'fenomeno_natural', 'Sparkles'),
  ('natureza', 'Natureza & Wildlife', 'natureza', 'Trees'),
  ('gastronomia', 'Gastronomia', 'gastronomia', 'UtensilsCrossed'),
  ('cultural', 'Cultural', 'cultural', 'Landmark'),
  ('once-in-a-lifetime', 'Once in a Lifetime', 'once_in_a_lifetime', 'Star'),
  ('hidden-gem', 'Hidden Gem', 'hidden_gem', 'Gem')
on conflict (slug) do nothing;

-- Eventos de exemplo — todos is_mock = true (ver aviso no topo do arquivo).
--
-- IMPORTANTE sobre score/book_now_state abaixo: foram calculados à MÃO
-- replicando exatamente lib/scoring/event-score.ts (evaluateExperience +
-- deriveBookNowState), usando como "hoje" a data em que este seed foi
-- escrito (23/08/2026) — não são chutados. Esse cálculo fica desatualizado
-- com o tempo (a janela de urgência muda todo dia); o valor fica "preso"
-- em produção até alguém salvar o evento de novo em /admin/eventos, que
-- recalcula automaticamente. Datas escolhidas para ficarem no futuro em
-- relação a 23/08/2026 — eventos cujo mês real do ano (Tomorrowland,
-- Coachella, San Fermín, GP Mônaco, Parintins) já tinha passado nessa data
-- foram projetados para a edição de 2027 (título e slug ajustados de
-- acordo, para não afirmar um ano que não bate com a data).
insert into public.world_events (
  category_id, destination_id, title, slug, description, significance,
  start_date, end_date, status, once_in_a_lifetime, hidden_gem,
  experience_score, book_now_state, confidence_score, source_id,
  tags, featured, last_checked_at, is_mock
)
select
  c.id, d.id, v.title, v.slug, v.description, v.significance::text,
  v.start_date::date, v.end_date::date, v.status, v.once_in_a_lifetime, v.hidden_gem,
  v.experience_score, v.book_now_state, v.confidence_score, s.id,
  v.tags, v.featured, now(), true
from (values
  -- Oktoberfest 2026: score 74 (50 base + 10 confirmado + 8 confiança 0.9 + 6 urgência HIGH),
  -- urgência HIGH (27 dias) => book_now 'comprar'.
  ('festival-musical', 'Munique', 'Oktoberfest 2026', 'oktoberfest-2026',
   'Maior festival de cerveja do mundo, com barracas tradicionais e trajes típicos bávaros.',
   null, '2026-09-19', '2026-10-04', 'confirmado', false, false, 74, 'comprar', 0.90,
   'Oktoberfest.de', array['cerveja','baviera','tradicao'], true),
  -- Rock in Rio 2026: score 49 (50 base - 8 em_monitoramento + 1 confiança 0.55 + 6 urgência HIGH),
  -- urgência HIGH mas score < 70 e < 50 arredondado => book_now 'esperar'.
  ('festival-musical', 'Rio de Janeiro', 'Rock in Rio 2026', 'rock-in-rio-2026',
   'Um dos maiores festivais de música do mundo, na Cidade do Rock — line-up ainda não fechado.', null,
   '2026-09-11', '2026-09-20', 'em_monitoramento', false, false, 49, 'esperar', 0.55,
   'Rock in Rio', array['musica','rio','festival'], false),
  -- Tomorrowland 2027 (edição de julho/2027 — a de 2026 já passou em relação a hoje):
  -- score 54 (50 base + 4 confiança 0.7), urgência LOW (>90 dias) => book_now 'monitorar'.
  ('festival-musical', 'Antuérpia', 'Tomorrowland 2027', 'tomorrowland-2027',
   'Festival de música eletrônica mais famoso da Europa, em Boom, na Bélgica.', null,
   '2027-07-23', '2027-08-01', 'previsto', false, false, 54, 'monitorar', 0.70,
   'Tomorrowland', array['eletronica','belgica','festival'], false),
  -- San Fermín 2027 (edição de julho já passou em 2026): score 75
  -- (50 base + 8 hidden gem + 10 confirmado + 7 confiança 0.85), urgência LOW => 'monitorar'.
  ('festa-tradicional', 'Pamplona', 'San Fermín (Correr com os Touros) 2027', 'san-fermin-2027',
   'Festa tradicional espanhola conhecida pela corrida de touros e pela vida cultural intensa.', null,
   '2027-07-06', '2027-07-14', 'confirmado', false, true, 75, 'monitorar', 0.85,
   'Cadastro manual do admin', array['espanha','tradicao','touros'], false),
  -- GP de Mônaco F1 2027: 'previsto' (não 'confirmado') porque em ago/2026 a
  -- FIA normalmente ainda não publicou o calendário oficial de 2027 (costuma
  -- sair out/nov do ano anterior) — mesmo como dado de exemplo, não é
  -- honesto marcar como confirmado. Score 94
  -- (50 base + 25 evento histórico + 15 once-in-a-lifetime + 0 previsto + 4 confiança 0.7),
  -- urgência LOW => 'boa_janela'.
  ('esporte', 'Mônaco', 'GP de Mônaco de F1 2027', 'gp-monaco-f1-2027',
   'Uma das corridas mais icônicas do calendário de Fórmula 1, nas ruas do principado.',
   'evento_historico', '2027-05-23', '2027-05-23', 'previsto', true, false, 94, 'boa_janela', 0.70,
   'Formula 1', array['f1','monaco','automobilismo'], true),
  -- Festival de Parintins 2027 (edição de junho/2026 já passou): score 50
  -- (50 base + 8 hidden gem - 8 em_monitoramento), urgência LOW => 'monitorar'.
  ('cultural', 'Parintins', 'Festival de Parintins 2027', 'festival-parintins-2027',
   'Disputa folclórica entre os bois Garantido e Caprichoso, no coração da Amazônia.', null,
   '2027-06-25', '2027-06-27', 'em_monitoramento', false, true, 50, 'monitorar', 0.50,
   'Cadastro manual do admin', array['amazonia','folclore','brasil'], false),
  -- Aurora Boreal Lapônia (janela já é futura, sem precisar reprojetar ano): score 58
  -- (50 base + 15 once-in-a-lifetime - 8 em_monitoramento - 1 confiança 0.45 + 2 urgência MEDIUM),
  -- urgência MEDIUM (70 dias) => 'monitorar'. Fenômeno probabilístico — nunca é garantia.
  ('fenomeno-natural', 'Rovaniemi', 'Janela de Aurora Boreal — inverno 2026/27', 'aurora-boreal-laponia-2026-27',
   'Melhor janela histórica para observação de aurora boreal na Lapônia finlandesa. Fenômeno probabilístico — não é garantia.',
   null, '2026-11-01', '2027-02-28', 'em_monitoramento', true, false, 58, 'monitorar', 0.45,
   'Cadastro manual do admin', array['aurora','laponia','natureza'], false),
  -- Coachella 2027 (edição de abril/2026 já passou): score 52
  -- (50 base + 2 confiança 0.6), urgência LOW => 'monitorar'.
  ('festival-musical', 'Indio', 'Coachella 2027', 'coachella-2027',
   'Festival de música e artes no deserto da Califórnia.', null,
   '2027-04-16', '2027-04-25', 'previsto', false, false, 52, 'monitorar', 0.60,
   'Cadastro manual do admin', array['musica','california','festival'], false)
) as v(category_slug, city, title, slug, description, significance, start_date, end_date, status, once_in_a_lifetime, hidden_gem, experience_score, book_now_state, confidence_score, source_name, tags, featured)
left join public.event_categories c on c.slug = v.category_slug
left join public.destinations d on d.city = v.city
left join public.sources s on s.name = v.source_name
on conflict (slug) do nothing;
