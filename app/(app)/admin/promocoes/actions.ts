'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { logAuditEvent } from '@/lib/audit-log';
import { friendlyDbError } from '@/lib/db-errors';
import { promotionSchema, firstZodError } from '@/lib/validation/admin-schemas';
import { parseNumberOrNull } from '@/lib/utils';

// Monta o objeto bruto a partir do FormData — validação de verdade é feita
// pelo Zod em promotionSchema, fonte única compartilhada por create/update.
function rawPromotionForm(formData: FormData) {
  return {
    title: String(formData.get('title') ?? '').trim(),
    type: String(formData.get('type') ?? 'passagem'),
    program: String(formData.get('program') ?? '').trim() || null,
    bonus_percentage: parseNumberOrNull(formData.get('bonus_percentage')),
    start_date: String(formData.get('start_date') ?? '').trim() || null,
    end_date: String(formData.get('end_date') ?? '').trim() || null,
    rules: String(formData.get('rules') ?? '').trim() || null,
    url: String(formData.get('url') ?? '').trim() || null,
    score: parseNumberOrNull(formData.get('score')) ?? 0,
    status: String(formData.get('status') ?? 'ativa'),
  };
}

export async function createPromotion(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();

  const parsed = promotionSchema.safeParse(rawPromotionForm(formData));
  if (!parsed.success) {
    redirect(`/admin/promocoes/nova?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase.from('promotions').insert(parsed.data).select('id').single();
  if (error) {
    redirect(`/admin/promocoes/nova?erro=${encodeURIComponent(friendlyDbError(error, 'uma promoção'))}`);
  }

  await logAuditEvent({
    userId: ctx.userId,
    action: 'create',
    entity: 'promotions',
    entityId: created.id,
    metadata: { title: parsed.data.title },
  });

  revalidatePath('/admin/promocoes');
  redirect('/admin/promocoes');
}

export async function updatePromotion(id: string, formData: FormData): Promise<void> {
  const ctx = await requireAdmin();

  const parsed = promotionSchema.safeParse(rawPromotionForm(formData));
  if (!parsed.success) {
    redirect(`/admin/promocoes/${id}/editar?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from('promotions').update(parsed.data).eq('id', id);
  if (error) {
    redirect(`/admin/promocoes/${id}/editar?erro=${encodeURIComponent(friendlyDbError(error, 'uma promoção'))}`);
  }

  await logAuditEvent({
    userId: ctx.userId,
    action: 'update',
    entity: 'promotions',
    entityId: id,
    metadata: { title: parsed.data.title },
  });

  revalidatePath('/admin/promocoes');
  redirect('/admin/promocoes');
}

export async function deletePromotion(id: string): Promise<void> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: before } = await supabase.from('promotions').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) {
    throw new Error(`Erro ao excluir promoção: ${error.message}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'delete', entity: 'promotions', entityId: id, metadata: { deleted: before } });

  revalidatePath('/admin/promocoes');
}
