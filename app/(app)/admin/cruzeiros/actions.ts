'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import { logAuditEvent } from '@/lib/audit-log';
import { friendlyDbError } from '@/lib/db-errors';
import { cruiseSchema, firstZodError, type CruiseInput } from '@/lib/validation/admin-schemas';
import { slugify, parseNumberOrNull } from '@/lib/utils';
import { evaluateCruise } from '@/lib/scoring/cruise-score';
import type { CruiseRegionTag } from '@/lib/types';

function rawCruiseForm(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const slugRaw = String(formData.get('slug') ?? '').trim();
  const slug = slugify(slugRaw || name);

  const confidenceRaw = parseNumberOrNull(formData.get('confidence_score')) ?? 0.5;
  const cabin = String(formData.get('cabin_category') ?? '').trim();

  return {
    name,
    slug,
    embarkation_destination_id: String(formData.get('embarkation_destination_id') ?? '').trim() || null,
    cruise_line: String(formData.get('cruise_line') ?? '').trim() || null,
    ship_name: String(formData.get('ship_name') ?? '').trim() || null,
    category: String(formData.get('category') ?? 'oceanico'),
    region_tags: formData.getAll('region_tags').map(String),
    route_description: String(formData.get('route_description') ?? '').trim() || null,
    nights: parseNumberOrNull(formData.get('nights')) ?? 1,
    ports_count: parseNumberOrNull(formData.get('ports_count')) ?? 0,
    cabin_category: cabin || null,
    price_from_cash: parseNumberOrNull(formData.get('price_from_cash')),
    price_currency: String(formData.get('price_currency') ?? 'BRL').trim() || 'BRL',
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

async function computeScoring(
  supabase: Awaited<ReturnType<typeof createClient>>,
  values: Pick<
    CruiseInput,
    'source_id' | 'category' | 'region_tags' | 'nights' | 'ports_count' | 'verification_status' | 'confidence_score' | 'route_description' | 'cover_image_url'
  >
) {
  let sourceAuthorityLevel = 0;
  if (values.source_id) {
    const { data } = await supabase.from('sources').select('authority_level').eq('id', values.source_id).maybeSingle();
    if (data) sourceAuthorityLevel = data.authority_level as number;
  }

  const result = evaluateCruise({
    category: values.category,
    regionTags: values.region_tags as CruiseRegionTag[],
    nights: values.nights,
    portsCount: values.ports_count,
    verificationStatus: values.verification_status,
    confidenceScore: values.confidence_score,
    sourceAuthorityLevel,
    hasDescription: Boolean(values.route_description),
    hasCoverImage: Boolean(values.cover_image_url),
  });

  return { cruise_score: result.score };
}

export async function createCruise(formData: FormData): Promise<void> {
  const ctx = await requireAdmin();

  const parsed = cruiseSchema.safeParse(rawCruiseForm(formData));
  if (!parsed.success) {
    redirect(`/admin/cruzeiros/novo?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const scoring = await computeScoring(supabase, parsed.data);
  const now = new Date().toISOString();

  const { data: created, error } = await supabase
    .from('cruises')
    .insert({ ...parsed.data, ...scoring, retrieved_at: now, last_verified_at: parsed.data.verification_status === 'verified' ? now : null })
    .select('id')
    .single();

  if (error) {
    redirect(`/admin/cruzeiros/novo?erro=${encodeURIComponent(friendlyDbError(error, 'um cruzeiro (verifique se o slug já existe)'))}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'create', entity: 'cruises', entityId: created.id, metadata: { name: parsed.data.name } });

  revalidatePath('/admin/cruzeiros');
  revalidatePath('/cruzeiros');
  redirect('/admin/cruzeiros');
}

export async function updateCruise(id: string, formData: FormData): Promise<void> {
  const ctx = await requireAdmin();

  const parsed = cruiseSchema.safeParse(rawCruiseForm(formData));
  if (!parsed.success) {
    redirect(`/admin/cruzeiros/${id}/editar?erro=${encodeURIComponent(firstZodError(parsed))}`);
  }

  const supabase = await createClient();
  const scoring = await computeScoring(supabase, parsed.data);
  const now = new Date().toISOString();

  const { data: before } = await supabase.from('cruises').select('verification_status').eq('id', id).maybeSingle();
  const becameVerified = parsed.data.verification_status === 'verified' && before?.verification_status !== 'verified';

  const { error } = await supabase
    .from('cruises')
    .update({ ...parsed.data, ...scoring, ...(becameVerified ? { last_verified_at: now } : {}) })
    .eq('id', id);

  if (error) {
    redirect(`/admin/cruzeiros/${id}/editar?erro=${encodeURIComponent(friendlyDbError(error, 'um cruzeiro (verifique se o slug já existe)'))}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'update', entity: 'cruises', entityId: id, metadata: { name: parsed.data.name } });

  revalidatePath('/admin/cruzeiros');
  revalidatePath('/cruzeiros');
  redirect('/admin/cruzeiros');
}

export async function deleteCruise(id: string): Promise<void> {
  const ctx = await requireAdmin();
  const supabase = await createClient();

  const { data: before } = await supabase.from('cruises').select('*').eq('id', id).maybeSingle();

  const { error } = await supabase.from('cruises').delete().eq('id', id);
  if (error) {
    throw new Error(`Erro ao excluir cruzeiro: ${error.message}`);
  }

  await logAuditEvent({ userId: ctx.userId, action: 'delete', entity: 'cruises', entityId: id, metadata: { deleted: before } });

  revalidatePath('/admin/cruzeiros');
  revalidatePath('/cruzeiros');
}
