# OBSERVABILITY.md — Radar Milhas & Viagens

> Logs estruturados, auditoria, autenticação, pagamentos, erros, integrações, uptime e
> alertas. Escrito em 25/08/2026 (ETAPA 4 do Igor).

## Arquitetura em uma frase

Dois sistemas de log distintos, cada um com o papel certo — não um substituindo o outro:

| | `lib/logger.ts` (novo) | `lib/audit-log.ts` (ETAPA 3) |
|---|---|---|
| **O que é** | Log operacional efêmero | Trilha de auditoria de negócio permanente |
| **Onde vive** | stdout/stderr → Runtime Logs da Vercel | Tabela `audit_logs` no Postgres |
| **Para quê** | "o que o sistema estava fazendo quando algo deu errado" | "quem mudou o quê, e o que era antes" |
| **Quem escreve** | Qualquer código server-side | Só as 4 exclusões do admin (por enquanto) |
| **Retenção** | A do plano da Vercel (dias a semanas) | Permanente, cresce com o banco |
| **Custo novo** | Zero — já incluso em qualquer plano Vercel | Zero — tabela já existia |

Não centralizamos num serviço externo de log (Datadog, Better Stack, etc.) agora — seria custo
recorrente sem usuário/tráfego real ainda para justificar. `lib/logger.ts` já é estruturado
(JSON, categorizado, com nível), então dá pra plugar um "log drain" da Vercel para qualquer
serviço externo no futuro sem tocar em uma linha de código de aplicação — só configuração na
Vercel. Isso é uma decisão de custo do Igor, não uma limitação técnica (ver checklist).

## 1. Logs estruturados

`lib/logger.ts` — `logger.info/warn/error/critical(category, message, fields)`. Cada chamada
emite uma linha JSON (`{ timestamp, level, category, message, ...fields }`) — buscável e
filtrável no painel de Runtime Logs da Vercel por categoria/nível sem precisar abrir cada linha.
Categorias: `auth`, `payment`, `integration`, `cron`, `audit`, `system`, `http`.

## 2. Logs de auditoria

Já existia desde a ETAPA 3 (`lib/audit-log.ts` + tabela `audit_logs`) — sem mudança nesta etapa,
só reafirmando o escopo: exclusões do admin em `opportunities`/`promotions`/`loyalty_programs`/
`world_events`, com snapshot da linha antes de sumir. Ver `DISASTER_RECOVERY.md` §4.

## 3. Logs de autenticação

Adicionado nesta etapa em todo ponto de auth que não tinha nenhum log:

- `app/(auth)/login/actions.ts` — sucesso e falha de login (falha loga o e-mail e o motivo do
  Supabase, mas nunca a senha — dá pra detectar um padrão de força bruta pelo volume de falhas
  no mesmo e-mail, sem guardar credencial nenhuma).
- `app/(auth)/cadastro/actions.ts` — sucesso, rejeição por e-mail duplicado, falha inesperada.
- `app/(auth)/recuperar-senha/actions.ts` — pedido de recuperação (log só no servidor; a
  resposta pro usuário continua sempre genérica, de propósito, contra enumeração de contas).
- `app/auth/redefinir/actions.ts` — sucesso e falha ao definir nova senha.
- `app/auth/callback/route.ts` — sucesso/falha da troca de code por sessão (cobre login Google
  e o link de recuperação de senha, que passam pela mesma rota).

## 4. Logs de pagamentos

`app/api/webhooks/stripe/route.ts` — todo evento recebido é logado (`eventType`, `eventId`).
Casos que viram **alerta crítico** (`logger.critical`, dispara e-mail — ver §8):
- Assinatura/secret do webhook ausente ou inválida (config quebrada ou possível forjamento).
- `checkout.session.completed` sem `metadata.userId`/`planId` (cliente pagou e a assinatura
  não foi ativada — dinheiro do usuário sem produto entregue, prioridade máxima).
- Erro ao gravar a assinatura no banco depois de um checkout confirmado.
- `customer.subscription.updated` com status `past_due` — sinal real de falha de cobrança
  (cartão recusado, etc.), sem precisar assinar `invoice.payment_failed` à parte no Stripe.
- Qualquer exceção não tratada ao processar um evento.

## 5. Logs de erros

- **Server-side** (Server Actions, Route Handlers, cron): `logger.error`/`logger.critical`
  diretamente no ponto do erro — feito nesta etapa em auth, pagamentos, crons e integrações.
- **Client-side não tratado**: `app/error.tsx` (erro dentro de qualquer página) e
  `app/global-error.tsx` (erro no próprio root layout — único caso que `error.tsx` não cobre)
  são os error boundaries do App Router. Os dois mostram uma tela amigável com botão "Tentar de
  novo" e reportam pro servidor via `POST /api/log-client-error`, que vira `logger.error`.
  **Deliberadamente não é `logger.critical`**: é uma rota pública, sem sessão — se fosse crítico,
  qualquer um poderia martelar a rota e spammar o e-mail de alerta do Igor. Erro de client widely
  reproduzível o suficiente pra importar vai aparecer repetido nos logs (visível por volume), não
  precisa de e-mail individual por ocorrência.

## 6. Logs de integrações externas

Centralizados no ponto de saída real (não em cada chamador — um caller não precisa lembrar de
logar, a integração loga por ele):
- `lib/email/send.ts` (Resend) — log de sucesso, falha e "pulado por falta de credencial".
- `lib/whatsapp/providers/evolution.ts` e `zapi.ts` — mesma coisa para WhatsApp.
- Falha de envio de notificação de alerta (`/api/cron/check-alerts`) aparece automaticamente
  nesses logs — não precisou duplicar nada no cron.

## 7. Monitoramento de uptime

`GET /api/health` — rota pública (sem `CRON_SECRET`, um monitor de uptime não tem como enviar
header customizado na maioria dos planos gratuitos), sem informação sensível na resposta.
Verifica conectividade real com o Supabase (`select` leve em `loyalty_programs`) quando
configurado; sem Supabase configurado ainda, devolve `checks.database: "skipped"` e status
`ok` (não é um "erro" o projeto ainda não ter Supabase — é o estado atual documentado). Resposta:
```json
{ "status": "ok" | "degraded", "timestamp": "...", "checks": { "database": "ok" | "skipped" | "error" } }
```
HTTP 200 quando `ok`, 503 quando `degraded` — a maioria dos monitores de uptime já entende isso
sem configuração extra.

**Pendência manual:** apontar um serviço de uptime gratuito (UptimeRobot, Better Uptime,
Freshping) para `https://<domínio>/api/health` a cada 1-5 min, assim que o domínio existir. Não
implementado neste código porque é uma conta externa, não uma linha de código — ver checklist.

## 8. Alertas críticos (erros/pagamento/autenticação)

`lib/alerts/notify-ops.ts` — `notifyOps()` manda um e-mail pro Igor via o Resend já configurado
(reaproveitado, zero canal novo). Disparado automaticamente por `logger.critical(...)` — nunca
chamado direto pelo resto do código, sempre através do logger, pra manter uma única porta de
entrada. Sem `OPS_ALERT_EMAIL` definido no ambiente, só fica registrado no log estruturado (não
trava nada, não lança erro).

**Auth:** nesta etapa, falha de autenticação vira só `logger.warn`/`error`, não `critical` — uma
senha errada isolada é normal demais pra virar e-mail. Se no futuro entrar uma exigência de
"avisar em caso de possível ataque de força bruta" (N falhas pro mesmo e-mail em M minutos), é
uma feature de detecção de padrão de verdade (precisa de contador com janela de tempo, não é só
logar) — registrar como próxima fase, não implementado agora pra não inventar uma heurística
frágil sem dado real de tráfego pra calibrar.

**Pagamento:** cobre os 4 cenários do §4 acima — é o alerta crítico com maior valor real hoje,
porque dinheiro do usuário sem produto entregue é o pior tipo de bug silencioso possível.

**Erro genérico:** só os detectados server-side (cron, webhook) disparam `critical` — erro de
render no client vira `error` (ver §5), não `critical`.

---

## Checklist manual (decisões e contas que só o Igor pode tomar)

- [ ] Preencher `OPS_ALERT_EMAIL` no `.env.local`/Vercel assim que o Resend estiver configurado
      — sem isso, alertas críticos só aparecem no log, sem e-mail.
- [ ] Criar conta grátis num serviço de uptime (UptimeRobot, Better Uptime ou Freshping) e
      apontar para `/api/health` assim que houver domínio + deploy real.
- [ ] Decidir se/quando vale a pena um serviço de log centralizado pago (Better Stack, Datadog,
      Axiom) — hoje os Runtime Logs da Vercel já cobrem o necessário sem custo extra; só migrar
      quando volume/retenção justificarem.
- [ ] Decidir se/quando vale a pena Sentry (ou equivalente) para stack trace completo de erro de
      client — hoje `app/error.tsx`/`global-error.tsx` capturam e reportam a mensagem, mas não
      o stack trace completo nem breadcrumbs de navegação; isso é o que um serviço de error
      tracking dedicado adiciona.

## Custos externos envolvidos

- Nenhum custo novo obrigatório — logger, healthcheck e alerta por e-mail usam infraestrutura
  que já existia (Vercel Runtime Logs, Resend).
- Uptime monitor: gratuito nos planos básicos dos serviços citados acima.
- Log centralizado / Sentry: só se o Igor decidir contratar — não é dependência do código atual.
