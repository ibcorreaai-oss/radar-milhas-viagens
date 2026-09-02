# SECURITY_REPORT.md — Radar Milhas & Viagens

> Relatório de segurança consolidado, pedido pelo Igor na ETAPA 20 (pós-deploy). Reúne os
> achados de duas auditorias adversariais independentes (ETAPA 19, antes do deploy, e ETAPA 20,
> depois — checando o site já publicado) mais a varredura de segredos expostos. Não substitui
> `AUTH_AND_ADMIN.md`/`PLATFORM_ADMIN.md`/`MONETIZATION.md`, que têm o detalhe de cada
> subsistema — este documento é a visão consolidada de "estamos seguros pra estar no ar?".

## Resumo executivo

**Nenhum bloqueador crítico ou vulnerabilidade ativa encontrada.** O app já passou por 4
revisões adversariais reais ao longo do desenvolvimento (ETAPA 14→15.2, ETAPA 19, ETAPA 20, mais
o `/code-review` pontual em cada etapa nova) — a maioria dos problemas sérios já foi achada e
corrigida em etapas anteriores. Os achados desta rodada final são hardening (reforço preventivo),
não brechas exploráveis hoje.

## 1. Segredos e credenciais

- **Nenhum segredo hardcoded em arquivo rastreado pelo git** — variedade de padrões (`sk_live_`,
  `sk_test_`, `whsec_`, `AKIA`, chave privada PEM, JWT longo) checados contra os 304+ arquivos do
  repositório E contra o histórico completo do git (não só o estado atual — um segredo commitado
  e depois removido ainda apareceria no histórico; não apareceu).
- `.env.local` nunca foi commitado (confirmado via `git log --all -- .env.local`, resultado
  vazio) e está corretamente no `.gitignore`.
- `.env.production` (novo, ETAPA 20) é intencionalmente versionado — só contém
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`, os dois valores que a própria
  Supabase documenta como seguros para expor no client (a segurança real vem da RLS no banco,
  não do sigilo dessas duas strings).
- Chaves genuinamente secretas (`SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
  `STRIPE_WEBHOOK_SECRET`, `CRON_SECRET`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`,
  `N8N_ALERT_WEBHOOK_SECRET`) continuam fora do repositório — só no `.env.local` local (nunca
  commitado) até você colar no dashboard da Vercel.

## 2. Autenticação e autorização (RBAC)

- `role` do usuário nunca é gravável pelo client — a RLS de `profiles` restringe as colunas que
  `authenticated` pode fazer `UPDATE` (grant explícito, `role`/`plan`/`subscription` de fora).
  Mudança de role só via função `security definer` (`admin_set_user_role`) ou webhook Stripe.
- `super_admin` acima de `admin`, nunca ao lado — `is_admin()`/`isAdminRole()` tratam os dois como
  equivalentes pra acesso, e só `super_admin` pode promover/bloquear outro admin.
- Conta bloqueada (`blocked_at`) tem **enforcement em 4 camadas** (achado e corrigido em revisão
  adversarial anterior): middleware, `layout.tsx` do grupo `(app)`, toda Server Action de
  conteúdo comum, e o momento do login — nenhuma sessão já aberta de conta bloqueada consegue
  escrever nada, mesmo com o token JWT ainda tecnicamente válido.
- Gate de assinatura/trial (ETAPA 16) tinha só **1 camada** (só `middleware.ts`) até a ETAPA 20 —
  achado em auditoria e corrigido: agora tem 2 camadas, igual ao bloqueio de conta
  (`app/(app)/layout.tsx` replica o mesmo check via header `x-pathname` propagado pelo
  middleware). Não era explorável hoje (Next.js 15.5.20 já corrige o bypass de middleware
  conhecido, CVE-2025-29927), mas ficaria frágil a uma mudança futura de rota sem essa segunda
  camada.
- Testado ao vivo (ETAPA 20): usuário comum tentando acessar `/admin`/`/admin/usuarios`
  diretamente pela URL é redirecionado — não é só o menu que esconde o link.

## 3. Pagamentos (Stripe)

- Webhook valida a assinatura da requisição (`stripe.webhooks.constructEvent`) antes de processar
  qualquer coisa — rejeita qualquer chamada forjada.
- `planId`/`userId` usados pra ativar assinatura vêm do `metadata` que a própria Stripe assina no
  evento, nunca de algo que o client manda direto.
- `priceId` do checkout é resolvido no servidor a partir do `planId` — o client não escolhe o
  preço, só o plano; não dá pra pagar R$29,90 e ativar o plano de R$199.
- `subscriptions` não tem policy de INSERT/UPDATE pra `authenticated` — só `service_role`
  (webhook) escreve `plan`/`status`. Um usuário não consegue se auto-promover a plano pago via
  REST direto do Supabase, mesmo tendo a `anon key` (pública) e o próprio JWT.
- CPF/telefone coletados pela própria Stripe no Checkout, nunca armazenados no nosso banco —
  reduz superfície de dado sensível.

## 4. Rate limiting / abuso de endpoint público

| Endpoint público | Rate limit? | Mecanismo |
|---|---|---|
| Chat IA da home | Sim | Contador atômico por e-mail/dia (RPC `security definer`), corrigido na ETAPA 15.1 depois de achar que o limite antigo nunca disparava |
| Cadastro/login (OTP) | Implícito | Limite de e-mail do próprio Supabase Auth (GoTrue) |
| **Formulário de contato** | **Não tinha até a ETAPA 20** | Achado em auditoria: só honeypot contra bot, sem throttle real. Corrigido: mesmo padrão do chat (RPC + migration `0023`), 5 mensagens/dia por e-mail |

## 5. Cabeçalhos HTTP de segurança

Não existiam até a ETAPA 19. Adicionados em `next.config.mjs`, confirmados ao vivo no site já
publicado:

| Header | Valor | Confirmado em produção? |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | ✅ |
| `X-Frame-Options` | `DENY` (proteção contra clickjacking) | ✅ |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | ✅ |
| `Strict-Transport-Security` (HTTPS forçado) | `max-age=63072000; includeSubDomains; preload` | ✅ — **de graça da Vercel**, nem precisou configurar |

**Content-Security-Policy (CSP) deliberadamente não incluída**: o app carrega scripts opcionais
de terceiros (GA4, Meta/Google/TikTok/Twitter pixel), cada um só se a env var existir. Uma CSP
estrita escrita sem tráfego real pra testar contra correria risco de quebrar algum desses
scripts silenciosamente — fica como melhoria futura, não como pendência urgente.

## 6. Achados corrigidos nesta rodada final (ETAPA 19+20)

| # | Achado | Severidade | Status |
|---|---|---|---|
| 1 | Gate de assinatura só em 1 camada (middleware) | Moderado | ✅ Corrigido — 2ª camada em `layout.tsx` |
| 2 | Formulário de contato sem rate limit real | Baixo-moderado | ✅ Corrigido — RPC + migration |
| 3 | Sem headers HTTP de segurança | Baixo-moderado | ✅ Corrigido |
| 4 | `sitemap.xml`/`robots.txt`/JSON-LD apontando pra `localhost` em produção | Baixo (não é falha de segurança em si, mas indexação/GEO quebrada) | ✅ Corrigido — `lib/site-url.ts` autocorrige sem depender de configuração manual |
| 5 | Contraste de cor abaixo do WCAG AA em 2 tokens de cor | Acessibilidade, não segurança | ✅ Corrigido |

## 7. O que só você consegue resolver (nenhuma ferramenta minha alcança)

**Atualizado 02/09/2026 — a maioria já foi resolvida.** `STRIPE_SECRET_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, `OPS_ALERT_EMAIL` e todas as env
vars da Vercel já estão configuradas e confirmadas funcionando ao vivo (checkout pago completo,
e-mails, crons). "Leaked password protection" também já confirmado **ativado** no Supabase. Só
resta:

- [ ] Template de e-mail "Magic Link" com código de 6 dígitos — funcional (código chega), mas o
      texto explicativo "Ou digite este código:" não aparece na visualização via API do Resend;
      pode ser só um bug de exibição da ferramenta — pedir pro Igor conferir na caixa de entrada
      real antes de investigar mais.
- [ ] Comprar o domínio próprio — decisão do Igor, adiada.

## 8. ETAPA 20 v2 (02/09/2026) — reauditoria completa pós Stripe/Resend/cron

Rodada nova, pedida pelo Igor depois de resolver Stripe (Price IDs da conta certa), RESEND_API_KEY,
CRON_SECRET e OPS_ALERT_EMAIL no mesmo dia. Metodologia: fork read-only dedicado, com mandato de
**testar de verdade, não assumir** — toda alegação abaixo tem teste empírico por trás, não é
releitura de código.

**IDOR/RLS testado com 2 contas reais, JWT via magic link, requests diretos no REST do Supabase
(sem passar pelo app)** — confirmado seguro em 7 tabelas: `favorites`, `trips` (privada invisível
pra outra conta; compartilhada legível mas não editável por quem não é dono), `bucket_lists`,
`bucket_list_items` (inclusive tentativa de INSERT injetando `bucket_list_id` de outra conta →
403 explícito), `flight_searches`, `hotel_searches`, `user_loyalty_programs` (mesma policy já
confirmada nas outras 6, `loyalty_programs` sem dado pra testar com FK válida). Em todo caso:
leitura cross-account vazia, escrita/delete 0 linhas afetadas, dado do dono nunca alterado
(reconfirmado lendo de volta como o próprio dono).

**32 arquivos com `'use server'` revisados um a um**: os 10 admin todos com `requireAdmin()`/
`requireSuperAdmin()`; `viagens/actions.ts` usa um helper próprio `requireOwnedTrip()` que checa
dono explicitamente além da RLS (defesa em profundidade); todo o resto (assinatura, favoritos,
bucket-list, perfil, consultor-ia, concierge, montar-viagem, descobrir, estadias, cruzeiros,
hoteis, voos, treinamentos, alertas) com guard presente em toda função sensível. Nenhum endpoint
admin órfão sem checagem.

**Secrets no bundle client**: `SUPABASE_SERVICE_ROLE_KEY`, `STRIPE_SECRET_KEY`,
`RESEND_API_KEY`, `CRON_SECRET`, `OPS_ALERT_EMAIL` só aparecem em route handlers/Server
Actions/libs server-only — nenhum importador `'use client'` toca neles.

**Rate limiting reconfirmado ao vivo**: as 2 RPCs de contador (`increment_home_chat_message_count`,
`increment_contact_message_count`) continuam com `EXECUTE` revogado de `anon`/`authenticated`
(testado via `has_function_privilege` + chamada REST direta → 401) — fix de 27/08 não regrediu.

**SQL injection**: nenhum padrão de concatenação de string em query. Único `.or()` dinâmico
(`refresh-promotions/route.ts:58`) usa data gerada só pelo servidor, zero influência de input
externo, rota protegida por `CRON_SECRET`.

**Headers**: `X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`,
`Permissions-Policy` confirmados globais em `next.config.mjs`. CSP segue deliberadamente ausente
(mesma decisão já revisada — pixels de terceiros opcionais quebrariam sem tráfego real pra
calibrar).

**`window.confirm()` no botão "Excluir" de alertas** — travou a ferramenta de automação em
browser (comportamento esperado e documentado: diálogo nativo do navegador bloqueia o CDP). Não é
bug — é o padrão de confirmação da própria interface, funciona normal pra um usuário real. Vale
registrar aqui só pra nenhuma auditoria futura reabrir isso como suspeita.

**Nenhum achado novo de segurança nesta rodada — zero fix necessário.** `git status` limpo antes
e depois da auditoria.
