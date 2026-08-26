# GROWTH.md — Radar Milhas & Viagens

> Ativação, retenção, conversão, upsell/cross-sell, recuperação de cancelados e as métricas de
> negócio. Escrito em 25/08/2026 (ETAPA 7 do Igor).

## O achado que guiou esta etapa: 4 e-mails prontos, nenhum disparado

Igual ao Zod na ETAPA 6, `lib/email/templates.ts` já tinha `welcomeEmail`, `subscriptionActiveEmail`,
`trialEndingEmail`, `opportunityExpiredEmail` e `newPromotionEmail` escritos desde sessões
anteriores — só `alertFoundEmail` era realmente chamado em algum lugar (pelo cron
`check-alerts`). Os outros quatro eram infraestrutura morta: o funil de ativação/conversão/
retenção não tinha nenhum e-mail automático além do alerta de oportunidade.

## 1. Mecanismos de ativação, retenção e conversão implementados

| E-mail | Gatilho | Papel no funil |
|---|---|---|
| `welcomeEmail` | Cadastro concluído (`cadastro/actions.ts`, sessão instantânea) ou primeiro login confirmado (`auth/callback`, e-mail/Google) | **Ativação** — primeiro contato, direciona pro onboarding |
| `subscriptionActiveEmail` | Webhook Stripe `checkout.session.completed` | **Conversão** — confirma que o pagamento funcionou, reduz ansiedade pós-compra |
| `winBackEmail` (novo) | Webhook Stripe `customer.subscription.deleted` | **Recuperação** — lembra o que a pessoa perde, convida a voltar |
| `alertFoundEmail` (já existia) | Cron `check-alerts` | **Retenção** — é o próprio motivo de existir do produto |

Todos passam por `sendEmail()` (`lib/email/send.ts`), que nunca lança exceção e já loga
sucesso/falha (ETAPA 4) — nenhum desses disparos pode derrubar o fluxo principal (cadastro,
checkout, cancelamento) se o Resend falhar ou não estiver configurado.

**Resolvido na ETAPA 16 (26/08) — ver `MONETIZATION.md`:** o Igor decidiu o trial gratuito (5
dias, sem cartão, controlado pelo nosso banco em vez de `trial_period_days` da Stripe — ver
`MONETIZATION.md` #2 pro raciocínio). `trialEndingEmail` agora tem gatilho de verdade: cron novo
`app/api/cron/check-trials`, roda 1x/dia, dispara pra quem tem `trial_ends_at` nas próximas 24h
(dedupe via `notification_logs`, sem coluna nova).

## 2. Pontos de abandono identificados

Calculados em `/admin/metricas` a partir do dado real que o app já coleta (sem tabela de eventos
nova — ver §6):

- **Cadastrou, nunca buscou nada, há mais de 7 dias** — nunca chegou perto do valor central do
  produto (comparar dinheiro vs pontos). É o abandono mais grave: a pessoa nem experimentou.
- **Travado no onboarding há mais de 3 dias** — terminou o cadastro mas não respondeu o
  questionário inicial. Sinal de fricção no onboarding em si, não de desinteresse no produto.
- **(Já existia, reforçado)** dashboard mostra `EmptyState` com CTA "Criar meu primeiro alerta"
  quando `alerts.length === 0` — cobre o abandono entre "fez uma busca" e "configurou algo
  recorrente" (sem alerta, o usuário não tem motivo pra voltar).

## 3. Oportunidades de upsell

- **Banner no dashboard** (novo, `app/(app)/dashboard/page.tsx`): usuário Free que já usa o
  alerta grátis (limite do plano) vê um convite pra Premium na hora — momento de maior fricção
  real (literalmente não consegue criar outro alerta sem pagar), não um banner genérico.
- **`/admin/metricas`** lista a contagem de candidatos a upsell (free no limite de alertas) —
  dá pra priorizar contato manual/campanha se o volume justificar.
- Os banners de limite já existentes (`/hoteis?limite=1`, `/voos?limite=1`, `/alertas?limite=1`)
  já eram um mecanismo de upsell no ponto de fricção — não precisaram de mudança, só foram
  confirmados como corretos durante a auditoria.

## 4. Oportunidades de cross-sell

- **`/admin/metricas`** identifica usuários com alerta só de hotel (nunca configuraram de voo) e
  vice-versa — candidatos naturais a "você também pode monitorar voos para esse destino".
  Não implementei o nudge automático na UI ainda (ex.: sugestão dentro de `/alertas` na hora de
  criar um alerta de hotel) — fica como próximo passo se o Igor quiser, a identificação já está
  pronta pra alimentar essa decisão.

## 5. Recuperação de assinantes cancelados

- **Automático:** `winBackEmail` dispara no momento exato do cancelamento (webhook
  `customer.subscription.deleted`), com o nome do plano que a pessoa tinha.
- **Manual:** `/admin/metricas` lista os últimos 10 cancelamentos (30 dias) com nome/e-mail, pra
  contato direto quando fizer sentido (ex.: perguntar o motivo, oferecer condição especial) — o
  e-mail automático é o primeiro toque, não substitui uma conversa quando o valor do cliente
  justificar.

## 6. Métricas de crescimento, retenção e conversão

`/admin/metricas` (novo, link no painel `/admin`) — calculado sob demanda a partir de
`profiles`/`subscriptions`/`alerts`/`flight_searches`/`hotel_searches`, sem tabela de evento
nova e sem serviço externo (zero custo adicional):

- **Crescimento:** usuários totais, novos nos últimos 7/30 dias.
- **Conversão:** contagem por plano, taxa de conversão paga (pagantes / total).
- **Ativação:** % onboarding concluído, % com pelo menos 1 alerta criado, quantos já buscaram.
- **Retenção:** churn dos últimos 30 dias (cancelamentos / base paga+cancelada no período).
- Pontos de abandono, upsell e cross-sell — ver §2-4 acima, todos na mesma página.

**Por que não uma tabela de eventos genérica (page views, cliques) nem um serviço tipo
PostHog:** sem tráfego real ainda, uma tabela de eventos ficaria vazia e um serviço pago não se
paga sozinho — as métricas acima já respondem "cresceu quanto, converteu quanto, reteve quanto"
usando dado que o produto já precisa gravar de qualquer forma (busca, alerta, assinatura). Se o
volume de usuários crescer a ponto de precisar de funil de conversão por página/clique de
verdade, aí sim vale reconsiderar — decisão de custo pro Igor, ver checklist.

**Por que a página usa `service_role` em vez do client de sessão:** a RLS de `subscriptions` só
libera "read own" (dado de pagamento é sensível, ver `DATA_QUALITY.md`/`0001_schema.sql`) — sem
policy de admin-lê-tudo. Em vez de afrouxar essa RLS pra todo lugar, a página usa
`createAdminClient()` só aqui, atrás do mesmo `role !== 'admin' → redirect` que toda página
`/admin` já tem.

---

## Checklist manual

- [x] ~~Decidir se o produto vai oferecer trial gratuito nos planos pagos~~ — feito na ETAPA 16
      (5 dias, controlado pelo nosso banco, não via `trial_period_days` da Stripe — ver
      `MONETIZATION.md`).
- [ ] Definir se cross-sell (hotel↔voo) vira nudge automático na UI ou fica só como métrica pra
      decisão manual por enquanto.
- [ ] Revisar o copy dos e-mails novos (`welcomeEmail`, `subscriptionActiveEmail`,
      `winBackEmail` — o `winBackEmail` é novo desta etapa) antes de considerar produção real.

## Custos externos envolvidos (ETAPA 7)

Nenhum novo — reaproveita Resend (já no checklist do README) e Supabase. Nenhum serviço de
analytics pago foi adicionado.

---

# ETAPA 15.1 (25/08/2026) — Resend, auditoria, analytics/ads, IA+WhatsApp na home, indicação

Mesmo padrão de curadoria das etapas anteriores: o prompt do Igor mistura pedidos reais deste
produto com resíduo de outros SaaS dele (menciona "aba de cupom promocional dos afiliados" +
"usar modelo de autenticação OTP" na mesma frase — OTP já é o método padrão deste produto desde a
ETAPA 14). Decisões abaixo.

## 1. Resend — já estava pronto, mas nunca configurado

`lib/email/send.ts`/`templates.ts` já tinham 9 templates prontos desde etapas anteriores. O que
faltava: **`RESEND_API_KEY` está vazio em `.env.local`** — hoje, todo e-mail transacional
(boas-vindas, confirmação de assinatura, notificação de contato) silenciosamente vira `skipped`
(por design — `sendEmail()` nunca derruba o fluxo principal por causa disso, ver ETAPA 4). Isso
**não é um bug desta etapa**, é uma pendência antiga que só fica visível quando se procura —
adicionada ao checklist manual abaixo. Não existe (e não construí) sistema de newsletter/
informativo em massa — os 9 templates já cobrem ativação/conversão/retenção/recuperação; um
disparo em massa pra lista de e-mails exigiria opt-in de marketing e gestão de descadastro,
escopo de uma etapa própria se o Igor quiser campanhas de e-mail além do funil transacional.

## 2. Auditoria — só delete era registrado

`audit_logs`/`/admin/auditoria` já existiam (ETAPA 15.0), mas só as 4 Server Actions de
`deleteX` chamavam `logAuditEvent` — criar/editar evento, programa, oportunidade ou promoção
ficava fora do histórico. Adicionado `create`/`update` nas 4 entidades (metadata leve: só o
título/nome, não a linha inteira — delete continua sendo o único que guarda snapshot completo,
porque é o único caso onde a auditoria também serve pra recuperação manual, ver
`DISASTER_RECOVERY.md`). Também adicionado `admin_login` (login bem-sucedido em `/admin-login`) —
era literalmente citado como exemplo no próprio `PLATFORM_ADMIN.md` e não estava implementado.

## 3. Google Analytics + pixels de Meta/Google Ads/Twitter/TikTok

Novo: `components/analytics-scripts.tsx` (injeta cada script só se a variável de ambiente
correspondente existir — hoje nenhuma está configurada, então isto não carrega nada) +
`lib/analytics.ts` (`trackConversion()`, ponto único que dispara pra toda plataforma configurada
de uma vez) + `components/conversion-tracker.tsx` (dispara em cima de query params que o produto
já usa — `?onboarded=1` no dashboard pro evento `sign_up`, `?sucesso=1` em `/assinatura` pro
evento `subscribe`, e o próprio lead do chat da home pro evento `lead`).

**Por que isso não contradiz a decisão da ETAPA 7** ("nenhum serviço de analytics pago, sem
tráfego real ainda não se paga sozinho"): aquela decisão era sobre construir uma tabela de
eventos/serviço tipo PostHog SEM o Igor ter pedido — aqui ele pediu explicitamente pra preparar a
integração com Google/Meta/Twitter/TikTok antes de rodar anúncio de verdade, que é a ordem certa
(instalar pixel antes da campanha começar, não depois). GA4/pixels de plataforma são gratuitos
(zero custo novo) — a única coisa que muda é o Igor precisar preencher as variáveis quando tiver
as contas de ads criadas.

## 4. Assistente de IA + WhatsApp na home pública

Novo: widget flutuante (`components/home-assistant-widget.tsx`) em `app/page.tsx` com duas opções:

- **WhatsApp**: link direto (`wa.me/NUMERO`) — não um chat embutido. Este produto não tem (e não
  construí) um backend de conversa em tempo real (webhook de entrada, fila de atendimento, painel
  de agente) — isso seria uma feature de helpdesk própria, não uma "aba". O padrão `wa.me` é o
  jeito real que "colocar WhatsApp no site" funciona sem esse backend. Só aparece se
  `NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER` estiver configurado.
- **IA**: nova Server Action pública (`app/home-chat-actions.ts`, `askPublicAssistant`) —
  reaproveita o mesmo Anthropic já usado no Consultor IA autenticado, mas com system prompt
  diferente (vende o produto, nunca acessa dado de ninguém — não existe usuário ainda) e limites
  mais curtos (`max_tokens: 400` vs 1024, histórico máximo de 20 mensagens): exposto sem login,
  precisa de mais controle de custo que a versão paga.

### Sobre o CPF pedido no prompt

O pedido original pede nome, CPF e e-mail antes de usar a IA. **Implementei só nome + e-mail.**
CPF é dado sensível (documento nacional) sem nenhum uso real neste ponto do funil — a pessoa
ainda nem decidiu se vai assinar, e cobrar CPF pra só tirar uma dúvida no chat é fricção alta sem
contrapartida, contradizendo o próprio último item do prompt ("melhorar a captura de lead sem
prejudicar a experiência"). Nome+e-mail já é o suficiente pra virar lead de verdade (contato,
follow-up por e-mail) — CPF fica pra quando existir um motivo real de coletar (ex.: nota fiscal
de assinatura paga, que hoje é responsabilidade do Stripe, não deste formulário).

### Lead vira `contact_messages`, não uma tabela nova

`source` (`'contato' | 'home_ai_chat'`) foi adicionado à tabela que já existia — mesmo formato
(nome/e-mail/mensagem), mesmo aviso por e-mail pro `OPS_ALERT_EMAIL`, mesma policy de RLS
(insert público, leitura só admin). Captura só na primeira mensagem da conversa (não uma linha por
mensagem), e um limite de 3 conversas novas por e-mail em 24h evita gerar lead/custo de IA em
massa sem precisar de infraestrutura de rate limit nova.

## 5. Indique e ganhe (cupom/afiliado)

Curadoria: este produto não tem conceito de "afiliado" que precise se cadastrar/aprovar — o mais
próximo e honesto do pedido é um **programa de indicação simples**: todo usuário já nasce com um
`referral_code` (trigger `handle_new_user`, gerado automaticamente, nunca escolhido pelo próprio
usuário), visível em `/afiliados` com um link pronto pra compartilhar
(`/cadastro?ref=CODIGO`). Quem se cadastra por esse link fica com `referred_by_user_id` resolvido
no mesmo trigger.

**Não implementado nesta etapa**: comissão/desconto automático por indicação. Isso exigiria uma
camada financeira própria — quem aprova o pagamento, como evitar fraude (conta fake indicando a
si mesma), qual o valor da recompensa — decisão de negócio do Igor, não um detalhe técnico. A
infraestrutura de rastreio (quem indicou quem) já está pronta pra alimentar isso quando o Igor
decidir a regra de recompensa.

## 6. Upload seguro

Achado real (não builder assumption): o limite de 5MB e os tipos aceitos em
`components/admin/image-upload-field.tsx` (ETAPA 14) eram **só validação client-side** —
plenamente contornável chamando o SDK do Supabase Storage direto, sem passar pelo componente.
Corrigido a nível de bucket (`storage.buckets.file_size_limit`/`allowed_mime_types`,
`0013_growth_leads_referrals_upload_hardening.sql`) — agora o próprio Postgres/Storage recusa
qualquer upload fora do limite, independente de qual client tentou.

## Checklist manual (ETAPA 15.1)

- [ ] **`RESEND_API_KEY` continua vazio** — sem isso, nenhum e-mail transacional (boas-vindas,
      confirmação de assinatura, aviso de contato/lead) é enviado de verdade. Pendência antiga
      (não desta etapa), só ficou visível ao revisar Resend a fundo.
- [ ] Preencher `NEXT_PUBLIC_SUPPORT_WHATSAPP_NUMBER` quando tiver o número de suporte —
      sem isso, o botão de WhatsApp simplesmente não aparece no widget da home (não quebra nada).
- [ ] Preencher `NEXT_PUBLIC_GA_MEASUREMENT_ID`/`NEXT_PUBLIC_META_PIXEL_ID`/
      `NEXT_PUBLIC_GOOGLE_ADS_ID`/`NEXT_PUBLIC_TWITTER_PIXEL_ID`/`NEXT_PUBLIC_TIKTOK_PIXEL_ID`
      quando as contas de anúncio existirem — cada um é independente, preencha só o que for usar.
- [ ] Decidir a regra de recompensa do "Indique e ganhe" (se vai ter, e qual) — a infraestrutura
      de rastreio já está pronta, falta a decisão de negócio.
- [ ] Verificar o tom/conteúdo do system prompt do assistente público
      (`app/home-chat-actions.ts`) antes de expor a tráfego pago de verdade — hoje é uma primeira
      versão razoável, não foi revisado por ninguém do time de marketing.

## Correções achadas na autorrevisão (antes do fim da etapa, algumas em código de etapas anteriores)

- **Limite anti-abuso do chat público sempre passava** — `recentChatCount()` fazia `select` direto
  em `contact_messages`, que só tem policy de leitura pra admin; um visitante anônimo sempre via
  `count=0` (RLS silenciosa), o limite de 3 conversas/dia por e-mail nunca bloqueava ninguém de
  verdade. Corrigido com RPC `count_recent_home_chat_leads`
  (`0015_home_chat_rate_limit_rpc.sql`), mesmo padrão de `count_my_referrals` (§5).
- **Condição de corrida em `admin_set_user_role`** (função da ETAPA 15.0) — dois super_admins
  rebaixando dois OUTROS super_admins ao mesmo tempo podiam ambos passar pela checagem "sobra pelo
  menos 1", deixando o sistema sem nenhum. Corrigido com `for update` travando as linhas de
  super_admin antes de contar (`0016_admin_set_user_role_race_fix.sql`).
- **`/login` quebrava com `URIError`** se o motivo de bloqueio (`blocked_reason`, texto livre
  definido por um admin em `/admin/usuarios`) contivesse um `%` sozinho — `searchParams` do
  Next.js já entrega o valor decodificado, e o código chamava `decodeURIComponent()` de novo
  (double-decode). Corrigido removendo a segunda decodificação (`app/(auth)/login/page.tsx`).
- **`passwordSchema.max(72)`** (ETAPA 14) contava caracteres JS, não bytes — o limite real é do
  bcrypt do GoTrue, que trunca em 72 BYTES. Senha com acento perto do limite podia passar na
  validação e ainda estourar o limite real. Trocado por medição de bytes via `TextEncoder`.
- **Conversão de ads recontava em reload** — `/assinatura?sucesso=1` não tinha nenhuma limpeza de
  URL (diferente do dashboard, que já usa `ToastFromQuery`); recarregar ou compartilhar essa URL
  disparava o evento `subscribe` de novo. Corrigido convertendo os banners de sucesso/cancelado
  de `/assinatura` para `ToastFromQuery` (mesmo padrão do dashboard) e fazendo `ConversionTracker`
  limpar o próprio query param depois de disparar.
- Branch de conta bloqueada em `handleSignupStep` (cadastro/actions.ts) não devolvia `name` no
  estado — um "reenviar código" depois dessa tela falharia a validação de nome. Corrigido.
