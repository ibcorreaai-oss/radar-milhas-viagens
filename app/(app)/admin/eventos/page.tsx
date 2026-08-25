import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminTable } from '@/components/admin-table';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { cn, formatDate } from '@/lib/utils';
import { EVENT_STATUS_LABEL } from '@/lib/types';
import { deleteEvent } from './actions';
import type { WorldEvent, EventStatus, EventCategory } from '@/lib/types';

const STATUS_BADGE_VARIANT: Record<EventStatus, 'success' | 'default' | 'secondary' | 'destructive' | 'outline'> = {
  confirmado: 'success',
  previsto: 'default',
  estimado: 'secondary',
  em_monitoramento: 'secondary',
  cancelado: 'destructive',
  adiado: 'destructive',
  finalizado: 'outline',
};

type EventRow = WorldEvent & {
  event_categories: Pick<EventCategory, 'label'> | null;
  destinations: { city: string; country: string } | null;
};

export default async function AdminEventosPage() {
  const ctx = await getUserContext();
  if (ctx?.profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('world_events')
    .select('*, event_categories(label), destinations(city, country)')
    .order('featured', { ascending: false })
    .order('start_date', { ascending: true });

  const events = (data ?? []) as EventRow[];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Eventos (World Radar)</h1>
          <p className="mt-1 text-muted-foreground">Gerencie os eventos exibidos em /descobrir.</p>
        </div>
        <Link href="/admin/eventos/nova" className={cn(buttonVariants({ variant: 'default' }))}>
          <Plus className="h-4 w-4" />
          Novo evento
        </Link>
      </div>

      <AdminTable
        rows={events}
        emptyTitle="Nenhum evento cadastrado"
        emptyDescription="Crie o primeiro evento para alimentar o World Radar."
        columns={[
          {
            header: 'Título',
            cell: (e) => (
              <div>
                <span className="font-medium">{e.title}</span>
                {e.is_mock && (
                  <span className="ml-2 text-xs text-muted-foreground">(exemplo)</span>
                )}
              </div>
            ),
          },
          { header: 'Categoria', cell: (e) => e.event_categories?.label ?? '—' },
          { header: 'Destino', cell: (e) => (e.destinations ? `${e.destinations.city}, ${e.destinations.country}` : '—') },
          { header: 'Período', cell: (e) => `${formatDate(e.start_date)} – ${formatDate(e.end_date)}` },
          {
            header: 'Status',
            cell: (e) => <Badge variant={STATUS_BADGE_VARIANT[e.status]}>{EVENT_STATUS_LABEL[e.status]}</Badge>,
          },
          { header: 'Score', cell: (e) => `${e.experience_score}/100` },
        ]}
        actions={(e) => (
          <div className="flex justify-end gap-2">
            <Link href={`/admin/eventos/${e.id}/editar`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Link>
            <form action={deleteEvent.bind(null, e.id)}>
              <ConfirmSubmitButton
                variant="destructive"
                size="sm"
                confirmMessage={`Excluir o evento "${e.title}"? Ele some de /descobrir imediatamente — fica registrado em audit_logs, mas não tem desfazer no app.`}
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
