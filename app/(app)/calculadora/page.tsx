import { getUserContext } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PointsCalculator, type UserProgramOption } from './points-calculator';

export const metadata = {
  title: 'Calculadora de pontos',
  alternates: { canonical: '/calculadora' },
};

// Formato bruto da linha retornada pelo join user_loyalty_programs + loyalty_programs.
interface UserLoyaltyProgramRow {
  id: string;
  program_id: string;
  points_balance: number;
  estimated_cost_per_1000: number | null;
  loyalty_programs: { name: string; average_mile_value: number } | null;
}

export default async function CalculadoraPage() {
  const ctx = await getUserContext();

  let userPrograms: UserProgramOption[] = [];

  if (ctx) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('user_loyalty_programs')
      .select('*, loyalty_programs(name, average_mile_value)')
      .eq('user_id', ctx.userId);

    userPrograms = ((data as UserLoyaltyProgramRow[] | null) ?? []).map((row) => ({
      id: row.id,
      programId: row.program_id,
      name: row.loyalty_programs?.name ?? 'Programa sem nome',
      pointsBalance: row.points_balance,
      estimatedCostPer1000: row.estimated_cost_per_1000,
      averageMileValue: row.loyalty_programs?.average_mile_value ?? null,
    }));
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Calculadora de pontos</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare dinheiro vs pontos, descubra se vale a pena comprar pontos e veja o ganho real de
          transferências bonificadas. Tudo calculado em tempo real, sem precisar salvar nada.
        </p>
      </div>

      <PointsCalculator userPrograms={userPrograms} />
    </div>
  );
}
