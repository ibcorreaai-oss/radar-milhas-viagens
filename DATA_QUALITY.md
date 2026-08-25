# DATA_QUALITY.md — Radar Milhas & Viagens

> Validação antes de salvar, deduplicação, integridade referencial, consistência front-end ↔
> banco ↔ APIs. Escrito em 25/08/2026 (ETAPA 6 do Igor).

## O maior achado: Zod estava instalado e nunca foi usado

`zod` está no `package.json` desde o início do projeto (fazia parte do stack planejado), mas
`grep`/busca no repositório inteiro não encontrou nenhum `import ... from 'zod'` em lugar
nenhum. Toda validação de formulário era manual e inconsistente — alguns campos checavam
obrigatoriedade, outros não; nenhum validava faixa numérica, formato de URL ou enum antes de
mandar pro Postgres. Corrigido: `lib/validation/` agora tem schemas Zod reais, usados nos
pontos de maior risco (ver abaixo).

## 1. Validação antes de salvar

**`lib/validation/admin-schemas.ts`** — schemas para as 4 entidades de catálogo do admin
(`opportunitySchema`, `promotionSchema`, `loyaltyProgramSchema`, `worldEventSchema`), espelhando
exatamente os CHECK constraints do banco (mesma faixa de score 0-100, mesmos enums, mesmos
campos obrigatórios). Ligados em `app/(app)/admin/{oportunidades,promocoes,programas,eventos}/actions.ts`
— cada `create*`/`update*` roda `schema.safeParse()` antes de tocar no Supabase.

**`lib/validation/alert-schema.ts`** — mesma ideia para `/alertas`: preço/pontos não-negativos,
`type`/`cabin_class` restritos ao enum de verdade (antes eram só `as AlertType`/`as CabinClass`,
um cast sem checagem).

**Por que Zod e não só checagem manual:** uma única definição de "o que é um dado válido" por
entidade, reaproveitada tanto na criação quanto na edição — antes, `parseXForm()` fazia
checagem ad-hoc espalhada, com risco real de create e update divergirem com o tempo.

**Por que a validação de erro virou redirect com query param, não `throw`:** os formulários do
admin usam `<form action={fn}>` direto (sem `useActionState`), então um `throw new Error(...)`
dentro da Server Action cai no error boundary genérico (`app/error.tsx`, ETAPA 4) — o admin veria
"Algo deu errado" sem nenhuma pista do que preencheu errado. Trocado por
`redirect(caminho + '?erro=' + mensagem)`, a página lê `searchParams.erro` e o formulário mostra
num banner (`components/form-error.tsx`) — mesmo padrão que `/alertas` já usava antes desta
etapa (`?erro=nome_obrigatorio`), agora estendido pros formulários do admin também.

## 2. Evite registros duplicados

**Achado real:** `loyalty_programs.name` não tinha `unique` — dois programas chamados "Livelo"
seriam possíveis, e `hoteis/actions.ts`, `voos/actions.ts` e o cron `check-alerts` casam o nome
do programa (texto vindo do provider) contra essa coluna pra achar o valor médio do milheiro.
Com nome duplicado, esse casamento vira ambíguo — qual dos dois "Livelo" o `Map` por nome usa
depende só da ordem de retorno do banco, silenciosamente. Corrigido com
`unique (name)` na migration `0004`, e a action `createLoyaltyProgram` agora devolve uma
mensagem amigável ("Já existe um programa com esse valor") em vez do erro cru do Postgres —
ver `lib/db-errors.ts`.

Constraints de dedup que **já existiam** e continuam certas (nenhuma mudança): `sources.name`,
`destinations (city, country)`, `event_categories.slug`, `world_events.slug`,
`bucket_lists (user_id, name)`, `bucket_list_items (bucket_list_id, world_event_id)`,
`user_loyalty_programs (user_id, program_id)`.

## 3. Evite inconsistências de dados

**Achado real:** `score` tem CHECK 0-100 em `world_events` (migration `0002`) mas **não** tinha
em `flight_results`, `hotel_results`, `opportunities` nem `promotions` (todas de `0001`) — as
duas migrations divergiam na mesma regra de negócio. Corrigido na migration `0004`: as 4 tabelas
ganharam o mesmo CHECK. Nenhum código precisou mudar — `OpportunityEngine` e as actions do admin
já clampavam em 0-100 antes de gravar; a constraint é defesa em profundidade, não uma correção
de comportamento.

**Achado real (front-end ↔ banco):** o campo "Programa de pontos" de `/alertas` era um `<Input>`
de texto livre — um usuário podia digitar "livelo", "Livelo ", "Liveloo" etc., e esse valor nunca
bateria com `loyalty_programs.name` na hora de calcular o score, silenciosamente caindo no valor
de referência padrão em vez do valor real do programa. Corrigido: virou `<Select>` populado com
o catálogo real (`loyalty_programs` ativos), e a action valida de novo no servidor que o valor
recebido é um dos nomes ativos (uma Server Action pode ser chamada diretamente, sem passar pelo
`<select>` — nunca confiar só na UI).

## 4. Garanta integridade referencial

- Todas as FKs de `user_id`/`program_id`/`search_id`/`alert_id`/`category_id`/`destination_id`/
  `source_id`/`world_event_id` já existiam com `on delete cascade`/`set null` apropriado — não
  havia gap de integridade referencial de verdade no schema.
- **Decisão deliberada, não corrigida:** `loyalty_program` em `hotel_results`/`flight_results`/
  `opportunities`/`alerts`/`promotions.program` é texto livre, não uma FK pra
  `loyalty_programs.id`. Isso é intencional — esses valores vêm de fora (provider de
  voo/hotel, ou preenchimento manual do admin pra uma promoção de um programa que pode nem
  estar cadastrado ainda no catálogo) e transformar isso numa FK de verdade exigiria uma camada
  de resolução nome→id em todo lugar que ainda não existe. A mitigação real de risco aqui foi a
  correção do item 3 (nome único + validação contra o catálogo em `/alertas`) — a arquitetura de
  texto livre continua, mas com muito menos chance de divergir silenciosamente.

## 5. Consistência front-end ↔ banco de dados

Além do item 3 (`/alertas`), os `<Select>` do admin já eram populados a partir do banco (tipos,
status, categorias) — o problema real era a ausência de validação **server-side** correspondente
(um `<select>` no HTML não impede uma Server Action de receber qualquer string via
`fetch`/DevTools). Os schemas Zod do item 1 fecham essa lacuna: mesmo que o client mande um
valor fora do enum, a action rejeita com mensagem clara antes de tentar gravar.

## 6. Consistência entre APIs e banco de dados

O caminho provider → banco já passava por uma camada de normalização
(`lib/providers/types.ts` → `NormalizedHotelResult`/`NormalizedFlightResult`) e pelo
`OpportunityEngine` (que sempre clampa score e calcula preço/taxas a partir de números, nunca
passa string adiante) antes de qualquer `insert`. As novas constraints da migration `0004`
(faixa de score, valores não-negativos) são o backstop dessa cadeia — se um provider real
(Amadeus/Duffel/Booking, ainda não implementado) algum dia devolver um número fora do esperado,
o banco recusa em vez de aceitar silenciosamente.

---

## Checklist manual

- [ ] Rodar a migration `0004_data_quality_constraints.sql` (depois de `0001`→`0003`) — ver
      `README.md`. Se já houver dado real violando algum CHECK novo (pouco provável, ver
      raciocínio acima), a migration falha com uma mensagem clara de qual constraint e qual
      linha — não é uma migration "silenciosa".
- [ ] Se algum admin já tiver cadastrado dois programas com o mesmo nome antes desta etapa,
      renomear um deles manualmente antes de rodar a `0004` (senão o `unique` falha ao criar).

## Escopo desta etapa (o que ficou de fora, de propósito)

Não apliquei Zod em `cadastro`/`login`/`perfil`/`onboarding`/`consultor-ia`/`bucket-list` — são
formulários de menor risco (dado do próprio usuário, protegido por RLS, sem efeito sobre outros
usuários) e já tinham alguma checagem manual razoável (ex.: senha mínima 8 caracteres no
cadastro). Se quiser, aplico o mesmo padrão neles numa próxima etapa — a infraestrutura
(`lib/validation/`, `lib/db-errors.ts`, `components/form-error.tsx`) já está pronta pra
reaproveitar.
