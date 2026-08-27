import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { ModuleForm } from '../../../module-form';
import { updateModule } from '../../../actions';
import type { TrainingModule } from '@/lib/types';

export default async function EditarModuloPage({
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
  const { data } = await supabase.from('training_modules').select('*').eq('id', id).maybeSingle();
  if (!data) notFound();
  const trainingModule = data as TrainingModule;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar módulo</h1>
        <p className="mt-1 text-muted-foreground">{trainingModule.title}</p>
      </div>
      <ModuleForm module={trainingModule} action={updateModule.bind(null, id)} error={erro} />
    </div>
  );
}
