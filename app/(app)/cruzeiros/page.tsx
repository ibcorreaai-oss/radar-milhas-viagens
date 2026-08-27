import type { Metadata } from 'next';
import { Ship } from 'lucide-react';
import { getFeatureFlags } from '@/lib/feature-flags';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/empty-state';
import { CruiseCard, type CruiseCardData } from '@/components/cruise-card';
import { CruiseFilters } from './cruise-filters';
import type { Cruise, Destination, CruiseCategory, CruiseRegionTag } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Cruzeiros',
  description: 'Cruzeiros oceânicos, fluviais e de expedição pelo mundo — com Cruise Score explicável.',
  openGraph: {
    title: 'Cruzeiros — Radar Milhas & Viagens',
    description: 'Cruzeiros oceânicos, fluviais e de expedição pelo mundo — com Cruise Score explicável.',
    url: '/cruzeiros',
  },
  alternates: { canonical: '/cruzeiros' },
};

type CruiseRow = Cruise & { destinations: Pick<Destination, 'city' | 'country'> | null };

export default async function CruzeirosPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; regiao?: string }>;
}) {
  const { categoria, regiao } = await searchParams;
  const flags = await getFeatureFlags();

  if (!flags.cruiseRadar) {
    return (
      <div className="p-6">
        <EmptyState
          title="Cruzeiros ainda não está ativado"
          description="Este módulo está atrás de uma feature flag (cruiseRadar). Ative em /admin/funcionalidades quando a curadoria estiver pronta para os usuários."
          icon={Ship}
        />
      </div>
    );
  }

  const supabase = await createClient();
  let query = supabase
    .from('cruises')
    .select('*, destinations:embarkation_destination_id(city, country)')
    .eq('active', true)
    .order('featured', { ascending: false })
    .order('cruise_score', { ascending: false })
    .limit(60);

  if (categoria) query = query.eq('category', categoria as CruiseCategory);
  if (regiao) query = query.contains('region_tags', [regiao as CruiseRegionTag]);

  const { data } = await query;
  const cruises = (data ?? []) as CruiseRow[];

  const cards: CruiseCardData[] = cruises.map((c) => ({
    ...c,
    embarkation_label: c.destinations ? `${c.destinations.city}, ${c.destinations.country}` : null,
  }));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Ship className="h-6 w-6 text-primary" />
          Cruzeiros
        </h1>
        <p className="mt-1 text-muted-foreground">Oceânicos, fluviais e de expedição — com o porquê de cada score.</p>
      </div>

      <CruiseFilters />

      {cards.length === 0 ? (
        <EmptyState
          title="Nenhum cruzeiro encontrado"
          description="Ajuste os filtros ou volte em breve — novas curadorias são adicionadas continuamente."
          icon={Ship}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((cruise) => (
            <CruiseCard key={cruise.id} cruise={cruise} />
          ))}
        </div>
      )}
    </div>
  );
}
