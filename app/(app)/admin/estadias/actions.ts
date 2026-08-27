'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { logAuditEvent } from '@/lib/audit-log';
import { friendlyDbError } from '@/lib/db-errors';
import { staySchema, firstZodError, type StayInput } from '@/lib/validation/admin-schemas';
import { slugify, parseNumberOrNull } from '@/lib/utils';
import { evaluateStay } from '@/lib/scoring/stay-score';
import type { ExperienceTag } from '@/lib/types';

function rawStayForm(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const slugRaw = String(formData.get('slug') ?? '').trim();
  const slug = slugify(slugRaw || name);

  const confidenceRaw = parseNumberOrNull(formData.get('confidence_score')) ?? 0.5;

  return {
    name,
    slug,
    destination_id: String(formData.get('destination_id') ?? '').trim() || null,
    category: String(formData.get('category') ?? 'hotel'),
    experience_tags: formData.getAll('experience_tags').map(String),
    description: String(formData.get('description') ?? '').trim() || null,
    price_from_cash: parseNumberOrNull(formData.get('price_from_cash')),
    price_currency: String(formData.get('price_currency') ?? 'BRL').trim() || 'BRL',
    price_unit: String(formData.get('price_unit') ?? 'diaria'),
    best_season: String(formData.get('best_season') ?? '').trim() || null,
    source_id: String(formData.get('source_id') ?? '').trim() || null,
    source_url: String(formData.get('source_url') ?? '').trim() || null,
    verification_status: String(formData.get('verification_status') ?? 'mock'),
    confidence_score: Math.max(0, Math.min(1, confidenceRaw)),
    is_mock: formData.get('is_mock') === 'true',
    cover_image_url: String(formData.get('cover_image_url') ?? '').trim() || null,
    featured: formData.get('featured') === 'true',
    active: formData.get('active') !== 'false',
  };
}

// Stay Score é sempre calculado pelo motor (lib/scoring/stay-score.ts) —
// nunca input manual do admin, mesmo princípio do Experience Score.
async function computeScoring(
  supabase: Awaited<ReturnType<typeof createClient>>,
  values: Pick<StayInput, 'source_id' | 'category' | 'experience_tags' | 'verification_status' | 'confidence_score' | 'description' | 'cover_image_url'>
) {
  let sourceAuthorityLevel = 0;
  if (values.source_id) {
    const { data } = await supabase.from('sources').select('authority_level').eq('id', values.source_id).maybeSingle();
    if (data) sourceAuthorityLevel = data.authority_level as number;
  }

  const result = evaluateStay({
    category: values.category,
    experienceTags: values.experience_tags as ExperienceTag[],
    verificationStatus: values.verification_status,
    confidenceScore: values.confidence_score,
    sourceAuthorityLevel,
    hasDescription: Boolean(values.description),
    hasCoverImage: Boolean(values.cover_image_url),
  });

  return { stay_score: result.score };
}

export async function createStay(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();

  const parsed = staySchema.safeParse(rawStayForm(formData));
  if (!parsed.success) {
    redirect(`/admin/estadias/nova?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const scoring = await computeScoring(supabase, parsed.data);
  const now = new Date().toISOString();

  const { data: created, error } = await supabase
    .from('stays')
    .insert({ ...parsed.data, ...scoring, retrieved_at: now, last_verified_at: parsed.data.verification_status === 'verified' ? now : null })
    .select('id')
    .single();

  if (error) {
    redirect(`/admin/estadias/nova?erro=${encodeURIComponent(friendlyDbError(error, 'uma hospedagem (verifique se o slug já existe)'))}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'create', entity: 'stays', entityId: created.id, metadata: { name: parsed.data.name } });

  revalidatePath('/admin/estadias');
  revalidatePath('/estadias');
  redirect('/admin/estadias');
}

export async function updateStay(id: string, formData: FormData): Promise<void> {
  const ctx = await requireAdmin();

  const parsed = staySchema.safeParse(rawStayForm(formData));
  if (!parsed.success) {
    redirect(`/admin/estadias/${id}/editar?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const scoring = await computeScoring(supabase, parsed.data);
  const now = new Date().toISOString();

  const { data: before } = await supabase.from('stays').select('verification_status, last_verified_at').eq('id', id).maybeSingle();
  const becameVerified = parsed.data.verification_status === 'verified' && before?.verification_status !== 'verified';

  const { error } = await supabase
    .from('stays')
    .update({
      ...parsed.data,
      ...scoring,
      ...(becameVerified ? { last_verified_at: now } : {}),
    })
    .eq('id', id);

  if (error) {
    redirect(`/admin/estadias/${id}/editar?erro=${encodeURIComponent(friendlyDbError(error, 'uma hospedagem (verifique se o slug já existe)'))}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'update', entity: 'stays', entityId: id, metadata: { name: parsed.data.name } });

  revalidatePath('/admin/estadias');
  revalidatePath('/estadias');
  redirect('/admin/estadias');
}

export async function deleteStay(id: string): Promise<void> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: before } = await supabase.from('stays').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('stays').delete().eq('id', id);
  if (error) {
    throw new Error(`Erro ao excluir hospedagem: ${error.message}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'delete', entity: 'stays', entityId: id, metadata: { deleted: before } });

  revalidatePath('/admin/estadias');
  revalidatePath('/estadias');
}
