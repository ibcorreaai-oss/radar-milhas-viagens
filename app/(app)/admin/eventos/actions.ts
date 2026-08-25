'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { logAuditEvent } from '@/lib/audit-log';
import { slugify, parseTagsList, parseNumberOrNull } from '@/lib/utils';
import { evaluateExperience, deriveBookNowState, daysUntil } from '@/lib/scoring/event-score';
import type { EventSignificance, EventStatus } from '@/lib/types';

// Único parser de formulário reaproveitado por create/update — mesmo
// padrão de admin/promocoes/actions.ts.
function parseEventForm(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const slugRaw = String(formData.get('slug') ?? '').trim();
  const category_id = String(formData.get('category_id') ?? '').trim() || null;
  const destination_id = String(formData.get('destination_id') ?? '').trim() || null;
  const source_id = String(formData.get('source_id') ?? '').trim() || null;
  const description = String(formData.get('description') ?? '').trim() || null;
  const significance = (String(formData.get('significance') ?? '').trim() || null) as EventSignificance | null;
  const start_date = String(formData.get('start_date') ?? '').trim() || null;
  const end_date = String(formData.get('end_date') ?? '').trim() || null;
  const status = String(formData.get('status') ?? 'em_monitoramento') as EventStatus;
  const once_in_a_lifetime = formData.get('once_in_a_lifetime') === 'true';
  const hidden_gem = formData.get('hidden_gem') === 'true';
  const featured = formData.get('featured') === 'true';
  const is_mock = formData.get('is_mock') === 'true';
  const source_url = String(formData.get('source_url') ?? '').trim() || null;
  const cover_image_url = String(formData.get('cover_image_url') ?? '').trim() || null;
  const tags = parseTagsList(formData.get('tags'));
  const confidenceRaw = parseNumberOrNull(formData.get('confidence_score')) ?? 0.5;
  const confidence_score = Math.max(0, Math.min(1, confidenceRaw));

  if (!title) {
    throw new Error('Título é obrigatório.');
  }

  const slug = slugify(slugRaw || title);
  if (!slug) {
    throw new Error('Não foi possível gerar um slug válido a partir do título.');
  }

  return {
    title,
    slug,
    category_id,
    destination_id,
    source_id,
    description,
    significance,
    start_date,
    end_date,
    status,
    once_in_a_lifetime,
    hidden_gem,
    featured,
    is_mock,
    source_url,
    cover_image_url,
    tags,
    confidence_score,
  };
}

// Score e Book Now State são sempre calculados pelo motor
// (lib/scoring/event-score.ts) — nunca inputs manuais do admin, pra nunca
// divergir da explicação mostrada ao usuário (ver ARCHITECTURE.md #4).
async function computeScoring(
  supabase: Awaited<ReturnType<typeof createClient>>,
  values: ReturnType<typeof parseEventForm>
) {
  let sourceAuthorityLevel = 5;
  if (values.source_id) {
    const { data } = await supabase
      .from('sources')
      .select('authority_level')
      .eq('id', values.source_id)
      .maybeSingle();
    if (data) sourceAuthorityLevel = data.authority_level as number;
  }

  const result = evaluateExperience({
    significance: values.significance,
    hiddenGem: values.hidden_gem,
    onceInLifetime: values.once_in_a_lifetime,
    status: values.status,
    confidenceScore: values.confidence_score,
    daysUntilStart: daysUntil(values.start_date),
    sourceAuthorityLevel,
  });

  return {
    experience_score: result.score,
    book_now_state: deriveBookNowState(result.score, result.urgency, values.status),
  };
}

export async function createEvent(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const values = parseEventForm(formData);
  const scoring = await computeScoring(supabase, values);
  const now = new Date().toISOString();

  const { error } = await supabase.from('world_events').insert({
    ...values,
    ...scoring,
    last_checked_at: now,
    last_changed_at: now,
  });

  if (error) {
    throw new Error(`Erro ao criar evento: ${error.message}`);
  }

  revalidatePath('/admin/eventos');
  revalidatePath('/descobrir');
  redirect('/admin/eventos');
}

export async function updateEvent(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const values = parseEventForm(formData);
  const scoring = await computeScoring(supabase, values);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('world_events')
    .update({ ...values, ...scoring, last_checked_at: now, last_changed_at: now })
    .eq('id', id);

  if (error) {
    throw new Error(`Erro ao atualizar evento: ${error.message}`);
  }

  revalidatePath('/admin/eventos');
  revalidatePath('/descobrir');
  redirect('/admin/eventos');
}

export async function deleteEvent(id: string): Promise<void> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: before } = await supabase.from('world_events').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('world_events').delete().eq('id', id);
  if (error) {
    throw new Error(`Erro ao excluir evento: ${error.message}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'delete', entity: 'world_events', entityId: id, metadata: { deleted: before } });

  revalidatePath('/admin/eventos');
  revalidatePath('/descobrir');
}
