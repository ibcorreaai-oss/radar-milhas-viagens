import { Heart, Trash2, Compass } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getFeatureFlags } from '@/lib/feature-flags';
import { getOrCreateDefaultBucketList } from '@/lib/bucket-list';
import { EmptyState } from '@/components/empty-state';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { WorldEventCard, type WorldEventCardData } from '@/components/world-event-card';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { addCustomBucketListItem, removeBucketListItem } from './actions';
import type { BucketListItem, EventCategory, WorldEvent } from '@/lib/types';

type ItemRow = BucketListItem & {
  world_events:
    | (WorldEvent & {
        event_categories: Pick<EventCategory, 'label' | 'radar'> | null;
        destinations: { city: string; country: string } | null;
      })
    | null;
};

export default async function BucketListPage() {
  const ctx = await getUserContext();
  const flags = await getFeatureFlags();

  if (!ctx) {
    return (
      <div className="p-6">
        <EmptyState
          title="Faça login para ver sua Bucket List"
          description="Sua sessão pode ter expirado."
        />
      </div>
    );
  }

  if (!flags.bucketList) {
    return (
      <div className="p-6">
        <EmptyState
          title="Bucket List ainda não está ativada"
          description="Este módulo está atrás de uma feature flag (bucketList)."
          icon={Heart}
        />
      </div>
    );
  }

  const supabase = await createClient();
  const bucketListId = await getOrCreateDefaultBucketList(ctx.userId);

  const { data } = await supabase
    .from('bucket_list_items')
    .select('*, world_events(*, event_categories(label, radar), destinations(city, country))')
    .eq('bucket_list_id', bucketListId)
    .order('created_at', { ascending: false });

  const items = (data ?? []) as ItemRow[];

  return (
    <div className="space-y-8 p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Heart className="h-6 w-6 text-primary" />
          Bucket List
        </h1>
        <p className="mt-1 text-muted-foreground">
          Salve experiências que quer viver — o clube monitora oportunidades relacionadas.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar item livre</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={addCustomBucketListItem} className="flex flex-wrap items-end gap-3">
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label htmlFor="custom_title">O que você quer viver?</Label>
              <Input id="custom_title" name="custom_title" placeholder="Ex.: Antártida, Safári no Serengeti" required />
            </div>
            <div className="min-w-[200px] flex-1 space-y-1.5">
              <Label htmlFor="notes">Notas (opcional)</Label>
              <Input id="notes" name="notes" placeholder="Ex.: prefiro entre março e maio" />
            </div>
            <Button type="submit">Adicionar</Button>
          </form>
        </CardContent>
      </Card>

      {items.length === 0 ? (
        <EmptyState
          title="Sua Bucket List está vazia"
          description="Explore o Descobrir e salve experiências que valem a pena monitorar."
          icon={Compass}
          action={
            <Link href="/descobrir" className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}>
              Ir para Descobrir
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => {
            const removeButton = (
              <form action={removeBucketListItem.bind(null, item.id)}>
                <Button type="submit" variant="destructive" size="sm" className="w-full">
                  <Trash2 className="h-3.5 w-3.5" />
                  Remover
                </Button>
              </form>
            );

            if (item.world_events) {
              const card: WorldEventCardData = {
                ...item.world_events,
                category_label: item.world_events.event_categories?.label ?? null,
                category_radar: item.world_events.event_categories?.radar ?? null,
                destination_label: item.world_events.destinations
                  ? `${item.world_events.destinations.city}, ${item.world_events.destinations.country}`
                  : null,
              };
              return <WorldEventCard key={item.id} event={card} footer={removeButton} />;
            }

            return (
              <Card key={item.id}>
                <CardHeader>
                  <CardTitle className="text-base">{item.custom_title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {item.notes && <p className="text-sm text-muted-foreground">{item.notes}</p>}
                  {removeButton}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
