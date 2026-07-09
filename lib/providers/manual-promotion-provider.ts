import { createClient } from '@/lib/supabase/server';
import type { PromotionProvider, NormalizedPromotion } from '@/lib/providers/types';

// ManualPromotionProvider — lê as promoções cadastradas pelo admin na tabela
// `promotions`. É o único provider de promoção no MVP (sem scraping).
// Usa o client normal (respeita RLS) — a policy "promotions: read all
// authenticated" já libera essa leitura pra qualquer usuário logado, então
// não há motivo pra isso rodar com service_role (esse fica reservado pra
// webhook do Stripe e para os crons).
export class ManualPromotionProvider implements PromotionProvider {
  readonly name = 'manual';

  async list(): Promise<NormalizedPromotion[]> {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('promotions')
      .select('title, type, program, bonus_percentage, start_date, end_date, rules, url')
      .eq('status', 'ativa')
      .order('score', { ascending: false });

    if (error || !data) return [];

    return data.map((p) => ({
      title: p.title,
      type: p.type,
      program: p.program,
      bonusPercentage: p.bonus_percentage,
      startDate: p.start_date,
      endDate: p.end_date,
      rules: p.rules,
      url: p.url,
    }));
  }
}
