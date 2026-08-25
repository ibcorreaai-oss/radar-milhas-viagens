import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminTable } from '@/components/admin-table';
import { Badge } from '@/components/ui/badge';
import { formatDateTime } from '@/lib/utils';
import type { AuditLog } from '@/lib/types';

// ETAPA 15 (ver PLATFORM_ADMIN.md item 19) — audit_logs (0001_schema.sql)
// já existia e já era escrito por toda Server Action de /admin/*
// (lib/audit-log.ts), mas não tinha nenhuma tela pra ler — só dava pra
// consultar via SQL direto. Somente leitura de propósito: a auditoria
// nunca deve ser editável pela própria UI que ela audita.
const ACTION_LABEL: Record<string, string> = {
  create: 'Criou',
  update: 'Editou',
  delete: 'Excluiu',
  role_changed: 'Alterou role',
  user_blocked: 'Bloqueou usuário',
  user_unblocked: 'Desbloqueou usuário',
  enable: 'Ativou',
  disable: 'Desativou',
  admin_login: 'Entrou no /admin-login',
};

export default async function AdminAuditoriaPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data } = await supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  const logs = (data ?? []) as AuditLog[];

  // audit_logs.user_id referencia auth.users, não public.profiles — sem FK
  // direta entre as duas tabelas, o join embutido do PostgREST
  // (`select('*, profiles(...)')`) não funciona aqui. Busca à parte e
  // mapeia em memória (mesmo padrão de app/(app)/promocoes/page.tsx pros
  // favoritos).
  const userIds = [...new Set(logs.map((l) => l.user_id).filter((id): id is string => Boolean(id)))];
  const { data: profilesData } =
    userIds.length > 0
      ? await supabase.from('profiles').select('user_id, full_name, email').in('user_id', userIds)
      : { data: [] as { user_id: string; full_name: string; email: string | null }[] };

  const profileByUserId = new Map((profilesData ?? []).map((p) => [p.user_id, p]));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Auditoria</h1>
        <p className="mt-1 text-muted-foreground">
          Últimas 200 ações administrativas registradas — quem fez o quê, quando.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Histórico administrativo</CardTitle>
          <CardDescription>Somente leitura.</CardDescription>
        </CardHeader>
        <CardContent>
          <AdminTable
            rows={logs}
            emptyTitle="Nenhuma ação registrada ainda"
            emptyDescription="Ações administrativas (excluir evento, alterar role, bloquear usuário etc.) aparecem aqui."
            columns={[
              {
                header: 'Quem',
                cell: (log) => {
                  const profile = log.user_id ? profileByUserId.get(log.user_id) : null;
                  return (
                    <div>
                      <p className="font-medium">{profile?.full_name || '—'}</p>
                      <p className="text-xs text-muted-foreground">{profile?.email ?? log.user_id ?? '—'}</p>
                    </div>
                  );
                },
              },
              {
                header: 'Ação',
                cell: (log) => <Badge variant="outline">{ACTION_LABEL[log.action] ?? log.action}</Badge>,
              },
              {
                header: 'Onde',
                cell: (log) => (
                  <span className="text-xs">
                    {log.entity ?? '—'}
                    {log.entity_id ? ` · ${log.entity_id.slice(0, 8)}…` : ''}
                  </span>
                ),
              },
              { header: 'Quando', cell: (log) => formatDateTime(log.created_at) },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  );
}
