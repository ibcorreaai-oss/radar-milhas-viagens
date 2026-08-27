import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { StayForm } from '../stay-form';
import { createStay } from '../actions';
import type { Destination, Source } from '@/lib/types';

export default async function NovaEstadiaPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireAdmin();
  const { erro } = await searchParams;

  const supabase = await createClient();
  const [{ data: destinations }, { data: sources }] = await Promise.all([
    supabase.from('destinations').select('*').order('city'),
    supabase.from('sources').select('*').order('name'),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nova hospedagem</h1>
        <p className="mt-1 text-muted-foreground">Cadastre uma nova hospedagem no Stay Experience Radar.</p>
      </div>
      <StayForm
        destinations={(destinations ?? []) as Destination[]}
        sources={(sources ?? []) as Source[]}
        action={createStay}
        error={erro}
      />
    </div>
  );
}
