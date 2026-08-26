-- ETAPA 16 -- Stripe, assinatura e monetizacao (ver MONETIZATION.md para as
-- regras de negocio completas). Ate aqui, todo usuario novo nascia com
-- subscriptions.status='active'/plan='free' para sempre -- nao existia
-- "teste gratuito" nenhum, so o tier free permanente com limites baixos
-- (lib/plans.ts). Esta migration introduz um periodo de teste de 5 dias:
-- depois dele, sem assinatura paga real, o acesso as paginas principais do
-- app fica bloqueado (ver lib/subscription-access.ts + middleware.ts).
--
-- trial_ends_at ja existia desde 0001_schema.sql (nunca usado ate agora).

-- ---------------------------------------------------------------------
-- 1. handle_new_user(): todo cadastro novo entra em trial de 5 dias, nao
--    mais direto em status='active' permanente. plan continua 'free' --
--    os LIMITES de uso (buscas/dia, alertas) do plano free continuam
--    valendo durante o teste; o que muda e so o acesso as paginas (ver
--    hasActiveAccess), que passa a olhar trial_ends_at.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  display_name text;
  new_referral_code text;
  referrer_id uuid;
begin
  display_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  new_referral_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

  if new.raw_user_meta_data ? 'referred_by_code' then
    select user_id into referrer_id from public.profiles
      where referral_code = upper(new.raw_user_meta_data->>'referred_by_code')
      limit 1;
  end if;

  insert into public.profiles (user_id, full_name, email, referral_code, referred_by_user_id)
  values (new.id, display_name, new.email, new_referral_code, referrer_id);

  insert into public.subscriptions (user_id, plan, status, trial_ends_at)
  values (new.id, 'free', 'trialing', now() + interval '5 days');

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Backfill: contas ja existentes que nunca pagaram (sem
--    stripe_customer_id) ganham o mesmo teste de 5 dias, contado a partir
--    da criacao da conta -- nao do "hoje" desta migration, para nao dar
--    teste novo de graca pra quem ja usa o app ha mais de 5 dias. Quem ja
--    tem stripe_customer_id (pagou de verdade) fica intocado.
-- ---------------------------------------------------------------------
update public.subscriptions
set status = 'trialing',
    trial_ends_at = created_at + interval '5 days'
where stripe_customer_id is null
  and status = 'active';
