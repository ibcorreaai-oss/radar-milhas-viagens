# ENGAGEMENT_UX.md — Radar Milhas & Viagens

> Camada de experiência/engajamento (progresso, microvitórias, feedback imediato, conquistas
> opcionais). Escrito em 25/08/2026 (ETAPA 13 do Igor — "NeuroUX"). Complementa `GROWTH.md`
> (que é a camada de funil/e-mail/métricas de negócio) — este documento é sobre o que a pessoa
> vê e sente usando o produto, não sobre conversão/retenção medida no backend.

## Curadoria: o prompt da ETAPA 13 é um framework genérico de gamificação/PLG que serve pra
## qualquer tipo de SaaS. Nem tudo se aplica a um clube de alertas de viagem. Decisões abaixo.

O Igor pediu explicitamente "veja nesse prompt o que se adequa a esse aplicativo" — a regra
mestre do próprio prompt também exige responder 8 perguntas antes de implementar qualquer
coisa (o usuário entende pra que serve, reduz trabalho, economiza tempo, transmite progresso,
torna o sistema mais agradável, melhora retenção sem manipular, respeita UX/acessibilidade,
aumenta valor percebido). Aplicando isso:

### Implementado

| Peça | Onde | Por quê passou no crivo |
|---|---|---|
| Toast global (`components/toast-provider.tsx`) | `app/layout.tsx` | **Bug real corrigido**: `/perfil` redirecionava com `?sucesso=1` em 3 actions e nada consumia — a pessoa salvava e não via confirmação nenhuma. Feedback imediato não é luxo aqui, é o básico faltando. |
| `ToastFromQuery` (genérico, reutilizável) | `/perfil`, `/dashboard` | Em vez de handler específico por página, um componente que lê query param e dispara toast — qualquer página nova só declara a regra. |
| Barra de progresso do onboarding | `app/onboarding/onboarding-form.tsx` | Onboarding é 4 seções num formulário só, sem nenhum indicador — a pessoa não sabia quanto faltava. Calculado ao vivo do estado do form, não decorativo. |
| Barra de completude do perfil | `/perfil` | Mesmo cálculo (`lib/profile-completeness.ts`), reaproveitado. Cada critério é algo que genuinamente piora a precisão do alerta se faltar — não é gamificação vazia. |
| Celebração de onboarding concluído | `/dashboard?onboarded=1` | Ativação é o momento mais importante do funil (ver `GROWTH.md`) — merece reconhecimento, uma vez, sem repetir. |
| Microvitória do primeiro alerta | `/alertas` (`?primeiro=1`) | Criar o primeiro alerta é a ação que mais define se a pessoa vai voltar (sem alerta, não tem motivo pra voltar) — copy diferente só nessa vez, calculado a partir da contagem que a action já fazia (não é uma query nova). |
| Carregamento inteligente | `SmartLoading`, usado em `voos/loading.tsx` e `hoteis/loading.tsx` | É o único trecho do produto com espera perceptível de verdade (cálculo de score do OpportunityEngine) — spinner mudo vira mensagens que contam o que está acontecendo. |
| Nudge de alerta após busca repetida | `/voos`, `/hoteis` | Se a pessoa já buscou a mesma rota/cidade 2+ vezes sem ter alerta pra ela, sugere criar um — é literalmente "reduzir trabalho futuro", calculado das tabelas que já existem. |
| Painel de conquistas (opcional, flag `achievementsPanel`) | `/dashboard`, `lib/achievements.ts` | 5 marcos reais (perfil completo, primeira busca, primeiro alerta, primeira oportunidade recebida, 30 dias de clube) — sem pontos/níveis/streaks (ver abaixo por quê). Desligado por padrão, admin decide (mesmo padrão de `worldRadar`/`bucketList`). |
| Evolução simples no dashboard | `/dashboard` (frase "você já fez N buscas nos últimos 7 dias") | Número real, calculado, não decorativo. |

### Deliberadamente NÃO implementado (e por quê)

- **Pontos, níveis, sequências (streaks), ranking/leaderboard.** O próprio prompt da etapa
  pede pra evitar "loops infinitos, pressão psicológica, FOMO artificial, recompensas
  aleatórias, escassez falsa". Um app de monitorar preço não é um app de hábito diário —
  forçar o usuário a "manter uma sequência" de logins não cria valor real, cria ansiedade
  artificial. Não passa no crivo "melhora a retenção sem manipular".
- **"Tempo economizado" / "dinheiro economizado" como métrica de dashboard.** Não existe uma
  forma honesta de calcular isso sem um ponto de comparação real (quanto a pessoa teria pago
  sem o Radar?). Fabricar um número pra parecer impressionante seria exatamente o tipo de
  manipulação que o prompt pede pra evitar. Preferi mostrar contagens reais (buscas, alertas,
  oportunidades recebidas) em vez de estimativas inventadas.
- **Sistema de metas (meta diária/semanal/mensal).** Não mapeia naturalmente pra um produto de
  monitoramento — não existe uma "quantidade certa" de buscas ou alertas que a pessoa deveria
  bater. Forçar uma meta arbitrária pareceria bolted-on, não ia passar no crivo "o usuário
  entende imediatamente pra que ela serve".
- **Insights automáticos via IA generativa** (ex.: "você busca sempre às segundas, quer
  automatizar?"). Ideia real e boa, mas exige análise de padrão mais sofisticada e,
  dependendo da abordagem, custo de API novo — o Igor tem regra de gasto zero em API nova sem
  aprovar antes. O nudge de "busca repetida → sugerir alerta" (implementado) é a versão
  barata e regrada da mesma ideia, sem custo novo.
- ~~Wizard multi-etapa pro onboarding~~ — **revertido na ETAPA 18**, ver seção própria abaixo.
  O Igor pediu explicitamente um onboarding com avatar, texto e voz, com toda etapa pulável —
  isso só faz sentido como fluxo passo a passo. A razão original (risco/retrabalho frente a
  ganho marginal) deixou de valer quando virou pedido explícito, não uma ideia genérica de
  gamificação.
- **Descoberta gradual agressiva** (esconder menus até o usuário "evoluir"). A sidebar já
  lista tudo (ver ETAPA 12b) — esconder itens de navegação reais atrás de um sistema de
  progressão tornaria o produto mais confuso pra quem já sabe o que quer, não menos. O produto
  é pequeno o suficiente (10 itens de menu) pra não precisar disso.
- **Dashboard interno de métricas de engajamento (D1/D7/D30, tempo até 1ª ação útil etc.)**
  Fica para uma etapa dedicada — `GROWTH.md`/`/admin/metricas` já cobre ativação/conversão/
  churn/abandono; adicionar retenção por coorte é uma extensão real mas que merece atenção
  própria em vez de ser espremida no fim desta etapa.

## ETAPA 18 (26/08/2026) — Onboarding com avatar ("Rada")

Pedido do Igor: reduzir dúvida/aumentar ativação, toda etapa pulável, e um avatar que explica o
app por texto E voz, tailorizado pra este app específico. Virou um wizard de 8 passos —
`app/onboarding/onboarding-wizard.tsx` (substituiu `onboarding-form.tsx`, removido):

1-4. **Passos do avatar** (`components/onboarding/mascot-avatar.tsx` +
`components/onboarding/avatar-message.tsx`) — a "Rada", mascote SVG puro (sem imagem/vídeo
gerado por IA — zero custo de API nova, ver [[feedback_gasto_zero_api_novas]]), explica em 4
telas curtas: quem ela é, o que o app faz (dinheiro vs pontos), quais recursos existem
(alertas/consultor IA/favoritos) e o teste de 5 dias (ETAPA 16). Texto com efeito de "digitando"
+ botão opcional "Ouvir em voz alta" via Web Speech API nativa do navegador (síntese de voz
começa desligada — alguns navegadores restringem/estranham áudio sem gesto do usuário — e uma
vez ligada pelo usuário continua ligada nas telas seguintes). "Pular apresentação" pula direto
pra personalização; "Continuar" avança uma tela.

5-8. **Passos de dados** — as mesmas 4 seções que já existiam (origem/destinos, programas de
pontos, preferências, notificações), uma por tela agora, cada uma com "Pular esta etapa" (avança
sem exigir nada) e "Continuar". Nenhum campo é mais obrigatório (`home_airport` era `required`
antes, bloqueava pular a etapa inteira — removido, mesmo padrão que `app/(app)/perfil/actions.ts`
já usava pra esse campo).

**"Pular tudo"**: botão fixo no topo, em qualquer etapa (inclusive nas de avatar), submete o que
já foi preenchido até ali e marca `onboarding_done=true`.

### Dois bugs reais achados testando ao vivo (não apareceriam em `tsc`/`build`)

1. **"Pular tudo" ficava preso pela validação nativa do campo de telefone** — mesmo bug já
   corrigido na ETAPA 15.1 pro botão "Reenviar código" (`app/(auth)/login/login-form.tsx`):
   um campo `required` (telefone, só quando WhatsApp está ligado) em qualquer lugar do `<form>`
   bloqueia TODO botão de submit dentro dele, mesmo um que devesse ignorar essa regra. Fix:
   `formNoValidate` no botão "Pular tudo" + a própria Server Action também passou a forçar
   `notify_whatsapp=false` quando o intent é "skip" (bypassar só a validação do navegador não
   bastava — a Server Action tinha a mesma checagem).
2. **Perda de dado real ao navegar entre etapas antes de concluir** (o mais sério dos dois):
   `home_airport`, `favorite_destinations`, `monthly_budget` e o saldo de cada programa de
   pontos eram campos `<input name="...">` dentro do Card de cada etapa, renderizado
   condicionalmente (só a etapa atual existe no DOM). Ao navegar pra outra etapa, o input some do
   DOM — e no submit final, `FormData` só inclui o que existe no `<form>` NAQUELE momento, então
   o valor digitado se perdia mesmo com o estado React ainda correto (achado preenchendo
   "aeroporto de origem", avançando 3 telas e concluindo — salvava em branco). Fix: os 4 campos
   viraram `<input type="hidden">` fixos no nível do `<form>` (mesmo padrão que
   `phone`/`cabin_class_preference` já usavam corretamente), os campos visíveis dentro de cada
   Card ficaram sem `name`, só espelham o valor. Confirmado corrigido testando o mesmo cenário de
   novo (preencher 3 campos em etapas diferentes, concluir, conferir em `/perfil`).

Testado ao vivo (Playwright + conta de teste `ibcorrea.ai+lms15_2@gmail.com`): avançar/voltar
entre os 8 passos, "Pular apresentação", "Pular esta etapa" em cada uma, "Ouvir em voz alta",
"Pular tudo" com WhatsApp ligado e telefone vazio, conclusão normal preenchendo dados reais —
zero erro de console em qualquer cenário. `tsc`/`build` limpos. Conta de teste devolvida a um
estado limpo (via "Pular tudo") ao final.

## Onde estão as peças novas

- `components/toast-provider.tsx` + `components/toast-from-query.tsx` — sistema de toast
  global e o mecanismo genérico de "toast disparado por query param de redirect".
- `components/ui/progress.tsx` — barra de progresso reutilizável.
- `lib/profile-completeness.ts` + `components/profile-completeness-bar.tsx` — completude de
  perfil (onboarding e `/perfil`).
- `lib/achievements.ts` + `components/achievements-panel.tsx` — conquistas, atrás da flag
  `achievementsPanel` (`feature_flags`, `supabase/migrations/0008_achievements_flag.sql`).
- `components/smart-loading.tsx` — carregamento com mensagens rotativas.
- Nudge de alerta: lógica embutida direto em `voos/page.tsx` e `hoteis/page.tsx` (não virou
  componente próprio — é só uma contagem + card condicional, específico o suficiente pra não
  precisar de abstração).
- `app/onboarding/onboarding-wizard.tsx` + `components/onboarding/mascot-avatar.tsx` +
  `components/onboarding/avatar-message.tsx` — onboarding com avatar (ETAPA 18, ver seção
  própria acima).

## Pendência manual

- [ ] Ligar `achievementsPanel` quando quiser: `update feature_flags set enabled = true where
      key = 'achievementsPanel';` no SQL Editor do Supabase (mesmo processo de `worldRadar`).
