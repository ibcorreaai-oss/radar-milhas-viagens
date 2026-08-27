import type { Metadata } from 'next';
import { Hotel } from 'lucide-react';
import { getFeatureFlags } from '@/lib/feature-flags';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/empty-state';
import { StayCard, type StayCardData } from '@/components/stay-card';
import { StayFilters } from './stay-filters';
import type { Stay, Destination, StayCategory, ExperienceTag } from '@/lib/types';

// Fase 3 do World Experience Radar. Rota em português (/estadias), não
// /stays como o prompt sugeriu literalmente — mantém consistência com o
// resto do app (/voos, /hoteis, /descobrir, todas em PT-BR). Mesma
// justificativa de nomenclatura de outras decisões técnicas documentadas
// neste projeto (ex.: CPF na ETAPA 15.1).
export const metadata: Metadata = {
  title: 'Estadias extraordinárias',
  description: 'Hospedagens extraordinárias pelo mundo — onde vale a pena ficar, não só onde é barato.',
  openGraph: {
    title: 'Estadias extraordinárias — Radar Milhas & Viagens',
    description: 'Hospedagens extraordinárias pelo mundo — onde vale a pena ficar, não só onde é barato.',
    url: '/estadias',
  },
  alternates: { canonical: '/estadias' },
};

type StayRow = Stay & { destinations: Pick<Destination, 'city' | 'country'> | null };

export default async function EstadiasPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string; tag?: string }>;
}) {
  const { categoria, tag } = await searchParams;
  const flags = await getFeatureFlags();

  if (!flags.stayExperience) {
    return (
      <div className="p-6">
        <EmptyState
          title="Estadias ainda não está ativado"
          description="Este módulo está atrás de uma feature flag (stayExperience). Ative em /admin/funcionalidades quando a curadoria estiver pronta para os usuários."
          icon={Hotel}
        />
      </div>
    );
  }

  const supabase = await createClient();
  let query = supabase
    .from('stays')
    .select('*, destinations(city, country)')
    .eq('active', true)
    .order('featured', { ascending: false })
    .order('stay_score', { ascending: false })
    .limit(60);

  if (categoria) query = query.eq('category', categoria as StayCategory);
  if (tag) query = query.contains('experience_tags', [tag as ExperienceTag]);

  const { data } = await query;
  const stays = (data ?? []) as StayRow[];

  const cards: StayCardData[] = stays.map((s) => ({
    ...s,
    destination_label: s.destinations ? `${s.destinations.city}, ${s.destinations.country}` : null,
  }));

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Hotel className="h-6 w-6 text-primary" />
          Estadias extraordinárias
        </h1>
        <p className="mt-1 text-muted-foreground">Onde vale a pena ficar — não só onde é barato.</p>
      </div>

      <StayFilters />

      {cards.length === 0 ? (
        <EmptyState
          title="Nenhuma hospedagem encontrada"
          description="Ajuste os filtros ou volte em breve — novas curadorias são adicionadas continuamente."
          icon={Hotel}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {cards.map((stay) => (
            <StayCard key={stay.id} stay={stay} />
          ))}
        </div>
      )}
    </div>
  );
}
