// Price Intelligence 2.0 (Fase 10) — estatísticas de preço a partir de
// `price_observations` (histórico próprio, nunca comprado/inventado).
//
// Exige um mínimo de observações espalhadas por pelo menos alguns dias
// antes de calcular qualquer variação — com 1 observação isolada (o caso
// mais comum logo após esta fase ser lançada, já que o histórico começa
// vazio) não existe "variação" nenhuma para reportar, só o preço atual.
// Nesse caso a função retorna `insufficient: true` e a UI mostra "dados
// históricos insuficientes" (nunca fabrica tendência).

export interface PriceObservationInput {
  price_cash: number;
  observed_at: string;
}

export interface PriceIntelligenceResult {
  insufficient: boolean;
  observationsCount: number;
  currentPrice: number | null;
  median: number | null;
  mean: number | null;
  min: number | null;
  max: number | null;
  variation7d: number | null; // percentual, null se não houver observação com >=7 dias
  variation30d: number | null; // percentual, null se não houver observação com >=30 dias
}

const MIN_OBSERVATIONS_FOR_STATS = 3;

function percentileSorted(sorted: number[], p: number): number {
  if (sorted.length === 1) return sorted[0];
  const idx = (sorted.length - 1) * p;
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
}

export function computePriceIntelligence(observations: PriceObservationInput[]): PriceIntelligenceResult {
  const empty: PriceIntelligenceResult = {
    insufficient: true,
    observationsCount: observations.length,
    currentPrice: null,
    median: null,
    mean: null,
    min: null,
    max: null,
    variation7d: null,
    variation30d: null,
  };

  if (observations.length === 0) return empty;

  const sortedByDate = [...observations].sort((a, b) => new Date(a.observed_at).getTime() - new Date(b.observed_at).getTime());
  const currentPrice = sortedByDate[sortedByDate.length - 1].price_cash;

  if (observations.length < MIN_OBSERVATIONS_FOR_STATS) {
    return { ...empty, insufficient: true, currentPrice };
  }

  const prices = sortedByDate.map((o) => o.price_cash);
  const sortedPrices = [...prices].sort((a, b) => a - b);
  const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
  const median = percentileSorted(sortedPrices, 0.5);
  const min = sortedPrices[0];
  const max = sortedPrices[sortedPrices.length - 1];

  const now = Date.now();
  const findClosestBefore = (daysAgo: number): number | null => {
    const cutoff = now - daysAgo * 24 * 60 * 60 * 1000;
    const candidates = sortedByDate.filter((o) => new Date(o.observed_at).getTime() <= cutoff);
    if (candidates.length === 0) return null;
    return candidates[candidates.length - 1].price_cash;
  };

  const price7dAgo = findClosestBefore(7);
  const price30dAgo = findClosestBefore(30);

  const variation7d = price7dAgo != null && price7dAgo > 0 ? ((currentPrice - price7dAgo) / price7dAgo) * 100 : null;
  const variation30d = price30dAgo != null && price30dAgo > 0 ? ((currentPrice - price30dAgo) / price30dAgo) * 100 : null;

  return {
    insufficient: false,
    observationsCount: observations.length,
    currentPrice,
    median: Number(median.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    min,
    max,
    variation7d: variation7d != null ? Number(variation7d.toFixed(1)) : null,
    variation30d: variation30d != null ? Number(variation30d.toFixed(1)) : null,
  };
}
