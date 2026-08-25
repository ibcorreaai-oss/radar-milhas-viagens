import Link from 'next/link';
import { Plus, Pencil, Trash2, Star, StarOff } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { AdminTable } from '@/components/admin-table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { cn, formatBRL, formatDate } from '@/lib/utils';
import { deleteOpportunity, toggleFeatured } from './actions';
import type { Opportunity, OpportunityType } from '@/lib/types';

const TYPE_LABEL: Record<OpportunityType, string> = {
  voo: 'Voo',
  hotel: 'Hotel',
  transferencia: 'Transferência',
  pacote: 'Pacote',
  evento: 'Evento',
};

export default async function AdminOportunidadesPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data } = await supabase.from('opportunities').select('*').order('score', { ascending: false });
  const opportunities = (data ?? []) as Opportunity[];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Oportunidades</h1>
          <p className="mt-1 text-muted-foreground">Vitrine de oportunidades com score calculado.</p>
        </div>
        <Link href="/admin/oportunidades/nova" className={cn(buttonVariants({ variant: 'default' }))}>
          <Plus className="h-4 w-4" />
          Nova oportunidade
        </Link>
      </div>

      <AdminTable
        rows={opportunities}
        emptyTitle="Nenhuma oportunidade cadastrada"
        emptyDescription="Cadastre a primeira oportunidade manualmente ou rode o OpportunityEngine sobre uma busca."
        columns={[
          { header: 'Título', cell: (o) => <span className="font-medium">{o.title}</span> },
          { header: 'Tipo', cell: (o) => TYPE_LABEL[o.type] },
          {
            header: 'Rota/Cidade',
            cell: (o) => [o.origin, o.destination].filter(Boolean).join(' → ') || o.city || '—',
          },
          { header: 'Preço', cell: (o) => (o.cash_price != null ? formatBRL(o.cash_price) : '—') },
          {
            header: 'Score',
            cell: (o) => (
              <Badge variant={o.score >= 75 ? 'success' : o.score >= 40 ? 'secondary' : 'destructive'}>
                {o.score}
              </Badge>
            ),
          },
          { header: 'Destaque', cell: (o) => (o.featured ? <Badge variant="accent">Destaque</Badge> : '—') },
          { header: 'Expira', cell: (o) => formatDate(o.expires_at) },
        ]}
        actions={(o) => (
          <div className="flex justify-end gap-2">
            <form action={toggleFeatured.bind(null, o.id, o.featured)}>
              <Button type="submit" variant="outline" size="sm">
                {o.featured ? <StarOff className="h-3.5 w-3.5" /> : <Star className="h-3.5 w-3.5" />}
                {o.featured ? 'Remover destaque' : 'Destacar'}
              </Button>
            </form>
            <Link
              href={`/admin/oportunidades/${o.id}/editar`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Link>
            <form action={deleteOpportunity.bind(null, o.id)}>
              <ConfirmSubmitButton
                variant="destructive"
                size="sm"
                confirmMessage={`Excluir a oportunidade "${o.title}"? Ela some da vitrine imediatamente — fica registrada em audit_logs, mas não tem desfazer no app.`}
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
