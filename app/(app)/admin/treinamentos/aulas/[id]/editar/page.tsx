import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { LessonForm } from '../../../lesson-form';
import { updateLesson } from '../../actions';
import type { TrainingLesson, TrainingModule } from '@/lib/types';

export default async function EditarAulaPage({
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
  const [{ data: lessonData }, { data: modulesData }] = await Promise.all([
    supabase.from('training_lessons').select('*').eq('id', id).maybeSingle(),
    supabase.from('training_modules').select('*').order('order_index'),
  ]);

  if (!lessonData) notFound();
  const lesson = lessonData as TrainingLesson;
  const modules = (modulesData ?? []) as TrainingModule[];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar aula</h1>
        <p className="mt-1 text-muted-foreground">{lesson.title}</p>
      </div>
      <LessonForm lesson={lesson} modules={modules} action={updateLesson.bind(null, id)} error={erro} />
    </div>
  );
}
