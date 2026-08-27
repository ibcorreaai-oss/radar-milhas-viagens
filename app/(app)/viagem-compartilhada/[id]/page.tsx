import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Luggage, Info } from 'lucide-react';
import { getFeatureFlags } from '@/lib/feature-flags';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatBRL } from '@/lib/utils';
import { TRIP_PACE_LABEL, TRIP_VARIANT_LABEL, EXPERIENCE_TAG_LABEL, type Trip, type ExperienceTag } from '@/lib/types';

async function loadSharedTrip(id: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('trips').select('*').eq('id', id).eq('is_shared', true).maybeSingle();
  return data as Trip | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const trip = await loadSharedTrip(id);
  return { title: trip ? `${trip.title} — Roteiro compartilhado` : 'Viagem não encontrada' };
}

const BUDGET_ROWS: Array<{ key: keyof Trip['budget_breakdown']; label: string }> = [
  { key: 'flights', label: 'Voos' },
  { key: 'hotels', label: 'Hospedagem' },
  { key: 'transport', label: 'Transporte local' },
  { key: 'food', label: 'Alimentação' },
  { key: 'tickets', label: 'Ingressos' },
  { key: 'experiences', label: 'Experiências' },
  { key: 'cruise', label: 'Cruzeiro' },
  { key: 'other', label: 'Outros' },
];

export default async function ViagemCompartilhadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const flags = await getFeatureFlags();
  if (!flags.tripBuilder) notFound();

  const trip = await loadSharedTrip(id);
  if (!trip) notFound();

  const budget = trip.budget_breakdown;
  const currency = budget.currency || 'BRL';

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Badge variant="secondary">Roteiro compartilhado — somente leitura</Badge>

      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Luggage className="h-7 w-7 text-primary" />
          {trip.title}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {trip.origin && trip.destination ? `${trip.origin} → ${trip.destination}` : trip.destination ?? 'Destino não informado'}
          {' · '}
          {trip.itinerary.length} dia(s)
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{TRIP_VARIANT_LABEL[trip.variant]}</Badge>
          <Badge variant="secondary">{TRIP_PACE_LABEL[trip.pace]}</Badge>
        </div>
        {trip.interests.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {trip.interests.map((tag) => (
              <Badge key={tag} variant="secondary">
                {EXPERIENCE_TAG_LABEL[tag as ExperienceTag] ?? tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {trip.summary && <p className="text-muted-foreground">{trip.summary}</p>}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Itinerário</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {trip.itinerary.map((day) => (
            <div key={day.day} className="rounded-md border p-4">
              <p className="font-semibold">Dia {day.day}{day.date ? ` — ${day.date}` : ''}</p>
              <p className="mt-2 text-sm"><span className="font-medium">Manhã:</span> {day.morning}</p>
              <p className="mt-1 text-sm"><span className="font-medium">Tarde:</span> {day.afternoon}</p>
              <p className="mt-1 text-sm"><span className="font-medium">Noite:</span> {day.evening}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Orçamento estimado
            <span title="Estimativa de IA — não é preço real, confirme antes de comprar.">
              <Info className="h-4 w-4 text-muted-foreground" />
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="rounded-md border-l-2 border-primary bg-primary/5 p-3 text-sm text-muted-foreground">
            Estes valores são estimativas geradas por IA — nunca preços reais de nenhum provider.
          </p>
          {BUDGET_ROWS.filter((row) => budget[row.key] != null).map((row) => (
            <div key={row.key as string} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{row.label}</span>
              <span>{formatBRL(Number(budget[row.key]))}</span>
            </div>
          ))}
          {budget.estimated_total != null && (
            <div className="flex items-center justify-between border-t pt-2 text-base font-semibold">
              <span>Total estimado</span>
              <span>{currency === 'BRL' ? formatBRL(budget.estimated_total) : `${currency} ${budget.estimated_total}`}</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
