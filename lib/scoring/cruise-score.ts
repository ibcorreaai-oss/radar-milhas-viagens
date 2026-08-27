// Cruise Opportunity Score — Fase 4 do World Experience Radar.
//
// Mesmo espírito de stay-score.ts/event-score.ts: determinístico,
// explicável, sem chamada de IA.

import type { CruiseCategory, CruiseRegionTag, VerificationStatus } from '@/lib/types';
import type { ExplainableScore } from '@/lib/scoring/event-score';

export interface CruiseScoreInput {
  category: CruiseCategory;
  regionTags: CruiseRegionTag[];
  nights: number;
  portsCount: number;
  verificationStatus: VerificationStatus;
  confidenceScore: number;
  sourceAuthorityLevel: number;
  hasDescription: boolean;
  hasCoverImage: boolean;
}

// Categorias/regiões intrinsecamente raras — expedição polar é o topo da
// raridade (poucos navios, janela curta, alta demanda).
const RARE_CATEGORIES: CruiseCategory[] = ['expedicao', 'volta_ao_mundo'];
const RARE_REGIONS: CruiseRegionTag[] = ['ANTARTIDA', 'ARTICO'];

export function evaluateCruise(input: CruiseScoreInput): ExplainableScore {
  const positives: string[] = [];
  const negatives: string[] = [];
  let score = 50;

  if (RARE_CATEGORIES.includes(input.category)) {
    score += 12;
    positives.push('Categoria de cruzeiro rara (expedição/volta ao mundo)');
  }

  const rareRegionCount = input.regionTags.filter((t) => RARE_REGIONS.includes(t)).length;
  if (rareRegionCount > 0) {
    score += 15;
    positives.push('Roteiro em região extrema/raramente visitada');
  }

  // Roteiro rico: muitos portos distintos numa viagem só é o tipo de
  // combinação que um buscador tradicional de "1 destino só" não mostra.
  if (input.portsCount >= 6) {
    score += 8;
    positives.push('Roteiro com muitos portos/destinos diferentes');
  } else if (input.portsCount > 0 && input.portsCount <= 2) {
    negatives.push('Roteiro com poucos portos — menos variedade de experiência');
  }

  if (input.nights >= 12) {
    score += 6;
    positives.push('Viagem longa — mais tempo de experiência por embarque');
  } else if (input.nights <= 3) {
    negatives.push('Cruzeiro curto — menos tempo de experiência');
  }

  switch (input.verificationStatus) {
    case 'verified':
      score += 12;
      positives.push('Dado verificado por fonte oficial');
      break;
    case 'estimated':
      score -= 4;
      negatives.push('Dado estimado, ainda não verificado por fonte oficial');
      break;
    case 'stale':
      score -= 15;
      negatives.push('Dado desatualizado — recomendado reverificar');
      break;
    case 'mock':
      negatives.push('Dado de exemplo (demonstração), não confirmado');
      break;
    case 'unverified':
      negatives.push('Ainda sem verificação de fonte');
      break;
  }

  score += (input.confidenceScore - 0.5) * 20;
  if (input.confidenceScore < 0.5) {
    negatives.push('Confiança da informação baixa — confirmar antes de recomendar');
  } else if (input.confidenceScore >= 0.8) {
    positives.push('Alta confiança na informação');
  }

  if (input.sourceAuthorityLevel >= 8) {
    positives.push('Fonte de alta autoridade');
  } else if (input.sourceAuthorityLevel > 0 && input.sourceAuthorityLevel <= 3) {
    negatives.push('Fonte de baixa autoridade');
  }

  if (!input.hasDescription) {
    score -= 3;
    negatives.push('Sem descrição de roteiro cadastrada');
  }
  if (!input.hasCoverImage) {
    score -= 2;
    negatives.push('Sem imagem de capa cadastrada');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const label =
    score >= 90
      ? 'Cruzeiro excepcional'
      : score >= 75
        ? 'Roteiro extraordinário'
        : score >= 60
          ? 'Bom roteiro'
          : score >= 40
            ? 'Cruzeiro comum'
            : 'Dado insuficiente para recomendar';

  return {
    score,
    label,
    reasons: [...positives, ...negatives],
    positives,
    negatives,
    urgency: 'LOW', // Sem dado de vendas/lotação em tempo real ainda (Fase 5+/integração real).
    confidence: input.confidenceScore,
  };
}
