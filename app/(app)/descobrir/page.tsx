import type { Metadata } from 'next';
import { Compass, Heart } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getFeatureFlags } from '@/lib/feature-flags';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { WorldEventCard, type WorldEventCardData } from '@/components/world-event-card';
import { WorldRadarFilters } from './world-radar-filters';
import { saveEventToBucketList } from './actions';
import type { EventCategory, WorldEvent } from '@/lib/types';

// ETAPA 19 (achado em auditoria de SEO pré-deploy) — página pública de
// verdade (não exige login, só a feature flag worldRadar), nunca teve
// metadata própria. Canonical fixo em /descobrir (sem os query params de
// filtro) pra não espalhar o mesmo conteúdo em várias URLs indexáveis.
export const metadata: Metadata = {
  title: 'Descobrir — Radar de eventos e experiências pelo mundo',
  description:
    'Festivais, esportes, fenômenos naturais e eventos únicos ao redor do mundo, com recomendação de quando comprar.',
  openGraph: {
    title: 'Descobrir — Radar de eventos e experiências pelo mundo — Radar Milhas & Viagens',
    description:
      'Festivais, esportes, fenômenos naturais e eventos únicos ao redor do mundo, com recomendação de quando comprar.',
    url: '/descobrir',
  },
  alternates: { canonical: '/descobrir' },
};

type WorldEventRow = WorldEvent & {
  event_categories: Pick<EventCategory, 'label' | 'radar'> | null;
  destinations: { city: string; country: string } | null;
};

export default async function DescobrirPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; mes?: string }>;
}) {
  const { categoria, mes } = await searchParams;
  const ctx = await getUserContext();
  const flags = await getFeatureFlags();

  if (!flags.worldRadar) {
    return (
      <div className="p-6">
        <EmptyState
          title="Descobrir ainda não está ativado"
          description="Este módulo está atrás de uma feature flag (worldRadar). Ative em /admin quando a curadoria de eventos estiver pronta para os usuários."
          icon={Compass}
        />
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: categoriesData }, { data: eventsData }] = await Promise.all([
    supabase.from('event_categories').select('*').order('label'),
    supabase
      .from('world_events')
      .select('*, event_categories(label, radar), destinations(city, country)')
      // Descobrir é "o que está por vir" — cancelado e já finalizado não
      // são oportunidades acionáveis. Continuam visíveis em /admin/eventos.
      .not('status', 'in', '(cancelado,finalizado)')
      .order('featured', { ascending: false })
      .order('experience_score', { ascending: false })
      .limit(60),
  ]);

  const categories = (categoriesData ?? []) as EventCategory[];
  let events = (eventsData ?? []) as WorldEventRow[];

  if (categoria) {
    const selectedCategoryId = categories.find((c) => c.slug === categoria)?.id;
    events = events.filter((e) => e.category_id === selectedCategoryId);
  }
  if (mes) {
    const monthNum = Number(mes);
    // getUTCMonth(), não getMonth(): start_date é 'YYYY-MM-DD' (parseado como
    // UTC meia-noite) — em fuso negativo (Brasil, UTC-3) o getMonth() local
    // erraria o mês em datas no dia 1.
    events = events.filter((e) => e.start_date && new Date(e.start_date).getUTCMonth() + 1 === monthNum);
  }

  const cards: WorldEventCardData[] = events.map((e) => ({
    ...e,
    category_label: e.event_categories?.label ?? null,
    category_radar: e.event_categories?.radar ?? null,
    destination_label: e.destinations ? `${e.destinations.city}, ${e.destinations.country}` : null,
  }));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Compass className="h-6 w-6 text-primary" />
          Descobrir
        </h1>
        <p className="mt-1 text-muted-foreground">
          O que está acontecendo no mundo — festivais, esportes, sazonalidade e experiências extraordinárias.
        </p>
      </div>

      <WorldRadarFilters categories={categories} />

      {cards.length === 0 ? (
        <EmptyState
          title="Nenhum evento encontrado"
          description="Ajuste os filtros ou volte em breve — o clube cadastra novas oportunidades continuamente."
          icon={Compass}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((event) => (
            <WorldEventCard
              key={event.id}
              event={event}
              footer={
                ctx ? (
                  <form action={saveEventToBucketList.bind(null, event.id)}>
                    <Button type="submit" variant="outline" size="sm" className="w-full">
                      <Heart className="h-3.5 w-3.5" />
                      Salvar na Bucket List
                    </Button>
                  </form>
                ) : undefined
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}
