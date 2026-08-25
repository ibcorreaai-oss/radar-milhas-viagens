import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminTable } from '@/components/admin-table';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { cn, formatBRL } from '@/lib/utils';
import { deleteLoyaltyProgram } from './actions';
import type { LoyaltyProgram, LoyaltyProgramType } from '@/lib/types';

const TYPE_LABEL: Record<LoyaltyProgramType, string> = {
  banco: 'Banco',
  companhia_aerea: 'Companhia aérea',
  hotel: 'Hotel',
  coalizao: 'Coalizão',
};

export default async function AdminProgramasPage() {
  const ctx = await getUserContext();
  if (ctx?.profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data } = await supabase.from('loyalty_programs').select('*').order('name');
  const programs = (data ?? []) as LoyaltyProgram[];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Programas de fidelidade</h1>
          <p className="mt-1 text-muted-foreground">Catálogo de programas usado nos cálculos de score.</p>
        </div>
        <Link href="/admin/programas/nova" className={cn(buttonVariants({ variant: 'default' }))}>
          <Plus className="h-4 w-4" />
          Novo programa
        </Link>
      </div>

      <AdminTable
        rows={programs}
        emptyTitle="Nenhum programa cadastrado"
        emptyDescription="Cadastre o primeiro programa de fidelidade para alimentar o motor de score."
        columns={[
          { header: 'Nome', cell: (p) => <span className="font-medium">{p.name}</span> },
          { header: 'Tipo', cell: (p) => TYPE_LABEL[p.type] },
          { header: 'País', cell: (p) => p.country },
          { header: 'Milheiro médio', cell: (p) => formatBRL(p.average_mile_value) },
          {
            header: 'Status',
            cell: (p) => <Badge variant={p.active ? 'success' : 'secondary'}>{p.active ? 'Ativo' : 'Inativo'}</Badge>,
          },
        ]}
        actions={(p) => (
          <div className="flex justify-end gap-2">
            <Link
              href={`/admin/programas/${p.id}/editar`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Link>
            <form action={deleteLoyaltyProgram.bind(null, p.id)}>
              <ConfirmSubmitButton
                variant="destructive"
                size="sm"
                confirmMessage={`Excluir o programa "${p.name}"? Se algum usuário já cadastrou saldo desse programa na carteira de pontos, a exclusão pode falhar ou deixar esse saldo órfão. Fica registrado em audit_logs, mas não tem desfazer no app.`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </ConfirmSubmitButton>
            </form>
          </div>
        )}
      />
    </div>
  );
}
