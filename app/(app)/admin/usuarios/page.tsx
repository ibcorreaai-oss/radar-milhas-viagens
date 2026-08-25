import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminTable } from '@/components/admin-table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
import { UserRowActions } from './user-row-actions';
import type { Profile, PlanId } from '@/lib/types';

const ROLE_LABEL: Record<Profile['role'], string> = {
  user: 'Usuário',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

const ROLE_BADGE: Record<Profile['role'], 'secondary' | 'default' | 'success'> = {
  user: 'secondary',
  admin: 'default',
  super_admin: 'success',
};

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const ctx = await requireAdmin();
  const isSuperAdmin = ctx.profile?.role === 'super_admin';

  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (q?.trim()) {
    // Achado em revisão adversarial: interpolar o termo cru no filtro
    // `.or()` do PostgREST permite injeção — uma vírgula ou parêntese no
    // termo é interpretado como separador/estrutura de outra cláusula de
    // filtro, não como texto literal. Remove os metacaracteres do PostgREST
    // antes de montar a string (perda aceitável: buscar por vírgula/parêntese
    // literal no nome não é um caso de uso real aqui).
    const term = q.trim().replace(/[,()]/g, '');
    if (term) {
      query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
    }
  }

  const { data } = await query;
  const profiles = (data ?? []) as Profile[];

  // Plano é dado sensível (ver app/(app)/admin/metricas/page.tsx) — RLS de
  // `subscriptions` de propósito não libera admin, só o dono. Melhor
  // esforço via service_role: se a chave ainda não estiver configurada
  // (ver MANUAL_ACTIONS.md), a coluna "Plano" mostra "—" em vez de quebrar
  // a página inteira.
  let planByUserId = new Map<string, PlanId>();
  if (profiles.length > 0) {
    try {
      const admin = createAdminClient();
      // Só os planos de quem está na página atual (achado em revisão
      // adversarial: buscar a tabela inteira aqui não escala — a lista já
      // é limitada a 100 linhas, não faz sentido a query de plano não ser).
      const { data: subs } = await admin
        .from('subscriptions')
        .select('user_id, plan')
        .in('user_id', profiles.map((p) => p.user_id));
      planByUserId = new Map((subs ?? []).map((s) => [s.user_id as string, s.plan as PlanId]));
    } catch {
      // Sem SUPABASE_SERVICE_ROLE_KEY — degrada graciosamente (ver acima).
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
        <p className="mt-1 text-muted-foreground">
          Administração global de contas do clube — visualizar, pesquisar
          {isSuperAdmin ? ', alterar permissões e' : ' e'} bloquear/desbloquear.
        </p>
      </div>

      <form className="flex max-w-md gap-2" action="/admin/usuarios">
        <Input name="q" defaultValue={q ?? ''} placeholder="Buscar por nome ou e-mail..." />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>{profiles.length} usuário(s)</CardTitle>
          <CardDescription>
            {q ? `Resultados para "${q}".` : 'Mais recentes primeiro, limitado a 100 por página.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AdminTable
            rows={profiles}
            emptyTitle="Nenhum usuário encontrado"
            emptyDescription={q ? 'Tente outro termo de busca.' : undefined}
            columns={[
              {
                header: 'Nome',
                cell: (p) => (
                  <div>
                    <p className="font-medium">{p.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{p.email ?? '—'}</p>
                  </div>
                ),
              },
              { header: 'Role', cell: (p) => <Badge variant={ROLE_BADGE[p.role]}>{ROLE_LABEL[p.role]}</Badge> },
              { header: 'Plano', cell: (p) => planByUserId.get(p.user_id) ?? '—' },
              {
                header: 'Status',
                cell: (p) =>
                  p.blocked_at ? (
                    <Badge variant="destructive" title={p.blocked_reason ?? undefined}>
                      Bloqueado
                    </Badge>
                  ) : (
                    <Badge variant="success">Ativo</Badge>
                  ),
              },
              { header: 'Cadastrado em', cell: (p) => formatDateTime(p.created_at) },
            ]}
            actions={(p) => (
              <UserRowActions
                profile={p}
                isSuperAdmin={isSuperAdmin}
                isSelf={p.user_id === ctx?.userId}
              />
            )}
          />
        </CardContent>
      </Card>
    </div>
  );
}
