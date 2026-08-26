# SEO_GEO.md — Radar Milhas & Viagens

> SEO (busca tradicional), Open Graph (compartilhamento social) e GEO (Generative Engine
> Optimization — ser encontrado/citado por IA generativa). Escrito em 25/08/2026 (ETAPA 11).
> Pesquisa de mercado feita via busca real (não inventada) antes de definir a estratégia.

## 1. O que a pesquisa de mercado mostrou

- Interesse em programas de milhagem entre viajantes brasileiros cresceu 31,7 pontos
  percentuais em 2026 vs. 2025 — 8 em cada 10 viajantes já demonstram interesse direto.
- Concorrência de conteúdo direto: melhoresdestinos.com.br, flypass.ai, tripmilhas.com —
  todos publicam comparação de programas e valor de milheiro, o mesmo território deste
  produto.
- Padrão de busca é **long-tail e sazonal**: "valor do milheiro Smiles hoje", "programa de
  milhas que não expira", "melhor época pra resgatar milhas" — não é uma palavra-chave só,
  é um conjunto de perguntas específicas que mudam com a época do ano (alta/baixa temporada).
- Diferencial real do produto sobre o conteúdo editorial da concorrência: eles publicam
  "quanto vale o milheiro hoje" como texto estático; o Radar **calcula isso ao vivo** pra
  cada busca do usuário — esse é o ângulo de SEO a explorar (ferramenta > artigo).

**Oportunidade de conteúdo futura, não implementada nesta etapa** (decisão de produto, não
código): páginas do tipo `/milheiro/[programa]` com o valor médio atual de cada programa
(dado que já existe em `loyalty_programs.average_mile_value`) resolveriam exatamente a busca
"valor do milheiro X hoje" — hoje esse dado só aparece dentro de `/programas` (uma página),
não em URLs individuais indexáveis por programa. Fica registrado aqui como próximo passo de
SEO de conteúdo, não construído agora porque é uma decisão de arquitetura de rota nova (ver
`SYSTEM_ARCHITECTURE.md` — "nenhuma funcionalidade nova sem checar a arquitetura geral").

## 2. Achado real corrigido nesta etapa: vitrine pública que não era pública

`/promocoes` e `/programas` são alcançáveis sem login (fora de `middleware.ts
PROTECTED_PREFIXES`) e sempre foram descritas como "vitrine pública" no código — mas a RLS
das tabelas `promotions`/`loyalty_programs` exigia `authenticated`, então **um crawler
anônimo via essas páginas via uma tela vazia**. Confirmado com o Igor: liberar leitura
anônima nas duas tabelas (migration `0005`, escrita continua só admin) — sem isso, essas
páginas nunca teriam valor de SEO nenhum, indexação de página vazia é sinal negativo pro
Google.

## 3. SEO tradicional — implementado

- **`app/sitemap.ts`** — só rotas realmente públicas e com conteúdo real (home, promoções,
  programas, calculadora, cadastro, login, páginas legais). Rotas atrás de login
  deliberadamente de fora — indexar uma tela de redirecionamento pro login desperdiça
  orçamento de rastreamento.
- **`app/robots.ts`** — espelha `middleware.ts PROTECTED_PREFIXES` em `disallow`, aponta pro
  sitemap.
- **`metadataBase` + title template** em `app/layout.tsx` — toda página que definir só
  `title: 'X'` automaticamente vira "X — Radar Milhas & Viagens", sem repetir o sufixo em
  cada arquivo.
- **Meta keywords deliberadamente NÃO adicionado** — o Google ignora essa tag desde 2009;
  incluir seria prática de 2010, não prática atual. Registrado aqui pra não virar pedido
  repetido de "faltou a keyword tag".

## 4. Open Graph e Twitter Card — implementado

- `app/opengraph-image.tsx` — imagem gerada dinamicamente (Next.js `ImageResponse`, roda no
  Edge, zero custo/zero asset estático pra manter atualizado) com o headline "Viaje mais.
  Pague menos." — aparece no preview de link no WhatsApp, X, LinkedIn, Slack, iMessage. Herda
  pra toda página que não definir a própria imagem (mesma regra de herança da Metadata API).
- `openGraph`/`twitter` no metadata raiz — `type: website`, `locale: pt_BR`, `card:
  summary_large_image`.

## 5. GEO — otimização pra IA generativa (ChatGPT, Gemini, Perplexity, Claude)

GEO ainda não tem um padrão único e certificado (diferente de SEO, que tem 25 anos de
convenção) — a prática de 2026, validada em pesquisa antes de implementar:

- **`/llms.txt`** (`app/llms.txt/route.ts`) — segue o formato proposto em
  [llmstxt.org](https://llmstxt.org/): título, resumo em blockquote, seções com link +
  descrição de uma frase. Sem custo (é texto estático servido pela própria Vercel, não um
  serviço de terceiro). Route Handler em vez de arquivo em `public/` porque a URL do site
  depende de `NEXT_PUBLIC_APP_URL` (domínio ainda não definido — nunca hardcoded errado).
- **JSON-LD (schema.org)** em `lib/structured-data.ts`, injetado no `<head>` — `Organization`
  + `SoftwareApplication` com os 4 planos e preços reais (`lib/plans.ts`, nunca inventado).
  Isso é o que dá pra uma IA generativa (ou o Google) responder "quanto custa o Radar Milhas"
  ou "o que é o Radar Milhas" com dado estruturado, não adivinhando a partir de texto solto.
- **Não bloquear crawler de IA sem motivo** — `robots.ts` não tem regra específica pra
  GPTBot/ClaudeBot/Google-Extended/PerplexityBot: bloquear reduziria a chance do produto ser
  citado em resposta de IA, sem nenhum ganho (não há conteúdo proprietário sendo protegido
  nas páginas públicas). Reavaliar só se algum crawler específico virar abuso de tráfego.
- **Conteúdo factual e específico, não vago** — todo texto público já evita
  "revolucionário"/"o melhor do mercado" (linguagem que IA generativa tende a descontar) em
  favor de números e mecanismo concreto ("valor do milheiro calculado automaticamente",
  "score 0-100 explicável") — isso já era a voz do produto antes desta etapa, só confirmado
  como GEO-friendly aqui, não uma reescrita de copy.

## 6. Comparação com os melhores SaaS do mundo — o que faz sentido adotar

Benchmark: Booking/Kayak/Skyscanner (metabusca), Stripe/Linear (SaaS B2B premium),
melhoresdestinos.com.br/flypass.ai (concorrência direta de conteúdo).

| Prática de mercado | Já tínhamos? | Ação desta etapa |
|---|---|---|
| Sitemap + robots.txt nativos | ❌ | ✅ implementado |
| OG image dinâmica por marca | ❌ | ✅ implementado |
| JSON-LD de produto/preço | ❌ | ✅ implementado |
| `llms.txt` (GEO) | ❌ | ✅ implementado |
| Título único por página (não genérico) | Parcial (só 5 de 34 rotas) | Mantido — rotas
  protegidas por login não precisam de SEO, as 9 públicas já tinham ou ganharam nesta etapa |
| Ferramenta gratuita como isca de SEO (calculadora) | ✅ já existia | Nenhuma |
| Conteúdo editorial por palavra-chave (blog/páginas por programa) | ❌ | Documentado como
  oportunidade futura (§1), não implementado — decisão de produto/arquitetura pendente |

## Checklist manual

- [ ] Rodar a migration `0005_public_read_promotions_programs.sql` (depois de 0001→0004).
- [x] ~~Definir domínio de produção — sem isso, tudo aponta pra localhost:3000~~ — **resolvido
      na ETAPA 20** (`lib/site-url.ts`, ver seção abaixo). Continua valendo definir um domínio
      próprio quando você comprar um, mas não é mais bloqueador de SEO.
- [ ] Registrar o site no Google Search Console e submeter `/sitemap.xml` depois do deploy.
- [ ] Decidir se vale investir em páginas de conteúdo por programa (`/milheiro/[programa]`)
      — maior oportunidade de SEO orgânico identificada na pesquisa, não implementada.

## Custos externos envolvidos

Nenhum novo — sitemap, robots, OG image e llms.txt rodam na própria infraestrutura Vercel/
Next.js. Google Search Console é gratuito.

## ETAPA 19+20 (26/08/2026) — auditoria pré e pós-deploy

**ETAPA 19** (antes do deploy): `/descobrir` estava sendo bloqueado em `robots.ts` por engano
mesmo sendo público de verdade; `/login`/`/cadastro` sem metadata própria (título duplicado com
a home); nenhuma página tinha `alternates.canonical`; JSON-LD só listava o preço mensal (faltava
o anual da ETAPA 16). Todos corrigidos e testados antes do deploy.

**ETAPA 20** (depois do deploy, checando o site real): achado real e mais sério —
`sitemap.xml`, `robots.txt`, JSON-LD e `llms.txt` estavam todos apontando pra
`http://localhost:3000` em produção, porque `NEXT_PUBLIC_APP_URL` nunca foi configurada na
Vercel (não existe ferramenta MCP pra fazer isso — só o Igor consegue colar no dashboard).
Resolvido sem depender disso: `lib/site-url.ts` usa `VERCEL_PROJECT_PRODUCTION_URL`/
`VERCEL_URL` (variáveis que a própria Vercel expõe automaticamente) como fallback antes de
`localhost`, então o site se autocorrige mesmo sem nenhuma configuração manual. Confirmado ao
vivo no domínio publicado depois do redeploy.
