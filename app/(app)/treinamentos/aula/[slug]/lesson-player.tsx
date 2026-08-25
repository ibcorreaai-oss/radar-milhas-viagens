'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, PlayCircle, Download, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/toast-provider';
import { resolveVideoSource } from '@/lib/video-providers';
import { startLesson, saveLessonPosition, markLessonCompleted } from '../../actions';
import { cn, formatDurationSeconds } from '@/lib/utils';
import type { TrainingLesson, TrainingModule, LessonProgress, LessonProgressStatus } from '@/lib/types';

const SAVE_INTERVAL_MS = 15_000;

function lessonStatus(progress: LessonProgress | undefined | null): LessonProgressStatus {
  return progress?.status ?? 'not_started';
}

function StatusIcon({ status }: { status: LessonProgressStatus }) {
  if (status === 'completed') return <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />;
  if (status === 'in_progress') return <PlayCircle className="h-4 w-4 shrink-0 text-amber-500" />;
  return <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />;
}

export function LessonPlayer({
  lesson,
  module,
  progress,
  prevLesson,
  nextLesson,
  moduleLessons,
  progressByLessonId,
}: {
  lesson: TrainingLesson;
  module: TrainingModule | null;
  progress: LessonProgress | null;
  prevLesson: TrainingLesson | null;
  nextLesson: TrainingLesson | null;
  moduleLessons: TrainingLesson[];
  progressByLessonId: Record<string, LessonProgress>;
}) {
  const router = useRouter();
  const { show } = useToast();
  const [isCompleted, setIsCompleted] = useState(progress?.status === 'completed');
  const [isPending, startTransitionAction] = useTransition();
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastSaveRef = useRef(0);

  const resolved = lesson.content_type === 'video' && lesson.video_ref
    ? resolveVideoSource({ provider: lesson.video_provider, ref: lesson.video_ref })
    : { kind: 'invalid' as const, reason: 'Esta aula ainda não tem conteúdo configurado.' };

  useEffect(() => {
    setIsCompleted(progress?.status === 'completed');
  }, [progress?.status, lesson.id]);

  // Registra "iniciada" uma vez ao abrir a aula — não bloqueia a UI (a
  // reprodução do vídeo não deve esperar essa chamada).
  useEffect(() => {
    startLesson(lesson.id);
  }, [lesson.id]);

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (!video) return;
    const now = Date.now();
    if (now - lastSaveRef.current < SAVE_INTERVAL_MS) return;
    lastSaveRef.current = now;
    saveLessonPosition(lesson.id, video.currentTime);
  }

  function handleEnded() {
    void handleMarkCompleted();
  }

  async function handleMarkCompleted() {
    setIsCompleted(true);
    startTransitionAction(async () => {
      await markLessonCompleted(lesson.id);
      show({ variant: 'success', title: 'Aula concluída!' });
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <div>
          {module && (
            <p className="text-sm font-medium text-primary">{module.title}</p>
          )}
          <h1 className="text-2xl font-bold tracking-tight">{lesson.title}</h1>
          {lesson.description && <p className="mt-1 text-muted-foreground">{lesson.description}</p>}
        </div>

        <Card className="overflow-hidden">
          <div className="relative aspect-video w-full bg-black">
            {resolved.kind === 'iframe' && (
              <iframe
                src={resolved.src}
                title={lesson.title}
                className="h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            )}
            {resolved.kind === 'native' && (
              // eslint-disable-next-line jsx-a11y/media-has-caption -- conteúdo educativo do próprio admin, sem legendas geradas
              <video
                ref={videoRef}
                src={resolved.src}
                controls
                className="h-full w-full"
                poster={lesson.thumbnail_url ?? undefined}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onLoadedMetadata={() => {
                  if (videoRef.current && progress?.progress_seconds) {
                    videoRef.current.currentTime = progress.progress_seconds;
                  }
                }}
              />
            )}
            {resolved.kind === 'invalid' && (
              <div className="flex h-full w-full items-center justify-center p-6 text-center text-sm text-white/70">
                {resolved.reason}
              </div>
            )}
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {lesson.duration_seconds > 0 && (
              <Badge variant="outline">{formatDurationSeconds(lesson.duration_seconds)}</Badge>
            )}
            {!lesson.is_required && <Badge variant="outline">Opcional</Badge>}
          </div>
          <Button onClick={handleMarkCompleted} disabled={isCompleted || isPending} variant={isCompleted ? 'secondary' : 'default'}>
            <CheckCircle2 className="h-4 w-4" />
            {isCompleted ? 'Concluída' : 'Marcar como concluída'}
          </Button>
        </div>

        {lesson.resources.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Materiais complementares</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {lesson.resources.map((resource, i) => (
                <a
                  key={i}
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 rounded-md p-2 text-sm text-primary hover:bg-muted"
                >
                  <Download className="h-4 w-4 shrink-0" />
                  <span className="flex-1 truncate">{resource.title}</span>
                  <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                </a>
              ))}
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between gap-3">
          {prevLesson ? (
            <Link href={`/treinamentos/aula/${prevLesson.slug}`} className="min-w-0">
              <Button variant="outline" className="max-w-full">
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span className="truncate">{prevLesson.title}</span>
              </Button>
            </Link>
          ) : (
            <span />
          )}
          {nextLesson && (
            <Link href={`/treinamentos/aula/${nextLesson.slug}`} className="min-w-0">
              <Button variant="outline" className="max-w-full">
                <span className="truncate">{nextLesson.title}</span>
                <ChevronRight className="h-4 w-4 shrink-0" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Card className="h-fit">
        <CardHeader>
          <CardTitle className="text-base">{module?.title ?? 'Aulas deste módulo'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {moduleLessons.map((l) => {
            const status = l.id === lesson.id ? (isCompleted ? 'completed' : lessonStatus(progress)) : lessonStatus(progressByLessonId[l.id]);
            const isCurrent = l.id === lesson.id;
            return (
              <Link
                key={l.id}
                href={`/treinamentos/aula/${l.slug}`}
                className={cn(
                  'flex items-center gap-2 rounded-md px-2 py-2 text-sm transition-colors hover:bg-muted',
                  isCurrent && 'bg-muted font-medium'
                )}
              >
                <StatusIcon status={status} />
                <span className="min-w-0 flex-1 truncate">{l.title}</span>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
