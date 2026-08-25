'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { logAuditEvent } from '@/lib/audit-log';
import { friendlyDbError } from '@/lib/db-errors';
import { loyaltyProgramSchema, firstZodError } from '@/lib/validation/admin-schemas';

// Monta o objeto bruto a partir do FormData — validação de verdade é feita
// pelo Zod em loyaltyProgramSchema, fonte única compartilhada por
// create/update.
function rawLoyaltyProgramForm(formData: FormData) {
  const transferPartnersRaw = String(formData.get('transfer_partners') ?? '').trim();

  return {
    name: String(formData.get('name') ?? '').trim(),
    type: String(formData.get('type') ?? 'companhia_aerea'),
    country: String(formData.get('country') ?? 'BR').trim() || 'BR',
    average_mile_value: Number(String(formData.get('average_mile_value') ?? '0').trim() || '0') || 0,
    // Parceiros de transferência vêm de um textarea com valores separados
    // por vírgula — convertido para array text[] antes da validação.
    transfer_partners: transferPartnersRaw
      ? transferPartnersRaw.split(',').map((s) => s.trim()).filter(Boolean)
      : [],
    validity_notes: String(formData.get('validity_notes') ?? '').trim() || null,
    notes: String(formData.get('notes') ?? '').trim() || null,
    active: formData.get('active') === 'true',
  };
}

export async function createLoyaltyProgram(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();

  const parsed = loyaltyProgramSchema.safeParse(rawLoyaltyProgramForm(formData));
  if (!parsed.success) {
    redirect(`/admin/programas/nova?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase.from('loyalty_programs').insert(parsed.data).select('id').single();
  if (error) {
    redirect(`/admin/programas/nova?erro=${encodeURIComponent(friendlyDbError(error, 'um programa'))}`);
  }

  await logAuditEvent({
    userId: ctx.userId,
    action: 'create',
    entity: 'loyalty_programs',
    entityId: created.id,
    metadata: { name: parsed.data.name },
  });

  revalidatePath('/admin/programas');
  redirect('/admin/programas');
}

export async function updateLoyaltyProgram(id: string, formData: FormData): Promise<void> {
  const ctx = await requireAdmin();

  const parsed = loyaltyProgramSchema.safeParse(rawLoyaltyProgramForm(formData));
  if (!parsed.success) {
    redirect(`/admin/programas/${id}/editar?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from('loyalty_programs').update(parsed.data).eq('id', id);
  if (error) {
    redirect(`/admin/programas/${id}/editar?erro=${encodeURIComponent(friendlyDbError(error, 'um programa'))}`);
  }

  await logAuditEvent({
    userId: ctx.userId,
    action: 'update',
    entity: 'loyalty_programs',
    entityId: id,
    metadata: { name: parsed.data.name },
  });

  revalidatePath('/admin/programas');
  redirect('/admin/programas');
}

export async function deleteLoyaltyProgram(id: string): Promise<void> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: before } = await supabase.from('loyalty_programs').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('loyalty_programs').delete().eq('id', id);
  if (error) {
    throw new Error(`Erro ao excluir programa: ${error.message}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'delete', entity: 'loyalty_programs', entityId: id, metadata: { deleted: before } });

  revalidatePath('/admin/programas');
}
