import { notFound, redirect } from 'next/navigation';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EventForm } from '../../event-form';
import { updateEvent } from '../../actions';
import type { EventCategory, Destination, Source, WorldEvent } from '@/lib/types';

export default async function EditarEventoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const ctx = await getUserContext();
  if (ctx?.profile?.role !== 'admin') {
    redirect('/dashboard');
  }

  const { id } = await params;
  const { erro } = await searchParams;
  const supabase = await createClient();

  const [{ data: event }, { data: categories }, { data: destinations }, { data: sources }] = await Promise.all([
    supabase.from('world_events').select('*').eq('id', id).maybeSingle(),
    supabase.from('event_categories').select('*').order('label'),
    supabase.from('destinations').select('*').order('city'),
    supabase.from('sources').select('*').order('name'),
  ]);

  if (!event) {
    notFound();
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Editar evento</h1>
        <p className="mt-1 text-muted-foreground">{(event as WorldEvent).title}</p>
      </div>
      <EventForm
        event={event as WorldEvent}
        categories={(categories ?? []) as EventCategory[]}
        destinations={(destinations ?? []) as Destination[]}
        sources={(sources ?? []) as Source[]}
        action={updateEvent.bind(null, id)}
        error={erro}
      />
    </div>
  );
}
