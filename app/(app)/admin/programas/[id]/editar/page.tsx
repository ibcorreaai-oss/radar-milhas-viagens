import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { LoyaltyProgramForm } from '../../loyalty-program-form';
import { updateLoyaltyProgram } from '../../actions';
import type { LoyaltyProgram } from '@/lib/types';

export default async function EditarProgramaPage({
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
  const { data } = await supabase.from('loyalty_programs').select('*').eq('id', id).maybeSingle();

  if (!data) {
    notFound();
  }

  const program = data as LoyaltyProgram;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar programa</h1>
        <p className="mt-1 text-muted-foreground">{program.name}</p>
      </div>
      <LoyaltyProgramForm program={program} action={updateLoyaltyProgram.bind(null, id)} error={erro} />
    </div>
  );
}
