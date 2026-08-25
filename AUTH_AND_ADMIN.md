# AUTH_AND_ADMIN.md — Radar Milhas & Viagens

> ETAPA 14 do Igor ("Autenticação, Supabase e usuários"). Escrito em 25/08/2026. Mesmo padrão de
> curadoria de `ENGAGEMENT_UX.md`: o prompt é um checklist genérico reaproveitado entre vários
> SaaS do Igor (o item "Create Recipe" com upload de imagem/vídeo é resíduo literal de outro
> app — este produto não tem receitas). Decisões abaixo, aplicadas ao que existe de verdade.

## 1. Decisão de arquitetura: Stack Auth × Supabase Auth × OTP

O próprio prompt autoriza explicitamente: *"se houver conflito, escolha a arquitetura mais
segura, simples, estável e compatível com o projeto, sem criar autenticações duplicadas ou
conflitantes."* Há conflito real, e a decisão é:

**Fica só Supabase Auth. Stack Auth NÃO entra.**

Por quê: o app inteiro já é construído em cima de Supabase Auth — toda política de RLS em
`supabase/migrations/0001-0008` usa `auth.uid()`/`auth.role()` do Postgres do próprio Supabase
(perfis, alertas, buscas, bucket list, favoritos, tudo). `Stack Auth` é um provedor de identidade
*separado* (hoje associado ao ecossistema Neon) — ele não emite o JWT que o Postgres do Supabase
entende nativamente. Colocar os dois juntos exigiria: (a) reescrever toda política de RLS pra
validar um JWT externo via `custom_access_token_hook`, OU (b) manter dois cadastros de usuário
sincronizados por webhook — exatamente a "autenticação duplicada/conflitante" que o próprio
prompt pede pra evitar, por zero ganho real (Supabase Auth já cobre 100% do que foi pedido:
e-mail/senha, OTP, OAuth, confirmação de e-mail, recuperação de senha, RLS nativa). Se um dia o
banco de dados deste produto deixar de ser Supabase, essa decisão é revisada — hoje não faz
sentido.

**OTP entra, nativo do Supabase Auth** (`signInWithOtp` + `verifyOtp`, código de 6 dígitos por
e-mail) — zero infraestrutura nova, mesmo mailer que já existe.

### Onde o OTP se encaixa (curadoria, não é tudo-ou-nada)

- **`/cadastro` (conta nova): só OTP.** Sem campo de senha. Nome + e-mail → código de 6 dígitos
  → verificado → conta criada (o trigger `handle_new_user` já dispara igual, independente de
  como o usuário entrou em `auth.users`). Verificar o código já confirma o e-mail — não existe
  "link de confirmação" solto que possa se perder ou "conta pendente" travada esperando clique.
- **`/login` (conta existente): OTP por padrão + senha como alternativa, na mesma tela.** Não
  removi `signInWithPassword` (código estável, testado, e o login de **admin** precisa dele de
  qualquer forma — ver §3). Um usuário que nunca definiu senha simplesmente não vê motivo pra
  usar a aba "Senha"; um usuário que definiu (via `/perfil`, ver §2) ganha uma segunda porta de
  entrada — útil especialmente enquanto o SMTP próprio não está configurado (ver `MANUAL_ACTIONS.md`
  item 8): se o e-mail de OTP atrasar/falhar, a senha continua funcionando. Framework "Google" já
  existente (`signInWithOAuth`) continua do jeito que estava, sem mudança.
- **`/admin-login` (NOVO, só admin): senha, sem OTP** — pedido explícito do Igor ("campo de
  e-mail, campo de senha, botão Entrar como administrador"). Ver §3 pro motivo de ser uma rota
  separada de verdade, não só uma flag na tela de login comum.
- **Perfil (`/perfil`): pode definir/alterar senha** (opcional) — é o mecanismo pelo qual um
  usuário comum ganha a segunda porta de entrada citada acima, e é como um admin recém-promovido
  (via SQL, mesmo processo de sempre) define a senha que vai usar em `/admin-login`.

### O que isso NÃO muda

- `handle_new_user`, `profiles`, RLS de `profiles` — nada mudou no schema (ver §4).
- Sessão continua em cookie via `@supabase/ssr` (não `localStorage` — ver §5, é estritamente
  melhor pro que foi pedido).
- Confirmação de e-mail — ver §6.

## 2. Perfil do usuário

Já existia (`/perfil`, `lib/auth.ts`, `profiles`), mas só mostrava preferências de viagem
(aeroporto, orçamento, programas de pontos) — **sem nome/e-mail visíveis e sem seção de senha**,
exatamente os dois itens que o Igor pediu. Adicionado:

- Card "Conta" no topo de `/perfil`: e-mail (somente leitura — trocar e-mail exige reconfirmação
  e está fora do escopo pedido; se o Igor quiser isso depois é uma etapa própria), nome (reusa o
  campo que já existia no form de preferências, só reorganizado visualmente), e seção de senha
  ("Definir senha" se `user.app_metadata` não tem o provider `email` configurado com senha, texto
  muda pra "Alterar senha" caso já tenha — heurística simples: sempre mostro os dois campos,
  copy muda conforme o estado).
- Nova Server Action `updateOwnPassword` (`app/(app)/perfil/actions.ts`) — não reaproveitei a
  `updatePassword` de `app/auth/redefinir/actions.ts` porque o pós-condição é diferente (recuperação
  desloga e força novo login; aqui a pessoa continua logada e só volta pro próprio `/perfil`) — a
  parte que de fato repetiria (2 linhas: validar senha + `supabase.auth.updateUser`) não
  justificava uma abstração nova compartilhada.

## 3. Login de administrador — por que é uma rota própria

`/admin-login` é uma página nova, fora do grupo `(auth)` de rotas de usuário comum (mas com o
mesmo layout visual). Não é só estética:

- Nunca cria conta nova (sem link "criar conta") — admin é promovido via SQL, nunca se
  autocadastra (mesma regra de segurança que já existia: `role` não pode ser autopromovido, ver
  `grant update` em `0001_schema.sql`).
- Depois de autenticar com sucesso via `signInWithPassword`, checa `profiles.role === 'admin'`
  ANTES de redirecionar — se não for admin, desloga na hora (`supabase.auth.signOut()`) e mostra
  "Esta conta não tem acesso de administrador", em vez de deixar qualquer usuário comum logar
  aqui e simplesmente cair no dashboard normal (o que seria confuso: por que uma tela que diz
  "Entrar como administrador" te loga como usuário comum?).
- Link "Esqueci minha senha" desta tela usa o MESMO fluxo de recuperação já existente
  (`/recuperar-senha` → e-mail → `/auth/redefinir`) — sem duplicar lógica de recuperação.

**"Quando o admin faz login, ele tem uma opção pra editar o que quiser"** — já existia: o
sidebar (`components/app-sidebar.tsx`) só mostra o item "Admin" quando `isAdmin`, apontando pra
`/admin`, que já lista atalhos pra gerenciar promoções/programas/oportunidades/eventos/métricas.
Nenhuma mudança necessária aí, só confirmado que funciona.

## 4. "Crie uma página pro admin adicionar novas funcionalidades"

Curadoria: este app não tem um conceito genérico de "funcionalidade" plugável — o equivalente
real mais próximo é a tabela `feature_flags` (`worldRadar`, `bucketList`, `achievementsPanel`
etc.), que **já existe desde a ETAPA 3.0** mas só podia ser alterada via SQL direto (pendência
registrada em `MANUAL_ACTIONS.md` desde então: *"não há UI de toggle ainda"*). Fechei essa
lacuna: `/admin/funcionalidades` — lista todas as flags com descrição e um switch on/off, escreve
na tabela via Server Action com `requireAdmin()`. Isso é literalmente "adicionar/tirar
funcionalidades do app" pra este produto específico, sem inventar um CRUD de plugins que não
existe em lugar nenhum do domínio.

## 5. Upload de imagem pro Supabase Storage

O pedido original fala de "Create Recipe" (não existe aqui) com upload de imagem/vídeo/documento.
Vasculhei todos os formulários de admin: o único campo de mídia real do produto é
`world_events.cover_image_url` (`/admin/eventos`), hoje um `<input type="url">` — o admin colava
um link (Unsplash/Wikimedia/etc.). Não existe upload de vídeo ou documento em lugar nenhum do
domínio (nenhuma tabela tem coluna pra isso) — não inventei um.

Implementado: bucket novo `event-media` no Supabase Storage (leitura pública — as imagens
aparecem pra qualquer visitante em `/descobrir`; escrita só admin), componente
`components/admin/image-upload-field.tsx` que faz upload direto do browser
(`supabase.storage.from('event-media').upload(...)`) e preenche o campo com a URL pública — sem
passar por Server Action (arquivo binário via FormData de Server Action tem limite de tamanho
mais baixo por padrão no Next). O campo de URL manual continua existindo ao lado (colar link
ainda funciona, pra fontes externas que o admin já usava).

## 6. Confirmação de e-mail

Já era esperado que estivesse ligada no projeto (é o motivo do bug de rate limit documentado em
`MANUAL_ACTIONS.md` item 6/8 — só existe confirmação pra rejeitar se a opção estiver ativa).
Com OTP, a própria verificação do código de 6 dígitos **é** a confirmação — não sobra nenhum
"link de confirmação" separado pra `/cadastro`. Nada a mudar no dashboard além do que já estava.

## 7. "Salvar dados do usuário no localStorage pra manter logado"

Não implementado literalmente — e é proposital. `@supabase/ssr` (`lib/supabase/client.ts` e
`server.ts`) já persiste a sessão em **cookie**, não em `localStorage`. Isso é estritamente melhor
pro objetivo pedido ("continuar logado ao atualizar a página"): cookie funciona com Server
Components e com o `middleware.ts` que decide `PROTECTED_PREFIXES` no servidor, ANTES da página
renderizar — com `localStorage` isso não seria possível (o servidor não lê `localStorage`), o
middleware não saberia quem está logado, e cada rota protegida precisaria de uma checagem
client-side depois de já ter renderizado (pior UX: flash de conteúdo, ou de redirecionamento).
`localStorage` seria uma regressão aqui, não uma melhoria — mantido como está.

## 8. Favoritos (página nova)

Este produto já tem duas listas pessoais com propósitos diferentes: `alertas` (critério de busca
recorrente) e `bucket-list` (desejo de viagem futura, World Radar). "Favoritos" pedido na ETAPA 14
é um terceiro conceito, mais simples: **guardar rapidamente uma promoção ou programa de fidelidade
pra achar de novo depois**, sem duplicar nem o alerta nem o bucket-list. Tabela nova `favorites`
(`user_id`, `item_type` em `'promotion' | 'loyalty_program'`, `item_id`), RLS só-dono. Botão de
coração em `PromotionCard` e na listagem de `/programas` (só aparece logado); `/favoritos` lista
os dois tipos agrupados.

## 9. Auditoria de permissões (revisão, não reconstrução)

Já checado nesta sessão contra o schema real:
- Toda tabela de conteúdo do admin (`loyalty_programs`, `promotions`, `opportunities`,
  `world_events`, `sources`, `destinations`, `event_categories`) já tem `insert`/`update`/`delete`
  restritos a `public.is_admin()` — usuário comum nunca escreve nelas, só lê.
- `profiles.role` não pode ser autopromovido (`grant update` explícito exclui a coluna) — auditado
  de novo, continua correto.
- `middleware.ts` já separa `PROTECTED_PREFIXES` (exige sessão) de rotas públicas, e
  `ADMIN_PREFIXES` (exige `role='admin'`) — `/favoritos` e `/admin/funcionalidades` adicionados
  às listas certas.
- `requireAdmin()` (`lib/admin-guard.ts`) já é chamado no topo de toda Server Action de
  `/admin/*` — reaproveitado nas duas novas (`/admin/funcionalidades`, upload de imagem).

## 10. Testes ao vivo — mesmo bloqueio já documentado

Sem SMTP próprio configurado (`MANUAL_ACTIONS.md` item 8), enviar OTP por e-mail esbarra no
mesmo `email rate limit exceeded` do mailer padrão do Supabase — **não é bug novo desta etapa**,
é o mesmo limite que já bloqueava confirmação de cadastro por senha. Troquei senha por OTP no
cadastro, mas o gargalo de entrega de e-mail continua sendo o SMTP, não o método de autenticação.
Testado ao vivo o que dá pra testar sem depender de e-mail: renderização de todas as telas novas,
validação client-side dos formulários, redirecionamentos do middleware pra rota protegida sem
sessão, rejeição de `/admin-login` sem sessão válida. O fluxo completo de "pedir código → receber
e-mail → digitar código → entrar" só pode ser validado de ponta a ponta depois que o Igor
configurar o SMTP.

**Bug real achado testando ao vivo (não pelo build):** `/admin-login` caía dentro do prefixo
protegido `/admin` do `middleware.ts` porque a checagem usava `pathname.startsWith(p)` —
`"/admin-login".startsWith("/admin")` é `true`, então a página pública de login de admin
redirecionava sozinha pro `/login` normal. Corrigido com um matcher que exige `/` ou fim de
string depois do prefixo (`matchesPrefix`).

## 11. Revisão adversarial (`/code-review high`, antes do commit)

Rodei revisão adversarial no diff inteiro desta etapa antes de fechar. Achou 10 problemas reais,
todos corrigidos:

- **Enumeração de conta no login por OTP** (mais grave) — a tela mostrava "não encontramos uma
  conta com este e-mail" só quando a conta não existia, permitindo descobrir e-mails cadastrados
  testando um por um. Corrigido: mesma mensagem genérica ("se existir uma conta... enviamos um
  código") independente do e-mail existir ou não — mesmo princípio que `signInWithPassword` já
  seguia com "e-mail ou senha incorretos".
- `toggleFeatureFlag` não gravava em `audit_logs` como toda outra Server Action de admin —
  adicionado.
- `PromotionCard` no dashboard não recebia `isFavorited` (só em `/promocoes`) — estrela de
  favorito não aparecia lá; corrigido buscando os favoritos em paralelo com o resto do dashboard.
- `/auth/redefinir` validava senha só com `length < 8`, sem o teto de 72 do `passwordSchema`
  usado em `/perfil` — duas regras diferentes pra senha da mesma conta. Unificado.
- `favorites.item_id` não tinha limpeza ao excluir a promoção/programa referenciado — ficava
  órfão pra sempre. Adicionado trigger de limpeza (`0010_favorites_cleanup_triggers.sql`).
- Código OTP com espaço/traço interno (comum em clientes de e-mail) era rejeitado mesmo copiado
  exatamente como exibido — saneamento adicionado no schema E no input (`components/otp-code-input.tsx`,
  usado pelas duas telas).
- Upload de nova imagem de capa nunca apagava a antiga do Storage — acumulava lixo público
  indefinidamente. Corrigido: apaga a anterior (só se for do nosso próprio bucket) ao trocar.
- Leitura de `onboarding_done` após confirmar OTP de cadastro ignorava erro de query (falha
  transiente virava "conta nova"); e reenviava e-mail de boas-vindas toda vez que alguém
  reentrasse o e-mail em `/cadastro`, não só na criação de verdade. Corrigido com checagem de
  erro explícita + `auth.users.created_at` recente como sinal de "é mesmo conta nova".
- Padrão de toggle otimista (estado local + desfaz em erro + toast) estava copiado igual entre
  `FavoriteButton` e `FeatureFlagRow` — extraído pra `lib/use-optimistic-toggle.ts`.
