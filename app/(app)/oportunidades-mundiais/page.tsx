import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CheckCircle2, XCircle, TrendingUp } from 'lucide-react';
import { getFeatureFlags } from '@/lib/feature-flags';
import { getDestinationOpportunities } from '@/lib/opportunity-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Oportunidades Mundiais',
  description:
    'Trip Opportunity Score — cruza eventos, hospedagens e cruzeiros catalogados para responder: vale a pena viajar para esse destino agora?',
  openGraph: { title: 'Oportunidades Mundiais — Radar Milhas & Viagens', url: '/oportunidades-mundiais' },
  alternates: { canonical: '/oportunidades-mundiais' },
};

export default async function OportunidadesMundiaisPage() {
  const flags = await getFeatureFlags();
  if (!flags.worldOpportunityEngine) notFound();

  const opportunities = await getDestinationOpportunities();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <TrendingUp className="h-7 w-7 text-primary" />
          Oportunidades Mundiais
        </h1>
        <p className="mt-1 text-muted-foreground">
          Trip Opportunity Score: cruza eventos, hospedagens e cruzeiros catalogados para responder — vale a pena viajar
          para esse lugar agora?
        </p>
      </div>

      {opportunities.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            Nenhum destino com dados suficientes ainda para calcular uma oportunidade.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {opportunities.map((op) => (
            <Card key={op.destination.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-2">
                  <span>
                    {op.destination.city}, {op.destination.country}
                  </span>
                  <Badge variant="outline">{op.explanation.score}/100</Badge>
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  {op.explanation.label} · Confiança: {Math.round(op.explanation.confidence * 100)}%
                </p>
              </CardHeader>
              <CardContent className="space-y-1.5">
                {op.explanation.positives.map((reason, i) => (
                  <p key={`p-${i}`} className="flex items-start gap-2 text-sm">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                    {reason}
                  </p>
                ))}
                {op.explanation.negatives.map((reason, i) => (
                  <p key={`n-${i}`} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    {reason}
                  </p>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
