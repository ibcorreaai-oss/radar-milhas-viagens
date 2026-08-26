# PERFORMANCE.md — Radar Milhas & Viagens

> Auditoria de performance + otimizações aplicadas. Escrito em 25/08/2026 (ETAPA 5 do Igor).
> Metodologia: auditei o código real antes de mexer (mandato ETAPA 1) — cada item abaixo é uma
> lacuna encontrada de verdade, não uma otimização genérica de checklist.

## O que foi encontrado e corrigido

### 1. `getUserContext()`/`getFeatureFlags()` rodavam em dobro em toda página (maior achado)

`app/(app)/layout.tsx` chama `getUserContext()` e `getFeatureFlags()` pra montar o menu — e
**quase toda `page.tsx` do app chamava de novo**, na mesma requisição, pra checar plano/
onboarding/role. Contei 45 pontos de chamada em 36 arquivos. Sem dedupe, isso são até 4
buscas ao Supabase duplicadas (profile + subscription, 2x cada) em praticamente toda página
carregada — dobra a latência do "tempo até o banco responder" sem nenhum ganho.

**Corrigido:** as duas funções (`lib/auth.ts`, `lib/feature-flags.ts`) agora usam `cache()` do
React — dedupe automático de chamadas com os mesmos argumentos dentro da mesma passada de
renderização no servidor. Mesma requisição HTTP só, não vaza entre usuários nem entre
requisições diferentes (isso seria um bug de segurança grave — `cache()` do React é por-request
justamente pra isso). Zero mudança de comportamento, só elimina o round-trip duplicado.

### 2. Queries de resultado de busca traziam coluna que ninguém usa

`hotel_results`/`flight_results` têm uma coluna `raw_data jsonb` com o payload bruto do
provider — `/hoteis` e `/voos` faziam `select('*')` nela mesmo a tela nunca lendo `raw_data`.
Trocado por lista de colunas explícita nas duas páginas, cobrindo exatamente o que
`PriceComparisonCard`/`hotelSubtitle` renderizam. Sem impacto visível hoje (mock provider
devolve pouco dado), mas evita crescer sem necessidade quando um provider real (Amadeus/Duffel/
Booking) começar a devolver payload de verdade em `raw_data`.

### 3. Busca de catálogo + saldo do usuário em `/programas` era sequencial

Duas queries independentes (catálogo de programas, saldo do usuário) rodavam uma depois da
outra com `await` solto. Trocado por `Promise.all` — mesma lógica, metade do tempo de espera
combinado.

### 4. Zero `loading.tsx` no projeto inteiro — e um componente de loading nunca usado

Existia um componente pronto (`components/loading-state.tsx`) desde sessões anteriores, mas
**nenhuma página usava** e **nenhuma rota tinha `loading.tsx`** — toda navegação pra uma página
que busca dado no Supabase ficava sem feedback nenhum até o servidor terminar de renderizar
(sensação de app travado, principalmente em mobile/conexão mais lenta). Adicionado
`loading.tsx` reaproveitando o componente existente nas 13 rotas que buscam dado:
dashboard, hoteis, voos, descobrir, alertas, programas, promoções, perfil, bucket-list e os 4
listagens do admin. Isso ativa o streaming nativo do App Router — a navegação troca de tela na
hora, com skeleton, em vez de ficar parada esperando o server component terminar.

### 5. Imagem de evento existia no schema mas nunca era exibida

`world_events.cover_image_url` é preenchido no formulário do admin desde a Fase 2, mas
`WorldEventCard` nunca renderizava a imagem — zero otimização porque zero imagem. Corrigido:
- `next.config.mjs` ganhou `images.formats: ['avif','webp']` e uma allowlist curada de hosts
  (`remotePatterns`) — Unsplash, Wikimedia, Cloudinary, Pexels, + o próprio bucket do Supabase
  do projeto quando configurado. **Deliberadamente não é wildcard**: o otimizador de imagem da
  Vercel busca a URL no servidor, e `cover_image_url` é texto livre — um `remotePatterns` aberto
  seria um vetor de SSRF se esse campo algum dia aceitar entrada de alguém não confiável (ver
  lente de segurança da ETAPA 2).
- `WorldEventCard` usa `next/image` (otimizado, `fill` + `sizes` responsivo, dentro de um
  container com `aspect-[16/9]` fixo pra não causar layout shift) quando o host está na
  allowlist, cai pra `<img>` puro (sempre funciona, só sem otimização) se não estiver, e mostra
  um placeholder quando não há imagem — **nunca quebra a página por causa de uma URL
  inesperada**. `/admin/eventos` ganhou uma nota explicando quais hosts são otimizados.

## O que foi auditado e já estava bom (nenhuma mudança necessária)

- **Índices do banco:** `supabase/migrations/0001`/`0002` já cobrem os padrões de filtro/
  ordenação reais (`opportunities.score`, `alerts.active` parcial, `world_events.experience_score`/
  `featured` parcial, todas as FKs de user_id). `subscriptions.user_id` é `unique`, que já cria
  índice implícito — não precisava de índice explícito extra.
- **Paralelização já existente:** dashboard, `/descobrir` e `/perfil` já usavam `Promise.all`
  corretamente pras queries independentes — só `/programas` (item 3 acima) tinha ficado pra trás.
- **Fontes:** o app não carrega nenhuma fonte externa (usa a stack padrão do sistema via
  Tailwind) — zero risco de FOUT/CLS por fonte, e zero requisição de rede extra no carregamento
  inicial. Não adicionei `next/font` porque não há necessidade de fonte customizada agora; se
  isso mudar (identidade visual própria), aí sim vale medir o impacto.
- **Viewport mobile:** o App Router já injeta a meta viewport responsiva por padrão — nenhuma
  configuração extra necessária.
- **Componentes client novos** (`date-range-field.tsx`, `guests-field.tsx`,
  `destination-field.tsx`) já usam `useMemo` onde o cálculo (grade do calendário) de fato pesa;
  o filtro de sugestões de destino roda sobre uma lista estática de 24 itens — memoizar isso
  seria complexidade sem ganho mensurável.

## Decisões deliberadas de NÃO otimizar agora (documentado pra não virar retrabalho)

- **`middleware.ts` usa `supabase.auth.getUser()`** (verifica contra o servidor de auth do
  Supabase) em vez de `getSession()` (decodifica o cookie localmente, mais rápido, sem round-
  trip). É mais lento, de propósito — é a recomendação oficial do Supabase pra middleware,
  porque `getSession()` não detecta sessão revogada/logout até o JWT expirar. Trocar isso seria
  performance às custas de segurança sem eu ter permissão pra fazer essa troca sozinho — fica
  registrado aqui como trade-off consciente, não como bug.
- **Middleware busca `profiles.role` de novo em toda rota `/admin/*`**, redundante com o que
  `getUserContext()` já busca dentro da página — mas middleware roda numa passada de execução
  separada da página (não compartilha o `cache()` do React), então não dá pra eliminar essa
  query sem remover uma camada de defesa em profundidade documentada em `lib/admin-guard.ts`.
  Aceito o custo — é `/admin`, baixo tráfego, e é o Igor navegando, não usuário final.
- **Loop do cron `check-alerts` processa alerta por alerta, sequencial** — daria pra paralelizar
  com `Promise.all` e cortar o tempo total de execução, mas isso é rodando em background (não
  afeta Core Web Vitals nem experiência de usuário) e paralelizar sem um limite de concorrência
  arriscaria estourar conexão do banco ou rate limit de provider quando o volume de alertas
  crescer de verdade. Não implementado agora — fica registrado como "otimizar quando o volume
  de alertas justificar", não como problema atual.
- **`raw_data`/colunas não usadas em `opportunities`/`world_events`:** essas tabelas não têm
  coluna grande (sem jsonb) — não há ganho real em trocar `select('*')` por lista explícita
  nelas hoje. Só fiz a troca em `hotel_results`/`flight_results`, que têm `raw_data`.

## Core Web Vitals — situação atual

Sem tráfego real (Supabase ainda não configurado em produção — ver `README.md`), não há dado de
campo (CrUX/Real Experience Score da Vercel) pra medir ainda. O que dá pra afirmar pela
auditoria de código: sem fonte externa bloqueando render (bom pro LCP/CLS), sem imagem sem
dimensão reservada (bom pro CLS, corrigido no item 5), sem JS de terceiro carregado no client
além do estritamente necessário (bundle da home ficou em ~120kB First Load JS depois do hero de
busca da Landing — dentro do razoável pra uma search box interativa completa).

## ETAPA 19+20 (26/08/2026) — auditoria pré e pós-deploy

Nenhum bloqueador novo achado (dois auditores independentes, ETAPA 19 pré-deploy e revisão
pós-deploy). Único custo real introduzido desde a ETAPA 5: o gate de assinatura/trial (ETAPA 16)
soma 2 queries (`profiles`+`subscriptions`, paralelizadas via `Promise.all`) em toda navegação de
rota protegida não-admin, rodando no Edge a cada request — aceitável no volume atual (mesmo
trade-off já formalizado neste documento pra situação equivalente, não é regressão nova).
`getUserContext()` (`cache()` do React) continua cobrindo corretamente todos os novos
chamadores. Bundle do `/onboarding` cresceu ~2kB reais com o mascote SVG + wrapper de Web Speech
API da ETAPA 18 — sem dependência nova, dentro do esperado.

## Checklist manual

- [ ] Depois que o projeto Supabase real existir e tiver tráfego, habilitar o Vercel Speed
      Insights (gratuito no plano Hobby) pra medir Core Web Vitals de campo de verdade — hoje é
      só auditoria estática de código, sem dado real de usuário.
- [ ] Se o admin quiser usar uma imagem de capa de um host fora da allowlist com frequência,
      adicionar o host em `next.config.mjs` E `lib/image-hosts.ts` (as duas listas).
