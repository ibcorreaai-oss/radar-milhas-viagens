import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FavoriteButton } from '@/components/favorite-button';
import { formatBRL } from '@/lib/utils';
import type { LoyaltyProgram } from '@/lib/types';

const TYPE_LABEL: Record<LoyaltyProgram['type'], string> = {
  banco: 'Banco/Cartão',
  companhia_aerea: 'Companhia aérea',
  hotel: 'Hotel',
  coalizao: 'Coalizão',
};

export function LoyaltyProgramCard({
  program,
  userBalance,
  isFavorited,
}: {
  program: LoyaltyProgram;
  userBalance?: number | null;
  isFavorited?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <Badge variant="outline" className="mb-2">
            {TYPE_LABEL[program.type]}
          </Badge>
          <CardTitle className="text-base">{program.name}</CardTitle>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Milheiro médio</p>
            <p className="font-semibold">{formatBRL(program.average_mile_value)}</p>
          </div>
          {isFavorited !== undefined && (
            <FavoriteButton itemType="loyalty_program" itemId={program.id} initialFavorited={isFavorited} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {userBalance != null && (
          <p>
            Seu saldo: <span className="font-medium">{userBalance.toLocaleString('pt-BR')} pontos</span>
          </p>
        )}
        {program.transfer_partners.length > 0 && (
          <p className="text-muted-foreground">Transfere para: {program.transfer_partners.join(', ')}</p>
        )}
        {program.validity_notes && <p className="text-muted-foreground">{program.validity_notes}</p>}
      </CardContent>
    </Card>
  );
}
