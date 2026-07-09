import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import type { Promotion } from '@/lib/types';

const STATUS_VARIANT: Record<Promotion['status'], 'success' | 'destructive' | 'secondary'> = {
  ativa: 'success',
  expirada: 'destructive',
  futura: 'secondary',
};

const STATUS_LABEL: Record<Promotion['status'], string> = {
  ativa: 'Ativa',
  expirada: 'Expirada',
  futura: 'Em breve',
};

const TYPE_LABEL: Record<Promotion['type'], string> = {
  transferencia_bonificada: 'Transferência bonificada',
  compra_pontos: 'Compra de pontos',
  passagem: 'Passagem',
  hotel: 'Hotel',
  pacote: 'Pacote',
  clube: 'Clube de pontos',
  cartao: 'Cartão',
  cashback: 'Cashback',
  cupom: 'Cupom',
};

export function PromotionCard({ promotion }: { promotion: Promotion }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{TYPE_LABEL[promotion.type]}</Badge>
            <Badge variant={STATUS_VARIANT[promotion.status]}>{STATUS_LABEL[promotion.status]}</Badge>
            {promotion.program && <Badge variant="secondary">{promotion.program}</Badge>}
          </div>
          <CardTitle className="text-base">{promotion.title}</CardTitle>
        </div>
        {promotion.bonus_percentage != null && (
          <div className="rounded-full bg-accent px-3 py-1 text-sm font-bold text-accent-foreground">
            +{promotion.bonus_percentage}%
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-2">
        {promotion.rules && <p className="text-sm text-muted-foreground">{promotion.rules}</p>}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {promotion.start_date ? formatDate(promotion.start_date) : '—'} até{' '}
            {promotion.end_date ? formatDate(promotion.end_date) : '—'}
          </span>
          {promotion.url && (
            <a
              href={promotion.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="flex items-center gap-1 text-primary hover:underline"
            >
              Ver detalhes <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
