-- Achado em /code-review high (revisão geral de 27/08/2026): a policy
-- "profiles: insert own" (migration 0001) só checa `user_id = auth.uid()`,
-- sem restrição de coluna via GRANT — diferente da policy de UPDATE da
-- mesma tabela, que explicitamente revoga/regrant só um subconjunto seguro
-- (excluindo `role`) especificamente pra impedir autopromoção. Confirmado
-- que `authenticated` tinha INSERT liberado até em `role`.
--
-- Nenhum caminho de código do app faz INSERT direto em profiles hoje (a
-- criação de perfil é 100% via trigger handle_new_user(), que roda como
-- security definer, não como `authenticated` — não é afetado por este
-- GRANT). Esta policy de INSERT é só uma rede de segurança pro caso desse
-- trigger algum dia não disparar (mesmo raciocínio da 0001 pro UPDATE) —
-- fechando o mesmo buraco de escalação de privilégio que o UPDATE já
-- fechava, só que do lado do INSERT.
revoke insert on public.profiles from authenticated;
grant insert (
  user_id, full_name, email, phone, home_airport, favorite_destinations,
  cabin_class_preference, flexible_dates, monthly_budget,
  notify_email, notify_whatsapp, preferred_currency, language, timezone,
  onboarding_done
) on public.profiles to authenticated;
