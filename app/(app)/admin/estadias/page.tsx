import Link from 'next/link';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { AdminTable } from '@/components/admin-table';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { cn } from '@/lib/utils';
import { STAY_CATEGORY_LABEL, VERIFICATION_STATUS_LABEL } from '@/lib/types';
import { deleteStay } from './actions';
import type { Stay, VerificationStatus, Destination } from '@/lib/types';

const VERIFICATION_BADGE_VARIANT: Record<VerificationStatus, 'success' | 'default' | 'secondary' | 'destructive' | 'outline'> = {
  verified: 'success',
  unverified: 'secondary',
  estimated: 'default',
  stale: 'destructive',
  mock: 'outline',
};

type StayRow = Stay & { destinations: Pick<Destination, 'city' | 'country'> | null };

export default async function AdminEstadiasPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data } = await supabase
    .from('stays')
    .select('*, destinations(city, country)')
    .order('featured', { ascending: false })
    .order('stay_score', { ascending: false });

  const stays = (data ?? []) as StayRow[];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Estadias (Stay Experience)</h1>
          <p className="mt-1 text-muted-foreground">Gerencie as hospedagens exibidas em /estadias.</p>
        </div>
        <Link href="/admin/estadias/nova" className={cn(buttonVariants({ variant: 'default' }))}>
          <Plus className="h-4 w-4" />
          Nova hospedagem
        </Link>
      </div>

      <AdminTable
        rows={stays}
        emptyTitle="Nenhuma hospedagem cadastrada"
        emptyDescription="Crie a primeira hospedagem para alimentar o Stay Experience Radar."
        columns={[
          {
            header: 'Nome',
            cell: (s) => (
              <div>
                <span className="font-medium">{s.name}</span>
                {s.is_mock && <span className="ml-2 text-xs text-muted-foreground">(exemplo)</span>}
              </div>
            ),
          },
          { header: 'Categoria', cell: (s) => STAY_CATEGORY_LABEL[s.category] },
          { header: 'Destino', cell: (s) => (s.destinations ? `${s.destinations.city}, ${s.destinations.country}` : '—') },
          {
            header: 'Verificação',
            cell: (s) => <Badge variant={VERIFICATION_BADGE_VARIANT[s.verification_status]}>{VERIFICATION_STATUS_LABEL[s.verification_status]}</Badge>,
          },
          { header: 'Score', cell: (s) => `${s.stay_score}/100` },
          { header: 'Ativa', cell: (s) => (s.active ? 'Sim' : 'Não') },
        ]}
        actions={(s) => (
          <div className="flex justify-end gap-2">
            <Link href={`/admin/estadias/${s.id}/editar`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Link>
            <form action={deleteStay.bind(null, s.id)}>
              <ConfirmSubmitButton
                variant="destructive"
                size="sm"
                confirmMessage={`Excluir a hospedagem "${s.name}"? Ela some de /estadias imediatamente — fica registrada em audit_logs, mas não tem desfazer no app.`}
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
