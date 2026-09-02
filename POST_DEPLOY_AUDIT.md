# POST_DEPLOY_AUDIT.md — Radar Milhas & Viagens (ETAPA 20, 26/08/2026)

> Auditoria completa pós-deploy pedida pelo Igor: todas as páginas, fluxos, permissões,
> pagamentos, login, responsividade e segurança — mais os 4 relatórios e 2 checklists pedidos
> explicitamente. Site ao vivo: **https://radar-milhas-viagens.vercel.app**.
>
> Este documento é o resumo executivo point-in-time. Detalhe técnico completo de cada área já
> vive em documento próprio (não duplicado aqui, só referenciado): `MONETIZATION.md`,
> `AUTOMATIONS.md`, `ENGAGEMENT_UX.md`, `OBSERVABILITY.md`, `SEO_GEO.md`, `PERFORMANCE.md`,
> `SECURITY_REPORT.md`, `PLATFORM_ADMIN.md`, `AUTH_AND_ADMIN.md`, `TRAINING.md`, `GROWTH.md`.

## 0. O que mudou entre o deploy (ETAPA 19) e esta auditoria (ETAPA 20)

Duas correções reais, achadas checando o site JÁ PUBLICADO (não apareceriam em `tsc`/`build`):

1. **URLs de produção apontando pra `localhost:3000`** — `sitemap.xml`, `robots.txt`, JSON-LD,
   `llms.txt`, e-mails transacionais e o link de indicação usavam
   `NEXT_PUBLIC_APP_URL || 'http://localhost:3000'`. Sem a env var configurada na Vercel (não
   existe ferramenta MCP pra fazer isso por API — confirmado, sem alternativa), todos caíam no
   fallback local. Corrigido com `lib/site-url.ts`, que se autocorrige usando
   `VERCEL_PROJECT_PRODUCTION_URL`/`VERCEL_URL` (variáveis que a própria Vercel já expõe
   automaticamente, sem precisar de nada colado no dashboard). Confirmado ao vivo: `sitemap.xml`
   e o `<link rel="canonical">` já mostram a URL certa.
2. **Auth completamente aberta por falta de config** — o app tem um fallback deliberado
   (documentado desde a ETAPA 1) pra não derrubar o site inteiro com 500 se o Supabase não
   estiver configurado: nesse caso, trata toda página como "sem sessão" em vez de travar. Isso
   também significava, na prática, que **nenhuma rota protegida verificava sessão de verdade**
   no site publicado — não vazava dado nenhum (as páginas mostravam só um estado vazio genérico
   de erro), mas o gate de fato não rodava. Resolvido criando `.env.production` (novo arquivo,
   **versionado de propósito** — só contém `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   que são valores seguros pra expor no client por design do Supabase, protegidos por RLS).
   Next.js carrega esse arquivo automaticamente em todo build de produção. Confirmado ao vivo:
   `/dashboard` agora redireciona corretamente pra `/login?next=/dashboard`.

Ambas commitadas e já em produção (deploy automático via GitHub → Vercel).

## 1. Relatório de qualidade (funcional)

**Cobertura**: todas as rotas públicas e protegidas, autenticado com conta de teste real,
rodando contra o Supabase real (local, já que a Vercel ainda não tem `SUPABASE_SERVICE_ROLE_KEY`
nem `STRIPE_SECRET_KEY` — ver §6). Rotas testadas: `/`, `/promocoes`, `/programas`,
`/calculadora`, `/descobrir`, `/login`, `/cadastro`, `/contato`, `/termos`, `/privacidade`,
`/politica-afiliados`, `/aviso-precos`, `/dashboard`, `/voos`, `/hoteis`, `/alertas`,
`/consultor-ia`, `/perfil`, `/assinatura`, `/onboarding`, `/favoritos`, `/afiliados`,
`/treinamentos`, `/bucket-list`, `/admin/*`.

- Nenhum 500/erro de console em navegação normal.
- Onboarding (wizard de 8 passos, ETAPA 18), assinatura (toggle mensal/anual + status, ETAPA 16)
  e o gate de trial (ETAPA 16/19) — todos testados ao vivo em etapas anteriores desta mesma
  sessão, com 2 bugs reais achados e corrigidos (validação HTML5 bloqueando "Pular tudo"; perda
  de dado ao navegar entre etapas do onboarding — ver `ENGAGEMENT_UX.md` §ETAPA 18).
- **Permissão testada de verdade** (não só menu escondido): usuário comum tentando `/admin`/
  `/admin/usuarios` via URL direta → redireciona pra `/dashboard` (`middleware.ts` +
  `lib/roles.ts`). Deslogado tentando rota protegida → redireciona pra `/login?next=...`.
  Assinatura expirada tentando rota protegida → redireciona pra `/assinatura?trial_expirado=1`,
  em duas camadas independentes (`middleware.ts` + `app/(app)/layout.tsx`, ETAPA 19) — testado
  ao vivo simulando trial expirado via SQL direto no banco real, revertido depois.
- **Pagamento**: botão "Assinar" redireciona com `?erro=stripe_nao_configurado` — comportamento
  **esperado e correto** hoje (sem `STRIPE_SECRET_KEY`, não existe outra opção segura). Criação/
  cancelamento de assinatura via API da Stripe (test mode) validados na ETAPA 16.
- **Responsividade** (390×844, mobile real): home, dashboard, onboarding e assinatura sem
  quebra — telas mais novas do produto, checadas especificamente por serem as menos "batidas".

## 2. Relatório de SEO

Auditoria dedicada rodada na ETAPA 19 (4 achados reais, todos corrigidos): `robots.txt`
desatualizado (rotas novas faltando, `/descobrir` bloqueado por engano), `/login`/`/cadastro`
sem metadata própria (título duplicado com a home), nenhuma página com `canonical`, JSON-LD sem
o preço anual. Detalhe completo em `SEO_GEO.md`.

**Novo nesta etapa**: todas as URLs de produção (sitemap, robots, OG, canonical, JSON-LD,
llms.txt) confirmadas ao vivo apontando pro domínio real, não mais `localhost` (ver §0). HSTS
confirmado ativo por padrão até no domínio `.vercel.app` (a Vercel aplica automaticamente, não é
exclusivo de domínio próprio como o `README.md` antigo sugeria — corrigido).

## 3. Relatório de performance

Auditoria dedicada rodada na ETAPA 19: nenhum bloqueador. Único custo novo real (2 queries do
gate de assinatura por navegação em rota protegida, `middleware.ts`) é o mesmo trade-off já
formalizado em `PERFORMANCE.md` pra situação equivalente — aceitável no volume atual. Bundle
por rota dentro do padrão (~103-120kB a maioria; `/login`/`/onboarding` ficam em ~180kB desde
antes desta etapa, não é regressão nova). `next build` limpo, 66 rotas.

**Achado nesta etapa (infraestrutura, não código)**: o cron `check-alerts` era de hora em hora e
**bloqueou o primeiro deploy** — o plano Hobby da Vercel só permite cron 1x/dia
("Hobby accounts are limited to daily cron jobs"). Corrigido pra rodar 1x/dia (09h). Todos os 4
crons (`check-alerts`, `refresh-promotions`, `expire-opportunities`, `check-trials`) agora
respeitam o limite do plano atual.

## 4. Relatório de segurança

Auditoria dedicada rodada na ETAPA 19 (achados reais, todos corrigidos): gate de assinatura sem
defesa em profundidade (só existia no middleware — agora tem 2 camadas), formulário de contato
sem rate limit real (agora tem, RPC atômica por e-mail/dia), zero header HTTP de segurança
(agora tem X-Frame-Options/X-Content-Type-Options/Referrer-Policy/Permissions-Policy). Zero
segredo exposto no repositório (histórico do git + working tree, checado; `.env.local` nunca
commitado). Detalhe completo, com tabelas de RBAC/pagamentos/rate-limit/headers e a lista
verificada do que só você resolve, em `SECURITY_REPORT.md` — este é o relatório de segurança
pedido explicitamente na ETAPA 20.

**Confirmado ao vivo em produção nesta etapa**: headers de segurança presentes em toda resposta
(`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
strict-origin-when-cross-origin`, `Permissions-Policy`, `Strict-Transport-Security` — este
último automático da Vercel). Gate de assinatura testado ao vivo bloqueando corretamente uma
conta com trial simulado como expirado, e liberando de volta depois de revertido.

**Achado nesta etapa, ainda não fechado**: enquanto `.env.production` não existia, toda rota
protegida do site publicado ficava sem verificação de sessão de verdade (ver §0) — não vazava
dado (fallback mostra só estado vazio genérico), mas o gate não rodava. Já corrigido nesta
mesma etapa antes de qualquer usuário real ter acessado o site.

## 5. ETAPA 20 v2 (02/09/2026) — reauditoria completa pós Stripe/Resend/cron

Pedida pelo Igor no mesmo dia em que Stripe (Price IDs da conta certa, `acct_1SvLpN2Zak4ptRAo`),
`RESEND_API_KEY`, `CRON_SECRET` e `OPS_ALERT_EMAIL` foram resolvidos e testados ao vivo (checkout
pago completo com cartão de teste, webhook confirmado, e-mail de ativação entregue). Auditoria
rodada em 3 frentes paralelas (forks read-only dedicados) + verificação própria de 1 achado
ambíguo. Detalhe completo de cada frente já em `SECURITY_REPORT.md` §8, `SEO_GEO.md`
"ETAPA 20 v2" e `PERFORMANCE.md` "ETAPA 20 v2" — aqui só o resumo executivo.

**Funcional/UX/responsividade**: todas as páginas públicas e a maioria das autenticadas navegadas
de verdade (não só lidas no código), zero erro de console em 5+ páginas testadas, RBAC confirmado
(usuário comum em `/admin` redireciona sem vazar nada), fluxo de criar/editar alerta funcionando
com gate de plano correto. Único ponto investigado a fundo: o botão "Excluir" de alerta trava a
automação de browser — confirmado que é `window.confirm()` nativo (`components/ui/
confirm-submit-button.tsx`), comportamento esperado do navegador, não bug do app. Responsividade
mobile (390px) **não foi possível testar nesta rodada** — limitação da ferramenta de automação
(`resize_window` não mudou `window.innerWidth` de verdade), não falha do app; fica pra retestar
com outra abordagem numa próxima sessão.

**Segurança**: IDOR testado empiricamente (JWT real de 2 contas, requests diretos no REST,
sem passar pelo app) em 7 tabelas — todas seguras. 32 Server Actions revisadas uma a uma — todas
com guard de auth. Zero secret vazando no bundle client. Rate limiting das RPCs públicas
reconfirmado. Zero SQL injection. Headers de segurança presentes. **Nenhum achado novo.**

**SEO**: metadata única em todas as páginas públicas (bug de 27/08 continua corrigido), robots/
sitemap corretos, JSON-LD com os 6 planos, canonical em 18 páginas. Único ponto de melhoria
(baixo impacto): imagem de Open Graph é global, não por seção.

**Performance**: nenhuma rota passa de 200kB de First Load JS, zero lib pesada, `next/image` vs
`<img>` cru é decisão de segurança deliberada (não bug), zero padrão N+1 real encontrado.

**Veredito**: app segue saudável depois das correções de hoje — nenhuma regressão introduzida.

## 6. Checklist de melhorias futuras (não-bloqueantes, para quando fizer sentido)

- [ ] Content-Security-Policy — deliberadamente não implementada ainda: o app carrega scripts de
      terceiros opcionais (GA4, Meta/Google/TikTok/Twitter pixel) e uma CSP mal calibrada sem
      tráfego real pra testar contra correria o risco de quebrar algum silenciosamente. Revisitar
      quando os pixels de anúncio forem configurados de verdade.
- [ ] Alertas com frequência menor que 1x/dia — exige upgrade pro plano Pro da Vercel (custo
      recorrente, decisão sua).
- [ ] Agentes de descoberta automática de eventos do World Radar — decisão pendente de fonte de
      dados, sem custo de API novo aprovado ainda.
- [ ] Conteúdo do Mini LMS (Central de Treinamentos) todo em rascunho esperando vídeo real.
- [ ] Imagem de Open Graph específica por seção (descobrir/estadias/cruzeiros) em vez da única
      imagem global — melhoria de baixo impacto, ver `SEO_GEO.md`.
- [ ] Popular `loyalty_programs` de verdade — `/programas` mostra catálogo vazio hoje (os
      cálculos de milheiro em `/hoteis`/`/voos` funcionam normal porque não dependem dessa
      tabela; é lacuna de conteúdo, não bug).
- [ ] Retestar responsividade mobile (390px) numa próxima sessão com outra abordagem — não deu
      pra confirmar desta vez por limitação da ferramenta de automação, não do app.

## 7. Checklist de pendências manuais — **só o que é genuinamente impossível fazer sem você**

Atualizado 02/09/2026 — a esmagadora maioria das pendências antigas (Stripe, Resend, Supabase
service role, CRON_SECRET, OPS_ALERT_EMAIL, webhook) **já foi resolvida e confirmada ao vivo**
nesta mesma sessão. Só sobra:

- [ ] Confirmar no seu e-mail real se o texto "Ou digite este código:" aparece junto do código de
      6 dígitos no e-mail de login (o código em si já chega e funciona — só o texto explicativo
      não apareceu na ferramenta que uso pra checar e-mail, pode ser bug de exibição dela).
- [ ] Comprar o domínio próprio — decisão sua, adiada.
- [ ] Decidir se cura/confirma os eventos de exemplo do World Radar como conteúdo real antes de
      expor a usuário pagante (todos já marcados honestamente como "Dado de exemplo" hoje).

Todo o resto — Stripe, e-mails transacionais, crons, template OTP, RLS, segurança, SEO,
performance — já está resolvido, testado ao vivo e no ar.
