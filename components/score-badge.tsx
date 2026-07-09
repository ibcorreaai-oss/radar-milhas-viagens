import { cn } from '@/lib/utils';
import { scoreTier, SCORE_TIER_LABEL } from '@/lib/types';

const TIER_CLASSES: Record<string, string> = {
  imperdivel: 'bg-success text-success-foreground',
  excelente: 'bg-primary text-primary-foreground',
  bom: 'bg-accent text-accent-foreground',
  normal: 'bg-muted text-muted-foreground',
  nao_recomendado: 'bg-destructive text-destructive-foreground',
};

export function ScoreBadge({ score, className }: { score: number; className?: string }) {
  const tier = scoreTier(score);
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
        TIER_CLASSES[tier],
        className
      )}
      title={`Score ${score}/100`}
    >
      <span>{score}</span>
      <span className="opacity-90">· {SCORE_TIER_LABEL[tier]}</span>
    </div>
  );
}
