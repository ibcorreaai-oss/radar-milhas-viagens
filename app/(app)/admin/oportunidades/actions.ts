'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { logAuditEvent } from '@/lib/audit-log';
import { friendlyDbError } from '@/lib/db-errors';
import { opportunitySchema, firstZodError } from '@/lib/validation/admin-schemas';
import { parseNumberOrNull } from '@/lib/utils';

// Monta o objeto bruto a partir do FormData (sem validar ainda — validação
// é feita pelo Zod em opportunitySchema, uma única fonte de verdade
// compartilhada por create/update). Números viram number|null aqui porque
// o schema espera number de verdade, não string — FormData só entrega
// string.
function rawOpportunityForm(formData: FormData) {
  return {
    type: String(formData.get('type') ?? 'voo'),
    title: String(formData.get('title') ?? '').trim(),
    description: String(formData.get('description') ?? '').trim() || null,
    origin: String(formData.get('origin') ?? '').trim().toUpperCase() || null,
    destination: String(formData.get('destination') ?? '').trim().toUpperCase() || null,
    city: String(formData.get('city') ?? '').trim() || null,
    cash_price: parseNumberOrNull(formData.get('cash_price')),
    points_price: parseNumberOrNull(formData.get('points_price')),
    taxes: parseNumberOrNull(formData.get('taxes')) ?? 0,
    loyalty_program: String(formData.get('loyalty_program') ?? '').trim() || null,
    score: parseNumberOrNull(formData.get('score')) ?? 0,
    recommendation: String(formData.get('recommendation') ?? '').trim() || null,
    featured: formData.get('featured') === 'true',
    // O client (opportunity-form.tsx) já converte o <input type="datetime-local">
    // pra ISO/UTC antes de submeter — aqui só recebemos a string ISO pronta.
    expires_at: String(formData.get('expires_at') ?? '').trim() || null,
    source: String(formData.get('source') ?? 'manual').trim() || 'manual',
    affiliate_url: String(formData.get('affiliate_url') ?? '').trim() || null,
    affiliate_provider: String(formData.get('affiliate_provider') ?? '').trim() || null,
    commission_type: String(formData.get('commission_type') ?? '').trim() || null,
    tracking_id: String(formData.get('tracking_id') ?? '').trim() || null,
  };
}

export async function createOpportunity(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();

  const parsed = opportunitySchema.safeParse(rawOpportunityForm(formData));
  if (!parsed.success) {
    redirect(`/admin/oportunidades/nova?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase.from('opportunities').insert(parsed.data).select('id').single();
  if (error) {
    redirect(`/admin/oportunidades/nova?erro=${encodeURIComponent(friendlyDbError(error, 'uma oportunidade'))}`);
  }

  await logAuditEvent({
    userId: ctx.userId,
    action: 'create',
    entity: 'opportunities',
    entityId: created.id,
    metadata: { title: parsed.data.title },
  });

  revalidatePath('/admin/oportunidades');
  redirect('/admin/oportunidades');
}

export async function updateOpportunity(id: string, formData: FormData): Promise<void> {
  const ctx = await requireAdmin();

  const parsed = opportunitySchema.safeParse(rawOpportunityForm(formData));
  if (!parsed.success) {
    redirect(`/admin/oportunidades/${id}/editar?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.from('opportunities').update(parsed.data).eq('id', id);
  if (error) {
    redirect(`/admin/oportunidades/${id}/editar?erro=${encodeURIComponent(friendlyDbError(error, 'uma oportunidade'))}`);
  }

  await logAuditEvent({
    userId: ctx.userId,
    action: 'update',
    entity: 'opportunities',
    entityId: id,
    metadata: { title: parsed.data.title },
  });

  revalidatePath('/admin/oportunidades');
  redirect('/admin/oportunidades');
}

export async function deleteOpportunity(id: string): Promise<void> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: before } = await supabase.from('opportunities').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('opportunities').delete().eq('id', id);
  if (error) {
    throw new Error(`Erro ao excluir oportunidade: ${error.message}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'delete', entity: 'opportunities', entityId: id, metadata: { deleted: before } });

  revalidatePath('/admin/oportunidades');
}

export async function toggleFeatured(id: string, featured: boolean): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from('opportunities').update({ featured: !featured }).eq('id', id);
  if (error) {
    throw new Error(`Erro ao atualizar destaque: ${error.message}`);
  }

  revalidatePath('/admin/oportunidades');
}
