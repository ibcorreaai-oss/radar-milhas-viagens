// Experience Score — motor de score do World Experience Radar.
//
// Deliberadamente separado do OpportunityEngine (dinheiro vs pontos): este
// motor responde "quão especial é a experiência", não "vale a pena
// financeiramente". Ver ARCHITECTURE.md #3.
//
// 100% determinístico (regras + aritmética) — nenhuma chamada de IA. Segue
// a hierarquia de custo do PROMPT 3.0 §62 (regras antes de modelo).
// Todo score devolve a forma "explainable" pedida no §79.

import type { BookNowState, EventSignificance, EventStatus } from '@/lib/types';

export interface ExperienceScoreInput {
  significance?: EventSignificance | null;
  hiddenGem?: boolean;
  onceInLifetime?: boolean;
  status: EventStatus;
  /** 0-1 — confiança na informação (autoridade da fonte + atualidade). */
  confidenceScore: number;
  /** Dias até o início do evento; negativo se já passou; null se sem data. */
  daysUntilStart: number | null;
  /** 1-10 — autoridade da fonte cadastrada. */
  sourceAuthorityLevel: number;
}

export type Urgency = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ExplainableScore {
  score: number;
  label: string;
  reasons: string[];
  positives: string[];
  negatives: string[];
  urgency: Urgency;
  confidence: number;
}

const SIGNIFICANCE_WEIGHT: Record<EventSignificance, number> = {
  comum: 0,
  classico: 10,
  derby: 12,
  mata_mata: 15,
  semifinal: 18,
  final: 22,
  evento_historico: 25,
};

const SIGNIFICANCE_LABEL: Record<EventSignificance, string> = {
  comum: 'partida comum',
  classico: 'clássico',
  derby: 'derby',
  mata_mata: 'mata-mata',
  semifinal: 'semifinal',
  final: 'final',
  evento_historico: 'evento histórico',
};

export function evaluateExperience(input: ExperienceScoreInput): ExplainableScore {
  const positives: string[] = [];
  const negatives: string[] = [];
  let score = 50;

  if (input.significance && SIGNIFICANCE_WEIGHT[input.significance] > 0) {
    score += SIGNIFICANCE_WEIGHT[input.significance];
    positives.push(`Evento classificado como ${SIGNIFICANCE_LABEL[input.significance]}`);
  }

  if (input.onceInLifetime) {
    score += 15;
    positives.push('Experiência única na vida (Once in a Lifetime)');
  }

  if (input.hiddenGem) {
    score += 8;
    positives.push('Descoberta pouco conhecida (Hidden Gem)');
  }

  if (input.status === 'confirmado') {
    score += 10;
    positives.push('Data confirmada pela fonte');
  } else if (input.status === 'estimado' || input.status === 'em_monitoramento') {
    score -= 8;
    negatives.push('Data ainda não confirmada oficialmente');
  } else if (input.status === 'cancelado' || input.status === 'adiado') {
    score -= 40;
    negatives.push(input.status === 'cancelado' ? 'Evento cancelado' : 'Evento adiado');
  } else if (input.status === 'finalizado') {
    score -= 50;
    negatives.push('Evento já finalizado');
  }

  score += (input.confidenceScore - 0.5) * 20;
  if (input.confidenceScore < 0.5) {
    negatives.push('Confiança da fonte baixa — confirmar antes de agir');
  } else if (input.confidenceScore >= 0.8) {
    positives.push('Alta confiança na informação');
  }

  if (input.sourceAuthorityLevel >= 8) {
    positives.push('Fonte de alta autoridade (oficial)');
  } else if (input.sourceAuthorityLevel <= 3) {
    negatives.push('Fonte de baixa autoridade');
  }

  let urgency: Urgency = 'LOW';
  if (input.daysUntilStart != null && input.daysUntilStart >= 0) {
    if (input.daysUntilStart <= 30) {
      urgency = 'HIGH';
      score += 6;
    } else if (input.daysUntilStart <= 90) {
      urgency = 'MEDIUM';
      score += 2;
    }
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  const label =
    score >= 90
      ? 'Experiência excepcional'
      : score >= 75
        ? 'Ótima oportunidade'
        : score >= 60
          ? 'Boa oportunidade'
          : score >= 40
            ? 'Vale acompanhar'
            : 'Baixo interesse no momento';

  return {
    score,
    label,
    reasons: [...positives, ...negatives],
    positives,
    negatives,
    urgency,
    confidence: input.confidenceScore,
  };
}

export function daysUntil(dateIso: string | null): number | null {
  if (!dateIso) return null;
  const target = new Date(dateIso).getTime();
  const now = Date.now();
  return Math.floor((target - now) / (1000 * 60 * 60 * 24));
}

// Estado de urgência de compra (§28 do PROMPT 3.0) derivado do Experience
// Score + janela até o evento. Determinístico — sem input manual do admin,
// pra nunca divergir do score explicável.
export function deriveBookNowState(score: number, urgency: Urgency, status: EventStatus): BookNowState {
  if (status === 'cancelado' || status === 'adiado' || status === 'finalizado') {
    return 'monitorar';
  }
  if (urgency === 'HIGH' && score >= 85) return 'comprar_agora';
  if (urgency === 'HIGH' && score >= 70) return 'comprar';
  if (score >= 80) return 'boa_janela';
  if (score < 50) return 'esperar';
  return 'monitorar';
}
