'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserContext } from '@/lib/auth';
import { isBlocked } from '@/lib/roles';
import { getOrCreateDefaultBucketList } from '@/lib/bucket-list';
import type { Trip } from '@/lib/types';

async function requireOwnedTrip(tripId: string): Promise<{ ctx: NonNullable<Awaited<ReturnType<typeof getUserContext>>>; supabase: Awaited<ReturnType<typeof createClient>> }> {
  const ctx = await getUserContext();
  if (!ctx || isBlocked(ctx.profile)) throw new Error('Faça login.');
  const supabase = await createClient();
  // RLS já restringe a linhas do próprio dono — esta checagem explícita só
  // dá um erro mais claro em vez de um "not found" genérico.
  const { data } = await supabase.from('trips').select('user_id').eq('id', tripId).maybeSingle();
  if (!data || data.user_id !== ctx.userId) throw new Error('Viagem não encontrada.');
  return { ctx, supabase };
}

export async function duplicateTrip(tripId: string): Promise<void> {
  const { ctx, supabase } = await requireOwnedTrip(tripId);

  const { data: original, error: loadError } = await supabase.from('trips').select('*').eq('id', tripId).single();
  if (loadError || !original) throw new Error('Erro ao carregar a viagem original.');

  const trip = original as Trip;
  const { data: created, error: insertError } = await supabase
    .from('trips')
    .insert({
      user_id: ctx.userId,
      title: `${trip.title} (cópia)`,
      origin: trip.origin,
      destination: trip.destination,
      start_date: trip.start_date,
      end_date: trip.end_date,
      travelers_adults: trip.travelers_adults,
      travelers_children: trip.travelers_children,
      budget_total: trip.budget_total,
      interests: trip.interests,
      pace: trip.pace,
      variant: trip.variant,
      optimizations: trip.optimizations,
      itinerary: trip.itinerary,
      budget_breakdown: trip.budget_breakdown,
      summary: trip.summary,
      ai_generated: trip.ai_generated,
    })
    .select('id')
    .single();

  if (insertError || !created) throw new Error(`Erro ao duplicar a viagem: ${insertError?.message}`);

  revalidatePath('/viagens');
  redirect(`/viagens/${created.id}`);
}

export async function toggleArchiveTrip(tripId: string, currentStatus: 'ativa' | 'arquivada'): Promise<void> {
  const { supabase } = await requireOwnedTrip(tripId);
  const nextStatus = currentStatus === 'ativa' ? 'arquivada' : 'ativa';
  const { error } = await supabase.from('trips').update({ status: nextStatus }).eq('id', tripId);
  if (error) throw new Error(`Erro ao atualizar a viagem: ${error.message}`);

  revalidatePath('/viagens');
  revalidatePath(`/viagens/${tripId}`);
}

export async function toggleShareTrip(tripId: string, currentlyShared: boolean): Promise<void> {
  const { supabase } = await requireOwnedTrip(tripId);
  const { error } = await supabase.from('trips').update({ is_shared: !currentlyShared }).eq('id', tripId);
  if (error) throw new Error(`Erro ao atualizar o compartilhamento: ${error.message}`);

  revalidatePath(`/viagens/${tripId}`);
}

export async function deleteTrip(tripId: string): Promise<void> {
  const { supabase } = await requireOwnedTrip(tripId);
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) throw new Error(`Erro ao excluir a viagem: ${error.message}`);

  revalidatePath('/viagens');
  redirect('/viagens');
}

export async function saveTripToBucketList(tripId: string): Promise<void> {
  const { ctx, supabase } = await requireOwnedTrip(tripId);
  const bucketListId = await getOrCreateDefaultBucketList(ctx.userId);

  const { error } = await supabase.from('bucket_list_items').insert({ bucket_list_id: bucketListId, trip_id: tripId });

  // 23505 = unique_violation — já estava salva, não é erro do ponto de
  // vista do usuário (índice único bucket_list_items_unique_trip evita duplicata).
  if (error && error.code !== '23505') {
    throw new Error(`Erro ao salvar na Bucket List: ${error.message}`);
  }

  revalidatePath(`/viagens/${tripId}`);
  revalidatePath('/bucket-list');
}
