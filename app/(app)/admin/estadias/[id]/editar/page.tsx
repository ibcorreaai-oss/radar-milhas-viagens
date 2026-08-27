import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { StayForm } from '../../stay-form';
import { updateStay } from '../../actions';
import type { Destination, Source, Stay } from '@/lib/types';

export default async function EditarEstadiaPage({
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

  const [{ data: stay }, { data: destinations }, { data: sources }] = await Promise.all([
    supabase.from('stays').select('*').eq('id', id).maybeSingle(),
    supabase.from('destinations').select('*').order('city'),
    supabase.from('sources').select('*').order('name'),
  ]);

  if (!stay) {
    notFound();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar hospedagem</h1>
        <p className="mt-1 text-muted-foreground">{(stay as Stay).name}</p>
      </div>
      <StayForm
        stay={stay as Stay}
        destinations={(destinations ?? []) as Destination[]}
        sources={(sources ?? []) as Source[]}
        action={updateStay.bind(null, id)}
        error={erro}
      />
    </div>
  );
}
