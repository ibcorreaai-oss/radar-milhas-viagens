import type { SupabaseClient } from '@supabase/supabase-js';
import type { Profile } from '@/lib/types';

// Painel de conquistas (ETAPA 13 — NeuroUX), atrás da feature flag
// `achievementsPanel` (padrão desligado, admin decide — ver
// supabase/migrations/0008_achievements_flag.sql). Deliberadamente SEM
// pontos, níveis, sequências (streaks) ou ranking — o prompt da etapa pede
// pra evitar "pressão psicológica, FOMO artificial, recompensas
// aleatórias", e nada disso combina com uma ferramenta de monitoramento de
// preço (não é um app de hábito diário). O que sobrou são marcos reais de
// valor: perfil completo (alertas melhores), primeiro alerta, primeira
// busca, primeira oportunidade recebida — tudo calculado sob demanda das
// tabelas que já existem, sem tabela de evento nova (mesma filosofia do
// GROWTH.md §6).
export interface Achievement {
  key: string;
  label: string;
  description: string;
  unlocked: boolean;
}

export async function computeAchievements(
  supabase: SupabaseClient,
  userId: string,
  profile: Profile | null
): Promise<Achievement[]> {
  const [{ count: alertsCount }, { count: flightSearches }, { count: hotelSearches }, { count: notifications }] =
    await Promise.all([
      supabase.from('alerts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('flight_searches').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('hotel_searches').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      supabase.from('notification_logs').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'sent'),
    ]);

  const searchesTotal = (flightSearches ?? 0) + (hotelSearches ?? 0);
  const memberSince = profile?.created_at ? new Date(profile.created_at) : null;
  const daysAsMember = memberSince ? Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24)) : 0;

  return [
    {
      key: 'onboarding_done',
      label: 'Perfil completo',
      description: 'Você configurou origem, destinos e programas de pontos.',
      unlocked: Boolean(profile?.onboarding_done),
    },
    {
      key: 'first_search',
      label: 'Primeira busca realizada',
      description: 'Você comparou dinheiro vs pontos pela primeira vez.',
      unlocked: searchesTotal > 0,
    },
    {
      key: 'first_alert',
      label: 'Primeiro alerta criado',
      description: 'Você deixou o Radar vigiando um preço por você.',
      unlocked: (alertsCount ?? 0) > 0,
    },
    {
      key: 'first_notification',
      label: 'Primeira oportunidade recebida',
      description: 'Um dos seus alertas já te avisou de uma oportunidade real.',
      unlocked: (notifications ?? 0) > 0,
    },
    {
      key: 'member_30_days',
      label: 'Membro há 30 dias',
      description: 'Você está no clube há um mês ou mais.',
      unlocked: daysAsMember >= 30,
    },
  ];
}
