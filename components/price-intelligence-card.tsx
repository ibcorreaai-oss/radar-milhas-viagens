import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { getFeatureFlags } from '@/lib/feature-flags';
import { formatBRL } from '@/lib/utils';
import { computePriceIntelligence, type PriceObservationInput } from '@/lib/scoring/price-intelligence';
import type { PriceObservationEntityType } from '@/lib/price-observations';

// Card server-side reaproveitável (Fase 10) — mostra estatísticas de preço
// SÓ quando há observações reais suficientes; caso contrário mostra "dados
// históricos insuficientes" de forma honesta (Zero Hallucination Policy).
// Gated pela flag priceIntelligence — quem usa este componente não precisa
// checar a flag de novo.
export async function PriceIntelligenceCard({ entityType, entityId }: { entityType: PriceObservationEntityType; entityId: string }) {
  const flags = await getFeatureFlags();
  if (!flags.priceIntelligence) return null;

  const supabase = await createClient();
  const { data } = await supabase
    .from('price_observations')
    .select('price_cash, observed_at')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('observed_at', { ascending: true });

  const observations = (data ?? []) as PriceObservationInput[];
  const stats = computePriceIntelligence(observations);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">Histórico de preço</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {stats.insufficient ? (
          <p className="text-muted-foreground">
            Dados históricos insuficientes ({stats.observationsCount} observação
            {stats.observationsCount === 1 ? '' : 'ões'} registrada
            {stats.observationsCount === 1 ? '' : 's'}) — o histórico é construído a partir de observações reais deste
            sistema ao longo do tempo, nunca estimado.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Mediana</p>
                <p className="font-medium">{formatBRL(stats.median!)}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Faixa observada</p>
                <p className="font-medium">
                  {formatBRL(stats.min!)} – {formatBRL(stats.max!)}
                </p>
              </div>
            </div>
            {(stats.variation7d != null || stats.variation30d != null) && (
              <div className="flex flex-wrap gap-4 border-t pt-2">
                {stats.variation7d != null && <VariationRow label="Últimos 7 dias" value={stats.variation7d} />}
                {stats.variation30d != null && <VariationRow label="Últimos 30 dias" value={stats.variation30d} />}
              </div>
            )}
            <p className="text-xs text-muted-foreground">Baseado em {stats.observationsCount} observações reais registradas pelo sistema.</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function VariationRow({ label, value }: { label: string; value: number }) {
  const Icon = value > 0 ? TrendingUp : value < 0 ? TrendingDown : Minus;
  const color = value > 0 ? 'text-destructive' : value < 0 ? 'text-success' : 'text-muted-foreground';
  return (
    <div className="flex items-center gap-1.5">
      <Icon className={`h-4 w-4 ${color}`} />
      <span className="text-xs text-muted-foreground">{label}:</span>
      <span className={`font-medium ${color}`}>
        {value > 0 ? '+' : ''}
        {value}%
      </span>
    </div>
  );
}
