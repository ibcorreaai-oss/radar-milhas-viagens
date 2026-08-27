import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { Compass } from 'lucide-react';
import Link from 'next/link';
import { getFeatureFlags } from '@/lib/feature-flags';
import { getUserContext } from '@/lib/auth';
import { EmptyState } from '@/components/empty-state';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ConciergeChat } from './concierge-chat';

export const metadata: Metadata = {
  title: 'Concierge IA',
  description: 'Converse com o AI Travel Concierge e descubra pra onde ir com base em dados reais do radar.',
};

const ELIGIBLE_PLANS = ['pro', 'consultor'];

export default async function ConciergePage() {
  const flags = await getFeatureFlags();
  if (!flags.conciergeAI) notFound();

  const ctx = await getUserContext();
  if (!ctx) redirect('/login?next=/concierge');

  if (!ELIGIBLE_PLANS.includes(ctx.plan)) {
    return (
      <div className="p-6">
        <EmptyState
          title="Concierge IA é exclusivo dos planos Pro e Consultor"
          description="Assine o plano Pro ou Consultor/Agência para conversar com o Concierge sobre pra onde ir, com base nos destinos, eventos, hospedagens e cruzeiros reais cadastrados no radar."
          icon={Compass}
          action={
            <Link href="/assinatura" className={cn(buttonVariants({ variant: 'default' }))}>
              Ver planos
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-1px)] flex-col p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Concierge IA</h1>
        <p className="mt-1 text-muted-foreground">
          Converse sobre pra onde ir — as recomendações são sempre baseadas no Trip Opportunity Score real do radar.
        </p>
      </div>
      <ConciergeChat />
    </div>
  );
}
