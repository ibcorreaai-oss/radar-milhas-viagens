// Price Intelligence 2.0 (Fase 10) — captura de observações reais.
//
// Zero Hallucination Policy: cada linha em `price_observations` é um "isso
// foi o preço cadastrado/visto neste momento", nunca uma estimativa. Este
// app não compra nem inventa histórico — o histórico só existe a partir de
// quando o próprio sistema começa a observar (por isso o histórico começa
// raso; ver lib/scoring/price-intelligence.ts para o motivo de precisar de
// um mínimo de observações antes de calcular qualquer variação).
//
// Best-effort por design: uma falha ao gravar uma observação NUNCA deve
// impedir o admin de salvar a hospedagem/cruzeiro/oportunidade em si —
// price_observations é um log auxiliar, não uma dependência crítica.

import { createClient } from '@/lib/supabase/server';

export type PriceObservationEntityType = 'opportunity' | 'stay' | 'cruise';

export async function recordPriceObservation(params: {
  entityType: PriceObservationEntityType;
  entityId: string;
  priceCash: number | null | undefined;
  priceCurrency?: string | null;
  sourceId?: string | null;
}): Promise<void> {
  if (params.priceCash == null || params.priceCash < 0) return;

  try {
    const supabase = await createClient();
    const { error } = await supabase.from('price_observations').insert({
      entity_type: params.entityType,
      entity_id: params.entityId,
      price_cash: params.priceCash,
      price_currency: params.priceCurrency || 'BRL',
      source_id: params.sourceId || null,
    });
    if (error) {
      console.error(`price_observations: falha ao gravar observação (${params.entityType}/${params.entityId})`, error.message);
    }
  } catch (error) {
    console.error(`price_observations: erro inesperado (${params.entityType}/${params.entityId})`, error);
  }
}
