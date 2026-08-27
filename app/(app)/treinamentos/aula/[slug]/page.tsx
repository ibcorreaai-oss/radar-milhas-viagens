import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { LessonPlayer } from './lesson-player';
import type { TrainingModule, TrainingLesson, LessonProgress } from '@/lib/types';

export default async function AulaPage({ params }: { params: Promise<{ slug: string }> }) {
  const ctx = await getUserContext();
  if (!ctx) redirect('/login');

  const { slug } = await params;
  const supabase = await createClient();

  // RLS (training_lessons: read published or admin) já garante que um
  // usuário comum só recebe uma linha aqui se a aula E o módulo dela
  // estiverem publicados — se vier vazio, ou não existe ou não está
  // visível, mesma resposta (404) nos dois casos.
  const { data: lessonData } = await supabase.from('training_lessons').select('*').eq('slug', slug).maybeSingle();
  if (!lessonData) notFound();
  const lesson = lessonData as TrainingLesson;

  const { data: moduleData } = await supabase
    .from('training_modules')
    .select('*')
    .eq('id', lesson.module_id)
    .maybeSingle();
  const trainingModule = moduleData as TrainingModule | null;

  // Lista global (todos os módulos, na mesma ordem do /treinamentos) pra
  // navegação anterior/próxima cruzar limite de módulo, e a lista lateral
  // mostrar as outras aulas do mesmo módulo.
  const [{ data: allModulesData }, { data: allLessonsData }] = await Promise.all([
    supabase.from('training_modules').select('*').order('order_index'),
    supabase.from('training_lessons').select('*').order('order_index'),
  ]);
  const allModules = (allModulesData ?? []) as TrainingModule[];
  const allLessons = (allLessonsData ?? []) as TrainingLesson[];

  const moduleOrderIndex = new Map(allModules.map((m, i) => [m.id, i]));
  const orderedLessons = [...allLessons].sort((a, b) => {
    const modA = moduleOrderIndex.get(a.module_id) ?? 0;
    const modB = moduleOrderIndex.get(b.module_id) ?? 0;
    if (modA !== modB) return modA - modB;
    return a.order_index - b.order_index;
  });
  const currentIndex = orderedLessons.findIndex((l) => l.id === lesson.id);
  const prevLesson = currentIndex > 0 ? orderedLessons[currentIndex - 1] : null;
  const nextLesson = currentIndex >= 0 && currentIndex < orderedLessons.length - 1 ? orderedLessons[currentIndex + 1] : null;

  const moduleLessons = allLessons
    .filter((l) => l.module_id === lesson.module_id)
    .sort((a, b) => a.order_index - b.order_index);

  const { data: progressData } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', ctx.userId)
    .eq('lesson_id', lesson.id)
    .maybeSingle();

  const progressByLessonId: Record<string, LessonProgress> = {};
  if (moduleLessons.length > 0) {
    const { data: moduleProgress } = await supabase
      .from('lesson_progress')
      .select('*')
      .eq('user_id', ctx.userId)
      .in(
        'lesson_id',
        moduleLessons.map((l) => l.id)
      );
    for (const p of (moduleProgress ?? []) as LessonProgress[]) {
      progressByLessonId[p.lesson_id] = p;
    }
  }

  return (
    <div className="space-y-4 p-6">
      <Link
        href="/treinamentos"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" />
        Voltar para Treinamentos
      </Link>

      <LessonPlayer
        lesson={lesson}
        module={trainingModule}
        progress={(progressData as LessonProgress) ?? null}
        prevLesson={prevLesson}
        nextLesson={nextLesson}
        moduleLessons={moduleLessons}
        progressByLessonId={progressByLessonId}
      />
    </div>
  );
}
