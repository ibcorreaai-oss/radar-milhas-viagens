import { redirect } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EmptyState } from '@/components/empty-state';
import { buttonVariants } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { ConsultorChat } from './consultor-chat';
import type { ConsultantUserContext } from './actions';
import type { Opportunity, UserLoyaltyProgram, LoyaltyProgram } from '@/lib/types';

const ELIGIBLE_PLANS = ['pro', 'consultor'];

type UserLoyaltyProgramWithProgram = UserLoyaltyProgram & {
  loyalty_programs: Pick<LoyaltyProgram, 'name' | 'average_mile_value'> | null;
};

export default async function ConsultorIAPage() {
  const ctx = await getUserContext();

  if (!ctx) {
    redirect('/login');
  }

  if (!ELIGIBLE_PLANS.includes(ctx.plan)) {
    return (
      <div className="p-6">
        <EmptyState
          title="Consultor IA é exclusivo dos planos Pro e Consultor"
          description="Assine o plano Pro ou Consultor/Agência para conversar com a IA especializada em pontos e milhas do clube, com recomendações baseadas no seu saldo e nas oportunidades do momento."
          icon={Sparkles}
          action={
            <Link href="/assinatura" className={cn(buttonVariants({ variant: 'default' }))}>
              Ver planos
            </Link>
          }
        />
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: userProgramsData }, { data: opportunitiesData }] = await Promise.all([
    supabase
      .from('user_loyalty_programs')
      .select('*, loyalty_programs(name, average_mile_value)')
      .eq('user_id', ctx.userId),
    supabase.from('opportunities').select('*').order('score', { ascending: false }).limit(10),
  ]);

  const userPrograms = (userProgramsData ?? []) as UserLoyaltyProgramWithProgram[];
  const opportunities = (opportunitiesData ?? []) as Opportunity[];

  // Contexto serializável para a IA e para a Server Action — só campos
  // relevantes, nada de PII desnecessária (sem e-mail/telefone).
  const userContext: ConsultantUserContext = {
    nome: ctx.profile?.full_name || null,
    aeroportoBase: ctx.profile?.home_airport || null,
    destinosFavoritos: ctx.profile?.favorite_destinations || [],
    classePreferida: ctx.profile?.cabin_class_preference || 'qualquer',
    datasFlexiveis: ctx.profile?.flexible_dates ?? false,
    orcamentoMensal: ctx.profile?.monthly_budget ?? null,
    programas: userPrograms.map((ulp) => ({
      programa: ulp.loyalty_programs?.name ?? 'Programa desconhecido',
      saldoPontos: ulp.points_balance,
      milheiroMedio: ulp.loyalty_programs?.average_mile_value ?? null,
    })),
    oportunidadesAtuais: opportunities.map((o) => ({
      titulo: o.title,
      tipo: o.type,
      origem: o.origin,
      destino: o.destination,
      cidade: o.city,
      precoDinheiro: o.cash_price,
      precoPontos: o.points_price,
      programa: o.loyalty_program,
      score: o.score,
      expiraEm: o.expires_at,
    })),
  };

  return (
    <div className="flex h-[calc(100vh-1px)] flex-col p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">Consultor IA</h1>
        <p className="mt-1 text-muted-foreground">
          Converse com a IA do clube sobre pontos, milhas e a melhor estratégia para sua próxima viagem.
        </p>
      </div>
      <ConsultorChat userContext={userContext} />
    </div>
  );
}
