'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ChevronDown, ChevronUp, PlayCircle, CheckCircle2, Circle, PlayCircle as ContinueIcon } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/empty-state';
import { cn, formatDurationSeconds } from '@/lib/utils';
import type { TrainingModule, TrainingLesson, LessonProgress, LessonProgressStatus } from '@/lib/types';

type StatusFilter = 'all' | 'not_started' | 'in_progress' | 'completed';

const FILTER_LABEL: Record<StatusFilter, string> = {
  all: 'Todas',
  not_started: 'Não iniciadas',
  in_progress: 'Em andamento',
  completed: 'Concluídas',
};

function lessonStatus(progress: LessonProgress | undefined): LessonProgressStatus {
  return progress?.status ?? 'not_started';
}

function StatusIcon({ status }: { status: LessonProgressStatus }) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />;
  if (status === 'in_progress') return <PlayCircle className="h-4 w-4 shrink-0 text-amber-500" />;
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

export function TrainingBrowser({
  modules,
  lessons,
  progressByLessonId,
}: {
  modules: TrainingModule[];
  lessons: TrainingLesson[];
  progressByLessonId: Record<string, LessonProgress>;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const lessonsByModule = useMemo(() => {
    const map = new Map<string, TrainingLesson[]>();
    for (const lesson of lessons) {
      const list = map.get(lesson.module_id) ?? [];
      list.push(lesson);
      map.set(lesson.module_id, list);
    }
    return map;
  }, [lessons]);

  const totalLessons = lessons.length;
  const completedCount = lessons.filter((l) => lessonStatus(progressByLessonId[l.id]) === 'completed').length;
  const overallPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  const continueWatching = useMemo(() => {
    const inProgress = lessons
      .map((lesson) => ({ lesson, progress: progressByLessonId[lesson.id] }))
      .filter((x) => x.progress?.status === 'in_progress')
      .sort((a, b) => (b.progress!.last_accessed_at > a.progress!.last_accessed_at ? 1 : -1));
    return inProgress[0] ?? null;
  }, [lessons, progressByLessonId]);

  const normalizedQuery = query.trim().toLowerCase();

  function matchesQuery(lesson: TrainingLesson, module: TrainingModule): boolean {
    if (!normalizedQuery) return true;
    const haystack = [module.title, lesson.title, lesson.description ?? '', ...lesson.keywords].join(' ').toLowerCase();
    return haystack.includes(normalizedQuery);
  }

  function matchesFilter(lesson: TrainingLesson): boolean {
    if (filter === 'all') return true;
    return lessonStatus(progressByLessonId[lesson.id]) === filter;
  }

  const visibleModules = modules
    .map((module) => {
      const moduleLessons = (lessonsByModule.get(module.id) ?? []).filter(
        (l) => matchesQuery(l, module) && matchesFilter(l)
      );
      return { module, lessons: moduleLessons };
    })
    .filter((m) => m.lessons.length > 0);

  function toggleCollapsed(moduleId: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) next.delete(moduleId);
      else next.add(moduleId);
      return next;
    });
  }

  if (totalLessons === 0) {
    return (
      <EmptyState
        title="Nenhum treinamento publicado ainda"
        description="O conteúdo dos treinamentos está sendo preparado. Volte em breve."
        icon={PlayCircle}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Treinamento concluído</span>
              <span className="text-muted-foreground">{overallPercent}%</span>
            </div>
            <Progress value={overallPercent} className="mt-2" label="Progresso geral do treinamento" />
          </div>
          <p className="text-xs text-muted-foreground sm:pl-4">
            {completedCount} de {totalLessons} aulas concluídas
          </p>
        </CardContent>
      </Card>

      {continueWatching && (
        <Link href={`/treinamentos/aula/${continueWatching.lesson.slug}`}>
          <Card className="border-primary/40 transition-colors hover:border-primary">
            <CardContent className="flex items-center gap-4 p-4">
              <ContinueIcon className="h-8 w-8 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-primary">Continuar assistindo</p>
                <p className="truncate font-medium">{continueWatching.lesson.title}</p>
                <p className="text-xs text-muted-foreground">
                  Parou em {formatDurationSeconds(continueWatching.progress!.progress_seconds)}
                  {continueWatching.lesson.duration_seconds > 0 &&
                    ` de ${formatDurationSeconds(continueWatching.lesson.duration_seconds)}`}
                </p>
              </div>
            </CardContent>
          </Card>
        </Link>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative sm:w-80">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por aula, módulo ou palavra-chave..."
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(FILTER_LABEL) as StatusFilter[]).map((key) => (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={filter === key ? 'default' : 'outline'}
              onClick={() => setFilter(key)}
            >
              {FILTER_LABEL[key]}
            </Button>
          ))}
        </div>
      </div>

      {visibleModules.length === 0 ? (
        <EmptyState
          title="Nenhuma aula encontrada"
          description="Tente outra busca ou remova o filtro aplicado."
          icon={Search}
        />
      ) : (
        <div className="space-y-4">
          {visibleModules.map(({ module, lessons: moduleLessons }) => {
            const allModuleLessons = lessonsByModule.get(module.id) ?? [];
            const moduleCompleted = allModuleLessons.filter(
              (l) => lessonStatus(progressByLessonId[l.id]) === 'completed'
            ).length;
            const modulePercent =
              allModuleLessons.length > 0 ? Math.round((moduleCompleted / allModuleLessons.length) * 100) : 0;
            const isCollapsed = collapsed.has(module.id);

            return (
              <Card key={module.id}>
                <CardHeader
                  className="cursor-pointer select-none"
                  onClick={() => toggleCollapsed(module.id)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base">{module.title}</CardTitle>
                      {module.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{module.description}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <Badge variant="secondary">
                        {allModuleLessons.length} {allModuleLessons.length === 1 ? 'aula' : 'aulas'}
                      </Badge>
                      <Badge variant={modulePercent === 100 ? 'success' : 'outline'}>{modulePercent}%</Badge>
                      {isCollapsed ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <Progress value={modulePercent} className="mt-2" label={`Progresso do módulo ${module.title}`} />
                </CardHeader>
                {!isCollapsed && (
                  <CardContent className="space-y-1 pt-0">
                    {moduleLessons.map((lesson) => {
                      const progress = progressByLessonId[lesson.id];
                      const status = lessonStatus(progress);
                      return (
                        <Link
                          key={lesson.id}
                          href={`/treinamentos/aula/${lesson.slug}`}
                          className={cn(
                            'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-muted'
                          )}
                        >
                          <StatusIcon status={status} />
                          <span className="min-w-0 flex-1 truncate">{lesson.title}</span>
                          {!lesson.is_required && (
                            <Badge variant="outline" className="shrink-0 text-xs">
                              Opcional
                            </Badge>
                          )}
                          {lesson.duration_seconds > 0 && (
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {formatDurationSeconds(lesson.duration_seconds)}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
