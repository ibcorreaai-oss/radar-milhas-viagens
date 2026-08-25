# SCREENS.md — Radar Milhas & Viagens

> Inventário completo de telas, derivado do `REQUIREMENTS.md`. Escrito em 25/08/2026
> (ETAPA 11). 34 rotas reais (`find app -name page.tsx`), nenhuma tela aspiracional.
>
> **Referências de design usadas neste projeto** (nunca copiadas literalmente — ver
> `VISION_MASTER.md`): Booking/Trivago/Kayak/Google Hotels pra arquitetura de busca
> (autocomplete, calendário, seletor de hóspedes); Linear/Stripe Dashboard pra densidade de
> informação em telas internas (admin, métricas); Notion/Vercel pra configuração/conta.
> Sistema de design próprio: `tailwind.config.ts` + tokens em `app/globals.css` (claro/escuro).

## A. Público / marketing (sem login)

### `/` — Home
**Objetivo:** converter visitante em cadastro, comunicar a proposta de valor em segundos.
**Elementos:** hero com busca real (destino/datas/hóspedes, abas Hospedagens/Voos), teaser
dinheiro-vs-pontos ilustrativo, "como funciona" (4 passos), citação da pergunta central do
produto, 6 cards de funcionalidade, 4 planos com preço, prova social/confiança, CTA final,
aviso legal curto.
**Ações:** buscar (redireciona pro fluxo de auth se não logado), criar conta, ver planos, entrar.
**Estados:** nenhum — página estática (dado do exemplo dinheiro-vs-pontos é fixo, rotulado
"exemplo ilustrativo").

### `/promocoes` — Vitrine de promoções
**Objetivo:** mostrar promoções ativas (transferência bonificada, compra de pontos, cupons)
como prova de curadoria contínua — funciona sem login, com CTA de cadastro.
**Elementos:** grid de `PromotionCard` (título, tipo, programa, bônus %, período, score).
**Estados:** empty state quando não há promoção ativa.

### `/programas` — Catálogo de programas
**Objetivo:** mostrar todos os programas de fidelidade monitorados, com valor médio do
milheiro — funciona sem login (saldo próprio só aparece logado).
**Elementos:** abas por tipo (banco/companhia aérea/hotel/coalizão), `LoyaltyProgramCard`.
**Estados:** empty state por aba sem programa cadastrado.

### `/calculadora` — Calculadora de pontos
**Objetivo:** ferramenta standalone de SEO/aquisição — funciona sem login, sem salvar nada.
**Elementos:** 4 abas (passagem dinheiro vs pontos, hospedagem dinheiro vs pontos, vale a
pena comprar pontos, vale a pena transferir com bônus), cálculo em tempo real.
**Estados:** placeholder até os campos obrigatórios serem preenchidos.

### `/termos`, `/privacidade`, `/politica-afiliados`, `/aviso-precos` — Institucional
**Objetivo:** compliance (LGPD, CDC) e transparência de modelo de negócio (afiliados, não
garantia de preço). Texto longo, tipografia simples, sem interação.

## B. Autenticação

### `/login`
**Elementos:** e-mail/senha, "esqueci minha senha", "Entrar com Google", link pra cadastro.
**Estados:** erro inline (credencial inválida), redirecionamento pós-login preservado via
`?next=`.

### `/cadastro`
**Elementos:** nome/e-mail/senha/confirmação, "Entrar com Google", link pra login.
**Estados:** erro inline (senha curta, e-mail duplicado), sucesso (aguardando confirmação por
e-mail) — via `useActionState`, sem reload de página.

### `/recuperar-senha`
**Elementos:** campo de e-mail. Resposta sempre genérica (proteção contra enumeração de
conta) — nunca revela se o e-mail existe.

### `/auth/redefinir`
**Objetivo:** definir nova senha a partir do link de recuperação.
**Estados:** erro se a sessão de recuperação expirou (link antigo).

## C. Onboarding

### `/onboarding`
**Objetivo:** capturar contexto de viagem sem fricção — puláve, poucos passos.
**Elementos:** aeroporto de origem, destinos favoritos, estilo de viagem, programas de pontos.
**Ações:** avançar, pular, concluir (marca `onboarding_done`, redireciona pro dashboard).

## D. Núcleo do app (logado)

### `/dashboard`
**Objetivo:** ponto de entrada diário — "o que mudou desde a última vez".
**Elementos:** saudação com nome, 4 stats (valor estimado dos pontos, alertas ativos,
oportunidades em destaque, promoções ativas), banner de upsell (Free no limite de alerta),
oportunidades em destaque, promoções em destaque, lista de alertas ativos, oportunidades
expirando em 7 dias.
**Estados:** empty state por seção (nenhuma oportunidade/promoção/alerta ainda).

### `/hoteis`, `/voos`
**Objetivo:** busca real com resultado comparado dinheiro vs pontos.
**Elementos:** formulário de busca (destino/datas/hóspedes ou origem+destino/datas/
passageiros+classe), resultados ordenados por score, `PriceComparisonCard` por resultado.
**Estados:** loading (`loading.tsx`), erro (campo obrigatório faltando), empty (sem resultado
pros filtros), limite de plano atingido (banner com CTA de upgrade).

### `/descobrir`
**Objetivo:** descoberta de experiências extraordinárias no mundo (World Radar).
**Elementos:** filtro por categoria/mês, grid de `WorldEventCard` (imagem, score, badges
Once-in-a-Lifetime/Hidden Gem/dado de exemplo, Book Now State), CTA salvar na Bucket List.
**Estados:** atrás de feature flag (`worldRadar`) — mostra aviso se desligada.

### `/bucket-list`
**Objetivo:** lista pessoal de experiências desejadas (eventos salvos + itens livres).
**Elementos:** form de item livre, grid de cards salvos com botão remover.
**Estados:** atrás de feature flag (`bucketList`).

### `/alertas`
**Objetivo:** núcleo de retenção — configurar e gerenciar vigilância de preço.
**Elementos:** form de criação (tipo, critérios, canais), lista de alertas com toggle
ativar/desativar e exclusão confirmada.
**Estados:** limite de plano atingido (CTA upgrade), erro de validação inline.

### `/consultor-ia`
**Objetivo:** tirar dúvida em linguagem natural sobre uso de pontos.
**Elementos:** chat simples, fallback de regras quando não há `ANTHROPIC_API_KEY`.

## E. Conta

### `/perfil`
**Elementos:** dados pessoais, preferências de busca, canais de notificação, carteira de
pontos (saldo por programa, custo de aquisição).

### `/assinatura`
**Elementos:** plano atual, CTA assinar/trocar/gerenciar (abre Stripe Billing Portal).
**Estados:** erro se Stripe não configurado (`?erro=stripe_nao_configurado`).

## F. Admin (papel `admin`)

### `/admin` — Painel operacional
**Elementos:** 5 stats (usuários, alertas ativos, promoções ativas, oportunidades, eventos),
atalhos pras 4 áreas de CRUD + métricas, últimas 10 notificações enviadas.

### `/admin/metricas` — Métricas de negócio
Ver `GROWTH.md` — crescimento, conversão, ativação, churn, abandono, upsell/cross-sell,
cancelados recentes.

### `/admin/{oportunidades,promocoes,programas,eventos}` + `/nova` + `/[id]/editar` (12 rotas)
**Objetivo:** CRUD do catálogo que todos os usuários veem.
**Elementos:** tabela com ações (editar/excluir com confirmação), formulário com validação
Zod, banner de erro específico (`FormError`) em vez de página de erro genérica.
**Estados:** loading (`loading.tsx`), erro de validação com mensagem exata do campo.

---

## Resumo por contagem

| Área | Rotas |
|---|---|
| Público/marketing | 5 (home + 4 institucionais) + promoções/programas/calculadora públicas = 8 |
| Autenticação | 4 |
| Onboarding | 1 |
| Núcleo logado | 7 |
| Conta | 2 |
| Admin | 12 |
| **Total** | **34** |
