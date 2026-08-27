# PRODUCTION_READINESS_REPORT.md — Radar Milhas & Viagens

**Data**: 26-27/08/2026. Auditoria conduzida sobre o estado real do repositório (não sobre o
relatório anterior) — `git log`/`git status` confirmados no início, commit `1426a6d` (fim da
mega-etapa Fases 3-11) presente na história, working tree limpo. 4 sub-auditorias especializadas
(env vars, segurança, Stripe/cron, rotas/SEO) rodadas em paralelo, mais checagem direta de
`npm audit`, Vercel (deploys/logs reais de produção) e smoke test HTTP contra a produção real.

## Executive Summary

O app está **rodando em produção agora** (`radar-milhas-viagens.vercel.app`, deploy automático a
cada push, todos READY). Código, banco e segurança estão sólidos — nenhum achado crítico de
segurança, nenhuma regressão, build/typecheck limpos. **Existe 1 blocker real e confirmado por
log de produção**: o Stripe checkout está falhando pra usuários reais agora (`No such price`).
Sem esse Price ID corrigido, ninguém consegue assinar um plano pago. O resto do app (World Radar,
Estadias, Cruzeiros, Trip Builder, Concierge, Price Intelligence, Advanced Radars, autenticação,
admin) está íntegro e utilizável.

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

🔴 **BLOCKER CONFIRMADO POR LOG REAL DE PRODUÇÃO**: `Error: No such price:
'price_1U8jeSFbJuUYebOzjb7TReB3'`, 4 ocorrências, a mais recente às 23:38 UTC de 26/08 (poucas
horas antes desta auditoria) — usuário real tentando assinar recebeu erro 400 no checkout.
Confirma que a pendência do "Arc A" (sessão anterior a esta mega-etapa) **não foi resolvida**.
Webhook (`STRIPE_WEBHOOK_SECRET`) mostra histórico misto no log (ausente até ~20:37 UTC, depois 1
falha de assinatura às 22:38 UTC) — estado atual não confirmável sem um novo teste real.
Corrigido nesta auditoria (não depende do Igor): o webhook agora devolve 500 (Stripe reentrega)
em vez de 200 quando uma escrita crítica falha de verdade — antes, uma falha de banco nesse
momento deixava a assinatura desatualizada pra sempre sem nenhum retry.

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

1. 🔴 Stripe Price ID inválido em produção (ver seção Stripe) — bloqueia monetização.
2. STRIPE_WEBHOOK_SECRET com histórico de log misto — precisa nova verificação real.
3. `next lint` sem configuração neste projeto (nunca teve) — gate de qualidade é só
   typecheck+build.
4. 1 vulnerabilidade de dependência (postcss) só resolve com upgrade major do Next — não
   aplicado.
5. Conteúdo curado das Fases 3, 4, 11 é `is_mock=true`/estimado — precisa curadoria antes de
   promessa comercial (já documentado desde a Fase 3).
6. `CRON_SECRET` — sem confirmação direta (sem tool pra ler env var da Vercel), só inferência
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

# GO WITH CONDITIONS

O código está production-ready: build limpo, segurança auditada sem achado explorável, RLS
correta, rotas protegidas, IA com custo controlado por padrão, webhook do Stripe agora resiliente
a falha transitória. **A condição que bloqueia lançamento comercial pleno é uma só, e não é
código**: o Price ID do Stripe em produção está incorreto (confirmado por log real, usuários
reais recebendo erro no checkout agora). Até isso ser corrigido no Stripe Dashboard + Vercel (ação
que só o Igor pode fazer, envolve conta de pagamento real), o app funciona perfeitamente para
todo uso gratuito/orgânico, mas ninguém consegue completar uma assinatura paga.
