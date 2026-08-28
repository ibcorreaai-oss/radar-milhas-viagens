import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScoreBadge } from '@/components/score-badge';
import { RecommendationBox } from '@/components/recommendation-box';
import { formatBRL, formatPoints } from '@/lib/utils';

export interface PriceComparisonCardProps {
  title: string;
  subtitle?: React.ReactNode;
  cashPrice: number | null;
  pointsPrice: number | null;
  taxes: number;
  loyaltyProgram?: string | null;
  valorMilheiro?: number | null;
  score: number;
  recommendationText: string;
  extra?: React.ReactNode;
  footer?: React.ReactNode;
}

export function PriceComparisonCard({
  title,
  subtitle,
  cashPrice,
  pointsPrice,
  taxes,
  loyaltyProgram,
  valorMilheiro,
  score,
  recommendationText,
  extra,
  footer,
}: PriceComparisonCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <ScoreBadge score={score} />
      </CardHeader>
      <CardContent className="space-y-4">
        {extra}

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Em dinheiro</p>
            <p className="text-lg font-semibold">{cashPrice != null ? formatBRL(cashPrice) : '—'}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Com pontos{loyaltyProgram ? ` · ${loyaltyProgram}` : ''}</p>
            <p className="text-lg font-semibold">
              {pointsPrice != null ? `${formatPoints(pointsPrice)} pts` : '—'}
            </p>
            {taxes > 0 && <p className="text-xs text-muted-foreground">+ {formatBRL(taxes)} em taxas</p>}
          </div>
        </div>

        {valorMilheiro != null && (
          <p className="text-xs text-muted-foreground">
            Valor obtido por milheiro: <span className="font-medium text-foreground">{formatBRL(valorMilheiro)}</span>
          </p>
        )}

        <RecommendationBox text={recommendationText} />

        {footer}
      </CardContent>
    </Card>
  );
}
