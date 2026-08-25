import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { OpportunityForm } from '../../opportunity-form';
import { updateOpportunity } from '../../actions';
import type { Opportunity } from '@/lib/types';

export default async function EditarOportunidadePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  await requireAdmin();

  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.from('opportunities').select('*').eq('id', id).maybeSingle();

  if (!data) {
    notFound();
  }

  const opportunity = data as Opportunity;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar oportunidade</h1>
        <p className="mt-1 text-muted-foreground">{opportunity.title}</p>
      </div>
      <OpportunityForm opportunity={opportunity} action={updateOpportunity.bind(null, id)} error={erro} />
    </div>
  );
}
