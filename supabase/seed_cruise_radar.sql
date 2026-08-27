-- Seed do Cruise Radar (Fase 4). Rodar depois de 0026_cruise_radar.sql.
--
-- Mesmo aviso do seed da Fase 3: roteiros/categorias são reais e
-- conhecidos publicamente, mas preço/disponibilidade NÃO verificados ao
-- vivo — verification_status = 'estimated', is_mock = true.
--
-- cruise_score calculado À MÃO replicando lib/scoring/cruise-score.ts
-- (evaluateCruise), confidence_score = 0.65 e verification_status =
-- 'estimated' em todas, sem cover_image_url (mesma razão da Fase 3).

insert into public.destinations (city, region, country, country_code, continent, latitude, longitude, timezone) values
  ('Bergen', 'Vestland', 'Noruega', 'NO', 'Europa', 60.391263, 5.322054, 'Europe/Oslo'),
  ('Ushuaia', 'Terra do Fogo', 'Argentina', 'AR', 'América do Sul', -54.801270, -68.303030, 'America/Argentina/Ushuaia'),
  ('Barcelona', 'Catalunha', 'Espanha', 'ES', 'Europa', 41.385064, 2.173404, 'Europe/Madrid'),
  ('Passau', 'Baviera', 'Alemanha', 'DE', 'Europa', 48.567730, 13.431500, 'Europe/Berlin'),
  ('Manaus', 'Amazonas', 'Brasil', 'BR', 'América do Sul', -3.119028, -60.021731, 'America/Manaus'),
  ('Nova York', 'Nova York', 'Estados Unidos', 'US', 'América do Norte', 40.712776, -74.005974, 'America/New_York'),
  ('Miami', 'Flórida', 'Estados Unidos', 'US', 'América do Norte', 25.761681, -80.191788, 'America/New_York'),
  ('Luxor', null, 'Egito', 'EG', 'África', 25.687243, 32.639622, 'Africa/Cairo')
on conflict (city, country) do nothing;

insert into public.cruises (
  embarkation_destination_id, name, slug, cruise_line, ship_name, category, region_tags,
  route_description, nights, ports_count, cabin_category, price_from_cash, price_currency,
  cruise_score, source_id, verification_status, confidence_score, is_mock, featured, active
)
select d.id, s.name, s.slug, s.cruise_line, s.ship_name, s.category, s.region_tags,
       s.route_description, s.nights, s.ports_count, s.cabin_category, s.price_from_cash, 'BRL',
       s.cruise_score, (select id from public.sources where name = 'Cadastro manual do admin' limit 1),
       'estimated', 0.65, true, s.featured, true
from (values
  ('Bergen', 'Noruega', 'Rota clássica dos Fiordes Noruegueses', 'fiordes-noruegueses-hurtigruten', 'Hurtigruten', null, 'oceanico',
    array['FIORDES_NORUEGUESES'],
    'Navegação costeira entre Bergen e Kirkenes, com dezenas de escalas em vilarejos e fiordes — a "rota postal" mais famosa do mundo.',
    7, 12, 'varanda', 9800.00, 55, true),
  ('Ushuaia', 'Argentina', 'Expedição à Antártida', 'expedicao-antartida-peninsula', null, null, 'expedicao',
    array['ANTARTIDA'],
    'Travessia da Passagem de Drake e desembarques na Península Antártica — pinguins, baleias e icebergs, temporada curta (nov-mar).',
    10, 4, 'suite', 45000.00, 74, true),
  ('Barcelona', 'Espanha', 'Mediterrâneo Clássico', 'mediterraneo-classico-barcelona-roma', null, null, 'oceanico',
    array['MEDITERRANEO'],
    'Barcelona, Roma (Civitavecchia), Nápoles, Santorini e Mykonos — o roteiro mediterrâneo mais tradicional.',
    7, 5, 'vista_mar', 6500.00, 47, true),
  ('Passau', 'Alemanha', 'Cruzeiro fluvial pelo Danúbio', 'cruzeiro-fluvial-danubio', null, null, 'fluvial',
    array['DANUBIO'],
    'Passau, Viena, Bratislava e Budapeste navegando pelo Danúbio — cidades históricas visitadas sem trocar de hotel.',
    8, 7, 'varanda', 8900.00, 55, false),
  ('Manaus', 'Brasil', 'Cruzeiro pela Amazônia', 'cruzeiro-amazonia-manaus', null, null, 'fluvial',
    array['AMAZONIA', 'BRASIL'],
    'Navegação pelo Rio Negro e Solimões saindo de Manaus, com passeios de canoa na floresta e observação de botos-cor-de-rosa.',
    6, 4, 'vista_mar', 5200.00, 47, false),
  ('Nova York', 'Estados Unidos', 'Volta ao Mundo — Queen Mary 2', 'volta-ao-mundo-queen-mary-2', 'Cunard', 'Queen Mary 2', 'volta_ao_mundo',
    array[]::text[],
    'Circum-navegação completa em cerca de 4 meses, cruzando os principais oceanos e continentes — o clássico "world cruise".',
    120, 35, 'suite', 180000.00, 73, true),
  ('Miami', 'Estados Unidos', 'Cruzeiro pelo Caribe', 'cruzeiro-caribe-classico', null, null, 'oceanico',
    array['CARIBE'],
    'Bahamas, Ilhas Virgens e Antilhas saindo de Miami — o roteiro caribenho mais popular para quem busca praia e sol.',
    7, 4, 'interna', 4200.00, 47, false),
  ('Luxor', 'Egito', 'Cruzeiro pelo Nilo', 'cruzeiro-nilo-luxor-assua', null, null, 'fluvial',
    array['NILO'],
    'Navegação entre Luxor e Assuã visitando o Vale dos Reis, Templo de Karnak e as barragens de Assuã.',
    5, 7, 'varanda', 4800.00, 55, false)
) as s(dest_city, dest_country, name, slug, cruise_line, ship_name, category, region_tags, route_description, nights, ports_count, cabin_category, price_from_cash, cruise_score, featured)
join public.destinations d on d.city = s.dest_city and d.country = s.dest_country
on conflict (slug) do nothing;
