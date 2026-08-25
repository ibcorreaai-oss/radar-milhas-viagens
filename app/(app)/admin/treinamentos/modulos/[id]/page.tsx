import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Plus, ArrowUp, ArrowDown, Pencil, Trash2, Eye, ChevronLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { AdminTable } from '@/components/admin-table';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { cn } from '@/lib/utils';
import { deleteLesson, toggleLessonStatus, moveLesson } from '../../aulas/actions';
import { TRAINING_STATUS_LABEL } from '@/lib/types';
import type { TrainingModule, TrainingLesson } from '@/lib/types';

export default async function AdminModuloPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: moduleData }, { data: lessonsData }] = await Promise.all([
    supabase.from('training_modules').select('*').eq('id', id).maybeSingle(),
    supabase.from('training_lessons').select('*').eq('module_id', id).order('order_index'),
  ]);

  if (!moduleData) notFound();
  const module = moduleData as TrainingModule;
  const lessons = (lessonsData ?? []) as TrainingLesson[];

  return (
    <div className="space-y-6 p-6">
      <Link href="/admin/treinamentos" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" />
        Voltar para Treinamentos
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{module.title}</h1>
          {module.description && <p className="mt-1 text-muted-foreground">{module.description}</p>}
          <Badge variant={module.status === 'published' ? 'success' : 'outline'} className="mt-2">
            {TRAINING_STATUS_LABEL[module.status]}
          </Badge>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/treinamentos/modulos/${module.id}/editar`} className={cn(buttonVariants({ variant: 'outline' }))}>
            <Pencil className="h-4 w-4" />
            Editar módulo
          </Link>
          <Link href={`/admin/treinamentos/aulas/nova?modulo=${module.id}`} className={cn(buttonVariants({ variant: 'default' }))}>
            <Plus className="h-4 w-4" />
            Nova aula
          </Link>
        </div>
      </div>

      <AdminTable
        rows={lessons}
        emptyTitle="Nenhuma aula cadastrada neste módulo"
        emptyDescription="Adicione a primeira aula para começar a preencher este módulo."
        columns={[
          { header: 'Título', cell: (l) => <span className="font-medium">{l.title}</span> },
          {
            header: 'Status',
            cell: (l) => (
              <Badge variant={l.status === 'published' ? 'success' : l.status === 'archived' ? 'secondary' : 'outline'}>
                {TRAINING_STATUS_LABEL[l.status]}
              </Badge>
            ),
          },
          { header: 'Obrigatória', cell: (l) => (l.is_required ? 'Sim' : 'Não') },
        ]}
        actions={(l) => (
          <div className="flex justify-end gap-2">
            <form action={moveLesson.bind(null, l.id, module.id, 'up')}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Mover para cima">
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            </form>
            <form action={moveLesson.bind(null, l.id, module.id, 'down')}>
              <Button type="submit" variant="ghost" size="icon" aria-label="Mover para baixo">
                <ArrowDown className="h-3.5 w-3.5" />
              </Button>
            </form>
            {l.status === 'published' ? (
              <form action={toggleLessonStatus.bind(null, l.id, 'draft')}>
                <Button type="submit" variant="outline" size="sm">
                  Despublicar
                </Button>
              </form>
            ) : (
              <form action={toggleLessonStatus.bind(null, l.id, 'published')}>
                <Button type="submit" variant="outline" size="sm">
                  Publicar
                </Button>
              </form>
            )}
            {l.status === 'published' && (
              <Link href={`/treinamentos/aula/${l.slug}`} target="_blank" className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }))} aria-label="Pré-visualizar">
                <Eye className="h-3.5 w-3.5" />
              </Link>
            )}
            <Link href={`/admin/treinamentos/aulas/${l.id}/editar`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </Link>
            <form action={deleteLesson.bind(null, l.id, module.id)}>
              <ConfirmSubmitButton
                variant="destructive"
                size="sm"
                confirmMessage={`Excluir a aula "${l.title}"? O progresso de usuários nessa aula é excluído junto. Fica registrado em audit_logs, mas não tem desfazer no app.`}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Excluir
              </ConfirmSubmitButton>
            </form>
          </div>
        )}
      />
    </div>
  );
}
