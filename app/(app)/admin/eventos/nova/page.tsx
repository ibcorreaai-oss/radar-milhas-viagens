import { requireAdmin } from '@/lib/admin-guard';
import { createClient } from '@/lib/supabase/server';
import { EventForm } from '../event-form';
import { createEvent } from '../actions';
import type { EventCategory, Destination, Source } from '@/lib/types';

export default async function NovoEventoPage({ searchParams }: { searchParams: Promise<{ erro?: string }> }) {
  await requireAdmin();
  const { erro } = await searchParams;

  const supabase = await createClient();
  const [{ data: categories }, { data: destinations }, { data: sources }] = await Promise.all([
    supabase.from('event_categories').select('*').order('label'),
    supabase.from('destinations').select('*').order('city'),
    supabase.from('sources').select('*').order('name'),
  ]);

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Novo evento</h1>
        <p className="mt-1 text-muted-foreground">Cadastre um novo evento no World Radar.</p>
      </div>
      <EventForm
        categories={(categories ?? []) as EventCategory[]}
        destinations={(destinations ?? []) as Destination[]}
        sources={(sources ?? []) as Source[]}
        action={createEvent}
        error={erro}
      />
    </div>
  );
}
