'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { PromotionType, PromotionStatus } from '@/lib/types';

// Único parser de formulário reaproveitado por create/update — evita
// duplicar a leitura de FormData em dois lugares que podem divergir.
function parsePromotionForm(formData: FormData) {
  const title = String(formData.get('title') ?? '').trim();
  const type = String(formData.get('type') ?? 'passagem') as PromotionType;
  const program = String(formData.get('program') ?? '').trim() || null;
  const bonusPercentageRaw = String(formData.get('bonus_percentage') ?? '').trim();
  const bonus_percentage = bonusPercentageRaw ? Number(bonusPercentageRaw) : null;
  const start_date = String(formData.get('start_date') ?? '').trim() || null;
  const end_date = String(formData.get('end_date') ?? '').trim() || null;
  const rules = String(formData.get('rules') ?? '').trim() || null;
  const url = String(formData.get('url') ?? '').trim() || null;
  const scoreRaw = String(formData.get('score') ?? '0').trim();
  const score = scoreRaw ? Math.max(0, Math.min(100, Number(scoreRaw) || 0)) : 0;
  const status = String(formData.get('status') ?? 'ativa') as PromotionStatus;

  if (!title) {
    throw new Error('Título é obrigatório.');
  }

  return { title, type, program, bonus_percentage, start_date, end_date, rules, url, score, status };
}

export async function createPromotion(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const values = parsePromotionForm(formData);

  const { error } = await supabase.from('promotions').insert(values);
  if (error) {
    throw new Error(`Erro ao criar promoção: ${error.message}`);
  }

  revalidatePath('/admin/promocoes');
  redirect('/admin/promocoes');
}

export async function updatePromotion(id: string, formData: FormData): Promise<void> {
  const supabase = await createClient();
  const values = parsePromotionForm(formData);

  const { error } = await supabase.from('promotions').update(values).eq('id', id);
  if (error) {
    throw new Error(`Erro ao atualizar promoção: ${error.message}`);
  }

  revalidatePath('/admin/promocoes');
  redirect('/admin/promocoes');
}

export async function deletePromotion(id: string): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.from('promotions').delete().eq('id', id);
  if (error) {
    throw new Error(`Erro ao excluir promoção: ${error.message}`);
  }

  revalidatePath('/admin/promocoes');
}
