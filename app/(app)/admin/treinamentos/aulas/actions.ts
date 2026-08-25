'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { logAuditEvent } from '@/lib/audit-log';
import { friendlyDbError } from '@/lib/db-errors';
import { trainingLessonSchema, firstZodError, parseLessonResources } from '@/lib/validation/admin-schemas';
import { slugify, parseTagsList, parseNumberOrNull } from '@/lib/utils';
import type { TrainingLesson } from '@/lib/types';

function rawLessonForm(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const slugRaw = String(formData.get('slug') ?? '').trim();

  return {
    module_id: String(formData.get('module_id') ?? '').trim(),
    title,
    slug: slugify(slugRaw || title),
    description: String(formData.get('description') ?? '').trim() || null,
    content_type: String(formData.get('content_type') ?? 'video'),
    video_provider: String(formData.get('video_provider') ?? 'youtube'),
    video_ref: String(formData.get('video_ref') ?? '').trim() || null,
    duration_seconds: parseNumberOrNull(formData.get('duration_seconds')) ?? 0,
    is_required: formData.get('is_required') === 'true',
    keywords: parseTagsList(formData.get('keywords')),
    resources: parseLessonResources(String(formData.get('resources') ?? '')),
    thumbnail_url: String(formData.get('thumbnail_url') ?? '').trim() || null,
    status: String(formData.get('status') ?? 'draft'),
  };
}

export async function createLesson(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const raw = rawLessonForm(formData);

  const parsed = trainingLessonSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/admin/treinamentos/aulas/nova?modulo=${raw.module_id}&erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from('training_lessons')
    .select('id', { count: 'exact', head: true })
    .eq('module_id', parsed.data.module_id);

  const { data: created, error } = await supabase
    .from('training_lessons')
    .insert({ ...parsed.data, order_index: count ?? 0 })
    .select('id')
    .single();

  if (error) {
    redirect(
      `/admin/treinamentos/aulas/nova?modulo=${raw.module_id}&erro=${encodeURIComponent(friendlyDbError(error, 'uma aula (verifique se o slug já existe)'))}`
    );
  }

  await logAuditEvent({ userId: ctx.userId, action: 'create', entity: 'training_lessons', entityId: created.id, metadata: { title: parsed.data.title } });

  revalidatePath('/admin/treinamentos');
  revalidatePath('/treinamentos');
  redirect(`/admin/treinamentos/modulos/${parsed.data.module_id}`);
}

export async function updateLesson(id: string, formData: FormData): Promise<void> {
  const ctx = await requireAdmin();
  const raw = rawLessonForm(formData);

  const parsed = trainingLessonSchema.safeParse(raw);
  if (!parsed.success) {
    redirect(`/admin/treinamentos/aulas/${id}/editar?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from('training_lessons').update(parsed.data).eq('id', id);
  if (error) {
    redirect(`/admin/treinamentos/aulas/${id}/editar?erro=${encodeURIComponent(friendlyDbError(error, 'uma aula (verifique se o slug já existe)'))}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'update', entity: 'training_lessons', entityId: id, metadata: { title: parsed.data.title } });

  revalidatePath('/admin/treinamentos');
  revalidatePath('/treinamentos');
  redirect(`/admin/treinamentos/modulos/${parsed.data.module_id}`);
}

export async function deleteLesson(id: string, moduleId: string): Promise<void> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: before } = await supabase.from('training_lessons').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('training_lessons').delete().eq('id', id);
  if (error) {
    throw new Error(`Erro ao excluir aula: ${error.message}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'delete', entity: 'training_lessons', entityId: id, metadata: { deleted: before } });

  revalidatePath('/admin/treinamentos');
  revalidatePath('/treinamentos');
  revalidatePath(`/admin/treinamentos/modulos/${moduleId}`);
}

export async function toggleLessonStatus(id: string, status: 'draft' | 'published' | 'archived'): Promise<void> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from('training_lessons').update({ status }).eq('id', id);
  if (error) {
    throw new Error(`Erro ao alterar status da aula: ${error.message}`);
  }

  await logAuditEvent({
    userId: ctx.userId,
    action: status === 'published' ? 'publish' : status === 'archived' ? 'archive' : 'unpublish',
    entity: 'training_lessons',
    entityId: id,
    metadata: { status },
  });

  revalidatePath('/admin/treinamentos');
  revalidatePath('/treinamentos');
}

export async function moveLesson(id: string, moduleId: string, direction: 'up' | 'down'): Promise<void> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase.from('training_lessons').select('id, order_index').eq('module_id', moduleId).order('order_index');
  const list = (data ?? []) as Pick<TrainingLesson, 'id' | 'order_index'>[];
  const index = list.findIndex((l) => l.id === id);
  if (index === -1) return;

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= list.length) return;

  const current = list[index];
  const swapWith = list[swapIndex];

  await Promise.all([
    supabase.from('training_lessons').update({ order_index: swapWith.order_index }).eq('id', current.id),
    supabase.from('training_lessons').update({ order_index: current.order_index }).eq('id', swapWith.id),
  ]);

  await logAuditEvent({ userId: ctx.userId, action: 'reorder', entity: 'training_lessons', entityId: id, metadata: { direction } });

  revalidatePath('/admin/treinamentos');
  revalidatePath(`/admin/treinamentos/modulos/${moduleId}`);
  revalidatePath('/treinamentos');
}
