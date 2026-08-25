'use server';

import { revalidatePath } from 'next/cache';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isBlocked } from '@/lib/roles';
import type { LessonProgress } from '@/lib/types';

// Toda função aqui SEMPRE escreve com ctx.userId (nunca aceita user_id vindo
// do client) — RLS (lesson_progress: owner all) já bloquearia de qualquer
// jeito, mas isto é defesa em profundidade e evita depender só da RLS pra
// não deixar um usuário adulterar o progresso de outro (ver TRAINING.md
// item de segurança). Se não há sessão, é um no-op silencioso: o player só
// chama isto de dentro de /treinamentos, já protegida pelo middleware — não
// é um caminho que deveria ser alcançável deslogado.
//
// Achado na varredura de consistência da ETAPA 15.2 (revendo etapas
// anteriores): estas 3 actions checavam só "está logado", igual ao bug de
// bloqueio cosmético achado na ETAPA 15.0 (ver PLATFORM_ADMIN.md) — uma
// conta bloqueada com uma aba de /treinamentos já aberta continuaria
// conseguindo gravar progresso. Mesmo predicado central de lib/roles.ts
// usado em favoritos/alertas/etc. O check `!ctx || isBlocked(...)` fica
// inline em cada função (nunca extraído pra uma função/variável central) —
// extrair quebra o estreitamento de tipo do TypeScript sobre `ctx` nas
// linhas seguintes (`ctx` continuaria tipado `UserContext | null`).
async function currentProgress(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  lessonId: string
): Promise<LessonProgress | null> {
  const { data } = await supabase
    .from('lesson_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle();
  return (data as LessonProgress) ?? null;
}

export async function startLesson(lessonId: string): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx || isBlocked(ctx.profile)) return;

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const existing = await currentProgress(supabase, ctx.userId, lessonId);

  await supabase.from('lesson_progress').upsert(
    {
      user_id: ctx.userId,
      lesson_id: lessonId,
      status: existing?.status === 'completed' ? 'completed' : 'in_progress',
      progress_seconds: existing?.progress_seconds ?? 0,
      started_at: existing?.started_at ?? nowIso,
      completed_at: existing?.completed_at ?? null,
      last_accessed_at: nowIso,
    },
    { onConflict: 'user_id,lesson_id' }
  );
}

// Chamado periodicamente (throttled) pelo player nativo (<video>) enquanto
// reproduz — nunca rebaixa 'completed' de volta pra 'in_progress' (re-ver
// uma aula já concluída não deve "desconcluir" ela).
export async function saveLessonPosition(lessonId: string, progressSeconds: number): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx || isBlocked(ctx.profile)) return;

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const existing = await currentProgress(supabase, ctx.userId, lessonId);

  await supabase.from('lesson_progress').upsert(
    {
      user_id: ctx.userId,
      lesson_id: lessonId,
      status: existing?.status === 'completed' ? 'completed' : 'in_progress',
      progress_seconds: Math.max(0, Math.round(progressSeconds)),
      started_at: existing?.started_at ?? nowIso,
      completed_at: existing?.completed_at ?? null,
      last_accessed_at: nowIso,
    },
    { onConflict: 'user_id,lesson_id' }
  );
}

export async function markLessonCompleted(lessonId: string): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx || isBlocked(ctx.profile)) return;

  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const existing = await currentProgress(supabase, ctx.userId, lessonId);

  await supabase.from('lesson_progress').upsert(
    {
      user_id: ctx.userId,
      lesson_id: lessonId,
      status: 'completed',
      progress_seconds: existing?.progress_seconds ?? 0,
      started_at: existing?.started_at ?? nowIso,
      completed_at: nowIso,
      last_accessed_at: nowIso,
    },
    { onConflict: 'user_id,lesson_id' }
  );

  revalidatePath('/treinamentos');
}
