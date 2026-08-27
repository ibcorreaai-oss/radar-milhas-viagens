import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { CruiseForm } from '../../cruise-form';
import { updateCruise } from '../../actions';
import type { Destination, Source, Cruise } from '@/lib/types';

export default async function EditarCruzeiroPage({
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

  const [{ data: cruise }, { data: destinations }, { data: sources }] = await Promise.all([
    supabase.from('cruises').select('*').eq('id', id).maybeSingle(),
    supabase.from('destinations').select('*').order('city'),
    supabase.from('sources').select('*').order('name'),
  ]);

  if (!cruise) {
    notFound();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar cruzeiro</h1>
        <p className="mt-1 text-muted-foreground">{(cruise as Cruise).name}</p>
      </div>
      <CruiseForm
        cruise={cruise as Cruise}
        destinations={(destinations ?? []) as Destination[]}
        sources={(sources ?? []) as Source[]}
        action={updateCruise.bind(null, id)}
        error={erro}
      />
    </div>
  );
}
