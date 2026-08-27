import Link from 'next/link';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { AdminTable } from '@/components/admin-table';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { cn } from '@/lib/utils';
import { CRUISE_CATEGORY_LABEL, VERIFICATION_STATUS_LABEL } from '@/lib/types';
import { deleteCruise } from './actions';
import type { Cruise, VerificationStatus, Destination } from '@/lib/types';

const VERIFICATION_BADGE_VARIANT: Record<VerificationStatus, 'success' | 'default' | 'secondary' | 'destructive' | 'outline'> = {
  verified: 'success',
  unverified: 'secondary',
  estimated: 'default',
  stale: 'destructive',
  mock: 'outline',
};

type CruiseRow = Cruise & { destinations: Pick<Destination, 'city' | 'country'> | null };

export default async function AdminCruzeirosPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data } = await supabase
    .from('cruises')
    .select('*, destinations:embarkation_destination_id(city, country)')
    .order('featured', { ascending: false })
    .order('cruise_score', { ascending: false });

  const cruises = (data ?? []) as CruiseRow[];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cruzeiros (Cruise Radar)</h1>
          <p className="mt-1 text-muted-foreground">Gerencie os cruzeiros exibidos em /cruzeiros.</p>
        </div>
        <Link href="/admin/cruzeiros/novo" className={cn(buttonVariants({ variant: 'default' }))}>
          <Plus className="h-4 w-4" />
          Novo cruzeiro
        </Link>
      </div>

      <AdminTable
        rows={cruises}
        emptyTitle="Nenhum cruzeiro cadastrado"
        emptyDescription="Crie o primeiro cruzeiro para alimentar o Cruise Radar."
        columns={[
          {
            header: 'Nome',
            cell: (c) => (
              <div>
                <span className="font-medium">{c.name}</span>
                {c.is_mock && <span className="ml-2 text-xs text-muted-foreground">(exemplo)</span>}
              </div>
            ),
          },
          { header: 'Categoria', cell: (c) => CRUISE_CATEGORY_LABEL[c.category] },
          { header: 'Embarque', cell: (c) => (c.destinations ? `${c.destinations.city}, ${c.destinations.country}` : '—') },
          { header: 'Noites', cell: (c) => c.nights },
          {
            header: 'Verificação',
            cell: (c) => <Badge variant={VERIFICATION_BADGE_VARIANT[c.verification_status]}>{VERIFICATION_STATUS_LABEL[c.verification_status]}</Badge>,
          },
          { header: 'Score', cell: (c) => `${c.cruise_score}/100` },
        ]}
        actions={(c) => (
          <div className="flex justify-end gap-2">
            <Link href={`/admin/cruzeiros/${c.id}/editar`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Link>
            <form action={deleteCruise.bind(null, c.id)}>
              <ConfirmSubmitButton
                variant="destructive"
                size="sm"
                confirmMessage={`Excluir o cruzeiro "${c.name}"? Ele some de /cruzeiros imediatamente — fica registrado em audit_logs, mas não tem desfazer no app.`}
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
