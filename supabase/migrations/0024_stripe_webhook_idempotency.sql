-- ETAPA 20 (auditoria pos-deploy) -- achado real: app/api/webhooks/stripe/route.ts
-- reenvia e-mail de "assinatura ativada" toda vez que processa
-- checkout.session.completed, sem checar se aquele event.id ja foi
-- processado antes -- uma reentrega da Stripe (retry por timeout,
-- reenvio manual no dashboard) duplica o e-mail pro usuario mesmo a
-- escrita no banco ja sendo idempotente (upsert por user_id). Tabela
-- simples de "ja vi esse evento" -- so o service_role (webhook) toca
-- nela, mesmo padrao de RLS sem policy ja usado em
-- home_chat_message_counts/contact_message_counts.

create table public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
-- Sem policy pra nenhum role -- so service_role (bypassa RLS) escreve/le.
