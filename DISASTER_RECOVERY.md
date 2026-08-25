# DISASTER_RECOVERY.md — Radar Milhas & Viagens

> Estratégia de recuperação de desastres: backup/restore de banco, falha de deploy, exclusão
> acidental de dados e rollback de versões. Escrito em 25/08/2026 (ETAPA 3 do Igor). Este
> documento é revisado sempre que uma mudança estrutural (nova tabela crítica, novo provider
> de pagamento, nova infra) alterar algum dos cenários abaixo.

## Princípio geral

> Nenhuma alteração crítica deve impedir a recuperação do sistema.

Na prática, isso vira três regras que já seguimos neste projeto e que continuam valendo para
todo trabalho futuro:

1. **Migrations são aditivas por padrão.** Toda migration em `supabase/migrations/` até agora
   (`0001`→`0003`) só cria tabela/coluna nova ou adiciona coluna com `default` seguro — nunca
   remove ou renomeia algo que o código em produção ainda lê. Isso é o que permite reverter um
   deploy da Vercel para uma versão de código mais antiga sem ela quebrar contra um banco mais
   novo. Uma migration de remoção só entra depois que o código parar de usar a coluna/tabela
   (mesma regra já registrada como aprendizado de outros projetos do Igor).
2. **Rollouts arriscados ficam atrás de feature flag**, não de deploy. A tabela `feature_flags`
   (criada em `0002_world_radar.sql`) já existe pra isso — desligar `worldRadar`/`bucketList`
   é uma linha de SQL, não um revert de código. Use o mesmo padrão para qualquer funcionalidade
   nova que mexa em dado sensível antes de abrir para todos os usuários.
3. **Nenhuma exclusão em massa sem confirmação e sem rastro.** Ver §4.

## 1. Backup do banco de dados (Supabase/Postgres)

O Supabase gerencia backup automático do lado da infraestrutura, mas o nível de proteção
depende do plano do projeto — isto é uma decisão de custo do Igor, não uma implementação de
código (ver checklist no final):

- **Plano Free:** sem Point-in-Time Recovery; hoje o Supabase mantém snapshots diários com
  retenção curta (poucos dias) — suficiente só para desastre percebido rapidamente. Confirmar
  a retenção exata do plano ativo em Project Settings → Database → Backups antes de contar com
  isso como estratégia principal.
- **Plano Pro (US$25/mês por projeto) ou superior:** Point-in-Time Recovery (PITR), que permite
  restaurar o banco para qualquer segundo dos últimos N dias (configurável) — é a base real de
  qualquer estratégia de "recuperar depois de exclusão acidental" (§4). **Recomendação:** migrar
  para Pro antes de abrir o app para usuários pagantes de verdade, não antes.

Além do backup gerenciado, para não depender 100% da retenção da plataforma:

- **Dump manual periódico** (recomendado: antes de cada migration nova, e mensalmente enquanto
  o app tiver poucos usuários):
  ```bash
  npx supabase login
  npx supabase link --project-ref <project-ref>
  npx supabase db dump -f backups/backup-manual.sql
  ```
  O arquivo cai em `backups/`, que já está no `.gitignore` — **um dump contém dados reais de
  usuário (e-mail, saldo de pontos, preferências) e nunca pode ser commitado**. Guarde a cópia
  em um local com controle de acesso (ex.: pasta privada no Google Drive do Igor, não em disco
  compartilhado) — decisão de onde guardar fica para o checklist manual.
- **Antes de qualquer migration que mexe em coluna/tabela existente** (não as puramente
  aditivas), rodar o dump manual acima primeiro. Migrations aditivas puras (a maioria) não
  precisam disso — o pior caso de uma migration aditiva falhar no meio é uma tabela extra
  vazia, não perda de dado.

## 2. Restauração do banco de dados

**Caminho 1 — PITR (plano Pro+, cenário normal):** Dashboard do Supabase → Database → Backups →
escolher o timestamp antes do incidente → Restore. Isso substitui o banco inteiro pelo estado
daquele momento — avaliar se vale mais a pena restaurar tudo ou só recuperar o registro
específico via o snapshot em `audit_logs` (§4), que é bem mais barato quando o problema é "um
admin excluiu 1 promoção sem querer" e não "corrupção geral do banco".

**Caminho 2 — Dump manual (`backups/*.sql`):**
```bash
npx supabase db reset --linked   # CUIDADO: isto reaplica as migrations do zero
psql "$DATABASE_URL" -f backups/backup-manual.sql
```
Usar só como último recurso (projeto sem plano Pro, sem PITR disponível) — é mais lento e mais
manual que o Caminho 1.

**Caminho 3 — Ambiente do zero (banco novo, sem backup nenhum):** replay das migrations na
ordem certa, exatamente a mesma ordem já documentada no `README.md`:
```
0001_schema.sql → seed.sql → 0002_world_radar.sql → seed_world_radar.sql →
0003_hotel_search_flexible_dates.sql
```
Isso recria a estrutura e os dados de catálogo (programas, categorias, eventos de exemplo), mas
**não recupera contas de usuário nem dados gerados em produção** — é o pior cenário, só serve
pra "recomeçar", não pra "recuperar".

## 3. Recuperação após falha de deploy (Vercel)

Toda deploy na Vercel é imutável e fica com uma URL própria — o rollback é instantâneo e não
depende de reverter commit/rebuildar:

- **Dashboard:** Deployments → escolher o deployment anterior estável → "Promote to Production".
- **CLI:** `npx vercel rollback <url-ou-deployment-id>`.

Isso só é seguro por causa da regra §"Princípio geral" #1 (migrations aditivas): como o schema
do banco nunca "anda para trás" junto com o rollback do código, uma versão de código mais antiga
continua funcionando contra o banco atual mesmo depois de várias migrations novas terem sido
aplicadas. **Nunca faça uma migration destrutiva (remover coluna/tabela) no mesmo deploy que
lança o código que para de usá-la** — espere um deploy estabilizar primeiro, remova a
coluna/tabela numa migration separada depois.

Se a falha for no build (não no runtime): a Vercel não promove um build quebrado para produção
automaticamente — a produção continua servindo o último deployment bom até alguém promover um
novo. Ou seja, falha de build não derruba o site no ar, só bloqueia a entrega da mudança nova.

## 4. Recuperação após exclusão acidental de dados

Esta era a lacuna real do projeto até esta etapa: todo botão "Excluir" do admin (oportunidades,
promoções, programas, eventos) e das áreas do usuário (alertas, carteira de pontos) apagava a
linha na hora, com um único clique, sem confirmação e sem deixar rastro — `audit_logs`
(schema já existia desde `0001_schema.sql`) nunca era escrito por nenhuma action. Corrigido
nesta etapa:

- **`ConfirmSubmitButton`** (`components/ui/confirm-submit-button.tsx`) — todo botão destrutivo
  de maior impacto agora pede confirmação nativa do navegador antes de deixar o form submeter,
  com uma mensagem específica do que vai sumir (não um genérico "tem certeza?"). Aplicado em:
  excluir oportunidade/promoção/programa/evento (admin), excluir alerta, remover programa da
  carteira de pontos.
  - **Decisão deliberada de não aplicar em toda ação:** "Remover" da Bucket List continua sem
    confirmação — é simétrico ao botão de salvar (♡/♥), refazer custa um clique, e exigir
    confirmação aí seria fricção sem ganho real de segurança (lente de UX/conversão da
    ETAPA 2). Confirmação é para o que é caro ou trabalhoso de refazer, não para todo delete.
- **`lib/audit-log.ts`** — `logAuditEvent()` grava em `audit_logs` (`user_id`, `action`,
  `entity`, `entity_id`, `metadata`) e nunca deixa uma falha de log derrubar a ação principal
  (fail-open, só loga erro no console do servidor). Ligado nas 4 exclusões do admin
  (`opportunities`, `promotions`, `loyalty_programs`, `world_events`): antes de excluir, a
  action busca a linha inteira e guarda um **snapshot completo em `metadata.deleted`** — assim,
  se algo for apagado sem querer, dá pra reconstruir manualmente pelo `audit_logs` sem precisar
  de um restore de banco inteiro.
- **Por que só o admin tem audit log e não os deletes do usuário comum:** exclusão do admin
  afeta a vitrine que **todos** os usuários veem — blast radius maior, mais difícil de perceber
  rápido, e mais caro de re-digitar (formulário inteiro de oportunidade/promoção). Exclusão do
  próprio usuário (alerta, saldo de pontos) é escopada pela RLS ao próprio dono, de baixo
  impacto e fácil de refazer — não justifica o custo de manter um histórico auditável para isso.

**Como consultar o que foi excluído:**
```sql
select action, entity, entity_id, metadata->'deleted', created_at
from audit_logs
where entity = 'opportunities'  -- ou promotions / loyalty_programs / world_events
order by created_at desc
limit 20;
```
`metadata->'deleted'` tem a linha inteira como estava antes de sumir — dá pra recriar via
`/admin/*/nova` copiando os campos, sem precisar de PITR para um único registro.

**Pendência conhecida, fora do escopo desta etapa:** a exclusão de conta do próprio usuário
(LGPD, §62 do `PROMPT.md` original) ainda não está implementada no app. Quando for construída,
ela precisa do mesmo padrão: confirmação explícita (provavelmente digitar o e-mail, não só
clicar) e algum registro de auditoria — não pode ser um DELETE direto sem rastro nenhum, dado
que é o desastre de exclusão acidental de maior impacto possível (perde a conta inteira).

## 5. Rollback de versões

- **Código:** `git` é a fonte de verdade. Nunca `--amend`/force-push em branch compartilhada
  (regra já registrada). Para desfazer um deploy ruim, use o rollback da Vercel (§3) — é mais
  rápido que reverter commit + esperar novo build.
- **Banco:** por causa da regra de migrations aditivas, **não existe "rollback de migration"**
  como conceito neste projeto — não escrevemos migration de downgrade. Se uma migration nova
  causar problema, a correção é uma migration **nova** que ajusta o que for preciso (nunca
  editar um arquivo de migration já commitado/aplicado). Isso mantém o histórico de
  `supabase/migrations/` como um log linear e auditável, igual ao `git log`.
- **Feature flags:** para qualquer funcionalidade nova que dependa de dado ainda não validado
  (o World Radar é o exemplo atual — eventos `is_mock=true`), desligar a flag é o rollback mais
  rápido que existe, mais rápido que qualquer deploy.

---

## Checklist manual (decisões e ações que só o Igor pode tomar)

- [ ] Decidir se/quando fazer upgrade do projeto Supabase para o plano Pro (PITR) antes de
      abrir para usuários pagantes reais — hoje o projeto real ainda nem foi criado (ver
      `README.md`/`MANUAL_ACTIONS.md`).
- [ ] Definir onde os dumps manuais (`backups/*.sql`) ficam guardados fora do repositório
      (Drive pessoal, cofre de senhas com storage, etc.) — nunca em disco compartilhado sem
      controle de acesso, porque contêm dado real de usuário.
- [ ] Rodar o primeiro dump manual assim que o projeto Supabase real existir e tiver os
      primeiros usuários de teste.
- [ ] Revisar a retenção de backup automático do plano atual do Supabase (Free tier muda com
      frequência — confirmar no dashboard, não assumir o que está escrito aqui).

## Custos externos envolvidos

- Supabase Pro: US$25/mês por projeto (habilita PITR) — só necessário quando o app tiver
  usuários/dado reais que valham a pena proteger além do backup diário do Free.
- Nenhum custo novo introduzido pelo código desta etapa (audit log e confirm button usam
  infraestrutura que já existia).
