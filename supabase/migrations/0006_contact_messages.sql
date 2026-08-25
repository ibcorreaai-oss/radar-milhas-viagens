-- ETAPA 12: página /contato pública (nome, e-mail, assunto, mensagem).
-- Persiste toda mensagem recebida, mesmo que RESEND_API_KEY ou
-- OPS_ALERT_EMAIL não estejam configurados — sem isso, uma mensagem de
-- contato enviada num momento de falha de e-mail seria perdida de vez
-- (mesmo padrão de "nunca perder dado" já usado em notification_logs/
-- audit_logs). Sem FK para auth.users: formulário público, não exige login.
create table public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  email text not null check (char_length(email) between 5 and 200 and email like '%@%.%'),
  subject text not null check (char_length(subject) between 1 and 150),
  message text not null check (char_length(message) between 1 and 4000),
  email_status text not null default 'pending' check (email_status in ('pending', 'sent', 'skipped', 'failed')),
  created_at timestamptz not null default now()
);

alter table public.contact_messages enable row level security;

-- Insert público (sem exigir auth.role() = 'authenticated'): é um formulário
-- de contato pré-login, igual /promocoes e /programas precisam de leitura
-- anônima (0005), aqui é escrita anônima — mas só INSERT, sem select/update/
-- delete, então ninguém de fora consegue ler mensagens de terceiros.
create policy "contact_messages: insert anyone" on public.contact_messages
  for insert with check (true);

create policy "contact_messages: admin read" on public.contact_messages
  for select using (public.is_admin());
