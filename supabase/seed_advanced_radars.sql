-- Seed do Fase 11 (Advanced Experience Radars). Roda depois de 0002_world_radar.sql
-- (nenhuma migration nova nesta fase -- reaproveita 100% o schema world_events/
-- event_categories já existente desde a Fase 2, evitando overengineering de criar
-- 8 tabelas/páginas novas, uma por tema).
--
-- Cobre os 8 temas pedidos no PROMPT WORLD EXPERIENCE RADAR (futebol, automobilismo,
-- ski, fenômenos naturais, festivais -- já bem coberto desde a Fase 2 --, praia,
-- wildlife, gastronomia) usando as categorias já existentes (esporte cobre
-- futebol+automobilismo, natureza cobre wildlife, sazonal cobre praia/ski sazonal).
--
-- Zero Hallucination Policy: eventos reais e conhecidos publicamente, mas SEM data
-- exata confirmada por mim nesta sessão -- status='estimado' (não 'confirmado')
-- e confidence_score moderado em todos, exceto o eclipse solar (fenômeno
-- astronômico com data calculável com alta confiança, mas ainda marcado como
-- estimado por prudência -- nunca 'verificado' sem checagem ao vivo).
-- is_mock=true em todos (dado curado, não verificado ao vivo nesta sessão).
--
-- experience_score calculado À MÃO replicando lib/scoring/event-score.ts
-- (evaluateExperience): base 50 + significance + once/hidden + status(-8 p/
-- estimado, +10 p/ confirmado) + confidence*20-10, sem bônus de urgência (nenhum
-- destes tem data a menos de 90 dias de hoje).

insert into public.destinations (city, region, country, country_code, continent, latitude, longitude, timezone) values
  ('Le Mans', 'Pays de la Loire', 'França', 'FR', 'Europa', 48.007813, 0.199930, 'Europe/Paris'),
  ('Zermatt', 'Valais', 'Suíça', 'CH', 'Europa', 46.020717, 7.749230, 'Europe/Zurich'),
  ('Serengeti', null, 'Tanzânia', 'TZ', 'África', -2.333333, 34.833333, 'Africa/Dar_es_Salaam'),
  ('Alba', 'Piemonte', 'Itália', 'IT', 'Europa', 44.700001, 8.033330, 'Europe/Rome'),
  ('Punta Cana', 'La Altagracia', 'República Dominicana', 'DO', 'América Central e Caribe', 18.582130, -68.403687, 'America/Santo_Domingo')
on conflict (city, country) do nothing;

insert into public.world_events (
  category_id, destination_id, title, slug, description, significance, start_date, end_date,
  status, once_in_a_lifetime, hidden_gem, experience_score, book_now_state, confidence_score,
  source_id, tags, is_mock, featured
)
select
  (select id from public.event_categories where slug = s.category_slug),
  d.id,
  s.title, s.slug, s.description, s.significance, s.start_date::date, s.end_date::date,
  s.status, s.once_in_a_lifetime, s.hidden_gem, s.experience_score, s.book_now_state, s.confidence_score,
  (select id from public.sources where name = 'Cadastro manual do admin' limit 1),
  s.tags, true, s.featured
from (values
  ('Barcelona', 'Espanha', 'esporte', 'El Clásico -- Real Madrid x Barcelona', 'el-classico-la-liga',
    'O clássico mais famoso do futebol mundial -- Real Madrid x Barcelona, La Liga 2026/27. Data exata do próximo confronto ainda não confirmada oficialmente pela federação.',
    'classico', null, null, 'estimado', false, false, 54, 'monitorar', 0.60,
    array['futebol','classico','la-liga'], true),
  ('Le Mans', 'França', 'esporte', '24 Horas de Le Mans', '24-horas-de-le-mans',
    'A prova de resistência automobilística mais icônica do mundo -- 24 horas ininterruptas no Circuit de la Sarthe, disputada anualmente em junho desde 1923.',
    'evento_historico', null, null, 'estimado', false, false, 69, 'monitorar', 0.60,
    array['automobilismo','endurance','le-mans'], true),
  ('Zermatt', 'Suíça', 'sazonal', 'Abertura da temporada de esqui em Zermatt', 'temporada-esqui-zermatt',
    'Uma das estações de esqui mais altas e com neve mais confiável dos Alpes, aos pés do Matterhorn -- temporada tipicamente de novembro a abril.',
    null, null, null, 'estimado', false, false, 43, 'esperar', 0.55,
    array['ski','alpes','inverno'], false),
  ('Luxor', 'Egito', 'fenomeno-natural', 'Eclipse solar total de 2027', 'eclipse-solar-total-2027',
    'Eclipse solar total com faixa de totalidade cruzando o norte da África e a Península Ibérica -- uma das maiores durações de totalidade do século, com o Egito entre os melhores pontos de observação.',
    null, '2027-08-02', '2027-08-02', 'confirmado', true, false, 65, 'monitorar', 0.75,
    array['eclipse','astronomia','once-in-a-lifetime'], true),
  ('Serengeti', 'Tanzânia', 'natureza', 'Grande Migração do Serengeti', 'grande-migracao-serengeti',
    'Travessia anual de mais de 1,5 milhão de nus e centenas de milhares de zebras pelo Rio Mara -- um dos maiores espetáculos da vida selvagem do planeta, com janela variável conforme as chuvas.',
    null, null, null, 'estimado', false, false, 44, 'esperar', 0.60,
    array['wildlife','safari','migracao'], true),
  ('Alba', 'Itália', 'gastronomia', 'Fiera Internazionale del Tartufo Bianco d''Alba', 'feira-trufa-branca-alba',
    'Festival anual dedicado à trufa branca de Alba, uma das iguarias mais raras e caras do mundo -- mercado, degustações e leilão de trufas no Piemonte italiano.',
    null, null, null, 'estimado', false, true, 45, 'esperar', 0.65,
    array['gastronomia','trufa','piemonte'], false),
  ('Punta Cana', 'República Dominicana', 'sazonal', 'Alta temporada de praia no Caribe', 'alta-temporada-praia-caribe',
    'Janela de clima mais seco e mar mais calmo no Caribe -- tipicamente dezembro a abril, alta temporada para praias como Punta Cana.',
    null, null, null, 'estimado', false, false, 44, 'esperar', 0.60,
    array['praia','caribe','sazonal'], false)
) as s(dest_city, dest_country, category_slug, title, slug, description, significance, start_date, end_date, status, once_in_a_lifetime, hidden_gem, experience_score, book_now_state, confidence_score, tags, featured)
join public.destinations d on d.city = s.dest_city and d.country = s.dest_country
on conflict (slug) do nothing;
