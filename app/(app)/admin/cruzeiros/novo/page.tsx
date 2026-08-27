import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { CruiseForm } from '../cruise-form';
import { createCruise } from '../actions';
import type { Destination, Source } from '@/lib/types';

export default async function NovoCruzeiroPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
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
        <h1 className="text-2xl font-bold tracking-tight">Novo cruzeiro</h1>
        <p className="mt-1 text-muted-foreground">Cadastre um novo cruzeiro no Cruise Radar.</p>
      </div>
      <CruiseForm destinations={(destinations ?? []) as Destination[]} sources={(sources ?? []) as Source[]} action={createCruise} error={erro} />
    </div>
  );
}
