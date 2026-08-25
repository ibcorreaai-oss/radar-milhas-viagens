'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { logAuditEvent } from '@/lib/audit-log';
import { friendlyDbError } from '@/lib/db-errors';
import { trainingModuleSchema, firstZodError } from '@/lib/validation/admin-schemas';
import { slugify } from '@/lib/utils';
import type { TrainingModule } from '@/lib/types';

function rawModuleForm(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const slugRaw = String(formData.get('slug') ?? '').trim();

  return {
    title,
    slug: slugify(slugRaw || title),
    description: String(formData.get('description') ?? '').trim() || null,
    status: String(formData.get('status') ?? 'draft'),
  };
}

export async function createModule(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();

  const parsed = trainingModuleSchema.safeParse(rawModuleForm(formData));
  if (!parsed.success) {
    redirect(`/admin/treinamentos/modulos/nova?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const { count } = await supabase.from('training_modules').select('id', { count: 'exact', head: true });

  const { data: created, error } = await supabase
    .from('training_modules')
    .insert({ ...parsed.data, order_index: count ?? 0 })
    .select('id')
    .single();

  if (error) {
    redirect(`/admin/treinamentos/modulos/nova?erro=${encodeURIComponent(friendlyDbError(error, 'um módulo (verifique se o slug já existe)'))}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'create', entity: 'training_modules', entityId: created.id, metadata: { title: parsed.data.title } });

  revalidatePath('/admin/treinamentos');
  revalidatePath('/treinamentos');
  redirect(`/admin/treinamentos/modulos/${created.id}`);
}

export async function updateModule(id: string, formData: FormData): Promise<void> {
  const ctx = await requireAdmin();

  const parsed = trainingModuleSchema.safeParse(rawModuleForm(formData));
  if (!parsed.success) {
    redirect(`/admin/treinamentos/modulos/${id}/editar?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from('training_modules').update(parsed.data).eq('id', id);
  if (error) {
    redirect(`/admin/treinamentos/modulos/${id}/editar?erro=${encodeURIComponent(friendlyDbError(error, 'um módulo (verifique se o slug já existe)'))}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'update', entity: 'training_modules', entityId: id, metadata: { title: parsed.data.title } });

  revalidatePath('/admin/treinamentos');
  revalidatePath('/treinamentos');
  redirect(`/admin/treinamentos/modulos/${id}`);
}

export async function deleteModule(id: string): Promise<void> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: before } = await supabase.from('training_modules').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('training_modules').delete().eq('id', id);
  if (error) {
    throw new Error(`Erro ao excluir módulo: ${error.message}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'delete', entity: 'training_modules', entityId: id, metadata: { deleted: before } });

  revalidatePath('/admin/treinamentos');
  revalidatePath('/treinamentos');
}

export async function toggleModuleStatus(id: string, status: 'draft' | 'published' | 'archived'): Promise<void> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from('training_modules').update({ status }).eq('id', id);
  if (error) {
    throw new Error(`Erro ao alterar status do módulo: ${error.message}`);
  }

  await logAuditEvent({
    userId: ctx.userId,
    action: status === 'published' ? 'publish' : status === 'archived' ? 'archive' : 'unpublish',
    entity: 'training_modules',
    entityId: id,
    metadata: { status },
  });

  revalidatePath('/admin/treinamentos');
  revalidatePath('/treinamentos');
}

// Reordenar troca order_index com o vizinho imediato (up/down) em vez de
// drag-and-drop — sem dependência nova de UI só pra isso, e o volume de
// módulos/aulas deste produto não justifica a complexidade extra.
export async function moveModule(id: string, direction: 'up' | 'down'): Promise<void> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data } = await supabase.from('training_modules').select('id, order_index').order('order_index');
  const list = (data ?? []) as Pick<TrainingModule, 'id' | 'order_index'>[];
  const index = list.findIndex((m) => m.id === id);
  if (index === -1) return;

  const swapIndex = direction === 'up' ? index - 1 : index + 1;
  if (swapIndex < 0 || swapIndex >= list.length) return;

  const current = list[index];
  const swapWith = list[swapIndex];

  await Promise.all([
    supabase.from('training_modules').update({ order_index: swapWith.order_index }).eq('id', current.id),
    supabase.from('training_modules').update({ order_index: current.order_index }).eq('id', swapWith.id),
  ]);

  await logAuditEvent({ userId: ctx.userId, action: 'reorder', entity: 'training_modules', entityId: id, metadata: { direction } });

  revalidatePath('/admin/treinamentos');
  revalidatePath('/treinamentos');
}
