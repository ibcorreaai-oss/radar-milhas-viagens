# VISION_MASTER.md — Norte de longo prazo (referência, não brief de execução)

> Recebido do Igor em 25/08/2026, em duas partes: um "prompt mestre" de 96 seções descrevendo
> uma plataforma completa de busca/comparação de viagens estilo Booking/Trivago, seguido de um
> refinamento explícito que **restringe o escopo real**. É o refinamento abaixo que vale — o
> prompt de 96 seções é repertório de UX para puxar ideias, não uma lista de tarefas.

## Regra estratégica (decisão final do Igor, não renegociável sem pedir de novo)

O produto **continua sendo**:

> Clube premium de oportunidades, alertas e inteligência de viagens com IA.

Booking/Trivago/Google Hotels/Kayak/Skyscanner são **referência de UX** (busca, calendário,
cards, comparação visual) — nunca modelo de negócio. Sempre que um pedido futuro empurrar o
produto na direção de "OTA/metabuscador gigante" vs. "melhorar o clube de oportunidades",
**priorize o clube**. O moat é dados + monitoramento + histórico + pontos + Opportunity Engine +
IA, não tamanho de inventário.

## O que incorporar progressivamente (ordem dada pelo Igor)

1. Preservar arquitetura existente (auth, Stripe, alertas, cron, OpportunityEngine, banco).
2. Landing com hero de busca de verdade (destino/datas/hóspedes) — **feito em 25/08/2026**.
3. UX de busca em `/hoteis` e `/voos` (autocomplete, calendário, seletor de hóspedes, datas
   flexíveis) — **feito em 25/08/2026**.
4. Cards estilo marketplace (imagem, preço médio, economia, "última verificação", CTAs
   Ver/Alertar/Salvar) — pendente.
5. `OpportunityEngine` com explicabilidade ("por que recebeu 91?" com breakdown por componente)
   — pendente; hoje o engine (`lib/scoring/opportunity-engine.ts`) já calcula score/recomendação
   mas não expõe os componentes individualmente.
6. Dinheiro vs pontos como componente de destaque — já existe (`PriceComparisonCard`), pode
   ganhar mais destaque visual.
7. Carteira de pontos — já existe via `/programas` + `user_loyalty_programs`.
8. Alertas inteligentes com condições combinadas (preço OU pontos OU score) — hoje `/alertas`
   só suporta um critério por alerta; combinar critérios é evolução pendente.
9. Radar de oportunidades (página pública/autenticada listando `opportunities` com filtro por
   categoria) — hoje só existe como widget no dashboard, não como página própria; pendente.
10. Personalização (usar cidade/origem, destinos favoritos, saldo de pontos, histórico para
    montar "oportunidades para você") — pendente.

## O que NÃO construir agora

Reserva própria/checkout, marketplace completo com inventário grande, múltiplos providers reais
simultâneos, deduplicador de hotéis, mapa completo, motor de disponibilidade em tempo real,
white-label, PWA, i18n completo. Arquitetura de provider (`lib/providers/*`) já existe e fica
só com `MockHotelProvider`/`MockFlightProvider` até haver decisão de integrar API paga.

## Funil de referência

Landing → buscar/informar interesse → descobrir oportunidades → entender o score → dinheiro vs
pontos → salvar → criar alerta → monitoramento automático → notificação → ir para o parceiro.

## Como avaliar cada prompt novo do Igor

1. Ajuda a responder "vale mais a pena pagar em dinheiro ou usar pontos?" pro usuário final?
   → provavelmente vale construir.
2. Adiciona infraestrutura pesada (provider pago, motor novo, dependência grande) sem uso
   imediato? → questionar, propor versão mais simples ou registrar como decisão pendente em
   vez de implementar.
3. Empurra o produto de volta para "buscador genérico tipo Booking"? → sinalizar o conflito
   antes de implementar, como foi feito na sessão de 25/08/2026 (ver `PROMPT.md` §0-1).
