import { createAdminClient } from '@/lib/supabase/admin';
import type { PromotionProvider, NormalizedPromotion } from '@/lib/providers/types';

// ManualPromotionProvider — lê as promoções cadastradas pelo admin na tabela
// `promotions`. É o único provider de promoção no MVP (sem scraping).
export class ManualPromotionProvider implements PromotionProvider {
  readonly name = 'manual';

  async list(): Promise<NormalizedPromotion[]> {
    const supabase = createAdminClient();
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
