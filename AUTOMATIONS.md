# AUTOMATIONS.md — n8n (ETAPA 17)

> Documenta todo fluxo criado no n8n para este app. Regra permanente: qualquer automação nova
> (deste app ou não) entra aqui, com o mesmo nível de detalhe — nunca só "criei um workflow" sem
> dizer o que ele faz, quem autentica nele e o que ele expõe.

## 1. O que existe hoje

| Workflow (n8n) | ID | Gatilho | O que faz | Status |
|---|---|---|---|---|
| **Radar Milhas & Viagens — Alerta Operacional → Telegram** | `f2r5LK6tlIJh75BK` | Webhook `POST /webhook/radar-milhas-alert` (auth por header) | Recebe um alerta crítico do app e encaminha pro Telegram do Igor (via CortexBot) | **Ativo**, testado ao vivo |

Instância n8n: `https://webhook.cortexbot.xyz` (a mesma que o Igor já usa para outros apps —
ErgoFácil, Auditoria Cívica — cada um com seu próprio workflow e credencial, todos convergindo
pro mesmo bot/chat do Telegram dele).

## 2. Radar Milhas & Viagens — Alerta Operacional → Telegram

**Por que existe**: `lib/logger.ts` já tinha `logger.critical()` para falha de pagamento, falha
sistêmica de autenticação e erro não tratado em rota crítica — mas o único canal
(`lib/alerts/notify-ops.ts` → e-mail via Resend) nunca disparava de verdade neste projeto porque
`RESEND_API_KEY`/`OPS_ALERT_EMAIL` continuam vazios (ver `README.md`). Ou seja: **até esta etapa,
nenhum alerta crítico chegava a lugar nenhum**. O n8n resolve isso reaproveitando o mesmo padrão
que o Igor já usa em outros apps (webhook → Telegram), sem precisar configurar mais nada de
e-mail.

**Estrutura do workflow** (2 nós):
1. **Webhook** (`n8n-nodes-base.webhook`) — `POST /webhook/radar-milhas-alert`, autenticação
   `headerAuth` via credencial dedicada **"Radar Milhas & Viagens - Webhook Auth"** (header
   `X-Radar-Milhas-Secret`, valor só neste app — não reaproveita a credencial de nenhum outro
   workflow existente).
2. **Telegram → Enviar mensagem** (`n8n-nodes-base.telegram`) — credencial **compartilhada**
   "CortexBot Telegram (compartilhado)" (a mesma que ErgoFácil/Auditoria Cívica usam), pro chat
   privado do Igor. Monta a mensagem a partir do corpo recebido:
   `{{ category }}` / `{{ message }}` / cada chave de `{{ fields }}` numa linha.

**Payload esperado** (body JSON, POST):
```json
{ "category": "payment", "message": "texto do alerta", "fields": { "userId": "...", "reason": "..." } }
```
Isso é literalmente o formato de `OpsAlertParams` (`lib/alerts/notify-ops.ts`) — o app não
precisa transformar nada antes de mandar.

**Integração no código**: `lib/alerts/notify-ops.ts` ganhou um segundo canal
(`notifyOpsViaN8n`), que roda **em paralelo** ao e-mail via `Promise.allSettled` — um canal
falhar nunca afeta o outro nem propaga erro pra quem chamou (`logger.critical` continua
garantidamente não-bloqueante). Timeout de 5s (`AbortController`) porque isso roda dentro de
Server Actions/Route Handlers que não podem ficar pendurados esperando uma automação externa.

**Variáveis de ambiente** (`.env.local`/`.env.example`):
- `N8N_ALERT_WEBHOOK_URL` — URL do webhook (`https://webhook.cortexbot.xyz/webhook/radar-milhas-alert`)
- `N8N_ALERT_WEBHOOK_SECRET` — o valor do header `X-Radar-Milhas-Secret` (nome do header fixo no
  código, só o valor é segredo — mesmo raciocínio de `CRON_SECRET`)

Sem as duas configuradas, o canal só fica registrado no console (`console.warn`), exatamente como
já acontecia com `OPS_ALERT_EMAIL` ausente — nunca quebra nada.

## 3. Segurança (checklist do pedido do Igor: "garantir que nenhuma automação exponha informações
sensíveis")

- **Autenticação obrigatória**: o webhook exige o header correto — testado ao vivo os dois lados:
  header certo → 200 + mensagem chega no Telegram; header errado → **403 "Authorization data is
  wrong!"**, e a execução nem aparece no histórico do workflow (rejeitado antes de rodar nenhum
  nó, confirmado via `n8n_executions`).
- **Sem endpoint público disparando isso**: `notifyOps()` só é chamado por `logger.critical()`,
  que por sua vez só é chamado a partir de código server-side interno (webhook Stripe, crons) —
  nunca a partir de uma rota que aceita input não confiável. `app/api/log-client-error/route.ts`
  (endpoint público de erro do client) já tinha comentário explícito dizendo que NUNCA deve virar
  gatilho de alerta crítico, justamente pra não virar vetor de spam/abuso — continua assim, não
  toquei nesse endpoint.
- **O que passa pelo payload**: revisei todo `logger.critical(...)` chamado no código (webhook
  Stripe, cron de trials) — só metadados operacionais (`userId`, `planId`, `eventId`, mensagem de
  erro do Stripe/Supabase). Nunca uma chave de API, token, senha ou o corpo de uma requisição
  inteira. Isso vai só pro Telegram PRIVADO do Igor (mesmo destino que já recebia o e-mail de
  alerta), não é informação exposta a terceiros.
- **Segredo próprio por app**: a credencial do n8n e o valor do header são exclusivos deste app —
  vazamento aqui não expõe os outros workflows (ErgoFácil, Auditoria Cívica) nem vice-versa.
- **Chave da integração Claude Code ↔ n8n é restrita**: a chave de API que este ambiente usa para
  falar com o n8n (via MCP) não tem permissão de leitura de conta/credenciais nem de anexar
  método de pagamento em nada — só cria/edita workflows e credenciais do tipo necessário. Não é
  uma chave "admin" da instância inteira.
- **Auditoria de segurança do próprio n8n rodada nesta etapa** (`n8n_audit_instance`, checagem de
  segredo hardcoded/webhook sem auth/tratamento de erro/retenção de dado): **0 achados
  críticos/altos/médios**. Só 1 achado **baixo**, também presente no workflow do ErgoFácil (não é
  algo desta etapa, é padrão de toda a instância): execuções ficam salvas indefinidamente
  (`saveDataSuccessExecution: 'all'`) até você configurar poda automática em n8n → Settings →
  Executions — decisão de retenção de dado que só você toma pra instância inteira, não por
  workflow.

## 4. Testes feitos antes de ativar (checklist do pedido do Igor: "testar todos os gatilhos e
retornos antes de colocar em produção")

1. `n8n_validate_workflow` (perfil `strict`) → 0 erros. Corrigi os 3 avisos de "sem tratamento de
   erro" adicionando `onError: continueRegularOutput` nos dois nós antes de ativar.
2. Ativação autorizada explicitamente pelo Igor (o classificador de segurança do Claude Code
   bloqueou a ativação até confirmação humana — comportamento esperado, ver
   `[[feedback_classificador_autoexec_bloqueia_credencial_mesmo_em_modo_autonomo]]`).
3. Gatilho real com header correto → **200 OK**, mensagem chegou de fato no Telegram do Igor
   (confirmado pelo `message_id`/`chat` na resposta da API do Telegram).
4. Gatilho real com header errado → **403**, nenhuma execução registrada.
5. Chamada HTTP idêntica à que `lib/alerts/notify-ops.ts` faz de verdade (mesma URL, header,
   payload no formato `OpsAlertParams`) → **200 OK**, mensagem chegou.
6. `tsc --noEmit` e `next build` limpos com o novo canal integrado.

Não testei disparando um `logger.critical()` real de dentro do dev server (exigiria forçar uma
falha real de webhook Stripe ou de cron) — o teste #5 acima cobre exatamente o mesmo caminho de
código (mesma função de request), então o risco residual disso é baixo.

## 5. "N8N integrado com Claude Code via API" (pedido explícito do Igor)

Isso já existe e é o que tornou esta etapa inteira possível: este ambiente do Claude Code tem um
servidor MCP (`n8n-mcp`) conectado à instância `webhook.cortexbot.xyz`, com permissão de
gerenciar workflows/credenciais via API REST do n8n — foi assim que criei, validei, ativei e
testei o workflow acima, tudo por API, sem abrir o editor visual do n8n. Não é uma configuração
deste repositório (fica no ambiente do Claude Code, fora do projeto) — só documentando aqui que
o pedido já está satisfeito e é reaproveitável para qualquer automação futura deste app.

Se o pedido era diferente — um **nó dentro de um workflow n8n que chama a API da Anthropic/Claude**
(ex.: um passo de IA dentro de um Flow) — isso é uma coisa distinta, que eu não construí porque
não tem um caso de uso concreto ainda. Me avisa se é isso que você quer e eu desenho um workflow
de exemplo.

## 6. Avaliação: o que mais dá pra acrescentar (pedido explícito do Igor nesta etapa)

Não implementei nada abaixo — são propostas, não decisões já tomadas, seguindo o mesmo protocolo
do projeto (regra de negócio fica pra você decidir):

- **Resumo diário → Telegram (07h BRT)**: hoje este app não manda nenhum relatório periódico pra
  você (diferente de outros — ex. ASO Certo já tem). Dado que o alerta crítico já existe, um
  segundo workflow "Radar Milhas & Viagens — Resumo Diário" (novos cadastros, conversões de
  trial, MRR estimado, oportunidade de maior score do dia) seria uma extensão natural e barata —
  um cron novo (mesmo padrão de `app/api/cron/check-trials`) que soma os números e manda pro
  mesmo webhook/Telegram. Não fiz porque não é alerta crítico (é decisão de produto: que métricas
  você quer ver todo dia) — só avisa que dá pra fazer rápido se você quiser.
- **n8n como ponte com WhatsApp**: hoje o canal WhatsApp do app (`lib/whatsapp/*`) depende de
  Evolution API/Z-API configurados (ainda pendente). Se você já tem uma instância WhatsApp
  conectada no n8n para outro app, dava pra reaproveitar via um workflow parecido em vez de pagar
  por outra integração — mas só faz sentido se você já tiver isso rodando em algum lugar.
- **n8n disparando os crons em vez do Vercel Cron**: os 4 crons (`check-alerts`,
  `refresh-promotions`, `expire-opportunities`, `check-trials`) já são protegidos por
  `CRON_SECRET` e chamados pelo agendador da própria Vercel — funcionam sem n8n. Migrar isso pro
  n8n só traria valor se você quiser um histórico visual de execução centralizado com os outros
  apps; hoje seria redundância, não simplificação, então não propus mexer nisso.
