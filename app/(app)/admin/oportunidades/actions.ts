'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { OpportunityType } from '@/lib/types';

function parseOpportunityForm(formData: FormData) {
  const type = String(formData.get('type') ?? 'voo') as OpportunityType;
  const title = String(formData.get('title') ?? '').trim();
  const description = String(formData.get('description') ?? '').trim() || null;
  const origin = String(formData.get('origin') ?? '').trim().toUpperCase() || null;
  const destination = String(formData.get('destination') ?? '').trim().toUpperCase() || null;
  const city = String(formData.get('city') ?? '').trim() || null;
  const cashPriceRaw = String(formData.get('cash_price') ?? '').trim();
  const cash_price = cashPriceRaw ? Number(cashPriceRaw) : null;
  const pointsPriceRaw = String(formData.get('points_price') ?? '').trim();
  const points_price = pointsPriceRaw ? Number(pointsPriceRaw) : null;
  const taxesRaw = String(formData.get('taxes') ?? '0').trim();
  const taxes = taxesRaw ? Number(taxesRaw) || 0 : 0;
  const loyalty_program = String(formData.get('loyalty_program') ?? '').trim() || null;
  const scoreRaw = String(formData.get('score') ?? '0').trim();
  const score = scoreRaw ? Math.max(0, Math.min(100, Number(scoreRaw) || 0)) : 0;
  const recommendation = String(formData.get('recommendation') ?? '').trim() || null;
  const featured = formData.get('featured') === 'true';
  // Vem de um <input type="datetime-local"> — string "YYYY-MM-DDTHH:mm" que
  // o Postgres aceita direto numa coluna timestamptz.
  const expires_at = String(formData.get('expires_at') ?? '').trim() || null;
  const source = String(formData.get('source') ?? 'manual').trim() || 'manual';
  const affiliate_url = String(formData.get('affiliate_url') ?? '').trim() || null;
  const affiliate_provider = String(formData.get('affiliate_provider') ?? '').trim() || null;
  const commission_type = String(formData.get('commission_type') ?? '').trim() || null;
  const tracking_id = String(formData.get('tracking_id') ?? '').trim() || null;

  if (!title) {
    throw new Error('Título é obrigatório.');
  }

  return {
    type,
    title,
    description,
    origin,
    destination,
    city,
    cash_price,
    points_price,
    taxes,
    loyalty_program,
    score,
    recommendation,
    featured,
    expires_at,
    source,
    affiliate_url,
    affiliate_provider,
    commission_type,
    tracking_id,
  };
}

export async function createOpportunity(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const values = parseOpportunityForm(formData);

  const { error } = await supabase.from('opportunities').insert(values);
  if (error) {
    throw new Error(`Erro ao criar oportunidade: ${error.message}`);
  }

  revalidatePath('/admin/oportunidades');
  redirect('/admin/oportunidades');
}

export async function updateOpportunity(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const values = parseOpportunityForm(formData);

  const { error } = await supabase.from('opportunities').update(values).eq('id', id);
  if (error) {
    throw new Error(`Erro ao atualizar oportunidade: ${error.message}`);
  }

  revalidatePath('/admin/oportunidades');
  redirect('/admin/oportunidades');
}

export async function deleteOpportunity(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('opportunities').delete().eq('id', id);
  if (error) {
    throw new Error(`Erro ao excluir oportunidade: ${error.message}`);
  }

  revalidatePath('/admin/oportunidades');
}

export async function toggleFeatured(id: string, featured: boolean): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('opportunities').update({ featured: !featured }).eq('id', id);
  if (error) {
    throw new Error(`Erro ao atualizar destaque: ${error.message}`);
  }

  revalidatePath('/admin/oportunidades');
}
