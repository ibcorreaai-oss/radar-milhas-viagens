import Link from 'next/link';
import { Plus, ArrowUp, ArrowDown, Eye, Users, GraduationCap, CheckCircle2, Trash2 } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { AdminTable } from '@/components/admin-table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants, Button } from '@/components/ui/button';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { cn } from '@/lib/utils';
import { toggleModuleStatus, moveModule, deleteModule } from './actions';
import { TRAINING_STATUS_LABEL } from '@/lib/types';
import type { TrainingModule, TrainingLesson, LessonProgress } from '@/lib/types';

export default async function AdminTreinamentosPage() {
  await requireAdmin();

  const supabase = await createClient();
  const [{ data: modulesData }, { data: lessonsData }, { data: progressRows }] = await Promise.all([
    supabase.from('training_modules').select('*').order('order_index'),
    supabase.from('training_lessons').select('*'),
    supabase.from('lesson_progress').select('user_id, status'),
  ]);

  const modules = (modulesData ?? []) as TrainingModule[];
  const lessons = (lessonsData ?? []) as TrainingLesson[];
  const lessonCountByModule = new Map<string, number>();
  for (const lesson of lessons) {
    lessonCountByModule.set(lesson.module_id, (lessonCountByModule.get(lesson.module_id) ?? 0) + 1);
  }

  const progress = (progressRows ?? []) as Pick<LessonProgress, 'user_id' | 'status'>[];
  const completedProgress = progress.filter((p) => p.status === 'completed').length;
  // Achado em revisão adversarial: contar linhas de lesson_progress (1 por
  // aula que o usuário tocou) infla essa métrica assim que alguém progride
  // em mais de uma aula — precisa contar user_id distintos.
  const usersStartedCount = new Set(progress.map((p) => p.user_id)).size;
  const publishedLessons = lessons.filter((l) => l.status === 'published').length;

  const stats = [
    { label: 'Módulos', value: modules.length, icon: GraduationCap },
    { label: 'Aulas publicadas', value: publishedLessons, icon: Eye },
    { label: 'Usuários com progresso', value: usersStartedCount, icon: Users },
    { label: 'Aulas concluídas (total)', value: completedProgress, icon: CheckCircle2 },
  ];

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Central de Treinamentos</h1>
          <p className="mt-1 text-muted-foreground">Gerencie módulos e aulas do Mini LMS.</p>
        </div>
        <Link href="/admin/treinamentos/modulos/nova" className={cn(buttonVariants({ variant: 'default' }))}>
          <Plus className="h-4 w-4" />
          Novo módulo
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center justify-between p-6">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold">{stat.value}</p>
                </div>
                <Icon className="h-8 w-8 text-muted-foreground" />
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AdminTable
        rows={modules}
        emptyTitle="Nenhum módulo cadastrado"
        emptyDescription="Crie o primeiro módulo para começar a estruturar o treinamento."
        columns={[
          { header: 'Título', cell: (m) => <span className="font-medium">{m.title}</span> },
          { header: 'Aulas', cell: (m) => lessonCountByModule.get(m.id) ?? 0 },
          {
            header: 'Status',
            cell: (m) => (
              <Badge variant={m.status === 'published' ? 'success' : m.status === 'archived' ? 'secondary' : 'outline'}>
                {TRAINING_STATUS_LABEL[m.status]}
              </Badge>
            ),
          },
        ]}
        actions={(m) => (
          <div className="flex justify-end gap-2">
            <form action={moveModule.bind(null, m.id, 'up')}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Mover para cima">
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            </form>
            <form action={moveModule.bind(null, m.id, 'down')}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Mover para baixo">
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </form>
            {m.status === 'published' ? (
              <form action={toggleModuleStatus.bind(null, m.id, 'draft')}>
                <Button type="submit" variant="outline" size="sm">
                  Despublicar
                </Button>
              </form>
            ) : (
              <form action={toggleModuleStatus.bind(null, m.id, 'published')}>
                <Button type="submit" variant="outline" size="sm">
                  Publicar
                </Button>
              </form>
            )}
            <Link href={`/admin/treinamentos/modulos/${m.id}`} className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}>
              Gerenciar aulas
            </Link>
            <form action={deleteModule.bind(null, m.id)}>
              <ConfirmSubmitButton
                variant="destructive"
                size="sm"
                confirmMessage={`Excluir o módulo "${m.title}"? Todas as ${lessonCountByModule.get(m.id) ?? 0} aula(s) dele e o progresso de usuários nessas aulas são excluídos junto. Fica registrado em audit_logs, mas não tem desfazer no app.`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </ConfirmSubmitButton>
            </form>
          </div>
        )}
      />
    </div>
  );
}
