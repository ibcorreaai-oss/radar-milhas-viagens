# ARCHITECTURE.md — Radar Milhas & Viagens 3.0

Complementa o `README.md` (que descreve o MVP original). Este documento cobre só a
camada nova (World Experience Radar + fundação para os próximos radares) e as decisões
arquiteturais tomadas para evoluir sem quebrar o existente.

## Princípio geral

```
DISCOVER → OPTIMIZE → PLAN → BOOK
```

O MVP original já cobria **OPTIMIZE** (voos/hotéis/pontos) e uma fatia de **BOOK**
(links de afiliado em `opportunities`). Esta evolução começa por **DISCOVER**: a
pergunta "o que vale a pena viver, e quando" — hoje ainda ausente do produto.

## Decisão arquitetural #1 — uma tabela `world_events`, não 15 tabelas por radar

O PROMPT 3.0 sugere (§13, §49) uma tabela por "radar" (festas, festivais, esportes,
fenômenos naturais, natureza, cultural, gastronomia, trem/terrestre...). Na prática,
todos esses radares compartilham a mesma forma: **um acontecimento em um lugar, numa
janela de datas, com status de confirmação, score e fonte**. Criar 12+ tabelas quase
idênticas geraria RLS duplicada, CRUD admin duplicado e queries de "o que tem esse mês"
espalhadas em 12 lugares — viola a regra de não duplicar código (§92 do próprio prompt).

Por isso: **uma tabela `world_events`**, com `event_categories.radar` como
discriminador (enum com os 13 radares "genéricos": festa tradicional, festival musical,
show, esporte, sazonal, fenômeno natural, natureza/wildlife, gastronomia, cultural,
trem/terrestre, once-in-a-lifetime, hidden gem, e um placeholder `cruzeiro` até o Cruise
Radar ganhar tabela própria).

Radares com forma de dado **materialmente diferente** (cruzeiro tem navio/cabine/porto;
ski tem resort/altitude/condição de neve; hospedagem extraordinária tem
categoria/preço/disponibilidade) **vão ganhar tabela própria em fases futuras** — não
force esses três em `world_events`. Isso está registrado no `IMPLEMENTATION_PLAN.md`
(Fase 4 e Fase 3).

## Decisão arquitetural #2 — `opportunities.world_event_id` opcional, engine não tocado

`lib/scoring/opportunity-engine.ts` (dinheiro × milhas) continua intocado — é o ativo
estratégico do produto (regra explícita do usuário e do próprio prompt, §78). A ligação
com o World Radar é uma coluna nullable `world_event_id` em `opportunities`: uma
oportunidade pode opcionalmente apontar para um evento do mundo. Isso permite futuramente
um "EventOpportunity" (voo + evento juntos) sem reescrever o motor — é extensão aditiva
de schema, zero mudança de comportamento em produção hoje.

## Decisão arquitetural #3 — `world_events.experience_score` é um motor separado e paralelo

`lib/scoring/event-score.ts` (`evaluateExperience`) é um segundo motor, deliberadamente
**não fundido** com o `OpportunityEngine`. Um mede "vale a pena financeiramente" (dinheiro
vs pontos); o outro mede "quão especial é a experiência" (Experience Score do §26). São
perguntas diferentes com inputs diferentes. Fundi-los seria a "reescrita do motor
existente" que o prompt proíbe explicitamente. O `Trip Opportunity Score` consolidado
(cruzando os dois) fica para quando houver dados reais de voo+evento simultâneos — hoje
seria inventar número (proibido pelo §92).

## Decisão arquitetural #4 — Explainable Scoring desde o dia 1

Todo score novo (`evaluateExperience`) já devolve a forma pedida no §79:
`{ score, label, reasons, positives, negatives, urgency, confidence }`. Isso evita
retrabalho quando a UI de "Por que agora?" (§85) for implementada — os dados já existem,
só falta o componente visual dedicado (fase futura).

## Decisão arquitetural #5 — Feature flags em tabela, não env var

`feature_flags` é uma tabela (não env var) porque o §72 pede rollout incremental
**controlável pelo admin em produção**, sem redeploy. `lib/feature-flags.ts` lê a tabela
e retorna defaults seguros (tudo `false`) se a migration ainda não rodou — segue o mesmo
princípio de "nunca quebra por falta de configuração" já usado em `getUserContext()` e
`middleware.ts`.

## Decisão arquitetural #6 — dado de exemplo é explicitamente marcado

`world_events.is_mock` existe porque o §92 proíbe dado inventado escondido. Todo evento
de exemplo cadastrado nesta sessão tem `is_mock = true`, e a UI (`WorldEventCard`) mostra
um badge "Dado de exemplo" nesse caso — o mesmo princípio que já regia
`MockFlightProvider`/`MockHotelProvider` no MVP original, agora aplicado ao World Radar.

## O que NÃO foi construído nesta fase (e por quê)

Agentes de ingestão automática (`WorldDiscoveryAgent` e afins, §46) exigiriam consumir
APIs/scrapers de terceiros — gasto novo e risco de ToS não autorizados. Fica como
decisão do Igor (ver `AUDIT_REPORT.md` §8 e `MANUAL_ACTIONS.md`). A fundação de dados
(`sources`, `world_events.source_id/source_url/confidence_score/last_checked_at`) já
está pronta para plugar um agente real quando houver decisão sobre qual fonte usar.

## Diagrama de módulos (estado após esta sessão)

```
RADAR MILHAS & VIAGENS
│
├── Dashboard                      [existente, intocado]
├── Discover  (NOVO)
│   └── World Radar (/descobrir)   — world_events + event_categories + destinations
├── Optimize                       [existente, intocado]
│   ├── Voos, Hotéis, Calculadora, OpportunityEngine
├── Bucket List (NOVO)             — bucket_lists + bucket_list_items
├── Alertas                        [existente, intocado]
├── Milhas & Pontos (Programas)    [existente, intocado]
├── Perfil / Assinatura            [existente, intocado]
└── Admin
    ├── Promoções / Programas / Oportunidades  [existente, intocado]
    └── Eventos (NOVO)             — CRUD world_events, mesmo padrão dos existentes
```
