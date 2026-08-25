import { redirect } from 'next/navigation';
import { GraduationCap } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { EmptyState } from '@/components/empty-state';
import { TrainingBrowser } from './training-browser';
import type { TrainingModule, TrainingLesson, LessonProgress } from '@/lib/types';

export default async function TreinamentosPage() {
  const ctx = await getUserContext();
  if (!ctx) redirect('/login');

  if (!isSupabaseConfigured()) {
    return (
      <div className="p-6">
        <EmptyState
          title="Central de treinamentos ainda não disponível"
          description="O conteúdo está sendo configurado. Volte em breve."
          icon={GraduationCap}
        />
      </div>
    );
  }

  const supabase = await createClient();

  // RLS (training_modules/training_lessons: read published or admin) já
  // restringe a published pra usuário comum — is_admin() vê tudo, inclusive
  // rascunho, o que é intencional pra o admin conseguir usar /treinamentos
  // como pré-visualização antes de publicar.
  const [{ data: modulesData }, { data: lessonsData }] = await Promise.all([
    supabase.from('training_modules').select('*').order('order_index'),
    supabase.from('training_lessons').select('*').order('order_index'),
  ]);

  const modules = (modulesData ?? []) as TrainingModule[];
  const lessons = (lessonsData ?? []) as TrainingLesson[];

  const lessonIds = lessons.map((l) => l.id);
  const { data: progressData } =
    lessonIds.length > 0
      ? await supabase.from('lesson_progress').select('*').eq('user_id', ctx.userId).in('lesson_id', lessonIds)
      : { data: [] as LessonProgress[] };
  // Objeto simples (não Map) — props de Server para Client Component
  // precisam ser serializáveis pelo React Flight.
  const progressByLessonId: Record<string, LessonProgress> = {};
  for (const p of (progressData ?? []) as LessonProgress[]) {
    progressByLessonId[p.lesson_id] = p;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Central de Treinamentos</h1>
        <p className="mt-1 text-muted-foreground">
          Aprenda a tirar o máximo proveito do Radar Milhas & Viagens — do básico às estratégias avançadas.
        </p>
      </div>

      <TrainingBrowser modules={modules} lessons={lessons} progressByLessonId={progressByLessonId} />
    </div>
  );
}
