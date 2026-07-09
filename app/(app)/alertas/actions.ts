'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getUserContext } from '@/lib/auth';
import { PLANS, planAllowsMoreAlerts, planHasChannel } from '@/lib/plans';
import type { AlertType } from '@/lib/types';

// Server Action do formulário de criação de alerta (`<form action={createAlert}>`).
// O gate de plano (limite de alertas e canal WhatsApp) é sempre recalculado
// aqui no servidor — o formulário no client só desabilita a UI como
// conveniência, nunca é a fonte de verdade.
export async function createAlert(formData: FormData): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx) {
    redirect('/login');
  }

  const supabase = await createClient();

  const { count } = await supabase
    .from('alerts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', ctx.userId);

  if (!planAllowsMoreAlerts(ctx.plan, count ?? 0)) {
    redirect('/alertas?limite=1');
  }

  const type = (String(formData.get('type') ?? 'voo') || 'voo') as AlertType;
  const name = String(formData.get('name') ?? '').trim();

  if (!name) {
    redirect('/alertas?erro=nome_obrigatorio');
  }

  const originRaw = String(formData.get('origin') ?? '').trim().toUpperCase();
  const destinationRaw = String(formData.get('destination') ?? '').trim().toUpperCase();
  const cityRaw = String(formData.get('city') ?? '').trim();
  const startDateRaw = String(formData.get('start_date') ?? '').trim();
  const endDateRaw = String(formData.get('end_date') ?? '').trim();
  const flexibleDates = formData.get('flexible_dates') === 'true';
  const maxCashPriceRaw = String(formData.get('max_cash_price') ?? '').trim();
  const maxPointsPriceRaw = String(formData.get('max_points_price') ?? '').trim();
  const loyaltyProgramRaw = String(formData.get('loyalty_program') ?? '').trim();
  const cabinClassRaw = String(formData.get('cabin_class') ?? '').trim();
  const passengersRaw = String(formData.get('passengers') ?? '1').trim();

  const maxCashPrice =
    type !== 'transferencia' && maxCashPriceRaw ? Number(maxCashPriceRaw) : NaN;
  const maxPointsPrice = maxPointsPriceRaw ? Number(maxPointsPriceRaw) : NaN;

  const wantsWhatsapp = formData.get('channel_whatsapp') === 'true';
  // Defesa em profundidade: o switch de WhatsApp já vem desabilitado no
  // client se o plano não tiver o canal, mas o insert nunca confia só
  // nisso — o plano do usuário logado (recarregado do banco) manda.
  const channelWhatsapp = wantsWhatsapp && planHasChannel(ctx.plan, 'whatsapp');

  const { error } = await supabase.from('alerts').insert({
    user_id: ctx.userId,
    type,
    name,
    origin: type === 'voo' ? originRaw || null : null,
    destination: type === 'voo' ? destinationRaw || null : null,
    city: type === 'hotel' ? cityRaw || null : null,
    start_date: startDateRaw || null,
    end_date: endDateRaw || null,
    flexible_dates: flexibleDates,
    max_cash_price: Number.isFinite(maxCashPrice) ? maxCashPrice : null,
    max_points_price: Number.isFinite(maxPointsPrice) ? maxPointsPrice : null,
    loyalty_program: loyaltyProgramRaw || null,
    cabin_class: type === 'voo' ? cabinClassRaw || null : null,
    passengers: type === 'voo' ? Math.max(1, Number(passengersRaw) || 1) : 1,
    channel_email: formData.get('channel_email') === 'true',
    channel_whatsapp: channelWhatsapp,
    active: true,
    check_frequency_hours: PLANS[ctx.plan].cronFrequencyHours,
  });

  if (error) {
    redirect('/alertas?erro=salvar');
  }

  revalidatePath('/alertas');
  redirect('/alertas?sucesso=1');
}

// Ativa/desativa um alerta existente.
// Uso: `<form action={toggleAlert.bind(null, alert.id, !alert.active)}>`.
export async function toggleAlert(id: string, active: boolean): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx) {
    redirect('/login');
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('alerts')
    .update({ active })
    .eq('id', id)
    .eq('user_id', ctx.userId);

  if (error) {
    throw new Error(`Erro ao atualizar alerta: ${error.message}`);
  }

  revalidatePath('/alertas');
}

// Exclui um alerta. Uso: `<form action={deleteAlert.bind(null, alert.id)}>`.
export async function deleteAlert(id: string): Promise<void> {
  const ctx = await getUserContext();
  if (!ctx) {
    redirect('/login');
  }

  const supabase = await createClient();

  const { error } = await supabase.from('alerts').delete().eq('id', id).eq('user_id', ctx.userId);

  if (error) {
    throw new Error(`Erro ao excluir alerta: ${error.message}`);
  }

  revalidatePath('/alertas');
}
