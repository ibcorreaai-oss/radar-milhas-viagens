# LAUNCH_CHECKLIST.md — Radar Milhas & Viagens

Auditoria de 26-27/08/2026. `[PASS]` = verificado com evidência real (build, log, curl, leitura
de código). `[MANUAL]` = depende de ação do Igor. `[FAIL]` = confirmado quebrado. `[N/A]` = não
se aplica. Nunca marcado `[PASS]` sem uma evidência concreta — ver `PRODUCTION_READINESS_REPORT.md`
pro detalhe de cada item.

## Código e build
- [PASS] Git limpo, sem divergência com `origin/master`
- [PASS] `tsc --noEmit` limpo
- [PASS] `next build` limpo (77 rotas)
- [MANUAL] Lint — sem configuração neste projeto (nunca teve); decisão de configurar fica com o Igor
- [PASS] `npm audit` — 4 vulnerabilidades altas corrigidas (nanoid/next/sharp); 1 restante exige Next 16 (não aplicado, decisão de risco)

## Segurança
- [PASS] XSS — nenhum `dangerouslySetInnerHTML` com input de usuário
- [PASS] Code injection — nenhum `eval`/`new Function`
- [PASS] Open redirect — todo redirect com destino de usuário passa por `safeRedirectPath()`
- [PASS] SSRF — nenhum fetch/URL com destino controlado por usuário
- [PASS] IDOR — spot-check em bucket-list/viagens/favoritos/alertas/admin, todos com ownership check ou RLS confirmada
- [PASS] Prompt injection (Concierge/Trip Builder/Consultor IA) — mensagem de usuário nunca vira role system, aviso de segurança sempre imposto pelo código
- [PASS] Logs — nenhum segredo/token/senha logado
- [PASS] CSRF/API routes — todas as rotas de API tem auth própria (cron: `CRON_SECRET`; webhook: assinatura Stripe); mutações de usuário são Server Actions (CSRF nativo do Next.js)
- [PASS] Headers de segurança (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) já configurados desde ETAPA 19
- [N/A] CSP — deliberadamente não implementada (scripts de terceiros opcionais tornariam risco de quebra maior que o ganho, decisão já documentada)
- [PASS] Nenhum segredo commitado no git (verificado: `.env.local` nunca commitado; `.env.production` commitado de propósito só com valores públicos por design)

## Supabase / RLS
- [PASS] RLS correta em todas as 4 tabelas novas (`stays`, `cruises`, `trips`, `price_observations`)
- [PASS] `get_advisors(security)` — sem achado novo introduzido por esta mega-etapa
- [PASS] `get_advisors(performance)` — 0 ERROR; achados existentes são padrão pré-existente

## Autenticação e rotas
- [PASS] `/dashboard` e `/admin` redirecionam corretamente sem sessão (307 → `/login`)
- [PASS] Todas as 29 rotas admin cobertas por middleware + checagem de role
- [PASS] Todas as 17 rotas autenticadas protegidas (middleware ou checagem própria — 3 corrigidas nesta auditoria pra consistência)
- [PASS] `robots.txt` bloqueia corretamente rotas privadas; sitemap só lista rotas públicas

## Stripe / pagamentos
- [FAIL] 🔴 Stripe live environment — checkout real falhando em produção (`No such price`, confirmado por log real, 23:38 UTC de 26/08)
- [FAIL] Stripe Product/Price — `STRIPE_PRICE_PREMIUM` confirmado inválido; `_PRO`/`_CONSULTOR`/anuais suspeitos (mesmo lote de criação) mas não confirmados por log
- [FAIL] Checkout Session — não consegue ser criada com sucesso enquanto o Price ID estiver errado
- [PASS] Success URL / Cancel URL — resolvidas via `getSiteUrl()` server-side, nunca aceitam destino do usuário (sem risco de open redirect)
- [MANUAL] Corrigir os 6 Price IDs no Stripe Dashboard real + colar em cada env var exata na Vercel (nomes exatos em `MANUAL_ACTIONS.md`)
- [MANUAL] Reconfirmar `STRIPE_WEBHOOK_SECRET` com um evento de teste real (histórico de log misto) — [MANUAL] Signature verification: código confirmado correto (`stripe.webhooks.constructEvent`), só o valor real da variável não é confirmável por mim
- [PASS] Webhook agora reentrega em falha de escrita real (corrigido nesta auditoria)
- [PASS] Nenhum segredo Stripe hardcoded no código/git
- [PASS] Erro de checkout agora mostra mensagem amigável em vez de tela quebrada (corrigido nesta auditoria)
- [PASS] Nenhum Price ID arbitrário aceito do cliente — sempre resolvido via whitelist server-side (`plan` → env var → Price ID)
- [N/A] Nenhuma cobrança real feita durante esta investigação (só leitura de código e logs já existentes)

## IA / custo
- [PASS] `AI_PROVIDER` nunca usa Anthropic (pago) por padrão, mesmo com chave configurada
- [MANUAL] Preencher `GROQ_API_KEY`/`GROQ_MODEL` se quiser IA de graça de verdade (opcional)
- [PASS] Trip Builder e Concierge funcionam corretamente em modo fallback (sem IA)

## Cron
- [PASS] Todos os 4 crons falham fechado sem `CRON_SECRET`
- [MANUAL] Confirmar `CRON_SECRET` está setado na Vercel (sem tool pra ler direto, só inferência por ausência de erro nos logs)
- [PASS] Todos os 4 crons são idempotentes (re-rodar não duplica efeito)

## Conteúdo
- [MANUAL] Curadoria/verificação de dados `is_mock=true` das Fases 3, 4, 11 antes de promessa comercial ampla

## Deploy
- [PASS] Deploy automático via GitHub confirmado funcionando (todo commit desta sessão gerou deployment READY)
- [PASS] Sem proteção de deployment bloqueando acesso público
- [MANUAL] Domínio próprio (ainda usando `*.vercel.app`)

## Smoke test pós-deploy (rodado contra produção real)
- [PASS] `/`, `/login`, `/robots.txt`, `/sitemap.xml`, `/manifest.webmanifest`, `/api/health`, `/favicon.ico` — todos 200
- [PASS] `/dashboard`, `/admin` sem sessão — 307 corretos

## Documentação
- [PASS] `PRODUCTION_CONFIG_MATRIX.md` criado
- [PASS] `PRODUCTION_READINESS_REPORT.md` criado
- [PASS] `MANUAL_ACTIONS.md` reorganizado (BLOCKERS/IMPORTANT/OPTIONAL/DONE)
- [PASS] `LAUNCH_CHECKLIST.md` (este arquivo) criado
- [N/A] Testes E2E — sem framework instalado; smoke test manual/curl usado em todas as fases desta sessão em vez disso (decisão de risco documentada em `PRODUCTION_READINESS_REPORT.md`)

## Decisão final

Ver `PRODUCTION_READINESS_REPORT.md` — **GO WITH CONDITIONS**. Único blocker real: Price ID do
Stripe.
