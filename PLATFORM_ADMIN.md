# PLATFORM_ADMIN.md — Radar Milhas & Viagens

> ETAPA 15.0 do Igor ("Super Admin, Platform Admin, RBAC global e segurança administrativa").
> Escrito em 25/08/2026. Mesmo padrão de curadoria das etapas anteriores (`AUTH_AND_ADMIN.md`,
> `ENGAGEMENT_UX.md`): o prompt é um checklist genérico reaproveitado entre vários SaaS do Igor
> (menciona `organizations`/`organization_members`/roles como `doctor`/`secretaria`/`financeiro`
> que não existem aqui — são de outros produtos multi-tenant dele). Decisões abaixo, aplicadas ao
> que existe de verdade neste produto.

## 0. Por que não existe "Tenant Admin" aqui

Este produto **não é multi-tenant**. Não existe tabela `organizations`, não existe
`organization_members`, não existe conceito de "cliente com o próprio espaço isolado" — é um
clube de assinatura B2C único. O prompt pede pra distinguir "Platform Admin" de "Tenant Admin"
(`owner`/`admin` de uma organização); como não há organizações, essa distinção não se aplica.

O que existia antes desta etapa: `profiles.role` com dois valores, `'user'` e `'admin'` — e
`'admin'` já era, de fato, administrador global do único "tenant" que existe (o produto inteiro).
**super_admin entra ACIMA de admin, nunca ao lado.** Um `admin` comum continua podendo gerenciar
todo o conteúdo do produto (promoções, eventos, programas, oportunidades, feature flags) — exatamente
como antes. `super_admin` ganha, além disso, o poder de gerenciar **quem é admin** (alterar role de
outra pessoa, bloquear outro admin) — o único poder que faz sentido reservar pra um "administrador
principal" num produto de tenant único.

## 1. Onde a role está armazenada

`profiles.role`, mesma coluna de sempre (`supabase/migrations/0001_schema.sql`), agora aceitando
3 valores em vez de 2 (`supabase/migrations/0011_super_admin_rbac.sql`, constraint
`profiles_role_check`). Nenhum campo novo/duplicado — a pendência explícita do prompt ("não criar
campo duplicado se já houver sistema de roles") foi respeitada.

## 2. super_admin × admin — diferença exata

| Pode fazer | `user` | `admin` | `super_admin` |
|---|---|---|---|
| Ler/escrever os próprios dados (perfil, alertas, buscas, favoritos) | ✅ | ✅ | ✅ |
| Gerenciar conteúdo (promoções, programas, oportunidades, eventos, feature flags) | ❌ | ✅ | ✅ |
| Ver `/admin` (painel operacional) e `/admin/usuarios`, `/admin/auditoria` | ❌ | ✅ | ✅ |
| Bloquear/desbloquear um **usuário comum** | ❌ | ✅ | ✅ |
| Bloquear/desbloquear **outro admin** | ❌ | ❌ | ✅ |
| Alterar a **role** de qualquer usuário (promover/rebaixar) | ❌ | ❌ | ✅ |
| Ser bloqueado por alguém | — | por super_admin | **nunca** (bloqueado no banco) |

`public.is_admin()` (função central usada em toda RLS existente) passou a tratar `'admin'` e
`'super_admin'` como equivalentes — **nenhuma policy de RLS pré-existente precisou ser reescrita**
(exatamente o pedido de "não duplicar regras de autorização"). Só as duas ações realmente novas e
sensíveis (mudar role, bloquear admin) checam `super_admin` especificamente.

## 3. Administrador Principal — como foi configurado

`ibcorrea@hotmail.com` (conta pessoal do Igor, hoje ainda sem cadastro no produto — `auth.users`
está vazio, verificado antes de implementar) é promovido a `super_admin` por uma linha idempotente
no final da migration `0011_super_admin_rbac.sql`:

```sql
update public.profiles set role = 'super_admin'
where email = 'ibcorrea@hotmail.com' and role <> 'super_admin';
```

Rodou agora (0 linhas afetadas, porque a conta ainda não existe) e **não faz nada de errado se
rodar de novo** — é seguro reexecutar manualmente depois que a conta existir (ver §"Ação manual
necessária" abaixo). Isso não é uma exceção de frontend baseada em e-mail — é uma única linha de
dado (`UPDATE`), versionada, que só ajusta a coluna `role` já existente. Nenhuma lógica de negócio
em nenhum lugar do código faz `if (email === 'ibcorrea@hotmail.com')` — busca confirmada (ver §21
abaixo).

## 4. Por que a troca de role NÃO usa `SUPABASE_SERVICE_ROLE_KEY`

Esse projeto roda hoje **sem** a service role key configurada em `.env.local` (pendência antiga,
ver `MANUAL_ACTIONS.md`) — `/admin/metricas` já sofre disso (só funciona depois que o Igor colar a
chave). Pra não repetir essa dependência numa funcionalidade nova de segurança crítica, troca de
role e bloqueio/desbloqueio são **funções SQL `security definer`**
(`admin_set_user_role`, `admin_set_user_blocked`, `supabase/migrations/0011_super_admin_rbac.sql`),
chamadas via RPC (`supabase.rpc(...)`) com o client autenticado normal — mesmo padrão que
`is_admin()`/`handle_new_user()` já usavam desde a ETAPA 1. Uma função `security definer` roda com
o privilégio de quem a **definiu** (dono da tabela), não do chamador — por isso ela consegue
escrever em `profiles.role`, uma coluna que nem está no `GRANT` de `authenticated`
(`revoke update on public.profiles from authenticated; grant update (...) on public.profiles to
authenticated;` de `0001_schema.sql` — `role` sempre ficou de fora dessa lista, então nenhum
cliente autenticado alcança essa coluna por nenhum caminho que não seja essas funções).

## 5. Proteção contra escalada de privilégio

Três camadas independentes, não uma só:

1. **GRANT de coluna** (já existia desde a ETAPA 1) — `authenticated` nunca teve permissão de
   `UPDATE` em `profiles.role`, ponto. Nem RLS mal configurada no futuro alcançaria essa coluna.
2. **Dentro da função `admin_set_user_role`**: só executa se `is_super_admin()` for verdadeiro pra
   quem chamou (`auth.uid()`); rejeita se o alvo for o próprio chamador (`target_user_id =
   auth.uid()` → exceção); rejeita `new_role` fora do enum.
3. **Server Action** (`app/(app)/admin/usuarios/actions.ts`) chama `requireSuperAdmin()` (redireciona
   pra `/dashboard` se não for super_admin) ANTES de sequer tentar o RPC — defesa em profundidade,
   não a única barreira.

Um usuário comum manipulando o frontend/JavaScript/localStorage não tem como contornar nenhuma das
três (Cenário 7 do checklist de testes) — a barreira real está no banco (camadas 1-2), não na UI.

## 6. Nunca ficar sem super_admin

`admin_set_user_role` conta quantos `super_admin` restariam **antes** de aplicar um rebaixamento —
se o alvo é o único `super_admin` do sistema e a nova role não é `super_admin`, a função recusa
com exceção. `admin_set_user_blocked` recusa bloquear qualquer conta com role `super_admin`,
incondicionalmente (nem outro super_admin consegue bloquear um super_admin — só rebaixar, e só se
não for o último). Isso cobre o pedido do item 17 sem hardcodar o e-mail do Igor em lugar nenhum —
funciona pra "o super_admin atual", seja ele quem for, hoje ou no futuro.

## 7. Bloqueio de conta (`blocked_at`)

Não existia antes. Novo em `profiles` (`blocked_at timestamptz`, `blocked_reason text`) em vez de
usar `auth.users.banned_until` (a Admin API do Supabase pra isso também exige service role, mesmo
problema do §4).

**Revisão adversarial (`/code-review high`) achou que a primeira versão disto era só cosmética**:
bloquear atualizava a coluna e derrubava a *renderização* (`app/(app)/layout.tsx`), mas uma sessão
já aberta (cookie ainda válido) continuava passando em toda Server Action — inclusive
`admin_set_user_role`/`admin_set_user_blocked`, ou seja, um admin recém-bloqueado ainda conseguia
bloquear/desbloquear outras contas por uma aba já aberta. Corrigido em 4 camadas, nenhuma sozinha:

1. **Banco** (`is_admin()`/`is_super_admin()`, `0012_blocked_account_enforcement.sql`) — agora
   exigem `blocked_at is null`. Cobre toda policy de RLS admin-gated e as duas RPCs, mesmo se
   alguém chamar a API do Supabase direto, sem passar pelo Next.js.
2. **`lib/admin-guard.ts`** (`requireAdmin`/`requireSuperAdmin`) — checam `blocked_at` além de
   `role`. Cobre toda Server Action de `/admin/*`.
3. **Toda Server Action de conteúdo do usuário comum** (perfil, favoritos, alertas, voos, hotéis,
   assinatura, bucket-list, descobrir, consultor IA, onboarding) — mesmo predicado
   (`lib/roles.ts`), pra uma conta comum bloqueada não continuar escrevendo os próprios dados numa
   aba já aberta.
4. **No momento do login** (`signInWithPassword`, `handleLoginOtpStep`, `signInAsAdmin`, callback
   do Google — inclusive o link de recuperação de senha, que checava DEPOIS do próprio redirect
   de recovery, um jeito de contornar achado na mesma revisão) — desloga na hora e mostra o
   motivo, melhor UX, não a barreira real.
5. **`app/(app)/layout.tsx`** — a tela de "conta suspensa" continua existindo, mas agora só de UX:
   o `signOut()` de dentro de um Server Component é descartado em silêncio pelo adaptador de
   cookies (não pode escrever cookie fora de Server Action/Route Handler) — corrigido derrubando a
   sessão via `components/blocked-account-screen.tsx` (client, mesmo mecanismo que já funciona no
   logout normal do app).
6. **`middleware.ts`** (rotas `/admin/*`) — barreira extra específica, usando o mesmo predicado
   central de `lib/roles.ts`.

`lib/auth-block.ts` (usado nos pontos de login) também foi corrigido pra **falhar fechado**: se a
query de status da conta der erro, antes retornava "não bloqueado" (fail-open); agora retorna
`'unknown'` e nega o login com uma mensagem de "tente de novo", nunca deixa passar por incerteza.

### 7.1 Outros achados da mesma revisão (menores, também corrigidos)

- O predicado "isso conta como admin" estava reescrito à mão em 4 arquivos (a causa raiz de vários
  dos itens acima) — centralizado em `lib/roles.ts` (`isAdminRole`, `isBlocked`).
- Busca de `/admin/usuarios` interpolava o termo cru num filtro `.or()` do PostgREST — vírgula/
  parêntese no termo eram interpretados como estrutura de outra cláusula (injeção de filtro).
  Sanitizado removendo esses caracteres antes de montar a query.
- A mesma página buscava a tabela `subscriptions` inteira só pra resolver o plano das (no máximo)
  100 linhas exibidas — trocado por `.in('user_id', ...)` com os ids já carregados.
- Botão "Desbloquear" aparecia mesmo quando o RPC ia recusar (admin comum vendo um alvo admin) —
  agora usa o mesmo critério `canManageBlockState` que já gatava o botão "Bloquear".

## 8. Rotas e APIs protegidas

- `/admin/usuarios` (novo) — `requireAdmin()` na página; ações de troca de role exigem
  `requireSuperAdmin()`; bloqueio exige `requireAdmin()` (a função SQL decide se pode bloquear
  aquele alvo específico).
- `/admin/auditoria` (novo) — `requireAdmin()`, somente leitura.
- Todas as 12 páginas `/admin/*` pré-existentes (eventos, promoções, programas, oportunidades,
  métricas, funcionalidades) — **corrigidas nesta etapa**: cada uma tinha um `if
  (ctx?.profile?.role !== 'admin')` copiado à mão, o que bloquearia o super_admin de acessar
  QUALQUER painel admin existente (`'super_admin' !== 'admin'` é verdadeiro). Trocado por
  `await requireAdmin()` — centraliza a checagem (pedido explícito do item 7) e corrige o bug de
  quebra ao mesmo tempo.
- `middleware.ts` — `ADMIN_PREFIXES` agora aceita `admin` OU `super_admin`, e bloqueia conta
  suspensa antes mesmo de renderizar.

## 9. Como funciona `/admin`

Continua sendo o único painel administrativo global (não existe painel por tenant, ver §0). Hub
com estatísticas + atalhos, agora incluindo **Usuários** e **Auditoria**. O sidebar
(`components/app-sidebar.tsx`) já mostrava o item "Admin" só pra quem tem role admin — atualizado
pra incluir `super_admin`.

## 10. Auditoria

`audit_logs` (tabela e `lib/audit-log.ts`) já existiam desde a ETAPA 1, mas **nunca tinham tela pra
ler** — só SQL direto. `/admin/auditoria` (novo, somente leitura) fecha essa lacuna. Novas ações
registradas: `role_changed`, `user_blocked`, `user_unblocked` (metadata sem senha/token/segredo,
só `new_role`/`reason`) — respeitando a lista de exemplos do prompt e a proibição explícita de
logar dado sensível.

## 11. O que foi deliberadamente NÃO implementado nesta etapa (e por quê)

- **Organizações/Assinaturas com CRUD completo pro super_admin.** Este produto não tem
  organizações (§0). Assinatura (Stripe) já tem uma visão agregada em `/admin/metricas`
  (crescimento/conversão/churn) — um CRUD de assinatura individual por usuário seria uma etapa
  própria de "operação de billing", fora do escopo de "configurar RBAC e o Administrador
  Principal" desta etapa.
- **MFA/2FA/passkeys.** O prompt pede pra "considerar quando o provedor suportar" — Supabase Auth
  suporta TOTP nativamente, mas implementar enrollment + challenge de login é uma feature própria,
  substancial o bastante pra merecer sua própria etapa (evita meio-implementar algo que trava o
  próprio Igor fora da conta se um passo do fluxo falhar). Fica registrado como próximo passo
  recomendado especificamente para a conta do super_admin.
- **Script `scripts/bootstrap-super-admin.ts`.** Este projeto não tem infraestrutura de scripts
  Node standalone (sem `ts-node`/runner configurado) e já tinha um precedente idêntico e testado
  pro primeiro `admin` (`README.md`: `update profiles set role='admin' where user_id='<uuid>';`
  direto no SQL Editor, "só assim, nunca via app"). Segui o mesmo precedente pro super_admin em vez
  de introduzir uma ferramenta nova só pra isso — ver §"Ação manual necessária".

## 12. Auditoria de backdoor (item 21)

Buscado no projeto inteiro por `email ===`, `isAdmin = true`, `adminOverride`, `bypassAuth`,
`disableRLS`, `skipAuthorization`, e por qualquer lógica condicionada a `NODE_ENV` que libere
acesso administrativo — **nenhuma ocorrência real encontrada** (só uma menção legítima e já
documentada de `service_role` bypassando RLS de propósito em cron/webhook/métricas, existente
desde antes desta etapa). O e-mail `ibcorrea@hotmail.com` aparece em exatamente um lugar no
projeto inteiro: a linha de seed idempotente da migration (§3) — não em nenhuma lógica de
autorização.

---

## Checklist final (respondendo item 24 do prompt)

- **Como o Super Admin foi implementado**: coluna `profiles.role` ganhou o valor `super_admin`;
  `is_admin()` passou a tratar `admin`/`super_admin` como equivalentes; duas funções SQL novas
  (`admin_set_user_role`, `admin_set_user_blocked`) concentram as duas ações exclusivas do
  Administrador Principal.
- **Onde a role está armazenada**: `public.profiles.role` (mesma coluna de sempre).
- **Como super_admin difere de owner/admin**: não existe `owner` neste produto (não é
  multi-tenant); `admin` continua gerenciando todo o conteúdo; `super_admin` acrescenta gestão de
  usuários/roles/bloqueio de outros admins.
- **Migrations criadas**: `0011_super_admin_rbac.sql`.
- **Políticas RLS criadas/alteradas**: nenhuma policy de RLS foi alterada — só a função
  `is_admin()` (usada por toda policy existente) e duas funções novas. `is_super_admin()` fica
  revogada de RPC direto (só usada internamente).
- **Funções de autorização criadas**: `requireAdmin()` (existia, agora cobre super_admin também) e
  `requireSuperAdmin()` (nova), ambas em `lib/admin-guard.ts`; `isAccountBlocked()`/
  `blockedMessage()` em `lib/auth-block.ts`.
- **Rotas administrativas protegidas**: todas as 14 já existentes + `/admin/usuarios` e
  `/admin/auditoria` (novas) — ver §8.
- **APIs protegidas**: as 3 Server Actions de `admin/usuarios/actions.ts` (`requireAdmin`/
  `requireSuperAdmin`), mais as funções SQL que recusam por conta própria mesmo se alguém chamasse
  o RPC direto sem passar pela Server Action.
- **Como funciona `/admin`**: painel único global (sem separação platform/tenant, não existe
  tenant) — ver §9.
- **Como funciona a auditoria**: `/admin/auditoria`, somente leitura, `audit_logs` já existente.
- **Como é impedida escalada de privilégio**: GRANT de coluna + validação na função SQL +
  `requireSuperAdmin()` na Server Action — ver §5.
- **Como é protegida a conta principal**: nunca pode ser bloqueada; não pode ser rebaixada se for
  o último super_admin — ver §6.
- **Script de bootstrap**: não criado (ver §11) — usa o mesmo precedente de SQL direto já
  documentado no README para o primeiro admin.
- **SQL manual necessário**: sim, ver "Ação manual necessária" abaixo.
- **Preciso cadastrar `ibcorrea@hotmail.com` antes?**: sim — a conta ainda não existe
  (`auth.users` vazio nesta sessão).
- **Variável de `.env` nova**: nenhuma.
- **Configuração no Supabase**: nenhuma além da migration já aplicada.
- **Ação manual antes do deploy**: nenhuma além do SQL de promoção (ver abaixo).
- **Arquivos modificados/criados**: ver commit desta etapa.
- **Testes executados**: `tsc --noEmit`, `next build`, smoke test de todas as rotas novas/tocadas
  (`curl`, sem 500/erro), testes ao vivo com Playwright cobrindo os cenários 3, 5, 7 e 9 do
  checklist do prompt (os únicos executáveis sem uma conta admin/super_admin real já confirmada —
  ver `MANUAL_ACTIONS.md` sobre o bloqueio de SMTP que impede criar essa conta de teste nesta
  sessão), e revisão adversarial (`/code-review high`) — achou o gap de enforcement descrito no §7
  mais 4 problemas menores, todos corrigidos antes deste commit.
- **Resultado do build de produção**: limpo (ver commit).

## Ação manual necessária (Igor)

1. Criar a própria conta em `/cadastro` (ou `/login` com Google) usando **ibcorrea@hotmail.com** —
   sem isso não existe linha em `profiles` pra promover.
2. Depois de criar a conta, rodar no SQL Editor do Supabase (mesmo processo já usado pro primeiro
   admin, `README.md` item 1):
   ```sql
   update public.profiles set role = 'super_admin' where email = 'ibcorrea@hotmail.com';
   ```
   (Se a conta já existir ANTES de rodar `0011_super_admin_rbac.sql` — o que não é o caso agora,
   `auth.users` está vazio — a migration já teria promovido sozinha, sem precisar deste passo.)
