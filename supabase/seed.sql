-- Catálogo inicial de programas de pontos/milhas + conteúdo de demonstração.
-- Rodar depois da migration 0001. Idempotente (on conflict do nothing via delete+insert simples).

insert into public.loyalty_programs (name, type, country, average_mile_value, transfer_partners, validity_notes, active) values
  ('Livelo', 'banco', 'BR', 18.00, '{Smiles,LATAM Pass,TAP Miles&Go,Flying Blue,Iberia Plus}', 'Pontos expiram em 24 meses (rolling).', true),
  ('Esfera', 'banco', 'BR', 17.00, '{Smiles,LATAM Pass,Azul Fidelidade}', 'Pontos não expiram enquanto a conta está ativa.', true),
  ('Smiles', 'companhia_aerea', 'BR', 22.00, '{}', 'Milhas expiram em 18 meses.', true),
  ('LATAM Pass', 'companhia_aerea', 'BR', 25.00, '{}', 'Pontos expiram, prazo varia por categoria.', true),
  ('Azul Fidelidade', 'companhia_aerea', 'BR', 20.00, '{}', 'Pontos expiram em 24-36 meses conforme categoria.', true),
  ('TudoAzul', 'companhia_aerea', 'BR', 20.00, '{}', 'Nome legado de Azul Fidelidade em alguns contextos.', true),
  ('TAP Miles&Go', 'companhia_aerea', 'PT', 28.00, '{}', 'Milhas não expiram com atividade na conta.', true),
  ('Iberia Plus', 'companhia_aerea', 'ES', 24.00, '{}', 'Avios expiram em 36 meses sem atividade.', true),
  ('British Airways Executive Club', 'companhia_aerea', 'UK', 26.00, '{}', 'Avios expiram em 36 meses sem atividade.', true),
  ('Flying Blue', 'companhia_aerea', 'FR', 27.00, '{}', 'Miles expiram conforme status/atividade.', true),
  ('ALL Accor', 'hotel', 'FR', 30.00, '{}', 'Pontos expiram após 12 meses sem atividade.', true),
  ('Hilton Honors', 'hotel', 'US', 5.00, '{}', 'Pontos expiram após 24 meses sem atividade.', true),
  ('Marriott Bonvoy', 'hotel', 'US', 6.50, '{}', 'Pontos expiram após 24 meses sem atividade.', true),
  ('IHG One Rewards', 'hotel', 'US', 5.50, '{}', 'Pontos expiram após 12 meses sem atividade.', true),
  ('Wyndham Rewards', 'hotel', 'US', 4.50, '{}', 'Pontos expiram após 18-24 meses sem atividade.', true)
on conflict do nothing;

-- Promoções de exemplo (o admin real cadastra as suas).
insert into public.promotions (title, type, program, bonus_percentage, start_date, end_date, rules, score, status) values
  ('Transferência bonificada Livelo → Smiles 80%', 'transferencia_bonificada', 'Livelo', 80, current_date, current_date + interval '10 days', 'Bônus válido para transferências até o limite anual do programa.', 88, 'ativa'),
  ('Compra de pontos Smiles com 65% de desconto', 'compra_pontos', 'Smiles', 65, current_date, current_date + interval '5 days', 'Limite de 30 mil milhas por CPF.', 74, 'ativa')
on conflict do nothing;

-- Oportunidade pública de exemplo (o OpportunityEngine substitui isso em produção).
insert into public.opportunities (type, title, description, origin, destination, cash_price, points_price, taxes, loyalty_program, score, recommendation, source) values
  ('voo', 'Fortaleza → Lisboa em outubro', 'Emissão com Livelo transferido para TAP Miles&Go aproveitando bônus.', 'FOR', 'LIS', 3100.00, 42000, 220.00, 'TAP Miles&Go', 91, 'Excelente uso dos pontos — valor por milheiro acima da média do programa.', 'manual')
on conflict do nothing;
