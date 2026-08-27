import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Luggage, Sparkles, ArrowRight } from 'lucide-react';
import { getFeatureFlags } from '@/lib/feature-flags';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { cn, formatDateTime } from '@/lib/utils';
import { TRIP_VARIANT_LABEL, type Trip } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Minhas Viagens',
  description: 'Suas viagens montadas pelo AI Trip Builder.',
};

export default async function ViagensPage() {
  const flags = await getFeatureFlags();
  if (!flags.tripBuilder) notFound();

  const ctx = await getUserContext();
  if (!ctx) redirect('/login?next=/viagens');

  const supabase = await createClient();
  const { data } = await supabase.from('trips').select('*').eq('user_id', ctx.userId).order('created_at', { ascending: false });
  const trips = (data ?? []) as Trip[];

  const ativas = trips.filter((t) => t.status === 'ativa');
  const arquivadas = trips.filter((t) => t.status === 'arquivada');

  function TripCard({ trip }: { trip: Trip }) {
    return (
      <Link href={`/viagens/${trip.id}`}>
        <Card className="h-full transition-shadow hover:shadow-md">
          <CardHeader>
            <CardTitle className="text-base">{trip.title}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {trip.origin && trip.destination ? `${trip.origin} → ${trip.destination}` : trip.destination ?? 'Destino não informado'}
            </p>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{TRIP_VARIANT_LABEL[trip.variant]}</Badge>
            {!trip.ai_generated && <Badge variant="secondary">Roteiro simplificado</Badge>}
            <span className="text-xs text-muted-foreground">Criada em {formatDateTime(trip.created_at)}</span>
          </CardContent>
        </Card>
      </Link>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Luggage className="h-6 w-6 text-primary" />
            Minhas Viagens
          </h1>
          <p className="mt-1 text-muted-foreground">Viagens montadas pelo AI Trip Builder.</p>
        </div>
        <Link href="/montar-viagem" className={cn(buttonVariants({ variant: 'default' }))}>
          <Sparkles className="h-4 w-4" />
          Nova viagem
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {trips.length === 0 ? (
        <EmptyState
          title="Nenhuma viagem montada ainda"
          description="Use o Trip Builder para gerar um itinerário completo com orçamento estimado."
          icon={Luggage}
          action={
            <Link href="/montar-viagem" className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}>
              Montar minha primeira viagem
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {ativas.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>

          {arquivadas.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold text-muted-foreground">Arquivadas</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {arquivadas.map((trip) => (
                  <TripCard key={trip.id} trip={trip} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
