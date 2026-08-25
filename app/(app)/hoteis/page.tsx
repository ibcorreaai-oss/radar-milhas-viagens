import Link from 'next/link';
import { BedDouble, TriangleAlert, Bell } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatDate } from '@/lib/utils';
import type { HotelResult, HotelSearch } from '@/lib/types';
import { HotelSearchForm } from './hotel-search-form';
import { PriceComparisonCard } from '@/components/price-comparison-card';
import { EmptyState } from '@/components/empty-state';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

function hotelSubtitle(result: HotelResult): string {
  const parts: string[] = [];
  if (result.location) parts.push(result.location);
  if (result.stars) parts.push(`${result.stars} estrelas`);
  if (result.rating != null) parts.push(`nota ${result.rating}`);
  if (result.breakfast_included) parts.push('café incluso');
  if (result.cancellation_policy?.toLowerCase().includes('grátis')) parts.push('cancelamento grátis');
  return parts.join(' · ');
}

async function HotelResultsSection({ searchId }: { searchId: string }) {
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
    .from('hotel_searches')
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

  const typedSearch = search as HotelSearch;

  // Coluna explícita, sem raw_data (jsonb com o payload bruto do provider —
  // pode ser grande e não é usado nesta tela) nem provider/currency/
  // created_at (não renderizados aqui).
  const { data: results } = await supabase
    .from('hotel_results')
    .select(
      'id, hotel_name, location, rating, stars, cash_price, points_price, taxes, loyalty_program, cancellation_policy, breakfast_included, score, recommendation'
    )
    .eq('search_id', searchId)
    .order('score', { ascending: false });

  const hotelResults = (results ?? []) as HotelResult[];

  // Nudge (ETAPA 13 — NeuroUX), mesma lógica de app/(app)/voos/page.tsx —
  // se a pessoa já buscou essa cidade mais de uma vez sem ter alerta pra
  // ela, sugere criar um.
  const [{ count: sameCitySearches }, { count: existingAlertsForCity }] = await Promise.all([
    supabase
      .from('hotel_searches')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId)
      .eq('city', typedSearch.city),
    supabase
      .from('alerts')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', ctx.userId)
      .eq('city', typedSearch.city)
      .eq('active', true),
  ]);
  const suggestAlert = (sameCitySearches ?? 0) >= 2 && (existingAlertsForCity ?? 0) === 0;

  if (hotelResults.length === 0) {
    return (
      <EmptyState
        icon={BedDouble}
        title="Nenhum resultado para esta busca"
        description="Não encontramos hotéis para essa cidade/datas/filtros. Tente ajustar o orçamento ou a categoria mínima."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex flex-wrap items-center gap-2 text-lg font-semibold">
          Hotéis em {typedSearch.city}
          {typedSearch.checkin && typedSearch.checkout && (
            <span className="text-sm font-normal text-muted-foreground">
              {formatDate(typedSearch.checkin)} – {formatDate(typedSearch.checkout)}
            </span>
          )}
          {typedSearch.flexible_dates && (
            <Badge variant="secondary" className="text-xs font-normal">
              Datas flexíveis
            </Badge>
          )}
        </h2>
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <TriangleAlert className="h-3.5 w-3.5" />
          Preços e disponibilidade podem mudar — confirme no site oficial antes de reservar.
        </p>
      </div>

      {suggestAlert && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
            <p className="flex items-center gap-2">
              <Bell className="h-4 w-4 shrink-0 text-primary" />
              Você já buscou hotéis em {typedSearch.city} algumas vezes. Que tal criar um alerta pra
              não precisar buscar de novo?
            </p>
            <Link href="/alertas">
              <Button size="sm">Criar alerta</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {hotelResults.map((result) => (
          <PriceComparisonCard
            key={result.id}
            title={result.hotel_name}
            subtitle={hotelSubtitle(result)}
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

export default async function HoteisPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const limite = params.limite === '1';
  const erro = params.erro === '1';
  const searchId = typeof params.search === 'string' ? params.search : undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Busca de hotéis</h1>
        <p className="text-sm text-muted-foreground">
          Informe cidade e datas — comparamos preço em dinheiro e em pontos e mostramos a melhor
          recomendação.
        </p>
      </div>

      <HotelSearchForm />

      {erro && (
        <p className="text-sm text-destructive">Preencha ao menos a cidade para buscar.</p>
      )}

      {limite && (
        <Card className="border-warning">
          <CardHeader>
            <CardTitle className="text-base">Limite de buscas do dia atingido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Você atingiu o limite de buscas do plano Free hoje (voos + hotéis somados). Assine o
              Premium para buscas ilimitadas, comparação completa dinheiro vs pontos e histórico de
              buscas.
            </p>
            <Link href="/assinatura">
              <Button>Ver planos</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {searchId ? (
        <HotelResultsSection searchId={searchId} />
      ) : (
        !limite && (
          <EmptyState
            icon={BedDouble}
            title="Faça sua primeira busca"
            description="Preencha o formulário acima com cidade e datas para ver preços de hospedagem em dinheiro e em pontos lado a lado."
          />
        )
      )}
    </div>
  );
}
