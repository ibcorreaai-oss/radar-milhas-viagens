import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Luggage, Copy, Archive, ArchiveRestore, Share2, Heart, Info } from 'lucide-react';
import { getFeatureFlags } from '@/lib/feature-flags';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button, buttonVariants } from '@/components/ui/button';
import { ConfirmSubmitButton } from '@/components/ui/confirm-submit-button';
import { cn, formatBRL } from '@/lib/utils';
import { TRIP_PACE_LABEL, TRIP_VARIANT_LABEL, EXPERIENCE_TAG_LABEL, type Trip, type ExperienceTag } from '@/lib/types';
import { duplicateTrip, toggleArchiveTrip, toggleShareTrip, deleteTrip, saveTripToBucketList } from '../actions';

async function loadOwnTrip(id: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from('trips').select('*').eq('id', id).eq('user_id', userId).maybeSingle();
  return data as Trip | null;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  return { title: `Viagem — ${id}` };
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

export default async function ViagemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const flags = await getFeatureFlags();
  if (!flags.tripBuilder) notFound();

  const ctx = await getUserContext();
  if (!ctx) redirect(`/login?next=/viagens/${id}`);

  const trip = await loadOwnTrip(id, ctx.userId);
  if (!trip) notFound();

  const budget = trip.budget_breakdown;
  const currency = budget.currency || 'BRL';

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Link href="/viagens" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        Voltar para Minhas Viagens
      </Link>

      <div>
        <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight">
          <Luggage className="h-7 w-7 text-primary" />
          {trip.title}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {trip.origin && trip.destination ? `${trip.origin} → ${trip.destination}` : trip.destination ?? 'Destino não informado'}
          {' · '}
          {trip.itinerary.length} dia(s) · {trip.travelers_adults} adulto(s)
          {trip.travelers_children > 0 ? `, ${trip.travelers_children} criança(s)` : ''}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Badge variant="outline">{TRIP_VARIANT_LABEL[trip.variant]}</Badge>
          <Badge variant="secondary">{TRIP_PACE_LABEL[trip.pace]}</Badge>
          {trip.status === 'arquivada' && <Badge variant="outline">Arquivada</Badge>}
          {!trip.ai_generated && <Badge variant="outline">Roteiro simplificado (sem IA)</Badge>}
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

      <div className="flex flex-wrap gap-2">
        <form action={duplicateTrip.bind(null, trip.id)}>
          <Button type="submit" variant="outline" size="sm">
            <Copy className="h-3.5 w-3.5" />
            Duplicar
          </Button>
        </form>
        <form action={toggleArchiveTrip.bind(null, trip.id, trip.status)}>
          <Button type="submit" variant="outline" size="sm">
            {trip.status === 'ativa' ? <Archive className="h-3.5 w-3.5" /> : <ArchiveRestore className="h-3.5 w-3.5" />}
            {trip.status === 'ativa' ? 'Arquivar' : 'Reativar'}
          </Button>
        </form>
        <form action={toggleShareTrip.bind(null, trip.id, trip.is_shared)}>
          <Button type="submit" variant="outline" size="sm">
            <Share2 className="h-3.5 w-3.5" />
            {trip.is_shared ? 'Parar de compartilhar' : 'Compartilhar'}
          </Button>
        </form>
        <form action={saveTripToBucketList.bind(null, trip.id)}>
          <Button type="submit" variant="outline" size="sm">
            <Heart className="h-3.5 w-3.5" />
            Salvar na Bucket List
          </Button>
        </form>
        <form action={deleteTrip.bind(null, trip.id)}>
          <ConfirmSubmitButton variant="destructive" size="sm" confirmMessage="Excluir esta viagem? Essa ação não pode ser desfeita.">
            Excluir
          </ConfirmSubmitButton>
        </form>
      </div>

      {trip.is_shared && (
        <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Link público (somente leitura):{' '}
          <a href={`/viagem-compartilhada/${trip.id}`} className="underline" target="_blank" rel="noopener noreferrer">
            {`/viagem-compartilhada/${trip.id}`}
          </a>
        </p>
      )}

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
            Estes valores são estimativas geradas por IA com base em referências gerais de mercado — nunca preços
            reais de nenhum provider. Confirme sempre antes de comprar.
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
          {budget.estimated_total == null && (
            <p className="text-sm text-muted-foreground">Sem orçamento estimado disponível para esta viagem.</p>
          )}
        </CardContent>
      </Card>

      <Link href="/montar-viagem" className={cn(buttonVariants({ variant: 'outline' }))}>
        Montar outra viagem
      </Link>
    </div>
  );
}
