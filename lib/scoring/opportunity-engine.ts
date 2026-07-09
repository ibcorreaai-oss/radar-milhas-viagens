// OpportunityEngine — motor central de comparação dinheiro vs pontos.
//
// Recebe um resultado normalizado (voo ou hotel), calcula valor do milheiro,
// economia e um score 0-100, e devolve uma recomendação textual específica
// (nunca "mais barato" puro — ver §8 do PROMPT.md).

import type { Recommendation, ScoreTier } from '@/lib/types';
import { scoreTier } from '@/lib/types';

export interface OpportunityInput {
  cashPrice: number | null;
  pointsPrice: number | null;
  taxes: number;
  /** Custo estimado que o usuário pagou por cada 1.000 pontos, se souber. */
  userCostPer1000?: number | null;
  /** Valor médio de mercado do milheiro para o programa (referência do catálogo). */
  averageMileValue?: number | null;
  flexibleDates?: boolean;
  stops?: number;
  durationMinutes?: number;
  /** 0-1, quão perto a promoção está de expirar (1 = expira já). */
  urgency?: number;
  /** 0-1, "raridade" da rota/disponibilidade (poucos assentos). */
  scarcity?: number;
  transferBonusPercentage?: number | null;
}

export interface OpportunityOutput {
  valorMilheiro: number | null;
  custoReal: number | null;
  economia: number | null;
  economiaPercentual: number | null;
  score: number;
  tier: ScoreTier;
  recommendation: Recommendation;
  recommendationText: string;
}

const DEFAULT_MILE_VALUE_REFERENCE = 20; // R$ por milheiro, usado se o programa não tem valor médio cadastrado

export function calcValorMilheiro(cashPrice: number, taxes: number, pointsUsed: number): number | null {
  if (!pointsUsed || pointsUsed <= 0) return null;
  return ((cashPrice - taxes) / pointsUsed) * 1000;
}

export function calcCustoReal(taxes: number, custoAquisicaoPontos: number): number {
  return taxes + custoAquisicaoPontos;
}

export function calcEconomia(cashPrice: number, custoReal: number): number {
  return cashPrice - custoReal;
}

export function evaluateOpportunity(input: OpportunityInput): OpportunityOutput {
  const {
    cashPrice,
    pointsPrice,
    taxes,
    userCostPer1000,
    averageMileValue,
    flexibleDates,
    stops = 0,
    urgency = 0,
    scarcity = 0,
    transferBonusPercentage,
  } = input;

  const referenceMileValue = averageMileValue && averageMileValue > 0 ? averageMileValue : DEFAULT_MILE_VALUE_REFERENCE;

  let valorMilheiro: number | null = null;
  let custoReal: number | null = null;
  let economia: number | null = null;
  let economiaPercentual: number | null = null;

  if (cashPrice != null && pointsPrice != null && pointsPrice > 0) {
    valorMilheiro = calcValorMilheiro(cashPrice, taxes, pointsPrice);

    const custoAquisicao = userCostPer1000 != null ? (pointsPrice / 1000) * userCostPer1000 : 0;
    custoReal = calcCustoReal(taxes, custoAquisicao);
    economia = calcEconomia(cashPrice, custoReal);
    economiaPercentual = cashPrice > 0 ? (economia / cashPrice) * 100 : 0;
  }

  // --- Score 0-100 ---
  let score = 50;

  if (valorMilheiro != null) {
    const ratio = valorMilheiro / referenceMileValue;
    // ratio 1.0 = na média; cada 20% acima soma ~8 pontos, cada 20% abaixo tira ~8.
    score += (ratio - 1) * 40;
  } else if (cashPrice != null) {
    // Sem opção de pontos: score neutro baseado só em contexto (urgência/raridade).
    score = 55;
  }

  if (economiaPercentual != null) {
    score += Math.min(20, Math.max(-20, economiaPercentual / 2));
  }

  if (flexibleDates) score += 4;
  if (stops === 0) score += 4;
  else if (stops >= 2) score -= 6;

  score += urgency * 10;
  score += scarcity * 6;

  if (transferBonusPercentage && transferBonusPercentage >= 80) score += 10;
  else if (transferBonusPercentage && transferBonusPercentage >= 50) score += 5;

  score = Math.max(0, Math.min(100, Math.round(score)));
  const tier = scoreTier(score);

  const { recommendation, recommendationText } = buildRecommendation({
    valorMilheiro,
    economia,
    economiaPercentual,
    referenceMileValue,
    cashPrice,
    pointsPrice,
    taxes,
    tier,
    transferBonusPercentage,
  });

  return { valorMilheiro, custoReal, economia, economiaPercentual, score, tier, recommendation, recommendationText };
}

function buildRecommendation(args: {
  valorMilheiro: number | null;
  economia: number | null;
  economiaPercentual: number | null;
  referenceMileValue: number;
  cashPrice: number | null;
  pointsPrice: number | null;
  taxes: number;
  tier: ScoreTier;
  transferBonusPercentage?: number | null;
}): { recommendation: Recommendation; recommendationText: string } {
  const { valorMilheiro, cashPrice, pointsPrice, taxes, referenceMileValue, tier, transferBonusPercentage } = args;

  if (transferBonusPercentage && transferBonusPercentage >= 80) {
    return {
      recommendation: 'transfira_com_bonus',
      recommendationText: `Bônus de transferência de ${transferBonusPercentage}% está acima do usual. Recomendação: transfira agora, aproveite antes que a promoção acabe.`,
    };
  }

  if (valorMilheiro == null || pointsPrice == null || cashPrice == null) {
    if (tier === 'imperdivel' || tier === 'excelente') {
      return {
        recommendation: 'pague_dinheiro',
        recommendationText: 'Preço em dinheiro está abaixo da média para esta rota/período. Recomendação: pague em dinheiro, é uma boa oportunidade.',
      };
    }
    return {
      recommendation: 'espere_promocao',
      recommendationText: 'Preço em dinheiro está na média ou acima. Recomendação: aguarde uma promoção antes de comprar.',
    };
  }

  const acimaDaMedia = valorMilheiro >= referenceMileValue;

  if (acimaDaMedia && (tier === 'imperdivel' || tier === 'excelente')) {
    return {
      recommendation: 'use_pontos',
      recommendationText: `Essa emissão usa ${pointsPrice.toLocaleString('pt-BR')} pontos + R$ ${taxes.toFixed(2)} em taxas para algo que custa R$ ${cashPrice.toFixed(2)} em dinheiro. O valor obtido é de R$ ${valorMilheiro.toFixed(2)} por milheiro, acima da média (R$ ${referenceMileValue.toFixed(2)}). Recomendação: excelente uso dos pontos.`,
    };
  }

  if (!acimaDaMedia && valorMilheiro < referenceMileValue * 0.6) {
    return {
      recommendation: 'nao_vale_pontos',
      recommendationText: `O valor obtido é de R$ ${valorMilheiro.toFixed(2)} por milheiro, bem abaixo da média (R$ ${referenceMileValue.toFixed(2)}). Recomendação: não vale usar pontos aqui — pague em dinheiro ou espere uma promoção de transferência bonificada.`,
    };
  }

  if (tier === 'bom' || tier === 'normal') {
    return {
      recommendation: 'compre_pontos_se_abaixo',
      recommendationText: `Valor por milheiro de R$ ${valorMilheiro.toFixed(2)}, próximo da média (R$ ${referenceMileValue.toFixed(2)}). Recomendação: compre pontos apenas se conseguir pagar abaixo de R$ ${(referenceMileValue * 0.7).toFixed(2)} por milheiro.`,
    };
  }

  return {
    recommendation: 'melhor_custo_beneficio',
    recommendationText: `Considerando preço, taxas e valor do milheiro, esta é a melhor opção de custo-benefício disponível agora.`,
  };
}
