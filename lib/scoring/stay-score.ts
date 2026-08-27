// Stay Experience Score — Fase 3 do World Experience Radar.
//
// Mesmo espírito do Experience Score (lib/scoring/event-score.ts):
// determinístico, sem IA, sempre "explicável" (score + positives/negatives).
// Responde "quão extraordinária é a hospedagem", não preço em si.

import type { ExperienceTag, StayCategory, VerificationStatus } from '@/lib/types';
import type { ExplainableScore } from '@/lib/scoring/event-score';

export interface StayScoreInput {
  category: StayCategory;
  experienceTags: ExperienceTag[];
  verificationStatus: VerificationStatus;
  confidenceScore: number;
  /** 1-10 — autoridade da fonte cadastrada (0 se sem fonte). */
  sourceAuthorityLevel: number;
  hasDescription: boolean;
  hasCoverImage: boolean;
}

// Categorias intrinsecamente raras/extraordinárias — o tipo de hospedagem
// já carrega singularidade, independente de tag adicional.
const RARE_CATEGORIES: StayCategory[] = [
  'overwater_bungalow',
  'cave_hotel',
  'treehouse',
  'castle_hotel',
  'desert_camp',
  'safari_lodge',
  'ryokan',
];

export function evaluateStay(input: StayScoreInput): ExplainableScore {
  const positives: string[] = [];
  const negatives: string[] = [];
  let score = 50;

  if (RARE_CATEGORIES.includes(input.category)) {
    score += 15;
    positives.push('Categoria de hospedagem intrinsecamente rara');
  }

  const rareTagCount = input.experienceTags.filter((t) =>
    (['UNIQUE', 'OVERWATER', 'NORTHERN_LIGHTS', 'REMOTE', 'SAFARI'] as ExperienceTag[]).includes(t)
  ).length;
  if (rareTagCount > 0) {
    score += Math.min(rareTagCount * 5, 15);
    positives.push('Combina experiências pouco comuns');
  }

  if (input.experienceTags.includes('LUXURY')) {
    score += 5;
    positives.push('Categoria de luxo');
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
    negatives.push('Sem descrição cadastrada');
  }
  if (!input.hasCoverImage) {
    score -= 2;
    negatives.push('Sem imagem de capa cadastrada');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const label =
    score >= 90
      ? 'Hospedagem excepcional'
      : score >= 75
        ? 'Experiência extraordinária'
        : score >= 60
          ? 'Boa experiência'
          : score >= 40
            ? 'Hospedagem comum'
            : 'Dado insuficiente para recomendar';

  return {
    score,
    label,
    reasons: [...positives, ...negatives],
    positives,
    negatives,
    urgency: 'LOW', // Stay não tem janela de urgência (não é ingresso/venda limitada) — sempre LOW.
    confidence: input.confidenceScore,
  };
}
