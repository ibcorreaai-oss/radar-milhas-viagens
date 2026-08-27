# PRODUCTION_READINESS_REPORT.md — Radar Milhas & Viagens

**Data**: 26-27/08/2026. Auditoria conduzida sobre o estado real do repositório (não sobre o
relatório anterior) — `git log`/`git status` confirmados no início, commit `1426a6d` (fim da
mega-etapa Fases 3-11) presente na história, working tree limpo. 4 sub-auditorias especializadas
(env vars, segurança, Stripe/cron, rotas/SEO) rodadas em paralelo, mais checagem direta de
`npm audit`, Vercel (deploys/logs reais de produção) e smoke test HTTP contra a produção real.

## Executive Summary

O app está **rodando em produção agora** (`radar-milhas-viagens.vercel.app`, deploy automático a
cada push, todos READY). Código, banco e segurança estão sólidos — nenhum achado crítico de
segurança, nenhuma regressão, build/typecheck limpos. **Atualização final (27/08)**: o blocker de
Stripe (`No such price`, Price IDs de conta/escopo errado) foi corrigido por Igor no Stripe
Dashboard real + Vercel, e validado ponta a ponta — Igor testou pessoalmente os 6 checkouts
(Premium/Pro/Consultor × mensal/anual) em produção, todos abriram o Stripe Checkout
corretamente, nenhum pagamento concluído. Nenhum blocker restante. World Radar, Estadias,
Cruzeiros, Trip Builder, Concierge, Price Intelligence, Advanced Radars, autenticação, admin e
monetização estão todos íntegros e utilizáveis. **Decisão: GO.**

## Current Git State

- Branch: `master`, rastreando `origin/master`, sem divergência.
- Commit final desta auditoria: `1d8f78c` (fix do webhook Stripe) — precedido por `be503d4`
  (rotas protegidas), `7cc216e` (npm audit fix), `4300161` (Groq/AIProvider), `1426a6d`
  (relatório World Experience Radar).
- Working tree limpo, nada não commitado.
- Nenhum force-push, nenhum `git reset --hard` usado nesta sessão.

## Architecture

Next.js 15 (App Router) + Supabase (Postgres/Auth/RLS) + Stripe + Resend + Vercel. 77 rotas
(68 páginas + 9 route handlers). Nenhuma mudança de stack/arquitetura feita nesta auditoria —
só correções pontuais (ver seções abaixo).

## Build

- `npx tsc --noEmit`: **limpo**.
- `npx next build`: **limpo**, 77 rotas geradas, sem erro/warning novo.
- Confirmado depois de CADA mudança desta auditoria (não só uma vez no fim).

## Tests / E2E

Não existe suíte de testes automatizados (nem Jest/Vitest, nem Playwright configurado —
confirmado: sem `playwright.config.*`, sem scripts `test`/`test:e2e` no `package.json`). Todas as
fases anteriores desta sessão (e desta auditoria) validaram fluxos críticos via **smoke test
manual real**: navegador (Chrome) para telas autenticadas, `curl` direto contra a URL de produção
para rotas públicas. Introduzir uma suíte E2E do zero agora seria uma mudança de escopo maior que
"auditoria + correção", não foi feito por decisão de risco — registrado como recomendação, não
como pendência bloqueante.

**Smoke test real rodado contra produção nesta auditoria** (`curl` contra
`https://radar-milhas-viagens.vercel.app`):

| Rota | Resultado |
|---|---|
| `/` | 200 |
| `/login` | 200 |
| `/robots.txt` | 200, regras corretas |
| `/sitemap.xml` | 200 |
| `/manifest.webmanifest` | 200 |
| `/api/health` | 200, `{"status":"ok",...,"database":"skipped"}` |
| `/favicon.ico` | 200 |
| `/dashboard` (sem sessão) | 307 → `/login?next=%2Fdashboard` (correto) |
| `/admin` (sem sessão) | 307 → `/login?next=%2Fadmin` (correto) |

## Routes

77 rotas totais: 23 PUBLIC, 17 AUTHENTICATED, 29 ADMIN, 3 API simples, 1 WEBHOOK, 4 CRON.
Nenhum gap de autorização real encontrado — toda rota ADMIN está sob `/admin` (middleware +
checagem de role); toda rota AUTHENTICATED estava protegida por middleware OU checagem própria
na página (achado corrigido nesta auditoria: `/viagens`, `/montar-viagem`, `/concierge` agora
também estão em `middleware.ts` e `robots.ts`, por consistência/defesa em profundidade — não
eram uma falha de segurança real, já tinham checagem própria).

## Supabase

- `get_advisors(security)`: nenhum achado novo introduzido pelas tabelas desta mega-etapa
  (`stays`, `cruises`, `trips`, `price_observations`) — mesmos achados pré-existentes de antes.
- `get_advisors(performance)`: 100 achados, **0 ERROR**. Os que tocam tabelas novas são o mesmo
  padrão de RLS já usado desde a Fase 2 (`auth.uid()` sem `select`), não uma regressão.
- RLS confirmada correta nas 4 tabelas novas (leitura `authenticated`, escrita `is_admin()`,
  dono-only em `trips`/`price_observations` append-only sem update/delete).

## RLS

Ver acima — sem achado novo. Padrão de RLS é consistente em todo o app desde a Fase 2.

## Authentication

- Login/cadastro por OTP funcionando em produção (200 em `/login`/`/cadastro`, redirects
  corretos para rotas protegidas).
- IDOR checado (spot-check via agente): bucket-list, viagens, favoritos, alertas, admin CRUDs —
  todos com checagem de dono explícita ou RLS confirmada correta.
- **Achado histórico, não novo**: log real de produção mostra 1 falha de OAuth/recovery
  ("code challenge does not match") e 2 falhas de rate-limit de e-mail em contas de teste QA —
  ambos já documentados em `MANUAL_ACTIONS.md` (falta SMTP próprio), não são bugs novos.

## Stripe

**Estado original (26/08)**: 🔴 BLOCKER confirmado por log real de produção: `Error: No such
price: 'price_1U8jeSFbJuUYebOzjb7TReB3'`, 4 ocorrências, a mais recente às 23:38 UTC de 26/08 —
usuário real tentando assinar recebeu erro 400 no checkout. Webhook mostrava histórico misto no
log (ausente até ~20:37 UTC, depois 1 falha de assinatura às 22:38 UTC).

**Estado final (27/08, validado ponta a ponta)**: Igor corrigiu os 6 Price IDs e o
`STRIPE_WEBHOOK_SECRET` diretamente no Stripe Dashboard real + Vercel. Redeploy disparado
(`git commit --allow-empty`, commit `5071f0d`) e confirmado `READY`. Igor então **testou
pessoalmente os 6 checkouts em produção** (Premium/Pro/Consultor × mensal/anual) — todos abriram
o Stripe Checkout corretamente, nenhum pagamento concluído, nenhum cartão inserido.
`get_runtime_errors` confirma nenhum erro novo de Stripe (`No such price`/
`StripeInvalidRequestError`) nas 2h seguintes aos testes. **Causa raiz resolvida e confirmada
por evidência real de uso, não só ausência de erro.** Ver "Final Stripe Validation" abaixo pro
detalhe completo.

Corrigido nesta auditoria via código (não depende do Igor): o webhook agora devolve 500 (Stripe
reentrega) em vez de 200 quando uma escrita crítica falha de verdade — antes, uma falha de banco
nesse momento deixava a assinatura desatualizada pra sempre sem nenhum retry. O checkout também
agora captura qualquer erro da Stripe e mostra mensagem amigável em vez de tela quebrada.

## Final Stripe Validation

**Root cause**: os 6 Price IDs configurados (`STRIPE_PRICE_PREMIUM/_PRO/_CONSULTOR` + `_ANNUAL`)
compartilham o mesmo prefixo de criação em lote (`price_1U8j...FbJuUYebOz...`) — foram criados
juntos, na mesma sessão. Isso é consistente com o diagnóstico já registrado antes desta
mega-etapa: provavelmente criados via a integração MCP do Stripe, que opera numa conta/escopo
diferente da conta real do Igor — Price IDs de lá nunca funcionam com o `STRIPE_SECRET_KEY`
real. `STRIPE_PRICE_PREMIUM` já foi confirmado inválido por um erro real de produção; os outros
5 são fortemente suspeitos (mesmo lote), mas não confirmados individualmente por log — nenhum
usuário tentou usá-los ainda.

**Tentativa de verificação direta (não invento resultado que não consegui obter)**: tentei
confirmar definitivamente via uma chamada só-leitura (`stripe.prices.retrieve()`, sem criar
checkout nem cobrança) contra o `STRIPE_SECRET_KEY` real. **Não foi possível**: essa variável
está vazia em `.env.local` — só existe configurada na Vercel, que nenhuma ferramenta disponível
consegue ler. Script de teste descartado sem deixar rastro no projeto.

**Fix aplicado (código, não depende do Igor)**: `app/(app)/assinatura/actions.ts` — a chamada
`stripe.checkout.sessions.create()` agora está dentro de um `try/catch`. Qualquer erro da API da
Stripe (Price ID inválido, conta errada, o que for) é logado com `logger.critical` (categoria
`payment`, sem nenhum dado sensível) e redireciona para a mensagem amigável já existente
(`/assinatura?erro=stripe_nao_configurado`) em vez de deixar a exceção estourar sem tratamento
(o que antes gerava a tela de erro genérica do Next.js, digest sem detalhe nenhum, visível no
log real de produção desta mesma auditoria). O mesmo tratamento cobre o caso (não observado, mas
possível) de a Stripe retornar uma sessão sem `url`.

**Checkout Session — teste real não realizado**: não tentei criar uma Checkout Session de
verdade (nem via navegador nem via API) porque isso exigiria autenticar como um usuário real
logado no app com plano elegível, e a regra de custo zero + a regra de nunca inserir credencial
me impedem de logar por conta própria. O log de produção já é evidência mais forte que um teste
sintético meu: mostra o app tentando de verdade, na produção real, e falhando com a causa exata.

**Success/Cancel URL**: confirmadas seguras — `getSiteUrl()` (resolvido só a partir de env vars
do servidor/Vercel, nunca de input do usuário), nunca `localhost` em produção.

**Metadata da Checkout Session**: só `userId`/`planId`/`interval` — nenhum dado sensível.

**Price ID arbitrário do cliente**: não é possível — o servidor sempre resolve
`plan → planPriceForInterval() → nome da env var → process.env[nome]`, nunca aceita um
`price_id` vindo direto do formulário/navegador.

**Webhook**: assinatura verificada com `stripe.webhooks.constructEvent()` antes de qualquer
processamento (confirmado por leitura de código, não alterado nesta rodada); estado real de
`STRIPE_WEBHOOK_SECRET` em produção continua `UNVERIFIED UNTIL FIRST REAL SUBSCRIPTION` — só um
evento de teste real do Stripe Dashboard confirma de vez.

**Payments made during testing**: NONE.

### Round 2 — pós-correção manual do Igor (27/08)

- Confirmado via `git status`/`git log`/`git fetch`: nenhuma mudança de código entre o
  relatório anterior e agora — a correção foi só nas env vars (Stripe Dashboard + Vercel), como
  o Igor descreveu.
- Confirmado que **nenhum deploy novo existia desde a correção das env vars** —
  `mcp__vercel__list_deployments` não mostrou nada após o deploy do fix de código. Isso importa:
  salvar uma env var na Vercel **não redeploya** o que já está no ar. Disparado um redeploy
  seguro (`git commit --allow-empty && git push`, commit `5071f0d`) para garantir que os valores
  corrigidos realmente entrem em vigor.
- Deployment `dpl_Fakdb248735GuVhsuoF88ANQD3mb` confirmado `READY`, alias de produção
  (`radar-milhas-viagens.vercel.app`) apontando pra ele.
- `get_runtime_errors` (janelas de 6h e 10min pós-redeploy): nenhum erro novo de Stripe. Os
  únicos 4 grupos de erro que aparecem são os mesmos de antes (26/08), todos com
  `lastDeployment` apontando pra deploys antigos — nenhum atribuível ao código/config atual.
- Smoke test pós-redeploy: `/` 200, `/login` 200, `/dashboard` 307, `/assinatura` 307,
  `/robots.txt` 200 — sem regressão.
- **O que NÃO consegui fazer**: confirmar positivamente que os 6 checkouts (Premium/Pro/
  Consultor × mensal/anual) chegam ao Stripe Checkout de verdade. Isso exigiria autenticar como
  usuário real em produção e clicar em "Assinar" — a regra de nunca inserir/contornar credencial
  me impede de fazer isso sozinho, e não há sessão autenticada de produção disponível nesta
  sessão. "Ausência de erro novo" é evidência de que a correção não quebrou nada visivelmente,
  mas não é o mesmo que "confirmado funcionando" — por isso o status fica `PENDING
  CONFIRMATION`, não `PASS`, até alguém completar esse clique real (só o Igor pode).

### Round 3 — validação manual real pelo Igor (27/08, mesma data)

Igor reportou ter testado pessoalmente os 6 planos (Premium/Pro/Consultor × mensal/anual) em
produção, autenticado, e confirmou que **todos abriram o Stripe Checkout normalmente** — nenhum
pagamento concluído, nenhum cartão inserido. Esse é exatamente o teste que o Round 2 identificou
como impossível de eu fazer sozinho (exige login real em produção), então esta confirmação
fecha a lacuna.

Verificação feita nesta rodada: `get_runtime_errors` na janela de 2h cobrindo os testes —
**nenhum erro novo de Stripe** (`No such price`/`StripeInvalidRequestError`/falha de
assinatura). Consistente com o relato do Igor, embora a fonte primária de verdade seja o teste
manual dele, não a ausência de erro (que sozinha só prova "ninguém tentou" ou "tentou e deu
certo", nunca as duas coisas de forma distinguível por log). Combinando as duas evidências —
relato direto de quem tem a única conta que pode testar + ausência de qualquer erro nos logs
durante a janela dos testes — a correção está confirmada.

Webhook: o teste operacional de 1 evento real via "Send test webhook" não foi mencionado como
feito — mantido como item opcional/não-bloqueante (os 6 checkouts já provam que a integração de
Price ID está correta; o webhook cobre o ciclo pós-pagamento, que só é exercitado de fato na
primeira assinatura real).

**Payments made during this round**: NONE.

## AI Providers

`lib/ai/provider.ts` corrigido nesta sessão: nunca usa Anthropic (pago) por padrão, mesmo com a
chave configurada — só com opt-in explícito. Prefere Groq (grátis) quando configurada. Testado
com 5 combinações de env var, todas corretas.

## Cost Protection

- IA: resolvido, ver acima.
- Cron: todos os 4 crons falham fechado sem `CRON_SECRET` (nunca abrem sem o secret) —
  confirmado por leitura de código, e ausência de log de "unauthorized" nos últimos 7 dias é
  consistente com estar configurado.
- Nenhuma chamada paga real foi feita durante esta auditoria (Stripe/Anthropic/Groq) — toda
  verificação foi estrutural (leitura de código) ou via banco direto.

## Security

Auditoria dedicada (8 categorias: XSS, code injection, open redirect, SSRF, IDOR, prompt
injection, log de segredo, CSRF/auth de API route) — **nenhum achado explorável em nenhuma
categoria**. `npm audit`: 4 vulnerabilidades altas corrigidas (nanoid, next patch, sharp); 1
restante (postcss dentro de `next/node_modules`) só resolve com Next 16 (major, breaking) — não
aplicado por decisão de risco, registrado como pendência não-bloqueante.

## LGPD

Não re-auditado a fundo nesta sessão (fora do escopo das Fases 3-11) — `/privacidade` já cobre
LGPD de forma substantiva desde etapa anterior (Lei 13.709/2018 citada, direitos do titular,
canal de contato). Sem mudança.

## SEO

Sitemap/robots/metadata confirmados corretos; único achado (3 rotas autenticadas ausentes do
`robots.txt`) corrigido nesta auditoria. Nenhuma página autenticada aparece no sitemap.

## Accessibility

Spot-check pragmático (não exaustivo): imagens com `alt` real quando o conteúdo é dinâmico
(nome do destino/evento), `alt=""` correto em imagens puramente decorativas (hero, cards de
marketing) — padrão correto encontrado, sem achado. Auditoria completa de teclado/contraste/aria
em todas as 77 rotas está fora do escopo desta passada — **UNVERIFIED** em profundidade.

## Performance

Sem achado novo de performance introduzido por esta mega-etapa (ver Supabase acima). Nenhuma
micro-otimização feita — fora de escopo desta auditoria.

## Deployment

Confirmado via API da Vercel: projeto `radar-milhas-viagens`, deploy automático via GitHub a
cada push em `master`, último deploy (commit `7cc216e`) **READY** em produção antes desta
auditoria; os 2 commits mais recentes desta auditoria (`be503d4`, `1d8f78c`) disparam novo deploy
automaticamente ao serem lidos por este relatório. Sem proteção de deployment (site público).
Sem domínio próprio ainda (`radar-milhas-viagens.vercel.app`).

## Post-deploy Smoke Test

Ver seção Tests/E2E acima — todas as rotas testadas retornaram o resultado esperado.

## Known Issues

1. STRIPE_WEBHOOK_SECRET: corrigido pelo Igor, falta reenviar 1 evento de teste real (opcional,
   não bloqueia — ver seção Stripe).
2. `next lint` sem configuração neste projeto (nunca teve) — gate de qualidade é só
   typecheck+build.
3. 1 vulnerabilidade de dependência (postcss) só resolve com upgrade major do Next — não
   aplicado.
4. Conteúdo curado das Fases 3, 4, 11 é `is_mock=true`/estimado — precisa curadoria antes de
   promessa comercial (já documentado desde a Fase 3).
5. `CRON_SECRET` — sem confirmação direta (sem tool pra ler env var da Vercel), só inferência
   por ausência de erro nos logs.

## Manual Actions

Consolidado em `MANUAL_ACTIONS.md` (estrutura BLOCKERS/IMPORTANT/OPTIONAL/DONE).

## Rollback Plan

- **Código**: cada commit desta sessão foi empurrado individualmente e gerou um deployment
  `READY` próprio na Vercel (confirmado via `list_deployments`) — reverter é escolher qualquer
  deployment anterior no painel da Vercel ("Promote to Production") ou `git revert <sha>` +
  push (nunca `git reset --hard`).
- **Banco**: todas as migrations desta mega-etapa são aditivas (tabelas novas, colunas novas com
  default seguro, flags que nascem `false`) — nenhuma removeu ou alterou dado existente. Reverter
  código sem reverter schema é seguro (colunas/tabelas novas só ficam sem uso, não quebram nada).
  Reverter o schema em si exigiria migrations de rollback manuais, não geradas automaticamente
  (nenhuma foi necessária nesta auditoria).
- **Feature flags**: qualquer fase nova pode ser desligada individualmente via
  `update feature_flags set enabled=false where key='...'` sem precisar reverter código nenhum —
  mecanismo de rollback mais rápido que existe no app.
- **AI_PROVIDER**: setar `AI_PROVIDER=none` na Vercel desliga qualquer IA instantaneamente
  (sem redeploy — é lido em runtime), sem afetar nenhuma outra feature.
- **Stripe**: nenhuma mudança de código desta sessão precisa de rollback — o achado é de
  configuração (Price ID), não de código.

## GO / NO-GO

# GO

O código está production-ready: build limpo, segurança auditada sem achado explorável, RLS
correta, rotas protegidas, IA com custo controlado por padrão, webhook do Stripe resiliente a
falha transitória, checkout falha graciosamente em vez de quebrar a tela. Igor corrigiu
manualmente os 6 Price IDs e o webhook secret no Stripe Dashboard real + Vercel, disparou-se um
redeploy confirmado `READY`, e **Igor testou pessoalmente os 6 checkouts em produção**
(Premium/Pro/Consultor × mensal/anual) — todos abriram o Stripe Checkout corretamente, nenhum
pagamento concluído. `get_runtime_errors` confirma nenhum erro novo de Stripe na janela dos
testes. Nenhum blocker técnico ou de configuração restante. Único item não-bloqueante: enviar 1
evento de teste real do webhook pelo Stripe Dashboard (cobre o ciclo pós-pagamento, exercitado
de fato só na primeira assinatura real) — recomendado, não obrigatório para o lançamento.
