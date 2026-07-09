'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/admin-guard';
import type { LoyaltyProgramType } from '@/lib/types';

function parseLoyaltyProgramForm(formData: FormData) {
  const name = String(formData.get('name') ?? '').trim();
  const type = String(formData.get('type') ?? 'companhia_aerea') as LoyaltyProgramType;
  const country = String(formData.get('country') ?? 'BR').trim() || 'BR';
  const averageMileValueRaw = String(formData.get('average_mile_value') ?? '0').trim();
  const average_mile_value = averageMileValueRaw ? Number(averageMileValueRaw) || 0 : 0;
  // Parceiros de transferência vêm de um textarea com valores separados por
  // vírgula — convertido para array text[] no submit.
  const transferPartnersRaw = String(formData.get('transfer_partners') ?? '').trim();
  const transfer_partners = transferPartnersRaw
    ? transferPartnersRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const validity_notes = String(formData.get('validity_notes') ?? '').trim() || null;
  const notes = String(formData.get('notes') ?? '').trim() || null;
  const active = formData.get('active') === 'true';

  if (!name) {
    throw new Error('Nome é obrigatório.');
  }

  return { name, type, country, average_mile_value, transfer_partners, validity_notes, notes, active };
}

export async function createLoyaltyProgram(formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const values = parseLoyaltyProgramForm(formData);

  const { error } = await supabase.from('loyalty_programs').insert(values);
  if (error) {
    throw new Error(`Erro ao criar programa: ${error.message}`);
  }

  revalidatePath('/admin/programas');
  redirect('/admin/programas');
}

export async function updateLoyaltyProgram(id: string, formData: FormData): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();
  const values = parseLoyaltyProgramForm(formData);

  const { error } = await supabase.from('loyalty_programs').update(values).eq('id', id);
  if (error) {
    throw new Error(`Erro ao atualizar programa: ${error.message}`);
  }

  revalidatePath('/admin/programas');
  redirect('/admin/programas');
}

export async function deleteLoyaltyProgram(id: string): Promise<void> {
  await requireAdmin();
  const supabase = await createClient();

  const { error } = await supabase.from('loyalty_programs').delete().eq('id', id);
  if (error) {
    throw new Error(`Erro ao excluir programa: ${error.message}`);
  }

  revalidatePath('/admin/programas');
}
