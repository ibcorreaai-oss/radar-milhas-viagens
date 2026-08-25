# TRAINING.md — Central de Treinamentos / Mini LMS (ETAPA 15.2)

Este documento segue o mesmo padrão de `AUTH_AND_ADMIN.md` → `PLATFORM_ADMIN.md` → `GROWTH.md`:
o que o prompt genérico pedia, o que foi curado especificamente pra este produto, e por quê.

## 1. Curadoria — o que NÃO se aplica a este produto

- **"Papel específico autorizado" pra gerenciar conteúdo** = `admin`/`super_admin` via
  `requireAdmin()` (`lib/admin-guard.ts`). Este produto não tem multi-tenant nem "Owner" de
  organização (ver `PLATFORM_ADMIN.md`) — não existe uma role intermediária pra treinamentos.
- **Drag-and-drop de reordenação**: implementado como botões "mover pra cima/baixo" trocando
  `order_index` com o vizinho, não uma lib de drag-and-drop nova. O volume de módulos/aulas
  deste produto (dezenas, não milhares) não justifica a dependência extra.
- **Upload de vídeo**: este produto já tinha decidido, desde a ETAPA 14 (`event-media` bucket,
  ver `0009_favorites_and_media_storage.sql`), não ter upload de vídeo/documento — só imagem.
  Mantive a mesma decisão aqui: o provider `supabase` de vídeo espera uma URL pública de um
  arquivo que o admin já subiu por fora (dashboard do Supabase Storage), não um widget de
  upload dentro do formulário de aula. "Materiais complementares" são links (jsonb), não PDF
  hospedado por nós.
- **Certificados/quizzes/gamificação/notificações/trilhas por perfil**: NÃO implementados agora
  (ver §5 abaixo) — o pedido foi explícito que a arquitetura só precisa não bloquear isso depois,
  não entregar tudo pronto.

## 2. Modelo de dados (`0017_training_lms.sql`, seed em `0018_training_seed_content.sql`)

- `training_modules` (title, slug, description, order_index, status draft/published/archived)
- `training_lessons` (module_id, title, slug, description, **content_type** video/text/quiz —
  só 'video' funciona hoje, os outros dois existem no enum pra não exigir migration depois —,
  video_provider, video_ref, duration_seconds, order_index, is_required, keywords text[],
  resources jsonb `[{title,url}]`, thumbnail_url, status)
- `lesson_progress` (user_id, lesson_id, status not_started/in_progress/completed,
  progress_seconds, started_at, completed_at, last_accessed_at) — `unique(user_id, lesson_id)`

Progresso geral/por módulo é **calculado on-demand** (aulas concluídas ÷ total), não
pré-agregado numa coluna — mesmo princípio de "não pré-agregar sem necessidade real" já
estabelecido no produto (ver `feedback_seed_data_bater_com_engine_e_data_atual` na memória do
Igor). Com o volume de conteúdo deste produto, calcular na query é simples e sempre correto.

### RLS

- `training_modules`/`training_lessons`: leitura pública (autenticado) só do que está
  `published` (aula E módulo, os dois); `is_admin()` vê tudo, inclusive rascunho, para poder
  usar `/treinamentos` como pré-visualização antes de publicar. Escrita só admin.
- `lesson_progress`: cada usuário só lê/escreve o próprio registro (`user_id = auth.uid()`).
  Admin tem uma policy **só de leitura** adicional (pra métricas de conclusão/abandono) — nunca
  escreve o progresso de outra pessoa, nem o super_admin. Toda Server Action de progresso
  (`app/(app)/treinamentos/actions.ts`) usa `ctx.userId` do servidor, nunca um `user_id` vindo
  do client — RLS é a segunda camada, não a única.

## 3. Camada de abstração de vídeo (`lib/video-providers.ts`)

`resolveVideoSource({provider, ref})` é o único lugar que sabe montar uma URL de embed —
nenhum componente de UI monta URL de provider na mão. Suporta YouTube, Vimeo, Bunny Stream,
Cloudflare Stream, Supabase Storage (URL pública) e URL direta (mp4/webm). Cloudflare Stream
exige `NEXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE` (subdomínio da conta) — sem isso, mostra um
erro de configuração em vez de tentar montar uma URL inválida.

**Limitação conhecida e aceita**: para providers de iframe (YouTube/Vimeo/Bunny/Cloudflare), a
posição exata de reprodução não é rastreável sem integrar o SDK de cada player (escopo bem além
de um "Mini LMS simples inicialmente") — "continuar assistindo" e progresso em segundos
funcionam com precisão só para `supabase`/`url` (elemento `<video>` nativo). Para os outros
providers, o registro de "iniciada" (ao abrir a aula) e o botão manual "Marcar como concluída"
ainda funcionam normalmente — só a posição exata (mm:ss) não é salva.

## 4. Onde cada peça está

- Sidebar: `components/app-sidebar.tsx` (`ACCOUNT_ITEMS`, ícone `SquarePlay`) — mobile drawer
  reaproveita a mesma lista (`components/app-mobile-nav.tsx`), sem duplicação.
- Usuário: `/treinamentos` (lista + busca + filtro + continuar assistindo, tudo client-side já
  que o volume de conteúdo é pequeno) e `/treinamentos/aula/[slug]` (player + progresso +
  anterior/próxima cruzando módulo + materiais complementares).
- Admin: `/admin/treinamentos` (hub com stats + lista de módulos), `/admin/treinamentos/modulos/*`
  (CRUD de módulo) e `/admin/treinamentos/aulas/*` (CRUD de aula, inclusive mover entre módulos
  via o próprio select do formulário — sem action dedicada pra isso).
- Toda action de módulo/aula usa `requireAdmin()` + `logAuditEvent()` (create/update/delete/
  publish/unpublish/archive/reorder) — auditável em `/admin/auditoria`.

## 5. Arquitetura futura (não implementado agora, mas não bloqueado)

- **Certificados**: nova tabela `certificates` referenciando conclusão 100% de um módulo/trilha;
  não precisa de mudança em `training_modules`/`lesson_progress`.
- **Quizzes**: `training_lessons.content_type = 'quiz'` já existe no enum; precisa de
  `quiz_questions`/`quiz_attempts` novas, sem tocar no schema atual.
- **Aulas em texto**: `content_type = 'text'` já existe; a constraint
  `training_lessons_video_ref_required` já só exige `video_ref` quando `content_type = 'video'`.
- **Trilhas por perfil / obrigatoriedade / pré-requisito / desbloqueio progressivo**:
  `is_required` já existe; um `prerequisite_module_id` ou `required_plan` seriam colunas
  nullable aditivas, sem quebrar nada existente.
- **Notificações/relatórios de engajamento**: reaproveitaria a infraestrutura já existente de
  `notification_logs`/e-mail (Resend) em vez de um sistema novo.
- **Analytics do admin**: os 4 cards em `/admin/treinamentos` (módulos, aulas publicadas,
  usuários com progresso, aulas concluídas) já são calculados on-demand a partir de
  `lesson_progress` — métricas mais finas (taxa de abandono por aula, tempo médio) usariam a
  mesma tabela, sem precisar de coleta nova.

## 6. Conteúdo semeado

12 aulas em 4 módulos, adaptadas às funcionalidades REAIS deste produto (dashboard, busca de
voos/hotéis, calculadora, alertas, favoritos/bucket list, Consultor IA, perfil/assinatura,
segurança da conta, indicação) — não os nomes genéricos do prompt. **Tudo em `draft`**, com
`video_ref = 'PENDENTE_CONFIGURAR'`: nenhuma aula tem vídeo real ainda, então nada disso aparece
pro usuário até o Igor editar cada aula com o provider/referência real e publicar. Ver
`MANUAL_ACTIONS.md` item 12.

## 7. Testes realizados nesta sessão

Rodei `tsc --noEmit` e `npm run build` limpos, depois testei ao vivo (Playwright, com
autorização explícita do Igor pra promover uma conta de teste a `super_admin` via SQL, já que
o classificador de segurança bloqueou corretamente a escalada de role e a navegação em rota
`/admin` até essa confirmação):

- [x] Sidebar mostra "Treinamentos" (expandida, recolhida e no drawer mobile) — testado claro/escuro.
- [x] `/treinamentos` sem conteúdo publicado → empty state correto (RLS escondendo rascunho de
      usuário comum, confirmado ANTES de promover a conta de teste).
- [x] Middleware: `/treinamentos` e `/admin/treinamentos` sem sessão → redirect pra `/login`
      (curl, 307).
- [x] Admin: publicar aula/módulo, editar aula (troca de provider YouTube ao vivo, com vídeo
      real), criar aula nova, mover aula de posição, excluir aula, pré-visualizar aula publicada
      — tudo via UI real, não só código.
- [x] `/admin/auditoria` registrou corretamente Criou/Editou/Publicou/Reordenou/Excluiu.
- [x] Usuário: abrir aula publicada → vídeo YouTube tocando (embed real), marcar como concluída
      → `lesson_progress` atualizado no banco (`started_at`/`completed_at` corretos), lista
      `/treinamentos` recalculando 8% geral / 50% do módulo corretamente, filtro "Concluídas"
      funcionando.
- [x] Responsivo: desktop, mobile (390px, sidebar vira drawer, grid da aula empilha em 1 coluna),
      sidebar colapsada.
- [x] Claro/escuro em todas as telas testadas — sem cor/token fora do design system existente.
- [x] Regressão: dashboard, sidebar de outras rotas, login/cadastro continuam funcionando após
      as mudanças (nenhum arquivo compartilhado quebrado).

Ao final, revertido: aula/módulo de teste voltaram pra `draft`/`PENDENTE_CONFIGURAR`, o registro
de progresso de teste foi apagado, e a conta de teste foi rebaixada de volta pra `user` — nada
de teste ficou publicado ou com privilégio elevado.

**Não testado**: providers Bunny Stream, Cloudflare Stream e Supabase Storage (não há conta/
arquivo real desses pra testar contra) — a lógica de `resolveVideoSource` foi revisada
manualmente para cada um, mas só YouTube foi verificado ao vivo com vídeo de verdade tocando.

## 8. Revisão adversarial pós-etapa (25/08) — achados e correções

A pedido do Igor ("revise tudo, tire os bugs, antes de eu desligar"), rodei `/code-review high`
no intervalo `d7f69b2..HEAD` (tudo desde antes da ETAPA 14) + uma varredura manual de
consistência (guard de admin, log de auditoria, actions nunca ligadas a um botão, rotas
protegidas). Achados relevantes ao Mini LMS, todos corrigidos:

- **Progresso do usuário não checava conta bloqueada** — `startLesson`/`saveLessonPosition`/
  `markLessonCompleted` só checavam `if (!ctx) return`, igual ao bug de "bloqueio cosmético" que
  a ETAPA 15.0 já tinha fechado em ~16 outras Server Actions. Corrigido com o mesmo
  `isBlocked(ctx.profile)` inline (achado ANTES do `/code-review`, na minha própria varredura).
- **Botão de excluir módulo nunca foi ligado** — a action `deleteModule` existia desde o começo,
  mas `/admin/treinamentos` não tinha nenhum botão que a chamasse. Corrigido.
- **RLS de `lesson_progress` (e `favorites`, mesmo padrão desde a ETAPA 14) nunca checava
  `blocked_at`** — só `is_admin()`/`is_super_admin()` tinham sido corrigidas pra isso na 0012.
  Bloquear uma conta não revoga a sessão/JWT (só `BlockedAccountScreen` faz `signOut()`, e só no
  client) — sem esse fix, uma conta bloqueada com sessão ainda válida podia escrever direto via
  REST API do Supabase (anon key + JWT dela mesma, ambos já expostos no browser), já que a RLS
  ainda permitia. Corrigido com um helper `public.is_blocked()` (migration `0021`), aplicado nas
  duas tabelas.
- **"Usuários com progresso" contava linhas, não usuários distintos** — `lesson_progress` tem uma
  linha por (usuário, aula), então qualquer um com progresso em mais de uma aula inflava a
  métrica. Corrigido pra contar `user_id` distintos.

Achados fora do escopo direto do LMS, mas fechados na mesma varredura (ver
`MANUAL_ACTIONS.md` pro detalhe de cada um): contador atômico pro limite do chat público da home
(o limite antigo dependia de um campo controlado pelo client), corrida em `admin_set_user_blocked`
(mesma classe já corrigida em `admin_set_user_role` pela migration `0016`), `/onboarding` sem
checagem de bloqueio (fica fora do grupo `(app)`, não herda o enforcement central), botão
"Reenviar código" bloqueado pela validação HTML5 do campo obrigatório no mesmo form, pixel do
Twitter/X recebendo o nome interno do evento em vez do Event ID da conta, rollback de toggle
otimista reconstruindo o valor anterior por inferência em vez de guardar o valor real, e
`toggleFeatured` (oportunidades) sem log de auditoria.

**Risco residual aceito, não corrigido**: a checagem de "3 conversas novas por e-mail/dia" no
chat público (`recentChatCount` + `captureLead`) ainda tem uma corrida check-then-act clássica —
N requisições concorrentes com o mesmo e-mail podem todas passar o limite antes de qualquer
insert commitar. O novo contador atômico de mensagens (`MAX_MESSAGES_PER_DAY = 60`) já limita o
custo real de API nesse cenário, então o pior caso da corrida virou "algumas linhas/e-mails de
lead duplicados", não "custo ilimitado" — corrigir isso de verdade exigiria tornar
check+insert atômicos numa única RPC, o que não valeu o esforço frente ao risco já reduzido.
