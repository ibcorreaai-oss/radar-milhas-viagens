import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { LessonForm } from '../../lesson-form';
import { createLesson } from '../actions';
import type { TrainingModule } from '@/lib/types';

export default async function NovaAulaPage({
  searchParams,
}: {
  searchParams: Promise<{ modulo?: string; erro?: string }>;
}) {
  await requireAdmin();
  const { modulo, erro } = await searchParams;

  const supabase = await createClient();
  const { data } = await supabase.from('training_modules').select('*').order('order_index');
  const modules = (data ?? []) as TrainingModule[];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Nova aula</h1>
        <p className="mt-1 text-muted-foreground">Cadastre uma aula dentro de um módulo do treinamento.</p>
      </div>
      <LessonForm modules={modules} defaultModuleId={modulo} action={createLesson} error={erro} />
    </div>
  );
}
