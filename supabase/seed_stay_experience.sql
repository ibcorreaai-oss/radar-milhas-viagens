-- Seed do Stay Experience Radar (Fase 3). Rodar depois de
-- 0025_stay_experience.sql.
--
-- IMPORTANTE: as hospedagens abaixo são reais e conhecidas publicamente
-- (Amangiri, ICEHOTEL, Treehotel, Giraffe Manor etc.), mas os dados de
-- preço/disponibilidade NÃO foram verificados ao vivo nesta sessão —
-- verification_status = 'estimated', is_mock = true. A UI mostra o badge
-- correspondente. Antes de produção com usuário real, o admin deve revisar
-- cada uma em /admin/estadias ou desligar a feature flag `stayExperience`.
--
-- stay_score calculado À MÃO replicando exatamente lib/scoring/stay-score.ts
-- (evaluateStay), não chutado — ver raciocínio completo no resumo desta
-- etapa. confidence_score = 0.65 e verification_status = 'estimated' em
-- todas, nenhuma tem cover_image_url (seria preciso confirmar licença de
-- uso da imagem, fica para quando o admin revisar de verdade).

insert into public.destinations (city, region, country, country_code, continent, latitude, longitude, timezone) values
  ('Big Water', 'Utah', 'Estados Unidos', 'US', 'América do Norte', 37.106670, -111.827640, 'America/Denver'),
  ('Jukkasjärvi', 'Norrbotten', 'Suécia', 'SE', 'Europa', 67.855280, 20.593330, 'Europe/Stockholm'),
  ('Harads', 'Norrbotten', 'Suécia', 'SE', 'Europa', 66.552780, 20.808330, 'Europe/Stockholm'),
  ('Nairóbi', null, 'Quênia', 'KE', 'África', -1.286389, 36.817223, 'Africa/Nairobi'),
  ('Ilha Rangali', null, 'Maldivas', 'MV', 'Ásia', 3.638060, 72.831940, 'Indian/Maldives'),
  ('Cusco', 'Cusco', 'Peru', 'PE', 'América do Sul', -13.531950, -71.967460, 'America/Lima'),
  ('Siena', 'Toscana', 'Itália', 'IT', 'Europa', 43.318780, 11.330820, 'Europe/Rome'),
  ('Merzouga', 'Errachidia', 'Marrocos', 'MA', 'África', 31.100000, -4.013330, 'Africa/Casablanca')
on conflict (city, country) do nothing;

insert into public.stays (
  destination_id, name, slug, category, experience_tags, description,
  price_from_cash, price_currency, price_unit, best_season, stay_score,
  source_id, verification_status, confidence_score, is_mock, featured, active
)
select d.id, s.name, s.slug, s.category, s.experience_tags, s.description,
       s.price_from_cash, 'BRL', s.price_unit, s.best_season, s.stay_score,
       (select id from public.sources where name = 'Cadastro manual do admin' limit 1),
       'estimated', 0.65, true, s.featured, true
from (values
  ('Big Water', 'Estados Unidos', 'Amangiri', 'amangiri-utah', 'resort',
    array['LUXURY','REMOTE','UNIQUE','NATURE'],
    'Resort de luxo isolado no deserto de Utah, integrado à paisagem de rocha vermelha do Lake Powell — uma das hospedagens mais premiadas do mundo.',
    12000.00, 'diaria', 'Março a maio e setembro a novembro (temperaturas amenas no deserto).', 62, true),
  ('Jukkasjärvi', 'Suécia', 'ICEHOTEL', 'icehotel-jukkasjarvi', 'lodge',
    array['SNOW','UNIQUE','NORTHERN_LIGHTS','REMOTE'],
    'Hotel reconstruído todo ano em gelo e neve do rio Torne, na Lapônia sueca — quartos esculpidos por artistas, com boa chance de ver aurora boreal.',
    3200.00, 'diaria', 'Dezembro a abril (existe apenas nesse período, derrete no verão).', 62, true),
  ('Harads', 'Suécia', 'Treehotel', 'treehotel-harads', 'treehouse',
    array['NATURE','UNIQUE','REMOTE'],
    'Casas na árvore de design (a "Mirrorcube" espelhada é a mais famosa) na floresta da Lapônia sueca, perto do Círculo Ártico.',
    4500.00, 'diaria', 'Junho a agosto (sol da meia-noite) ou dezembro a março (aurora boreal).', 72, true),
  ('Nairóbi', 'Quênia', 'Giraffe Manor', 'giraffe-manor-nairobi', 'boutique_hotel',
    array['SAFARI','UNIQUE','LUXURY'],
    'Mansão boutique dos anos 1930 onde girafas de Rothschild colocam a cabeça pela janela na hora do café da manhã.',
    9500.00, 'diaria', 'Junho a outubro (estação seca, melhor para safári).', 62, true),
  ('Ilha Rangali', 'Maldivas', 'Conrad Maldives Rangali Island', 'conrad-maldives-rangali', 'overwater_bungalow',
    array['BEACH','OVERWATER','LUXURY','DIVING','ROMANTIC'],
    'Bangalôs sobre a água com o famoso restaurante submerso Ithaa, num recife de coral nas Maldivas.',
    8000.00, 'diaria', 'Dezembro a abril (estação seca, menos chuva de monção).', 72, true),
  ('Cusco', 'Peru', 'Skylodge Adventure Suites', 'skylodge-adventure-suites-peru', 'glamping',
    array['ADVENTURE','UNIQUE','REMOTE','NATURE'],
    'Cápsulas de acrílico suspensas a 400m de altura na falésia do Vale Sagrado — acesso só de tirolesa ou via ferrata.',
    2800.00, 'diaria', 'Maio a setembro (estação seca dos Andes).', 57, false),
  ('Siena', 'Itália', 'Castello di Vicarello', 'castello-di-vicarello-toscana', 'castle_hotel',
    array['LUXURY','ROMANTIC','GASTRONOMY'],
    'Castelo medieval na Toscana rural, poucos quartos, cozinha própria com produtos da fazenda do castelo.',
    5500.00, 'diaria', 'Abril a junho e setembro a outubro (temperatura amena, colheita de uva em setembro).', 67, false),
  ('Merzouga', 'Marrocos', 'Acampamento de luxo em Merzouga', 'acampamento-luxo-merzouga-sahara', 'desert_camp',
    array['ADVENTURE','REMOTE','UNIQUE','NATURE'],
    'Tendas de luxo nas dunas de Erg Chebbi, no Deserto do Saara — passeio de camelo ao pôr do sol e céu estrelado sem poluição luminosa.',
    2200.00, 'diaria', 'Outubro a abril (verão no Saara é extremo, acima de 45°C).', 72, false)
) as s(dest_city, dest_country, name, slug, category, experience_tags, description, price_from_cash, price_unit, best_season, stay_score, featured)
join public.destinations d on d.city = s.dest_city and d.country = s.dest_country
on conflict (slug) do nothing;
