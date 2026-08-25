import Link from 'next/link';
import { PlaneTakeoff, TriangleAlert } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDateTime, formatDurationMinutes } from '@/lib/utils';
import type { FlightResult, FlightSearch } from '@/lib/types';
import { FlightSearchForm } from './flight-search-form';
import { PriceComparisonCard } from '@/components/price-comparison-card';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function stopsLabel(stops: number): string {
  if (stops <= 0) return 'Direto';
  if (stops === 1) return '1 parada';
  return `${stops} paradas`;
}

async function FlightResultsSection({ searchId }: { searchId: string }) {
  const ctx = await getUserContext();
  if (!ctx) {
    return (
      <EmptyState
        icon={TriangleAlert}
        title="Faça login para ver esta busca"
        description="Sua sessão expirou ou você não está autenticado."
      />
    );
  }

  const supabase = await createClient();

  // RLS já impede acesso a busca de outro usuário — este filtro é defesa em
  // profundidade e também dá um null-safe explícito para o caso "não existe".
  const { data: search } = await supabase
    .from('flight_searches')
    .select('*')
    .eq('id', searchId)
    .eq('user_id', ctx.userId)
    .maybeSingle();

  if (!search) {
    return (
      <EmptyState
        title="Busca não encontrada"
        description="Essa busca não existe mais ou não pertence à sua conta. Faça uma nova busca acima."
      />
    );
  }

  const typedSearch = search as FlightSearch;

  // Coluna explícita, sem raw_data (jsonb com o payload bruto do provider —
  // pode ser grande e não é usado nesta tela) nem provider/currency/
  // created_at (não renderizados aqui).
  const { data: results } = await supabase
    .from('flight_results')
    .select(
      'id, airline, origin, destination, departure_datetime, arrival_datetime, duration_minutes, stops, cash_price, points_price, taxes, loyalty_program, score, recommendation'
    )
    .eq('search_id', searchId)
    .order('score', { ascending: false });

  const flightResults = (results ?? []) as FlightResult[];

  if (flightResults.length === 0) {
    return (
      <EmptyState
        icon={PlaneTakeoff}
        title="Nenhum resultado para esta busca"
        description="Não encontramos voos para essa rota/data. Tente ajustar as datas ou marque datas flexíveis."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          {typedSearch.origin} → {typedSearch.destination}
        </h2>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TriangleAlert className="h-3.5 w-3.5" />
          Preços e disponibilidade podem mudar — confirme no site oficial antes de comprar.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {flightResults.map((result) => (
          <PriceComparisonCard
            key={result.id}
            title={`${result.airline} · ${result.origin} → ${result.destination}`}
            subtitle={`${formatDateTime(result.departure_datetime)} → ${formatDateTime(result.arrival_datetime)} · ${formatDurationMinutes(result.duration_minutes)} · ${stopsLabel(result.stops)}`}
            cashPrice={result.cash_price}
            pointsPrice={result.points_price}
            taxes={result.taxes}
            loyaltyProgram={result.loyalty_program}
            score={result.score}
            recommendationText={result.recommendation ?? 'Sem recomendação disponível para este resultado.'}
          />
        ))}
      </div>
    </div>
  );
}

export default async function VoosPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const limite = params.limite === '1';
  const searchId = typeof params.search === 'string' ? params.search : undefined;

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Busca de passagens</h1>
        <p className="mt-1 text-muted-foreground">
          Informe origem, destino e datas — comparamos preço em dinheiro e em pontos e mostramos a
          melhor recomendação.
        </p>
      </div>

      <FlightSearchForm />

      {limite && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="text-base">Limite de buscas do dia atingido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Você atingiu o limite de buscas do plano Free hoje. Assine o Premium para buscas
              ilimitadas, comparação completa dinheiro vs pontos e histórico de buscas.
            </p>
            <Link href="/assinatura">
              <Button>Ver planos</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {searchId ? (
        <FlightResultsSection searchId={searchId} />
      ) : (
        !limite && (
          <EmptyState
            icon={PlaneTakeoff}
            title="Faça sua primeira busca"
            description="Preencha o formulário acima com origem, destino e datas para ver preços em dinheiro e em pontos lado a lado."
          />
        )
      )}
    </div>
  );
}
