import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2, XCircle, Compass } from 'lucide-react';
import { getFeatureFlags } from '@/lib/feature-flags';
import { getDestinationOpportunities } from '@/lib/opportunity-engine';
import { rankForInspireMe, INSPIRE_MODE_LABEL, type InspireMode } from '@/lib/inspire-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InspireFilters } from './inspire-filters';

export const metadata: Metadata = {
  title: 'Onde Ir — Inspire Me',
  description: 'Onde eu deveria estar? Escolha um modo e descubra os destinos com melhor Trip Opportunity Score agora.',
  openGraph: { title: 'Onde Ir — Radar Milhas & Viagens', url: '/onde-ir' },
  alternates: { canonical: '/onde-ir' },
};

export default async function OndeIrPage({
  searchParams,
}: {
  searchParams: Promise<{ modo?: string; continente?: string }>;
}) {
  const flags = await getFeatureFlags();
  if (!flags.inspireMe) notFound();

  const { modo, continente } = await searchParams;
  const mode = (Object.keys(INSPIRE_MODE_LABEL).includes(modo ?? '') ? modo : 'surpreenda') as InspireMode;

  const opportunities = await getDestinationOpportunities();
  const ranked = rankForInspireMe(opportunities, mode, continente || null);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Compass className="h-7 w-7 text-primary" />
          Onde eu deveria estar?
        </h1>
        <p className="mt-1 text-muted-foreground">
          Escolha um modo abaixo — cruzamos eventos, hospedagens e cruzeiros catalogados (mesmo motor da página
          Oportunidades Mundiais) para montar o seu TOP 10.
        </p>
      </div>

      <InspireFilters />

      {ranked.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhum destino catalogado ainda para o modo <strong>{INSPIRE_MODE_LABEL[mode]}</strong>
            {continente ? ` em ${continente}` : ''}. Tente outro modo ou remova o filtro de continente.
          </CardContent>
        </Card>
      ) : (
        <ol className="space-y-4">
          {ranked.map((op, i) => (
            <li key={op.destination.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2">
                    <span>
                      {i + 1}. {op.destination.city}, {op.destination.country}
                    </span>
                    <Badge variant="outline">{op.explanation.score}/100</Badge>
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {op.explanation.label} · Confiança: {Math.round(op.explanation.confidence * 100)}%
                  </p>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Por que ir agora?</p>
                  {op.explanation.positives.map((reason, j) => (
                    <p key={`p-${j}`} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                      {reason}
                    </p>
                  ))}
                  {op.explanation.negatives.map((reason, j) => (
                    <p key={`n-${j}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      {reason}
                    </p>
                  ))}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
