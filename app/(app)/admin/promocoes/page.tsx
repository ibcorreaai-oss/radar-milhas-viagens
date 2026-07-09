import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdminTable } from '@/components/admin-table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn, formatDate } from '@/lib/utils';
import { deletePromotion } from './actions';
import type { Promotion, PromotionStatus } from '@/lib/types';

const STATUS_BADGE_VARIANT: Record<PromotionStatus, 'success' | 'secondary' | 'outline'> = {
  ativa: 'success',
  futura: 'secondary',
  expirada: 'outline',
};

const STATUS_LABEL: Record<PromotionStatus, string> = {
  ativa: 'Ativa',
  futura: 'Futura',
  expirada: 'Expirada',
};

export default async function AdminPromocoesPage() {
  const ctx = await getUserContext();
  if (ctx?.profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from('promotions')
    .select('*')
    .order('status')
    .order('score', { ascending: false });

  const promotions = (data ?? []) as Promotion[];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Promoções</h1>
          <p className="mt-1 text-muted-foreground">Gerencie as promoções exibidas na vitrine do clube.</p>
        </div>
        <Link href="/admin/promocoes/nova" className={cn(buttonVariants({ variant: 'default' }))}>
          <Plus className="h-4 w-4" />
          Nova promoção
        </Link>
      </div>

      <AdminTable
        rows={promotions}
        emptyTitle="Nenhuma promoção cadastrada"
        emptyDescription="Crie a primeira promoção para começar a alimentar a vitrine do clube."
        columns={[
          { header: 'Título', cell: (p) => <span className="font-medium">{p.title}</span> },
          { header: 'Tipo', cell: (p) => p.type },
          { header: 'Programa', cell: (p) => p.program ?? '—' },
          {
            header: 'Bônus',
            cell: (p) => (p.bonus_percentage != null ? `${p.bonus_percentage}%` : '—'),
          },
          {
            header: 'Status',
            cell: (p) => <Badge variant={STATUS_BADGE_VARIANT[p.status]}>{STATUS_LABEL[p.status]}</Badge>,
          },
          {
            header: 'Período',
            cell: (p) => `${formatDate(p.start_date)} – ${formatDate(p.end_date)}`,
          },
        ]}
        actions={(p) => (
          <div className="flex justify-end gap-2">
            <Link
              href={`/admin/promocoes/${p.id}/editar`}
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Link>
            <form action={deletePromotion.bind(null, p.id)}>
              <Button type="submit" variant="destructive" size="sm">
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </Button>
            </form>
          </div>
        )}
      />
    </div>
  );
}
