'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { logAuditEvent } from '@/lib/audit-log';
import { friendlyDbError } from '@/lib/db-errors';
import { worldEventSchema, firstZodError, type WorldEventInput } from '@/lib/validation/admin-schemas';
import { slugify, parseTagsList, parseNumberOrNull } from '@/lib/utils';
import { evaluateExperience, deriveBookNowState, daysUntil } from '@/lib/scoring/event-score';

// Monta o objeto bruto a partir do FormData — validação de verdade é feita
// pelo Zod em worldEventSchema, fonte única compartilhada por create/update.
// O slug é resolvido ANTES de validar (usa o título como fallback), pra o
// schema receber sempre uma string, nunca vazio.
function rawEventForm(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const slugRaw = String(formData.get('slug') ?? '').trim();
  const slug = slugify(slugRaw || title);

  const confidenceRaw = parseNumberOrNull(formData.get('confidence_score')) ?? 0.5;

  return {
    title,
    slug,
    category_id: String(formData.get('category_id') ?? '').trim() || null,
    destination_id: String(formData.get('destination_id') ?? '').trim() || null,
    source_id: String(formData.get('source_id') ?? '').trim() || null,
    description: String(formData.get('description') ?? '').trim() || null,
    significance: String(formData.get('significance') ?? '').trim() || null,
    start_date: String(formData.get('start_date') ?? '').trim() || null,
    end_date: String(formData.get('end_date') ?? '').trim() || null,
    status: String(formData.get('status') ?? 'em_monitoramento'),
    once_in_a_lifetime: formData.get('once_in_a_lifetime') === 'true',
    hidden_gem: formData.get('hidden_gem') === 'true',
    featured: formData.get('featured') === 'true',
    is_mock: formData.get('is_mock') === 'true',
    source_url: String(formData.get('source_url') ?? '').trim() || null,
    cover_image_url: String(formData.get('cover_image_url') ?? '').trim() || null,
    tags: parseTagsList(formData.get('tags')),
    confidence_score: Math.max(0, Math.min(1, confidenceRaw)),
  };
}

// Score e Book Now State são sempre calculados pelo motor
// (lib/scoring/event-score.ts) — nunca inputs manuais do admin, pra nunca
// divergir da explicação mostrada ao usuário (ver ARCHITECTURE.md #4).
async function computeScoring(
  supabase: Awaited<ReturnType<typeof createClient>>,
  values: Pick<
    WorldEventInput,
    'source_id' | 'significance' | 'hidden_gem' | 'once_in_a_lifetime' | 'status' | 'confidence_score' | 'start_date'
  >
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
  const ctx = await requireAdmin();

  const parsed = worldEventSchema.safeParse(rawEventForm(formData));
  if (!parsed.success) {
    redirect(`/admin/eventos/nova?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const scoring = await computeScoring(supabase, parsed.data);
  const now = new Date().toISOString();

  const { data: created, error } = await supabase
    .from('world_events')
    .insert({ ...parsed.data, ...scoring, last_checked_at: now, last_changed_at: now })
    .select('id')
    .single();

  if (error) {
    redirect(`/admin/eventos/nova?erro=${encodeURIComponent(friendlyDbError(error, 'um evento (verifique se o slug já existe)'))}`);
  }

  // ETAPA 15.1 (ver GROWTH.md) — só delete era auditado até aqui; create/
  // update de conteúdo do admin ficavam fora do histórico consultável em
  // /admin/auditoria.
  await logAuditEvent({
    userId: ctx.userId,
    action: 'create',
    entity: 'world_events',
    entityId: created.id,
    metadata: { title: parsed.data.title },
  });

  revalidatePath('/admin/eventos');
  revalidatePath('/descobrir');
  redirect('/admin/eventos');
}

export async function updateEvent(id: string, formData: FormData): Promise<void> {
  const ctx = await requireAdmin();

  const parsed = worldEventSchema.safeParse(rawEventForm(formData));
  if (!parsed.success) {
    redirect(`/admin/eventos/${id}/editar?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const scoring = await computeScoring(supabase, parsed.data);
  const now = new Date().toISOString();

  const { error } = await supabase
    .from('world_events')
    .update({ ...parsed.data, ...scoring, last_checked_at: now, last_changed_at: now })
    .eq('id', id);

  if (error) {
    redirect(`/admin/eventos/${id}/editar?erro=${encodeURIComponent(friendlyDbError(error, 'um evento (verifique se o slug já existe)'))}`);
  }

  await logAuditEvent({
    userId: ctx.userId,
    action: 'update',
    entity: 'world_events',
    entityId: id,
    metadata: { title: parsed.data.title },
  });

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
