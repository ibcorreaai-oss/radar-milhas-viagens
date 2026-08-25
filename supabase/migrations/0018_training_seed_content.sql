-- ETAPA 15.2 — estrutura inicial de módulos/aulas do Mini LMS, adaptada às
-- funcionalidades REAIS deste produto (não os nomes genéricos do prompt).
-- Tudo em status 'draft': não existe vídeo de verdade ainda, então nada
-- disto aparece pro usuário final até o admin editar cada aula com o
-- provider/referência de vídeo real e publicar (ver TRAINING.md).
-- video_ref = 'PENDENTE_CONFIGURAR' é só um marcador textual, não uma URL —
-- o formulário de edição não valida video_ref como URL de propósito,
-- justamente pra caber esse placeholder.

insert into public.training_modules (title, slug, description, order_index, status) values
  ('Introdução ao Radar Milhas & Viagens', 'introducao', 'Visão geral da plataforma: o que ela faz e como navegar pelo dashboard.', 0, 'draft'),
  ('Buscando as melhores oportunidades', 'buscando-oportunidades', 'Como usar a busca de voos, hotéis, a calculadora e o catálogo de promoções/programas.', 1, 'draft'),
  ('Alertas, favoritos e Consultor IA', 'alertas-favoritos-ia', 'Como ser avisado automaticamente e organizar o que você já encontrou.', 2, 'draft'),
  ('Conta, segurança e indicações', 'conta-seguranca-indicacoes', 'Perfil, assinatura, segurança da conta e como ganhar indicando amigos.', 3, 'draft');

insert into public.training_lessons (module_id, title, slug, description, video_provider, video_ref, order_index, is_required, keywords, status)
select m.id, l.title, l.slug, l.description, 'url', 'PENDENTE_CONFIGURAR', l.order_index, l.is_required, l.keywords, 'draft'
from public.training_modules m
join (values
  ('introducao', 'Bem-vindo ao Radar Milhas & Viagens', 'bem-vindo', 'Um tour rápido pelo dashboard e pelos principais menus.', 0, true, array['dashboard','tour','inicio']),
  ('introducao', 'Como funciona o score de oportunidade', 'score-de-oportunidade', 'Entenda o que significa cada faixa de score (imperdível, excelente, bom, normal) usada em voos, hotéis e promoções.', 1, true, array['score','recomendacao']),
  ('buscando-oportunidades', 'Buscando passagens: dinheiro ou pontos?', 'buscando-passagens', 'Como usar a busca de voos e interpretar a recomendação de usar milhas ou pagar em dinheiro.', 0, true, array['voos','passagens','pontos']),
  ('buscando-oportunidades', 'Buscando hotéis com o melhor custo-benefício', 'buscando-hoteis', 'Como usar a busca de hotéis e comparar diária em pontos vs. dinheiro.', 1, true, array['hoteis','diarias']),
  ('buscando-oportunidades', 'Usando a Calculadora de milhas', 'usando-calculadora', 'Como calcular se vale a pena transferir ou comprar pontos para uma emissão específica.', 2, true, array['calculadora','transferencia','compra de pontos']),
  ('buscando-oportunidades', 'Promoções e Programas de fidelidade', 'promocoes-e-programas', 'Como acompanhar transferências bonificadas e consultar o catálogo de programas.', 3, true, array['promocoes','programas','bonificada']),
  ('alertas-favoritos-ia', 'Criando seu primeiro alerta', 'criando-um-alerta', 'Como configurar um alerta de voo ou hotel para ser avisado por e-mail/WhatsApp quando o preço cair.', 0, true, array['alertas','notificacao','whatsapp']),
  ('alertas-favoritos-ia', 'Favoritos e Bucket List', 'favoritos-e-bucket-list', 'A diferença entre guardar uma promoção nos Favoritos e planejar uma viagem futura na Bucket List.', 1, true, array['favoritos','bucket list','desejos']),
  ('alertas-favoritos-ia', 'Tirando dúvidas com o Consultor IA', 'consultor-ia', 'Como usar o assistente de IA para tirar dúvidas sobre estratégias de milhas.', 2, false, array['consultor ia','assistente','duvidas']),
  ('conta-seguranca-indicacoes', 'Gerenciando perfil e assinatura', 'perfil-e-assinatura', 'Como editar seus dados, trocar de plano e gerenciar sua assinatura.', 0, true, array['perfil','assinatura','plano']),
  ('conta-seguranca-indicacoes', 'Segurança da sua conta', 'seguranca-da-conta', 'Como funciona o login por código (OTP) e o que fazer se sua conta for bloqueada.', 1, true, array['seguranca','login','otp','bloqueio']),
  ('conta-seguranca-indicacoes', 'Indique e ganhe', 'indique-e-ganhe', 'Como compartilhar seu link de indicação e acompanhar quantas pessoas você trouxe.', 2, false, array['indicacao','afiliados','indique e ganhe'])
) as l(module_slug, title, slug, description, order_index, is_required, keywords)
  on l.module_slug = m.slug;
