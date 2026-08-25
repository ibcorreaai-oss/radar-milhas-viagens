import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import type { FeatureFlagKey } from '@/lib/types';

const DEFAULTS: Record<FeatureFlagKey, boolean> = {
  worldRadar: false,
  bucketList: false,
  cruiseRadar: false,
  experienceRadar: false,
  tripBuilder: false,
  worldCalendar: false,
  conciergeAI: false,
};

// Único ponto de leitura de feature flags. Se o Supabase não estiver
// configurado ainda, ou a migration 0002 não tiver rodado, retorna tudo
// desligado em vez de quebrar — mesmo princípio de getUserContext().
//
// cache() pelo mesmo motivo de lib/auth.ts: chamado no layout E de novo em
// várias páginas (ex.: bucket-list, descobrir) na mesma requisição.
export const getFeatureFlags = cache(async (): Promise<Record<FeatureFlagKey, boolean>> => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return { ...DEFAULTS };
  }

  const supabase = await createClient();
  const { data } = await supabase.from('feature_flags').select('key, enabled');
  if (!data) return { ...DEFAULTS };

  const flags = { ...DEFAULTS };
  for (const row of data as { key: string; enabled: boolean }[]) {
    if (row.key in flags) {
      flags[row.key as FeatureFlagKey] = row.enabled;
    }
  }
  return flags;
});
