import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScoreBadge } from '@/components/score-badge';
import { formatBRL, formatPoints, formatDate } from '@/lib/utils';
import type { Opportunity } from '@/lib/types';

const TYPE_LABEL: Record<Opportunity['type'], string> = {
  voo: 'Voo',
  hotel: 'Hotel',
  transferencia: 'Transferência',
  pacote: 'Pacote',
};

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const route = [opportunity.origin, opportunity.destination].filter(Boolean).join(' → ');

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <Badge variant="outline" className="mb-2">
            {TYPE_LABEL[opportunity.type]}
          </Badge>
          <CardTitle className="text-base">{opportunity.title}</CardTitle>
          {(route || opportunity.city) && (
            <p className="mt-1 text-sm text-muted-foreground">{route || opportunity.city}</p>
          )}
        </div>
        <ScoreBadge score={opportunity.score} />
      </CardHeader>
      <CardContent className="space-y-3">
        {opportunity.description && <p className="text-sm text-muted-foreground">{opportunity.description}</p>}

        <div className="flex flex-wrap gap-4 text-sm">
          {opportunity.cash_price != null && (
            <div>
              <span className="text-muted-foreground">Dinheiro: </span>
              <span className="font-medium">{formatBRL(opportunity.cash_price)}</span>
            </div>
          )}
          {opportunity.points_price != null && (
            <div>
              <span className="text-muted-foreground">Pontos: </span>
              <span className="font-medium">
                {formatPoints(opportunity.points_price)} {opportunity.loyalty_program ? `(${opportunity.loyalty_program})` : ''}
              </span>
            </div>
          )}
        </div>

        {opportunity.recommendation && (
          <p className="rounded-md bg-primary/5 p-2 text-xs text-foreground">{opportunity.recommendation}</p>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{opportunity.expires_at ? `Expira em ${formatDate(opportunity.expires_at)}` : 'Sem validade definida'}</span>
          {opportunity.affiliate_url && (
            <a
              href={opportunity.affiliate_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              Ver oferta <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
