-- ETAPA 15.1 -- ver GROWTH.md para o raciocinio completo (analytics/ads,
-- captura de lead na home, programa de indicacao, upload seguro).

-- ---------------------------------------------------------------------
-- 1. Leads da home (IA publica) reaproveitam contact_messages em vez de
--    criar uma tabela nova -- mesmo formato (nome/e-mail/mensagem),
--    so muda a origem.
-- ---------------------------------------------------------------------
alter table public.contact_messages add column source text not null default 'contato'
  check (source in ('contato', 'home_ai_chat'));

-- ---------------------------------------------------------------------
-- 2. Upload seguro de verdade: a validacao de tipo/tamanho de
--    components/admin/image-upload-field.tsx era só client-side,
--    contornavel chamando o SDK do Supabase direto. Limite a nivel de
--    Storage nao depende de nenhum client se comportar.
-- ---------------------------------------------------------------------
update storage.buckets
set file_size_limit = 5242880, -- 5MB, mesmo limite ja documentado na UI
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
where id = 'event-media';

-- ---------------------------------------------------------------------
-- 3. Programa de indicacao: cada usuario ganha um codigo proprio
--    (gerado no trigger, nunca escolhido pelo usuario -- profiles.role
--    ja ensinou que colunas sensiveis nao podem vir de input do client,
--    aqui e so unicidade que importa, mas o principio de "o trigger
--    decide" se mantem simples). Ver /afiliados.
-- ---------------------------------------------------------------------
alter table public.profiles add column referral_code text unique;
alter table public.profiles add column referred_by_user_id uuid references auth.users(id) on delete set null;
create index profiles_referred_by_idx on public.profiles(referred_by_user_id);

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

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'active');

  return new;
end;
$$;

-- Defensivo/idempotente -- a tabela esta vazia hoje, mas se algum dia
-- rodar sobre uma base ja populada, ninguem fica sem codigo.
update public.profiles set referral_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
where referral_code is null;

alter table public.profiles alter column referral_code set not null;
